// The public site's own doors into CALMS (no sign-in, rate-limited):
//   GET  /api/public/apply/products  -> the loan products with everything needed to price them (rate, method, fee, penalty, papers)
//   POST /api/public/apply           -> a full online application, checked with the same rules as the New application screen
//   GET  /api/public/track?ref=&last4= -> where an application stands; the last four digits of the mobile number must match
const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const intake = require("../lib/intake");
const { readUpload } = require("../lib/files");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const ipOf = (req) => (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();

let ready = null;
function tables() { if (!ready) ready = db.query(fs.readFileSync(path.join(__dirname, "..", "..", "sql", "012_web_apply.sql"), "utf8")).catch((e) => { ready = null; throw e; }); return ready; }

const hits = new Map();
function allowed(key, perMin, perDay) {
  const now = Date.now(), h = hits.get(key) || { min: [], day: 0, dayStart: now };
  h.min = h.min.filter((t) => now - t < 6e4); if (now - h.dayStart > 864e5) { h.day = 0; h.dayStart = now; }
  if (h.min.length >= perMin || h.day >= perDay) { hits.set(key, h); return false; }
  h.min.push(now); h.day++; hits.set(key, h);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.dayStart > 864e5) hits.delete(k);
  return true;
}

router.get("/apply/products", wrap(async (req, res) => {
  const { rows } = await db.query("select * from loan_products order by min_amount");
  const out = [];
  for (const p of rows) {
    const kind = intake.kindOf(p.name), docs = await intake.checklistFor(kind);
    out.push({ name: p.name, kind, min: Number(p.min_amount), max: Number(p.max_amount), months: p.terms_months, rate: Number(p.monthly_rate), method: p.interest_method,
      fee: Number(p.processing_fee), penalty: Number(p.late_penalty), papers: docs.filter((d) => d[0] !== "consent").map((d) => ({ slot: d[0], label: d[1] })) });
  }
  res.json({ products: out, idTypes: Object.keys(intake.ID_FORMATS).map((k) => ({ name: k, looks: intake.ID_FORMATS[k][1] })) });
}));

router.post("/apply", wrap(async (req, res) => {
  const ip = ipOf(req);
  if (!allowed("apply:" + ip, 3, 12)) return res.status(429).json({ error: "That's a lot of applications from here. Please try again later or visit the branch." });
  const b = req.body || {};
  if (typeof b.website === "string" && b.website.trim()) return res.status(201).json({ reference: "W-0000-0000" });   // a robot filled the hidden field
  const product = (await db.query("select * from loan_products where name = $1", [String(b.product || "")])).rows[0];
  const c = b.consents || {}, allConsents = !!(c.check && c.privacy && c.truth);
  const { errors, clean } = intake.check({ amount: b.amount, termMonths: b.termMonths, purpose: b.purpose, borrower: b.borrower, details: b.details, consentConfirmed: allConsents }, product);
  if (errors.agree) { delete errors.agree; errors.consents = "Tick all three boxes to send your application."; }
  const sig = typeof b.signature === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(b.signature) && b.signature.length < 400000 ? b.signature : null;
  if (!sig) errors.signature = "Sign in the box with your finger or mouse.";
  const files = [];
  for (const f of Array.isArray(b.papers) ? b.papers.slice(0, 8) : []) {
    const u = readUpload(f); if (u.error) { errors["paper_" + (f && f.slot)] = u.error; continue; }
    if (u.size > 5 * 1024 * 1024) { errors["paper_" + f.slot] = "Each paper can be up to 5 MB here. Bring a bigger file to the branch."; continue; }
    files.push(Object.assign(u, { slot: String(f.slot || "other").slice(0, 20) }));
  }
  if (Object.keys(errors).length) return res.status(400).json({ error: "A few answers need fixing.", fields: errors });
  await tables();
  const reference = await db.transaction(async (tx) => {
    const year = new Date().getFullYear();
    const n = (await tx.query("insert into counters (name, value) values ($1, 1) on conflict (name) do update set value = counters.value + 1 returning value", ["web-application-" + year])).rows[0].value;
    const ref = `W-${year}-${String(n).padStart(4, "0")}`, bw = clean.borrower;
    const app = await tx.query(`insert into web_applications (reference, product, amount, term_months, purpose, full_name, birth_date, id_type, id_number, mobile, email, address, details, consents, signature, ip)
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
      [ref, product.name, clean.amount, clean.term, clean.purpose, bw.name, bw.dob, bw.idType, bw.idNo, bw.mobile, bw.email, bw.address, clean.details, { check: true, privacy: true, truth: true, at: new Date().toISOString() }, sig, ip]);
    for (const f of files) await tx.query("insert into web_application_files (web_application_id, slot, file_name, mime_type, size_bytes, sha256, bytes) values ($1,$2,$3,$4,$5,$6,$7)", [app.rows[0].id, f.slot, f.name, f.mime, f.size, f.sha256, f.bytes]);
    return ref;
  });
  res.status(201).json({ reference });
}));

// Plain words for each stage, for the borrower
const STAGES = ["Received", "Papers", "Review", "Approval", "Release", "Paying"];
const STAGE_OF = { received: 0, called: 0, draft: 0, submitted: 1, review: 2, approved: 3, awaiting: 3, accepted: 4, funded: 5, declined: 3, rejected: 2 };
router.get("/track", wrap(async (req, res) => {
  const ip = ipOf(req);
  if (!allowed("track:" + ip, 10, 120)) return res.status(429).json({ error: "Too many tries. Please wait a minute." });
  const ref = String(req.query.ref || "").trim().toUpperCase(), last4 = String(req.query.last4 || "").replace(/\D/g, "");
  if (!/^(APP|W)-\d{4}-\d{4,}$/.test(ref) || last4.length !== 4) return res.status(400).json({ error: "Enter the reference (like APP-2026-0412) and the last 4 digits of your mobile number." });
  const nope = () => res.status(404).json({ error: "We couldn't find that reference with those digits. Check both and try again." });
  if (ref.startsWith("W-")) {
    await tables();
    const r = (await db.query("select reference, product, amount, term_months, status, mobile, created_at from web_applications where reference = $1", [ref])).rows[0];
    if (!r || !String(r.mobile || "").endsWith(last4)) return nope();
    return res.json({ reference: r.reference, product: r.product, amount: Number(r.amount), months: r.term_months, stage: 0, stages: STAGES, status: "received", since: r.created_at,
      note: "We have your application. A loan processor will call you within one working day to go over your papers." });
  }
  const r = (await db.query(`select a.reference, a.status, a.status_since, a.amount, a.term_months, p.name as product, b.mobile from applications a
    join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id where a.reference = $1`, [ref])).rows[0];
  if (!r || !String(r.mobile || "").replace(/\D/g, "").endsWith(last4)) return nope();
  const notes = { draft: "Your application is being prepared.", submitted: "Your papers are being checked.", review: "An underwriter is reviewing your application.", approved: "Approved. We'll show you the final numbers before you sign.",
    awaiting: "Waiting for your answer on our offer.", accepted: "Accepted. Your loan is being released.", funded: "Your loan is released. Your schedule is in My GR8.", declined: "We couldn't approve this one. The branch will explain why and what you can do.", rejected: "This application was closed. The branch can tell you more." };
  res.json({ reference: r.reference, product: r.product, amount: Number(r.amount), months: r.term_months, stage: STAGE_OF[r.status] || 0, stages: STAGES, status: r.status, since: r.status_since, note: notes[r.status] || "" });
}));

module.exports = router;
