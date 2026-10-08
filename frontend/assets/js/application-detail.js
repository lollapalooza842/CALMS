/* Online with ?ref=APP-…, everything comes from GET /api/applications/:ref and the prototype pickers are hidden.
   Opened from the folder (or without a reference), the sample application below is shown. */
(function () {
  var REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1];
  if (!REF || !window.CALMS || !CALMS.online) { start(null, null); return; }
  Promise.all([CALMS.api("GET", "/api/applications/" + encodeURIComponent(REF)), CALMS.api("GET", "/api/auth/me")])
    .then(function (r) { start(r[0].application, r[1].user); }, function (err) {
      if (err.status === 401) return;
      start(null, null); var n = document.getElementById("note"); if (n) n.textContent = (err.status === 404 || err.status === 403 ? err.message : "The server could not be reached.") + " Showing the sample application instead.";
    });
})();
function start(LIVE, ME) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function dur(ms) { var m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? d + "d " + (h % 24) + "h" : h ? h + "h " + (m % 60) + "m" : m ? m + "m " + Math.floor(ms / 1000 % 60) + "s" : Math.floor(ms / 1000) + "s"; }
  function when(t) { return new Date(t).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }
  var ROLES = { processor: ["Loan Processor", "Liza Mendoza", "L. Mendoza"], verifier: ["Loan Processor (second user)", "Aurelio Soriano", "A. Soriano"], underwriter: ["Lead Underwriter", "Antonio Reyes", "A. Reyes"], agent: ["Sales Agent", "Jun Espiritu", "J. Espiritu"], disbursement: ["Disbursement Officer", "Corazon Ilagan", "C. Ilagan"], auditor: ["Compliance Auditor", "Atty. Regina Sy", "R. Sy"] };
  var MAIN = [["draft", "Draft"], ["submitted", "Submitted"], ["review", "Under Review"], ["approved", "Approved"], ["awaiting", "Awaiting Borrower"], ["accepted", "Accepted"], ["funded", "Funded"]];
  /* a view: [key, label, station index, stamp, tone, held by, hours in stage, next action, role that acts, button, optional reason it is blocked] */
  var VIEWS = [
    ["draft", "Draft", 0, "Draft", "brown", "L. Mendoza", 6, "Finish encoding and submit. Two documents are still missing.", "processor", "Continue encoding"],
    ["submitted", "Submitted", 1, "Submitted", "blue", "Verification queue", 8, "A second user checks the encoded data against the documents.", "verifier", "Verify against documents"],
    ["review", "Under Review", 2, "Under Review", "blue", "A. Reyes", 19, "Underwriter decides. The system recommends manual review at Moderate risk.", "underwriter", "Open credit assessment"],
    ["awaiting", "Awaiting Borrower Acceptance", 4, "Awaiting Borrower Acceptance", "red", "J. Espiritu", 18, "The assigned sales agent conveys offer 1 and records the borrower's answer, with proof.", "agent", "Record the response"],
    ["declined", "Declined by Borrower", 4, "Declined by Borrower", "red", "A. Reyes", 3, "Underwriter revises the terms as a new offer, or rejects the application.", "underwriter", "Revise or reject"],
    ["accepted", "Accepted by Borrower", 5, "Accepted by Borrower", "green", "L. Mendoza", 5, "Print the loan agreement and disclosure statement, then upload the signed copy.", "processor", "Open loan agreement"],
    ["funded", "Funded", 6, "Funded", "green", "Loan accounts", 2, "Nothing. Loan account LN-2026-0163 is open and the schedule was sent to the borrower.", "", ""],
    ["rejected", "Rejected", 2, "Rejected", "red", "L. Mendoza", 4, "Nothing further. It was returned to the loan processor with the reason.", "processor", "Read the reason"]
  ];
  VIEWS.splice(3, 0, ["approved", "Approved", 3, "Approved", "green", "L. Mendoza", 4, "Raise the counter-offer if the terms changed, or print the loan agreement.", "processor", "Open loan agreement"]);
  var HRS = { draft: 6, submitted: 8, review: 19, approved: 0, awaiting: 18, accepted: 5 };
  var role = "agent", view = "awaiting", T0 = Date.now(), shown = false;
  if (!LIVE) try { role = localStorage.getItem("calmsDetailRole") || role; view = localStorage.getItem("calmsDetailStage") || view; } catch (e) {}
  if (!ROLES[role]) role = "agent";
  function V() { return VIEWS.filter(function (v) { return v[0] === view; })[0] || VIEWS[3]; }
  function path() { var v = V(); return v[0] === "rejected" ? ["draft", "submitted", "review"] : v[0] === "declined" ? ["draft", "submitted", "review", "approved", "awaiting"] : MAIN.slice(0, v[2] + 1).map(function (m) { return m[0]; }); }
  function times() { if (LIVE) { var o = {}; LIVE.stages.forEach(function (s) { var a = new Date(s.enteredAt).getTime(); o[s.status] = [a, Math.round((new Date(s.leftAt).getTime() - a) / 3600e3)]; }); o._since = new Date(LIVE.statusSince).getTime(); o[LIVE.status] = [o._since, -1]; if (!o.draft) o.draft = [new Date(LIVE.createdAt).getTime(), 0]; return o; }
    var v = V(), p = path(), now = T0 - v[6] * 3600e3, out = {}, t = now; out._since = now;
    if (v[0] === "declined" || v[0] === "rejected") { for (var i = p.length - 1; i >= 0; i--) { t -= (HRS[p[i]] || 0) * 3600e3; out[p[i]] = [t, HRS[p[i]] || 0]; } }
    else { out[p[p.length - 1]] = [now, -1]; for (var j = p.length - 2; j >= 0; j--) { t -= (HRS[p[j]] || 0) * 3600e3; out[p[j]] = [t, HRS[p[j]] || 0]; } }
    return out; }
  var WHO = { draft: "L. Mendoza", submitted: "L. Mendoza", review: "A. Soriano", approved: "A. Reyes", awaiting: "System", accepted: "J. Espiritu", funded: "C. Ilagan" };
  /* ---- the real application ---- */
  var NEXT = { draft: ["Finish encoding and submit.", "documents", "Continue encoding"], submitted: ["A second user checks the encoded data against the papers.", "encode-verify", "Verify against documents"],
    review: ["An underwriter assesses the credit and decides.", "credit-assessment", "Open credit assessment"], approved: ["Raise the counter-offer if the terms changed, or print the loan agreement.", "loan-agreement", "Open loan agreement"],
    awaiting: ["The sales agent conveys the offer and records the borrower's answer, with proof.", "record-answer", "Record the response"], declined: ["The underwriter revises the terms as a new offer, or rejects the application.", "counter-offers", "Revise or reject"],
    accepted: ["Print the loan agreement and disclosure statement, then upload the signed copy.", "loan-agreement", "Open loan agreement"], funded: ["Nothing. The loan account is open.", "", ""], rejected: ["Nothing further. It was returned to the loan processor with the reason.", "", ""] };
  function peso(n) { return "₱ " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  if (LIVE) {
    var A = LIVE, R0 = ME ? ME.role : "";
    role = R0 === "loan_processor" ? ((A.status === "submitted" || A.status === "draft") && !A.encodedByMe ? "verifier" : "processor") : R0 === "underwriter" || R0 === "lead_underwriter" ? "underwriter" : R0 === "sales_agent" ? "agent" : R0 === "disbursement_officer" ? "disbursement" : "auditor";
    if (ME) ROLES[role] = [ME.roleName, ME.name, ME.shortName];
    view = A.status;
    var since = new Date(A.statusSince).getTime(), hrs = Math.floor((Date.now() - since) / 3600e3);
    var hold = { submitted: "Verification queue", review: "Review queue", accepted: "Disbursement queue", funded: "Loan accounts", awaiting: A.agent || "No agent", declined: "Review queue" }[A.status] || A.encodedBy;
    VIEWS.forEach(function (v) { if (v[0] !== A.status) return; v[5] = hold; v[6] = hrs; v[7] = NEXT[v[0]][0]; v[9] = NEXT[v[0]][2]; v[10] = NEXT[v[0]][1]; });
    WHO = {}; A.stages.forEach(function (s) { WHO[s.status] = s.by || "—"; }); if (!WHO.draft) WHO.draft = A.encodedBy; if (!WHO[A.status]) WHO[A.status] = hold;
    var pg = $("protos"); if (pg) pg.style.display = "none";
    var fo = document.querySelector(".folder"); if (fo) fo.dataset.ref = A.reference;
    var ft = document.querySelector(".foot span:last-child"); if (ft) ft.textContent = "Live record from the CALMS database. Every opening of a paper or ID number is logged.";
    $("crumbRef").textContent = A.reference; $("title").textContent = A.borrower.name; document.title = "CALMS " + A.reference + " " + A.borrower.name;
    $("subline").textContent = A.product + " · asked for " + peso(A.amount) + " over " + A.termMonths + " months";
  }

  var line = $("line"), kuwa = $("kuwa"), train = $("train"), says = $("says"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i = (i + 1) % seq.length; kT = setTimeout(step, d); })(); }

  function drawLine() {
    var v = V(), T = times(), p = path();
    [].slice.call(line.querySelectorAll(".stop")).forEach(function (n) { n.remove(); });
    MAIN.forEach(function (m, i) {
      var past = p.indexOf(m[0]) >= 0 && !(i === v[2] && T[m[0]] && T[m[0]][1] < 0), here = i === v[2];
      var s = el("div", "stop " + (here ? "here" : past ? "past" : "ahead")); s.dataset.i = i;
      s.appendChild(el("span", "board-sign", m[1])); s.appendChild(el("span", "post")); s.appendChild(el("span", "dot"));
      var leg = el("div", "leg");
      if (T[m[0]]) { leg.appendChild(el("b", "", when(T[m[0]][0]))); leg.appendChild(document.createTextNode(here && T[m[0]][1] < 0 ? "here now" : "by " + WHO[m[0]] + (T[m[0]][1] ? ", stayed " + dur(T[m[0]][1] * 3600e3) : ""))); }
      else leg.textContent = here ? "" : "not reached";
      s.appendChild(leg);
      if (here && (v[0] === "declined" || v[0] === "rejected")) s.appendChild(el("span", "spurx", v[1]));
      line.appendChild(s);
    });
    var cur = line.querySelector(".stop.here"), x = cur.offsetLeft + cur.offsetWidth / 2;
    train.style.transform = "translateX(" + (x - 45) + "px)"; kuwa.style.transform = "translateX(" + (x - 48 - 62) + "px)";
    var right = x < line.clientWidth * .6; says.style.left = right ? (x + 0) + "px" : "auto"; says.style.right = right ? "auto" : (line.clientWidth - x + 118) + "px";
    var R = ROLES[role], mine = v[8] === role, late = v[6] >= 48;
    says.textContent = !v[8] ? (v[0] === "rejected" ? "Turned down and filed. Nothing to move." : "Paid out and filed. Leave it be.") : role === "auditor" ? "Look, do not touch. Everything here is on the record." : mine ? (v[6] < 1 ? "Fresh on your desk, " + R[1].split(" ")[0] + ". This one is yours." : "It has sat " + v[6] + " hour" + (v[6] === 1 ? "" : "s") + ", " + R[1].split(" ")[0] + ". This one is yours. Move.") : "Not yours to move. It waits on the " + ROLES[v[8]][0].toLowerCase() + ".";
    loop(!v[8] ? [[13, 900], [14, 900], [15, 900]] : mine ? [[22, 80], [23, 650], [24, 1500], [28, 1500]] : [[28, 2400], [3, 110]]);
  }
  function fact(box, k, val, cls) { var d = el("div", cls && cls.indexOf("wide") >= 0 ? "wide" : ""); d.appendChild(el("span", "k", k)); var v = el("span", "v" + (cls ? " " + cls.replace("wide", "") : ""), val); d.appendChild(v); box.appendChild(d); return v; }
  function draw() {
    var v = V(), T = times(), R = ROLES[role];
    $("whoName").textContent = R[1]; $("whoRole").textContent = R[0];
    drawLine();
    var st = $("stand"); st.textContent = "";
    var d0 = el("div", "wide"); d0.appendChild(el("span", "k", "Status")); d0.appendChild(el("span", "stamp " + v[4] + (shown ? " slam" : ""), v[3])); st.appendChild(d0);
    fact(st, "With", v[5], "plain"); var tv = fact(st, "In this stage", dur(Date.now() - T._since), v[6] >= 48 ? "old" : ""); tv.id = "tick"; fact(st, "Since", when(T._since) + " PST");
    var nx = $("next"); nx.textContent = ""; nx.appendChild(el("span", "k", "Next pending action")); nx.appendChild(el("p", "", v[7]));
    if (v[8]) {
      if (role === "auditor") nx.appendChild(el("div", "wait", LIVE && ME && ME.role !== "compliance_auditor" ? "Read only. A " + ME.roleName.toLowerCase() + " cannot act on an application." : "Read only. A compliance auditor cannot act on an application."));
      else if (v[8] === role) { var b = el("button", "act", v[9]); b.type = "button"; b.addEventListener("click", function () { if (LIVE && v[10]) location.href = v[10] + ".html?ref=" + LIVE.reference; else $("note").textContent = "Prototype: “" + v[9] + "” opens a page that is not built yet."; }); nx.appendChild(b); }
      else if (v[0] === "submitted" && role === "processor") nx.appendChild(el("div", "wait", "You encoded this application, so you cannot verify it. A different user must (maker-checker rule)."));
      else nx.appendChild(el("div", "wait", "Waiting on the " + ROLES[v[8]][0].toLowerCase() + (v[5].indexOf("queue") < 0 ? ", " + v[5] : "") + ". You can view it but not act."));
    }
    var w = $("who"); w.textContent = "";
    if (LIVE) { drawLive(v, T, R); shown = true; return; }
    fact(w, "Full name", "Norma Estrella", "plain"); fact(w, "Date of birth", "14 Mar 1979 (47)", "plain");
    var idv = fact(w, "TIN", "•••-•••-••21-000"); var rv = el("button", "link", "Show (logged)"); rv.type = "button"; rv.addEventListener("click", function () { idv.firstChild.textContent = "214-608-921-000"; rv.remove(); $("note").textContent = "Full ID number shown. This access was written to the audit log under " + R[1] + "."; }); idv.appendChild(rv);
    fact(w, "Mobile", "0917 555 0142"); fact(w, "Email", "none on file", "plain"); fact(w, "Sales agent", "J. Espiritu", "plain");
    fact(w, "Business", "Estrella Rice Trading, Malolos, Bulacan. Operating 9 years.", "plain wide");
    var q = $("req"); q.textContent = "";
    fact(q, "Amount asked", "₱ 300,000.00"); fact(q, "Term asked", "24 months"); fact(q, "Product", "SME loan", "plain");
    if (v[2] >= 3 && v[0] !== "rejected") { fact(q, "Amount approved", "₱ 250,000.00"); fact(q, "Term approved", "24 months"); fact(q, "Rate", "1.5% a month, diminishing"); }
    fact(q, "Purpose", "Additional working capital for the harvest season.", "plain wide");
    fact(q, "Encoded by", "L. Mendoza, " + when(T.draft[0]), "plain wide");
    /* pockets: [title, status text, state] */
    var i = v[2], rej = v[0] === "rejected", dec = v[0] === "declined", stg = v[0];
    var P = [
      ["Documents and checklist", stg === "draft" ? "4 of 6 documents on file. Missing: business permit, bank statement." : "6 of 6 documents on file.", stg === "draft" ? "now" : "done"],
      ["Encode and verify", stg === "draft" ? "Encoding in progress." : stg === "submitted" ? "Waiting for a second user to verify." : "Verified by A. Soriano. No corrections.", stg === "draft" ? "now" : stg === "submitted" ? "now" : "done"],
      ["Credit assessment", i < 2 ? "Opens once the encoded data is verified." : "FinScore 642. Debt-to-income 38.4%. Moderate risk.", i < 2 ? "lock" : stg === "review" ? "now" : "done"],
      ["Decision", i < 2 ? "Opens with the credit assessment." : stg === "review" ? "Awaiting the underwriter." : rej ? "Rejected by A. Reyes: cash flow not supported by statements." : "Approved for ₱ 250,000.00 by A. Reyes, e-signed.", i < 2 ? "lock" : stg === "review" ? "now" : "done"],
      ["Counter-offers", i < 3 || rej ? (rej ? "None issued." : "Opens if the approved terms differ from the request.") : stg === "awaiting" ? "Offer 1 with the borrower: ₱ 250,000.00 for 24 months." : dec ? "Offer 1 declined on " + when(T._since) + ". Proof on file." : "Offer 1 accepted. Signed offer sheet on file.", i < 3 || rej ? "lock" : stg === "awaiting" || dec ? "now" : "done"],
      ["Loan agreement", i < 5 ? "Opens when the borrower accepts the terms." : stg === "accepted" ? "Generated. Signed copy not yet uploaded." : "Signed copy uploaded and locked.", i < 5 ? "lock" : stg === "accepted" ? "now" : "done"],
      ["Disbursement", i < 5 ? "Opens when the signed agreement is on file." : stg === "accepted" ? "Blocked until the signed agreement is uploaded." : "Released ₱ 241,750.00 by bank transfer. Ref BT-90417.", i < 6 ? "lock" : "done"]
    ];
    if (stg === "funded") P.push(["Loan account", "LN-2026-0163. First installment due 7 Nov 2026.", "done"]);
    var pk = $("pockets"); pk.textContent = "";
    P.forEach(function (p, n) { var li = el("li"), b = el("button", "pocket " + p[2]); b.type = "button"; b.appendChild(el("i", "", p[2] === "lock" ? "–" : p[2] === "done" ? "✓" : String(n + 1)));
      var t = el("span"); t.appendChild(el("b", "", p[0])); t.appendChild(el("span", "s", p[1])); b.appendChild(t); b.appendChild(el("em", "", p[2] === "lock" ? "Locked" : p[2] === "now" ? "Open now" : "Done"));
      if (p[2] === "lock") b.setAttribute("aria-disabled", "true");
      b.addEventListener("click", function () { $("note").textContent = p[2] === "lock" ? p[0] + " is locked. " + p[1] : "Prototype: the " + p[0] + " page is not built yet."; }); li.appendChild(b); pk.appendChild(li); });
    /* log, newest first */
    var L = [], add = function (t, who, what, more) { L.push([t, who, what, more]); }, D = T;
    add(D.draft[0], "L. Mendoza", "Application created as Draft", "Loan Processor · from 10.14.2.31");
    add(D.draft[0] + 9e5, "L. Mendoza", "Signed consent form uploaded", "consent-estrella.pdf · consent time-stamped");
    add(D.draft[0] + 2.4e6, "L. Mendoza", "4 documents uploaded", "ID, DTI registration, financial statements, proof of address");
    if (D.submitted) { add(D.submitted[0] - 6e5, "L. Mendoza", "2 documents uploaded", "business permit, bank statement"); add(D.submitted[0], "L. Mendoza", "Submitted", "Reference APP-2026-0409 issued"); add(D.submitted[0] + 6e4, "System", "Notice sent to borrower by SMS", "Delivered to 0917 555 0142. No email on file."); }
    if (D.review) { add(D.review[0] - 3e5, "A. Soriano", "Encoded data verified", "No discrepancy found"); add(D.review[0], "System", "Moved to Under Review", "FinScore inquiry made with consent on file · report attached"); add(D.review[0] + 2e4, "System", "Risk assessed: Moderate", "Debt-to-income 38.4% · rule set version 14 · credit memo generated · routed to A. Reyes"); }
    if (view === "rejected") { add(T._since, "A. Reyes", "Rejected", "Reason: declared cash flow is not supported by the bank statements. Returned to L. Mendoza."); add(T._since + 6e4, "System", "Outcome sent to borrower by SMS", "Delivered. J. Espiritu alerted to inform her in person."); }
    if (D.approved) { add(D.approved[0], "A. Reyes", "Approved for ₱ 250,000.00, 24 months", "E-signed after multi-factor check · within approval limit of ₱ 500,000.00"); }
    if (D.awaiting) { add(D.awaiting[0], "System", "Counter-offer 1 raised", "Approved amount differs from the ₱ 300,000.00 requested · assigned to J. Espiritu"); add(D.awaiting[0] + 6e4, "System", "Counter-offer sent to borrower by SMS", "Delivered. J. Espiritu notified in the system and by email."); }
    if (view === "declined") add(T._since, "J. Espiritu", "Borrower declined offer 1", "Told in person · proof: written note, photo on file · returned to underwriting");
    if (D.accepted) { add(D.accepted[0], "J. Espiritu", "Borrower accepted offer 1", "Told in person · proof: signed offer sheet on file"); }
    if (D.funded) { add(D.funded[0] - 7.2e6, "L. Mendoza", "Signed loan agreement uploaded and locked", "Borrower signed on " + when(D.funded[0] - 9e6).split(",")[0]); add(D.funded[0] - 9e5, "C. Ilagan", "Payout details verified against ID", "BDO account in the borrower's name"); add(D.funded[0], "C. Ilagan", "Released ₱ 241,750.00", "Bank transfer BT-90417 · loan account LN-2026-0163 opened · schedule emailed and printed"); }
    L.sort(function (a, b) { return b[0] - a[0]; });
    var lg = $("log"); lg.textContent = "";
    L.forEach(function (x) { var li = el("li"); li.appendChild(el("time", "", when(x[0]) + " PST")); var d = el("div"); d.appendChild(el("b", "", x[2])); d.appendChild(document.createTextNode(" by " + x[1])); d.appendChild(el("small", "", x[3])); li.appendChild(d); lg.appendChild(li); });
    shown = true;
  }
  function age(d) { var b = new Date(d), n = new Date(), a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }
  function day(d) { return new Date(d).toLocaleDateString("en-PH", { day: "numeric", month: "short", year: "numeric" }); }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function drawLive(v, T, R) {
    var A = LIVE, B = A.borrower, D = A.details || {}, w = $("who"), i = v[2], stg = v[0], rej = stg === "rejected";
    fact(w, "Full name", B.name, "plain"); fact(w, "Date of birth", B.birthDate ? day(B.birthDate) + " (" + age(B.birthDate) + ")" : "not on file", "plain");
    if (B.idNumber) { var idv = fact(w, B.idType || "ID", B.idNumber); var rv = el("button", "link", "Show (logged)"); rv.type = "button";
      rv.addEventListener("click", function () { CALMS.api("POST", "/api/applications/" + A.reference + "/reveal-id").then(function (d) { idv.firstChild.textContent = d.idNumber; rv.remove(); $("note").textContent = "Full ID number shown. This access was written to the audit log under " + R[1] + "."; }, function (e) { $("note").textContent = e.message; }); });
      idv.appendChild(rv); }
    fact(w, "Mobile", B.mobile ? B.mobile.replace(/^(\d{4})(\d{3})(\d{4})$/, "$1 $2 $3") : "none on file", B.mobile ? "" : "plain"); fact(w, "Email", B.email || "none on file", "plain"); fact(w, "Sales agent", A.agent || "Walk-in, no agent", "plain");
    if (A.kind === "sme" && D.bizname) fact(w, "Business", D.bizname + (D.biznature ? ", " + D.biznature : "") + ". Operating " + D.bizyears + " year" + (D.bizyears == 1 ? "" : "s") + ". Cash flow " + peso(D.income) + " a month.", "plain wide");
    else if (D.employer) fact(w, "Employment", D.position + " at " + D.employer + ", " + D.years + " year" + (D.years == 1 ? "" : "s") + ". Earns " + peso(D.income) + " a month.", "plain wide");
    if (B.address) fact(w, "Address", B.address, "plain wide");
    var q = $("req"); q.textContent = "";
    fact(q, "Amount asked", peso(A.amount)); fact(q, "Term asked", A.termMonths + " months"); fact(q, "Product", A.product, "plain"); fact(q, "Rate", A.rate + "% a month, " + A.method);
    if (D.debts != null && D.income) fact(q, "Other debts", peso(D.debts) + " a month"); if (D.collateral) fact(q, "Collateral", peso(D.collateral));
    fact(q, "Purpose", A.purpose || "not given", "plain wide");
    fact(q, "Encoded by", A.encodedBy + ", " + when(A.createdAt), "plain wide");
    /* pockets */
    var have = {}; A.documents.forEach(function (d) { have[d.slot] = d; });
    var miss = A.checklist.filter(function (c) { return !have[c.slot]; }), onFile = A.checklist.length - miss.length;
    var docTxt = onFile + " of " + A.checklist.length + " papers on file." + (miss.length ? " Missing: " + miss.map(function (c) { return c.label.replace(/^(\w)(?=[a-z])/, function (m) { return m.toLowerCase(); }); }).join(", ") + "." : "");
    var P = [
      ["Documents and checklist", docTxt, i <= 1 && !rej ? (miss.length ? "now" : "done") : "done", "documents"],
      ["Encode and verify", stg === "draft" ? "Encoding in progress." : stg === "submitted" ? "Waiting for a second user to verify." : "Verified.", stg === "draft" || stg === "submitted" ? "now" : "done", "encode-verify"],
      ["Credit assessment", i < 2 ? "Opens once the encoded data is verified." : stg === "review" ? "In progress." : "Done.", i < 2 ? "lock" : stg === "review" ? "now" : "done", "credit-assessment"],
      ["Decision", i < 2 ? "Opens with the credit assessment." : stg === "review" ? "Awaiting the underwriter." : rej ? "Rejected." : "Approved.", i < 2 ? "lock" : stg === "review" ? "now" : "done", "decision"],
      ["Counter-offers", i < 3 || rej ? (rej ? "None issued." : "Opens if the approved terms differ from the request.") : stg === "awaiting" || stg === "declined" ? "With the borrower." : "Settled.", i < 3 || rej ? "lock" : stg === "awaiting" || stg === "declined" ? "now" : "done", "counter-offers"],
      ["Loan agreement", i < 5 ? "Opens when the borrower accepts the terms." : stg === "accepted" ? "Signed copy not yet uploaded." : "Signed copy uploaded and locked.", i < 5 ? "lock" : stg === "accepted" ? "now" : "done", "loan-agreement"],
      ["Disbursement", i < 5 ? "Opens when the signed agreement is on file." : stg === "accepted" ? "Waiting for the signed agreement." : "Released.", i < 6 ? "lock" : "done", "release-loan"]
    ];
    var pk = $("pockets"); pk.textContent = "";
    P.forEach(function (p, n) { var li = el("li"), b = el("button", "pocket " + p[2]); b.type = "button"; b.appendChild(el("i", "", p[2] === "lock" ? "–" : p[2] === "done" ? "✓" : String(n + 1)));
      var t = el("span"); t.appendChild(el("b", "", p[0])); t.appendChild(el("span", "s", p[1])); b.appendChild(t); b.appendChild(el("em", "", p[2] === "lock" ? "Locked" : p[2] === "now" ? "Open now" : "Done"));
      if (p[2] === "lock") b.setAttribute("aria-disabled", "true");
      b.addEventListener("click", function () { if (p[2] === "lock") $("note").textContent = p[0] + " is locked. " + p[1]; else location.href = p[3] + ".html?ref=" + A.reference; }); li.appendChild(b); pk.appendChild(li); });
    /* the record, newest first, straight from the audit log */
    var lg = $("log"); lg.textContent = "";
    if (!A.trail.length) lg.appendChild(el("li", "", "No entries yet. Sample applications were loaded without a history."));
    A.trail.forEach(function (x) { var li = el("li"); li.appendChild(el("time", "", when(x.at) + " PST")); var d = el("div"); d.appendChild(el("b", "", x.action)); d.appendChild(document.createTextNode(" by " + x.actor));
      var f = x.after || {}, bits = [];
      if (f.file) bits.push(f.file + (f.version > 1 ? " (version " + f.version + ")" : "")); if (f.slot && !f.file) bits.push(f.slot + (f.version ? " v" + f.version : ""));
      if (f.product) bits.push(f.product); if (f.amount) bits.push(peso(f.amount)); if (f.termMonths) bits.push(f.termMonths + " months"); if (f.idType) bits.push(f.idType);
      d.appendChild(el("small", "", bits.join(" · "))); li.appendChild(d); lg.appendChild(li); });
    /* papers on file: each opens in a new tab (and the opening is logged) */
    if (A.documents.length) { var docs = el("li"); docs.className = "files"; var dd = el("div"); dd.appendChild(el("b", "", "Papers on file")); var ul = el("small");
      A.documents.forEach(function (d, k) { if (k) ul.appendChild(document.createTextNode(" · ")); var a = el("a", "", d.name + (d.version > 1 ? " (v" + d.version + ")" : "")); a.href = "/api/applications/" + A.reference + "/documents/" + d.id; a.target = "_blank"; a.rel = "noopener"; a.title = size(d.size) + ", by " + d.by + ", " + when(d.at); ul.appendChild(a); });
      dd.appendChild(ul); docs.appendChild(el("time", "", "Now")); docs.appendChild(dd); lg.insertBefore(docs, lg.firstChild); }
  }
  var NAV = [["My Queue", 0], ["Applications", 1], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), a = el("a"); a.href = "#"; a.appendChild(el("span", "plate", n[0])); if (n[1]) a.setAttribute("aria-current", "page"); else { a.setAttribute("aria-disabled", "true"); a.title = "A separate prototype page"; }
    a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: " + n[0] + " is a separate prototype page."; }); li.appendChild(a); nav.appendChild(li); });
  if (LIVE) $("back").href = "applications.html"; else $("back").addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: Applications is a separate prototype page."; });
  var ss = $("stage"); VIEWS.forEach(function (v) { var o = el("option", "", v[1]); o.value = v[0]; ss.appendChild(o); }); ss.value = V()[0]; if (!LIVE) view = ss.value;
  ss.addEventListener("change", function () { view = ss.value; T0 = Date.now(); try { localStorage.setItem("calmsDetailStage", view); } catch (e) {} draw(); $("note").textContent = ""; });
  var rs = $("role"); Object.keys(ROLES).forEach(function (k) { var o = el("option", "", ROLES[k][0] + ": " + ROLES[k][1]); o.value = k; rs.appendChild(o); }); if (!LIVE) rs.value = role;
  rs.addEventListener("change", function () { role = rs.value; try { localStorage.setItem("calmsDetailRole", role); } catch (e) {} draw(); $("note").textContent = ""; });
  window.addEventListener("resize", drawLine);
  draw(); setInterval(function () { var t = $("tick"); if (t) t.textContent = dur(Date.now() - times()._since); }, 1000);
}
