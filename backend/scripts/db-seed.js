// Fills an empty database with the people, products and applications the prototype shows.
// Every account gets the password below. Change them before anyone else can reach the system.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../src/db");
const audit = require("../src/lib/audit");

const PASSWORD = "Kuwa-guards-2026";
const MFA_SECRET = "JBSWY3DPEHPK3PXP"; // demo secret; add it to an authenticator app, or use DEV_MFA_CODE

const USERS = [
  ["liza.mendoza", "Liza Mendoza", "L. Mendoza", "loan_processor"], ["aurelio.soriano", "Aurelio Soriano", "A. Soriano", "loan_processor"],
  ["antonio.reyes", "Antonio Reyes", "A. Reyes", "lead_underwriter", 500000], ["maricar.tolentino", "Maricar Tolentino", "M. Tolentino", "underwriter", 300000],
  ["benjie.cruz", "Benjie Cruz", "B. Cruz", "underwriter", 200000], ["jun.espiritu", "Jun Espiritu", "J. Espiritu", "sales_agent"],
  ["katrina.yap", "Katrina Yap", "K. Yap", "sales_agent"], ["corazon.ilagan", "Corazon Ilagan", "C. Ilagan", "disbursement_officer"],
  ["rodel.macaraeg", "Rodel Macaraeg", "R. Macaraeg", "loan_account_officer"], ["mila.ramos", "Mila Ramos", "M. Ramos", "operations_manager"],
  ["regina.sy", "Regina Sy", "R. Sy", "compliance_auditor"], ["paolo.ventura", "Paolo Ventura", "P. Ventura", "system_administrator"],
];
const PRODUCTS = [
  ["SME loan", 50000, 1000000, [12, 18, 24, 36], 0.015, "diminishing", 0.033, 0.03],
  ["Personal loan", 10000, 150000, [6, 12, 18], 0.018, "diminishing", 0.033, 0.03],
  ["Salary loan", 10000, 200000, [6, 12, 18, 24], 0.016, "flat", 0.025, 0.03],
];
// reference, borrower, product, amount, term, agent, status, hours in this stage, earlier stages [status, by, hours]
const P = "liza.mendoza", P2 = "aurelio.soriano", U = "antonio.reyes", U2 = "maricar.tolentino", D = "corazon.ilagan", J = "jun.espiritu", K = "katrina.yap";
const APPS = [
  ["APP-2026-0377", "Lourdes Magbanua", "SME loan", 480000, 36, K, "review", 50, [["draft", P2, 6], ["submitted", P, 9]]],
  ["APP-2026-0391", "Vicente Alcantara", "Salary loan", 120000, 24, J, "awaiting", 55, [["draft", P, 4], ["submitted", P2, 7], ["review", U, 20]]],
  ["APP-2026-0398", "Teresita Villanueva", "SME loan", 450000, 36, J, "draft", 52, []],
  ["APP-2026-0361", "Benigno Salazar", "Salary loan", 100000, 24, K, "accepted", 49, [["draft", P, 3], ["submitted", P2, 5], ["review", U2, 12], ["approved", P, 8]]],
  ["APP-2026-0419", "Rosalinda Ocampo", "Personal loan", 75000, 12, J, "review", 22, [["draft", P, 2], ["submitted", P2, 4]]],
  ["APP-2026-0436", "Carmela Bautista", "Salary loan", 120000, 24, K, "submitted", 19, [["draft", P2, 5]]],
  ["APP-2026-0409", "Norma Estrella", "SME loan", 300000, 24, J, "awaiting", 18, [["draft", P, 6], ["submitted", P2, 8], ["review", U, 19]]],
  ["APP-2026-0425", "Crisanto Navarro", "SME loan", 350000, 24, K, "review", 14, [["draft", P, 7], ["submitted", P2, 5]]],
  ["APP-2026-0440", "Nestor Aguilar", "SME loan", 300000, 24, K, "rejected", 9, [["draft", P, 5], ["submitted", P2, 4], ["review", U2, 11]]],
  ["APP-2026-0417", "Josefina Abad", "Salary loan", 65000, 12, J, "approved", 4, [["draft", P, 2], ["submitted", P2, 3], ["review", U, 8]]],
  ["APP-2026-0444", "Marivic Santos-Lim", "Personal loan", 40000, 6, null, "draft", 3, []],
  ["APP-2026-0352", "Herminia Cabrera", "Salary loan", 180000, 24, K, "funded", 70, [["draft", P, 4], ["submitted", P2, 6], ["review", U, 16], ["approved", P, 6], ["accepted", D, 9]]],
];

// The sample applications were first seeded with names only. This gives each one a believable
// date of birth, ID, mobile number, address, purpose and the product's own details, so the
// Application detail screen has something to show. Only fills what is still empty; safe to run again.
const TOWNS = ["Malolos, Bulacan", "Apalit, Pampanga", "San Fernando, Pampanga", "Meycauayan, Bulacan", "Baliuag, Bulacan", "Calumpit, Bulacan"];
const STREETS = ["Paseo del Congreso", "MacArthur Highway", "Rizal Street", "Mabini Street", "Burgos Avenue", "Gomez Street"];
const JOBS = [["Department of Education", "Teacher II"], ["Bulacan Medical Center", "Nurse I"], ["Puregold Price Club", "Store supervisor"], ["Meralco", "Line technician"], ["SM City Pampanga", "Sales associate"]];
const BIZ = [["rice trading", "Rice Trading"], ["hardware and construction supply", "Hardware"], ["bakery", "Bakeshop"], ["sari-sari store and LPG retail", "General Merchandise"]];
const PURPOSE = { sme: "Additional working capital for inventory.", salary: "Home repairs before the rainy season.", personal: "Tuition fees for the coming semester." };
async function fillDetails() {
  const { rows } = await db.query(`select a.id as app_id, b.id as b_id, b.full_name, p.name as product, a.amount from applications a
      join borrowers b on b.id = a.borrower_id join loan_products p on p.id = a.product_id where b.birth_date is null order by a.reference`);
  for (const r of rows) {
    const h = [...r.full_name].reduce((x, c) => (x * 31 + c.charCodeAt(0)) >>> 0, 7), pick = (L, k = 0) => L[(h >>> k) % L.length];
    const kind = r.product.split(" ")[0].toLowerCase(), last = r.full_name.split(" ").slice(-1)[0];
    const dob = `${1965 + (h % 30)}-${String(1 + (h >>> 3) % 12).padStart(2, "0")}-${String(1 + (h >>> 5) % 28).padStart(2, "0")}`;
    const d = (n) => String((h >>> n) % 1000).padStart(3, "0");
    await db.query("update borrowers set birth_date = $2, id_type = 'TIN', id_number = $3, mobile = coalesce(mobile, $4), address = coalesce(address, $5) where id = $1",
      [r.b_id, dob, `${d(1)}-${d(4)}-${d(7)}-000`, `0917${String(h % 10000000).padStart(7, "0")}`, `${1 + h % 240} ${pick(STREETS, 2)}, ${pick(TOWNS, 4)}`]);
    const income = Math.round(Number(r.amount) / (kind === "sme" ? 2.2 : 3.5) / 100) * 100;
    const details = kind === "sme"
      ? { bizname: `${last} ${pick(BIZ, 3)[1]}`, bizreg: String(2900000 + h % 99999), biznature: pick(BIZ, 3)[0], bizyears: 2 + h % 12, income, debts: Math.round(income * 0.12 / 100) * 100, collateral: Number(r.amount) * 1.6 }
      : { employer: pick(JOBS, 3)[0], position: pick(JOBS, 3)[1], years: 1 + h % 15, income, debts: Math.round(income * 0.15 / 100) * 100 };
    await db.query("update applications set purpose = coalesce(purpose, $2), details = case when details = '{}'::jsonb then $3 else details end where id = $1", [r.app_id, PURPOSE[kind] || PURPOSE.personal, details]);
  }
  return rows.length;
}

// Sample loan accounts, so Loan accounts and Post payment have something to show: the seeded funded
// application plus four older loans, each with a payment history (one paid off, two behind).
const loans = require("../src/lib/loans");
const SAMPLE_LOANS = [
  // [borrower, product, amount, term, months since release, payments as [months after release (+ days late), share of the installment]]
  ["Herminia Cabrera", "Salary loan", 180000, 24, 3, [[1, 0, 1], [2, 0, 1]]],
  ["Ricardo Manalastas", "SME loan", 400000, 24, 7, [[1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [5, 0, 1], [6, 0, 1]]],
  ["Lorna Pangilinan", "Personal loan", 60000, 12, 5, [[1, 0, 1], [2, 12, 1], [3, 0, 0.5]]],
  ["Danilo Sarmiento", "Salary loan", 90000, 12, 6, [[1, 0, 1], [2, 0, 1]]],
  ["Teodora Bautista", "Personal loan", 30000, 6, 8, [[1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [5, 0, 1], [6, 0, 1]]],
];
async function seedAccounts(ids, list = SAMPLE_LOANS) {
  if ((await db.query("select 1 from disbursements where reference like 'PN-SAMPLE-%' limit 1")).rows[0]) return 0;   // already added
  const prod = {}; (await db.query("select * from loan_products")).rows.forEach((p) => { prod[p.name] = p; });
  const day = (d) => new Date(d).toISOString().slice(0, 10), shift = (iso, months, days) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCMonth(d.getUTCMonth() + months); d.setUTCDate(d.getUTCDate() + days); return day(d); };
  const today = day(Date.now() + 8 * 3600e3); let k = 0, rc = 0;
  for (const [who, pname, amount, term, ago, pays] of list) {
    const p = prod[pname]; let app = (await db.query("select a.id, a.reference from applications a join borrowers b on b.id = a.borrower_id where b.full_name = $1", [who])).rows[0];
    const released = shift(today, -ago, -3);
    if (!app) {
      const b = await db.query("insert into borrowers (full_name, birth_date, id_type, id_number, mobile, address) values ($1, '1979-06-15', 'TIN', $2, '09175550000', 'Malolos, Bulacan') returning id", [who, `30${k}-555-${100 + k}-000`]);
      const c = await db.query("update counters set value = value + 1 where name = $1 returning value", ["application-" + today.slice(0, 4)]);
      const ref = `APP-${today.slice(0, 4)}-${String(c.rows[0] ? c.rows[0].value : 300 + k).padStart(4, "0")}`;
      app = (await db.query(`insert into applications (reference, borrower_id, product_id, amount, term_months, status, status_since, agent_id, encoded_by, created_at, purpose, details, check_state, approved_amount, approved_term)
          values ($1, $2, $3, $4, $5, 'funded', $6::date::timestamptz, $7, $8, $6::date::timestamptz, 'Working capital.', $9, 'verified', $4, $5) returning id, reference`,
        [ref, b.rows[0].id, p.id, amount, term, released, ids["katrina.yap"], ids["liza.mendoza"], JSON.stringify({ income: amount / 3, debts: 2000, employer: "Sample employer", position: "Staff", years: 5 })])).rows[0];
    } else await db.query("update applications set approved_amount = $2, approved_term = $3, check_state = 'verified' where id = $1", [app.id, amount, term]);
    k++;
    const num = `LN-${released.slice(0, 4)}-${String(100 + k).padStart(4, "0")}`;
    const acc = (await db.query(`insert into loan_accounts (number, application_id, principal, monthly_rate, interest_method, term_months, late_penalty, released_on, opened_at)
        values ($1, $2, $3, $4, $5, $6, $7, $8::date, $8::date::timestamptz) returning id`, [num, app.id, amount, p.monthly_rate, p.interest_method, term, p.late_penalty, released])).rows[0];
    for (const r of loans.schedule(amount, term, Number(p.monthly_rate), p.interest_method, released))
      await db.query("insert into installments (account_id, n, due_on, principal, interest) values ($1, $2, $3, $4, $5)", [acc.id, r.n, r.dueOn, r.principal, r.interest]);
    const fee = loans.round(amount * Number(p.processing_fee));
    await db.query(`insert into disbursements (application_id, account_id, gross, fee, net, channel, payee, reference, released_by, released_at) values ($1, $2, $3, $4, $5, 'PESONet', $6, $7, $8, $9)`,
      [app.id, acc.id, amount, fee, amount - fee, JSON.stringify({ name: who, bank: "BDO", account: "•••• 4471" }), "PN-SAMPLE-" + k, ids["corazon.ilagan"], released]);
    for (const [m, late, share] of pays) {
      const on = shift(released, m, late); if (on > today) continue;
      const insts = (await db.query("select * from installments where account_id = $1 order by n", [acc.id])).rows;
      const due = insts[m - 1], amt = loans.round((Number(due.principal) + Number(due.interest)) * share + loans.penaltyDue(due, on, Number(p.late_penalty)));
      const { allocation } = loans.allocate(amt, insts, on, Number(p.late_penalty));
      for (const x of allocation) await db.query("update installments set paid_penalty = paid_penalty + $3, paid_interest = paid_interest + $4, paid_principal = paid_principal + $5 where account_id = $1 and n = $2", [acc.id, x.n, x.penalty, x.interest, x.principal]);
      rc++; await db.query("insert into payments (account_id, receipt, amount, paid_on, channel, reference, allocation, posted_by, posted_at) values ($1, $2, $3, $4::date, 'Bank deposit', $5, $6, $7, $4::date::timestamptz)",
        [acc.id, `OR-SAMPLE-${String(rc).padStart(4, "0")}`, amt, on, "DEP-" + (1000 + rc), JSON.stringify(allocation), ids["rodel.macaraeg"]]);
    }
    const st = loans.standing((await db.query("select * from installments where account_id = $1 order by n", [acc.id])).rows, today, Number(p.late_penalty));
    if (st.closed) await db.query("update loan_accounts set closed_on = $2 where id = $1", [acc.id, today]);
  }
  return list.length;
}

module.exports = { PASSWORD, MFA_SECRET, USERS, PRODUCTS, SAMPLE_LOANS, fillDetails, seedAccounts };

if (require.main === module) (async () => {
  const have = await db.query("select count(*)::int as n from users");
  if (have.rows[0].n > 0) {
    const n = await fillDetails();
    const ids0 = {}; (await db.query("select id, username from users")).rows.forEach((u) => { ids0[u.username] = u.id; });
    const m = await seedAccounts(ids0);
    console.log("The database already has users; none were added." + (n ? ` Filled in the borrower details of ${n} sample applications.` : "") + (m ? ` Added ${m} sample loan accounts with their payments.` : ""));
    return db.end();
  }

  const hash = await bcrypt.hash(PASSWORD, 10);
  const ids = {};
  for (const [username, full, short, role, limit] of USERS) {
    const r = await db.query(
      `insert into users (username, full_name, short_name, email, role, approval_limit, password_hash, mfa_secret)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
      [username, full, short, username + "@gr8lending.example", role, limit || null, hash, MFA_SECRET]);
    ids[username] = r.rows[0].id;
  }
  const products = {};
  for (const p of PRODUCTS) {
    const r = await db.query(
      `insert into loan_products (name, min_amount, max_amount, terms_months, monthly_rate, interest_method, processing_fee, late_penalty)
       values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`, p);
    products[p[0]] = r.rows[0].id;
  }
  const hour = 3600000;
  for (const [ref, who, product, amount, term, agent, status, hours, history] of APPS) {
    const b = await db.query("insert into borrowers (full_name) values ($1) returning id", [who]);
    const since = new Date(Date.now() - hours * hour);
    const encoder = history[0] ? history[0][1] : P;
    const a = await db.query(
      `insert into applications (reference, borrower_id, product_id, amount, term_months, status, status_since, agent_id, encoded_by, created_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $7) returning id`,
      [ref, b.rows[0].id, products[product], amount, term, status, since, agent ? ids[agent] : null, ids[encoder]]);
    let end = since.getTime();
    for (const [st, by, h] of history.slice().reverse()) {
      await db.query("insert into application_stages (application_id, status, handled_by, entered_at, left_at) values ($1, $2, $3, $4, $5)",
        [a.rows[0].id, st, ids[by], new Date(end - h * hour), new Date(end)]);
      end -= h * hour;
    }
  }
  await db.query("insert into counters (name, value) values ($1, 445) on conflict (name) do nothing", ["application-" + new Date().getFullYear()]);
  await fillDetails();
  await seedAccounts(ids);
  await audit.write({ actor: "CALMS", kind: "config", action: "Database seeded with sample data", record: "Setup" });
  console.log(`Seeded ${USERS.length} users, ${PRODUCTS.length} products and ${APPS.length} applications.`);
  console.log(`Every account's password is: ${PASSWORD}`);
  await db.end();
})().catch((e) => { console.error(e); process.exit(1); });
