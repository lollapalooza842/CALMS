// My GR8: the borrower's own page on the public website (frontend/trail/signin.html), joined to CALMS.
//   POST /api/public/me/code     { mobile }            texts a 6-digit code (always answers "sent", so nobody can test numbers)
//   POST /api/public/me/verify   { mobile, code }      signs in: a cookie for 30 minutes, renewed while in use
//   GET  /api/public/me                                 everything CALMS holds for that mobile number: applications (and where
//                                                       they are), counter-offers, papers, loan accounts, schedules, receipts
//   POST /api/public/me/offer    { offerId, answer }   "I accept" / "No, thank you" to a counter-offer
//   POST /api/public/me/paper    { ref, slot, file }   a missing paper (PDF, JPG or PNG, up to 5 MB)
//   POST /api/public/me/payment  { account, amount, channel, reference, paidOn }   word that a payment was made
//   POST /api/public/me/out                             signs out
// The three things a borrower sends become requests on the staff's Website screen (routes/website.js): staff check them
// and make the real record with the usual screen, so every official record is still made and audited by staff.
// The code goes out by text when SEMAPHORE_API_KEY is set (semaphore.co, a Philippine SMS service). Until then, and
// while practice mode is on (lib/practice.js), the practice code works too, and the code is written in the server log.
const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const db = require("../db");
const loans = require("../lib/loans");
const intake = require("../lib/intake");
const practice = require("../lib/practice");
const { readUpload } = require("../lib/files");
const site = require("./website");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const SECRET = process.env.SESSION_SECRET;
const COOKIE = "gr8_borrower", MINUTES = 30;
const ipOf = (req) => (req.headers["x-forwarded-for"] || req.ip || "").toString().split(",")[0].trim();
const ten = (m) => { const d = String(m || "").replace(/\D/g, ""); return /^(63|0)?9\d{9}$/.test(d) ? d.slice(-10) : null; };   // 0917 123 4567 -> 9171234567
const hash = (code, mobile) => crypto.createHash("sha256").update(SECRET + "|" + mobile + "|" + code).digest("hex");
const mask = (m) => { const d = String(m || "").replace(/\D/g, "").slice(-10); return d.length === 10 ? "0" + d.slice(0, 3) + " ••• " + d.slice(-4) : ""; };
const maskEmail = (e) => { const m = /^([^@]{1,3})[^@]*(@.+)$/.exec(String(e || "")); return m ? m[1] + "••••" + m[2] : ""; };
const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);   // Manila

function limiter(perMin, perDay) {
  const hits = new Map();
  return (key) => { const now = Date.now(), h = hits.get(key) || { min: [], day: 0, dayStart: now };
    if (now - h.dayStart > 864e5) { h.day = 0; h.dayStart = now; } h.min = h.min.filter((t) => now - t < 6e4);
    if (h.min.length >= perMin || h.day >= perDay) { hits.set(key, h); return false; } h.min.push(now); h.day++; hits.set(key, h);
    if (hits.size > 5000) for (const [k, v] of hits) if (now - v.dayStart > 864e5) hits.delete(k); return true; };
}
const canAskIp = limiter(8, 40), canAskNo = limiter(3, 10), canTry = limiter(10, 60), canSend = limiter(10, 60);   // a shared connection (a family, an office) may ask a few times

const cookieOpts = (ms) => ({ httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "1", maxAge: ms, path: "/" });
function setSession(res, mobile) { res.cookie(COOKIE, jwt.sign({ kind: "borrower", m: mobile }, SECRET, { expiresIn: MINUTES * 60 }), cookieOpts(MINUTES * 60000)); }
function who(req, res) {
  try { const d = jwt.verify((req.cookies && req.cookies[COOKIE]) || "", SECRET); if (d.kind === "borrower" && /^9\d{9}$/.test(d.m)) { setSession(res, d.m); return d.m; } } catch (e) { /* not signed in */ }
  res.status(401).json({ error: "Please sign in again." }); return null;
}
const MOBILE_IS = "right(regexp_replace(coalesce(%s, ''), '\\D', '', 'g'), 10) = $1";

async function sms(mobile, text) {
  if (!process.env.SEMAPHORE_API_KEY) return false;
  const body = new URLSearchParams({ apikey: process.env.SEMAPHORE_API_KEY, number: "0" + mobile, message: text });
  if (process.env.SEMAPHORE_SENDER) body.set("sendername", process.env.SEMAPHORE_SENDER);
  const r = await fetch("https://api.semaphore.co/api/v4/messages", { method: "POST", body, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("SMS " + r.status);
  return true;
}

// ---- signing in ----
router.post("/code", wrap(async (req, res) => {
  const m = ten(req.body && req.body.mobile);
  if (!m) return res.status(400).json({ error: "That doesn't look like a mobile number. Try 0917 000 0000." });
  if (!canAskIp(ipOf(req)) || !canAskNo(m)) return res.status(429).json({ error: "Too many codes asked for. Please wait a few minutes." });
  await site.ensure();
  const known = (await db.query(`select 1 from borrowers where ${MOBILE_IS.replace("%s", "mobile")} union all select 1 from web_applications where ${MOBILE_IS.replace("%s", "mobile")} limit 1`, [m])).rows.length > 0;
  if (known) {
    const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
    await db.query("insert into borrower_codes (mobile, code_hash, expires_at) values ($1, $2, now() + interval '5 minutes')", [m, hash(code, m)]);
    let sent = false;
    try { sent = await sms(m, `GR8 Lending: your My GR8 code is ${code}. It works for 5 minutes. GR8 staff will never ask you for this code.`); } catch (e) { console.error("My GR8 text:", e.message); }
    if (!sent) console.log(`My GR8 code for 0${m.slice(0, 3)}•••${m.slice(-4)}: ${code} (no SMS service set up yet: SEMAPHORE_API_KEY)`);
  }
  res.json({ ok: true, practice: practice.on() });
}));

router.post("/verify", wrap(async (req, res) => {
  const m = ten(req.body && req.body.mobile), code = String((req.body && req.body.code) || "").replace(/\D/g, "");
  if (!m || code.length !== 6) return res.status(400).json({ error: "Type the 6-digit code from the text." });
  if (!canTry("try:" + ipOf(req)) || !canTry("try:" + m)) return res.status(429).json({ error: "Too many tries. Please wait a few minutes and ask for a new code." });
  await site.ensure();
  let ok = false;
  const c = (await db.query("select * from borrower_codes where mobile = $1 and used_at is null and expires_at > now() order by id desc limit 1", [m])).rows[0];
  if (c && c.tries < 5) {
    const a = Buffer.from(hash(code, m)), b = Buffer.from(c.code_hash);
    if (crypto.timingSafeEqual(a, b)) { ok = true; await db.query("update borrower_codes set used_at = now() where id = $1", [c.id]); }
    else await db.query("update borrower_codes set tries = tries + 1 where id = $1", [c.id]);
  }
  if (!ok && practice.isCode(code)) {   // practice mode, for class demos: only for numbers CALMS knows
    ok = (await db.query(`select 1 from borrowers where ${MOBILE_IS.replace("%s", "mobile")} union all select 1 from web_applications where ${MOBILE_IS.replace("%s", "mobile")} limit 1`, [m])).rows.length > 0;
  }
  if (!ok) return res.status(400).json({ error: "That code isn't right, or it has expired. Check the text, or ask for a new code." });
  setSession(res, m); res.json({ ok: true });
}));

router.post("/out", (req, res) => { res.clearCookie(COOKIE, { path: "/" }); res.json({ ok: true }); });

// ---- what CALMS holds for this number ----
const STAGE_OF = { draft: 0, submitted: 1, review: 2, approved: 3, awaiting: 3, accepted: 4, funded: 5, declined: 3, rejected: 2 };
const NOTE = { draft: "Your application is being prepared.", submitted: "Your papers are being checked.", review: "An underwriter is reviewing your application.", approved: "Approved. We'll show you the final numbers before you sign.",
  awaiting: "We sent you an offer. Please answer it below.", accepted: "Accepted. Your loan is being released.", funded: "Your loan is released. Your schedule is below.", declined: "This offer was declined.", rejected: "This application was closed. The branch can tell you more." };

router.get("/", wrap(async (req, res) => {
  const m = who(req, res); if (!m) return;
  await site.ensure();
  const B = (await db.query(`select * from borrowers where ${MOBILE_IS.replace("%s", "mobile")} order by created_at desc`, [m])).rows;
  const W = (await db.query(`select reference, product, amount, term_months, status, created_at, full_name, email, address, application_id from web_applications where ${MOBILE_IS.replace("%s", "mobile")} order by created_at desc`, [m])).rows;
  const ids = B.map((b) => b.id);
  const A = ids.length ? (await db.query(`select a.*, p.name product, p.monthly_rate, p.interest_method, p.processing_fee from applications a join loan_products p on p.id = a.product_id
      where a.borrower_id = any($1) order by a.created_at desc`, [ids])).rows : [];
  const aIds = A.map((a) => a.id);
  const [docs, offers, answers, reqs, accts] = aIds.length ? await Promise.all([
    db.query("select application_id, slot, max(uploaded_at) at from documents where application_id = any($1) group by application_id, slot", [aIds]),
    db.query("select * from counter_offers where application_id = any($1) order by n", [aIds]),
    db.query("select o.offer_id, o.answer from offer_answers o join counter_offers c on c.id = o.offer_id where c.application_id = any($1)", [aIds]),
    db.query("select id, kind, application_id, account_id, offer_id, details, status, staff_note, created_at, handled_at from web_requests where mobile = $1 order by created_at desc limit 40", [m]),
    db.query("select l.*, a.reference, p.name product from loan_accounts l join applications a on a.id = l.application_id join loan_products p on p.id = a.product_id where l.application_id = any($1) order by l.released_on desc", [aIds]),
  ]).then((r) => r.map((x) => x.rows)) : [[], [], [], (await db.query("select id, kind, application_id, account_id, offer_id, details, status, staff_note, created_at, handled_at from web_requests where mobile = $1 order by created_at desc limit 40", [m])).rows, []];
  const answered = Object.fromEntries(answers.map((x) => [String(x.offer_id), x.answer]));
  const sentPaper = (appId, slot) => reqs.find((r) => r.kind === "paper" && r.application_id === appId && r.details.slot === slot && r.status === "new");
  const applications = [];
  for (const a of A) {
    const list = await intake.checklistFor(intake.kindOf(a.product)), have = new Set(docs.filter((d) => d.application_id === a.id).map((d) => d.slot));
    const live = intake.ACTIVE.includes(a.status);
    const papers = list.map(([slot, label]) => ({ slot, label, state: have.has(slot) ? "on file" : sentPaper(a.id, slot) ? "sent" : "missing" }));
    const offer = offers.filter((o) => o.application_id === a.id).pop();
    let o = null;
    if (offer) { const amt = Number(offer.amount), term = offer.term_months, monthly = loans.round(loans.installment(amt, term, Number(a.monthly_rate), a.interest_method)), fee = loans.round(amt * Number(a.processing_fee));
      const sent = reqs.find((r) => r.kind === "offer" && String(r.offer_id) === String(offer.id) && r.status === "new");
      o = { id: offer.id, n: offer.n, amount: amt, months: term, monthly, fee, receive: loans.round(amt - fee), status: offer.status, answer: answered[String(offer.id)] || null, sent: sent ? sent.details.answer : null, remarks: offer.remarks || "" }; }
    applications.push({ reference: a.reference, product: a.product, amount: Number(a.amount), months: a.term_months, status: a.status, stage: STAGE_OF[a.status] || 0, since: a.status_since, note: NOTE[a.status] || "",
      papers: live ? papers : [], offer: o && (o.status === "awaiting" || o.answer) ? o : null });
  }
  for (const w of W) if (!w.application_id) applications.push({ reference: w.reference, product: w.product, amount: Number(w.amount), months: w.term_months, status: "received", stage: 0, since: w.created_at,
    note: w.status === "called" ? "A loan processor has called you about this application and is putting it into our system." : "We have your online application. A loan processor will call you within one working day.", papers: [], offer: null, online: true });
  const accounts = [];
  for (const l of accts) {
    const ins = (await db.query("select * from installments where account_id = $1 order by n", [l.id])).rows;
    const pays = (await db.query("select receipt, amount, paid_on, channel, reverses from payments where account_id = $1 order by posted_at desc", [l.id])).rows;
    const st = loans.standing(ins, today(), Number(l.late_penalty));
    const rows = ins.map((i) => { const due = loans.round(Number(i.principal) + Number(i.interest)), paid = loans.round(Number(i.paid_principal) + Number(i.paid_interest)), left = loans.round(due - paid);
      return { n: i.n, due: i.due_on, amount: due, paid, penalty: Number(i.paid_penalty), state: left <= .004 ? (Number(i.paid_penalty) > 0 ? "paid late" : "paid") : i.due_on < today() ? "late" : st.next && st.next.n === i.n ? "next" : "coming" }; });
    const told = reqs.filter((r) => r.kind === "payment" && r.account_id === l.id && r.status === "new").map((r) => ({ amount: Number(r.details.amount), channel: r.details.channel, paidOn: r.details.paid_on, at: r.created_at }));
    accounts.push({ number: l.number, reference: l.reference, product: l.product, principal: Number(l.principal), months: l.term_months, released: l.released_on, closed: !!l.closed_on,
      balance: st.principalLeft, overdue: st.overdue, penalty: st.penalty, daysLate: st.daysPastDue, next: st.next, rows,
      paidSoFar: loans.round(pays.reduce((s, p) => s + Number(p.amount), 0)), receipts: pays.filter((p) => Number(p.amount) > 0).map((p) => ({ receipt: p.receipt, amount: Number(p.amount), paidOn: p.paid_on, channel: p.channel })), told });
  }
  const me = B[0] || W[0] || {};
  res.json({ name: String(me.full_name || "").split(" ")[0] || "there", fullName: me.full_name || "", mobile: mask(m), email: maskEmail(me.email), address: me.address ? String(me.address).split(",").slice(-2).join(",").trim() : "",
    applications, accounts, requests: reqs.map((r) => ({ kind: r.kind, status: r.status, note: r.staff_note || "", at: r.created_at, done: r.handled_at, details: r.kind === "paper" ? { label: r.details.label } : r.kind === "payment" ? { amount: r.details.amount, channel: r.details.channel } : { answer: r.details.answer } })) });
}));

// ---- what a borrower sends ----
async function mineApp(m, ref) {
  const { rows } = await db.query(`select a.*, p.name product, b.full_name from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id
      where a.reference = $2 and ${MOBILE_IS.replace("%s", "b.mobile")}`, [m, String(ref || "").toUpperCase()]);
  return rows[0];
}
router.post("/offer", wrap(async (req, res) => {
  const m = who(req, res); if (!m) return;
  if (!canSend("send:" + m)) return res.status(429).json({ error: "Please wait a minute." });
  const answer = req.body && req.body.answer === "accepted" ? "accepted" : req.body && req.body.answer === "declined" ? "declined" : null;
  if (!answer) return res.status(400).json({ error: "Choose to take the offer or not." });
  const { rows } = await db.query(`select c.*, a.reference, a.status app_status, b.full_name from counter_offers c join applications a on a.id = c.application_id join borrowers b on b.id = a.borrower_id
      where c.id = $2 and ${MOBILE_IS.replace("%s", "b.mobile")}`, [m, Number(req.body.offerId) || 0]);
  const o = rows[0];
  if (!o || o.status !== "awaiting" || o.app_status !== "awaiting") return res.status(409).json({ error: "This offer can no longer be answered here. Please call the branch." });
  const dup = (await db.query("select id from web_requests where kind = 'offer' and offer_id = $1 and status = 'new'", [o.id])).rows[0];
  if (dup) await db.query("update web_requests set details = $2, created_at = now() where id = $1", [dup.id, { answer }]);
  else await db.query("insert into web_requests (kind, mobile, borrower_name, application_id, offer_id, details) values ('offer', $1, $2, $3, $4, $5)", [m, o.full_name, o.application_id, o.id, { answer, reference: o.reference, n: o.n }]);
  res.json({ ok: true });
}));
router.post("/paper", wrap(async (req, res) => {
  const m = who(req, res); if (!m) return;
  if (!canSend("send:" + m)) return res.status(429).json({ error: "Please wait a minute." });
  const a = await mineApp(m, req.body && req.body.ref);
  if (!a || !intake.ACTIVE.includes(a.status)) return res.status(409).json({ error: "Papers for this application can't be sent here any more. Please bring them to the branch." });
  const list = await intake.checklistFor(intake.kindOf(a.product)), item = list.find(([s]) => s === String(req.body.slot || ""));
  if (!item) return res.status(400).json({ error: "Choose which paper this is." });
  const u = readUpload(req.body.file);
  if (u.error) return res.status(400).json({ error: u.error });
  if (u.size > 5 * 1024 * 1024) return res.status(400).json({ error: "Each paper can be up to 5 MB here. Bring a bigger file to the branch." });
  await db.transaction(async (tx) => {
    const r = await tx.query("insert into web_requests (kind, mobile, borrower_name, application_id, details) values ('paper', $1, $2, $3, $4) returning id",
      [m, a.full_name, a.id, { slot: item[0], label: item[1], reference: a.reference, file_name: u.name, mime: u.mime, size: u.size, sha256: u.sha256 }]);
    await tx.query("insert into web_request_files (request_id, bytes) values ($1, $2)", [r.rows[0].id, u.bytes]);
  });
  res.json({ ok: true });
}));
const CHANNELS = ["GCash", "Bank deposit", "Cash at the branch", "Salary deduction", "Cheque"];
router.post("/payment", wrap(async (req, res) => {
  const m = who(req, res); if (!m) return;
  if (!canSend("send:" + m)) return res.status(429).json({ error: "Please wait a minute." });
  const b = req.body || {}, amount = Math.round(Number(String(b.amount || "").replace(/[^0-9.]/g, "")) * 100) / 100, channel = CHANNELS.includes(b.channel) ? b.channel : null;
  const reference = String(b.reference || "").replace(/[^\w\s#-]/g, "").trim().slice(0, 40), paidOn = /^\d{4}-\d{2}-\d{2}$/.test(String(b.paidOn || "")) ? b.paidOn : null;
  if (!(amount > 0 && amount <= 5000000)) return res.status(400).json({ error: "Type the amount you paid." });
  if (!channel) return res.status(400).json({ error: "Choose how you paid." });
  if (!paidOn || paidOn > today() || paidOn < "2020-01-01") return res.status(400).json({ error: "Choose the day you paid." });
  const { rows } = await db.query(`select l.id, l.number, b.full_name from loan_accounts l join applications a on a.id = l.application_id join borrowers b on b.id = a.borrower_id
      where l.number = $2 and ${MOBILE_IS.replace("%s", "b.mobile")}`, [m, String(b.account || "").toUpperCase()]);
  if (!rows[0]) return res.status(404).json({ error: "We couldn't find that loan account." });
  await db.query("insert into web_requests (kind, mobile, borrower_name, account_id, details) values ('payment', $1, $2, $3, $4)",
    [m, rows[0].full_name, rows[0].id, { amount, channel, reference, paid_on: paidOn, account: rows[0].number }]);
  res.json({ ok: true });
}));

module.exports = router;
