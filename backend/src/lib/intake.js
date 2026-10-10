// The rules for a new application, checked on the server whatever the screen already checked.
// Mirrors the checks on the New application screen so the messages read the same.

const ID_FORMATS = {
  "PhilSys ID": [/^\d{4}-\d{4}-\d{4}-\d{4}$/, "0000-0000-0000-0000"],
  "TIN": [/^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/, "000-000-000-000"],
  "SSS": [/^\d{2}-\d{7}-\d$/, "00-0000000-0"],
  "Driver's license": [/^[A-Z]\d{2}-\d{2}-\d{6}$/i, "A00-00-000000"],
  "Passport": [/^[A-Z]\d{7}[A-Z]$/i, "P0000000A"],
};
// The papers each product needs (FR-203). The consent form comes first for every product.
const CHECKLIST = {
  salary: [["consent", "Signed consent form"], ["id", "Government ID"], ["pay", "Pay stubs"], ["coe", "Certificate of employment"], ["addr", "Proof of billing"], ["bank", "Bank statement"]],
  personal: [["consent", "Signed consent form"], ["id", "Government ID"], ["income", "Proof of income"], ["addr", "Proof of billing"]],
  sme: [["consent", "Signed consent form"], ["id", "Government ID"], ["reg", "DTI or SEC registration"], ["fs", "Financial statements"], ["addr", "Proof of address"], ["permit", "Business permit"], ["bank", "Bank statements"]],
};

// Every paper CALMS knows how to ask for, for the Products and rules screen. The signed consent form is always required.
const DOC_CATALOG = [["id", "Government ID"], ["income", "Proof of income"], ["pay", "Pay stubs"], ["coe", "Certificate of employment"],
  ["addr", "Proof of address or billing"], ["bank", "Bank statements"], ["reg", "DTI or SEC registration"], ["fs", "Financial statements"], ["permit", "Business permit"]];

// The checklist for a product kind: what the administrator last published, or the built-in list.
async function checklistFor(kind) {
  const db = require("../db");
  const { rows } = await db.query("select required_docs from loan_products where lower(split_part(name, ' ', 1)) = $1 limit 1", [kind]);
  const docs = rows[0] && rows[0].required_docs;
  return Array.isArray(docs) && docs.length ? docs : (CHECKLIST[kind] || CHECKLIST.personal);
}

// Statuses in which an application is still alive, so a second one for the same borrower and product is refused (BR-03).
const ACTIVE = ["draft", "submitted", "review", "approved", "awaiting", "accepted"];

const text = (v, max = 300) => String(v == null ? "" : v).trim().replace(/\s+/g, " ").slice(0, max);
const money = (v) => { const n = Number(String(v == null ? "" : v).replace(/[^0-9.]/g, "")); return String(v == null ? "" : v).trim() === "" ? NaN : n; };
const normName = (n) => text(n).toLowerCase();
const peso = (n) => "₱ " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const kindOf = (productName) => productName.split(" ")[0].toLowerCase();   // "SME loan" -> "sme"

// body: what the screen sends. product: the loan_products row. Returns { errors, clean }.
function check(body, product) {
  const b = body.borrower || {}, d = body.details || {}, e = {};
  const amount = money(body.amount), term = Number(body.termMonths);
  if (!product) e.product = "Choose a loan product.";
  if (!Number.isFinite(amount) || amount <= 0) e.amount = "Enter an amount in pesos, for example 25,000.00.";
  else if (product && (amount < Number(product.min_amount) || amount > Number(product.max_amount))) e.amount = `${product.name} runs from ${peso(product.min_amount)} to ${peso(product.max_amount)}.`;
  if (!Number.isInteger(term)) e.term = "Enter the term as whole months, for example 12.";
  else if (product && !product.terms_months.includes(term)) e.term = `${product.name} terms are ${product.terms_months.join(", ").replace(/, (\d+)$/, " or $1")} months.`;
  const purpose = text(body.purpose, 1000); if (!purpose) e.purpose = "Fill in: purpose of the loan.";

  const name = text(b.name, 160); if (name.split(" ").filter(Boolean).length < 2) e.name = "Enter the first and last name as on the ID.";
  const dob = String(b.dob || ""); const age = (Date.now() - new Date(dob)) / 31557600000;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(age)) e.dob = "Enter the date of birth."; else if (age < 18) e.dob = "The borrower must be at least 18 years old."; else if (age > 100) e.dob = "Check the year of birth.";
  const idType = text(b.idType, 40), idNo = text(b.idNo, 40).toUpperCase(), fmt = ID_FORMATS[idType];
  if (!fmt) e.idtype = "Choose the government ID."; else if (!fmt[0].test(idNo)) e.idno = `${idType} numbers look like ${fmt[1]}.`;
  const mobile = String(b.mobile || "").replace(/[\s-]/g, ""); if (!/^09\d{9}$/.test(mobile)) e.mobile = "Enter an 11-digit mobile number starting with 09.";
  const email = text(b.email, 160); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Check the email address. It should look like name@example.com.";
  const address = text(b.address, 400); if (!address) e.address = "Fill in: home address.";

  // product-specific answers
  const kind = product ? kindOf(product.name) : "", details = {};
  const need = (key, label, isMoney) => { const v = isMoney ? money(d[key]) : text(d[key], 200); if (isMoney ? !Number.isFinite(v) || v < 0 : !v) e[key] = isMoney ? "Enter an amount in pesos, for example 25,000.00." : `Fill in: ${label}.`; else details[key] = v; };
  const years = (key) => { const v = money(d[key]); if (!Number.isFinite(v)) e[key] = "Enter the number of years, for example 3."; else details[key] = v; };
  if (kind === "salary" || kind === "personal") { need("employer", "employer"); need("position", "position"); years("years"); need("income", "", true); need("debts", "", true); }
  if (kind === "sme") { need("bizname", "registered business name"); need("bizreg", "DTI or SEC registration number"); need("biznature", "nature of business"); years("bizyears"); need("income", "", true); need("debts", "", true);
    if (String(d.collateral || "").trim()) { const c = money(d.collateral); if (!Number.isFinite(c) || c < 0) e.collateral = "Enter an amount in pesos, for example 25,000.00."; else details.collateral = c; } }
  if (!body.consentConfirmed) e.agree = "Confirm that the borrower signed the consent form.";

  return { errors: e, clean: { amount, term, purpose, details, borrower: { name, dob, idType, idNo, mobile, email: email || null, address } } };
}

module.exports = { check, CHECKLIST, DOC_CATALOG, checklistFor, ACTIVE, ID_FORMATS, normName, kindOf, peso };
