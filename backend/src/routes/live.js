// Live chat: when Kuwa can't help, a visitor on the public site talks to a real GR8 staff member.
// Visitor side (no sign-in; the visitor holds a secret token for their own chat):
//   POST /api/public/live                  { name, transcript }   -> { id, token }       start (waits for staff)
//   GET  /api/public/live/:id?token&after                         -> { status, agent, messages }   polled every 2 s
//   POST /api/public/live/:id/messages     { token, text }        -> { id }
//   POST /api/public/live/:id/close        { token }              -> { ok }
// Staff side (signed in; pages/live-chat.html):
//   GET  /api/live                 the chats waiting or open (and those closed today)
//   GET  /api/live/:id?after       one chat: what was said to Kuwa first, then the messages
//   POST /api/live/:id/take        join the chat        POST /api/live/:id/messages { text }        POST /api/live/:id/close
// A chat whose visitor has been gone for 10 minutes closes by itself. Messages are plain text, at most 1000 characters.
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const auth = require("../lib/auth");

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
let ready = null;
function table() { if (!ready) ready = db.query(fs.readFileSync(path.join(__dirname, "..", "..", "sql", "014_live.sql"), "utf8")).catch((e) => { ready = null; throw e; }); return ready; }
const clean = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, " ").trim().slice(0, n) : "");
const ipOf = (req) => (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();

function limiter(perMin, perDay) {
  const hits = new Map();
  return (key) => {
    const now = Date.now(), h = hits.get(key) || { min: [], day: 0, dayStart: now };
    if (now - h.dayStart > 864e5) { h.day = 0; h.dayStart = now; }
    h.min = h.min.filter((t) => now - t < 6e4);
    if (h.min.length >= perMin || h.day >= perDay) { hits.set(key, h); return false; }
    h.min.push(now); h.day++; hits.set(key, h);
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.dayStart > 864e5) hits.delete(k);
    return true;
  };
}
const canStart = limiter(4, 20), canSay = limiter(30, 600);

async function say(chatId, sender, text) {
  const { rows } = await db.query("insert into live_messages (chat_id, sender, text) values ($1,$2,$3) returning id", [chatId, sender, text]);
  return rows[0].id;
}
async function sweep() {   // visitors who left without saying so
  const { rows } = await db.query("update live_chats set status = 'closed', closed_at = now() where status <> 'closed' and visitor_seen_at < now() - interval '10 minutes' returning id");
  for (const r of rows) await say(r.id, "system", "The visitor left, so the chat was closed.");
}
const msgs = async (chatId, after) => (await db.query("select id, sender, text, at from live_messages where chat_id = $1 and id > $2 order by id limit 200", [chatId, Number(after) || 0])).rows;

// ---- the visitor ----
const pub = express.Router();
async function mine(req, res) {
  const id = parseInt(req.params.id, 10), token = String((req.body && req.body.token) || req.query.token || "");
  if (!id || !token) { res.status(404).json({ error: "This chat has ended." }); return null; }
  await table();
  const { rows } = await db.query("select * from live_chats where id = $1", [id]);
  const c = rows[0], a = Buffer.from(token), b = Buffer.from((c && c.token) || "");
  if (!c || a.length !== b.length || !crypto.timingSafeEqual(a, b)) { res.status(404).json({ error: "This chat has ended." }); return null; }
  return c;
}
pub.post("/", wrap(async (req, res) => {
  if (!canStart(ipOf(req))) return res.status(429).json({ error: "Please wait a minute before starting another chat." });
  const b = req.body || {}, name = clean(b.name, 40).replace(/[<>]/g, "") || "Visitor";
  const transcript = (Array.isArray(b.transcript) ? b.transcript : []).filter((m) => m && (m.role === "user" || m.role === "kuwa") && typeof m.text === "string")
    .slice(-12).map((m) => ({ role: m.role, text: clean(m.text, 600) }));
  await table();
  const token = crypto.randomBytes(24).toString("hex");
  const { rows } = await db.query("insert into live_chats (token, name, transcript) values ($1,$2,$3) returning id", [token, name, JSON.stringify(transcript)]);
  await say(rows[0].id, "system", "Waiting for someone from GR8 to join.");
  res.json({ id: rows[0].id, token });
}));
pub.get("/:id", wrap(async (req, res) => {
  const c = await mine(req, res); if (!c) return;
  if (c.status !== "closed") await db.query("update live_chats set visitor_seen_at = now() where id = $1", [c.id]);
  res.json({ status: c.status, agent: c.agent_name || null, agentHere: !!(c.agent_seen_at && Date.now() - new Date(c.agent_seen_at) < 3e4), messages: await msgs(c.id, req.query.after) });
}));
pub.post("/:id/messages", wrap(async (req, res) => {
  if (!canSay(ipOf(req))) return res.status(429).json({ error: "That's a lot of messages. Give it a moment." });
  const c = await mine(req, res); if (!c) return;
  if (c.status === "closed") return res.status(409).json({ error: "This chat has ended." });
  const text = clean(req.body && req.body.text, 1000); if (!text) return res.status(400).json({ error: "Type a message first." });
  await db.query("update live_chats set visitor_seen_at = now() where id = $1", [c.id]);
  res.json({ id: await say(c.id, "visitor", text) });
}));
pub.post("/:id/close", wrap(async (req, res) => {
  const c = await mine(req, res); if (!c) return;
  if (c.status !== "closed") { await db.query("update live_chats set status = 'closed', closed_at = now() where id = $1", [c.id]); await say(c.id, "system", `${c.name} ended the chat.`); }
  res.json({ ok: true });
}));

// ---- the staff ----
const staff = express.Router();
staff.use(auth.allow("sales_agent", "loan_processor", "loan_account_officer", "operations_manager", "system_administrator"));
const who = (u) => u.short_name || String(u.full_name || "GR8 staff").split(" ")[0];
async function chat(id) { const { rows } = await db.query("select * from live_chats where id = $1", [parseInt(id, 10) || 0]); return rows[0]; }
const shapeChat = (c) => ({ id: c.id, name: c.name, status: c.status, agent: c.agent_name, agentId: c.agent_id, createdAt: c.created_at, closedAt: c.closed_at,
  visitorHere: c.status !== "closed" && Date.now() - new Date(c.visitor_seen_at) < 15e3 });

staff.get("/", wrap(async (req, res) => {
  await table(); await sweep();
  const { rows } = await db.query(`select c.*, (select text from live_messages m where m.chat_id = c.id and m.sender <> 'system' order by id desc limit 1) last_text,
      (select count(*)::int from live_messages m where m.chat_id = c.id and m.sender = 'visitor' and m.id > coalesce((select max(id) from live_messages a where a.chat_id = c.id and a.sender = 'agent'), 0)) unanswered
    from live_chats c where c.status <> 'closed' or c.closed_at > now() - interval '12 hours' order by (c.status = 'closed'), c.created_at desc limit 60`);
  res.json({ me: req.user.id, chats: rows.map((c) => Object.assign(shapeChat(c), { last: c.last_text, unanswered: c.unanswered })) });
}));
// the alert every staff page asks for every few seconds (assets/js/chat-alert.js): who is waiting, and new messages in my chats
staff.get("/pulse", wrap(async (req, res) => {
  await table();
  const { rows } = await db.query(`select c.id, c.name, c.status, c.created_at,
      (select count(*)::int from live_messages m where m.chat_id = c.id and m.sender = 'visitor' and m.id > coalesce((select max(id) from live_messages a where a.chat_id = c.id and a.sender = 'agent'), 0)) unanswered,
      (select max(id) from live_messages m where m.chat_id = c.id and m.sender = 'visitor') last_visitor
    from live_chats c where (c.status = 'waiting' and c.visitor_seen_at > now() - interval '10 minutes') or (c.status = 'open' and c.agent_id = $1) order by c.created_at limit 20`, [req.user.id]);
  const waiting = rows.filter((c) => c.status === "waiting"), mine = rows.filter((c) => c.status === "open" && c.unanswered);
  res.set("Cache-Control", "no-store").json({ waiting: waiting.map((c) => ({ id: c.id, name: c.name, at: c.created_at })), mine: mine.map((c) => ({ id: c.id, name: c.name, unanswered: c.unanswered, last: c.last_visitor })) });
}));
staff.get("/:id", wrap(async (req, res) => {
  await table(); const c = await chat(req.params.id); if (!c) return res.status(404).json({ error: "No such chat." });
  if (c.agent_id === req.user.id && c.status === "open") await db.query("update live_chats set agent_seen_at = now() where id = $1", [c.id]);
  res.json(Object.assign(shapeChat(c), { transcript: c.transcript, messages: await msgs(c.id, req.query.after) }));
}));
staff.post("/:id/take", wrap(async (req, res) => {
  await table(); const c = await chat(req.params.id); if (!c) return res.status(404).json({ error: "No such chat." });
  if (c.status === "closed") return res.status(409).json({ error: "This chat has ended." });
  if (c.agent_id && c.agent_id !== req.user.id) return res.status(409).json({ error: `${c.agent_name} is already answering this chat.` });
  if (!c.agent_id) {
    const r = await db.query("update live_chats set agent_id = $2, agent_name = $3, status = 'open', agent_seen_at = now() where id = $1 and agent_id is null returning id", [c.id, req.user.id, who(req.user)]);
    if (!r.rows.length) return res.status(409).json({ error: "Someone else just joined this chat." });
    await say(c.id, "system", `${who(req.user)} from GR8 joined the chat.`);
  }
  res.json({ ok: true });
}));
staff.post("/:id/messages", wrap(async (req, res) => {
  await table(); const c = await chat(req.params.id); if (!c) return res.status(404).json({ error: "No such chat." });
  if (c.status === "closed") return res.status(409).json({ error: "This chat has ended." });
  if (c.agent_id !== req.user.id) return res.status(409).json({ error: "Join the chat first." });
  const text = clean(req.body && req.body.text, 1000); if (!text) return res.status(400).json({ error: "Type a message first." });
  await db.query("update live_chats set agent_seen_at = now() where id = $1", [c.id]);
  res.json({ id: await say(c.id, "agent", text) });
}));
staff.post("/:id/close", wrap(async (req, res) => {
  await table(); const c = await chat(req.params.id); if (!c) return res.status(404).json({ error: "No such chat." });
  if (c.status !== "closed") { await db.query("update live_chats set status = 'closed', closed_at = now() where id = $1", [c.id]); await say(c.id, "system", `${who(req.user)} ended the chat.`); }
  res.json({ ok: true });
}));

module.exports = { pub, staff };
