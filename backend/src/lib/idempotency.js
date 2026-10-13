// Saved-offline work is sent with an "Idempotency-Key" header (one key per saved item). The first answer for a key is
// kept; the same key sent again gets that same answer back, and nothing is done twice. This is what makes it safe for
// the computer to retry after a dropped connection: a payment is posted once, an application is created once.
// It also notes when the item was saved on the computer ("X-Calms-Saved-At"), which audit.js adds to the entry.
const { AsyncLocalStorage } = require("async_hooks");
const fs = require("fs");
const path = require("path");
const db = require("../db");

const als = new AsyncLocalStorage();
let ready = null;
function ensure() {   // the table, made on first use (also in sql/010_offline.sql for npm run db:setup)
  if (!ready) ready = db.query(fs.readFileSync(path.join(__dirname, "..", "..", "sql", "010_offline.sql"), "utf8"))
    .then(() => db.query("delete from idempotency_keys where created_at < now() - interval '14 days'")).catch((e) => { ready = null; throw e; });
  return ready;
}

function savedAt(req) {
  const t = new Date(String(req.get("X-Calms-Saved-At") || ""));
  return isNaN(t) || t > new Date(Date.now() + 5 * 60000) ? null : t.toISOString();
}

// After requireUser: runs only for signed-in changes that carry a key.
async function middleware(req, res, next) {
  const key = String(req.get("Idempotency-Key") || "");
  if (req.method === "GET" || !key) return next();
  if (!/^[A-Za-z0-9-]{8,80}$/.test(key)) return res.status(400).json({ error: "That saved item has a bad key." });
  try {
    await ensure();
    const mine = await db.query(`insert into idempotency_keys (key, user_id, method, path) values ($1, $2, $3, $4) on conflict (key) do nothing returning key`,
      [key, req.user.id, req.method, req.originalUrl.split("?")[0]]);
    if (!mine.rows.length) {
      const row = (await db.query("select * from idempotency_keys where key = $1", [key])).rows[0];
      if (!row || row.user_id !== req.user.id) return res.status(409).json({ error: "That saved item belongs to someone else." });
      if (!row.done) return res.status(409).json({ error: "This item is being sent right now. It will finish by itself.", retry: true });
      res.set("Idempotent-Replay", "true");
      return res.status(row.status).json(row.body);
    }
    // keep the answer: a real answer (under 500) is kept for good; a server fault frees the key so it can be tried again
    const json = res.json.bind(res);
    res.json = (body) => {
      const done = res.statusCode < 500;
      (done ? db.query("update idempotency_keys set status = $2, body = $3, done = true where key = $1", [key, res.statusCode, JSON.stringify(body)])
        : db.query("delete from idempotency_keys where key = $1", [key])).catch((e) => console.error("idempotency:", e.message));
      return json(body);
    };
    res.on("close", () => { if (!res.writableFinished) db.query("delete from idempotency_keys where key = $1 and not done", [key]).catch(() => {}); });
    als.run({ savedAt: savedAt(req) }, next);
  } catch (e) { next(e); }
}

// for audit.js: when the change being written was saved on a computer while offline
function savedOfflineAt() { const s = als.getStore(); return s ? s.savedAt : null; }

module.exports = { middleware, savedOfflineAt };
