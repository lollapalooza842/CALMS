// Credit assessment and Decision.
//   GET  /api/applications/:ref/assessment     everything the Credit assessment screen needs
//   POST /api/applications/:ref/bureau         { simulate: "ok" | "down" } ask FinScore (simulated), then run the rules
//   GET  /api/applications/:ref/decision       everything the Decision screen needs
//   POST /api/applications/:ref/decision       { kind, amount, termMonths, reason, remarks, code } sign the decision
const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const audit = require("../lib/audit");
const intake = require("../lib/intake");
const rules = require("../lib/rules");
const finscore = require("../lib/finscore");
const totp = require("../lib/totp");
const { allow, ROLE_NAMES } = require("../lib/auth");

const router = express.Router({ mergeParams: true });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const READERS = ["underwriter", "lead_underwriter", "loan_processor", "operations_manager", "compliance_auditor", "system_administrator"];
const DECIDERS = ["underwriter", "lead_underwriter"];
// The ladder: an underwriter endorses what is over their limit to the Lead Underwriter, and the Lead endorses what is
// over theirs to the Operations Manager, who decides it (FR-064, BR-007). The Operations Manager decides only those.
const SIGNERS = DECIDERS.concat("operations_manager");
// Whose turn it is on an application Under Review, from its latest decision. Returns why this person may not decide, or null.
function turnCheck(u, done) {
  const up = done && done.kind === "up", byLead = up && done.by_role === "lead_underwriter";
  if (u.role === "operations_manager") return byLead ? null : "The Operations Manager decides only applications the Lead Underwriter endorsed upward.";
  if (byLead) return "The Lead Underwriter endorsed this upward. The Operations Manager decides it now.";
  if (up && u.role === "underwriter") return "This was endorsed upward. The Lead Underwriter decides it now.";
  return null;
}
const limitOf = (u, a) => (u.role === "operations_manager" ? Number(a.max_amount) : Number(u.approval_limit || 0));   /* the top of the ladder: up to the product's own maximum */
const UPSTAIRS = { underwriter: "the Lead Underwriter", lead_underwriter: "the Operations Manager" };
const KIND_LABEL = { asis: "Approved", other: "Approved, changed terms", no: "Declined", up: "Endorsed upward" };

async function load(ref) {
  const { rows } = await db.query(`select a.*, b.full_name, b.id_number, b.mobile, b.email, p.name as product, p.monthly_rate, p.interest_method, p.processing_fee,
        p.min_amount, p.max_amount, p.terms_months, en.short_name as encoder, ag.short_name as agent
      from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id
      join users en on en.id = a.encoded_by left join users ag on ag.id = a.agent_id where a.reference = $1`, [ref]);
  return rows[0] || null;
}
// While a folder sits on an underwriter's desk only they (or the Lead Underwriter) may work on it.
async function deskCheck(a, u) {
  if (!a.assigned_to || a.assigned_to === u.id || u.role === "lead_underwriter" || u.role === "operations_manager") return null;
  const r = (await db.query("select full_name from users where id = $1", [a.assigned_to])).rows[0];
  return `This application is on ${r ? r.full_name : "another underwriter"}'s desk. Ask the Lead Underwriter to reassign it if you should take it.`;
}
async function policy() { const r = (await db.query("select version, policy from rule_sets where is_active order by version desc limit 1")).rows[0]; return { version: r.version, P: r.policy }; }
async function latestReport(appId) { return (await db.query("select * from bureau_reports where application_id = $1 order by id desc limit 1", [appId])).rows[0] || null; }

// The verified figures the rules work from.
function inputs(a, rep) {
  const d = a.details || {}, kind = intake.kindOf(a.product), sum = rep && rep.outcome === "ok" ? finscore.summary({ score: rep.score, tradelines: rep.tradelines, publicRecords: rep.public_records }) : null;
  return {
    amount: Number(a.amount), term: a.term_months, rate: Number(a.monthly_rate), method: a.interest_method,
    income: Number(d.income) || 1, debt: sum ? sum.debt : Number(d.debts) || 0, collateral: kind === "sme" && Number(d.collateral) > 0 ? Number(d.collateral) : null,
    years: Number(kind === "sme" ? d.bizyears : d.years) || 0, yearsLabel: kind === "sme" ? "Operating" : "Employed",
    report: sum,
  };
}
function memo(a, I, C, P, version, rep) {
  const d = a.details || {}, kind = intake.kindOf(a.product), sum = I.report;
  const who = kind === "sme" ? `${a.full_name}, ${d.bizname || "a registered business"}${d.biznature ? " (" + d.biznature + ")" : ""}, operating ${I.years} years.` : `${a.full_name}, ${d.position || "employee"} at ${d.employer || "an employer"}, ${I.years} years.`;
  return `GR8 LENDING COMPANY · CREDIT MEMO\n${a.reference} · Rule set version ${version}\n\nBORROWER  ${who}\n\nREQUEST   ${rules.peso(I.amount)} over ${I.term} months, ${a.product}${a.purpose ? ", for " + a.purpose.replace(/\.$/, "").toLowerCase() : ""}.` +
    `\n\nBUREAU    ${sum ? `FinScore ${sum.score}. ${rep.tradelines.length} tradelines, ${rep.tradelines.filter((t) => t[6] === "Current").length} open. ${sum.late24} payments late in 24 months, ${sum.late12} in the last 12. ${sum.publicRecords ? sum.publicRecords + " public record." : "No public records."}` : "No report."}` +
    `\n\nCAPACITY  Verified ${kind === "sme" ? "cash flow" : "income"} ${rules.peso(I.income)} a month. Existing payments ${rules.peso(I.debt)}. New installment ${rules.peso(C.m)}. Debt-to-income ${rules.pct(C.dti)} against a limit of ${P.dtiMax}%.` +
    (I.collateral ? `\n\nSECURITY  Collateral appraised at ${rules.peso(I.collateral)}. Loan-to-value ${rules.pct(C.ltv)} against a ceiling of ${P.ltvMax}%.` : `\n\nSECURITY  Unsecured.`) +
    `\n\nTIER      ${C.tier === "None" ? "Not assigned." : C.tier + "."}\n\nRECOMMENDATION  ${C.out}. ${C.why}\n\nGenerated by the system. Not a decision.`;
}

// ---- Credit assessment ----
async function assessmentView(a, user) {
  const [{ version, P }, rep, saved, log, consent] = await Promise.all([
    policy(), latestReport(a.id),
    db.query("select * from assessments where application_id = $1 order by id desc limit 1", [a.id]).then((r) => r.rows[0] || null),
    db.query(`select r.outcome, r.requested_at, r.received_at, r.report_no, r.score, r.attempts, u.short_name from bureau_reports r join users u on u.id = r.requested_by where r.application_id = $1 order by r.id`, [a.id]),
    db.query("select 1 from documents where application_id = $1 and slot = 'consent' limit 1", [a.id]).then((r) => !!r.rows[0]),
  ]);
  const okRep = rep && rep.outcome === "ok" ? rep : (await db.query("select * from bureau_reports where application_id = $1 and outcome = 'ok' order by id desc limit 1", [a.id])).rows[0] || null;
  const I = inputs(a, okRep), kind = intake.kindOf(a.product), d = a.details || {};
  const lines = [];
  log.rows.forEach((l) => {
    lines.push([l.requested_at, l.short_name, l.outcome === "blocked" ? "Inquiry BLOCKED before sending: no signed consent form on file." : "Inquiry sent. Signed consent form on file."]);
    if (l.outcome === "ok") lines.push([l.received_at, "FinScore", `200 OK. Report ${l.report_no}, score ${l.score}.`]);
    if (l.outcome === "down") lines.push([l.received_at || l.requested_at, "FinScore", `503 Service unavailable after ${l.attempts} attempts. Held in manual review.`]);
  });
  return {
    reference: a.reference, borrower: a.full_name, product: a.product, kind, status: a.status, purpose: a.purpose || "",
    business: kind === "sme" ? (d.bizname || "") : (d.employer ? d.position + " at " + d.employer : ""),
    ask: { amount: I.amount, term: I.term }, rate: I.rate, method: I.method, income: I.income, debt: I.debt, declaredDebt: Number(d.debts) || 0,
    collateral: I.collateral, years: I.years, yearsLabel: I.yearsLabel, terms: a.terms_months, min: Number(a.min_amount), max: Number(a.max_amount),
    policy: P, ruleVersion: version, limit: user.approval_limit ? Number(user.approval_limit) : null, upstairs: UPSTAIRS[user.role] || "",
    bureau: !rep ? "none" : rep.outcome, consent,
    report: okRep ? { no: okRep.report_no, score: okRep.score, tradelines: okRep.tradelines, publicRecords: okRep.public_records, at: okRep.received_at, took: okRep.took_ms / 1000 } : null,
    assessment: saved ? { tier: saved.tier, outcome: saved.outcome, why: saved.why, memo: saved.memo, at: saved.created_at, version: saved.rule_version } : null,
    log: lines.map(([at, who, text]) => ({ at, who, text })),
    canInquire: DECIDERS.includes(user.role) && a.status === "review",
  };
}

router.get("/assessment", allow(...READERS), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return res.status(404).json({ error: "No application has that number." });
  res.json(await assessmentView(a, req.user));
}));

router.post("/bureau", allow(...DECIDERS), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return res.status(404).json({ error: "No application has that number." });
  if (a.status !== "review") return res.status(409).json({ error: "A bureau inquiry is made only while the application is Under Review." });
  const busy = await deskCheck(a, req.user); if (busy) return res.status(403).json({ error: busy });
  const consent = (await db.query("select 1 from documents where application_id = $1 and slot = 'consent' limit 1", [a.id])).rows[0];
  if (!consent) {   // FR: no inquiry without the borrower's consent. The attempt itself is recorded.
    await db.transaction(async (tx) => {
      await tx.query("insert into bureau_reports (application_id, outcome, requested_by) values ($1, 'blocked', $2)", [a.id, req.user.id]);
      await audit.write({ user: req.user, kind: "bureau", action: "Bureau inquiry blocked: no consent on file", record: a.reference, ip: req.ip }, tx);
    });
    return res.status(409).json({ error: "Blocked. The system will not contact the bureau without the borrower's signed consent on file. The attempt is logged." });
  }
  const t0 = Date.now();
  if (req.body.simulate === "down") {
    await db.transaction(async (tx) => {
      await tx.query("insert into bureau_reports (application_id, outcome, attempts, requested_by, received_at) values ($1, 'down', 3, $2, now())", [a.id, req.user.id]);
      await audit.write({ user: req.user, kind: "bureau", action: "FinScore unavailable after 3 attempts. Held in manual review", record: a.reference, ip: req.ip }, tx);
    });
    return res.json(await assessmentView(a, req.user));
  }
  const rep = finscore.report({ name: a.full_name, idNumber: a.id_number }, (a.details || {}).debts);
  const { version, P } = await policy();
  await db.transaction(async (tx) => {
    const r = await tx.query(`insert into bureau_reports (application_id, outcome, report_no, score, tradelines, public_records, requested_by, received_at, took_ms)
        values ($1, 'ok', $2, $3, $4, $5, $6, now(), $7) returning *`, [a.id, rep.reportNo, rep.score, JSON.stringify(rep.tradelines), rep.publicRecords, req.user.id, Date.now() - t0]);
    const row = r.rows[0], I = inputs(a, row), C = rules.assess(I, P);
    await tx.query(`insert into assessments (application_id, report_id, rule_version, amount, term_months, dti, ltv, score, tier, outcome, why, memo)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [a.id, row.id, version, I.amount, I.term, C.dti.toFixed(2), C.ltv == null ? null : C.ltv.toFixed(2), rep.score, C.tier, C.out, C.why, memo(a, I, C, P, version, row)]);
    await audit.write({ user: req.user, kind: "bureau", action: `FinScore report received. Assessed ${C.tier} risk`, record: a.reference,
      after: { report: rep.reportNo, score: rep.score, tier: C.tier, recommendation: C.out, ruleSet: version }, ip: req.ip }, tx);
  });
  res.json(await assessmentView(a, req.user));
}));

// ---- Decision ----
router.get("/decision", allow(...READERS), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return res.status(404).json({ error: "No application has that number." });
  const [{ version, P }, rep, saved, verified, done] = await Promise.all([
    policy(), db.query("select * from bureau_reports where application_id = $1 and outcome = 'ok' order by id desc limit 1", [a.id]).then((r) => r.rows[0] || null),
    db.query("select * from assessments where application_id = $1 order by id desc limit 1", [a.id]).then((r) => r.rows[0] || null),
    db.query("select u.short_name from verifications v join users u on u.id = v.verifier where v.application_id = $1 and v.outcome = 'verified' order by v.at desc limit 1", [a.id]).then((r) => r.rows[0] || null),
    db.query(`select d.*, u.full_name, u.short_name, u.role as by_role from decisions d join users u on u.id = d.decided_by where d.application_id = $1 order by d.id desc limit 1`, [a.id]).then((r) => r.rows[0] || null),
  ]);
  const I = inputs(a, rep);
  res.json({
    reference: a.reference, borrower: a.full_name, product: a.product, status: a.status, agent: a.agent || "", hasEmail: !!a.email,
    ask: { amount: I.amount, term: I.term }, rate: I.rate, method: I.method, fee: Number(a.processing_fee), income: I.income, debt: I.debt, collateral: I.collateral,
    min: Number(a.min_amount), max: Number(a.max_amount), terms: a.terms_months, policy: P, ruleVersion: version,
    fit: rules.fit(I, P, Number(a.min_amount), Number(a.max_amount)),
    assessment: saved ? { tier: saved.tier, outcome: saved.outcome, why: saved.why, version: saved.rule_version } : null,
    reportOnFile: !!rep, verifiedBy: verified ? verified.short_name : "", encodedBy: a.encoder, encodedByMe: a.encoded_by === req.user.id,
    me: { name: req.user.full_name, roleName: ROLE_NAMES[req.user.role], limit: limitOf(req.user, a), upstairs: UPSTAIRS[req.user.role] || "",
      canDecide: SIGNERS.includes(req.user.role) && a.status === "review" && a.encoded_by !== req.user.id && !(await deskCheck(a, req.user)) && !turnCheck(req.user, done),
      desk: (await deskCheck(a, req.user)) || (a.status === "review" && SIGNERS.includes(req.user.role) ? turnCheck(req.user, done) : "") || "" },
    // an endorsement upward is not the decision: it is shown as the note that came with the folder, and the next level decides
    endorsement: done && done.kind === "up" && a.status === "review" ? { by: done.full_name, at: done.decided_at, remarks: done.remarks, to: done.endorsed_to } : null,
    decision: done && !(done.kind === "up" && a.status === "review") ? { kind: done.kind, label: KIND_LABEL[done.kind], amount: done.amount && Number(done.amount), term: done.term_months, reason: done.reason, remarks: done.remarks, override: done.is_override,
      recommended: done.recommended, version: done.rule_version, by: done.full_name, at: done.decided_at, signature: done.signature, endorsedTo: done.endorsed_to } : null,
  });
}));

router.post("/decision", allow(...SIGNERS), wrap(async (req, res) => {
  const a = await load(req.params.ref); if (!a) return res.status(404).json({ error: "No application has that number." });
  const u = req.user, kind = req.body.kind, limit = limitOf(u, a);
  if (a.status !== "review") return res.status(409).json({ error: "Only an application Under Review can be decided." });
  if (a.encoded_by === u.id) return res.status(403).json({ error: "You encoded this application, so you cannot decide it." });
  const busy = await deskCheck(a, u); if (busy) return res.status(403).json({ error: busy });
  const last = (await db.query("select d.kind, u.role as by_role from decisions d join users u on u.id = d.decided_by where d.application_id = $1 order by d.id desc limit 1", [a.id])).rows[0];
  const turn = turnCheck(u, last); if (turn) return res.status(403).json({ error: turn });
  if (kind === "up" && !UPSTAIRS[u.role]) return res.status(400).json({ error: "There is no one above the Operations Manager. Approve it, grant other terms, or decline." });
  if (!KIND_LABEL[kind]) return res.status(400).json({ error: "Pick up a stamp first." });
  const saved = (await db.query("select * from assessments where application_id = $1 order by id desc limit 1", [a.id])).rows[0];
  if (!saved) return res.status(409).json({ error: "There is no credit assessment yet. Ask FinScore for the report on the Credit assessment screen first." });

  // the terms being granted
  let amount = Number(a.amount), term = a.term_months;
  if (kind === "other") {
    amount = Number(String(req.body.amount || "").replace(/[^0-9.]/g, "")); term = Number(req.body.termMonths);
    if (!Number.isFinite(amount) || amount % 1000) return res.status(400).json({ error: "Enter the amount in whole thousands, for example 250,000.", field: "amt" });
    if (amount < Number(a.min_amount) || amount > Number(a.max_amount)) return res.status(400).json({ error: `${a.product} runs from ${rules.peso(a.min_amount)} to ${rules.peso(a.max_amount)}.`, field: "amt" });
    if (!a.terms_months.includes(term)) return res.status(400).json({ error: `${a.product} terms are ${a.terms_months.join(", ")} months.`, field: "term" });
    if (amount === Number(a.amount) && term === a.term_months) return res.status(400).json({ error: "Those are the terms asked for. Use “Approve as asked” instead.", field: "amt" });
  }
  if (kind !== "up" && kind !== "no" && amount > limit) return res.status(403).json({ error: `${rules.peso(amount)} is over your approval limit of ${rules.peso(limit)}. You can only endorse it upward.` });
  if (kind === "up" && !(Number(a.amount) > limit)) return res.status(400).json({ error: "Endorsing upward is for amounts over your own limit. This one is inside it." });

  // override of the recommendation, and the written reasons
  const { version, P } = await policy(), rep = (await db.query("select * from bureau_reports where application_id = $1 and outcome = 'ok' order by id desc limit 1", [a.id])).rows[0];
  const I = { ...inputs(a, rep), amount, term }, C = rules.assess(I, P), fitAmt = rules.fit({ ...inputs(a, rep), term }, P, Number(a.min_amount), Number(a.max_amount));
  const rec = saved.outcome, recApprove = /Approve automatically|leans approve/.test(rec);
  const override = kind === "asis" ? !recApprove : kind === "no" ? recApprove || /lower amount/.test(rec) : kind === "other" ? (amount > fitAmt || C.dti > P.dtiSoft) : false;
  const remarks = String(req.body.remarks || "").trim().slice(0, 2000), reason = String(req.body.reason || "").trim().slice(0, 300);
  if (kind === "no" && !reason) return res.status(400).json({ error: "Choose a reason for declining.", field: "why" });
  if ((override || kind === "up") && remarks.length < 20) return res.status(400).json({ error: `Write your ${kind === "up" ? "endorsement" : "justification for the override"} in the remarks (at least 20 characters).`, field: "rm" });

  // identity at the moment of signing (FR: multi-factor for approvals)
  const code = String(req.body.code || "");
  const dev = require("../lib/practice").isCode(code);
  if (!dev && !totp.check(u.mfa_secret, code)) return res.status(401).json({ error: "That authenticator code is not right. Nothing was signed.", field: "mfa" });

  const at = new Date();
  const signature = "SIG-" + crypto.createHash("sha256").update([a.id, kind, amount, term, u.id, at.toISOString(), crypto.randomBytes(8).toString("hex")].join("|")).digest("hex").slice(0, 10).toUpperCase();
  const next = kind === "asis" ? "approved" : kind === "other" ? "awaiting" : kind === "no" ? "rejected" : "review";
  await db.transaction(async (tx) => {
    const cur = (await tx.query("select status, status_since from applications where id = $1 for update", [a.id])).rows[0];
    if (cur.status !== "review") throw Object.assign(new Error("Already decided."), { status: 409 });
    await tx.query(`insert into decisions (application_id, kind, amount, term_months, reason, remarks, is_override, recommended, rule_version, endorsed_to, decided_by, signature, decided_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [a.id, kind, kind === "no" ? null : amount, kind === "no" ? null : term, reason || null, remarks || null, override, rec, version, kind === "up" ? UPSTAIRS[u.role] : null, u.id, signature, at]);
    // An endorsement upward by an underwriter moves the folder to the Lead Underwriter's desk.
    if (kind === "up" && u.role === "underwriter") {
      const lead = (await tx.query("select id from users where role = 'lead_underwriter' and is_active order by approval_limit desc nulls last limit 1")).rows[0];
      if (lead) { await tx.query("update applications set assigned_to = $2, assigned_at = $3 where id = $1", [a.id, lead.id, at]);
        await tx.query("insert into assignments (application_id, from_user, to_user, reason, moved_by, moved_at) values ($1, $2, $3, 'Endorsed upward', $4, $5)", [a.id, a.assigned_to, lead.id, u.id, at]); }
    }
    if (next !== "review") {
      await tx.query("insert into application_stages (application_id, status, handled_by, entered_at, left_at) values ($1, 'review', $2, $3, $4)", [a.id, u.id, cur.status_since, at]);
      if (next === "awaiting") await tx.query("insert into application_stages (application_id, status, handled_by, entered_at, left_at) values ($1, 'approved', $2, $3, $3)", [a.id, u.id, at]);
      if (next === "awaiting") await tx.query("insert into counter_offers (application_id, n, amount, term_months, remarks, issued_by, issued_at) values ($1, 1, $2, $3, $4, $5, $6)", [a.id, amount, term, remarks || null, u.id, at]);
      await tx.query("update applications set status = $2, status_since = $3, approved_amount = $4, approved_term = $5 where id = $1",
        [a.id, next, at, kind === "no" ? null : amount, kind === "no" ? null : term]);
    }
    await audit.write({ user: u, kind: "decision", action: KIND_LABEL[kind] + (override ? " (override of the recommendation)" : "") + ". Signed " + signature, record: a.reference,
      after: { kind, amount: kind === "no" ? null : amount, termMonths: kind === "no" ? null : term, reason: reason || null, override, recommended: rec, ruleSet: version, signature, ...(dev ? { secondFactor: "practice code (practice mode)" } : {}) }, ip: req.ip }, tx);
  });
  res.json({ status: next, signature, at, override });
}));

module.exports = router;
