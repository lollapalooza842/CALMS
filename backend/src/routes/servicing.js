// From the offer to the money.
// On one application (mounted at /api/applications/:ref):
//   GET  /offers                 the offers made, the borrower's answers, and what can be done next
//   POST /offers/:n/answer       { answer, channel, toldAt, note, proof: {name, data} } the borrower's answer, with proof
//   POST /offers                 { amount, termMonths, remarks, code } a new offer after a decline (underwriter)
//   POST /reject                 { reason, code } reject after a decline (underwriter)
//   GET  /agreement              terms, schedule, disclosure and signing state
//   POST /agreement/disclosure   { disclosedOn } the disclosure statement was given (and the papers generated)
//   POST /agreement/signed       { signedOn, allSigned, file } upload the signed agreement; it is locked
//   GET  /release                what the disbursement officer needs
//   POST /release                { channel, bank, accountName, accountNo, idChecked, nameMatches, reference, code }
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const loans = require("../lib/loans");
const intake = require("../lib/intake");
const totp = require("../lib/totp");
const { readUpload } = require("../lib/files");
const { allow } = require("../lib/auth");

const router = express.Router({ mergeParams: true });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const peso = intake.peso;
const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);   // Manila date
const ALL = ["sales_agent", "loan_processor", "underwriter", "lead_underwriter", "disbursement_officer", "loan_account_officer", "operations_manager", "compliance_auditor", "system_administrator"];
const CHANNELS = { pn: "PESONet", ip: "InstaPay", cq: "Cheque", ca: "Cash" };

async function load(ref) {
  const { rows } = await db.query(`select a.*, b.full_name, b.mobile, b.email, b.id_type, b.id_number, b.address, p.name as product, p.monthly_rate, p.interest_method,
        p.processing_fee, p.late_penalty, p.min_amount, p.max_amount, p.terms_months, en.short_name as encoder, ag.short_name as agent
      from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id
      join users en on en.id = a.encoded_by left join users ag on ag.id = a.agent_id where a.reference = $1`, [ref]);
  return rows[0] || null;
}
function codeOk(user, code) {
  const dev = process.env.NODE_ENV !== "production" && process.env.DEV_MFA_CODE && code === process.env.DEV_MFA_CODE;
  return dev || totp.check(user.mfa_secret, String(code || ""));
}
const err = (res, status, error, field) => res.status(status).json({ error, field });
async function stage(tx, appId, status, by, since, at) {
  await tx.query("insert into application_stages (application_id, status, handled_by, entered_at, left_at) values ($1, $2, $3, $4, $5)", [appId, status, by, since, at]);
}
// The terms that go into the agreement: the accepted offer, or what was approved as asked.
async function finalTerms(a) {
  const o = (await db.query("select amount, term_months from counter_offers where application_id = $1 and status = 'accepted' order by n desc limit 1", [a.id])).rows[0];
  if (o) return { amount: Number(o.amount), term: o.term_months };
  return { amount: Number(a.approved_amount || a.amount), term: a.approved_term || a.term_months };
}
async function saveFile(tx, appId, slot, file, userId) {
  const v = (await tx.query("select coalesce(max(version), 0) + 1 as v from documents where application_id = $1 and slot = $2", [appId, slot])).rows[0].v;
  const d = await tx.query(`insert into documents (application_id, slot, version, file_name, mime_type, size_bytes, sha256, uploaded_by)
      values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`, [appId, slot, v, file.name, file.mime, file.size, file.sha256, userId]);
  await tx.query("insert into document_files (document_id, bytes) values ($1, $2)", [d.rows[0].id, file.bytes]);
  return d.rows[0].id;
}

// ---- counter-offers and the borrower's answer ----
router.get("/offers", allow(...ALL), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  if (req.user.role === "sales_agent" && a.agent_id !== req.user.id) return err(res, 403, "That application is not yours.");
  const offers = (await db.query(`select c.*, u.short_name as by, x.answer, x.channel, x.told_at, x.note, x.proof_doc, x.recorded_at, r.short_name as recorded_by
      from counter_offers c join users u on u.id = c.issued_by left join offer_answers x on x.offer_id = c.id left join users r on r.id = x.recorded_by
      where c.application_id = $1 order by c.n`, [a.id])).rows;
  const d = a.details || {}, last = offers[offers.length - 1], uw = ["underwriter", "lead_underwriter"].includes(req.user.role);
  const bureau = (await db.query("select tradelines from bureau_reports where application_id = $1 and outcome = 'ok' order by id desc limit 1", [a.id])).rows[0];
  const debt = bureau ? bureau.tradelines.reduce((s, t) => s + Number(t[5] || 0), 0) : Number(d.debts) || 0;
  res.json({
    reference: a.reference, borrower: a.full_name, product: a.product, status: a.status, agent: a.agent || "", hasEmail: !!a.email,
    ask: { amount: Number(a.amount), term: a.term_months }, rate: Number(a.monthly_rate), method: a.interest_method, fee: Number(a.processing_fee),
    income: Number(d.income) || 1, debt, collateral: intake.kindOf(a.product) === "sme" && Number(d.collateral) > 0 ? Number(d.collateral) : null,
    min: Number(a.min_amount), max: Number(a.max_amount), terms: a.terms_months, limit: Number(req.user.approval_limit || 0),
    offers: offers.map((o) => ({ n: o.n, amount: Number(o.amount), term: o.term_months, status: o.status, by: o.by, at: o.issued_at, remarks: o.remarks || "",
      answer: o.answer ? { answer: o.answer, channel: o.channel, toldAt: o.told_at, note: o.note || "", by: o.recorded_by, at: o.recorded_at, proof: o.proof_doc } : null })),
    canAnswer: a.status === "awaiting" && !!last && last.status === "awaiting" && ((req.user.role === "loan_processor" && !a.agent_id) || (req.user.role === "sales_agent" && a.agent_id === req.user.id)),
    canCounter: a.status === "declined" && uw,
  });
}));

router.post("/offers/:n/answer", allow("sales_agent", "loan_processor"), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  // BR-011: only the borrower's assigned sales agent records the answer. A walk-in has no agent, so a loan processor does.
  if (req.user.role === "sales_agent" && a.agent_id !== req.user.id) return err(res, 403, "Only the assigned sales agent records the answer.");
  if (req.user.role === "loan_processor" && a.agent_id) return err(res, 403, "Only the assigned sales agent" + (a.agent ? ", " + a.agent + "," : "") + " records the answer.");
  const o = (await db.query("select * from counter_offers where application_id = $1 and n = $2", [a.id, Number(req.params.n)])).rows[0];
  if (!o || o.status !== "awaiting" || a.status !== "awaiting") return err(res, 409, "This offer is not waiting for an answer.");
  const answer = req.body.answer, channel = String(req.body.channel || ""), note = String(req.body.note || "").trim().slice(0, 500);
  if (!["accepted", "declined"].includes(answer)) return err(res, 400, "Choose what the borrower answered.", "ans");
  if (!["In person", "Phone call", "SMS", "Email"].includes(channel)) return err(res, 400, "Choose how the borrower told you.", "chan");
  const told = new Date(req.body.toldAt);
  if (isNaN(told)) return err(res, 400, "Enter when the borrower told you.", "when");
  if (told > new Date(Date.now() + 60000)) return err(res, 400, "That time is in the future.", "when");
  if (told < new Date(new Date(o.issued_at).getTime() - 60000)) return err(res, 400, "That is before the offer was issued.", "when");   // a minute's grace: the form keeps minutes, not seconds
  const file = readUpload(req.body.proof);
  if (file.error) return err(res, 400, req.body.proof ? file.error : "Attach the proof: the signed offer sheet, or a photo or screenshot of the reply.", "proof");
  const at = new Date();
  await db.transaction(async (tx) => {
    const docId = await saveFile(tx, a.id, "offer-answer", file, req.user.id);
    await tx.query(`insert into offer_answers (offer_id, answer, channel, told_at, note, proof_doc, recorded_by) values ($1, $2, $3, $4, $5, $6, $7)`, [o.id, answer, channel, told, note || null, docId, req.user.id]);
    await tx.query("update counter_offers set status = $2 where id = $1", [o.id, answer]);
    await stage(tx, a.id, "awaiting", req.user.id, a.status_since, at);
    await tx.query("update applications set status = $2, status_since = $3" + (answer === "accepted" ? ", approved_amount = $4, approved_term = $5" : "") + " where id = $1",
      answer === "accepted" ? [a.id, "accepted", at, o.amount, o.term_months] : [a.id, "declined", at]);
    await audit.write({ user: req.user, kind: "status", action: `Recorded the borrower's answer: ${answer} offer ${o.n}`, record: a.reference,
      after: { offer: o.n, answer, channel, toldAt: told.toISOString(), proof: file.name, sha256: file.sha256 }, ip: req.ip }, tx);
  });
  res.json({ status: answer === "accepted" ? "accepted" : "declined" });
}));

router.post("/offers", allow("underwriter", "lead_underwriter"), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  if (a.status !== "declined") return err(res, 409, "A new offer can be made only after the borrower declined the last one.");
  if (a.encoded_by === req.user.id) return err(res, 403, "You encoded this application, so you cannot decide it.");
  const amount = Number(String(req.body.amount || "").replace(/[^0-9.]/g, "")), term = Number(req.body.termMonths), remarks = String(req.body.remarks || "").trim();
  if (!Number.isFinite(amount) || amount % 1000) return err(res, 400, "Enter the amount in whole thousands.", "amt");
  if (amount < Number(a.min_amount) || amount > Number(a.max_amount)) return err(res, 400, `${a.product} runs from ${peso(a.min_amount)} to ${peso(a.max_amount)}.`, "amt");
  if (!a.terms_months.includes(term)) return err(res, 400, `${a.product} terms are ${a.terms_months.join(", ")} months.`, "term");
  if (amount > Number(req.user.approval_limit || 0)) return err(res, 403, `${peso(amount)} is over your approval limit.`, "amt");
  const prev = (await db.query("select * from counter_offers where application_id = $1 order by n desc limit 1", [a.id])).rows[0];
  if (prev && Number(prev.amount) === amount && prev.term_months === term) return err(res, 400, "That is the offer that was just declined. Change the amount or the term.", "amt");
  if (remarks.length < 10) return err(res, 400, "Say in the remarks why this offer is different (at least 10 characters).", "rm");
  if (!codeOk(req.user, req.body.code)) return err(res, 401, "That authenticator code is not right. Nothing was issued.", "mfa");
  const n = prev ? prev.n + 1 : 1, at = new Date();
  await db.transaction(async (tx) => {
    await tx.query("insert into counter_offers (application_id, n, amount, term_months, remarks, issued_by, issued_at) values ($1, $2, $3, $4, $5, $6, $7)", [a.id, n, amount, term, remarks, req.user.id, at]);
    await stage(tx, a.id, "declined", req.user.id, a.status_since, at);
    await tx.query("update applications set status = 'awaiting', status_since = $2 where id = $1", [a.id, at]);
    await audit.write({ user: req.user, kind: "decision", action: `Issued counter-offer ${n}`, record: a.reference, after: { offer: n, amount, termMonths: term }, ip: req.ip }, tx);
  });
  res.json({ status: "awaiting", n });
}));

router.post("/reject", allow("underwriter", "lead_underwriter"), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  if (a.status !== "declined") return err(res, 409, "Only an application whose offer was declined can be rejected here.");
  const reason = String(req.body.reason || "").trim();
  if (reason.length < 10) return err(res, 400, "Give the reason for rejecting (at least 10 characters). It is sent back with the application.", "why");
  if (!codeOk(req.user, req.body.code)) return err(res, 401, "That authenticator code is not right. Nothing was signed.", "mfa");
  const at = new Date();
  await db.transaction(async (tx) => {
    await stage(tx, a.id, "declined", req.user.id, a.status_since, at);
    await tx.query("update applications set status = 'rejected', status_since = $2 where id = $1", [a.id, at]);
    await audit.write({ user: req.user, kind: "decision", action: "Rejected after the borrower declined", record: a.reference, after: { reason }, ip: req.ip }, tx);
  });
  res.json({ status: "rejected" });
}));

// ---- the loan agreement ----
async function agreementView(a, user) {
  const t = await finalTerms(a), ag = (await db.query(`select g.*, u.short_name as locker, d.file_name, d.sha256 from agreements g left join users u on u.id = g.locked_by
      left join documents d on d.id = g.signed_doc where g.application_id = $1`, [a.id])).rows[0];
  const rate = Number(a.monthly_rate), fee = loans.round(t.amount * Number(a.processing_fee)), pay = loans.installment(t.amount, t.term, rate, a.interest_method);
  const sched = loans.schedule(t.amount, t.term, rate, a.interest_method, today());
  const interest = loans.round(sched.reduce((s, r) => s + r.interest, 0));
  return {
    reference: a.reference, borrower: a.full_name, address: a.address || "", product: a.product, status: a.status, agent: a.agent || "",
    amount: t.amount, term: t.term, rate, method: a.interest_method, feeRate: Number(a.processing_fee), fee, net: loans.round(t.amount - fee),
    payment: loans.round(pay), interest, penalty: Number(a.late_penalty), schedule: sched,
    generatedAt: ag ? ag.generated_at : null, disclosedOn: ag && ag.disclosed_on ? String(ag.disclosed_on) : "",
    signedOn: ag && ag.signed_on ? String(ag.signed_on) : "", lockedAt: ag ? ag.locked_at : null, lockedBy: ag ? ag.locker : "",
    signedFile: ag && ag.signed_doc ? { id: ag.signed_doc, name: ag.file_name, sha256: ag.sha256 } : null,
    canWork: user.role === "loan_processor" && ["approved", "accepted"].includes(a.status) && !(ag && ag.locked_at),
  };
}
router.get("/agreement", allow(...ALL), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  res.json(await agreementView(a, req.user));
}));
router.post("/agreement/disclosure", allow("loan_processor"), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  if (!["approved", "accepted"].includes(a.status)) return err(res, 409, "The agreement is prepared only after approval or the borrower's acceptance.");
  const on = String(req.body.disclosedOn || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return err(res, 400, "Enter the date the disclosure statement was given.", "disc");
  if (on > today()) return err(res, 400, "That date is in the future.", "disc");
  const t = await finalTerms(a);
  await db.transaction(async (tx) => {
    const g = (await tx.query("select * from agreements where application_id = $1 for update", [a.id])).rows[0];
    if (g && g.locked_at) throw Object.assign(new Error("The agreement is already signed and locked."), { status: 409 });
    if (g) await tx.query("update agreements set disclosed_on = $2 where id = $1", [g.id, on]);
    else await tx.query("insert into agreements (application_id, amount, term_months, generated_by, disclosed_on) values ($1, $2, $3, $4, $5)", [a.id, t.amount, t.term, req.user.id, on]);
    await audit.write({ user: req.user, kind: "doc", action: "Gave the borrower the disclosure statement", record: a.reference, after: { disclosedOn: on, amount: t.amount, termMonths: t.term }, ip: req.ip }, tx);
  });
  res.json(await agreementView(a, req.user));
}));
router.post("/agreement/signed", allow("loan_processor"), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  if (!["approved", "accepted"].includes(a.status)) return err(res, 409, "The agreement is signed only after approval or the borrower's acceptance.");
  const g = (await db.query("select * from agreements where application_id = $1", [a.id])).rows[0];
  if (!g || !g.disclosed_on) return err(res, 409, "Give the disclosure statement first. It must reach the borrower before the agreement is signed.");
  if (g.locked_at) return err(res, 409, "The agreement is already signed and locked.");
  const on = String(req.body.signedOn || ""), disc = String(g.disclosed_on);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(on)) return err(res, 400, "Enter the date the borrower signed.", "sdate");
  if (on > today()) return err(res, 400, "The signing date is in the future.", "sdate");
  if (on < disc) return err(res, 400, `She cannot have signed before the disclosure statement was given to her (${disc}).`, "sdate");
  if (!req.body.allSigned) return err(res, 400, "Confirm that she signed in every place marked.", "all");
  const file = readUpload(req.body.file); if (file.error) return err(res, 400, req.body.file ? file.error : "Attach the scan of the signed agreement.", "file");
  const at = new Date();
  await db.transaction(async (tx) => {
    const docId = await saveFile(tx, a.id, "agreement", file, req.user.id);
    await tx.query("update agreements set signed_on = $2, signed_doc = $3, locked_by = $4, locked_at = $5 where id = $1", [g.id, on, docId, req.user.id, at]);
    if (a.status === "approved") { await stage(tx, a.id, "approved", req.user.id, a.status_since, at); await tx.query("update applications set status = 'accepted', status_since = $2 where id = $1", [a.id, at]); }
    await audit.write({ user: req.user, kind: "doc", action: "Filed and locked the signed loan agreement", record: a.reference, after: { signedOn: on, file: file.name, sha256: file.sha256 }, ip: req.ip }, tx);
  });
  res.json(await agreementView(await load(req.params.ref), req.user));
}));

// ---- release ----
router.get("/release", allow(...ALL), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  const ag = await agreementView(a, req.user), done = (await db.query(`select d.*, l.number, u.short_name as by from disbursements d join loan_accounts l on l.id = d.account_id
      join users u on u.id = d.released_by where d.application_id = $1`, [a.id])).rows[0];
  res.json({ ...ag, idType: a.id_type || "", mobile: a.mobile || "", agreementLocked: !!ag.lockedAt, encodedBy: a.encoder,
    canRelease: req.user.role === "disbursement_officer" && a.status === "accepted" && !!ag.lockedAt && !done,
    released: done ? { account: done.number, net: Number(done.net), channel: done.channel, payee: done.payee, reference: done.reference, by: done.by, at: done.released_at } : null });
}));
router.post("/release", allow("disbursement_officer"), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return err(res, 404, "No application has that number.");
  if (a.status !== "accepted") return err(res, 409, "Only an accepted application can be released.");
  const g = (await db.query("select * from agreements where application_id = $1", [a.id])).rows[0];
  if (!g || !g.locked_at) return err(res, 409, "The signed loan agreement is not on file yet. Nothing can be released.");
  const b = req.body, ch = CHANNELS[b.channel];
  if (!ch) return err(res, 400, "Choose how the money is sent.", "ch");
  if (!b.idChecked) return err(res, 400, "Confirm that you checked the borrower's original ID.", "idok");
  const t = await finalTerms(a), fee = loans.round(t.amount * Number(a.processing_fee)), net = loans.round(t.amount - fee);
  const payee = { name: String(b.accountName || a.full_name).trim().slice(0, 120) };
  if (b.channel === "pn" || b.channel === "ip") {
    if (!b.nameMatches) return err(res, 400, "Confirm that the account is in the borrower's own name.", "nameok");
    const no = String(b.accountNo || "").replace(/\D/g, ""), again = String(b.accountNoAgain || "").replace(/\D/g, "");
    if (no.length < 10 || no.length > 16) return err(res, 400, "Enter the account number from the passbook (10 to 16 digits).", "acct");
    if (again !== no) return err(res, 400, "The account number typed twice does not match. Check the passbook again.", "acct2");
    if (b.channel === "ip" && net > 50000) return err(res, 400, "InstaPay carries up to ₱ 50,000.00. Use PESONet for this amount.", "ch");
    payee.bank = String(b.bank || "").trim().slice(0, 60); payee.account = "•••• " + no.slice(-4);
    if (!payee.bank) return err(res, 400, "Enter the bank.", "bank");
  } else if (b.channel === "cq") { payee.cheque = String(b.reference || "").trim(); if (!/^\d{6,10}$/.test(payee.cheque)) return err(res, 400, "Enter the cheque number (6 to 10 digits).", "chq"); }
  else if (net > 100000) return err(res, 400, "Cash is paid at the counter only up to ₱ 100,000.00.", "ch");
  if (!codeOk(req.user, b.code)) return err(res, 401, "That authenticator code is not right. Nothing was released.", "mfa");
  const at = new Date(), on = today(), year = on.slice(0, 4);
  const result = await db.transaction(async (tx) => {
    const cur = (await tx.query("select status from applications where id = $1 for update", [a.id])).rows[0];
    if (cur.status !== "accepted") throw Object.assign(new Error("Already released."), { status: 409 });
    const c = await tx.query(`insert into counters (name, value) values ($1, 163) on conflict (name) do update set value = counters.value + 1 returning value`, ["loan-" + year]);
    const number = `LN-${year}-${String(c.rows[0].value).padStart(4, "0")}`;
    const acc = await tx.query(`insert into loan_accounts (number, application_id, principal, monthly_rate, interest_method, term_months, late_penalty, released_on)
        values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`, [number, a.id, t.amount, a.monthly_rate, a.interest_method, t.term, a.late_penalty, on]);
    for (const r of loans.schedule(t.amount, t.term, Number(a.monthly_rate), a.interest_method, on))
      await tx.query("insert into installments (account_id, n, due_on, principal, interest) values ($1, $2, $3, $4, $5)", [acc.rows[0].id, r.n, r.dueOn, r.principal, r.interest]);
    const ref = b.channel === "pn" ? "PN-" + Date.now().toString().slice(-8) : b.channel === "ip" ? "IP-" + Date.now().toString().slice(-8) : b.channel === "cq" ? "CHQ-" + payee.cheque : "CASH-" + Date.now().toString().slice(-6);
    await tx.query(`insert into disbursements (application_id, account_id, gross, fee, net, channel, payee, reference, released_by, released_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [a.id, acc.rows[0].id, t.amount, fee, net, ch, payee, ref, req.user.id, at]);
    await stage(tx, a.id, "accepted", req.user.id, a.status_since, at);
    await tx.query("update applications set status = 'funded', status_since = $2 where id = $1", [a.id, at]);
    await audit.write({ user: req.user, kind: "pay", action: `Released ${peso(net)} by ${ch}. Opened loan account ${number}`, record: a.reference,
      after: { account: number, gross: t.amount, fee, net, channel: ch, reference: ref, payee }, ip: req.ip }, tx);
    return { account: number, reference: ref, net, channel: ch, at };
  });
  res.json(result);
}));

module.exports = router;
module.exports.CHANNELS = CHANNELS;
