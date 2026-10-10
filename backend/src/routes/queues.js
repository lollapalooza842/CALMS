// My Queue, the Review queue, the side rail, and escalation.
//   GET  /api/queue                      the signed-in person's work, oldest first, built from the records
//   GET  /api/rail                       counts for the side rail: { queue, unread }
//   GET  /api/review-queue               every application Under Review, the underwriters' desks, the moves
//   POST /api/review-queue/assign        { ref, to, reason }  the Lead Underwriter moves a folder to a desk
// escalate() runs every few minutes (see server.js): an application that has sat at one step longer than
// the escalation hours is written to the audit log once, which tells the Operations Manager and the people on it.
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const auth = require("../lib/auth");
const intake = require("../lib/intake");
const loans = require("../lib/loans");
const settings = require("../lib/settings");
const oversight = require("./oversight");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const STATUS = { draft: "Draft", submitted: "Submitted", review: "Under Review", approved: "Approved", awaiting: "Awaiting Borrower", accepted: "Accepted",
  funded: "Funded", declined: "Declined by Borrower", rejected: "Rejected" };
const ESCALATES = ["submitted", "review", "approved", "awaiting", "accepted", "declined"];
const REASONS = ["Workload", "On leave", "Expertise", "Conflict of interest"];
const peso = (n) => "₱ " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const hoursSince = (t) => Math.max(0, (Date.now() - new Date(t).getTime()) / 3600e3);
const today = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const clip = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "…" : s || "");

// ===================================================================== escalation
async function escalate() {
  const h = Number((await settings.load()).escalation_hours) || 48;
  const { rows } = await db.query(`select a.id, a.reference, a.status, a.status_since from applications a
      where a.status = any($1) and a.status_since < now() - make_interval(hours => $2)
        and not exists (select 1 from escalations e where e.application_id = a.id and e.status_since = a.status_since)`, [ESCALATES, h]);
  for (const a of rows) {
    await db.transaction(async (tx) => {
      const r = await tx.query("insert into escalations (application_id, status, status_since, hours) values ($1, $2, $3, $4) on conflict do nothing returning id", [a.id, a.status, a.status_since, h]);
      if (!r.rows.length) return;
      await audit.write({ actor: "CALMS", kind: "status", action: `Escalated: waited over ${h} hours at ${STATUS[a.status]}`, record: a.reference,
        after: { status: STATUS[a.status], waitedHours: Math.floor(hoursSince(a.status_since)), supervisor: "Operations Manager notified" } }, tx);
    });
  }
  return rows.length;
}

// ===================================================================== My Queue
const ROLE_KEY = { loan_processor: "processor", underwriter: "underwriter", lead_underwriter: "underwriter", disbursement_officer: "disbursement",
  loan_account_officer: "account", sales_agent: "agent", compliance_auditor: "auditor", system_administrator: "admin", operations_manager: "manager" };
const KINDS = {
  processor: { back: "Returned to you", docs: "Documents outstanding", draft: "Drafts to finish", verify: "Yours to verify", agree: "Agreements to finish" },
  underwriter: { above: "Escalated to you", review: "Manual review", counter: "Counter-offer declined" },
  disbursement: { release: "Ready to release", wait: "Not ready yet" },
  account: { late: "Past due", due: "Due this week", paid: "Fully paid" },
  agent: { offer: "Counter-offers to deliver", relay: "News to relay" },
  auditor: { over: "Overrides to review", exc: "Exceptions" },
  manager: { above: "Yours to decide", esc: "Waiting too long", late: "Accounts over 30 days late" },
  admin: { acct: "Accounts", sys: "System health" },
};
const TONE = { High: "red", Moderate: "blue", Low: "green" };

async function apps() {
  return (await db.query(`select a.*, b.full_name, p.name as product, p.processing_fee, en.short_name as encoder, ag.short_name as agent_name, sg.short_name as assignee, sg.username as assignee_username,
      exists (select 1 from escalations e where e.application_id = a.id and e.status_since = a.status_since) as escalated
    from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id join users en on en.id = a.encoded_by
      left join users ag on ag.id = a.agent_id left join users sg on sg.id = a.assigned_to
    where a.status not in ('funded', 'rejected') or a.status_since > now() - interval '3 days'
    order by a.status_since`)).rows;
}
const item = (a, kind, stamp, tone, act, why, page, more = {}) => ({ ref: a.reference, who: a.full_name, prod: a.product, amt: Number(a.amount),
  term: a.term_months + " months", kind, hours: hoursSince(a.status_since), stamp, tone, act, why, page: page + "?ref=" + a.reference, escalated: !!a.escalated, ...more });

async function missingPapers(list) {
  const out = {};
  if (!list.length) return out;
  const docs = (await db.query("select application_id, array_agg(distinct slot) slots from documents where application_id = any($1) group by application_id", [list.map((a) => a.id)])).rows;
  for (const a of list) {
    const have = (docs.find((d) => d.application_id === a.id) || { slots: [] }).slots;
    out[a.id] = (await intake.checklistFor(intake.kindOf(a.product))).filter(([s]) => !have.includes(s)).map(([, l]) => l);
  }
  return out;
}
async function latest(table, ids, cols = "*") {
  if (!ids.length) return {};
  const rows = (await db.query(`select distinct on (t.application_id) t.${cols === "*" ? "*" : cols} from ${table} t where t.application_id = any($1) order by t.application_id, t.id desc`, [ids])).rows;
  return Object.fromEntries(rows.map((r) => [r.application_id, r]));
}
async function accounts() {
  const rows = (await db.query(`select l.*, b.full_name, p.name as product, x.reference from loan_accounts l join applications x on x.id = l.application_id
      join borrowers b on b.id = x.borrower_id join loan_products p on p.id = x.product_id order by l.number`)).rows;
  for (const r of rows) r.st = loans.standing((await db.query("select * from installments where account_id = $1 order by n", [r.id])).rows, today(), Number(r.late_penalty));
  return rows;
}
const acctItem = (r, kind, stamp, tone, act, why, page, hours, amt) => ({ ref: r.number, who: r.full_name, prod: r.product, amt, term: r.term_months + " months", kind, hours, stamp, tone, act, why, page: page + "?no=" + r.number, escalated: false });

async function queue(u) {
  const role = ROLE_KEY[u.role], s = await settings.load(), limitH = Number(s.escalation_hours) || 48;
  const items = []; let extra = ["", ""];
  if (role === "processor") {
    const A = await apps(), sub = A.filter((a) => a.status === "submitted"), miss = await missingPapers(sub);
    const lastV = await latest("verifications", sub.filter((a) => a.check_state === "returned").map((a) => a.id));
    const agr = await latest("agreements", A.filter((a) => ["approved", "accepted"].includes(a.status)).map((a) => a.id));
    for (const a of A) {
      const mine = a.encoded_by === u.id;
      if (a.status === "draft" && mine) items.push(item(a, "draft", "Draft", "brown", "Resume draft", "Not yet submitted. Finish the papers and submit it.", "documents"));
      else if (a.status === "submitted" && mine && a.check_state === "returned") {
        const v = lastV[a.id], f = v ? Object.values(v.flags || {}).map((x) => x.reason || x).filter(Boolean) : [];
        items.push(item(a, "back", "Returned for correction", "red", "Fix and resubmit", "Verifier: " + (clip(f.join("; "), 160) || "some entries do not match the papers."), "encode-verify"));
      } else if (a.status === "submitted" && mine && miss[a.id].length) items.push(item(a, "docs", miss[a.id].length + (miss[a.id].length === 1 ? " document missing" : " documents missing"), miss[a.id].length > 1 ? "red" : "brown", "Open checklist", "Still needed: " + miss[a.id].join(", ") + ".", "documents"));
      else if (a.status === "submitted" && !mine && a.check_state === "waiting" && !miss[a.id].length) items.push(item(a, "verify", "Encoded", "blue", "Verify against documents", "Encoded by " + a.encoder + ". You cannot verify your own entries, so this one is yours.", "encode-verify"));
      else if (a.status === "approved" || (a.status === "accepted" && !(agr[a.id] && agr[a.id].locked_at))) {
        const g = agr[a.id], step = !g ? "Draw up the agreement" : !g.disclosed_on ? "Give the disclosure statement" : "Upload the signed agreement";
        items.push(item(a, "agree", a.status === "approved" ? "Approved" : "Accepted by borrower", "green", step, step + ". The money cannot be released until the signed copy is locked.", "loan-agreement",
          { amt: Number(a.approved_amount || a.amount), term: (a.approved_term || a.term_months) + " months" }));
      }
    }
    extra = ["Submitted today", Number((await db.query("select count(*) n from applications where encoded_by = $1 and created_at > (now() at time zone 'Asia/Manila')::date at time zone 'Asia/Manila'", [u.id])).rows[0].n)];
  } else if (role === "underwriter") {
    const A = await apps(), lead = u.role === "lead_underwriter", lim = Number(u.approval_limit || 0);
    const rev = A.filter((a) => a.status === "review"), ids = rev.map((a) => a.id);
    const as = await latest("assessments", ids), dec = await latest("decisions", A.filter((a) => ["review", "declined"].includes(a.status)).map((a) => a.id));
    const deciders = {}; Object.values(dec).forEach((d) => { deciders[d.decided_by] = 1; });
    const who = Object.keys(deciders).length ? (await db.query("select id, short_name, role from users where id = any($1)", [Object.keys(deciders)])).rows : [];
    const names = Object.fromEntries(who.map((r) => [r.id, r.short_name])), roles = Object.fromEntries(who.map((r) => [r.id, r.role]));
    for (const a of rev) {
      const d = dec[a.id], up = d && d.kind === "up", x = as[a.id];
      if (up && roles[d.decided_by] === "lead_underwriter") continue;     // endorsed on to the Operations Manager
      if (up && lead) { items.push(item(a, "above", "Above " + names[d.decided_by] + "'s limit", "blue", "Open the decision", "Endorsed upward by " + names[d.decided_by] + ": " + clip(d.remarks, 140), "decision")); continue; }
      if (up && !lead) continue;
      const mineOrFree = a.assigned_to === u.id || (!a.assigned_to && (lead || Number(a.amount) <= lim));
      if (!mineOrFree) continue;
      items.push(item(a, "review", x ? x.tier + " risk" : "Not assessed yet", x ? TONE[x.tier] || "blue" : "brown", x ? "Open the decision" : "Open assessment",
        (x ? x.why : "No credit report yet. Ask FinScore on the Credit assessment screen.") + (a.assigned_to ? "" : " Not assigned to anyone yet."), x ? "decision" : "credit-assessment"));
    }
    const off = await latest("counter_offers", A.filter((a) => a.status === "declined").map((a) => a.id));
    for (const a of A.filter((a) => a.status === "declined")) {
      const d = dec[a.id], o = off[a.id];
      if (!lead && !(d && d.decided_by === u.id)) continue;
      items.push(item(a, "counter", "Declined by borrower", "red", "Revise or reject", o ? `Offer ${o.n}: ${peso(o.amount)} for ${o.term_months} months was declined.` : "The borrower declined the offer.", "counter-offers"));
    }
    extra = ["Your approval limit", peso(lim).replace("₱ ", "")];
  } else if (role === "disbursement") {
    const A = (await apps()).filter((a) => a.status === "accepted"), agr = await latest("agreements", A.map((a) => a.id));
    for (const a of A) {
      const amt = Number(a.approved_amount || a.amount), net = amt * (1 - Number(a.processing_fee)), ready = agr[a.id] && agr[a.id].locked_at;
      items.push(item(a, ready ? "release" : "wait", ready ? "Signed agreement on file" : "Agreement not signed yet", ready ? "green" : "brown", ready ? "Release loan" : "See the agreement",
        ready ? "Net proceeds " + peso(net) + " after charges." : "The loan processor has not locked the signed agreement yet. Nothing for you to do until then.", ready ? "release-loan" : "loan-agreement", { amt, term: (a.approved_term || a.term_months) + " months" }));
    }
    const r = (await db.query("select coalesce(sum(net), 0) s from disbursements where released_at > (now() at time zone 'Asia/Manila')::date at time zone 'Asia/Manila'")).rows[0];
    extra = ["Released today", peso(r.s).replace("₱ ", "")];
  } else if (role === "account" || role === "manager") {
    if (role === "manager") {          // the top of the approval ladder: what the Lead Underwriter endorsed upward
      const rev = (await apps()).filter((a) => a.status === "review"), dec = await latest("decisions", rev.map((a) => a.id));
      const ups = rev.filter((a) => dec[a.id] && dec[a.id].kind === "up");
      const by = ups.length ? Object.fromEntries((await db.query("select id, short_name, role from users where id = any($1)", [ups.map((a) => dec[a.id].decided_by)])).rows.map((r) => [r.id, r])) : {};
      for (const a of ups) { const d = dec[a.id], w = by[d.decided_by]; if (!w || w.role !== "lead_underwriter") continue;
        items.push(item(a, "above", "Above the Lead's limit", "blue", "Open the decision", "Endorsed upward by " + w.short_name + ": " + clip(d.remarks, 140), "decision")); }
    }

    const L = await accounts();
    for (const r of L) {
      if (r.st.closed) { if (role === "account" && r.closed_on && r.closed_on >= new Date(Date.now() - 30 * 86400e3).toISOString().slice(0, 10)) items.push(acctItem(r, "paid", "Fully paid", "green", "Open account", "Paid in full on " + r.closed_on + ". Issue the clearance when the borrower asks.", "loan-account", 0, 0)); continue; }
      const dpd = r.st.daysPastDue, label = { "1-30": "1 to 30 days late", "31-60": "31 to 60 days late", "61-90": "61 to 90 days late", "90+": "Over 90 days late" }[r.st.bucket];
      if (dpd > 0 && (role === "account" || dpd > 30)) items.push(acctItem(r, "late", label, dpd > 30 ? "red" : "brown", "Open account", peso(r.st.overdue) + " overdue" + (r.st.penalty ? " plus " + peso(r.st.penalty) + " in penalties" : "") + ".", "loan-account", dpd * 24, r.st.overdue));
      else if (role === "account" && r.st.next && r.st.next.dueOn <= new Date(Date.now() + 8 * 3600e3 + 7 * 86400e3).toISOString().slice(0, 10))
        items.push(acctItem(r, "due", "Due " + new Date(r.st.next.dueOn + "T00:00:00Z").toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" }), "blue", "Post payment", "Installment " + r.st.next.n + " of " + r.term_months + ".", "post-payment", 0, r.st.next.amount));
    }
    if (role === "account") extra = ["Payments posted today", Number((await db.query("select count(*) n from payments where reverses is null and posted_at > (now() at time zone 'Asia/Manila')::date at time zone 'Asia/Manila'")).rows[0].n)];
    else {
      const A = await apps();
      for (const a of A.filter((x) => ESCALATES.includes(x.status) && (x.escalated || hoursSince(x.status_since) >= limitH)))
        items.push(item(a, "esc", "Waiting at " + STATUS[a.status], "red", "Open the application", "Nobody has moved it on for " + Math.floor(hoursSince(a.status_since)) + " hours." + (a.assignee ? " It is with " + a.assignee + "." : ""), "application-detail"));
      extra = ["Applications in progress", A.filter((a) => !["funded", "rejected", "declined"].includes(a.status)).length];
    }
  } else if (role === "agent") {
    const A = (await apps()).filter((a) => a.agent_id === u.id), off = await latest("counter_offers", A.filter((a) => a.status === "awaiting").map((a) => a.id));
    const sub = A.filter((a) => a.status === "submitted"), miss = await missingPapers(sub);
    for (const a of A) {
      const o = off[a.id];
      if (a.status === "awaiting") items.push(item(a, "offer", "Awaiting borrower", "red", "Record the response", o ? `Offer ${o.n}: ${peso(o.amount)} for ${o.term_months} months. Proof of the borrower's answer is required.` : "Tell the borrower the offer and record the answer.", "record-answer", { term: "Asked for " + peso(a.amount) }));
      else if (a.status === "submitted" && miss[a.id].length) items.push(item(a, "relay", miss[a.id].length + " document" + (miss[a.id].length > 1 ? "s" : "") + " missing", "brown", "See what is needed", "Ask the borrower for: " + miss[a.id].join(", ") + ".", "application-detail"));
      else if (["approved", "rejected", "funded", "accepted"].includes(a.status) && hoursSince(a.status_since) < 72)
        items.push(item(a, "relay", STATUS[a.status], a.status === "rejected" ? "red" : "green", "See the application",
          { approved: "Approved. The agreement is being drawn up; the borrower will be asked to come in and sign.", accepted: "Accepted. Waiting for the signed agreement and the release.", funded: "Released. Tell the borrower the money is on its way and when the first payment is due.", rejected: "Declined. Tell the borrower in person; the reason is on the application." }[a.status], "application-detail"));
    }
    extra = ["Borrowers in progress", A.filter((a) => !["funded", "rejected", "declined"].includes(a.status)).length];
  } else if (role === "auditor") {
    const ov = (await db.query(`select d.*, a.reference, a.term_months, p.name product, u.short_name from decisions d join applications a on a.id = d.application_id join loan_products p on p.id = a.product_id
        join users u on u.id = d.decided_by where d.is_override and d.decided_at > now() - interval '30 days' order by d.decided_at`)).rows;
    for (const d of ov) items.push({ ref: d.reference, who: "Override by " + d.short_name, prod: d.product, amt: Number(d.amount || 0), term: "Rule set version " + d.rule_version, kind: "over", hours: hoursSince(d.decided_at), stamp: "Override", tone: "red", act: "Open the record", why: "Recommended: " + d.recommended + ". Remark: " + clip(d.remarks, 140), page: "application-detail?ref=" + d.reference, escalated: false });
    const rv = (await db.query(`select p.*, l.number, u.short_name from payments p join loan_accounts l on l.id = p.account_id join users u on u.id = p.posted_by where p.reverses is not null and p.posted_at > now() - interval '30 days' order by p.posted_at`)).rows;
    for (const p of rv) items.push({ ref: p.number, who: "Payment reversal", prod: "Loan account", amt: Math.abs(Number(p.amount)), term: "By " + p.short_name, kind: "exc", hours: hoursSince(p.posted_at), stamp: "Reversal", tone: "blue", act: "Open the record", why: "Reason: " + clip(p.reason, 140), page: "loan-account?no=" + p.number, escalated: false });
    const lk = (await db.query("select record, at, ip from audit_log where kind = 'login' and action like '%locked%' and at > now() - interval '14 days' order by id")).rows;
    for (const l of lk) items.push({ ref: l.record, who: "Five failed sign-ins", prod: "User account", amt: 0, term: "Account locked", kind: "exc", hours: hoursSince(l.at), stamp: "Locked", tone: "brown", act: "Open the record", why: "From " + (l.ip || "an unknown address") + ".", page: "audit-log", escalated: false });
    extra = ["Access", "Read only"];
  } else if (role === "admin") {
    const us = (await db.query("select * from users where is_active and (locked_at is not null or must_change_password) order by full_name")).rows;
    for (const x of us) items.push({ ref: "User: " + x.username, who: x.full_name + ", " + auth.ROLE_NAMES[x.role], prod: "User account", amt: 0, term: x.locked_at ? "Locked after 5 attempts" : "One-time password", kind: "acct",
      hours: hoursSince(x.locked_at || x.password_changed_at || x.created_at), stamp: x.locked_at ? "Locked" : "Not yet signed in", tone: x.locked_at ? "red" : "brown", act: "Open the account",
      why: x.locked_at ? "Unlock it once you know the person is who they say." : "Has not chosen their own password yet. Give them the one-time password in person.", page: "users-roles", escalated: false });
    const hc = (await db.query(`select distinct on (service) service, status, detail, checked_at from health_checks where checked_at > now() - interval '24 hours' order by service, checked_at desc`)).rows;
    for (const h of hc.filter((x) => x.status === "down" || x.status === "slow"))
      items.push({ ref: "Service: " + h.service, who: { db: "Database", seal: "Audit log seals", bureau: "FinScore credit bureau", files: "Document storage" }[h.service] || h.service, prod: "Integration", amt: 0, term: h.status === "down" ? "Not answering" : "Slow", kind: "sys", hours: hoursSince(h.checked_at), stamp: h.status === "down" ? "Down" : "Slow", tone: "red", act: "Open system health", why: h.detail || "Check it on the System page.", page: "system", escalated: false });
    const ok = hc.filter((x) => x.status === "ok").length;
    extra = hc.length ? ["Lines answering at last check", ok + " of " + hc.filter((x) => x.status !== "off").length] : ["Active accounts", Number((await db.query("select count(*) n from users where is_active")).rows[0].n)];
  }
  items.sort((a, b) => b.hours - a.hours);
  return { role, title: auth.ROLE_NAMES[u.role], name: u.full_name, limitHours: limitH, extra, kinds: KINDS[role] || {}, items };
}

router.get("/queue", wrap(async (req, res) => {
  await escalate();
  const q = await queue(req.user), n = await oversight.notices(req.user);
  res.json({ ...q, unread: n.filter((x) => x.un).length });
}));
router.get("/rail", wrap(async (req, res) => {
  const [q, n] = await Promise.all([queue(req.user), oversight.notices(req.user)]);
  res.json({ queue: q.items.length, unread: n.filter((x) => x.un).length, role: req.user.role, practice: require("../lib/practice").on() });
}));

// ===================================================================== Review queue
const UW = ["underwriter", "lead_underwriter"];
async function reviewView(me) {
  const people = (await db.query("select id, username, full_name, short_name, role, approval_limit from users where is_active and role = any($1) order by (role = 'lead_underwriter') desc, approval_limit desc nulls last, full_name", [UW])).rows;
  const A = (await apps()).filter((a) => a.status === "review"), ids = A.map((a) => a.id);
  const as = await latest("assessments", ids), dec = await latest("decisions", ids);
  const byId = Object.fromEntries(people.map((p) => [p.id, p]));
  const P = (await db.query("select policy from rule_sets where is_active order by version desc limit 1")).rows[0].policy;
  const items = A.map((a) => {
    const x = as[a.id], d = dec[a.id], why = [];
    if (x) why.push(x.why); else why.push("No credit report yet: the assessment has not been run");
    if (Number(a.amount) > Number(P.autoMax)) why.push("Above " + peso(P.autoMax) + ", the most CALMS may approve without a person");
    if (d && d.kind === "up") why.push("Endorsed upward by " + (byId[d.decided_by] ? byId[d.decided_by].short_name : "an underwriter") + ": " + clip(d.remarks, 120));
    return { ref: a.reference, who: a.full_name, prod: a.product, amt: Number(a.amount), tier: x ? x.tier : "Pending", dti: x && x.dti != null ? Number(x.dti) : null, fs: x ? x.score : null, ltv: x && x.ltv != null ? Number(x.ltv) : null,
      hours: hoursSince(a.status_since), urg: !!(d && d.kind === "up"), late: a.escalated || hoursSince(a.status_since) >= 48, rec: x ? x.outcome : "Run the credit assessment", why, memo: x ? clip(x.memo, 420) : "",
      version: x ? x.rule_version : null, desk: a.assignee_username || "", encodedByMe: a.encoded_by === me.id };
  });
  const log = (await db.query(`select s.*, a.reference, b.full_name, f.short_name f_name, t.short_name t_name, m.short_name m_name from assignments s join applications a on a.id = s.application_id join borrowers b on b.id = a.borrower_id
      left join users f on f.id = s.from_user join users t on t.id = s.to_user left join users m on m.id = s.moved_by order by s.id desc limit 12`)).rows.map((r) => ({
      at: r.moved_at, text: `${r.m_name || "CALMS"} moved ${r.reference} (${r.full_name.split(" ").slice(-1)[0]}) from ${r.f_name || "arrivals"} to ${r.t_name}. Reason: ${r.reason.toLowerCase()}.` }));
  const tape = (await db.query(`select l.at, l.record, l.action from audit_log l where l.kind in ('status', 'decision', 'bureau', 'data') and split_part(l.record, ' ', 1) = any($1) order by l.id desc limit 5`, [A.map((a) => a.reference)])).rows
    .map((r) => { const a = A.find((x) => x.reference === r.record.split(" ")[0]); return { at: r.at, text: `${a.reference} ${a.full_name.split(" ").slice(-1)[0].toUpperCase()} ${r.action.toUpperCase().replace(/\.$/, "").replace(/₱\s?[\d,.]+/g, "")} STOP` }; });
  return { me: me.username, lead: me.role === "lead_underwriter", people: people.map((p) => ({ key: p.username, name: p.full_name, short: p.short_name, role: auth.ROLE_NAMES[p.role], limit: Number(p.approval_limit || 0), out: "" })),
    items, log, tape, leadMax: Math.max(0, ...people.filter((p) => p.role === "lead_underwriter").map((p) => Number(p.approval_limit || 0))) };
}
router.get("/review-queue", auth.allow(...UW, "operations_manager"), wrap(async (req, res) => res.json(await reviewView(req.user))));
router.post("/review-queue/assign", auth.allow("lead_underwriter"), wrap(async (req, res) => {
  const ref = String(req.body.ref || ""), to = String(req.body.to || ""), reason = String(req.body.reason || "");
  if (!REASONS.includes(reason)) return res.status(400).json({ error: "Choose a reason: " + REASONS.join(", ").toLowerCase() + "." });
  const a = (await db.query("select a.*, sg.short_name assignee from applications a left join users sg on sg.id = a.assigned_to where a.reference = $1", [ref])).rows[0];
  if (!a) return res.status(404).json({ error: "No application has that number." });
  if (a.status !== "review") return res.status(409).json({ error: "Only applications Under Review sit on a desk." });
  const t = (await db.query("select * from users where username = $1 and is_active and role = any($2)", [to, UW])).rows[0];
  if (!t) return res.status(400).json({ error: "That person is not an active underwriter." });
  if (a.assigned_to === t.id) return res.status(409).json({ error: "It is already on that desk." });
  if (a.encoded_by === t.id) return res.status(409).json({ error: t.full_name + " encoded this application, so cannot decide it." });
  await db.transaction(async (tx) => {
    await tx.query("update applications set assigned_to = $2, assigned_at = now() where id = $1", [a.id, t.id]);
    await tx.query("insert into assignments (application_id, from_user, to_user, reason, moved_by) values ($1, $2, $3, $4, $5)", [a.id, a.assigned_to, t.id, reason, req.user.id]);
    await audit.write({ user: req.user, kind: "data", action: "Assigned for review to " + t.full_name, record: a.reference, before: { with: a.assignee || "arrivals" }, after: { with: t.short_name, reason }, ip: req.ip }, tx);
  });
  res.json(await reviewView(req.user));
}));

module.exports = router;
module.exports.escalate = escalate;
