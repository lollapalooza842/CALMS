// Encode and verify: a second loan processor checks every encoded entry against the papers (maker-checker).
//   GET  /api/applications/:ref/verification      the entries, grouped by the paper they were copied from
//   POST /api/applications/:ref/verification      { decision: "verify" | "return", checks: {key: "ok"|"flag"}, flags: {key: {reason, note}} }
//   POST /api/applications/:ref/corrections       { values: {key: newValue} }  the encoder fixes what was returned
const express = require("express");
const db = require("../db");
const audit = require("../lib/audit");
const intake = require("../lib/intake");
const { allow } = require("../lib/auth");

const router = express.Router({ mergeParams: true });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

const REASONS = ["Differs from the document", "Cannot be read on the document", "Belongs in a different field", "Missing from the document"];
const LABEL = { consent: "Signed consent form", id: "Government ID", reg: "DTI or SEC registration", fs: "Financial statements", addr: "Proof of address", permit: "Business permit",
  bank: "Bank statements", pay: "Pay stubs", coe: "Certificate of employment", income: "Proof of income" };
// Which entry was copied from which paper, per product. [key, label, where it lives, format]
const MAP = {
  sme: [["id", [["name", "Full name", "b"], ["idno", "ID number", "b", "id"], ["dob", "Date of birth", "b", "date"]]],
        ["addr", [["address", "Home address", "b"]]],
        ["reg", [["bizname", "Business name", "d"], ["bizreg", "Registration number", "d"]]],
        ["permit", [["biznature", "Nature of business", "d"], ["bizyears", "Years operating", "d", "years"]]],
        ["fs", [["income", "Average monthly cash flow", "d", "money"]]],
        ["bank", [["debts", "Other monthly debt payments", "d", "money"]]]],
  salary: [["id", [["name", "Full name", "b"], ["idno", "ID number", "b", "id"], ["dob", "Date of birth", "b", "date"]]],
           ["addr", [["address", "Home address", "b"]]],
           ["coe", [["employer", "Employer", "d"], ["position", "Position", "d"], ["years", "Years with employer", "d", "years"]]],
           ["pay", [["income", "Gross monthly income", "d", "money"]]],
           ["bank", [["debts", "Other monthly debt payments", "d", "money"]]]],
  personal: [["id", [["name", "Full name", "b"], ["idno", "ID number", "b", "id"], ["dob", "Date of birth", "b", "date"]]],
             ["addr", [["address", "Home address", "b"]]],
             ["income", [["employer", "Employer", "d"], ["position", "Position", "d"], ["years", "Years with employer", "d", "years"], ["income", "Gross monthly income", "d", "money"], ["debts", "Other monthly debt payments", "d", "money"]]]],
};
const COLUMN = { name: "full_name", idno: "id_number", dob: "birth_date", address: "address" };
const fmtMoney = (n) => Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const iso = (d) => (d instanceof Date ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : String(d || ""));

function valueOf(a, key, where, fmt) {
  const raw = where === "b" ? a[COLUMN[key]] : (a.details || {})[key];
  if (raw == null || raw === "") return "";
  if (fmt === "money") return fmtMoney(raw);
  if (fmt === "date") return iso(raw);
  return String(raw);
}
function badFormat(fmt, v, a) {
  if (!v.trim()) return "Enter a value.";
  if (fmt === "money" && !/^\d{1,3}(,\d{3})*(\.\d{2})?$|^\d+(\.\d{2})?$/.test(v)) return "Write the amount with two decimals, for example 158,400.00.";
  if (fmt === "date" && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(new Date(v)))) return "Write the date as year-month-day, for example 1979-03-14.";
  if (fmt === "years" && !/^\d+(\.\d+)?$/.test(v)) return "Enter the number of years, for example 3.";
  if (fmt === "id") { const f = intake.ID_FORMATS[a.id_type]; if (f && !f[0].test(v.toUpperCase())) return `${a.id_type} numbers look like ${f[1]}.`; }
  return "";
}

async function load(ref, user) {
  const { rows } = await db.query(`select a.*, b.full_name, b.birth_date, b.id_type, b.id_number, b.address, p.name as product,
        en.short_name as encoder, en.full_name as encoder_full
      from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id join users en on en.id = a.encoded_by
      where a.reference = $1`, [ref]);
  const a = rows[0];
  if (!a) return { status: 404, error: "No application has that number." };
  if (user.role === "sales_agent" && a.agent_id !== user.id) return { status: 403, error: "That application is not yours." };
  return { a };
}
const stateOf = (a) => (a.status === "submitted" ? a.check_state : a.status === "draft" ? "draft" : "verified");

router.get("/verification", allow("loan_processor", "underwriter", "lead_underwriter", "operations_manager", "compliance_auditor", "system_administrator", "sales_agent"), wrap(async (req, res) => {
  const f = await load(req.params.ref, req.user); if (f.error) return res.status(f.status).json({ error: f.error });
  const a = f.a, kind = intake.kindOf(a.product), map = MAP[kind] || MAP.personal, state = stateOf(a);
  const [docs, rounds, fixes] = await Promise.all([
    db.query(`select distinct on (slot) id, slot, version, file_name, mime_type from documents where application_id = $1 order by slot, version desc`, [a.id]),
    db.query(`select v.*, u.short_name, u.full_name from verifications v join users u on u.id = v.verifier where v.application_id = $1 order by v.at`, [a.id]),
    db.query(`select c.*, u.short_name from corrections c join users u on u.id = c.corrected_by where c.application_id = $1 order by c.at`, [a.id]),
  ]);
  const last = rounds.rows[rounds.rows.length - 1];
  const fileOf = {}; docs.rows.forEach((d) => { fileOf[d.slot] = { id: d.id, name: d.file_name, version: d.version, type: d.mime_type }; });
  const fixedAfter = (key) => last && fixes.rows.some((c) => c.field === key && c.at > last.at);
  const papers = map.map(([slot, fields]) => ({
    slot, label: LABEL[slot] || slot, file: fileOf[slot] || null,
    fields: fields.map(([key, label, where, fmt]) => ({
      key, label, format: fmt || "", value: valueOf(a, key, where, fmt),
      // what the last round said about this entry; a corrected entry must be checked again
      check: last && !fixedAfter(key) ? (last.checks[key] || null) : null,
      flag: last && last.outcome === "returned" && last.flags[key] ? last.flags[key] : null,
      was: fixes.rows.filter((c) => c.field === key).map((c) => ({ value: c.before, by: c.short_name, at: c.at })),
    })),
  }));
  const checklist = await intake.checklistFor(kind);
  const missing = checklist.filter(([s]) => !fileOf[s]).map(([, l]) => l);
  const isEncoder = a.encoded_by === req.user.id;
  const record = [];
  record.push({ at: a.submitted_at || a.created_at, text: `${a.encoder} encoded ${papers.reduce((n, p) => n + p.fields.length, 0)} entries and submitted the application` });
  rounds.rows.forEach((v) => {
    const flagged = Object.keys(v.flags || {});
    record.push({ at: v.at, text: v.outcome === "verified" ? `${v.short_name} verified every entry. The application moved to Under Review` : `${v.short_name} returned ${flagged.length} entr${flagged.length === 1 ? "y" : "ies"} for correction` });
  });
  fixes.rows.forEach((c) => record.push({ at: c.at, text: `${c.short_name} corrected an entry from “${c.before}” to “${c.after}”` }));
  record.sort((x, y) => new Date(x.at) - new Date(y.at));
  res.json({
    reference: a.reference, borrower: a.full_name, product: a.product, state, papers, missing, reasons: REASONS, record,
    encodedBy: a.encoder, encodedAt: a.submitted_at || a.created_at,
    verifiedBy: state === "verified" && last ? last.short_name : "", verifiedAt: state === "verified" && last ? last.at : null, returnedBy: last && last.outcome === "returned" ? last.short_name : "",
    isEncoder, canCheck: state === "waiting" && req.user.role === "loan_processor" && !isEncoder, canFix: state === "returned" && isEncoder,
  });
}));

router.post("/verification", allow("loan_processor"), wrap(async (req, res) => {
  const f = await load(req.params.ref, req.user); if (f.error) return res.status(f.status).json({ error: f.error });
  const a = f.a, kind = intake.kindOf(a.product), map = MAP[kind] || MAP.personal;
  if (a.encoded_by === req.user.id) return res.status(403).json({ error: "You encoded this application, so you cannot verify it. A different user must (maker-checker rule)." });
  if (stateOf(a) !== "waiting") return res.status(409).json({ error: "This application is not waiting for verification." });
  const keys = map.flatMap(([, fields]) => fields.map(([k]) => k));
  const checks = req.body.checks || {}, flags = req.body.flags || {}, decision = req.body.decision;
  const unchecked = keys.filter((k) => checks[k] !== "ok" && checks[k] !== "flag");
  if (unchecked.length) return res.status(400).json({ error: `${unchecked.length} entr${unchecked.length === 1 ? "y is" : "ies are"} still unchecked. Every entry must be compared with the paper.` });
  const flagged = keys.filter((k) => checks[k] === "flag");
  const cleanFlags = {};
  for (const k of flagged) { const fl = flags[k] || {}; if (!REASONS.includes(fl.reason)) return res.status(400).json({ error: "Give a reason for every entry that does not match." }); cleanFlags[k] = { reason: fl.reason, note: String(fl.note || "").trim().slice(0, 200) }; }
  const cleanChecks = {}; keys.forEach((k) => { cleanChecks[k] = checks[k]; });

  if (decision === "return") {
    if (!flagged.length) return res.status(400).json({ error: "Nothing is marked as not matching. Mark at least one entry before returning it." });
    await db.transaction(async (tx) => {
      await tx.query("insert into verifications (application_id, verifier, outcome, checks, flags) values ($1, $2, 'returned', $3, $4)", [a.id, req.user.id, cleanChecks, cleanFlags]);
      await tx.query("update applications set check_state = 'returned' where id = $1", [a.id]);
      await audit.write({ user: req.user, kind: "data", action: "Returned the encoded data for correction", record: a.reference, after: { flagged: cleanFlags }, ip: req.ip }, tx);
    });
    return res.json({ state: "returned" });
  }
  if (decision !== "verify") return res.status(400).json({ error: "Choose verify or return." });
  if (flagged.length) return res.status(400).json({ error: "Entries marked as not matching must go back to the encoder first." });
  const have = (await db.query("select distinct slot from documents where application_id = $1", [a.id])).rows.map((r) => r.slot);
  const missing = (await intake.checklistFor(kind)).filter(([s]) => !have.includes(s)).map(([, l]) => l);
  if (missing.length) return res.status(409).json({ error: `Not every required paper is on file. Still missing: ${missing.join(", ")}.` });
  await db.transaction(async (tx) => {
    const cur = (await tx.query("select status, status_since from applications where id = $1 for update", [a.id])).rows[0];
    if (cur.status !== "submitted") throw Object.assign(new Error("moved"), { status: 409 });
    await tx.query("insert into verifications (application_id, verifier, outcome, checks, flags) values ($1, $2, 'verified', $3, '{}')", [a.id, req.user.id, cleanChecks]);
    await tx.query("insert into application_stages (application_id, status, handled_by, entered_at, left_at) values ($1, 'submitted', $2, $3, now())", [a.id, req.user.id, cur.status_since]);
    await tx.query("update applications set status = 'review', status_since = now(), check_state = 'verified' where id = $1", [a.id]);
    await audit.write({ user: req.user, kind: "status", action: "Verified the encoded data. Moved to Under Review", record: a.reference, after: { entries: keys.length }, ip: req.ip }, tx);
  });
  res.json({ state: "verified", status: "review" });
}));

router.post("/corrections", allow("loan_processor", "sales_agent"), wrap(async (req, res) => {
  const f = await load(req.params.ref, req.user); if (f.error) return res.status(f.status).json({ error: f.error });
  const a = f.a, kind = intake.kindOf(a.product), map = MAP[kind] || MAP.personal;
  if (a.encoded_by !== req.user.id) return res.status(403).json({ error: "Only the encoder corrects returned entries." });
  if (stateOf(a) !== "returned") return res.status(409).json({ error: "Nothing has been returned for correction." });
  const last = (await db.query("select flags from verifications where application_id = $1 order by at desc limit 1", [a.id])).rows[0];
  const flagged = Object.keys((last && last.flags) || {}), values = req.body.values || {}, fields = {};
  map.forEach(([, fs]) => fs.forEach(([k, label, where, fmt]) => { fields[k] = { label, where, fmt }; }));
  const errors = {}, changes = [];
  for (const k of flagged) {
    const def = fields[k]; if (!def) continue;
    const before = valueOf(a, k, def.where, def.fmt), v = String(values[k] == null ? "" : values[k]).trim();
    const bad = badFormat(def.fmt, v, a);
    if (bad) errors[k] = bad; else if (v === before) errors[k] = "This is the same as before. Correct it from the paper.";
    else changes.push({ k, def, before, after: def.fmt === "id" ? v.toUpperCase() : v });
  }
  if (Object.keys(errors).length) return res.status(400).json({ error: "Some corrections need fixing.", fields: errors });
  await db.transaction(async (tx) => {
    for (const c of changes) {
      if (c.def.where === "b") await tx.query(`update borrowers set ${COLUMN[c.k]} = $2 where id = $1`, [a.borrower_id, c.after]);
      else { const num = c.def.fmt === "money" || c.def.fmt === "years" ? Number(c.after.replace(/,/g, "")) : c.after;
        await tx.query("update applications set details = jsonb_set(details, $2, $3::jsonb) where id = $1", [a.id, "{" + c.k + "}", JSON.stringify(num)]); }
      await tx.query("insert into corrections (application_id, field, before, after, corrected_by) values ($1, $2, $3, $4, $5)", [a.id, c.k, c.before, c.after, req.user.id]);
    }
    await tx.query("update applications set check_state = 'waiting' where id = $1", [a.id]);
    await audit.write({ user: req.user, kind: "data", action: "Corrected returned entries and resubmitted", record: a.reference,
      before: Object.fromEntries(changes.map((c) => [c.k, c.before])), after: Object.fromEntries(changes.map((c) => [c.k, c.after])), ip: req.ip }, tx);
  });
  res.json({ state: "waiting" });
}));

module.exports = router;
