// Papers CALMS issues. Each one gets a number, is kept exactly as issued (issued_papers), and is logged.
//   POST /api/loan-accounts/:no/statement        a statement of account as of today
//   POST /api/loan-accounts/:no/schedule         the payment schedule, to print and hand over
//   GET  /api/loan-accounts/:no/clearance        the clearance already issued, if any
//   POST /api/loan-accounts/:no/clearance        issue the clearance (fully paid accounts only; once)
//   POST /api/applications/:ref/memo             the credit memo, to save as PDF
//   GET  /api/regulatory                         the three reports for the regulator: schedule, last runs
//   POST /api/regulatory/:kind/run               make one now
//   GET  /api/papers/:number                     any issued paper again (reprints are logged)
//   GET/PUT /api/settings/company                the letterhead (System Administrator)
// The browser lays a paper out and opens the print window ("Save as PDF").
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const auth = require("../lib/auth");
const loans = require("../lib/loans");
const settings = require("../lib/settings");
const accounts = require("./accounts");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const VIEW = ["disbursement_officer", "loan_account_officer", "operations_manager", "compliance_auditor", "system_administrator", "lead_underwriter", "loan_processor", "sales_agent"];
const REG_ROLES = ["operations_manager", "compliance_auditor", "system_administrator"];
const peso = (n) => "₱ " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MANILA = 8 * 3600e3;
const ymd = (d) => new Date(new Date(d).getTime() + MANILA).toISOString().slice(0, 10);
const long = (s) => new Date(String(s).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-PH", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const company = async () => ({ ...settings.DEFAULTS_COMPANY, ...((await settings.load(true)).company || {}) });

async function issue(kind, prefix, record, title, data, user, client = db) {
  const year = ymd(Date.now()).slice(0, 4);
  const k = await client.query(`insert into counters (name, value) values ($1, 1) on conflict (name) do update set value = counters.value + 1 returning value`, [prefix.toLowerCase() + "-" + year]);
  const number = `${prefix}-${year}-${String(k.rows[0].value).padStart(4, "0")}`;
  const full = { ...data, number, title, issuedAt: new Date().toISOString(), issuedBy: user ? { name: user.full_name, role: auth.ROLE_NAMES[user.role] } : { name: "CALMS", role: "made on schedule" }, company: await company() };
  await client.query("insert into issued_papers (kind, number, record, title, data, issued_by) values ($1, $2, $3, $4, $5, $6)", [kind, number, record, title, JSON.stringify(full), user ? user.id : null]);
  await audit.write({ user, actor: user ? undefined : "CALMS", kind: "doc", action: `Issued ${title.toLowerCase()} ${number}`, record, after: { number }, ip: undefined }, client);
  return full;
}

// The same paper as plain text, for email.
function paperText(d) {
  const L = [d.title.toUpperCase() + " No. " + d.number, ""];
  for (const x of d.sections || []) {
    if (x.h) L.push(x.h.toUpperCase());
    if (x.p) L.push(x.p);
    if (x.pre) L.push(x.pre);
    if (x.rows) for (const r of x.rows) L.push("  " + r[0] + ": " + r[1]);
    if (x.table) { L.push("  " + x.table.head.join(" | ")); for (const r of x.table.rows) L.push("  " + r.join(" | ")); }
    L.push("");
  }
  const c = d.company || {};
  L.push("Issued by " + d.issuedBy.name + ", " + d.issuedBy.role + ".", "", c.name + (c.address ? ", " + c.address : "") + (c.phone ? ". " + c.phone : ""), "This copy is kept on record under No. " + d.number + ".");
  return L.join("\n");
}
// When asked, the paper also goes to the borrower by email (through the outbox, like every other email).
function emailCheck(a) {
  const mail = require("../lib/mail");
  if (!mail.configured()) throw Object.assign(new Error("Email is not connected. Print it instead."), { status: 409 });
  if (!mail.deliverable(a.email)) throw Object.assign(new Error("There is no email address for this borrower. Print it instead."), { status: 409 });
}
async function emailTo(a, d, user) {
  const outbox = require("../lib/outbox");
  await outbox.queue({ to: a.email, toBorrower: a.borrower_id, subject: `${d.title} ${d.number}, ${a.number}`, body: `Hello ${a.full_name.split(" ")[0]},\n\nHere is your ${d.title.toLowerCase()}.\n\n` + paperText(d), record: a.number, dedupe: "paper:" + d.number });
  await outbox.sendWaiting(5);
  await audit.write({ user, kind: "doc", action: `Emailed ${d.title.toLowerCase()} ${d.number} to the borrower`, record: a.number, after: { to: a.email.replace(/^(.).*(@.*)$/, "$1•••$2") } });
  return a.email.replace(/^(.).*(@.*)$/, "$1•••$2");
}

// A sales agent sees only the papers of borrowers they brought in (the same rule as the application lists).
// rec: a loan account number or an application reference.
async function notTheirs(user, rec) {
  if (user.role !== "sales_agent") return false;
  const r = await db.query(`select 1 from applications a left join loan_accounts l on l.application_id = a.id
      where (a.reference = $1 or l.number = $1) and a.agent_id = $2 limit 1`, [String(rec || ""), user.id]);
  return !r.rows.length;
}
const NOT_YOURS = "That borrower is not one of yours.";

// ===================================================================== loan account papers
async function loadAccount(no) { const a = await accounts.account(no); if (a) a.st = loans.standing(a.insts, accounts.today(), Number(a.late_penalty)); return a; }
const pay = (i) => loans.round(Number(i.principal) + Number(i.interest));
const head = (a) => [["Account", a.number], ["Application", a.reference], ["Borrower", a.full_name], ["Address", a.address || "—"], ["Loan", `${a.product} of ${peso(a.principal)}, released ${long(a.released_on)}`],
  ["Terms", `${a.term_months} monthly payments; interest ${Math.round(Number(a.monthly_rate) * 10000) / 100}% a month, ${a.interest_method === "flat" ? "flat (add-on)" : "diminishing balance"}; late penalty ${Math.round(Number(a.late_penalty) * 10000) / 100}% a month on the overdue amount`]];

router.post("/loan-accounts/:no/statement", auth.allow(...VIEW), wrap(async (req, res) => {
  const a = await loadAccount(req.params.no); if (!a) return res.status(404).json({ error: "No loan account has that number." });
  if (await notTheirs(req.user, a.number)) return res.status(403).json({ error: NOT_YOURS });
  const on = accounts.today(), st = a.st;
  const pays = (await db.query("select receipt, amount, paid_on, channel, reverses from payments where account_id = $1 order by posted_at", [a.id])).rows;
  const late = a.insts.filter((i) => i.due_on < on && pay(i) - Number(i.paid_principal) - Number(i.paid_interest) > 0.004);
  const paidIn = pays.reduce((s, p) => s + Number(p.amount), 0);
  const data = { record: a.number, asOf: on, sections: [
    { h: "The loan", rows: head(a) },
    { h: "Where it stands on " + long(on), rows: [["Paid in so far", peso(paidIn)], ["Principal left", peso(st.principalLeft)],
      ["Overdue installments", late.length ? late.length + " (" + peso(st.overdue) + ")" : "None"], ["Late penalties due", peso(st.penalty)],
      ["Amount to pay now to be up to date", peso(st.overdue + st.penalty)], ["Next installment", st.next ? `No. ${st.next.n}, ${peso(st.next.amount)}, due ${long(st.next.dueOn)}` : "None; the loan is paid"]] },
    { h: "Payments received", table: { head: ["Receipt", "Date", "Channel", "Amount"], rows: pays.length ? pays.map((p) => [p.receipt, long(p.paid_on), p.reverses ? "Reversal" : p.channel, peso(p.amount)]) : [["", "No payments yet", "", ""]] } },
    { p: "Please pay on or before each due date to avoid the late penalty. For questions about this statement, call " + (await company()).phone + " or ask " + (a.agent || "your sales agent") + "." }] };
  if (req.body && req.body.email) emailCheck(a);
  const d = await issue("statement", "SOA", a.number, "Statement of account", data, req.user);
  if (req.body && req.body.email) d.emailedTo = await emailTo(a, d, req.user);
  res.json(d);
}));

router.post("/loan-accounts/:no/schedule", auth.allow(...VIEW), wrap(async (req, res) => {
  const a = await loadAccount(req.params.no); if (!a) return res.status(404).json({ error: "No loan account has that number." });
  if (await notTheirs(req.user, a.number)) return res.status(403).json({ error: NOT_YOURS });
  let bal = Number(a.principal);
  const rows = a.insts.map((i) => { bal = loans.round(bal - Number(i.principal)); return [String(i.n), long(i.due_on), peso(i.principal), peso(i.interest), peso(pay(i)), peso(Math.max(0, bal))]; });
  const tI = a.insts.reduce((s, i) => s + Number(i.interest), 0);
  rows.push(["", "Total", peso(a.principal), peso(tI), peso(Number(a.principal) + tI), ""]);
  const data = { record: a.number, sections: [{ h: "The loan", rows: head(a) }, { h: "Payment schedule", table: { head: ["No.", "Due", "Principal", "Interest", "Payment", "Principal left after"], rows } },
    { p: "A payment made after its due date carries the late penalty above. Please pay on or before each due date." }] };
  if (req.body && req.body.email) emailCheck(a);
  const d = await issue("schedule", "SCH", a.number, "Payment schedule", data, req.user);
  if (req.body && req.body.email) d.emailedTo = await emailTo(a, d, req.user);
  res.json(d);
}));

router.get("/loan-accounts/:no/clearance", auth.allow(...VIEW), wrap(async (req, res) => {
  if (await notTheirs(req.user, req.params.no)) return res.status(403).json({ error: NOT_YOURS });
  const p = (await db.query("select data from issued_papers where kind = 'clearance' and record = $1 order by id limit 1", [req.params.no])).rows[0];
  res.json({ clearance: p ? p.data : null });
}));
router.post("/loan-accounts/:no/clearance", auth.allow("loan_account_officer"), wrap(async (req, res) => {
  const a = await loadAccount(req.params.no); if (!a) return res.status(404).json({ error: "No loan account has that number." });
  if (await notTheirs(req.user, a.number)) return res.status(403).json({ error: NOT_YOURS });
  if (!a.st.closed) return res.status(409).json({ error: "A clearance is issued only when the loan is fully paid. " + peso(a.st.principalLeft) + " in principal is still owed." });
  const done = (await db.query("select data from issued_papers where kind = 'clearance' and record = $1 order by id limit 1", [a.number])).rows[0];
  if (done) return res.status(409).json({ error: "The clearance was already issued as " + done.data.number + ". Print that one again instead.", number: done.data.number });
  const co = await company();
  const t = a.insts.reduce((s, i) => ({ p: s.p + Number(i.paid_principal), i: s.i + Number(i.paid_interest), n: s.n + Number(i.paid_penalty) }), { p: 0, i: 0, n: 0 });
  const data = { record: a.number, sections: [
    { p: `This certifies that ${a.full_name} has fully paid loan account ${a.number}, a ${a.product.toLowerCase()} of ${peso(a.principal)} released on ${long(a.released_on)}, and owes ${co.name} nothing more on this loan.` },
    { h: "Paid on this loan", rows: [["Principal", peso(t.p)], ["Interest", peso(t.i)], ["Late penalties", peso(t.n)], ["Total", peso(t.p + t.i + t.n)], ["Fully paid on", a.closed_on ? long(a.closed_on) : long(accounts.today())]] },
    { p: "Issued on request of the borrower for whatever legal purpose it may serve." }], signs: true };
  res.json(await issue("clearance", "CL", a.number, "Clearance", data, req.user));
}));

// ===================================================================== credit memo
router.post("/applications/:ref/memo", auth.allow("underwriter", "lead_underwriter", "loan_processor", "operations_manager", "compliance_auditor", "system_administrator"), wrap(async (req, res) => {
  const x = (await db.query(`select s.*, a.reference, a.amount ask, a.term_months ask_term, b.full_name, p.name product from assessments s join applications a on a.id = s.application_id
      join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id where a.reference = $1 order by s.id desc limit 1`, [req.params.ref])).rows[0];
  if (!x) return res.status(409).json({ error: "There is no credit memo yet. It is written when the FinScore report arrives." });
  const data = { record: x.reference, sections: [
    { h: "Application", rows: [["Reference", x.reference], ["Borrower", x.full_name], ["Product", x.product], ["Asked for", `${peso(x.ask)} over ${x.ask_term} months`], ["Assessed at", `${peso(x.amount)} over ${x.term_months} months`], ["Rule set", "Version " + x.rule_version], ["Assessed on", long(ymd(x.created_at))]] },
    { h: "Result", rows: [["Debt to income", x.dti == null ? "—" : Number(x.dti).toFixed(2) + "%"], ["Loan to value", x.ltv == null ? "No collateral" : Number(x.ltv).toFixed(2) + "%"], ["FinScore", x.score == null ? "No report" : String(x.score)], ["Risk tier", x.tier], ["Recommendation", x.outcome], ["Why", x.why]] },
    { h: "Credit memo", pre: x.memo },
    { p: "Confidential. Credit information about the borrower, kept under the Data Privacy Act. Do not hand this to anyone outside the credit process." }] };
  res.json(await issue("memo", "MEMO", x.reference, "Credit memo", data, req.user));
}));

// ===================================================================== reports for the regulator
const REG = {
  activity: { title: "Monthly lending activity report", to: "For the Securities and Exchange Commission", when: "Monthly, on the 5th, for the month before" },
  aging: { title: "Loan portfolio and aging summary", to: "For the Securities and Exchange Commission", when: "Monthly, on the 5th, as of the end of the month before" },
  audit: { title: "Audit trail extract", to: "For internal and external audit", when: "Every Monday, for the week before" },
};
function periodFor(kind, now = new Date()) {
  const m = new Date(now.getTime() + MANILA), Y = m.getUTCFullYear(), M = m.getUTCMonth(), D = m.getUTCDate();
  const at = (y, mo, d) => new Date(Date.UTC(y, mo, d) - MANILA);
  if (kind === "audit") { const dow = (m.getUTCDay() + 6) % 7, mon = at(Y, M, D - dow), from = new Date(mon.getTime() - 7 * 86400e3);
    return { key: ymd(from), from, to: mon, label: long(ymd(from)) + " to " + long(ymd(new Date(mon.getTime() - 86400e3))), due: mon }; }
  const from = at(Y, M - 1, 1), to = at(Y, M, 1);
  return { key: ymd(from).slice(0, 7), from, to, label: new Date(Date.UTC(Y, M - 1, 1)).toLocaleDateString("en-PH", { timeZone: "UTC", month: "long", year: "numeric" }), due: at(Y, M, 5) };
}
async function regData(kind, P) {
  const q = (s, a) => db.query(s, a).then((r) => r.rows);
  if (kind === "activity") {
    const [apps, dec, rel, col] = await Promise.all([
      q("select p.name, count(*) n, sum(a.amount) amt from applications a join loan_products p on p.id = a.product_id where a.created_at >= $1 and a.created_at < $2 group by p.name order by p.name", [P.from, P.to]),
      q("select kind, count(*) n from decisions where decided_at >= $1 and decided_at < $2 group by kind", [P.from, P.to]),
      q(`select p.name, count(*) n, sum(d.gross) gross, sum(d.fee) fee, sum(d.net) net from disbursements d join applications a on a.id = d.application_id join loan_products p on p.id = a.product_id
          where d.released_at >= $1 and d.released_at < $2 group by p.name order by p.name`, [P.from, P.to]),
      q(`select coalesce(sum(p.amount), 0) total, coalesce(sum((select sum((e->>'principal')::numeric) from jsonb_array_elements(p.allocation) e) * sign(p.amount)), 0) principal,
          coalesce(sum((select sum((e->>'interest')::numeric) from jsonb_array_elements(p.allocation) e) * sign(p.amount)), 0) interest,
          coalesce(sum((select sum((e->>'penalty')::numeric) from jsonb_array_elements(p.allocation) e) * sign(p.amount)), 0) penalty, count(*) filter (where p.reverses is null) n
        from payments p where p.paid_on >= $1 and p.paid_on < $2`, [ymd(P.from), ymd(P.to)]) ]);
    const dn = (k) => dec.filter((d) => k.includes(d.kind)).reduce((s, d) => s + Number(d.n), 0), c = col[0];
    const tot = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);
    return { sections: [
      { h: "Applications received", table: { head: ["Product", "Number", "Amount asked"], rows: apps.map((r) => [r.name, String(r.n), peso(r.amt)]).concat([["Total", String(tot(apps, "n")), peso(tot(apps, "amt"))]]) } },
      { h: "Credit decisions", rows: [["Approved as asked", String(dn(["asis"]))], ["Approved at other terms (counter-offer)", String(dn(["other"]))], ["Declined", String(dn(["no"]))], ["Endorsed to a higher authority", String(dn(["up"]))]] },
      { h: "Loans released", table: { head: ["Product", "Number", "Principal", "Charges deducted", "Net paid out"], rows: rel.map((r) => [r.name, String(r.n), peso(r.gross), peso(r.fee), peso(r.net)]).concat([["Total", String(tot(rel, "n")), peso(tot(rel, "gross")), peso(tot(rel, "fee")), peso(tot(rel, "net"))]]) } },
      { h: "Collections", rows: [["Payments received", String(c.n)], ["Total collected (after reversals)", peso(c.total)], ["Applied to principal", peso(c.principal)], ["Applied to interest", peso(c.interest)], ["Applied to late penalties", peso(c.penalty)]] }] };
  }
  if (kind === "aging") {
    const L = (await q(`select l.id, l.number, l.late_penalty, p.name product from loan_accounts l join applications a on a.id = l.application_id join loan_products p on p.id = a.product_id where l.released_on < $1`, [ymd(P.to)]));
    const on = ymd(new Date(P.to.getTime() - 1)), B = ["current", "1-30", "31-60", "61-90", "90+"], NAME = ["Current", "1 to 30 days late", "31 to 60 days late", "61 to 90 days late", "Over 90 days late"];
    const by = {}, prods = new Set(); let total = 0, n = 0;
    for (const l of L) {
      // As of the end of the month: payments made after it are left out.
      const insts = (await q("select * from installments where account_id = $1 order by n", [l.id]));
      const later = await q("select allocation, amount from payments where account_id = $1 and paid_on > $2", [l.id, on]);
      for (const p of later) for (const e of p.allocation) { const i = insts.find((x) => x.n === e.n); if (!i) continue; const s = Math.sign(Number(p.amount)); i.paid_principal -= s * e.principal; i.paid_interest -= s * e.interest; i.paid_penalty -= s * e.penalty; }
      const st = loans.standing(insts, on, Number(l.late_penalty)); if (st.closed) continue;
      prods.add(l.product); const key = l.product + "|" + st.bucket; by[key] = by[key] || { n: 0, amt: 0 }; by[key].n++; by[key].amt += st.principalLeft; total += st.principalLeft; n++;
    }
    const P2 = [...prods].sort(), cell = (p, b) => by[p + "|" + b] || { n: 0, amt: 0 };
    return { sections: [
      { h: "Principal outstanding by days past due, as of " + long(on), table: { head: ["Days past due", "Accounts", "Principal outstanding", "Share"], rows: B.map((b, i) => { const c = P2.reduce((s, p) => ({ n: s.n + cell(p, b).n, amt: s.amt + cell(p, b).amt }), { n: 0, amt: 0 }); return [NAME[i], String(c.n), peso(c.amt), total ? (c.amt / total * 100).toFixed(1) + "%" : "0.0%"]; }).concat([["Total", String(n), peso(total), "100.0%"]]) } },
      { h: "By product", table: { head: ["Product", "Accounts", "Principal outstanding", "Over 30 days late"], rows: P2.map((p) => { const t = B.reduce((s, b) => ({ n: s.n + cell(p, b).n, amt: s.amt + cell(p, b).amt }), { n: 0, amt: 0 }), l30 = B.slice(2).reduce((s, b) => s + cell(p, b).amt, 0); return [p, String(t.n), peso(t.amt), peso(l30)]; }) } }] };
  }
  const E = await q("select id, at, actor, kind, action, record, ip from audit_log where at >= $1 and at < $2 order by id", [P.from, P.to]);
  const broken = await audit.verify();
  return { sections: [
    { h: "Seal check", rows: [["Entries in the period", String(E.length)], ["Every seal in the log", broken === null ? "Unbroken" : "Broken at entry " + broken]] },
    { h: "Entries", table: { head: ["No.", "When (PST)", "Who", "Kind", "What", "Record", "From"], rows: E.map((e) => [String(e.id), new Date(e.at).toLocaleString("en-PH", { timeZone: "Asia/Manila", hour12: false }), e.actor, e.kind, e.action, e.record || "", e.ip || "server"]) } }] };
}
async function makeReg(kind, user, P) {
  const d = await regData(kind, P);
  return issue("regulatory", "REG", REG[kind].title, REG[kind].title, { ...d, kind, period: { key: P.key, label: P.label }, to: REG[kind].to, signs: kind !== "audit" }, user);
}
// Runs whatever is due and not yet made (called every half hour by server.js).
async function runDue() {
  let made = 0;
  for (const kind of Object.keys(REG)) {
    const P = periodFor(kind); if (Date.now() < P.due.getTime() + 8 * 3600e3) continue;           // after 08:00 on the due day
    const have = (await db.query("select 1 from issued_papers where kind = 'regulatory' and record = $1 and data->'period'->>'key' = $2 limit 1", [REG[kind].title, P.key])).rows.length;
    if (!have) { await makeReg(kind, null, P); made++; }
  }
  return made;
}
router.get("/regulatory", auth.allow(...REG_ROLES), wrap(async (req, res) => {
  const runs = (await db.query(`select p.number, p.record, p.issued_at, p.data->'period'->>'label' period, coalesce(u.full_name, 'CALMS, on schedule') who from issued_papers p left join users u on u.id = p.issued_by
      where p.kind = 'regulatory' order by p.id desc limit 60`)).rows;
  res.json({ reports: Object.keys(REG).map((k) => { const P = periodFor(k), last = runs.find((r) => r.record === REG[k].title);
    return { kind: k, title: REG[k].title, to: REG[k].to, when: REG[k].when, period: P.label, last: last ? { number: last.number, at: last.issued_at, period: last.period, who: last.who } : null }; }) });
}));
router.post("/regulatory/:kind/run", auth.allow(...REG_ROLES), wrap(async (req, res) => {
  const kind = req.params.kind; if (!REG[kind]) return res.status(404).json({ error: "No such report." });
  res.json(await makeReg(kind, req.user, periodFor(kind)));
}));

// ===================================================================== reprints, letterhead
router.get("/papers/:number", wrap(async (req, res) => {
  const p = (await db.query("select * from issued_papers where number = $1", [req.params.number])).rows[0]; if (!p) return res.status(404).json({ error: "No paper has that number." });
  const allowed = p.kind === "regulatory" ? REG_ROLES : p.kind === "memo" ? ["underwriter", "lead_underwriter", "loan_processor", "operations_manager", "compliance_auditor", "system_administrator"] : VIEW;
  if (!allowed.includes(req.user.role)) return res.status(403).json({ error: "Your role cannot open this." });
  if (await notTheirs(req.user, p.record)) return res.status(403).json({ error: NOT_YOURS });
  await audit.write({ user: req.user, kind: "doc", action: "Reprinted " + p.title.toLowerCase() + " " + p.number, record: p.kind === "regulatory" ? "Report" : p.record, ip: req.ip });
  res.json(p.data);
}));
router.get("/settings/company", wrap(async (req, res) => res.json({ company: await company(), canEdit: req.user.role === "system_administrator" })));
router.put("/settings/company", auth.allow("system_administrator"), wrap(async (req, res) => {
  const t = (v, n) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, n), b = req.body || {}, old = await company();
  const c = { name: t(b.name, 100), address: t(b.address, 200), secNo: t(b.secNo, 40), caNo: t(b.caNo, 40), phone: t(b.phone, 40), email: t(b.email, 100) };
  if (c.name.length < 3) return res.status(400).json({ error: "Enter the company's registered name.", field: "name" });
  await db.transaction(async (tx) => {
    await settings.save("company", c, req.user, tx);
    await audit.write({ user: req.user, kind: "config", action: "Changed the company details on printed papers", record: "Settings", before: old, after: c, ip: req.ip }, tx);
  });
  res.json({ company: await company() });
}));

// ===================================================================== PDF files
// The page sends what it already shows (an issued paper, or a table it exported, both already logged);
// the server lays it out as a PDF and sends the file back.
router.post("/pdf", wrap(async (req, res) => {
  const pdf = require("../lib/pdf"), b = req.body || {}, cell = (v) => String(v == null ? "" : v).slice(0, 4000);
  const name = (t) => String(t || "calms").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "calms";
  let buf, file;
  if (b.paper && typeof b.paper === "object") {
    const d = b.paper; if (!Array.isArray(d.sections) || d.sections.length > 200) return res.status(400).json({ error: "That paper could not be read." });
    buf = await pdf.paper(d); file = name(d.number || d.title) + ".pdf";
  } else if (b.table && Array.isArray(b.table.rows)) {
    const rows = b.table.rows.slice(0, 20001).map((r) => (Array.isArray(r) ? r.slice(0, 30).map(cell) : []));
    buf = await pdf.table({ title: cell(b.table.title), sub: cell(b.table.sub), rows }); file = name(b.table.title) + ".pdf";
  } else return res.status(400).json({ error: "Nothing to make a PDF of." });
  res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${file}"`, "Cache-Control": "no-store" });
  res.send(buf);
}));

module.exports = router;
module.exports.runDue = runDue;
