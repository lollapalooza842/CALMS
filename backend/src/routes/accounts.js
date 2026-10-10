// Money across all loans.
//   GET  /api/disbursements                          the shelf: accepted loans waiting for release, and today's releases
//   GET  /api/loan-accounts                          every loan account and where it stands
//   GET  /api/loan-accounts/:no                      one account: schedule, payments, release
//   GET  /api/loan-accounts/:no/allocation           ?amount=&paidOn=  how a payment would be split (nothing is saved)
//   POST /api/loan-accounts/:no/payments             { amount, paidOn, channel, reference } post a payment
//   POST /api/loan-accounts/:no/payments/:receipt/reverse   { reason } undo a payment with a reversal entry
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const loans = require("../lib/loans");
const intake = require("../lib/intake");
const { allow } = require("../lib/auth");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const iso = (d) => (d instanceof Date ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : String(d));
const err = (res, status, error, field) => res.status(status).json({ error, field });
const VIEW = ["disbursement_officer", "loan_account_officer", "operations_manager", "compliance_auditor", "system_administrator", "lead_underwriter", "loan_processor"];
const POSTERS = ["loan_account_officer"];
const PAY_CHANNELS = ["Cash at the branch", "Bank deposit", "GCash", "Salary deduction", "Cheque"];

router.get("/disbursements", allow(...VIEW), wrap(async (req, res) => {
  const shelf = (await db.query(`select a.reference, a.status_since, b.full_name, p.name as product, p.processing_fee, coalesce(a.approved_amount, a.amount) as amount, coalesce(a.approved_term, a.term_months) as term,
        g.locked_at, ag.short_name as agent
      from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id left join agreements g on g.application_id = a.id left join users ag on ag.id = a.agent_id
      where a.status = 'accepted' order by a.status_since`)).rows;
  const done = (await db.query(`select d.*, a.reference, b.full_name, l.number, u.short_name as by from disbursements d join applications a on a.id = d.application_id
      join borrowers b on b.id = a.borrower_id join loan_accounts l on l.id = d.account_id join users u on u.id = d.released_by
      where d.released_at > now() - interval '1 day' order by d.released_at desc`)).rows;
  res.json({
    shelf: shelf.map((r) => ({ reference: r.reference, borrower: r.full_name, product: r.product, amount: Number(r.amount), term: r.term, net: loans.round(Number(r.amount) * (1 - Number(r.processing_fee))),
      since: r.status_since, ready: !!r.locked_at, agent: r.agent || "", blocker: r.locked_at ? "" : "The signed loan agreement is not on file yet." })),
    released: done.map((d) => ({ reference: d.reference, borrower: d.full_name, account: d.number, net: Number(d.net), channel: d.channel, ref: d.reference, payee: d.payee, by: d.by, at: d.released_at })),
  });
}));

async function account(no) {
  const a = (await db.query(`select l.*, ap.reference, b.full_name, b.mobile, b.address, b.email, b.id as borrower_id, p.name as product, ag.short_name as agent
      from loan_accounts l join applications ap on ap.id = l.application_id join borrowers b on b.id = ap.borrower_id
      join loan_products p on p.id = ap.product_id left join users ag on ag.id = ap.agent_id where l.number = $1`, [no])).rows[0];
  if (!a) return null;
  a.insts = (await db.query("select * from installments where account_id = $1 order by n", [a.id])).rows.map((i) => ({ ...i, due_on: iso(i.due_on) }));
  return a;
}
function shapeList(a, on) {
  const s = loans.standing(a.insts, on, Number(a.late_penalty));
  return { number: a.number, reference: a.reference, borrower: a.full_name, product: a.product, principal: Number(a.principal), term: a.term_months,
    releasedOn: iso(a.released_on), agent: a.agent || "", ...s, rate: Number(a.monthly_rate), method: a.interest_method,
    payment: a.insts.length ? loans.round(Number(a.insts[0].principal) + Number(a.insts[0].interest)) : 0,
    missed: a.insts.filter((i) => i.due_on < on && Number(i.paid_principal) + Number(i.paid_interest) < Number(i.principal) + Number(i.interest) - 0.004).length,
    // paid installments in order: o = on time, L = paid with a late penalty
    history: a.insts.filter((i) => Number(i.paid_principal) + Number(i.paid_interest) >= Number(i.principal) + Number(i.interest) - 0.004).map((i) => (Number(i.paid_penalty) > 0 ? "L" : "o")).join(""), paidCount: a.insts.filter((i) => Number(i.paid_principal) + Number(i.paid_interest) >= Number(i.principal) + Number(i.interest) - 0.004).length };
}

router.get("/loan-accounts", allow(...VIEW), wrap(async (req, res) => {
  const nos = (await db.query("select number from loan_accounts order by released_on desc, number desc")).rows;
  const on = today(), list = [];
  for (const r of nos) list.push(shapeList(await account(r.number), on));
  res.json({ today: on, accounts: list });
}));

router.get("/loan-accounts/:no", allow(...VIEW), wrap(async (req, res) => {
  const a = await account(req.params.no); if (!a) return err(res, 404, "No loan account has that number.");
  const on = today();
  const pays = (await db.query(`select p.*, u.short_name as by, r.receipt as reverses_receipt, (select x.receipt from payments x where x.reverses = p.id limit 1) as reversed_by
      from payments p join users u on u.id = p.posted_by left join payments r on r.id = p.reverses where p.account_id = $1 order by p.posted_at`, [a.id])).rows;
  const dis = (await db.query("select d.*, u.short_name as by from disbursements d join users u on u.id = d.released_by where d.account_id = $1", [a.id])).rows[0];
  res.json({ ...shapeList(a, on), today: on, rate: Number(a.monthly_rate), method: a.interest_method, penaltyRate: Number(a.late_penalty), mobile: a.mobile || "", address: a.address || "",
    schedule: a.insts.map((i) => ({ n: i.n, dueOn: i.due_on, principal: Number(i.principal), interest: Number(i.interest), paidPrincipal: Number(i.paid_principal), paidInterest: Number(i.paid_interest),
      paidPenalty: Number(i.paid_penalty), penaltyDue: loans.penaltyDue(i, on, Number(a.late_penalty)) })),
    payments: pays.map((p) => ({ receipt: p.receipt, amount: Number(p.amount), paidOn: iso(p.paid_on), channel: p.channel, reference: p.reference || "", allocation: p.allocation,
      by: p.by, at: p.posted_at, reverses: p.reverses_receipt || "", reversedBy: p.reversed_by || "", reason: p.reason || "" })),
    release: dis ? { gross: Number(dis.gross), fee: Number(dis.fee), net: Number(dis.net), channel: dis.channel, reference: dis.reference, payee: dis.payee, by: dis.by, at: dis.released_at } : null,
    emailOnFile: require("../lib/mail").deliverable(a.email), mailOn: require("../lib/mail").configured(), canPost: POSTERS.includes(req.user.role), canReverse: ["loan_account_officer", "operations_manager"].includes(req.user.role), channels: PAY_CHANNELS });
}));

function checkPayment(a, body) {
  /* read the amount as typed (commas and the peso sign are fine): checking the text, not the number, because
     computer arithmetic cannot hold most centavo amounts exactly (1234.10 * 100 is 123409.99999...) */
  const typed = String(body.amount == null ? "" : body.amount).replace(/[^0-9.]/g, ""), paidOn = String(body.paidOn || "");
  if (typed && !/^\d*(\.\d*)?$/.test(typed)) return { error: ["Enter the amount received, in pesos.", "amt"] };
  if (/\.\d{3,}$/.test(typed)) return { error: ["Centavos go to two places at most.", "amt"] };
  const amount = Math.round(Number(typed) * 100) / 100;
  if (!typed || !Number.isFinite(amount) || amount <= 0) return { error: ["Enter the amount received, in pesos.", "amt"] };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) return { error: ["Enter the date the money was received.", "date"] };
  if (paidOn > today()) return { error: ["That date is in the future.", "date"] };
  if (paidOn < iso(a.released_on)) return { error: ["That is before the loan was released.", "date"] };
  const { allocation, left } = loans.allocate(amount, a.insts, paidOn, Number(a.late_penalty));
  if (left > 0.004) return { error: [`That is ${intake.peso(left)} more than everything still owed on this account.`, "amt"] };
  return { amount, paidOn, allocation };
}

router.get("/loan-accounts/:no/allocation", allow(...VIEW), wrap(async (req, res) => {
  const a = await account(req.params.no); if (!a) return err(res, 404, "No loan account has that number.");
  const c = checkPayment(a, req.query); if (c.error) return err(res, 400, c.error[0], c.error[1]);
  res.json({ allocation: c.allocation });
}));

router.post("/loan-accounts/:no/payments", allow(...POSTERS), wrap(async (req, res) => {
  const a = await account(req.params.no); if (!a) return err(res, 404, "No loan account has that number.");
  if (loans.standing(a.insts, today(), Number(a.late_penalty)).closed) return err(res, 409, "This account is fully paid and closed.");
  const c = checkPayment(a, req.body); if (c.error) return err(res, 400, c.error[0], c.error[1]);
  const channel = String(req.body.channel || ""); if (!PAY_CHANNELS.includes(channel)) return err(res, 400, "Choose how the money came in.", "chan");
  const reference = String(req.body.reference || "").trim().slice(0, 60);
  if (channel !== "Cash at the branch" && !reference) return err(res, 400, "Enter the deposit, GCash or cheque reference.", "ref");
  if (reference) { const dup = (await db.query("select receipt from payments where account_id = $1 and reference = $2 and reverses is null and not exists (select 1 from payments x where x.reverses = payments.id)", [a.id, reference])).rows[0];
    if (dup) return err(res, 409, `That reference was already posted as ${dup.receipt}. A payment is posted once.`, "ref"); }
  const out = await db.transaction(async (tx) => {
    await tx.query("select id from loan_accounts where id = $1 for update", [a.id]);
    const insts = (await tx.query("select * from installments where account_id = $1 order by n", [a.id])).rows.map((i) => ({ ...i, due_on: iso(i.due_on) }));
    const { allocation, left } = loans.allocate(c.amount, insts, c.paidOn, Number(a.late_penalty));
    if (left > 0.004) throw Object.assign(new Error("That is more than everything still owed."), { status: 400 });
    for (const x of allocation) await tx.query("update installments set paid_penalty = paid_penalty + $3, paid_interest = paid_interest + $4, paid_principal = paid_principal + $5 where account_id = $1 and n = $2", [a.id, x.n, x.penalty, x.interest, x.principal]);
    const year = c.paidOn.slice(0, 4), k = await tx.query(`insert into counters (name, value) values ($1, 1) on conflict (name) do update set value = counters.value + 1 returning value`, ["receipt-" + year]);
    const receipt = `OR-${year}-${String(k.rows[0].value).padStart(6, "0")}`;
    await tx.query("insert into payments (account_id, receipt, amount, paid_on, channel, reference, allocation, posted_by) values ($1, $2, $3, $4, $5, $6, $7, $8)", [a.id, receipt, c.amount, c.paidOn, channel, reference || null, JSON.stringify(allocation), req.user.id]);
    const after = (await tx.query("select * from installments where account_id = $1 order by n", [a.id])).rows.map((i) => ({ ...i, due_on: iso(i.due_on) }));
    const st = loans.standing(after, today(), Number(a.late_penalty));
    if (st.closed) await tx.query("update loan_accounts set closed_on = $2 where id = $1", [a.id, today()]);
    await audit.write({ user: req.user, kind: "pay", action: `Posted payment ${receipt} of ${intake.peso(c.amount)}`, record: a.number, after: { receipt, amount: c.amount, paidOn: c.paidOn, channel, reference, allocation }, ip: req.ip }, tx);
    return { receipt, allocation, closed: st.closed };
  });
  res.status(201).json(out);
}));

router.post("/loan-accounts/:no/payments/:receipt/reverse", allow("loan_account_officer", "operations_manager"), wrap(async (req, res) => {
  const a = await account(req.params.no); if (!a) return err(res, 404, "No loan account has that number.");
  const p = (await db.query("select * from payments where account_id = $1 and receipt = $2", [a.id, req.params.receipt])).rows[0];
  if (!p || p.reverses) return err(res, 404, "No payment with that receipt on this account.");
  if ((await db.query("select 1 from payments where reverses = $1", [p.id])).rows[0]) return err(res, 409, "That payment was already reversed.");
  if (p.posted_by === req.user.id) return err(res, 403, "You posted this payment, so a different person must reverse it.");
  const reason = String(req.body.reason || "").trim(); if (reason.length < 10) return err(res, 400, "Give the reason for the reversal (at least 10 characters).", "why");
  const out = await db.transaction(async (tx) => {
    await tx.query("select id from loan_accounts where id = $1 for update", [a.id]);
    if ((await tx.query("select 1 from payments where reverses = $1", [p.id])).rows[0]) throw Object.assign(new Error("That payment was already reversed."), { status: 409 });   /* checked again under the lock: two clicks cannot reverse it twice */
    const later = (await tx.query("select receipt from payments where account_id = $1 and id > $2 and reverses is null and not exists (select 1 from payments x where x.reverses = payments.id)", [a.id, p.id])).rows;
    if (later.length) throw Object.assign(new Error(`Reverse the later payment${later.length > 1 ? "s" : ""} first (${later.map((l) => l.receipt).join(", ")}), newest first.`), { status: 409 });
    for (const x of p.allocation) await tx.query("update installments set paid_penalty = paid_penalty - $3, paid_interest = paid_interest - $4, paid_principal = paid_principal - $5 where account_id = $1 and n = $2", [a.id, x.n, x.penalty, x.interest, x.principal]);
    const year = today().slice(0, 4), k = await tx.query(`insert into counters (name, value) values ($1, 1) on conflict (name) do update set value = counters.value + 1 returning value`, ["receipt-" + year]);
    const receipt = `RV-${year}-${String(k.rows[0].value).padStart(6, "0")}`;
    const neg = p.allocation.map((x) => ({ n: x.n, penalty: -x.penalty, interest: -x.interest, principal: -x.principal }));
    await tx.query("insert into payments (account_id, receipt, amount, paid_on, channel, reference, allocation, reverses, reason, posted_by) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
      [a.id, receipt, -Number(p.amount), today(), p.channel, p.reference, JSON.stringify(neg), p.id, reason, req.user.id]);
    await tx.query("update loan_accounts set closed_on = null where id = $1", [a.id]);
    await audit.write({ user: req.user, kind: "pay", action: `Reversed payment ${p.receipt} with ${receipt}`, record: a.number, before: { receipt: p.receipt, amount: Number(p.amount) }, after: { reversal: receipt, reason }, ip: req.ip }, tx);
    return { receipt };
  });
  res.json(out);
}));

module.exports = router;
module.exports.account = account;
module.exports.today = today;
