// The Website screen (pages/website.html): everything customers do on the public website, in front of GR8 staff.
//   GET  /api/website                               counts and lists: online applications, call-back requests, My GR8
//                                                   requests (offer answers, papers, payments), live chats waiting
//   GET  /api/website/applications/:ref             one online application in full, with its papers
//   GET  /api/website/applications/:ref/files/:id   one of its papers (opens in the browser)
//   POST /api/website/applications/:ref/called      "I called the borrower"
//   POST /api/website/applications/:ref/encode      turns it into a CALMS application (status Submitted, papers filed),
//                                                   the same records New application makes; loan processors only
//   POST /api/website/applications/:ref/close       not going ahead (a note says why)
//   POST /api/website/callbacks/:id                 { status: called | done, note }
//   GET  /api/website/requests/:id/file             the paper a borrower sent from My GR8
//   POST /api/website/requests/:id/file-it          files that paper on the application (a new version, audited)
//   POST /api/website/requests/:id/done             { note } the offer answer was recorded / the payment was posted
//   POST /api/website/requests/:id/dismiss          { note } not acted on (the borrower sees the note)
// count(user) gives the number for the side rail's Website drawer.
const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("../db");
const audit = require("../lib/audit");
const intake = require("../lib/intake");
const { allow } = require("../lib/auth");

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const SQL = (f) => fs.readFileSync(path.join(__dirname, "..", "..", "sql", f), "utf8");
let ready = null;   // the website's tables, made the first time they are needed, in order
function ensure() { if (!ready) ready = (async () => { for (const f of ["011_talk.sql", "012_web_apply.sql", "014_live.sql", "015_website.sql"]) await db.query(SQL(f)); })().catch((e) => { ready = null; throw e; }); return ready; }

const STAFF = ["sales_agent", "loan_processor", "loan_account_officer", "operations_manager", "system_administrator"];
const SEES = { sales_agent: ["apps", "calls", "chats"], loan_processor: ["apps", "calls", "offer", "paper", "chats"], loan_account_officer: ["payment", "calls", "chats"],
  operations_manager: ["apps", "calls", "offer", "paper", "payment", "chats"], system_administrator: ["apps", "calls", "offer", "paper", "payment", "chats"] };
const clean = (v, n) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n) : "");

async function count(user) {
  const s = SEES[user.role]; if (!s) return 0;
  await ensure();
  const kinds = ["offer", "paper", "payment"].filter((k) => s.includes(k));
  const r = (await db.query(`select
      (select count(*)::int from web_applications where status = 'received') apps,
      (select count(*)::int from talk_requests where status = 'new') calls,
      (select count(*)::int from web_requests where status = 'new' and kind = any($1)) reqs,
      (select count(*)::int from live_chats where status = 'waiting') chats`, [kinds])).rows[0];
  return (s.includes("apps") ? r.apps : 0) + (s.includes("calls") ? r.calls : 0) + r.reqs + (s.includes("chats") ? r.chats : 0);
}

// the online applications nobody has encoded or closed yet (for the loan processor's My Queue, routes/queues.js)
async function waiting() { await ensure(); return (await db.query("select reference, product, amount, term_months, full_name, status, staff_note, created_at from web_applications where status in ('received', 'called') order by created_at")).rows; }

const router = express.Router();
router.use(allow(...STAFF));
router.use(wrap(async (req, res, next) => { await ensure(); next(); }));

router.get("/", wrap(async (req, res) => {
  const s = SEES[req.user.role], kinds = ["offer", "paper", "payment"].filter((k) => s.includes(k));
  const [apps, calls, reqs, chats] = await Promise.all([
    s.includes("apps") ? db.query(`select w.reference, w.product, w.amount, w.term_months, w.full_name, w.mobile, w.status, w.created_at, w.handled_at, w.staff_note, u.short_name handled_by, a.reference app_ref, a.status app_status, a.check_state app_check, (select l.number from loan_accounts l where l.application_id = a.id limit 1) account,
        (select count(*)::int from web_application_files f where f.web_application_id = w.id) papers
      from web_applications w left join users u on u.id = w.handled_by left join applications a on a.id = w.application_id
      where w.status in ('received', 'called') or w.created_at > now() - interval '30 days' order by (w.status = 'received') desc, w.created_at desc limit 100`) : { rows: [] },
    s.includes("calls") ? db.query(`select t.id, t.need, t.amount, t.months, t.name, t.mobile, t.email, t.reach, t.message, t.status, t.created_at, t.handled_at, t.staff_note, u.short_name handled_by
      from talk_requests t left join users u on u.id = t.handled_by where t.status <> 'done' or t.created_at > now() - interval '14 days' order by (t.status = 'new') desc, t.created_at desc limit 100`) : { rows: [] },
    kinds.length ? db.query(`select r.id, r.kind, r.borrower_name, r.mobile, r.details, r.status, r.created_at, r.handled_at, r.staff_note, u.short_name handled_by, a.reference app_ref, l.number account
      from web_requests r left join users u on u.id = r.handled_by left join applications a on a.id = r.application_id left join loan_accounts l on l.id = r.account_id
      where r.kind = any($1) and (r.status = 'new' or r.created_at > now() - interval '14 days') order by (r.status = 'new') desc, r.created_at desc limit 100`, [kinds]) : { rows: [] },
    s.includes("chats") ? db.query("select count(*) filter (where status = 'waiting')::int waiting, count(*) filter (where status = 'open')::int open from live_chats") : { rows: [{}] },
  ]);
  const mobile = (m) => { const d = String(m || "").replace(/\D/g, "").slice(-10); return d.length === 10 ? "0" + d.slice(0, 3) + " " + d.slice(3, 6) + " " + d.slice(6) : m; };
  res.json({ role: req.user.role, sees: s, canEncode: ["loan_processor"].includes(req.user.role), canFile: ["loan_processor", "operations_manager", "system_administrator"].includes(req.user.role),
    applications: apps.rows.map((w) => ({ reference: w.reference, product: w.product, amount: Number(w.amount), months: w.term_months, name: w.full_name, mobile: mobile(w.mobile), status: w.status, at: w.created_at, handledBy: w.handled_by, handledAt: w.handled_at, note: w.staff_note, appRef: w.app_ref, papers: w.papers, stage: stageOf(w), next: nextOf(w, req.user.role) })),
    callbacks: calls.rows.map((t) => ({ id: t.id, need: t.need, amount: t.amount, months: t.months, name: t.name, mobile: t.mobile ? mobile(t.mobile) : "", email: t.email, reach: t.reach, message: t.message, status: t.status, at: t.created_at, handledBy: t.handled_by, handledAt: t.handled_at, note: t.staff_note })),
    requests: reqs.rows.map((r) => ({ id: r.id, kind: r.kind, name: r.borrower_name, mobile: mobile(r.mobile), details: r.details, status: r.status, at: r.created_at, handledBy: r.handled_by, handledAt: r.handled_at, note: r.staff_note, appRef: r.app_ref, account: r.account })),
    chats: chats.rows[0] });
}));

// Where an online application is now, on the way from the website to a released loan: 0 received, 1 called, 2 in CALMS
// (encoded), 3 verified (with the underwriters), 4 decided, 5 agreement signed, 6 released. -1 closed or turned down.
function stageOf(w) {
  if (w.status === "closed") return -1; if (!w.app_ref) return w.status === "called" ? 1 : 0;
  return { draft: 2, submitted: 2, review: 3, approved: 4, awaiting: 4, declined: -1, rejected: -1, accepted: 5, funded: 6 }[w.app_status] ?? 2;
}
// What happens next, the screen it happens on, and whether this person can do it (the same roles the screens allow).
function nextOf(w, role) {
  const P = (does, page, who, can) => ({ does, page: page + (page.includes("?") ? "" : "?ref=" + w.app_ref), who, can: can.includes(role) });
  if (w.status === "closed") return null;
  if (!w.app_ref) return { does: w.status === "called" ? "Encode it in CALMS" : "Call the borrower, check the papers, then encode it", page: "", who: "A loan processor", can: role === "loan_processor" };
  switch (w.app_status) {
    case "draft": return P("Finish the papers and submit it", "documents", "The loan processor who encoded it", ["loan_processor"]);
    case "submitted": return w.app_check === "returned" ? P("Fix the entries the verifier returned", "encode-verify", "The loan processor who encoded it", ["loan_processor"])
      : P("Check the papers, then verify the entries (maker-checker)", "documents", "A different loan processor", ["loan_processor"]);
    case "review": return P("Run the credit assessment and decide", "credit-assessment", "An underwriter", ["underwriter", "lead_underwriter", "operations_manager"]);
    case "approved": return P("Draw up the agreement and get it signed", "loan-agreement", "A loan processor", ["loan_processor"]);
    case "awaiting": return P("Tell the borrower the counter-offer and record the answer", "record-answer", "The sales agent or a loan processor", ["sales_agent", "loan_processor"]);
    case "accepted": return P("Lock the signed agreement, then release the money", "loan-agreement", "A loan processor, then the disbursement officer", ["loan_processor"]);
    case "funded": return w.account ? { does: "Released. Follow the payments on the loan account", page: "loan-account.html?no=" + w.account, who: "The loan account officer", can: ["loan_account_officer", "operations_manager"].includes(role) } : null;
    default: return null;
  }
}

// ---- online applications ----
async function webApp(ref) { return (await db.query("select * from web_applications where reference = $1", [String(ref || "").toUpperCase()])).rows[0]; }
router.get("/applications/:ref", wrap(async (req, res) => {
  const w = await webApp(req.params.ref); if (!w) return res.status(404).json({ error: "No such online application." });
  const files = (await db.query("select id, slot, file_name, mime_type, size_bytes, created_at from web_application_files where web_application_id = $1 order by id", [w.id])).rows;
  const app = w.application_id ? (await db.query("select reference, status from applications where id = $1", [w.application_id])).rows[0] : null;
  await audit.write({ user: req.user, kind: "data", action: "Opened an online application", record: w.reference, ip: req.ip });
  res.json({ reference: w.reference, product: w.product, amount: Number(w.amount), months: w.term_months, purpose: w.purpose, name: w.full_name, birthDate: w.birth_date, idType: w.id_type, idNumber: w.id_number,
    mobile: w.mobile, email: w.email, address: w.address, details: w.details, consents: w.consents, signature: w.signature, status: w.status, at: w.created_at, note: w.staff_note, application: app,
    files: files.map((f) => ({ id: f.id, slot: f.slot, name: f.file_name, mime: f.mime_type, size: f.size_bytes })) });
}));
router.get("/applications/:ref/files/:id", wrap(async (req, res) => {
  const w = await webApp(req.params.ref); if (!w) return res.status(404).json({ error: "No such online application." });
  const f = (await db.query("select file_name, mime_type, bytes from web_application_files where id = $1 and web_application_id = $2", [Number(req.params.id) || 0, w.id])).rows[0];
  if (!f) return res.status(404).json({ error: "No such paper." });
  res.set("Content-Type", f.mime_type).set("Content-Disposition", `inline; filename="${f.file_name.replace(/"/g, "")}"`).set("Cache-Control", "private, no-store").send(f.bytes);
}));
router.post("/applications/:ref/called", wrap(async (req, res) => {
  const w = await webApp(req.params.ref); if (!w) return res.status(404).json({ error: "No such online application." });
  if (w.status !== "received") return res.status(409).json({ error: "This one was already handled." });
  const note = clean(req.body && req.body.note, 500);
  await db.query("update web_applications set status = 'called', handled_by = $2, handled_at = now(), staff_note = coalesce(nullif($3, ''), staff_note) where id = $1", [w.id, req.user.id, note]);
  await audit.write({ user: req.user, kind: "data", action: "Called the borrower about an online application", record: w.reference, after: note ? { note } : null, ip: req.ip });
  res.json({ ok: true });
}));
router.post("/applications/:ref/close", wrap(async (req, res) => {
  const w = await webApp(req.params.ref); if (!w) return res.status(404).json({ error: "No such online application." });
  if (w.status === "encoded") return res.status(409).json({ error: "This one is already in CALMS as " + "an application." });
  const note = clean(req.body && req.body.note, 500); if (!note) return res.status(400).json({ error: "Say why it is not going ahead." });
  await db.query("update web_applications set status = 'closed', handled_by = $2, handled_at = now(), staff_note = $3 where id = $1", [w.id, req.user.id, note]);
  await audit.write({ user: req.user, kind: "status", action: "Closed an online application", record: w.reference, after: { note }, ip: req.ip });
  res.json({ ok: true });
}));
router.post("/applications/:ref/encode", allow("loan_processor"), wrap(async (req, res) => {
  const w = await webApp(req.params.ref); if (!w) return res.status(404).json({ error: "No such online application." });
  if (w.status === "encoded" || w.application_id) return res.status(409).json({ error: "This one is already in CALMS." });
  if (w.status === "closed") return res.status(409).json({ error: "This one was closed." });
  const product = (await db.query("select * from loan_products where name = $1", [w.product])).rows[0];
  if (!product) return res.status(409).json({ error: `The ${w.product} is no longer offered. Encode it by hand with New application.` });
  const dup = (await db.query(`select a.reference from applications a join borrowers b on b.id = a.borrower_id where a.product_id = $1 and a.status = any($2)
      and (lower(regexp_replace(b.full_name, '\\s+', ' ', 'g')) = $3 or (b.id_type = $4 and upper(b.id_number) = upper($5))) limit 1`, [product.id, intake.ACTIVE, intake.normName(w.full_name), w.id_type, w.id_number])).rows[0];
  if (dup) return res.status(409).json({ error: `${w.full_name} already has an active ${w.product.toLowerCase()} application, ${dup.reference}. Close this one instead.` });
  const files = (await db.query("select * from web_application_files where web_application_id = $1 order by id", [w.id])).rows;
  const sig = /^data:image\/png;base64,(.+)$/.exec(w.signature || "");
  const reference = await db.transaction(async (tx) => {
    const year = new Date().getFullYear();
    const n = (await tx.query("insert into counters (name, value) values ($1, 1) on conflict (name) do update set value = counters.value + 1 returning value", ["application-" + year])).rows[0].value;
    const ref = `APP-${year}-${String(n).padStart(4, "0")}`;
    const b = await tx.query("insert into borrowers (full_name, birth_date, id_type, id_number, mobile, email, address) values ($1,$2,$3,$4,$5,$6,$7) returning id",
      [w.full_name, w.birth_date, w.id_type, w.id_number, w.mobile, w.email, w.address]);
    const a = await tx.query(`insert into applications (reference, borrower_id, product_id, amount, term_months, agent_id, encoded_by, purpose, details, status, status_since, submitted_at)
       values ($1,$2,$3,$4,$5,null,$6,$7,$8,'submitted',now(),now()) returning id`, [ref, b.rows[0].id, product.id, w.amount, w.term_months, req.user.id, w.purpose, Object.assign({}, w.details, { channel: "website", webReference: w.reference })]);
    const put = async (slot, name, mime, bytes, sha) => {
      const v = (await tx.query("select coalesce(max(version), 0) + 1 v from documents where application_id = $1 and slot = $2", [a.rows[0].id, slot])).rows[0].v;
      const d = await tx.query("insert into documents (application_id, slot, version, file_name, mime_type, size_bytes, sha256, uploaded_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id",
        [a.rows[0].id, slot, v, name, mime, bytes.length, sha, req.user.id]);
      await tx.query("insert into document_files (document_id, bytes) values ($1, $2)", [d.rows[0].id, bytes]);
    };
    if (sig) { const bytes = Buffer.from(sig[1], "base64"); await put("consent", `${w.reference}-consent-signed-online.png`, "image/png", bytes, require("crypto").createHash("sha256").update(bytes).digest("hex")); }
    for (const f of files) if (["application/pdf", "image/jpeg", "image/png"].includes(f.mime_type)) await put(f.slot, f.file_name, f.mime_type, f.bytes, f.sha256);
    await tx.query("update web_applications set status = 'encoded', application_id = $2, handled_by = $3, handled_at = now() where id = $1", [w.id, a.rows[0].id, req.user.id]);
    await audit.write({ user: req.user, kind: "data", action: "Encoded an online application", record: ref, after: { from: w.reference, borrower: w.full_name, product: product.name, amount: Number(w.amount), termMonths: w.term_months, papers: files.length + (sig ? 1 : 0) }, ip: req.ip }, tx);
    return ref;
  });
  res.status(201).json({ reference });
}));

// ---- "Let's talk" call-backs ----
router.post("/callbacks/:id", wrap(async (req, res) => {
  const status = ["called", "done"].includes(req.body && req.body.status) ? req.body.status : null; if (!status) return res.status(400).json({ error: "Choose Called or Done." });
  const note = clean(req.body.note, 500);
  const r = await db.query("update talk_requests set status = $2, handled_by = $3, handled_at = now(), staff_note = coalesce(nullif($4, ''), staff_note) where id = $1 returning id, name", [Number(req.params.id) || 0, status, req.user.id, note]);
  if (!r.rows[0]) return res.status(404).json({ error: "No such request." });
  await audit.write({ user: req.user, kind: "data", action: status === "called" ? "Called back a website visitor" : "Closed a call-back request", record: "T-" + String(r.rows[0].id).padStart(5, "0"), after: note ? { note } : null, ip: req.ip });
  res.json({ ok: true });
}));

// ---- what borrowers send from My GR8 ----
async function request(id, res) { const r = (await db.query("select * from web_requests where id = $1", [Number(id) || 0])).rows[0]; if (!r) res.status(404).json({ error: "No such request." }); return r; }
router.get("/requests/:id/file", wrap(async (req, res) => {
  const r = await request(req.params.id, res); if (!r) return;
  const f = (await db.query("select bytes from web_request_files where request_id = $1", [r.id])).rows[0]; if (!f) return res.status(404).json({ error: "No file." });
  res.set("Content-Type", r.details.mime).set("Content-Disposition", `inline; filename="${String(r.details.file_name || "paper").replace(/"/g, "")}"`).set("Cache-Control", "private, no-store").send(f.bytes);
}));
router.post("/requests/:id/file-it", allow("loan_processor", "operations_manager", "system_administrator"), wrap(async (req, res) => {
  const r = await request(req.params.id, res); if (!r) return;
  if (r.kind !== "paper" || r.status !== "new") return res.status(409).json({ error: "This paper was already handled." });
  const a = (await db.query("select id, reference, status from applications where id = $1", [r.application_id])).rows[0];
  if (!a || !intake.ACTIVE.includes(a.status)) return res.status(409).json({ error: "That application is no longer open, so the paper can't be filed on it." });
  const f = (await db.query("select bytes from web_request_files where request_id = $1", [r.id])).rows[0];
  await db.transaction(async (tx) => {
    const v = (await tx.query("select coalesce(max(version), 0) + 1 v from documents where application_id = $1 and slot = $2", [a.id, r.details.slot])).rows[0].v;
    const d = await tx.query("insert into documents (application_id, slot, version, file_name, mime_type, size_bytes, sha256, uploaded_by) values ($1,$2,$3,$4,$5,$6,$7,$8) returning id",
      [a.id, r.details.slot, v, r.details.file_name, r.details.mime, f.bytes.length, r.details.sha256, req.user.id]);
    await tx.query("insert into document_files (document_id, bytes) values ($1, $2)", [d.rows[0].id, f.bytes]);
    await tx.query("update web_requests set status = 'done', handled_by = $2, handled_at = now(), staff_note = 'Filed on your application.' where id = $1", [r.id, req.user.id]);
    await audit.write({ user: req.user, kind: "doc", action: `Filed a paper the borrower sent from My GR8 (${r.details.label})`, record: a.reference, after: { file: r.details.file_name, sha256: r.details.sha256, version: v }, ip: req.ip }, tx);
  });
  res.json({ ok: true, reference: a.reference });
}));
for (const [verb, status] of [["done", "done"], ["dismiss", "dismissed"]]) router.post("/requests/:id/" + verb, wrap(async (req, res) => {
  const r = await request(req.params.id, res); if (!r) return;
  if (r.status !== "new") return res.status(409).json({ error: "This was already handled." });
  const allowedKinds = SEES[req.user.role]; if (!allowedKinds.includes(r.kind)) return res.status(403).json({ error: "Your role cannot handle this." });
  const note = clean(req.body && req.body.note, 300); if (status === "dismissed" && !note) return res.status(400).json({ error: "Say why, so the borrower knows." });
  await db.query("update web_requests set status = $2, handled_by = $3, handled_at = now(), staff_note = $4 where id = $1", [r.id, status, req.user.id, note || null]);
  await audit.write({ user: req.user, kind: "data", action: (status === "done" ? "Handled" : "Did not act on") + ` a My GR8 ${r.kind === "offer" ? "offer answer" : r.kind}`, record: r.details.reference || r.details.account || "", after: note ? { note } : null, ip: req.ip });
  res.json({ ok: true });
}));

module.exports = router;
module.exports.ensure = ensure;
module.exports.count = count;
module.exports.waiting = waiting;
