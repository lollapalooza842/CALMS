// A quick end-to-end check against a running server: npm start in one terminal, npm test in another.
// It signs in as different roles and exercises the applications API and the audit seal.
require("dotenv").config();
const BASE = process.env.TEST_URL || `http://localhost:${process.env.PORT || 3000}`;
const PASSWORD = "Kuwa-guards-2026";
let failed = 0;
const check = (name, ok, extra = "") => { console.log((ok ? "ok   " : "FAIL ") + name + (ok ? "" : "  " + extra)); if (!ok) failed++; };

function client() {
  let cookies = {};
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", Cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") }, body: body ? JSON.stringify(body) : undefined });
    for (const c of res.headers.getSetCookie()) { const [pair] = c.split(";"); const i = pair.indexOf("="); const v = pair.slice(i + 1); if (v) cookies[pair.slice(0, i)] = v; else delete cookies[pair.slice(0, i)]; }
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
}

(async () => {
  let r = await client()("GET", "/api/health"); check("server and database are up", r.status === 200);
  r = await client()("GET", "/api/applications"); check("applications need a sign-in", r.status === 401);

  const liza = client();
  // The wrong-password check uses an account that does not exist, so running the test never counts towards locking a real one.
  r = await liza("POST", "/api/auth/login", { username: "nobody.atall", password: "wrong" }); check("wrong username or password is refused", r.status === 401);
  r = await liza("POST", "/api/auth/login", { username: "liza.mendoza", password: PASSWORD }); check("loan processor signs in without a second factor", r.data.step === "done", JSON.stringify(r.data));
  if (r.status === 423) { console.log("\nliza.mendoza is locked (5 wrong passwords). Unlock her with:  npm run unlock -- liza.mendoza\nThen run npm test again."); process.exit(1); }
  r = await liza("GET", "/api/applications"); check("processor sees the applications", r.status === 200 && r.data.applications.length >= 12, String(r.status));
  const before = r.data.applications.length;
  // ---- New application (FR-201 to FR-206) ----
  r = await liza("GET", "/api/applications/new/options"); check("the form gets products and agents from the database", r.status === 200 && r.data.products.length >= 3 && r.data.agents.some((a) => a.name === "J. Espiritu"));
  const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n").toString("base64");
  const who = "Felisa " + ["Navarro", "Dimaculangan", "Tolentino", "Lacson", "Manalo"][Date.now() % 5] + " " + Date.now().toString(36);
  const good = { product: "SME loan", amount: "200,000.00", termMonths: 24, agent: "J. Espiritu", purpose: "Working capital",
    borrower: { name: who, dob: "1980-05-17", idType: "TIN", idNo: "123-456-" + String(Date.now() % 1000).padStart(3, "0") + "-000", mobile: "09171234567", email: "", address: "12 Rizal St, Malolos, Bulacan" },
    details: { bizname: "Navarro Bakeshop", bizreg: "2917845", biznature: "bakery", bizyears: "4", income: "150,000.00", debts: "10,000.00", collateral: "" },
    consentConfirmed: true, consent: { name: "consent.pdf", data: PDF } };
  r = await liza("POST", "/api/applications", { ...good, amount: "5", termMonths: 7, borrower: { ...good.borrower, mobile: "123", dob: "2015-01-01" } });
  check("a bad application is refused with field messages", r.status === 400 && r.data.fields.amount && r.data.fields.term && r.data.fields.mobile && r.data.fields.dob, JSON.stringify(r.data));
  r = await liza("POST", "/api/applications", { ...good, consent: undefined }); check("no consent form, no application", r.status === 400 && r.data.fields.consent);
  r = await liza("POST", "/api/applications", { ...good, consent: { name: "consent.pdf", data: Buffer.from("MZ not a pdf").toString("base64") } }); check("a file that only pretends to be a PDF is refused", r.status === 400 && /not really/.test(r.data.fields.consent || ""), JSON.stringify(r.data));
  r = await liza("POST", "/api/applications", good); check("a good application is submitted with its consent form", r.status === 201 && /^APP-\d{4}-\d{4}$/.test(r.data.reference), JSON.stringify(r.data));
  const ref = r.data.reference;
  r = await liza("POST", "/api/applications", { ...good, borrower: { ...good.borrower, name: who.toUpperCase().replace(" ", "  ") } }); check("a second active one for the same borrower and product is refused", r.status === 409 && r.data.duplicate.reference === ref, JSON.stringify(r.data));
  r = await liza("GET", "/api/applications/new/check?product=SME%20loan&name=" + encodeURIComponent(who)); check("the form can warn about the duplicate while typing", r.data.duplicate && r.data.duplicate.reference === ref);

  // ---- Application detail ----
  r = await liza("GET", "/api/applications/" + ref); const A = r.data.application || {};
  check("the new application reads back as Submitted, with its consent form", r.status === 200 && A.status === "submitted" && A.documents.length === 1 && A.documents[0].slot === "consent", JSON.stringify(r.data).slice(0, 300));
  check("the ID number is masked", A.borrower && /^•••-•••-••\d-000$/.test(A.borrower.idNumber), A.borrower && A.borrower.idNumber);
  check("the record shows who encoded it", A.encodedByMe === true && A.trail.some((t) => t.action === "Submitted a new application"));
  r = await liza("POST", "/api/applications/" + ref + "/reveal-id"); check("showing the full ID works and is logged", r.status === 200 && r.data.idNumber === good.borrower.idNo);
  r = await liza("GET", "/api/applications/" + ref + "/documents/" + A.documents[0].id); check("the consent form can be opened", r.status === 200 || r.status === 0);
  r = await liza("POST", "/api/applications/" + ref + "/documents", { slot: "permit", file: { name: "permit.pdf", data: PDF } }); check("a paper can be filed", r.status === 201 && r.data.document.version === 1);
  r = await liza("POST", "/api/applications/" + ref + "/documents", { slot: "permit", file: { name: "permit-rescan.pdf", data: PDF } }); check("filing it again makes version 2, the first is kept", r.status === 201 && r.data.document.version === 2);
  r = await liza("POST", "/api/applications/" + ref + "/documents", { slot: "pay", file: { name: "x.pdf", data: PDF } }); check("a paper not on the product's checklist is refused", r.status === 400);
  r = await liza("GET", "/api/applications"); check("the list grew by one", r.data.applications.length === before + 1);

  // ---- Encode and verify: maker-checker (FR-207 to FR-209) ----
  r = await liza("GET", "/api/applications/" + ref + "/verification"); check("the encoder sees the entries but cannot check them", r.status === 200 && r.data.state === "waiting" && !r.data.canCheck && r.data.papers.length > 0, JSON.stringify(r.data).slice(0, 200));
  const keys = r.data.papers.flatMap((p) => p.fields.map((f) => f.key)), allOk = Object.fromEntries(keys.map((k) => [k, "ok"]));
  r = await liza("POST", "/api/applications/" + ref + "/verification", { decision: "verify", checks: allOk }); check("the encoder cannot verify their own entries", r.status === 403);
  const aurelio = client();
  await aurelio("POST", "/api/auth/login", { username: "aurelio.soriano", password: PASSWORD });
  r = await aurelio("GET", "/api/applications/" + ref + "/verification"); check("a second processor can check them", r.data.canCheck === true);
  r = await aurelio("POST", "/api/applications/" + ref + "/verification", { decision: "verify", checks: { name: "ok" } }); check("every entry must be checked, no shortcut", r.status === 400);
  r = await aurelio("POST", "/api/applications/" + ref + "/verification", { decision: "verify", checks: allOk }); check("it cannot be verified while papers are missing", r.status === 409, JSON.stringify(r.data));
  r = await aurelio("POST", "/api/applications/" + ref + "/verification", { decision: "return", checks: { ...allOk, idno: "flag" }, flags: { idno: { reason: "Differs from the document", note: "digits swapped" } } });
  check("a mismatch goes back to the encoder", r.status === 200 && r.data.state === "returned", JSON.stringify(r.data));
  r = await liza("POST", "/api/applications/" + ref + "/corrections", { values: { idno: good.borrower.idNo } }); check("a correction must actually change the entry", r.status === 400);
  const fixed = "987-654-321-000";
  r = await liza("POST", "/api/applications/" + ref + "/corrections", { values: { idno: fixed } }); check("the encoder corrects it and resubmits", r.status === 200 && r.data.state === "waiting", JSON.stringify(r.data));
  r = await aurelio("GET", "/api/applications/" + ref + "/verification"); const idf = r.data.papers[0].fields.find((f) => f.key === "idno");
  check("only the corrected entry needs checking again, and its old value is kept", idf.check === null && idf.was.length === 1 && idf.value === fixed && r.data.papers[0].fields.find((f) => f.key === "name").check === "ok");
  for (const slot of ["id", "reg", "fs", "addr", "bank"]) await liza("POST", "/api/applications/" + ref + "/documents", { slot, file: { name: slot + ".pdf", data: PDF } });
  r = await aurelio("POST", "/api/applications/" + ref + "/verification", { decision: "verify", checks: allOk }); check("with every paper on file it is verified", r.status === 200 && r.data.status === "review", JSON.stringify(r.data));
  r = await liza("GET", "/api/applications/" + ref); check("the application is now Under Review, with the stage on record", r.data.application.status === "review" && r.data.application.stages.some((s) => s.status === "submitted" && s.by === "A. Soriano"));
  const tonyU = client();
  await tonyU("POST", "/api/auth/login", { username: "antonio.reyes", password: PASSWORD }); await tonyU("POST", "/api/auth/verify", { code: process.env.DEV_MFA_CODE || "246810" });

  // ---- Review queue: the Lead deals the folder to a desk (Phase 6) ----
  r = await tonyU("GET", "/api/review-queue"); check("the new application waits in the arrivals basket", r.status === 200 && r.data.lead && r.data.items.some((x) => x.ref === ref && x.desk === ""), String(r.status));
  r = await tonyU("POST", "/api/review-queue/assign", { ref, to: "maricar.tolentino", reason: "Because" }); check("moving a folder needs one of the listed reasons", r.status === 400);
  r = await tonyU("POST", "/api/review-queue/assign", { ref, to: "maricar.tolentino", reason: "Workload" }); check("the Lead puts it on an underwriter's desk", r.status === 200 && r.data.items.find((x) => x.ref === ref).desk === "maricar.tolentino" && /Workload|workload/.test(r.data.log[0].text));
  const benjie = client(); await benjie("POST", "/api/auth/login", { username: "benjie.cruz", password: PASSWORD }); await benjie("POST", "/api/auth/verify", { code: process.env.DEV_MFA_CODE || "246810" });
  r = await benjie("POST", "/api/applications/" + ref + "/bureau", { simulate: "ok" }); check("another underwriter cannot work on a folder on someone else's desk", r.status === 403 && /desk/.test(r.data.error || ""));
  r = await benjie("POST", "/api/review-queue/assign", { ref, to: "benjie.cruz", reason: "Workload" }); check("only the Lead moves folders", r.status === 403);
  r = await tonyU("GET", "/api/queue"); check("the Lead's My Queue is built from the records", r.status === 200 && r.data.role === "underwriter" && Array.isArray(r.data.items));
  r = await liza("GET", "/api/queue"); check("the processor's My Queue lists her own work", r.status === 200 && r.data.role === "processor" && r.data.items.every((x) => x.page && x.ref));
  r = await liza("GET", "/api/rail"); check("the side rail gets its counts", r.status === 200 && typeof r.data.queue === "number" && typeof r.data.unread === "number");

  // ---- Credit assessment and Decision (FR-301 onward) ----
  r = await tonyU("GET", "/api/applications/" + ref + "/assessment"); check("the assessment starts without a bureau report", r.status === 200 && r.data.bureau === "none" && r.data.canInquire, JSON.stringify(r.data).slice(0, 200));
  r = await tonyU("POST", "/api/applications/" + ref + "/decision", { kind: "asis", code: "246810" }); check("no decision without a credit assessment", r.status === 409);
  r = await liza("POST", "/api/applications/" + ref + "/bureau", {}); check("a loan processor cannot ask the bureau", r.status === 403);
  r = await tonyU("POST", "/api/applications/" + ref + "/bureau", { simulate: "down" }); check("a bureau outage is recorded and the rules wait", r.status === 200 && r.data.bureau === "down" && !r.data.assessment);
  r = await tonyU("POST", "/api/applications/" + ref + "/bureau", { simulate: "ok" }); const AS = r.data;
  check("the report arrives and the rules give a tier and a recommendation", r.status === 200 && AS.report && AS.report.score >= 540 && AS.assessment && /Low|Moderate|High/.test(AS.assessment.tier) && Number.isInteger(AS.assessment.version) && AS.assessment.version >= 14, JSON.stringify(r.data).slice(0, 300));
  r = await tonyU("GET", "/api/applications/" + ref + "/decision"); const DV = r.data;
  check("the decision screen gets the limit and the recommendation", r.status === 200 && DV.me.limit === 500000 && DV.me.canDecide && DV.assessment.outcome === AS.assessment.outcome);
  r = await tonyU("POST", "/api/applications/" + ref + "/decision", { kind: "other", amount: "150,000", termMonths: 24, remarks: "Lower amount keeps the payments comfortable.", code: "000000" }); check("a wrong authenticator code signs nothing", r.status === 401);
  r = await tonyU("POST", "/api/applications/" + ref + "/decision", { kind: "other", amount: "150,500", termMonths: 24, code: "246810" }); check("granted amounts are whole thousands", r.status === 400);
  r = await tonyU("POST", "/api/applications/" + ref + "/decision", { kind: "up", remarks: "x".repeat(25), code: "246810" }); check("an amount inside the limit cannot be endorsed upward", r.status === 400);
  r = await tonyU("POST", "/api/applications/" + ref + "/decision", { kind: "other", amount: "150,000", termMonths: 24, remarks: "Lower amount keeps the monthly payments comfortable for her.", code: "246810" });
  check("approving other terms is signed and raises a counter-offer", r.status === 200 && r.data.status === "awaiting" && /^SIG-[0-9A-F]{10}$/.test(r.data.signature), JSON.stringify(r.data));
  r = await tonyU("POST", "/api/applications/" + ref + "/decision", { kind: "asis", code: "246810" }); check("a decided application cannot be decided again", r.status === 409);
  r = await liza("GET", "/api/applications/" + ref); check("the application now waits for the borrower, with the review stage on record", r.data.application.status === "awaiting" && r.data.application.stages.some((s) => s.status === "review" && s.by === "A. Reyes"));

  // ---- Counter-offers and the borrower's answer ----
  const junA = client(); await junA("POST", "/api/auth/login", { username: "jun.espiritu", password: PASSWORD });
  r = await junA("GET", "/api/applications/" + ref + "/offers"); check("the assigned sales agent sees offer 1 and can record the answer", r.status === 200 && r.data.offers.length === 1 && r.data.offers[0].amount === 150000 && r.data.canAnswer, JSON.stringify(r.data).slice(0, 200));
  const told = new Date().toISOString();
  r = await liza("POST", "/api/applications/" + ref + "/offers/1/answer", { answer: "declined", channel: "In person", toldAt: new Date().toISOString(), proof: { name: "p.pdf", data: PDF } }); check("only the assigned sales agent records the answer (BR-011)", r.status === 403, JSON.stringify(r.data));
  r = await junA("POST", "/api/applications/" + ref + "/offers/1/answer", { answer: "declined", channel: "In person", toldAt: told, note: "Wants a longer term" }); check("an answer without proof is refused", r.status === 400 && r.data.field === "proof");
  r = await junA("POST", "/api/applications/" + ref + "/offers/1/answer", { answer: "declined", channel: "In person", toldAt: told, note: "Wants a longer term", proof: { name: "note.pdf", data: PDF } }); check("the borrower's decline is recorded with proof", r.status === 200 && r.data.status === "declined", JSON.stringify(r.data));
  r = await tonyU("POST", "/api/applications/" + ref + "/offers", { amount: "150,000", termMonths: 24, remarks: "Same again", code: "246810" }); check("the declined offer cannot simply be offered again", r.status === 400);
  r = await tonyU("POST", "/api/applications/" + ref + "/offers", { amount: "150,000", termMonths: 36, remarks: "Longer term, as she asked.", code: "246810" }); check("the underwriter issues offer 2", r.status === 200 && r.data.n === 2, JSON.stringify(r.data));
  r = await junA("POST", "/api/applications/" + ref + "/offers/2/answer", { answer: "accepted", channel: "Phone call", toldAt: new Date().toISOString(), proof: { name: "call-log.pdf", data: PDF } }); check("the borrower accepts offer 2", r.status === 200 && r.data.status === "accepted");

  // ---- Loan agreement ----
  r = await liza("GET", "/api/applications/" + ref + "/agreement"); check("the agreement is drawn up at the accepted terms", r.status === 200 && r.data.amount === 150000 && r.data.term === 36 && r.data.schedule.length === 36 && r.data.canWork, JSON.stringify(r.data).slice(0, 200));
  const day = (d) => new Date(Date.now() + 8 * 3600e3 + d * 86400e3).toISOString().slice(0, 10);
  r = await liza("POST", "/api/applications/" + ref + "/agreement/signed", { signedOn: day(0), allSigned: true, file: { name: "signed.pdf", data: PDF } }); check("no signing before the disclosure statement is given", r.status === 409);
  r = await liza("POST", "/api/applications/" + ref + "/agreement/disclosure", { disclosedOn: day(0) }); check("the disclosure statement is recorded", r.status === 200 && r.data.disclosedOn === day(0));
  r = await liza("POST", "/api/applications/" + ref + "/agreement/signed", { signedOn: day(-1), allSigned: true, file: { name: "signed.pdf", data: PDF } }); check("she cannot have signed before she got the disclosure", r.status === 400 && r.data.field === "sdate");
  r = await liza("POST", "/api/applications/" + ref + "/agreement/signed", { signedOn: day(0), allSigned: true, file: { name: "signed.pdf", data: PDF } }); check("the signed agreement is filed and locked", r.status === 200 && r.data.lockedAt && !r.data.canWork, JSON.stringify(r.data).slice(0, 200));

  // ---- Release ----
  const cora2 = client(); await cora2("POST", "/api/auth/login", { username: "corazon.ilagan", password: PASSWORD }); await cora2("POST", "/api/auth/verify", { code: "246810" });
  r = await cora2("GET", "/api/disbursements"); check("it is on the disbursement shelf, ready", r.status === 200 && r.data.shelf.some((x) => x.reference === ref && x.ready));
  const pay = { channel: "pn", bank: "BDO", accountName: "Test", accountNo: "004580124471", accountNoAgain: "004580124471", idChecked: true, nameMatches: true, code: "246810" };
  r = await cora2("POST", "/api/applications/" + ref + "/release", { ...pay, accountNoAgain: "004580124417" }); check("an account number typed differently the second time stops the release", r.status === 400 && r.data.field === "acct2");
  r = await liza("POST", "/api/applications/" + ref + "/release", pay); check("only a disbursement officer can release money", r.status === 403);
  r = await cora2("POST", "/api/applications/" + ref + "/release", pay); const ACC = r.data.account;
  check("the money is released and a loan account opens", r.status === 200 && /^LN-\d{4}-\d{4}$/.test(ACC) && r.data.net === 145050, JSON.stringify(r.data));
  r = await cora2("POST", "/api/applications/" + ref + "/release", pay); check("it cannot be released twice", r.status === 409);

  // ---- Loan account and payments ----
  const rodel = client(); await rodel("POST", "/api/auth/login", { username: "rodel.macaraeg", password: PASSWORD });
  r = await rodel("GET", "/api/loan-accounts"); check("the account officer sees the new account", r.status === 200 && r.data.accounts.some((a) => a.number === ACC && a.bucket === "current"));
  r = await rodel("GET", "/api/loan-accounts/" + ACC); const L1 = r.data; check("the account has a 36-month schedule", L1.schedule && L1.schedule.length === 36 && Math.abs(L1.schedule.reduce((s, x) => s + x.principal, 0) - 150000) < 0.01, JSON.stringify(r.data).slice(0, 200));
  r = await rodel("POST", "/api/loan-accounts/" + ACC + "/payments", { amount: "999999", paidOn: day(0), channel: "Cash at the branch" }); check("a payment larger than the whole balance is refused", r.status === 400);
  const first = L1.schedule[0], due1 = Math.round((first.principal + first.interest) * 100) / 100;
  r = await rodel("POST", "/api/loan-accounts/" + ACC + "/payments", { amount: String(due1), paidOn: day(0), channel: "GCash", reference: "GC-1001" }); const REC = r.data.receipt;
  check("a payment is posted and split into interest and principal", r.status === 201 && /^OR-/.test(REC) && r.data.allocation[0].interest === first.interest && r.data.allocation[0].principal === first.principal, JSON.stringify(r.data));
  r = await rodel("POST", "/api/loan-accounts/" + ACC + "/payments", { amount: "100", paidOn: day(0), channel: "GCash", reference: "GC-1001" }); check("the same reference cannot be posted twice", r.status === 409);
  r = await rodel("POST", "/api/loan-accounts/" + ACC + "/payments/" + REC + "/reverse", { reason: "Posted to the wrong account" }); check("the person who posted a payment cannot reverse it", r.status === 403);
  const mila = client(); await mila("POST", "/api/auth/login", { username: "mila.ramos", password: PASSWORD });
  r = await mila("POST", "/api/loan-accounts/" + ACC + "/payments/" + REC + "/reverse", { reason: "Posted to the wrong account" }); check("a manager reverses it with a reversal entry", r.status === 200 && /^RV-/.test(r.data.receipt), JSON.stringify(r.data));
  r = await rodel("GET", "/api/loan-accounts/" + ACC); check("after the reversal nothing is paid, and both entries stay on record", r.data.schedule[0].paidPrincipal === 0 && r.data.payments.length === 2 && r.data.payments[0].reversedBy);
  r = await mila("POST", "/api/loan-accounts/" + ACC + "/payments/" + REC + "/reverse", { reason: "Posted to the wrong account" }); check("a payment cannot be reversed twice", r.status === 409);

  const tony = client();
  r = await tony("POST", "/api/auth/login", { username: "antonio.reyes", password: PASSWORD }); check("underwriter is asked for a second factor", r.data.step === "mfa");
  r = await tony("GET", "/api/applications"); check("password alone is not a session", r.status === 401);
  r = await tony("POST", "/api/auth/verify", { code: "000000" }); check("a wrong code is refused", r.status === 401);
  r = await tony("POST", "/api/auth/verify", { code: process.env.DEV_MFA_CODE || "246810" }); check("the right code signs in", r.data.step === "done", JSON.stringify(r.data));
  r = await tony("POST", "/api/applications", { product: "SME loan" }); check("an underwriter cannot create applications", r.status === 403);
  r = await tony("POST", "/api/applications/" + ref + "/documents", { slot: "permit", file: { name: "p.pdf", data: PDF } }); check("an underwriter cannot file papers", r.status === 403);

  const jun = client();
  await jun("POST", "/api/auth/login", { username: "jun.espiritu", password: PASSWORD });
  r = await jun("GET", "/api/applications"); check("a sales agent sees only their own", r.status === 200 && r.data.applications.length > 0 && r.data.applications.every((a) => a.agent === "J. Espiritu"));
  r = await jun("GET", "/api/applications/APP-2026-0377"); check("a sales agent cannot open someone else's application", r.status === 403);
  r = await jun("POST", "/api/applications", good); check("a sales agent cannot encode an application (UC-7)", r.status === 403);

  const cora = client();
  await cora("POST", "/api/auth/login", { username: "corazon.ilagan", password: PASSWORD }); await cora("POST", "/api/auth/verify", { code: process.env.DEV_MFA_CODE || "246810" });
  r = await cora("GET", "/api/applications"); check("a disbursement officer cannot open applications", r.status === 403);

  const reg = client();
  await reg("POST", "/api/auth/login", { username: "regina.sy", password: PASSWORD });
  r = await reg("GET", "/api/audit/verify"); check("the audit seal is unbroken", r.status === 200 && r.data.unbroken === true, JSON.stringify(r.data));
  // ---- Phase 5: administration and oversight ----
  r = await reg("GET", "/api/audit?days=30"); check("the auditor reads the audit log in words", r.status === 200 && r.data.entries.length > 0 && r.data.entries.some((e) => e.text === "Posted payment" || /Posted payment/.test(e.text)), String(r.status));
  r = await reg("POST", "/api/audit/export", { count: 5, format: "spreadsheet", filters: { kind: "pay" } }); r = await reg("GET", "/api/audit?days=1");
  check("an export is itself written to the log", r.data.entries[0].text === "Exported audit records" && r.data.entries[0].kind === "audit");
  r = await reg("POST", "/api/audit/check"); check("the seal check runs and is unbroken", r.data.unbroken === true);
  r = await reg("GET", "/api/users"); check("an auditor cannot manage users", r.status === 403);
  r = await reg("GET", "/api/reports"); check("reports have three periods and aging", r.status === 200 && r.data.periods.last && r.data.aging.length === 5 && r.data.aging.reduce((s, a) => s + a[2], 0) > 0, JSON.stringify(r.data).slice(0, 200));
  r = await liza("GET", "/api/reports"); check("a loan processor cannot open reports", r.status === 403);
  r = await liza("GET", "/api/notifications"); check("the processor has notices about her work", r.status === 200 && Array.isArray(r.data.notices));
  if (r.data.notices.length) { const id = r.data.notices[0].id; await liza("POST", "/api/notifications/read", { ids: [id], read: true }); r = await liza("GET", "/api/notifications"); check("a notice can be marked as read", r.data.notices.find((n) => n.id === id).un === 0);
    await liza("POST", "/api/notifications/read", { ids: [id], read: false }); }
  r = await liza("GET", "/api/me"); check("My profile reads the account", r.status === 200 && r.data.user.username === "liza.mendoza" && r.data.prefs.length === 8);
  r = await liza("PUT", "/api/me/mobile", { mobile: "12345" }); check("a bad mobile number is refused", r.status === 400);
  r = await liza("PUT", "/api/me/notifications", { prefs: r.data ? Array(8).fill([1, 0, 0]) : [], quiet: { on: true, from: "19:00", to: "19:00" } }); check("quiet hours that start and end together are refused", r.status === 400);

  const paolo = client();
  await paolo("POST", "/api/auth/login", { username: "paolo.ventura", password: PASSWORD }); await paolo("POST", "/api/auth/verify", { code: process.env.DEV_MFA_CODE || "246810" });
  r = await paolo("GET", "/api/users"); check("the administrator sees every account", r.status === 200 && r.data.users.length >= 12 && r.data.me === "paolo.ventura");
  r = await paolo("PATCH", "/api/users/paolo.ventura", { role: "loan_processor" }); check("nobody changes their own role", r.status === 403);
  r = await paolo("PATCH", "/api/users/benjie.cruz", { role: "underwriter", limit: "5000" }); check("an approval limit under 10,000 is refused", r.status === 400);
  r = await paolo("POST", "/api/users", { name: "Smoke Tester", email: "smoke.tester@gr8lending.example", role: "Loan Processor" });
  if (r.status === 400 && r.data.fields && /already/.test(r.data.fields.email || "")) { await paolo("POST", "/api/users/smoke.tester/reactivate"); r = await paolo("POST", "/api/users/smoke.tester/reset-password"); }
  check("an account is added (or reset) with a one-time password", (r.status === 201 || r.status === 200) && /^Gr8-/.test(r.data.tempPassword || ""), JSON.stringify(r.data));
  const temp = r.data.tempPassword, smoke = client();
  r = await smoke("POST", "/api/auth/login", { username: "smoke.tester", password: temp }); check("the new person signs in with it", r.data.step === "done" && r.data.user.mustChangePassword === true, JSON.stringify(r.data));
  r = await smoke("POST", "/api/me/password", { current: temp, next: "short" }); check("a weak new password is refused", r.status === 400);
  const newPw = "Owl-watch-" + Date.now().toString(36) + "X";
  r = await smoke("POST", "/api/me/password", { current: temp, next: newPw }); check("they change it to their own", r.status === 200);
  r = await smoke("GET", "/api/me"); check("and stay signed in", r.status === 200 && r.data.mustChangePassword === false);
  r = await paolo("POST", "/api/users/smoke.tester/reset-password", { password: "short" }); check("a weak password typed by the administrator is refused", r.status === 400 && r.data.fields && r.data.fields.pw);
  const typed = "Brass-lamp-" + Date.now().toString(36) + "Q";
  r = await paolo("POST", "/api/users/smoke.tester/reset-password", { password: typed, mustChange: false }); check("the administrator can type the new password", r.status === 200 && r.data.passwordSet === true && r.data.tempPassword === null);
  const smoke2 = client(); r = await smoke2("POST", "/api/auth/login", { username: "smoke.tester", password: typed }); check("the person signs in with the typed password", r.data.step === "done" && r.data.user.mustChangePassword === false, JSON.stringify(r.data));
  r = await smoke("GET", "/api/me"); check("their older sessions were ended", r.status === 401);
  r = await paolo("POST", "/api/users/smoke.tester/deactivate", {}); check("deactivating needs a reason", r.status === 400);
  r = await paolo("POST", "/api/users/smoke.tester/deactivate", { reason: "Left the company" }); check("an account is deactivated, not deleted", r.status === 200 && r.data.user.status === "off");
  r = await smoke2("GET", "/api/me"); check("a deactivated person is signed out at once", r.status === 401);
  r = await paolo("GET", "/api/products-rules"); check("the rules screen reads products and the rule set in force", r.status === 200 && r.data.products.length >= 3 && r.data.rule.dtiM === r.data.policy.dtiMax && r.data.products[0].docs.includes("id"));
  const pr = r.data;
  r = await paolo("POST", "/api/rule-sets", { rule: pr.rule, house: pr.house, reason: "short" }); check("publishing needs a reason", r.status === 400);
  r = await paolo("POST", "/api/rule-sets", { rule: { ...pr.rule, dtiA: 60 }, house: pr.house, reason: "Testing a line above the decline line" }); check("an automatic-approval line above the decline line is refused", r.status === 400);
  r = await paolo("GET", "/api/system/health"); check("the system page rings each service", r.status === 200 && r.data.services.find((s) => s.id === "db").st === "ok" && r.data.services.find((s) => s.id === "seal").st === "ok");
  r = await paolo("GET", "/api/templates"); const tp = r.data.templates && r.data.templates[0];
  r = await paolo("PUT", "/api/templates/" + tp.id, { ...tp, sms_t: "Hi {first_name}, your balance is {balance}." }); check("a message with a balance in it is refused", r.status === 400);

  // ---- Papers CALMS issues: statement, schedule, clearance, credit memo, reports for the regulator ----
  await rodel("POST", "/api/auth/login", { username: "rodel.macaraeg", password: PASSWORD });
  r = await rodel("GET", "/api/loan-accounts"); const openAcc = r.data.accounts.find((a) => !a.closed), paidAcc = r.data.accounts.find((a) => a.closed);
  r = await rodel("POST", "/api/loan-accounts/" + openAcc.number + "/statement"); check("a statement of account is issued with its own number", r.status === 200 && /^SOA-\d{4}-\d{4}$/.test(r.data.number) && r.data.sections.length >= 3, JSON.stringify(r.data).slice(0, 200));
  r = await rodel("POST", "/api/loan-accounts/" + openAcc.number + "/schedule"); check("the payment schedule is issued to print", r.status === 200 && /^SCH-/.test(r.data.number));
  r = await rodel("POST", "/api/loan-accounts/" + openAcc.number + "/clearance"); check("no clearance while money is still owed", r.status === 409);
  if (paidAcc) { r = await rodel("POST", "/api/loan-accounts/" + paidAcc.number + "/clearance"); const first = r.status === 200 ? r.data.number : r.data.number;
    check("a fully paid loan gets a clearance", (r.status === 200 && /^CL-/.test(first)) || (r.status === 409 && /^CL-/.test(first || "")), JSON.stringify(r.data));
    r = await rodel("POST", "/api/loan-accounts/" + paidAcc.number + "/clearance"); check("a clearance is issued only once", r.status === 409);
    r = await liza("GET", "/api/papers/" + first); check("an issued paper can be printed again, as it was", r.status === 200 && r.data.number === first); }
  r = await tonyU("POST", "/api/applications/" + ref + "/memo"); check("the credit memo is issued to save as PDF", r.status === 200 && /^MEMO-/.test(r.data.number) && r.data.sections.some((x) => x.pre));
  r = await jun("POST", "/api/applications/" + ref + "/memo"); check("a sales agent cannot take the credit memo", r.status === 403);
  r = await reg("GET", "/api/regulatory"); check("the regulator's reports list their schedule", r.status === 200 && r.data.reports.length === 3);
  { const res = await fetch(BASE + "/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: { title: "x", rows: [["a"], ["b"]] } }) }); check("a PDF needs a sign-in", res.status === 401); }
  r = await reg("POST", "/api/regulatory/aging/run"); check("a report for the regulator can be run now and is kept", r.status === 200 && /^REG-/.test(r.data.number) && r.data.period.label);
  r = await jun("GET", "/api/regulatory"); check("a sales agent cannot run the regulator's reports", r.status === 403);
  r = await paolo("PUT", "/api/settings/company", { name: "" }); check("the letterhead needs the company's name", r.status === 400);

  r = await liza("POST", "/api/auth/logout"); r = await liza("GET", "/api/auth/me"); check("signing out ends the session", r.status === 401);

  console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  if (/fetch failed|ECONNREFUSED/.test(e.message + (e.cause ? e.cause.code : ""))) console.error("Could not reach the server at " + BASE + ". Is it running?");
  else console.error("The test stopped early because an earlier check failed: " + e.message);
  process.exit(1);
});
