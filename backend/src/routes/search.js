// Quick search (Ctrl+K anywhere in CALMS).
//   GET /api/search?q=   borrowers, applications, loan accounts and (for the administrator) people with an account,
//                        only what the person signed in may open, at most 6 of each, best match first
const express = require("express");
const db = require("../db");
const auth = require("../lib/auth");

const router = express.Router();
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

// the same doors as the pages these results open
const APPS = ["sales_agent", "loan_processor", "underwriter", "lead_underwriter", "operations_manager", "compliance_auditor", "system_administrator"];
const ACCOUNTS = ["disbursement_officer", "loan_account_officer", "operations_manager", "compliance_auditor", "system_administrator", "lead_underwriter", "loan_processor"];
const ST = { draft: ["Draft", "grey"], submitted: ["Submitted", "blue"], review: ["Under review", "amber"], approved: ["Approved", "green"], awaiting: ["Awaiting borrower", "violet"],
  accepted: ["Accepted", "teal"], declined: ["Declined by borrower", "red"], funded: ["Funded", "green"], rejected: ["Rejected", "red"] };   // as the pages name them (kit.js CK.ST)

// "%", "_" and "\" typed into the box are letters, not wildcards
const like = (s) => "%" + s.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
// a match at the start of the name or number comes first, then a match at the start of any word, then anywhere
const RANK = (col) => `case when ${col} ilike $2 then 0 when ${col} ilike $3 then 1 else 2 end`;

router.get("/", wrap(async (req, res) => {
  const q = String(req.query.q || "").trim().replace(/\s+/g, " ").slice(0, 60);
  const out = { q, applications: [], accounts: [], people: [] };
  if (q.length < 2) return res.json(out);
  const role = req.user.role, digits = q.replace(/\D/g, "");
  const p = [like(q), q.replace(/[\\%_]/g, (c) => "\\" + c) + "%", "% " + q.replace(/[\\%_]/g, (c) => "\\" + c) + "%"];

  if (APPS.includes(role)) {
    const mine = role === "sales_agent";
    const { rows } = await db.query(`select a.reference, b.full_name, p.name as product, coalesce(a.approved_amount, a.amount) as amount, a.status, a.status_since
        from applications a join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id
       where (b.full_name ilike $1 or a.reference ilike $1 ${digits.length >= 4 ? "or regexp_replace(coalesce(b.mobile, ''), '\\D', '', 'g') like $5" : ""})
         ${mine ? "and a.agent_id = $4" : "and $4::uuid is null"}
       order by least(${RANK("b.full_name")}, ${RANK("a.reference")}), a.status_since desc limit 6`,
      [...p, mine ? req.user.id : null, ...(digits.length >= 4 ? ["%" + digits + "%"] : [])]);
    out.applications = rows.map((r) => ({ ref: r.reference, name: r.full_name, product: r.product, amount: Number(r.amount), status: r.status, statusName: (ST[r.status] || [r.status])[0], tone: (ST[r.status] || [0, "grey"])[1] }));
  }
  if (ACCOUNTS.includes(role)) {
    const { rows } = await db.query(`select l.number, l.closed_on, l.principal, b.full_name, p.name as product
        from loan_accounts l join applications a on a.id = l.application_id join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id
       where b.full_name ilike $1 or l.number ilike $1 or a.reference ilike $1
       order by least(${RANK("b.full_name")}, ${RANK("l.number")}), l.closed_on nulls first, l.released_on desc limit 6`, p);
    out.accounts = rows.map((r) => ({ no: r.number, name: r.full_name, product: r.product, principal: Number(r.principal), closed: !!r.closed_on }));
  }
  if (role === "system_administrator") {
    const { rows } = await db.query(`select username, full_name, role, is_active, deactivated_at from users
       where full_name ilike $1 or username ilike $1 or email ilike $1
       order by least(${RANK("full_name")}, ${RANK("username")}), full_name limit 6`, p);
    out.people = rows.map((r) => ({ username: r.username, name: r.full_name, roleName: auth.ROLE_NAMES[r.role], off: !r.is_active || !!r.deactivated_at }));
  }
  res.set("Cache-Control", "no-store").json(out);
}));

module.exports = router;
