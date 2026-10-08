// Wipes the database and fills it with a clean, believable demo: npm run db:reset
//
// Everything is made through CALMS itself (the same API the screens use), so every application has its real
// papers, checks, decisions, signatures and audit entries. Afterwards the times are spread out over the last
// few days, so the queues show waiting times and a couple of applications are overdue.
//
// What is kept: the office settings (company details, escalation hours, idle time) and the message templates.
// What is lost: every application, loan, payment, audit entry, and every account added on Users and roles.
// The twelve demo accounts come back with the password Kuwa-guards-2026.
//
//   npm run db:reset            asks you to type RESET first
//   npm run db:reset -- --yes   no question (for scripts)
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const PDFDocument = require("pdfkit");
const db = require("../src/db");
const audit = require("../src/lib/audit");
const totp = require("../src/lib/totp");
const seed = require("./db-seed");

const HOUR = 3600e3;
const say = (s) => console.log(s);

async function confirm() {
  if (process.argv.includes("--yes")) return true;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const host = (process.env.DATABASE_URL || "").replace(/^.*@/, "").replace(/\/.*$/, "");
  say("\nThis ERASES every application, loan, payment, audit entry and added account in the database at");
  say("  " + host);
  say("and puts back the clean demo data. Office settings and message templates are kept.\n");
  const answer = await new Promise((r) => rl.question("Type RESET to go ahead: ", r)); rl.close();
  return answer.trim() === "RESET";
}

// ---------- 1. empty the database ----------
async function wipe() {
  const rows = (sql) => db.query(sql).then((r) => r.rows, () => []);   // a brand-new database has no such tables yet
  const keep = {
    settings: await rows("select key, value from settings where key not in ('mail_cursor', 'audit_acknowledged')"),
    templates: await rows("select * from message_templates"),
  };
  const tables = (await db.query("select tablename from pg_tables where schemaname = 'public'")).rows.map((r) => `"${r.tablename}"`);
  // TRUNCATE does not fire the row triggers that keep the records append-only, so it can clear them.
  if (tables.length) await db.query(`truncate ${tables.join(", ")} restart identity cascade`);
  const dir = path.join(__dirname, "..", "sql");
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await db.query(fs.readFileSync(path.join(dir, f), "utf8"));
  for (const s of keep.settings) await db.query("insert into settings (key, value) values ($1, $2) on conflict (key) do update set value = excluded.value", [s.key, JSON.stringify(s.value)]);
  for (const t of keep.templates) await db.query("update message_templates set by_email = $2, by_sms = $3, by_app = $4, subject = $5, body = $6 where id = $1", [t.id, t.by_email, t.by_sms, t.by_app, t.subject, t.body]);
}

// ---------- 2. people and products ----------
async function people() {
  const hash = await bcrypt.hash(seed.PASSWORD, 10), ids = {};
  for (const [username, full, short, role, limit] of seed.USERS) {
    const r = await db.query(`insert into users (username, full_name, short_name, email, role, approval_limit, password_hash, mfa_secret, password_changed_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, now()) returning id`, [username, full, short, username + "@gr8lending.example", role, limit || null, hash, seed.MFA_SECRET]);
    ids[username] = r.rows[0].id;
  }
  for (const p of seed.PRODUCTS) await db.query(`insert into loan_products (name, min_amount, max_amount, terms_months, monthly_rate, interest_method, processing_fee, late_penalty)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`, p);
  const year = new Date(Date.now() + 8 * HOUR).getUTCFullYear();
  await db.query("insert into counters (name, value) values ($1, 360) on conflict (name) do update set value = 360", ["application-" + year]);
  await audit.write({ actor: "CALMS", kind: "config", action: "Demo data reset: accounts and loan products put back", record: "Setup" });
  return ids;
}

// ---------- 3. a little CALMS of our own, to talk to ----------
let BASE = "";
function client() {
  const cookies = {};
  return async (method, p, body) => {
    const res = await fetch(BASE + p, { method, headers: { "Content-Type": "application/json", Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") }, body: body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie()) { const [pair] = c.split(";"); const i = pair.indexOf("="); const v = pair.slice(i + 1); if (v) cookies[pair.slice(0, i)] = v; else delete cookies[pair.slice(0, i)]; }
    const data = await res.json().catch(() => ({}));
    if (res.status >= 400) throw new Error(`${method} ${p} -> ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
    return data;
  };
}
const code = () => totp.codeAt(seed.MFA_SECRET, Math.floor(Date.now() / 30000));
async function signIn(username) {
  const c = client(); const r = await c("POST", "/api/auth/login", { username, password: seed.PASSWORD });
  if (r.step === "mfa") await c("POST", "/api/auth/verify", { code: code() });
  c.code = code; return c;
}

// Sample papers: a real one-page PDF that says what it stands for, so opening one in the demo shows something sensible.
const LABEL = { consent: "Signed consent form", id: "Government ID", pay: "Pay stubs", coe: "Certificate of employment", addr: "Proof of billing", bank: "Bank statement",
  income: "Proof of income", reg: "DTI registration", fs: "Financial statements", permit: "Business permit", proof: "Borrower's answer to the offer", agreement: "Signed loan agreement" };
function samplePdf(what, who) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 }), out = [];
    doc.on("data", (c) => out.push(c)); doc.on("end", () => resolve(Buffer.concat(out).toString("base64")));
    doc.registerFont("b", path.join(__dirname, "..", "fonts", "DejaVuSans-Bold.ttf")); doc.registerFont("r", path.join(__dirname, "..", "fonts", "DejaVuSans.ttf"));
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(1).dash(4, { space: 3 }).stroke("#9a8a74");
    doc.font("b").fontSize(10).fillColor("#9a8a74").text("SAMPLE PAPER FOR THE CALMS DEMO", { align: "center" }).moveDown(2);
    doc.font("b").fontSize(18).fillColor("#21170F").text(what, { align: "center" }).moveDown(0.6);
    doc.font("r").fontSize(12).text(who, { align: "center" }).moveDown(2);
    doc.fontSize(9).fillColor("#5B4A3A").text("This stands in for the scanned paper. It was made by npm run db:reset and is not a real document.", { align: "center" });
    doc.end();
  });
}
const file = async (slot, who) => ({ name: slot + "-" + who.split(" ").pop().toLowerCase() + ".pdf", data: await samplePdf(LABEL[slot] || slot, who) });

// ---------- 4. the clock: each step is stamped "hours ago", and afterwards every time is moved there ----------
const marks = {};   // ref -> [{ real, fake }]
// "real" is the database's own clock, so a few seconds' difference between this computer and Supabase does not matter.
const dbNow = async () => Number((await db.query("select extract(epoch from clock_timestamp()) * 1000 as t")).rows[0].t);
const at = async (ref, hoursAgo, real) => { (marks[ref] = marks[ref] || []).push({ real: real || await dbNow(), hoursAgo }); };
const manilaDay = (ms) => new Date(ms + 8 * HOUR).toISOString().slice(0, 10);

async function backdate() {
  const now = await dbNow();
  const cols = (await db.query(`select c.table_name, c.column_name from information_schema.columns c
      where c.table_schema = 'public' and c.data_type like 'timestamp%' and c.table_name in
        (select table_name from information_schema.columns where table_schema = 'public' and column_name = 'application_id')`)).rows;
  const byTable = {}; cols.forEach((c) => (byTable[c.table_name] = byTable[c.table_name] || []).push(c.column_name));
  byTable.applications = ["created_at", "status_since", "submitted_at", "assigned_at"];
  const ids = (await db.query("select id, reference from applications")).rows;
  await db.transaction(async (tx) => {
    const touched = [...Object.keys(byTable), "offer_answers", "audit_log"];
    for (const t of touched) await tx.query(`alter table "${t}" disable trigger user`);   // only inside this transaction; the records stay append-only for everyone else
    for (const { id, reference } of ids) {
      const m = marks[reference]; if (!m) continue;
      // a time t after mark i moves back by (mark i's real time - its demo time); earlier marks first
      const shift = (col) => "case " + m.slice().reverse().map((x) => `when ${col} >= to_timestamp(${x.real / 1000}) then ${col} - interval '${Math.round(x.real - (now - x.hoursAgo * HOUR))} milliseconds'`).join(" ") + ` else ${col} end`;
      for (const [t, cs] of Object.entries(byTable)) {
        const key = t === "applications" ? "id" : "application_id";
        await tx.query(`update "${t}" set ${cs.map((c) => `"${c}" = ${shift(`"${c}"`)}`).join(", ")} where ${key} = $1`, [id]);
      }
      await tx.query(`update offer_answers set told_at = ${shift("told_at")}, recorded_at = ${shift("recorded_at")} where offer_id in (select id from counter_offers where application_id = $1)`, [id]);
      await tx.query(`update audit_log set "at" = ${shift('"at"')} where record = $1`, [reference]);
    }
    for (const t of touched) await tx.query(`alter table "${t}" enable trigger user`);
  });
}

// ---------- 5. the story ----------
// Borrowers. Each gets a different ID number and mobile so they never look like duplicates.
let n = 0;
function borrower(name, kind, o = {}) {
  n++;
  const town = ["Malolos, Bulacan", "Apalit, Pampanga", "San Fernando, Pampanga", "Meycauayan, Bulacan", "Baliuag, Bulacan", "Calumpit, Bulacan", "Guiguinto, Bulacan"][n % 7];
  const street = ["Paseo del Congreso", "MacArthur Highway", "Rizal Street", "Mabini Street", "Burgos Avenue", "Gomez Street", "Del Pilar Street"][n % 7];
  const b = { name, dob: o.dob || `${1968 + (n * 7) % 25}-${String(1 + (n * 5) % 12).padStart(2, "0")}-${String(3 + (n * 11) % 25).padStart(2, "0")}`, idType: "TIN",
    idNo: `${String(310 + n * 17).slice(-3)}-${String(420 + n * 29).slice(-3)}-${String(150 + n * 41).slice(-3)}-000`, mobile: "0917" + String(4410000 + n * 7919).slice(-7),
    email: o.email || "", address: `${12 + n * 9} ${street}, ${town}` };
  const details = kind === "sme"
    ? { bizname: o.biz || name.split(" ").pop() + " Trading", bizreg: String(2917000 + n * 131), biznature: o.nature || "rice and grocery trading", bizyears: String(o.years || 3 + n % 9), income: o.income, debts: o.debts || "8,000.00", collateral: o.collateral || "" }
    : { employer: o.employer || "Department of Education", position: o.position || "Teacher II", years: String(o.years || 2 + n % 12), income: o.income, debts: o.debts || "4,500.00" };
  return { borrower: b, details };
}
const CHECK = { salary: ["consent", "id", "pay", "coe", "addr", "bank"], personal: ["consent", "id", "income", "addr"], sme: ["consent", "id", "reg", "fs", "addr", "permit", "bank"] };

async function story(ids) {
  const S = {};
  for (const u of ["liza.mendoza", "aurelio.soriano", "antonio.reyes", "maricar.tolentino", "benjie.cruz", "jun.espiritu", "katrina.yap", "corazon.ilagan", "rodel.macaraeg", "mila.ramos"]) S[u] = await signIn(u);
  const liza = S["liza.mendoza"], aurelio = S["aurelio.soriano"], tony = S["antonio.reyes"], maricar = S["maricar.tolentino"], benjie = S["benjie.cruz"];
  const jun = S["jun.espiritu"], kat = S["katrina.yap"], cora = S["corazon.ilagan"];

  // Encode: the processor types it in with the consent form, then files the other papers.
  async function encode(by, spec) {
    const kind = spec.product.split(" ")[0].toLowerCase(), who = spec.name;
    const { borrower: b, details } = borrower(who, kind, spec);
    const body = { product: spec.product, amount: spec.amount, termMonths: spec.term, agent: spec.agent || "No agent (walk-in)", purpose: spec.purpose, borrower: b, details, consentConfirmed: true, consent: await file("consent", who) };
    const t0 = await dbNow(); const r = await by("POST", "/api/applications", body); const ref = r.reference;
    await at(ref, spec.ages[0], t0);
    const want = CHECK[kind].filter((s) => s !== "consent" && !(spec.missing || []).includes(s));
    for (const slot of want) await by("POST", `/api/applications/${ref}/documents`, { slot, file: await file(slot, who) });
    return ref;
  }
  async function verify(checker, ref, hoursAgo) {
    await at(ref, hoursAgo);
    const v = await checker("GET", `/api/applications/${ref}/verification`);
    const all = Object.fromEntries(v.papers.flatMap((p) => p.fields.map((f) => [f.key, "ok"])));
    return checker("POST", `/api/applications/${ref}/verification`, { decision: "verify", checks: all });
  }
  const assign = async (ref, to, hoursAgo, reason = "Workload") => { await at(ref, hoursAgo); await tony("POST", "/api/review-queue/assign", { ref, to, reason }); };
  const bureau = async (u, ref, hoursAgo) => { await at(ref, hoursAgo); await u("POST", `/api/applications/${ref}/bureau`, { simulate: "ok" }); };
  const decide = async (u, ref, hoursAgo, body) => { await at(ref, hoursAgo); return u("POST", `/api/applications/${ref}/decision`, { ...body, code: u.code() }); };
  const answer = async (agent, ref, nOffer, hoursAgo, ans, channel, note) => { await at(ref, hoursAgo); await agent("POST", `/api/applications/${ref}/offers/${nOffer}/answer`, { answer: ans, channel, toldAt: new Date().toISOString(), note, proof: await file("proof", ref) }); };
  async function agreement(ref, hoursAgo, sign) {
    await at(ref, hoursAgo); const day = manilaDay(Date.now() - hoursAgo * HOUR);
    await liza("POST", `/api/applications/${ref}/agreement/disclosure`, { disclosedOn: day });
    if (sign) { await at(ref, sign); await liza("POST", `/api/applications/${ref}/agreement/signed`, { signedOn: manilaDay(Date.now() - sign * HOUR), allSigned: true, file: await file("agreement", ref) }); }
  }
  // Fills in the remarks an override needs: the screen asks for them only when the decision goes against the rules.
  const why = "Stable income for years, and the papers on file support the figures given.";
  const out = [];
  const add = (ref, line) => { out.push(`  ${ref}  ${line}`); };

  // 1. Submitted, papers still missing: Liza's to-do.
  let r = await encode(liza, { name: "Teresita Villanueva", product: "SME loan", amount: "450,000.00", term: 36, agent: "J. Espiritu", purpose: "Second delivery truck for the rice trading business.",
    biz: "Villanueva Rice Trading", income: "210,000.00", debts: "18,000.00", collateral: "600,000.00", missing: ["fs", "permit"], ages: [30] });
  add(r, "Teresita Villanueva, SME 450k: submitted, financial statements and business permit still missing (Liza)");

  // 2. Encoded by Aurelio, every paper in: waiting for Liza to check it (maker-checker).
  r = await encode(aurelio, { name: "Carmela Bautista", product: "Salary loan", amount: "120,000.00", term: 24, agent: "K. Yap", purpose: "Home repairs before the rainy season.",
    employer: "Bulacan Medical Center", position: "Nurse II", income: "38,500.00", ages: [6] });
  add(r, "Carmela Bautista, Salary 120k: encoded by Aurelio, waiting for Liza to verify");

  // 3. Returned: Aurelio found an ID number that does not match the paper. Liza must correct it.
  r = await encode(liza, { name: "Ramon Dela Cruz", product: "Salary loan", amount: "85,000.00", term: 18, agent: "J. Espiritu", purpose: "Tuition for his two children.",
    employer: "Meralco", position: "Line technician", income: "32,000.00", ages: [26] });
  await at(r, 20);
  { const v = await aurelio("GET", `/api/applications/${r}/verification`); const all = Object.fromEntries(v.papers.flatMap((p) => p.fields.map((f) => [f.key, "ok"])));
    await aurelio("POST", `/api/applications/${r}/verification`, { decision: "return", checks: { ...all, idno: "flag" }, flags: { idno: { reason: "Differs from the document", note: "Two digits are swapped compared with the TIN card." } } }); }
  add(r, "Ramon Dela Cruz, Salary 85k: returned to Liza, the ID number needs correcting");

  // 4. Walk-in, no sales agent: verified, in the arrivals basket, nobody assigned yet.
  r = await encode(liza, { name: "Marivic Santos-Lim", product: "Personal loan", amount: "40,000.00", term: 6, purpose: "Medical bills of her mother.",
    employer: "SM City Pampanga", position: "Sales associate", income: "21,000.00", debts: "2,000.00", ages: [9] });
  await verify(aurelio, r, 5);
  add(r, "Marivic Santos-Lim, Personal 40k (walk-in): under review, not yet assigned");

  // 5. Under review and unassigned for too long: will be escalated (over 48 hours).
  r = await encode(liza, { name: "Rosalinda Ocampo", product: "Personal loan", amount: "75,000.00", term: 12, agent: "J. Espiritu", purpose: "Tuition fees for the coming semester.",
    employer: "Puregold Price Club", position: "Store supervisor", income: "29,000.00", ages: [80] });
  await verify(aurelio, r, 58);
  add(r, "Rosalinda Ocampo, Personal 75k: under review 58 hours, nobody took it: ESCALATED");

  // 6. On Maricar's desk, bureau report in: ready for her decision.
  r = await encode(aurelio, { name: "Crisanto Navarro", product: "SME loan", amount: "250,000.00", term: 24, agent: "K. Yap", purpose: "Oven and mixer for the bakery.",
    biz: "Navarro Bakeshop", nature: "bakery", income: "140,000.00", debts: "12,000.00", ages: [40] });
  await verify(liza, r, 30); await assign(r, "maricar.tolentino", 26); await bureau(maricar, r, 3);
  add(r, "Crisanto Navarro, SME 250k: on Maricar's desk, credit report in, waiting for her decision");

  // 7. On Benjie's desk, report in.
  r = await encode(liza, { name: "Imelda Pangilinan", product: "Salary loan", amount: "90,000.00", term: 12, agent: "J. Espiritu", purpose: "Small sari-sari store for her mother.",
    employer: "Department of Education", position: "Master Teacher I", income: "45,000.00", ages: [22] });
  await verify(aurelio, r, 17); await assign(r, "benjie.cruz", 15); await bureau(benjie, r, 2);
  add(r, "Imelda Pangilinan, Salary 90k: on Benjie's desk, credit report in");

  // 8. Over Maricar's limit (300k): she endorses it up to Antonio.
  r = await encode(aurelio, { name: "Lourdes Magbanua", product: "SME loan", amount: "480,000.00", term: 36, agent: "K. Yap", purpose: "Expansion of the hardware store.",
    biz: "Magbanua Hardware", nature: "hardware and construction supply", income: "260,000.00", debts: "30,000.00", collateral: "900,000.00", ages: [70] });
  await verify(liza, r, 60); await assign(r, "maricar.tolentino", 55); await bureau(maricar, r, 30);
  await decide(maricar, r, 22, { kind: "up", remarks: "Over my limit. Strong business, eight years running, and the collateral covers the amount. I recommend approval." });
  add(r, "Lourdes Magbanua, SME 480k: Maricar endorsed it up, waiting for Antonio (Lead)");

  // 9. Antonio approved other terms: a counter-offer waits for the borrower (Jun must record her answer).
  r = await encode(liza, { name: "Norma Estrella", product: "SME loan", amount: "300,000.00", term: 24, agent: "J. Espiritu", purpose: "Stock for the Christmas season.",
    biz: "Estrella General Merchandise", nature: "sari-sari store and LPG retail", income: "120,000.00", debts: "15,000.00", ages: [60] });
  await verify(aurelio, r, 50); await assign(r, "antonio.reyes", 46, "Expertise"); await bureau(tony, r, 30);
  await decide(tony, r, 20, { kind: "other", amount: "250,000", termMonths: 24, remarks: "A lower amount keeps the monthly payment within her comfortable range. " + why });
  add(r, "Norma Estrella, SME 300k: counter-offer of 250k sent, waiting for her answer (Jun)");

  // 10. The borrower declined the counter-offer: back with Antonio to offer again or close.
  r = await encode(aurelio, { name: "Felipe Guevarra", product: "Salary loan", amount: "150,000.00", term: 24, agent: "J. Espiritu", purpose: "Motorcycle for work.",
    employer: "Meycauayan City Hall", position: "Administrative aide IV", income: "34,000.00", debts: "6,000.00", ages: [75] });
  await verify(liza, r, 66); await assign(r, "antonio.reyes", 62, "Workload"); await bureau(tony, r, 50);
  await decide(tony, r, 44, { kind: "other", amount: "100,000", termMonths: 24, remarks: "Lower amount so the payments fit his take-home pay. " + why });
  await answer(jun, r, 1, 8, "declined", "Phone call", "He needs at least 130,000 for the motorcycle he picked.");
  add(r, "Felipe Guevarra, Salary 150k: borrower declined the 100k offer, Antonio to decide what next");

  // 11. Approved as asked by Benjie: Liza prepares the agreement.
  r = await encode(liza, { name: "Josefina Abad", product: "Salary loan", amount: "65,000.00", term: 12, agent: "J. Espiritu", purpose: "Laptop for her online tutoring.",
    employer: "Bulacan State University", position: "Instructor I", income: "36,000.00", ages: [52] });
  await verify(aurelio, r, 44); await assign(r, "benjie.cruz", 40); await bureau(benjie, r, 30);
  await decide(benjie, r, 6, { kind: "asis", remarks: why });
  add(r, "Josefina Abad, Salary 65k: approved by Benjie, agreement to prepare (Liza)");

  // 12. Approved, disclosed, signed and locked: on Corazon's disbursement shelf, ready to release.
  r = await encode(aurelio, { name: "Benigno Salazar", product: "Salary loan", amount: "100,000.00", term: 24, agent: "K. Yap", purpose: "Down payment for a tricycle.",
    employer: "Puregold Price Club", position: "Warehouse supervisor", income: "41,000.00", ages: [96] });
  await verify(liza, r, 88); await assign(r, "benjie.cruz", 84); await bureau(benjie, r, 72);
  await decide(benjie, r, 50, { kind: "asis", remarks: why }); await agreement(r, 26, 4);
  add(r, "Benigno Salazar, Salary 100k: agreement signed and locked, ready to release (Corazon)");

  // 13. Declined by Maricar, with the reason on record.
  r = await encode(liza, { name: "Nestor Aguilar", product: "SME loan", amount: "200,000.00", term: 24, agent: "K. Yap", purpose: "Second-hand jeepney.",
    biz: "Aguilar Transport", nature: "passenger transport", income: "60,000.00", debts: "38,000.00", ages: [100] });
  await verify(aurelio, r, 92); await assign(r, "maricar.tolentino", 88); await bureau(maricar, r, 70);
  await decide(maricar, r, 64, { kind: "no", reason: "Debt-to-income ratio too high", remarks: "Existing loans already take more than half of the monthly income." });
  add(r, "Nestor Aguilar, SME 200k: declined, debt-to-income too high");

  // 14. Released today: a brand-new loan account (Rodel's).
  r = await encode(aurelio, { name: "Vicente Alcantara", product: "Salary loan", amount: "120,000.00", term: 24, agent: "J. Espiritu", purpose: "Renovation of the kitchen.",
    employer: "Department of Public Works and Highways", position: "Engineer II", income: "52,000.00", ages: [120] });
  await verify(liza, r, 110); await assign(r, "antonio.reyes", 104, "Expertise"); await bureau(tony, r, 98);
  await decide(tony, r, 96, { kind: "other", amount: "110,000", termMonths: 24, remarks: "Slightly lower amount to keep a buffer in his budget. " + why });
  await answer(jun, r, 1, 72, "accepted", "In person", "Signed the offer sheet at the branch.");
  await agreement(r, 30, 26);
  await at(r, 2);
  await cora("POST", `/api/applications/${r}/release`, { channel: "pn", bank: "Land Bank of the Philippines", accountName: "Vicente Alcantara", accountNo: "004580124471", accountNoAgain: "004580124471", idChecked: true, nameMatches: true, code: cora.code() });
  add(r, "Vicente Alcantara, Salary 110k: released today, new loan account (Rodel)");
  return out;
}

(async () => {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--production-too")) {
    say("NODE_ENV is production. Refusing to wipe a live database. (Add --production-too if you really mean it.)"); process.exit(1);
  }
  if (!(await confirm())) { say("Nothing was changed."); return db.end(); }
  say("\nEmptying the database...");
  await wipe();
  say("Putting back the 12 demo accounts and 3 loan products...");
  const ids = await people();

  const app = require("../src/server");
  const server = await new Promise((resolve) => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  BASE = `http://127.0.0.1:${server.address().port}`;
  say("Making the applications through CALMS itself (about a minute)...");
  const lines = await story(ids);
  server.close();

  say("Adding the older loans with their payment history...");
  await seed.seedAccounts(ids, seed.SAMPLE_LOANS);
  say("Spreading the times over the last few days...");
  await backdate();
  await require("../src/routes/queues").escalate();
  await audit.write({ actor: "CALMS", kind: "config", action: "Demo data reset finished", record: "Setup" });
  const broken = await audit.verify();

  say("\nDone. The demo now has:");
  lines.forEach((l) => say(l));
  say("  plus 5 older loans: Herminia Cabrera, Ricardo Manalastas, Lorna Pangilinan (behind), Danilo Sarmiento (behind), Teodora Bautista (fully paid)");
  say(`\nAudit seal: ${broken === null ? "unbroken" : "BROKEN at entry " + broken}.`);
  say(`Every account's password is ${seed.PASSWORD}. Underwriters, Corazon and Paolo also need the code ${process.env.DEV_MFA_CODE || "from the authenticator app"}.`);
  say("Start CALMS again with npm start.");
  await db.end();
  process.exit(0);
})().catch(async (e) => { console.error("\nThe reset stopped:", e.message); process.exit(1); });
