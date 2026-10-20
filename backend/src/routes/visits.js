// Who opens the website: privacy-respecting counts for the public site (frontend/trail).
//   POST /api/public/visit   (no sign-in)  { kind: "open"|"part", part, ref }  -> 204. Sent by the page itself.
//   GET  /api/visits?days=30 (staff: system administrator, operations manager, compliance auditor)
//        -> totals, a day-by-day list, the parts opened, where visitors came from and on what device.
// What is kept: the day, which part, the referring site's name, phone/tablet/computer, and a one-way daily code for
// counting the same visitor once a day. No IP address, no cookie, no name. Visitors whose browser asks not to be
// tracked (Do Not Track / Global Privacy Control) are not counted at all (the page does not send anything).
const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const auth = require("../lib/auth");

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
let ready = null;
function table() { if (!ready) ready = db.query(fs.readFileSync(path.join(__dirname, "..", "..", "sql", "013_visits.sql"), "utf8")).catch((e) => { ready = null; throw e; }); return ready; }

const SALT = process.env.SESSION_SECRET || crypto.randomBytes(16).toString("hex");
const PARTS = ["home", "about", "loans", "talk", "apply"];
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|monitor|curl|wget|python|axios/i;
const hits = new Map();
function allowed(ip) { const now = Date.now(), h = (hits.get(ip) || []).filter((t) => now - t < 6e4); if (h.length >= 40) { hits.set(ip, h); return false; } h.push(now); hits.set(ip, h); if (hits.size > 5000) hits.clear(); return true; }
function manilaDay() { return new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); }
function device(ua) { return /ipad|tablet|(android(?!.*mobile))/i.test(ua) ? "tablet" : /mobi|iphone|android/i.test(ua) ? "phone" : "computer"; }
function refHost(r, selfHost) { try { const h = new URL(String(r)).hostname.replace(/^www\.|^m\.|^l\./, "").toLowerCase(); return h && h !== selfHost ? h.slice(0, 80) : null; } catch (e) { return null; } }

const pub = express.Router();
pub.post("/", wrap(async (req, res) => {
  const ua = String(req.headers["user-agent"] || ""), ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
  if (!ua || BOT.test(ua) || !allowed(ip)) return res.status(204).end();
  const b = req.body || {}, kind = b.kind === "part" ? "part" : "open", part = PARTS.includes(b.part) ? b.part : "home", day = manilaDay();
  const visitor = crypto.createHash("sha256").update(SALT + "|" + day + "|" + ip + "|" + ua).digest("hex").slice(0, 20);
  await table();
  await db.query("insert into site_visits (day, visitor, kind, part, ref_host, device) values ($1,$2,$3,$4,$5,$6)",
    [day, visitor, kind, part, kind === "open" ? refHost(b.ref, String(req.headers.host || "").split(":")[0].replace(/^www\./, "")) : null, device(ua)]);
  res.status(204).end();
}));

const staff = express.Router();
staff.get("/", auth.allow("system_administrator", "operations_manager", "compliance_auditor"), wrap(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  await table();
  const since = "day > (now() at time zone 'Asia/Manila')::date - $1::int";
  const [tot, byDay, parts, refs, devs] = await Promise.all([
    db.query(`select count(*) filter (where kind='open')::int opens, count(distinct (day, visitor))::int visitors from site_visits where ${since}`, [days]),
    db.query(`select to_char(day,'YYYY-MM-DD') d, count(*) filter (where kind='open')::int opens, count(distinct visitor)::int visitors from site_visits where ${since} group by day order by day`, [days]),
    db.query(`select part, count(distinct (day, visitor))::int visitors from site_visits where ${since} and kind='part' group by part order by 2 desc`, [days]),
    db.query(`select coalesce(ref_host,'(typed in or a bookmark)') site, count(*)::int opens from site_visits where ${since} and kind='open' group by 1 order by 2 desc limit 10`, [days]),
    db.query(`select device, count(distinct (day, visitor))::int visitors from site_visits where ${since} group by device order by 2 desc`, [days])
  ]);
  res.json({ days, opens: tot.rows[0].opens, visitors: tot.rows[0].visitors, byDay: byDay.rows, parts: parts.rows, referrers: refs.rows, devices: devs.rows });
}));

module.exports = { pub, staff };
