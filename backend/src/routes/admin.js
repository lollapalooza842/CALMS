// Administration: Users and roles, Products and rules, System (health, jobs, message templates).
//   GET   /api/users                                   everyone with an account, for the System Administrator
//   POST  /api/users                                   add a person (a one-time password is shown once)
//   PATCH /api/users/:username                         role, approval limit, second factor
//   POST  /api/users/:username/unlock | reactivate | deactivate | reset-password
//   GET   /api/products-rules                          the products, the rule set in force and its history
//   POST  /api/rule-sets                               publish a new version (with a reason)
//   GET   /api/system/health                           ring each service now and show the last 24 hours
//   POST  /api/system/jobs/:id                         run a job now
//   GET   /api/templates   PUT /api/templates/:id      the wording of the messages CALMS sends
// Every change is written to the audit log under the kind "config". Accounts are never deleted (FR-115).
const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const db = require("../db");
const audit = require("../lib/audit");
const auth = require("../lib/auth");
const intake = require("../lib/intake");
const loans = require("../lib/loans");
const finscore = require("../lib/finscore");
const settings = require("../lib/settings");
const mail = require("../lib/mail");
const outbox = require("../lib/outbox");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const ADMIN = auth.allow("system_administrator");
const LIMIT_ROLES = ["underwriter", "lead_underwriter"];
const bad = (res, msg, fields) => res.status(400).json({ error: msg, fields });
const peso = (n) => "₱ " + Number(n).toLocaleString("en-PH");
const text = (v, max = 200) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, max);
const roleKey = (v) => { v = String(v || ""); if (auth.ROLE_NAMES[v]) return v; return Object.keys(auth.ROLE_NAMES).find((k) => auth.ROLE_NAMES[k] === v) || null; };

// A one-time password that meets the password rules: 12+ characters, four kinds of character.
function tempPassword() {
  const L = "abcdefghjkmnpqrstuvwxyz", U = "ABCDEFGHJKMNPQRSTUVWXYZ", D = "23456789", b = crypto.randomBytes(12);
  let s = ""; for (let i = 0; i < 6; i++) s += L[b[i] % L.length];
  return "Gr8-" + s + "-" + D[b[6] % 8] + D[b[7] % 8] + U[b[8] % U.length] + U[b[9] % U.length];
}

// The administrator may type the password instead of letting CALMS make one. It must meet the same
// rules as one a person chooses: 12+ characters, three kinds, not the username.
function chosenPassword(body, username, fields) {
  const p = body.password == null ? "" : String(body.password);
  if (!p) return null;
  if (p.length < 12) fields.pw = "Use at least 12 characters.";
  else if ([/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length < 3) fields.pw = "Use at least three of: small letters, capital letters, numbers, symbols.";
  else if (p.length > 200) fields.pw = "That password is too long.";
  else if (username && p.toLowerCase().includes(username.toLowerCase())) fields.pw = "The password must not contain the username.";
  return p;
}

// ===================================================================== Users and roles
async function lockNote(u) {
  if (!u.locked_at) return "";
  const e = (await db.query("select at, ip, after from audit_log where record = $1 and action like '%locked%' order by id desc limit 1", ["User: " + u.username])).rows[0];
  const at = new Date(u.locked_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return `Locked after ${e && e.after && /code/.test(e.after.reason || "") ? "five wrong codes" : "five wrong passwords"} in a row on ${at}${e && e.ip ? ", from " + e.ip : ""}. A locked account stays locked until an administrator unlocks it.`;
}
async function userRow(u) {
  return { username: u.username, name: u.full_name, email: u.email, role: u.role, roleName: auth.ROLE_NAMES[u.role],
    limit: u.approval_limit ? Number(u.approval_limit) : 0, mfa: auth.MFA_ROLES.includes(u.role) || u.mfa_enabled,
    status: !u.is_active ? "off" : u.locked_at ? "lock" : "on", lockNote: await lockNote(u),
    deactivated: u.is_active ? null : { at: u.deactivated_at, reason: u.deactivated_reason || "" } };
}
async function findUser(username) { return (await db.query("select * from users where username = $1", [String(username || "").toLowerCase()])).rows[0]; }
const activeAdmins = async () => Number((await db.query("select count(*) n from users where role = 'system_administrator' and is_active")).rows[0].n);

function limitOf(role, v, fields) {
  if (!LIMIT_ROLES.includes(role)) return null;
  const t = String(v == null ? "" : v).replace(/[,₱\s]/g, "");
  if (!t) fields.limit = "Enter the largest loan this person may approve.";
  else if (!/^\d+$/.test(t)) fields.limit = "Use digits only, like 300000.";
  else if (+t < 10000 || +t > 1000000) fields.limit = "The limit must be between ₱ 10,000 and ₱ 1,000,000.";
  return +t;
}

router.get("/users", ADMIN, wrap(async (req, res) => {
  const { rows } = await db.query("select * from users order by is_active desc, full_name");
  res.json({ users: await Promise.all(rows.map(userRow)), me: req.user.username, mfaRoles: auth.MFA_ROLES, roles: auth.ROLE_NAMES });
}));

router.post("/users", ADMIN, wrap(async (req, res) => {
  const fields = {}, name = text(req.body.name, 80), email = text(req.body.email, 120).toLowerCase(), role = roleKey(req.body.role);
  if (name.length < 3 || !/\s/.test(name)) fields.nm = "Enter their full name, first and last.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fields.email = email ? "That does not look like an email address. Example: name@gr8lending.example" : "Enter their work email.";
  const username = email.split("@")[0];
  if (!fields.email && !/^[a-z0-9._-]{3,40}$/.test(username)) fields.email = "The part before @ becomes the username: use 3 to 40 letters, numbers, dots or dashes.";
  if (!role) fields.role = "Choose a role.";
  const limit = role ? limitOf(role, req.body.limit, fields) : null;
  if (!fields.email && (await db.query("select 1 from users where username = $1 or email = $2", [username, email])).rows.length) fields.email = "Someone already has that email or username.";
  const chosen = chosenPassword(req.body, username, fields), mustChange = chosen ? req.body.mustChange !== false : true;
  if (Object.keys(fields).length) return bad(res, "Some entries need fixing.", fields);
  const pw = chosen || tempPassword(), hash = await bcrypt.hash(pw, 10), parts = name.split(" ");
  const short = parts[0][0].toUpperCase() + ". " + parts[parts.length - 1];
  const mfa = !auth.MFA_ROLES.includes(role) && !!req.body.mfa;
  await db.transaction(async (tx) => {
    await tx.query(`insert into users (username, full_name, short_name, email, role, approval_limit, password_hash, mfa_enabled, mfa_secret, must_change_password)
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [username, name, short, email, role, limit, hash, mfa, require("../lib/totp").newSecret(), mustChange]);
    await audit.write({ user: req.user, kind: "config", action: "Added a user account", record: "User: " + username,
      after: { name, role: auth.ROLE_NAMES[role], limit: limit ? peso(limit) : null, secondFactor: mfa || auth.MFA_ROLES.includes(role),
        password: chosen ? "typed by the administrator" + (mustChange ? "; to be changed at first sign-in" : "") : "one-time, made by CALMS" }, ip: req.ip }, tx);
  });
  // A password the administrator typed is never sent back; one CALMS made is shown once.
  res.status(201).json({ user: await userRow(await findUser(username)), tempPassword: chosen ? null : pw, passwordSet: !!chosen, mustChange });
}));

router.patch("/users/:username", ADMIN, wrap(async (req, res) => {
  const u = await findUser(req.params.username); if (!u) return res.status(404).json({ error: "No such user." });
  if (!u.is_active) return res.status(409).json({ error: "Reactivate the account before changing it." });
  const role = roleKey(req.body.role) || u.role, fields = {};
  if (role !== u.role && u.id === req.user.id) return res.status(403).json({ error: "You cannot change your own role. Another administrator has to." });
  if (role !== u.role && u.role === "system_administrator" && (await activeAdmins()) <= 1) return res.status(409).json({ error: "This is the only active System Administrator. Make someone else an administrator first." });
  const limit = limitOf(role, req.body.limit != null ? req.body.limit : u.approval_limit, fields);
  if (Object.keys(fields).length) return bad(res, fields.limit, fields);
  const mfa = auth.MFA_ROLES.includes(role) ? u.mfa_enabled : !!req.body.mfa;
  // A work email can be corrected here (needed for notices by email; the sample accounts use made-up addresses).
  const email = req.body.email == null ? u.email : text(req.body.email, 120).toLowerCase();
  if (email !== u.email) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad(res, "That does not look like an email address.", { email: "That does not look like an email address." });
    if ((await db.query("select 1 from users where email = $1 and id <> $2", [email, u.id])).rows.length) return bad(res, "Someone else already has that email.", { email: "Someone else already has that email." });
  }
  const before = { role: auth.ROLE_NAMES[u.role], limit: u.approval_limit ? peso(u.approval_limit) : "none", secondFactor: auth.MFA_ROLES.includes(u.role) || u.mfa_enabled ? "on" : "off", email: u.email };
  const after = { role: auth.ROLE_NAMES[role], limit: limit ? peso(limit) : "none", secondFactor: auth.MFA_ROLES.includes(role) || mfa ? "on" : "off", email };
  const changed = Object.keys(before).filter((k) => before[k] !== after[k]);
  if (!changed.length) return res.json({ user: await userRow(u), changed: [] });
  const what = changed.length === 1 ? { role: "Changed a role", limit: "Changed an approval limit", secondFactor: "Changed the second-factor setting", email: "Changed a work email" }[changed[0]] : "Changed a user's access";
  await db.transaction(async (tx) => {
    // A new role means new keys: end their sessions so the next request carries the new role from sign-in.
    await tx.query("update users set role = $2, approval_limit = $3, mfa_enabled = $4, email = $6, session_version = session_version + case when $5 then 1 else 0 end where id = $1",
      [u.id, role, limit, mfa, role !== u.role, email]);
    await audit.write({ user: req.user, kind: "config", action: what, record: "User: " + u.username,
      before: Object.fromEntries(changed.map((k) => [k, before[k]])), after: Object.fromEntries(changed.map((k) => [k, after[k]])), ip: req.ip }, tx);
  });
  res.json({ user: await userRow(await findUser(u.username)), changed });
}));

router.post("/users/:username/:act(unlock|reactivate|deactivate|reset-password)", ADMIN, wrap(async (req, res) => {
  const u = await findUser(req.params.username); if (!u) return res.status(404).json({ error: "No such user." });
  const act = req.params.act, rec = "User: " + u.username;
  if (u.id === req.user.id && act !== "unlock") return res.status(403).json({ error: "You cannot do that to your own account. Use My profile, or ask another administrator." });
  let pw = null;
  if (act === "unlock") {
    if (!u.locked_at) return res.status(409).json({ error: "That account is not locked." });
    await db.transaction(async (tx) => {
      await tx.query("update users set locked_at = null, failed_attempts = 0 where id = $1", [u.id]);
      await audit.write({ user: req.user, kind: "config", action: "Unlocked a user account", record: rec, before: { status: "Locked" }, after: { status: "Active" }, ip: req.ip }, tx);
    });
  } else if (act === "reactivate") {
    if (u.is_active) return res.status(409).json({ error: "That account is already active." });
    await db.transaction(async (tx) => {
      await tx.query("update users set is_active = true, locked_at = null, failed_attempts = 0, deactivated_at = null, deactivated_reason = null where id = $1", [u.id]);
      await audit.write({ user: req.user, kind: "config", action: "Reactivated a user account", record: rec, before: { status: "Deactivated" }, after: { status: "Active" }, ip: req.ip }, tx);
    });
  } else if (act === "deactivate") {
    const reason = text(req.body.reason, 120);
    if (!reason) return bad(res, "Choose a reason. It goes in the audit log.", { why: "Choose a reason. It goes in the audit log." });
    if (!u.is_active) return res.status(409).json({ error: "That account is already deactivated." });
    if (u.role === "system_administrator" && (await activeAdmins()) <= 1) return res.status(409).json({ error: "This is the only active System Administrator." });
    await db.transaction(async (tx) => {
      await tx.query("update users set is_active = false, deactivated_at = now(), deactivated_reason = $2, session_version = session_version + 1 where id = $1", [u.id, reason]);
      await audit.write({ user: req.user, kind: "config", action: "Deactivated a user account", record: rec, before: { status: "Active" }, after: { status: "Deactivated", reason, note: "Past actions stay on record" }, ip: req.ip }, tx);
    });
  } else {
    if (!u.is_active) return res.status(409).json({ error: "Reactivate the account first." });
    const fields = {}, chosen = chosenPassword(req.body || {}, u.username, fields), mustChange = chosen ? (req.body || {}).mustChange !== false : true;
    if (Object.keys(fields).length) return bad(res, fields.pw, fields);
    pw = chosen || tempPassword();
    const hash = await bcrypt.hash(pw, 10);
    await db.transaction(async (tx) => {
      await tx.query("insert into password_history (user_id, hash) values ($1, $2)", [u.id, u.password_hash]);
      await tx.query("update users set password_hash = $2, must_change_password = $3, password_changed_at = now(), session_version = session_version + 1, locked_at = null, failed_attempts = 0 where id = $1", [u.id, hash, mustChange]);
      await audit.write({ user: req.user, kind: "config", action: "Reset a user's password", record: rec,
        after: { note: (chosen ? "New password typed by the administrator" + (mustChange ? ", to be changed at first sign-in" : "") : "One-time password given to the user") + "; every session ended" }, ip: req.ip }, tx);
    });
    if (chosen) { pw = null; return res.json({ user: await userRow(await findUser(u.username)), tempPassword: null, passwordSet: true, mustChange }); }
  }
  res.json({ user: await userRow(await findUser(u.username)), tempPassword: pw });
}));

// ===================================================================== Products and rules
const METHOD = { diminishing: "Diminishing balance", flat: "Flat (add-on)" };
const pc = (n) => Math.round(Number(n) * 100000) / 1000; // 0.015 -> 1.5

async function rulesView(user) {
  const [rs, prods, hist, samp] = await Promise.all([
    db.query("select * from rule_sets where is_active order by version desc limit 1"),
    db.query("select * from loan_products order by min_amount desc"),
    db.query("select r.version, r.created_at, r.reason, r.changes, u.full_name from rule_sets r left join users u on u.id = r.created_by order by r.version desc limit 12"),
    db.query(`select distinct on (a.application_id) b.full_name, p.name product, a.dti, a.ltv, a.score from assessments a
      join applications x on x.id = a.application_id join borrowers b on b.id = x.borrower_id join loan_products p on p.id = x.product_id
      where a.dti is not null and a.score is not null order by a.application_id, a.id desc limit 6`),
  ]);
  const cur = rs.rows[0], P = cur.policy, s = await settings.load(true);
  const products = await Promise.all(prods.rows.map(async (p) => ({ name: p.name, min: Number(p.min_amount), max: Number(p.max_amount), terms: p.terms_months,
    rate: pc(p.monthly_rate), method: METHOD[p.interest_method], fee: pc(p.processing_fee), pen: pc(p.late_penalty),
    docs: (await intake.checklistFor(intake.kindOf(p.name))).map(([slot]) => slot).filter((x) => x !== "consent") })));
  return {
    version: cur.version, policy: P, canEdit: user.role === "system_administrator",
    rule: { dtiA: P.dtiAuto, dtiM: P.dtiMax, ltvA: P.ltvAuto, ltvM: P.ltvMax, fsMin: P.fsMin, fsA: P.fsAuto },
    house: { esc: Number(s.escalation_hours), idle: Number(s.idle_minutes) },
    products, catalog: intake.DOC_CATALOG,
    history: hist.rows.map((h) => ({ version: h.version, inForce: h.version === cur.version, at: h.created_at, by: h.full_name || "CALMS (first set-up)", reason: h.reason || "The rules CALMS started with.", changes: h.changes || [] })),
    samples: samp.rows.map((r) => ({ label: r.full_name + ", " + r.product, dti: Number(r.dti), ltv: r.ltv == null ? 0 : Number(r.ltv), score: r.score })),
  };
}

router.get("/products-rules", auth.allow("system_administrator", "operations_manager", "compliance_auditor"), wrap(async (req, res) => res.json(await rulesView(req.user))));

router.post("/rule-sets", ADMIN, wrap(async (req, res) => {
  const b = req.body || {}, reason = text(b.reason, 500), errs = [];
  const num = (v) => { const t = String(v == null ? "" : v).replace(/[,\s%]/g, ""); return /^\d+(\.\d+)?$/.test(t) ? +t : NaN; };
  if (reason.length < 10) return bad(res, "Give a reason of at least 10 characters.", { why: "Give a reason of at least 10 characters." });
  const r = b.rule || {}, h = b.house || {};
  const R = { dtiA: num(r.dtiA), dtiM: num(r.dtiM), ltvA: num(r.ltvA), ltvM: num(r.ltvM), fsMin: num(r.fsMin), fsA: num(r.fsA) };
  if (!(R.dtiM <= 70) || !(R.dtiA >= 0 && R.dtiA <= R.dtiM)) errs.push("debt to income lines");
  if (!(R.ltvM <= 100) || !(R.ltvA >= 0 && R.ltvA <= R.ltvM)) errs.push("loan to value lines");
  if (!(R.fsMin >= 300 && R.fsMin <= 850) || !(R.fsA >= R.fsMin && R.fsA <= 850)) errs.push("FinScore lines");
  const esc = num(h.esc), idle = num(h.idle);
  if (!(esc >= 12 && esc <= 168)) errs.push("escalation hours"); if (!(idle >= 5 && idle <= 60)) errs.push("sign-out minutes");
  const prods = (await db.query("select * from loan_products")).rows, upd = [];
  const known = Object.fromEntries(intake.DOC_CATALOG);
  for (const p of prods) {
    const x = (b.products || {})[p.name]; if (!x) continue;
    const terms = String(Array.isArray(x.terms) ? x.terms.join(",") : x.terms || "").split(",").map((t) => Number(t.trim())).filter((t) => t);
    const v = { min: num(x.min), max: num(x.max), rate: num(x.rate), fee: num(x.fee), pen: num(x.pen), method: /flat/i.test(x.method) ? "flat" : "diminishing" };
    if (!(v.min >= 1000) || !(v.max > v.min && v.max <= 5000000) || !terms.length || terms.some((t) => !Number.isInteger(t) || t > 99) ||
      !(v.rate > 0 && v.rate <= 5) || !(v.fee >= 0 && v.fee <= 10) || !(v.pen >= 0 && v.pen <= 10)) { errs.push(p.name); continue; }
    const kind = intake.kindOf(p.name), had = await intake.checklistFor(kind), labelOf = Object.fromEntries(had);
    const slots = (Array.isArray(x.docs) ? x.docs : []).filter((s) => known[s]);
    if (!slots.includes("id")) { errs.push(p.name + " (a government ID is always needed)"); continue; }
    const docs = [["consent", "Signed consent form"]].concat(intake.DOC_CATALOG.filter(([s]) => slots.includes(s)).map(([s, l]) => [s, labelOf[s] || l]));
    upd.push([p.id, v, [...new Set(terms)].sort((a, c) => a - c), docs]);
  }
  if (errs.length) return bad(res, "Some numbers are not valid: " + errs.join(", ") + ".");
  const cur = (await db.query("select * from rule_sets where is_active order by version desc limit 1")).rows[0], P = { ...cur.policy };
  Object.assign(P, { dtiAuto: R.dtiA, dtiMax: R.dtiM, ltvAuto: R.ltvA, ltvMax: R.ltvM, fsMin: R.fsMin, fsAuto: R.fsA });
  // The lines the screen does not show are kept in step: the soft line sits between the two DTI lines,
  // and the outright-decline lines are never inside the review band.
  if (!(P.dtiSoft >= P.dtiAuto && P.dtiSoft <= P.dtiMax)) P.dtiSoft = Math.round((P.dtiAuto + P.dtiMax) / 2);
  if (!(P.dtiDecline >= P.dtiMax)) P.dtiDecline = P.dtiMax + 10;
  if (!(P.fsDecline <= P.fsMin)) P.fsDecline = P.fsMin;
  const changes = (Array.isArray(b.changes) ? b.changes : []).slice(0, 60).map((c) => text(c, 200)).filter(Boolean);
  const version = await db.transaction(async (tx) => {
    const v = Number((await tx.query("select max(version) m from rule_sets")).rows[0].m) + 1;
    await tx.query("update rule_sets set is_active = false where is_active");
    await tx.query("insert into rule_sets (version, policy, is_active, created_by, reason, changes) values ($1, $2, true, $3, $4, $5)", [v, P, req.user.id, reason, JSON.stringify(changes)]);
    for (const [id, v2, terms, docs] of upd) {
      await tx.query(`update loan_products set min_amount = $2, max_amount = $3, terms_months = $4, monthly_rate = $5, interest_method = $6, processing_fee = $7, late_penalty = $8, required_docs = $9 where id = $1`,
        [id, v2.min, v2.max, terms, v2.rate / 100, v2.method, v2.fee / 100, v2.pen / 100, JSON.stringify(docs)]);
    }
    await settings.save("escalation_hours", esc, req.user, tx);
    await settings.save("idle_minutes", idle, req.user, tx);
    await audit.write({ user: req.user, kind: "config", action: `Published rule set version ${v}`, record: "Rule set",
      before: { version: cur.version }, after: { version: v, reason, changes }, ip: req.ip }, tx);
    return v;
  });
  await settings.load(true);
  res.status(201).json({ version, view: await rulesView(req.user) });
}));

// ===================================================================== System
const SERVICES = [
  { id: "db", nm: "Database (Supabase)", does: "Keeps every record: applications, papers, loan accounts and the audit log.", fall: "If it stops answering, CALMS shows a message and nothing is saved until it is back. Nothing is lost." },
  { id: "seal", nm: "Audit log seals", does: "Each audit entry carries a seal made from the one before it.", fall: "If a seal is broken, someone changed the database by hand. Tell the Compliance Auditor at once." },
  { id: "bureau", nm: "FinScore credit bureau", does: "Fetches credit reports and scores. In this project it is a stand-in that gives the same report for the same borrower.", fall: "If it stops answering, CALMS retries three times, then the underwriter can send the application to manual review." },
  { id: "files", nm: "Document storage", does: "Holds the scanned papers, inside the database. Each file is checked to be what it says it is.", fall: "If storage is full, filing a paper is refused with a message; nothing already filed is touched." },
  { id: "email", nm: "Email", does: "Would send notices to borrowers and staff.", fall: "Not connected in this project. Notices show inside CALMS; borrowers are told by their sales agent." },
  { id: "sms", nm: "SMS gateway", does: "Would send text notices to borrowers and staff.", fall: "Not connected in this project. Notices show inside CALMS; borrowers are told by their sales agent." },
];
async function ring(id) {
  const t0 = Date.now();
  try {
    if (id === "db") { await db.query("select 1"); const ms = Date.now() - t0; return { st: ms > 2000 ? "slow" : "ok", ms }; }
    if (id === "seal") { const broken = await audit.verify(), n = (await db.query("select count(*) n from audit_log")).rows[0].n; return { st: broken === null ? "ok" : "down", ms: Date.now() - t0, detail: broken === null ? `All ${Number(n).toLocaleString("en-PH")} entries still match.` + ((await audit.acknowledged()).length ? ` ${(await audit.acknowledged()).length} older entries written out of order are acknowledged on the record.` : "") : `Entry ${broken} does not match the one before it. On the server, run npm run audit:check to see why.` }; }
    if (id === "bureau") { finscore.report({ name: "Health check", idNumber: "000" }, 1000); return { st: "ok", ms: Date.now() - t0 }; }
    if (id === "files") { const r = (await db.query("select count(*) n, coalesce(sum(size_bytes), 0) b from documents")).rows[0]; return { st: "ok", ms: Date.now() - t0, detail: `${r.n} files, ${(Number(r.b) / 1048576).toFixed(1)} MB in all.` }; }
    if (id === "email") {
      if (!mail.configured()) return { st: "off", ms: 0, detail: "Not connected." };
      const c = await mail.check(), q = await outbox.counts();
      return { ...c, detail: c.detail || `Sending as ${mail.account()}. Last 24 hours: ${q.sent} sent. Waiting: ${q.waiting}. Failed this week: ${q.failed}${q.failed && q.err ? " (" + q.err + ")" : ""}.` };
    }
    return { st: "off", ms: 0, detail: "Not connected." };
  } catch (e) { return { st: "down", ms: Date.now() - t0, detail: e.message.slice(0, 120) }; }
}
async function jobsView() {
  const s = await settings.load(), today = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
  const accts = (await db.query("select a.id, p.late_penalty from loan_accounts a join applications x on x.id = a.application_id join loan_products p on p.id = x.product_id where a.closed_on is null")).rows;
  let late = 0;
  for (const a of accts) { const st = loans.standing((await db.query("select * from installments where account_id = $1 order by n", [a.id])).rows, today, Number(a.late_penalty)); if (st.daysPastDue > 0) late++; }
  const idle = Number((await db.query("select count(*) n from applications where status in ('submitted','review','approved','accepted') and status_since < now() - make_interval(hours => $1)", [Number(s.escalation_hours)])).rows[0].n);
  const last = async (a) => { const r = (await db.query("select at, after from audit_log where kind = 'config' and action = $1 order by id desc limit 1", [a])).rows[0]; return r ? new Date(r.at).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + ": " + ((r.after && r.after.result) || "done") : "Not run yet"; };
  return [
    { id: "seal", nm: "Check the audit seals", when: "Whenever someone asks", last: await last("Ran a job: Check the audit seals") },
    { id: "late", nm: "Past-due flags", when: "Worked out each time an account is opened", last: late + (late === 1 ? " account is" : " accounts are") + " late today" },
    { id: "esc", nm: "Applications waiting too long", when: `Over ${s.escalation_hours} hours at one step`, last: idle + (idle === 1 ? " application is" : " applications are") + " over the line now" },
    { id: "mail", nm: "Send waiting emails", when: mail.configured() ? "Every minute" : "Email is not connected", last: mail.configured() ? (await outbox.counts()).waiting + " waiting" : "Nothing to send" },
    { id: "backup", nm: "Nightly backup", when: "Every night, by Supabase", last: "Managed by Supabase; see its dashboard" },
  ];
}
router.get("/system/health", ADMIN, wrap(async (req, res) => {
  const MAIL_ON = { does: "Sends notices to staff (by their choices on My profile) and messages to borrowers (System > Messages), through " + (process.env.SMTP_HOST || "Gmail") + ".",
    fall: "Every email waits in the outbox first. A failed one is tried again every 15 minutes, three times in all; nothing is lost, and the notice still shows inside CALMS." };
  const MAIL_OFF = { does: "Would send notices to staff and messages to borrowers.", fall: "Not connected. To connect it, add SMTP_USER and SMTP_PASS (a Gmail app password) to backend/.env and restart CALMS. Until then notices show inside CALMS only." };
  const results = await Promise.all(SERVICES.map(async (s) => ({ ...s, ...(s.id === "email" ? (mail.configured() ? MAIL_ON : MAIL_OFF) : {}), ...(await ring(s.id)) })));
  const lastSaved = (await db.query("select max(checked_at) m from health_checks")).rows[0].m;
  // Keep a history without flooding it: one row per service at most every five minutes.
  if (!lastSaved || Date.now() - new Date(lastSaved) > 300000 || req.query.save === "1")
    for (const r of results) await db.query("insert into health_checks (service, status, took_ms, detail) values ($1, $2, $3, $4)", [r.id, r.st, r.ms, r.detail || null]);
  const hist = (await db.query(`select service, floor(extract(epoch from (now() - checked_at)) / 3600)::int h, status from health_checks where checked_at > now() - interval '24 hours'`)).rows;
  const RANK = { ok: 1, off: 1, slow: 2, down: 3 };
  const problems = (await db.query(`select distinct on (service) service, status, detail, checked_at from health_checks where status in ('slow','down') and checked_at > now() - interval '7 days' order by service, checked_at desc`)).rows;
  res.json({
    services: results.map((r) => {
      const strip = Array(24).fill(""); hist.filter((x) => x.service === r.id && x.h < 24).forEach((x) => { const i = 23 - x.h; if (!strip[i] || RANK[x.status] > RANK[strip[i]]) strip[i] = x.status; });
      const p = problems.find((x) => x.service === r.id);
      return { id: r.id, nm: r.nm, does: r.does, fall: r.fall, st: r.st, ms: r.ms, detail: r.detail || "", strip,
        err: p ? `${p.status === "down" ? "Down" : "Slow"} on ${new Date(p.checked_at).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}${p.detail ? ": " + p.detail : ""}` : "" };
    }),
    jobs: await jobsView(),
    counts: (await db.query(`select (select count(*) from users where is_active) users, (select count(*) from applications) apps,
      (select count(*) from loan_accounts) accounts, (select count(*) from audit_log) audit`)).rows[0],
  });
}));
router.post("/system/jobs/:id", ADMIN, wrap(async (req, res) => {
  const id = req.params.id; let result;
  if (id === "seal") { const broken = await audit.verify(); result = broken === null ? "unbroken" : "broken at entry " + broken; }
  else if (id === "late" || id === "esc") { const j = (await jobsView()).find((x) => x.id === id); result = j.last; }
  else if (id === "mail") { if (!mail.configured()) return res.status(409).json({ error: "Email is not connected. Add SMTP_USER and SMTP_PASS to backend/.env and restart CALMS." }); await outbox.tick(); const n = await outbox.sendWaiting(); const q = await outbox.counts(); result = `${q.waiting} still waiting, ${q.sent} sent in the last 24 hours` + (n ? `, ${n} just now` : ""); }
  else if (id === "backup") return res.status(409).json({ error: "Backups are made by Supabase every night. Open the Supabase dashboard (Database > Backups) to see or start one." });
  else return res.status(404).json({ error: "No such job." });
  const nm = { seal: "Check the audit seals", late: "Past-due flags", esc: "Applications waiting too long", mail: "Send waiting emails" }[id];
  await audit.write({ user: req.user, kind: "config", action: "Ran a job: " + nm, record: "System", after: { result }, ip: req.ip });
  res.json({ result, jobs: await jobsView() });
}));

// ---- message templates ----
const BLANKS = ["first_name", "application_no", "account_no", "due_date", "agent_name", "branch_phone"];
const tView = (t) => ({ id: t.id, nm: t.name, to: t.audience, mand: t.mandatory ? 1 : 0, email: t.by_email ? 1 : 0, sms: t.by_sms ? 1 : 0, app: t.by_app ? 1 : 0, sub: t.subject, sms_t: t.body });
function templateError(body) {
  const low = body.toLowerCase();
  if (["{amount}", "{balance}", "{finscore}", "{income}"].some((x) => low.includes(x)) || /₱|php\s*\d/i.test(body)) return "Amounts, balances and credit details cannot go in a text or email. Tell them to call or ask their agent instead.";
  if (body.trim().length < 20) return "Write the message, at least 20 characters.";
  const un = (body.match(/\{\w+\}/g) || []).find((m) => !BLANKS.includes(m.slice(1, -1)));
  if (un) return un + " is not a blank CALMS can fill in.";
  return "";
}
router.get("/templates", ADMIN, wrap(async (req, res) => res.json({ templates: (await db.query("select * from message_templates order by sort")).rows.map(tView) })));
router.put("/templates/:id", ADMIN, wrap(async (req, res) => {
  const t = (await db.query("select * from message_templates where id = $1", [req.params.id])).rows[0]; if (!t) return res.status(404).json({ error: "No such message." });
  const b = req.body || {}, body = String(b.sms_t || "").trim().slice(0, 1000), sub = text(b.sub, 160), e = templateError(body);
  if (e) return bad(res, e); if (!sub) return bad(res, "Write the email subject.");
  const email = !!b.email, sms = !!b.sms, app = t.audience === "Staff" && !!b.app;
  if (!email && !sms && !app) return bad(res, "Choose at least one way to send it.");
  await db.transaction(async (tx) => {
    await tx.query("update message_templates set by_email = $2, by_sms = $3, by_app = $4, subject = $5, body = $6, updated_by = $7, updated_at = now() where id = $1", [t.id, email, sms, app, sub, body, req.user.id]);
    await audit.write({ user: req.user, kind: "config", action: "Changed a message template", record: "Message: " + t.name,
      before: { subject: t.subject, message: t.body, by: [t.by_email && "email", t.by_sms && "text", t.by_app && "CALMS"].filter(Boolean).join(", ") },
      after: { subject: sub, message: body, by: [email && "email", sms && "text", app && "CALMS"].filter(Boolean).join(", ") }, ip: req.ip }, tx);
  });
  res.json({ template: tView((await db.query("select * from message_templates where id = $1", [t.id])).rows[0]) });
}));

// Send one message, filled with sample details, to check the wording and that email works.
router.post("/templates/:id/test", ADMIN, wrap(async (req, res) => {
  if (!mail.configured()) return res.status(409).json({ error: "Email is not connected. Add SMTP_USER and SMTP_PASS to backend/.env and restart CALMS." });
  const t = (await db.query("select * from message_templates where id = $1", [req.params.id])).rows[0]; if (!t) return res.status(404).json({ error: "No such message." });
  const to = text(req.body.to, 120) || mail.account();
  if (!mail.deliverable(to)) return bad(res, "That email address cannot receive mail.");
  const co = (await settings.load()).company || {};
  const S = { first_name: "Norma", application_no: "APP-2026-0409", account_no: "LN-2026-0163", due_date: "November 7", agent_name: "Jun Espiritu", branch_phone: co.phone || "(044) 555 0142" };
  const subject = "[Test] " + outbox.fill(String(req.body.sub || t.subject), S), body = outbox.fill(String(req.body.sms_t || t.body), S) + "\n\nThis is a test from CALMS (System > Messages), with sample details filled in.";
  try { await mail.send(to, subject, body); } catch (e) { return res.status(502).json({ error: "Not sent. " + e.message }); }
  await audit.write({ user: req.user, kind: "config", action: "Sent a test of a message template", record: "Message: " + t.name, after: { to }, ip: req.ip });
  res.json({ to });
}));

module.exports = router;
