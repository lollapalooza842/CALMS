// "Let's talk" on the public site (frontend/trail, home page): no sign-in. A visitor says what loan they need, about
// how much, over how long, and how to reach them; it is kept in talk_requests for the branch to call back.
// GET  /api/public/talk  -> the loan products to choose from (names and ranges, read live)
// POST /api/public/talk  -> saves one request. Rate-limited per address (5 a minute, 30 a day).
const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

let ready = null;   // the table is made the first time it is needed, so no separate setup step is required
function table() { if (!ready) ready = db.query(fs.readFileSync(path.join(__dirname, "..", "..", "sql", "011_talk.sql"), "utf8")).catch((e) => { ready = null; throw e; }); return ready; }

const hits = new Map();
function allowed(ip) {
  const now = Date.now(), h = hits.get(ip) || { min: [], day: 0, dayStart: now };
  h.min = h.min.filter((t) => now - t < 6e4); if (now - h.dayStart > 864e5) { h.day = 0; h.dayStart = now; }
  if (h.min.length >= 5 || h.day >= 30) { hits.set(ip, h); return false; }
  h.min.push(now); h.day++; hits.set(ip, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.dayStart > 864e5) hits.delete(k);
  return true;
}
const clean = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "");

router.get("/", wrap(async (req, res) => {
  const { rows } = await db.query("select name, min_amount, max_amount, terms_months, monthly_rate, processing_fee from loan_products order by min_amount").catch(() => ({ rows: [] }));
  res.json({ products: rows.map((p) => ({ name: p.name, min: Number(p.min_amount), max: Number(p.max_amount), months: p.terms_months, rate: Number(p.monthly_rate), fee: Number(p.processing_fee) })) });
}));

router.post("/", wrap(async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
  if (!allowed(ip)) return res.status(429).json({ error: "That's a lot of messages. Please try again in a minute." });
  const b = req.body || {};
  if (clean(b.website, 50)) return res.json({ ok: true });   // a hidden field only robots fill in
  const r = { need: clean(b.need, 80), amount: clean(b.amount, 40), months: clean(b.months, 40), name: clean(b.name, 80), mobile: clean(b.mobile, 20), email: clean(b.email, 120), reach: clean(b.reach, 20), message: clean(b.message, 1500) };
  if (!r.need) return res.status(400).json({ error: "Tell us what the loan is for." });
  if (!r.name) return res.status(400).json({ error: "Tell us your name." });
  if (!r.mobile && !r.email) return res.status(400).json({ error: "Give us a mobile number or an email so we can reach you." });
  if (r.mobile && !/^(\+?63|0)?9\d{9}$/.test(r.mobile.replace(/[\s-]/g, ""))) return res.status(400).json({ error: "That mobile number doesn't look right. Try 09XX XXX XXXX." });
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return res.status(400).json({ error: "That email doesn't look right." });
  await table();
  const { rows } = await db.query("insert into talk_requests (need, amount, months, name, mobile, email, reach, message, ip) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
    [r.need, r.amount, r.months, r.name, r.mobile, r.email, r.reach, r.message, ip]);
  res.json({ ok: true, ref: "T-" + String(rows[0].id).padStart(5, "0") });
}));

module.exports = router;
