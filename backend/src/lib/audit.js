// Writes one entry to the audit log. Every entry is sealed with a hash of the entry before it,
// so an entry cannot be changed or removed without breaking every seal after it.
const crypto = require("crypto");
const db = require("../db");

const FIRST_SEAL = "calms-genesis";

// JSON with its keys in a fixed order, so the same value always gives the same text
// (the database stores JSON in its own key order).
// It matches what the database keeps: dates become text, and keys with no value are left out.
function canon(v) {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return "[" + v.map((x) => (x === undefined ? "null" : canon(x))).join(",") + "]";
  if (v && typeof v === "object") return "{" + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  return JSON.stringify(v ?? null);
}

function sealOf(prevSeal, entry) {
  const text = [prevSeal, entry.actor, entry.kind, entry.action, entry.record || "",
    canon(entry.before), canon(entry.after), entry.ip || ""].join("|");
  return crypto.createHash("sha256").update(text).digest("hex");
}

// entry: { user, actor, kind, action, record, before, after, ip }. Pass a transaction client to write
// the entry together with the change it describes.
async function write(entry, client) {
  // The lock makes two writers take turns, so the chain never forks. It is held until the transaction ends,
  // so an entry written on its own gets a transaction of its own (without one the lock is let go at once
  // and two people acting at the same moment would both build on the same seal).
  if (!client) return db.transaction((tx) => write(entry, tx));
  await client.query("select pg_advisory_xact_lock(4091)");
  const last = await client.query("select seal from audit_log order by id desc limit 1");
  const prev = last.rows[0] ? last.rows[0].seal : FIRST_SEAL;
  // saved on a computer while it was offline and sent later: the entry says when it was really done
  const off = require("./idempotency").savedOfflineAt();
  if (off && entry.after && typeof entry.after === "object" && !Array.isArray(entry.after)) entry = { ...entry, after: { ...entry.after, savedOfflineAt: off } };
  const actor = entry.actor || (entry.user ? entry.user.full_name : "CALMS");
  const row = { ...entry, actor };
  await client.query(
    `insert into audit_log (user_id, actor, kind, action, record, before, after, ip, prev_seal, seal)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [entry.user ? entry.user.id : null, actor, entry.kind, entry.action, entry.record || null,
      entry.before == null ? null : JSON.stringify(entry.before),
      entry.after == null ? null : JSON.stringify(entry.after), entry.ip || null, prev, sealOf(prev, row)]
  );
}

// Re-computes every seal from the first entry. Returns the id of the first break, or null.
// Breaks that were "out of order" (intact entries written at the same moment before the fix) and were
// acknowledged with npm run audit:check -- --acknowledge are accepted; an entry that was changed never is.
async function verify() {
  const ack = await acknowledged();
  const b = (await breaks()).find((x) => !(x.kind === "out of order" && ack.includes(x.id)));
  return b ? b.id : null;
}
async function acknowledged() {
  try { const r = (await db.query("select value from settings where key = 'audit_acknowledged'")).rows[0]; return r ? r.value.map(Number) : []; } catch { return []; }
}

// Every break in the chain, with what kind it is:
//   "changed": the entry no longer matches its own seal, so its contents were edited outside CALMS;
//   "out of order": the entry is intact but was sealed against an older entry (two entries written at the same
//   moment before the fix of October 2026), so the chain forks there. Nothing in it was altered.
async function breaks() {
  const { rows } = await db.query("select * from audit_log order by id");
  const out = []; let prev = FIRST_SEAL;
  for (const r of rows) {
    if (r.seal !== sealOf(r.prev_seal, r)) out.push({ id: Number(r.id), kind: "changed", at: r.at, action: r.action });
    else if (r.prev_seal !== prev) out.push({ id: Number(r.id), kind: "out of order", at: r.at, action: r.action, sealedAgainst: (rows.find((x) => x.seal === r.prev_seal) || {}).id || null });
    prev = r.seal;
  }
  return out;
}

module.exports = { write, verify, breaks, acknowledged };
