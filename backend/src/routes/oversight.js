// Oversight: Audit log, Reports, Notifications.
//   GET  /api/audit                    ?days=7   entries, newest first, with before and after in words
//   POST /api/audit/check                         re-compute every seal (the check is itself logged)
//   POST /api/audit/export                        { count, format, filters } logs that records were exported
//   GET  /api/reports                             this month, last month and the last three months, plus aging today
//   POST /api/reports/export                      { report, period, format } logs the export
//   GET  /api/notifications                       notices for the signed-in person
//   POST /api/notifications/read                  { ids, read } mark as read or as new;  { all: true } marks every one read
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const auth = require("../lib/auth");
const loans = require("../lib/loans");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const AUDITORS = auth.allow("compliance_auditor", "system_administrator");

// ---- before and after, in words ----
const words = (k) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const TECH = /^(sha256|sha|hash|slot|mime|mimeType|sizeBytes|size)$/i;
function said(v, depth = 0, brief = false) {
  if (v == null || v === "") return "";
  if (brief && v && typeof v === "object" && !Array.isArray(v)) v = Object.fromEntries(Object.entries(v).filter(([k]) => !TECH.test(k)));
  if (Array.isArray(v)) return v.length > 6 && depth ? v.length + " items" : v.map((x) => said(x, depth + 1, brief)).filter(Boolean).join("; ");
  if (typeof v === "object") return Object.keys(v).filter((k) => v[k] != null && v[k] !== "" && !(Array.isArray(v[k]) && !v[k].length))
    .map((k) => (depth > 1 ? said(v[k], depth + 1, brief) : words(k) + ": " + said(v[k], depth + 1, brief))).join(depth ? ", " : ". ");
  if (typeof v === "boolean") return v ? "yes" : "no";
  return String(v);
}
const clip = (s, n = 400) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const SENSITIVE = /locked|revers|override|full ID|Deactivated|Reset a user|role|limit|Published rule|Exported/i;

// ===================================================================== Audit log
router.get("/audit", AUDITORS, wrap(async (req, res) => {
  const days = Math.min(400, Math.max(1, Number(req.query.days) || 7));
  const [rows, total, first] = await Promise.all([
    db.query(`select l.*, u.role from audit_log l left join users u on u.id = l.user_id where l.at > now() - make_interval(days => $1) order by l.id desc limit 1000`, [days]),
    db.query("select count(*) n from audit_log"), db.query("select min(at) m from audit_log"),
  ]);
  res.json({
    total: Number(total.rows[0].n), since: first.rows[0].m, truncated: rows.rows.length === 1000,
    entries: rows.rows.map((r) => ({ n: Number(r.id), at: r.at, who: r.actor, role: r.role ? auth.ROLE_NAMES[r.role] : r.actor === "CALMS" ? "The system itself" : r.actor === "Unknown" ? "Not signed in" : "",
      kind: r.kind, text: r.action, rec: r.record || "", was: clip(said(r.before)), now: clip(said(r.after)) || "Done", ip: r.ip || "server", hot: SENSITIVE.test(r.action) || r.kind === "decision" && /override|against/i.test(r.action),
      seal: r.seal, prev: r.prev_seal })),
  });
}));
router.post("/audit/check", AUDITORS, wrap(async (req, res) => {
  const broken = await audit.verify(), n = Number((await db.query("select count(*) n from audit_log")).rows[0].n);
  await audit.write({ user: req.user, kind: "audit", action: "Checked the audit seals", record: "Audit log", after: { entries: n, result: broken === null ? "unbroken" : "broken at entry " + broken }, ip: req.ip });
  res.json({ unbroken: broken === null, firstBrokenEntry: broken, entries: n });
}));
router.post("/audit/export", AUDITORS, wrap(async (req, res) => {
  const count = Math.max(0, Number(req.body.count) || 0), format = req.body.format === "PDF" ? "PDF" : "spreadsheet";
  const f = req.body.filters || {}, filters = Object.fromEntries(Object.entries({ search: f.q, kind: f.kind, who: f.who, days: f.when }).filter(([, v]) => v));
  await audit.write({ user: req.user, kind: "audit", action: "Exported audit records", record: "Audit log", after: { entries: count, format, filters }, ip: req.ip });
  res.json({ ok: true });
}));

// ===================================================================== Reports
const STAGES = [["draft", "Draft"], ["submitted", "Papers and checks"], ["review", "Under review"], ["approved", "Approved"], ["awaiting", "Waiting for the borrower"], ["accepted", "Ready to release"]];
const MANILA = 8 * 3600e3;
function manilaMidnight(y, m, d) { return new Date(Date.UTC(y, m, d) - MANILA); }
function periods() {
  const n = new Date(Date.now() + MANILA), Y = n.getUTCFullYear(), M = n.getUTCMonth(), D = n.getUTCDate();
  const mstart = (k) => manilaMidnight(Y, M + k, 1), tomorrow = manilaMidnight(Y, M, D + 1);
  const mname = (k, long) => new Date(Date.UTC(Y, M + k, 1)).toLocaleDateString("en-PH", { timeZone: "UTC", month: long ? "long" : "short", year: long ? "numeric" : undefined });
  const weeks = (a, b) => { const out = []; for (let i = 0, s = a; s < b; i++) { const e = new Date(Math.min(b, s.getTime() + 7 * 86400e3)); out.push(["Week " + (i + 1), s, e]); s = e; } return out; };
  const days = D; // days of this month so far
  return {
    now: { name: mname(0, true) + ", so far", prev: "the same days last month", from: mstart(0), to: tomorrow, pfrom: mstart(-1), pto: manilaMidnight(Y, M - 1, D + 1), buckets: weeks(mstart(0), tomorrow), days },
    last: { name: mname(-1, true), prev: mname(-2, true), from: mstart(-1), to: mstart(0), pfrom: mstart(-2), pto: mstart(-1), buckets: weeks(mstart(-1), mstart(0)) },
    qtr: { name: mname(-3, true).split(" ")[0] + " to " + mname(-1, true), prev: "the three months before", from: mstart(-3), to: mstart(0), pfrom: mstart(-6), pto: mstart(-3), buckets: [-3, -2, -1].map((k) => [mname(k), mstart(k), mstart(k + 1)]) },
  };
}
const ymd = (d) => new Date(d.getTime() + MANILA).toISOString().slice(0, 10);
async function periodData(p) {
  const q = (sql, a) => db.query(sql, a).then((r) => r.rows);
  const count = async (a, b) => Number((await q("select count(*) n from applications where created_at >= $1 and created_at < $2", [a, b]))[0].n);
  const dec = await q(`select kind, count(*) n from decisions where decided_at >= $1 and decided_at < $2 group by kind`, [p.from, p.to]);
  const dn = (k) => dec.filter((r) => k.includes(r.kind)).reduce((s, r) => s + Number(r.n), 0);
  const tat = async (a, b) => q(`select p.name, avg(extract(epoch from (d.released_at - x.created_at)) / 86400) days, count(*) n from disbursements d
      join applications x on x.id = d.application_id join loan_products p on p.id = x.product_id where d.released_at >= $1 and d.released_at < $2 and d.released_at > x.created_at group by p.name`, [a, b]);
  const avgDays = (rows) => { const n = rows.reduce((s, r) => s + Number(r.n), 0); return n ? rows.reduce((s, r) => s + Number(r.days) * Number(r.n), 0) / n : null; };
  const due = async (a, b) => (await q(`select coalesce(sum(principal + interest), 0) due, coalesce(sum(paid_principal + paid_interest), 0) paid from installments where due_on >= $1 and due_on < $2`, [ymd(a), ymd(b)]))[0];
  const [r0, r1, t0, t1, c0, c1] = await Promise.all([count(p.from, p.to), count(p.pfrom, p.pto), tat(p.from, p.to), tat(p.pfrom, p.pto), due(p.from, p.to), due(p.pfrom, p.pto)]);
  const eff = (c) => (Number(c.due) ? Number(c.paid) / Number(c.due) * 100 : null);
  const vol = [], col = [];
  for (const [label, a, b] of p.buckets) { vol.push([label, await count(a, b)]); const c = await due(a, b); col.push([label, Number(c.due), Number(c.paid)]); }
  const off = await q(`select u.full_name, u.role, count(*) n from audit_log l join users u on u.id = l.user_id
      where l.at >= $1 and l.at < $2 and l.kind in ('data','status','decision','pay') group by u.full_name, u.role order by n desc limit 8`, [p.from, p.to]);
  const wait = await q(`select status, avg(extract(epoch from (left_at - entered_at)) / 3600) h from application_stages where left_at >= $1 and left_at < $2 group by status`, [p.from, p.to]);
  return {
    name: p.name, prev: p.prev, recv: [r0, r1], ok: dn(["asis", "up"]), co: dn(["other"]), no: dn(["no"]),
    days: [avgDays(t0), avgDays(t1)], eff: [eff(c0), eff(c1)], vol, col: col.filter((c) => c[1] > 0),
    tat: t0.map((r) => [r.name, Number(r.days)]), off: off.map((r) => [r.full_name, auth.ROLE_NAMES[r.role], Number(r.n)]),
    wait: STAGES.map(([s]) => { const w = wait.find((x) => x.status === s); return w ? Math.round(Number(w.h)) : 0; }),
  };
}
router.get("/reports", auth.allow("operations_manager", "compliance_auditor", "system_administrator"), wrap(async (req, res) => {
  const P = periods(), out = {};
  for (const k of Object.keys(P)) out[k] = await periodData(P[k]);
  const nowQ = (await db.query("select status, count(*) n from applications group by status")).rows;
  out.now.q = STAGES.map(([s]) => Number((nowQ.find((r) => r.status === s) || { n: 0 }).n));
  ["last", "qtr"].forEach((k) => { out[k].q = STAGES.map(() => 0); });
  // Aging: principal still out on open accounts, by days past due, as of today.
  const today = ymd(new Date()), B = { current: 0, "1-30": 1, "31-60": 2, "61-90": 3, "90+": 4 };
  const aging = [["Current", 0, 0], ["1 to 30 days late", 0, 0], ["31 to 60 days late", 0, 0], ["61 to 90 days late", 0, 0], ["Over 90 days late", 0, 0]];
  const accts = (await db.query("select l.id, p.late_penalty from loan_accounts l join applications x on x.id = l.application_id join loan_products p on p.id = x.product_id where l.closed_on is null")).rows;
  for (const a of accts) {
    const s = loans.standing((await db.query("select * from installments where account_id = $1 order by n", [a.id])).rows, today, Number(a.late_penalty));
    if (s.closed) continue; const i = B[s.bucket]; aging[i][1] += s.principalLeft; aging[i][2]++;
  }
  res.json({ periods: out, aging: aging.map((r) => [r[0], Math.round(r[1]), r[2]]), stages: STAGES.map((s) => s[1]) });
}));
router.post("/reports/export", auth.allow("operations_manager", "compliance_auditor", "system_administrator"), wrap(async (req, res) => {
  const report = String(req.body.report || "").slice(0, 80), period = String(req.body.period || "").slice(0, 60), format = req.body.format === "PDF" ? "PDF" : "spreadsheet";
  await audit.write({ user: req.user, kind: "audit", action: "Exported a report", record: "Report: " + report, after: { period, format }, ip: req.ip });
  res.json({ ok: true });
}));

// ===================================================================== Notifications
// A notice is an audit entry about work the person is part of, written by someone else.
// The eight kinds match the rows on My profile, "Which notices I get".
const KIND_RULES = [
  [0, (e) => /Submitted a new application/.test(e.action)],
  [1, (e) => e.kind === "doc" && /^Filed/.test(e.action)],
  [2, (e) => /missing|unreadable/i.test(e.action)],
  [3, (e) => e.kind === "decision"],
  [4, (e) => /answer/i.test(e.action)],
  [5, (e) => /Released/.test(e.action)],
  [6, (e) => /Returned|sent back/i.test(e.action)],
  [7, (e) => /^Escalated/.test(e.action)],
];
const DEFAULT_PREFS = [[1, 1, 0], [1, 0, 0], [1, 1, 0], [1, 1, 0], [1, 0, 0], [1, 0, 0], [1, 1, 0], [1, 1, 1]];
const ALWAYS = [6, 7];
// Which statuses wait on each role, and whether only their own applications count.
const WAITS_ON = { loan_processor: [["draft", "submitted", "approved"], true], sales_agent: [["awaiting"], true], underwriter: [["review"], false],
  lead_underwriter: [["review"], false], disbursement_officer: [["accepted"], false] };
const READS = /^(Opened|Downloaded|Showed|Viewed|Checked the audit|Exported|Signed)/;

// Notices never carry amounts or credit details (those stay on the record itself), so only these parts of an entry are told.
const SAFE_KEYS = ["offer", "answer", "channel", "file", "version", "reason", "entries", "termMonths", "status"];
const safe = (v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([k]) => SAFE_KEYS.includes(k))) : null);
function noticeText(e) {
  if (e.kind === "bureau") return "A credit bureau report was requested or came back.";
  if (e.kind === "decision") return "A decision was made. Open the application to read it.";
  return e.action.replace(/\s*(of\s+)?₱\s?[\d,]+(\.\d+)?/g, "").replace(/\s{2,}/g, " ").replace(/\.?$/, ".");
}
async function notices(user) {
  const prefs = Array.isArray(user.notify_prefs) ? user.notify_prefs : DEFAULT_PREFS;
  const mine = (await db.query(`select reference from applications where encoded_by = $1 or agent_id = $1
      union select distinct split_part(record, ' ', 1) from audit_log where user_id = $1 and record like 'APP-%' and at > now() - interval '30 days'`, [user.id])).rows.map((r) => r.reference);
  const [statuses, own] = WAITS_ON[user.role] || [[], true];
  // An underwriter waits only on what is on their own desk or not yet dealt out; the Lead on everything Under Review.
  const desk = user.role === "underwriter" ? " and (assigned_to is null or assigned_to = $3)" : "";
  const waiting = statuses.length ? (await db.query(`select reference, status, status_since from applications where status = any($1) and ($2 = false or encoded_by = $3 or agent_id = $3)${desk}`, [statuses, own, user.id])).rows : [];
  const waitRefs = waiting.map((w) => w.reference), refs = [...new Set(mine.concat(waitRefs))];
  const rows = (await db.query(`select l.*, r.audit_id is not null as is_read from audit_log l left join notification_reads r on r.audit_id = l.id and r.user_id = $1
      where l.at > now() - interval '14 days' and (l.user_id is distinct from $1) and l.kind in ('data','status','decision','doc','pay','bureau')
        and split_part(l.record, ' ', 1) = any($2) order by l.id desc limit 300`, [user.id, refs])).rows.filter((e) => !READS.test(e.action));
  let extra = [];
  if (user.role === "system_administrator") extra = (await db.query(`select l.*, r.audit_id is not null as is_read from audit_log l left join notification_reads r on r.audit_id = l.id and r.user_id = $1
      where l.at > now() - interval '14 days' and l.kind = 'login' and l.action like '%locked%' order by l.id desc limit 20`, [user.id])).rows;
  // The Operations Manager is the supervisor every escalation goes to.
  if (user.role === "operations_manager") extra = extra.concat((await db.query(`select l.*, r.audit_id is not null as is_read from audit_log l left join notification_reads r on r.audit_id = l.id and r.user_id = $1
      where l.at > now() - interval '14 days' and l.action like 'Escalated%' order by l.id desc limit 40`, [user.id])).rows);
  const locked = user.role === "system_administrator" ? (await db.query("select username from users where locked_at is not null and is_active")).rows.map((r) => "User: " + r.username) : [];
  // Only the newest notice per application carries "Needs you", so one waiting application is one thing to do.
  // An application that only waits on the person's role (not one they worked on) shows just its newest entry.
  const flagged = new Set(), seen = new Set(), out = [];
  for (const e of rows.concat(extra).sort((a, b) => Number(b.id) - Number(a.id))) {
    const ref = (e.record || "").split(" ")[0], rule = KIND_RULES.find(([, f]) => f(e)), k = rule ? rule[0] : -1;
    if (!mine.includes(ref) && e.kind !== "login") { if (seen.has(ref)) continue; seen.add(ref); }
    if (k >= 0 && !ALWAYS.includes(k) && prefs[k] && !prefs[k][0]) continue;
    let need = 0;
    if (waitRefs.includes(ref) && !flagged.has(ref)) { need = 1; flagged.add(ref); }
    if (e.kind === "login" && locked.includes(e.record) && !flagged.has(e.record)) { need = 1; flagged.add(e.record); }
    const w = waiting.find((x) => x.reference === ref);
    out.push({ id: Number(e.id), k, at: e.at, need, un: e.is_read ? 0 : 1, m: noticeText(e), r: e.record || "", ref: /^APP-/.test(ref) ? ref : "", user: e.kind === "login" ? e.record.replace("User: ", "") : "",
      d: [e.actor === "CALMS" ? "CALMS" : e.actor === "Unknown" ? "" : "By " + e.actor, clip(said(safe(e.after), 0, true), 160)].filter(Boolean).join(". "),
      waitedH: need && w ? Math.round((Date.now() - new Date(w.status_since)) / 3600e3) : 0 });
    if (out.length >= 60) break;
  }
  return out;
}
router.get("/notifications", wrap(async (req, res) => res.json({ notices: await notices(req.user) })));
router.post("/notifications/read", wrap(async (req, res) => {
  if (req.body.all) {
    const ids = (await notices(req.user)).filter((n) => n.un).map((n) => n.id);
    if (ids.length) await db.query("insert into notification_reads (user_id, audit_id) select $1, unnest($2::bigint[]) on conflict do nothing", [req.user.id, ids]);
    return res.json({ marked: ids.length });
  }
  const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).map(Number).filter(Number.isInteger).slice(0, 200);
  if (req.body.read === false) await db.query("delete from notification_reads where user_id = $1 and audit_id = any($2::bigint[])", [req.user.id, ids]);
  else await db.query("insert into notification_reads (user_id, audit_id) select $1, id from audit_log where id = any($2::bigint[]) on conflict do nothing", [req.user.id, ids]);
  res.json({ ok: true });
}));

module.exports = router;
module.exports.DEFAULT_PREFS = DEFAULT_PREFS;
module.exports.notices = notices;
