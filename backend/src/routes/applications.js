// Loan applications.
//   GET  /api/applications                         the list, as the Applications page shows it
//   GET  /api/applications/new/options             products and sales agents for the New application form
//   GET  /api/applications/new/check              ?name=&product=&idType=&idNo=  is there already an active one?
//   POST /api/applications                         submit a new application, with the signed consent form
//   GET  /api/applications/:ref                    one application, everything the Application detail page shows
//   POST /api/applications/:ref/reveal-id          the borrower's full ID number (the look is written to the audit log)
//   POST /api/applications/:ref/documents          file a paper (a new version if that slot already has one)
//   GET  /api/applications/:ref/documents/:id      the file itself
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const intake = require("../lib/intake");
const { readUpload } = require("../lib/files");
const { allow } = require("../lib/auth");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// Who may see applications at all. Disbursement and account officers work from their own queues.
const READERS = ["sales_agent", "loan_processor", "underwriter", "lead_underwriter", "operations_manager", "compliance_auditor", "system_administrator"];
// Only loan processors encode and file papers (SRS UC-7: a sales agent holds no authority to encode).
const ENCODERS = ["loan_processor"];

// What each product is for, as the New application screen describes it.
const WHO_FOR = { salary: "Employed borrowers, paid by salary deduction", personal: "Individuals, any accepted payment channel", sme: "Registered businesses" };
const LIST = `
  select a.id, a.reference, b.full_name as borrower, p.name as product, a.amount, a.term_months,
         a.status, a.status_since, a.agent_id, ag.short_name as agent, en.short_name as encoded_by, sg.short_name as assignee,
         coalesce((select json_agg(json_build_object(
                     'status', s.status, 'by', u.short_name,
                     'hours', round(extract(epoch from (s.left_at - s.entered_at)) / 3600))
                   order by s.entered_at)
                   from application_stages s left join users u on u.id = s.handled_by
                   where s.application_id = a.id), '[]') as history
    from applications a
    join borrowers b on b.id = a.borrower_id
    join loan_products p on p.id = a.product_id
    join users en on en.id = a.encoded_by
    left join users ag on ag.id = a.agent_id
    left join users sg on sg.id = a.assigned_to`;

const shape = (r) => ({
  reference: r.reference, borrower: r.borrower, product: r.product, amount: Number(r.amount),
  termMonths: r.term_months, status: r.status, statusSince: r.status_since, agent: r.agent || "",
  encodedBy: r.encoded_by, assignee: r.assignee || "", history: r.history,
});

// "214-608-921-000" -> "•••-•••-••1-000": only the last four characters show (NFR: data minimisation)
const mask = (s) => { if (!s) return ""; let keep = 4; return s.split("").reverse().map((c) => (/[0-9A-Z]/i.test(c) ? (keep-- > 0 ? c : "•") : c)).reverse().join(""); };

async function findApp(ref, user) {
  const { rows } = await db.query(`select a.*, b.full_name, b.birth_date, b.id_type, b.id_number, b.mobile, b.email, b.address,
        p.name as product, p.monthly_rate, p.interest_method, p.processing_fee, p.terms_months, p.min_amount, p.max_amount,
        en.short_name as encoder, en.full_name as encoder_full, ag.short_name as agent
      from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id
      join users en on en.id = a.encoded_by left join users ag on ag.id = a.agent_id
      where a.reference = $1`, [ref]);
  const a = rows[0];
  if (!a) return { status: 404, error: "No application has that number." };
  if (user.role === "sales_agent" && a.agent_id !== user.id) return { status: 403, error: "That application is not yours." };
  return { app: a };
}

// ---- the list ----
router.get("/", allow(...READERS), wrap(async (req, res) => {
  const mine = req.user.role === "sales_agent";   // a sales agent sees only the applications they brought in
  const { rows } = await db.query(LIST + (mine ? " where a.agent_id = $1" : "") + " order by a.status_since", mine ? [req.user.id] : []);
  res.json({ applications: rows.map(shape) });
}));

// ---- the New application form ----
router.get("/new/options", allow(...ENCODERS), wrap(async (req, res) => {
  const products = await db.query("select * from loan_products order by min_amount desc");
  const agents = await db.query("select id, short_name from users where role = 'sales_agent' and is_active order by short_name");
  res.json({
    products: products.rows.map((p) => { const k = intake.kindOf(p.name); return { key: k, name: p.name, who: WHO_FOR[k] || "", min: Number(p.min_amount), max: Number(p.max_amount),
      terms: p.terms_months, t0: Math.min(...p.terms_months), t1: Math.max(...p.terms_months), rate: Math.round(Number(p.monthly_rate) * 10000) / 100, method: p.interest_method }; }),
    agents: agents.rows.map((a) => ({ id: a.id, name: a.short_name })),
  });
}));

async function duplicateOf(name, productId, idType, idNo) {
  const { rows } = await db.query(`select a.reference, a.status from applications a join borrowers b on b.id = a.borrower_id
      where a.product_id = $1 and a.status = any($2)
        and (lower(regexp_replace(b.full_name, '\\s+', ' ', 'g')) = $3 or ($4 <> '' and b.id_type = $5 and upper(b.id_number) = $4))
      order by a.created_at desc limit 1`, [productId, intake.ACTIVE, intake.normName(name), String(idNo || "").toUpperCase(), idType || ""]);
  return rows[0] || null;
}

router.get("/new/check", allow(...ENCODERS), wrap(async (req, res) => {
  const p = (await db.query("select id from loan_products where name = $1", [String(req.query.product || "")])).rows[0];
  if (!p || !String(req.query.name || "").trim()) return res.json({ duplicate: null });
  res.json({ duplicate: await duplicateOf(req.query.name, p.id, req.query.idType, req.query.idNo) });
}));

router.post("/", allow(...ENCODERS), wrap(async (req, res) => {
  const product = (await db.query("select * from loan_products where name = $1", [String(req.body.product || "")])).rows[0];
  const { errors, clean } = intake.check(req.body, product);
  const consent = readUpload(req.body.consent);
  if (consent.error) errors.consent = req.body.consent ? consent.error : "Upload the signed consent form. The application cannot advance without it.";

  // Endorsed by: a sales agent is always the agent on what they encode; a processor picks one or "walk-in".
  let agentId = null;
  if (req.user.role === "sales_agent") agentId = req.user.id;
  else if (req.body.agent && req.body.agent !== "No agent (walk-in)") {
    const ag = (await db.query("select id from users where short_name = $1 and role = 'sales_agent' and is_active", [String(req.body.agent)])).rows[0];
    if (!ag) errors.agent = "Choose the sales agent, or No agent (walk-in)."; else agentId = ag.id;
  } else if (!req.body.agent) errors.agent = "Fill in: endorsed by.";
  if (Object.keys(errors).length) return res.status(400).json({ error: "Some fields need fixing.", fields: errors });

  const dup = await duplicateOf(clean.borrower.name, product.id, clean.borrower.idType, clean.borrower.idNo);
  if (dup) return res.status(409).json({ error: `${clean.borrower.name} already has an active ${product.name.replace(/^(\w)(?=[a-z])/, (m) => m.toLowerCase())} application, ${dup.reference}. A second one cannot be created while it is active.`, duplicate: dup, fields: { name: "Duplicate of " + dup.reference + "." } });

  const reference = await db.transaction(async (tx) => {
    const year = new Date().getFullYear();
    const counter = await tx.query(`insert into counters (name, value) values ($1, 1)
       on conflict (name) do update set value = counters.value + 1 returning value`, ["application-" + year]);
    const ref = `APP-${year}-${String(counter.rows[0].value).padStart(4, "0")}`;
    const b = clean.borrower;
    const borrower = await tx.query(`insert into borrowers (full_name, birth_date, id_type, id_number, mobile, email, address)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`, [b.name, b.dob, b.idType, b.idNo, b.mobile, b.email, b.address]);
    const app = await tx.query(`insert into applications (reference, borrower_id, product_id, amount, term_months, agent_id, encoded_by, purpose, details, status, status_since, submitted_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'submitted', now(), now()) returning id`,
      [ref, borrower.rows[0].id, product.id, clean.amount, clean.term, agentId, req.user.id, clean.purpose, clean.details]);
    const doc = await tx.query(`insert into documents (application_id, slot, version, file_name, mime_type, size_bytes, sha256, uploaded_by)
       values ($1, 'consent', 1, $2, $3, $4, $5, $6) returning id`, [app.rows[0].id, consent.name, consent.mime, consent.size, consent.sha256, req.user.id]);
    await tx.query("insert into document_files (document_id, bytes) values ($1, $2)", [doc.rows[0].id, consent.bytes]);
    await audit.write({ user: req.user, kind: "data", action: "Submitted a new application", record: ref,
      after: { borrower: b.name, product: product.name, amount: clean.amount, termMonths: clean.term }, ip: req.ip }, tx);
    await audit.write({ user: req.user, kind: "doc", action: "Filed the signed consent form", record: ref,
      after: { file: consent.name, sha256: consent.sha256 }, ip: req.ip }, tx);
    return ref;
  });
  res.status(201).json({ reference });
}));

// ---- one application ----
router.get("/:ref", allow(...READERS), wrap(async (req, res) => {
  const found = await findApp(req.params.ref, req.user);
  if (found.error) return res.status(found.status).json({ error: found.error });
  const a = found.app;
  const [stages, docs, trail] = await Promise.all([
    db.query(`select s.status, s.entered_at, s.left_at, u.short_name as by from application_stages s left join users u on u.id = s.handled_by
              where s.application_id = $1 order by s.entered_at`, [a.id]),
    db.query(`select d.id, d.slot, d.version, d.file_name, d.mime_type, d.size_bytes, d.uploaded_at, u.short_name as by
              from documents d join users u on u.id = d.uploaded_by where d.application_id = $1 order by d.slot, d.version`, [a.id]),
    db.query(`select at, actor, action, after from audit_log where record = $1 order by id desc limit 200`, [a.reference]),
  ]);
  const kind = intake.kindOf(a.product);
  res.json({ application: {
    reference: a.reference, status: a.status, statusSince: a.status_since, createdAt: a.created_at, submittedAt: a.submitted_at,
    product: a.product, kind, amount: Number(a.amount), termMonths: a.term_months, purpose: a.purpose || "",
    rate: Math.round(Number(a.monthly_rate) * 10000) / 100, method: a.interest_method,
    agent: a.agent || "", encodedBy: a.encoder, encodedByMe: a.encoded_by === req.user.id, details: a.details || {},
    borrower: { name: a.full_name, birthDate: a.birth_date, idType: a.id_type || "", idNumber: mask(a.id_number), mobile: a.mobile || "", email: a.email || "", address: a.address || "" },
    stages: stages.rows.map((s) => ({ status: s.status, by: s.by || "", enteredAt: s.entered_at, leftAt: s.left_at })),
    checklist: (await intake.checklistFor(kind)).map(([slot, label]) => ({ slot, label })),
    documents: docs.rows.map((d) => ({ id: d.id, slot: d.slot, version: d.version, name: d.file_name, type: d.mime_type, size: d.size_bytes, at: d.uploaded_at, by: d.by })),
    trail: trail.rows.map((t) => ({ at: t.at, actor: t.actor, action: t.action, after: t.after })),
  } });
}));

router.post("/:ref/reveal-id", allow(...READERS), wrap(async (req, res) => {
  const found = await findApp(req.params.ref, req.user);
  if (found.error) return res.status(found.status).json({ error: found.error });
  await audit.write({ user: req.user, kind: "data", action: "Viewed the borrower's full ID number", record: found.app.reference, after: { idType: found.app.id_type }, ip: req.ip });
  res.json({ idNumber: found.app.id_number || "" });
}));

// ---- papers ----
router.post("/:ref/documents", allow(...ENCODERS), wrap(async (req, res) => {
  const found = await findApp(req.params.ref, req.user);
  if (found.error) return res.status(found.status).json({ error: found.error });
  const a = found.app, kind = intake.kindOf(a.product), slot = String(req.body.slot || "");
  if (!(await intake.checklistFor(kind)).some(([s]) => s === slot)) return res.status(400).json({ error: "That paper is not on this product's checklist." });
  if (!["draft", "submitted"].includes(a.status)) return res.status(409).json({ error: "Papers can only be filed before the application goes to review." });
  const file = readUpload(req.body.file);
  if (file.error) return res.status(400).json({ error: file.error });
  const saved = await db.transaction(async (tx) => {
    await tx.query("select pg_advisory_xact_lock(hashtext($1))", [a.id + slot]);
    const v = (await tx.query("select coalesce(max(version), 0) + 1 as v from documents where application_id = $1 and slot = $2", [a.id, slot])).rows[0].v;
    const doc = await tx.query(`insert into documents (application_id, slot, version, file_name, mime_type, size_bytes, sha256, uploaded_by)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id, uploaded_at`, [a.id, slot, v, file.name, file.mime, file.size, file.sha256, req.user.id]);
    await tx.query("insert into document_files (document_id, bytes) values ($1, $2)", [doc.rows[0].id, file.bytes]);
    await audit.write({ user: req.user, kind: "doc", action: v > 1 ? `Filed version ${v} of a paper` : "Filed a paper", record: a.reference,
      after: { slot, file: file.name, version: v, sha256: file.sha256 }, ip: req.ip }, tx);
    return { id: doc.rows[0].id, slot, version: v, name: file.name, type: file.mime, size: file.size, at: doc.rows[0].uploaded_at, by: req.user.short_name };
  });
  res.status(201).json({ document: saved });
}));

router.get("/:ref/documents/:id", allow(...READERS), wrap(async (req, res) => {
  const found = await findApp(req.params.ref, req.user);
  if (found.error) return res.status(found.status).json({ error: found.error });
  if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ error: "No such paper." });
  const { rows } = await db.query(`select d.file_name, d.mime_type, d.slot, d.version, f.bytes from documents d join document_files f on f.document_id = d.id
      where d.id = $1 and d.application_id = $2`, [req.params.id, found.app.id]);
  const d = rows[0];
  if (!d) return res.status(404).json({ error: "No such paper." });
  await audit.write({ user: req.user, kind: "doc", action: "Opened a paper", record: found.app.reference, after: { slot: d.slot, version: d.version }, ip: req.ip });
  res.set({ "Content-Type": d.mime_type, "Content-Disposition": `inline; filename="${encodeURIComponent(d.file_name)}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
  res.send(d.bytes);
}));

module.exports = router;
