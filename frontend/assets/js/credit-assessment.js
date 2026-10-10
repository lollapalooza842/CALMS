/* Online with ?ref=APP-…, the verified figures, the policy (rule set), the FinScore report and the saved assessment
   come from GET /api/applications/:ref/assessment, and "Wire FinScore" asks the server, which records the report and
   runs the rules. The dials and the bench still answer what-if questions on the screen, from the same figures.
   Opened from the folder, the sample application below is used and nothing is sent. */
(function () {
  var REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1];
  if (!REF && window.CALMS && CALMS.noRecord("an application", "review-queue.html")) return;
  if (!REF || !window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/applications/" + encodeURIComponent(REF) + "/assessment").then(start, function (err) { if (err.status === 401 || CALMS.unreachable(err)) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample application instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return n.toFixed(1) + "%"; }
  function stamp() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  /* verified entries (from Encode and verify) and example policy */
  var ASK = { amt: 300000, term: 24 }, INCOME = 52000, COLL = 400000, RATE = 0.015, YEARS = 9, LIMIT = 500000;
  var POL = { dtiMax: 45, dtiAuto: 35, dtiSoft: 40, ltvMax: 80, ltvAuto: 60, fsMin: 580, fsAuto: 670, fsDecline: 500, dtiDecline: 55, autoMax: 200000, yrs: 2 };
  /* tradeline: creditor, type, opened, original or limit, balance, monthly, status, 24 months oldest first (0 on time, 1 = 30 days late, 2 = 60, 3 = 90, n = no data) */
  var TL = [
    ["BDO Unibank", "Credit card", "Mar 2019", 80000, 21400, 2140, "Current", "000000000100000000000000"],
    ["Toyota Financial Services", "Auto loan (delivery truck)", "Jun 2023", 620000, 148000, 4350, "Current", "000000000000000000000000"],
    ["Malolos Credit Cooperative", "Personal loan", "Nov 2024", 30000, 11000, 1000, "Current", "nn0000000000000000000000"],
    ["Globe Telecom", "Postpaid plan", "Jan 2018", 0, 0, 0, "Current", "000000000000000100000000"],
    ["Home Credit", "Appliance loan", "Feb 2021", 24000, 0, 0, "Closed, paid Aug 2022", "nnnnnnnnnnnnnnnnnnnnnnnn"]
  ];
  var METHOD = "diminishing", MIN = 100000, MAX = 1000000, TERMS = null, YLAB = "Operating", REPNO = "FS-88213-PH";
  function whenL(t) { return new Date(t).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  if (LIVE) {
    ASK = { amt: LIVE.ask.amount, term: LIVE.ask.term }; INCOME = LIVE.income; COLL = LIVE.collateral || 0; RATE = LIVE.rate; METHOD = LIVE.method; YEARS = LIVE.years; YLAB = LIVE.yearsLabel;
    LIMIT = LIVE.limit || 0; POL = LIVE.policy; MIN = LIVE.min; MAX = LIVE.max; TERMS = LIVE.terms;
    TL = LIVE.report ? LIVE.report.tradelines : []; if (LIVE.report) REPNO = LIVE.report.no;
  }
  var DEBT = TL.reduce(function (m, t) { return m + t[5]; }, 0), LATE12 = 0, LATE24 = 0, WORST = 0;
  TL.forEach(function (t) { t[7].split("").forEach(function (c, i) { if (c > "0" && c <= "3") { LATE24++; if (i >= 12) LATE12++; WORST = Math.max(WORST, +c); } }); });
  var S = { amt: ASK.amt, term: ASK.term, bureau: "ok", score: 642, busy: false, at: "Oct 5, 21:44:07 PST", took: 4.2 };
  if (LIVE) { S.bureau = LIVE.report ? "ok" : LIVE.bureau === "blocked" ? "consent" : LIVE.bureau === "down" ? "down" : "none"; S.score = LIVE.report ? LIVE.report.score : 0; S.at = LIVE.report ? whenL(LIVE.report.at) : ""; S.took = LIVE.report ? Math.max(.1, LIVE.report.took) : 0; if (!LIVE.report) DEBT = LIVE.debt; }
  var LOG = [["Oct 5, 21:44:03 PST", "System (on verification by A. Soriano)", "Inquiry sent. Consent record CN-0409 valid."], ["Oct 5, 21:44:07 PST", "FinScore", "200 OK. Report FS-88213-PH, score 642, 5 tradelines, 0 public records."]];
  if (LIVE) LOG = LIVE.log.map(function (l) { return [whenL(l.at), l.who, l.text]; });
  function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
  function calc(a, n) {
    var m = inst(a, n), dti = (DEBT + m) / INCOME * 100, ltv = COLL ? a / COLL * 100 : 0, has = S.bureau === "ok", fs = has ? S.score : null, R = [];
    var add = function (g, name, ok, val, lim, why) { if (!COLL && /^Loan-to-value/.test(name)) return; R.push({ g: g, name: name, ok: ok, val: val, lim: lim, why: why }); };
    add("d", "FinScore not below " + POL.fsDecline, has ? fs >= POL.fsDecline : null, has ? String(fs) : "no report", "mandatory");
    add("d", "Debt-to-income not above " + POL.dtiDecline + "%", dti <= POL.dtiDecline, pct(dti), "mandatory");
    add("d", "No open public record", has ? true : null, has ? "none found" : "no report", "mandatory");
    add("t", "FinScore at least " + POL.fsMin, has ? fs >= POL.fsMin : null, has ? String(fs) : "no report", "below this is High");
    add("t", "Debt-to-income at most " + POL.dtiMax + "%", dti <= POL.dtiMax, pct(dti), "above this is High");
    add("t", "Loan-to-value at most " + POL.ltvMax + "%", ltv <= POL.ltvMax, pct(ltv), "above this is High");
    add("t", "No payment 90 days late in 24 months", has ? WORST < 3 : null, has ? (WORST ? "worst: " + WORST * 30 + " days" : "none late") : "no report", "any is High");
    add("a", "FinScore at least " + POL.fsAuto, has ? fs >= POL.fsAuto : null, has ? String(fs) : "no report", "for Low tier");
    add("a", "Debt-to-income at most " + POL.dtiAuto + "%", dti <= POL.dtiAuto, pct(dti), "for Low tier");
    add("a", "Loan-to-value at most " + POL.ltvAuto + "%", ltv <= POL.ltvAuto, pct(ltv), "for Low tier");
    add("a", "No late payment in 12 months", has ? LATE12 === 0 : null, has ? LATE12 + " late" : "no report", "for automatic approval");
    add("a", "Amount at most " + peso(POL.autoMax), a <= POL.autoMax, peso(a), "for automatic approval");
    add("a", YLAB + " at least " + POL.yrs + " years", YEARS >= POL.yrs, YEARS + " years", "for automatic approval");
    var gd = R.filter(function (r) { return r.g === "d"; }), gt = R.filter(function (r) { return r.g === "t"; }), ga = R.filter(function (r) { return r.g === "a"; });
    var decline = gd.some(function (r) { return r.ok === false; }), high = gt.some(function (r) { return r.ok === false; }), low = ga.filter(function (r) { return /^(FinScore|Debt-to-income|Loan-to-value)/.test(r.name); }).every(function (r) { return r.ok === true; }), auto = ga.every(function (r) { return r.ok === true; });
    var tier = !has ? "None" : high ? "High" : low ? "Low" : "Moderate", out, why;
    if (!has && LIVE && S.bureau === "none") { out = "Waiting for the report"; why = "Ask FinScore for the report. The rules that need it cannot run before it arrives."; }
    else if (!has) { out = "Manual review"; why = "The bureau did not answer, so the rules that need the report could not be run. A person must decide, with or without a later report."; }
    else if (decline) { out = "Decline automatically"; why = "It breaks a mandatory rule: " + gd.filter(function (r) { return r.ok === false; })[0].name.toLowerCase() + "."; }
    else if (auto && !high) { out = "Approve automatically"; why = "Every rule for automatic approval is met."; }
    else if (high) { out = "Manual review: leans decline"; why = "High tier. " + gt.filter(function (r) { return r.ok === false; }).map(function (r) { return r.name; }).join("; ") + " failed."; }
    else if (dti > POL.dtiSoft) { out = "Manual review: approve a lower amount"; why = "Debt-to-income is between " + POL.dtiSoft + "% and " + POL.dtiMax + "%. A smaller loan would bring it down."; }
    else { out = "Manual review: leans approve"; why = "Inside every limit, but not every rule for automatic approval is met: " + ga.filter(function (r) { return r.ok !== true; }).map(function (r) { return r.name.toLowerCase(); }).join("; ") + "."; }
    return { m: m, dti: dti, ltv: COLL ? ltv : null, fs: fs, R: R, tier: tier, out: out, why: why, total: m * n };
  }
  function fitAmt(n) { var best = MIN; for (var a = MIN; a <= MAX; a += 10000) { if ((DEBT + inst(a, n)) / INCOME * 100 <= POL.dtiSoft && (!COLL || a / COLL * 100 <= POL.ltvMax)) best = a; } return best; }
  /* ---- dials ---- */
  var ns = "http://www.w3.org/2000/svg", DIAL = {};
  function mkDial(key, label, unit, min, max, bands) {
    var w = el("div", "dial"), svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 200 122"); svg.setAttribute("role", "img");
    var pt = function (v, r) { var t = Math.PI * (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)); return [100 + Math.cos(t) * r, 104 - Math.sin(t) * r]; }, from = min, S2 = function (n, at) { var e = document.createElementNS(ns, n); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); svg.appendChild(e); return e; };
    bands.forEach(function (b) { var a1 = pt(from, 70), a2 = pt(b[0], 70); S2("path", { d: "M" + a1[0].toFixed(1) + " " + a1[1].toFixed(1) + " A70 70 0 0 1 " + a2[0].toFixed(1) + " " + a2[1].toFixed(1), fill: "none", stroke: "var(--" + b[1] + ")", "stroke-width": 13 });
      if (b[0] < max) { var g1 = pt(b[0], 62), g2 = pt(b[0], 78); S2("path", { d: "M" + g1[0].toFixed(1) + " " + g1[1].toFixed(1) + " L" + g2[0].toFixed(1) + " " + g2[1].toFixed(1), stroke: "#f7e8c6", "stroke-width": 3 }); var tp = pt(b[0], 90), tx = S2("text", { x: tp[0].toFixed(1), y: (tp[1] + 4).toFixed(1), "text-anchor": "middle", "font-size": 12, fill: "currentColor", "font-family": "Courier New, monospace", "font-weight": 700 }); tx.textContent = b[0] + (unit === "%" ? "%" : ""); } from = b[0]; });
    [min, max].forEach(function (v, i) { var tp = pt(v, 70), tx = S2("text", { x: (tp[0] + (i ? 0 : 0)).toFixed(1), y: 119, "text-anchor": "middle", "font-size": 11, fill: "currentColor", "font-family": "Courier New, monospace" }); tx.textContent = v; });
    var ghost = S2("path", { d: "M100 104 L100 44", stroke: "currentColor", "stroke-width": 2, "stroke-dasharray": "3 4", opacity: 0, "class": "ndl" });
    var nd = S2("path", { d: "M100 104 L100 40", stroke: "#24130a", "stroke-width": 4, "stroke-linecap": "round", "class": "ndl" }); S2("circle", { cx: 100, cy: 104, r: 8, fill: "#c98f4a", stroke: "#24130a", "stroke-width": 3 });
    var b = el("b"), sp = el("span"), was = el("span", "was"); w.appendChild(el("em", "", label)); w.appendChild(svg); w.appendChild(b); w.appendChild(sp); w.appendChild(was);
    DIAL[key] = { set: function (v, word, ref) { var ang = function (x) { return -90 + 180 * (Math.max(min, Math.min(max, x)) - min) / (max - min); };
      if (v == null) { nd.style.transform = "rotate(-90deg)"; nd.setAttribute("opacity", .25); b.textContent = "no data"; sp.textContent = word; was.textContent = ""; ghost.setAttribute("opacity", 0); svg.setAttribute("aria-label", label + ": no data"); return; }
      nd.setAttribute("opacity", 1); nd.style.transform = "rotate(" + ang(v) + "deg)"; b.textContent = (unit === "%" ? v.toFixed(1) : v) + unit; sp.textContent = word; svg.setAttribute("aria-label", label + " " + b.textContent + ", " + word);
      if (ref != null && Math.abs(ref - v) > .05) { ghost.setAttribute("opacity", .7); ghost.style.transform = "rotate(" + ang(ref) + "deg)"; was.textContent = "as asked: " + (unit === "%" ? ref.toFixed(1) : ref) + unit; } else { ghost.setAttribute("opacity", 0); was.textContent = ""; } } };
    return w;
  }
  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[28, 2400], [3, 110]], THINK = [[4, 600], [5, 350], [6, 350], [7, 700]], ALERT = [[22, 80], [23, 700], [24, 1400]], NOD = [[18, 140], [19, 400], [18, 140]];
  /* ---- paint ---- */
  var lastTier = "", lastRules = {}, memoT = null;
  function paint() {
    var C = calc(S.amt, S.term), A0 = calc(ASK.amt, ASK.term), wi = S.amt !== ASK.amt || S.term !== ASK.term;
    $("wi").hidden = !wi;
    var wax = $("wax"); wax.className = "wax " + C.tier + (lastTier && lastTier !== C.tier ? " slam" : ""); wax.textContent = C.tier === "None" ? "?" : C.tier[0]; wax.title = C.tier === "None" ? "No tier" : C.tier + " risk";
    var tr = $("tier"); tr.textContent = C.tier === "None" ? "No tier assigned" : C.tier + " risk"; tr.appendChild(el("small", "", S.bureau === "ok" ? "Assessed in " + S.took.toFixed(1) + " seconds after the report arrived, " + S.at + "." : "Assessment incomplete."));
    var rc = $("rec"); rc.textContent = ""; rc.appendChild(el("span", "k", wi ? "At these terms the rules would say" : "The rules say")); rc.appendChild(el("b", "", C.out)); rc.appendChild(el("p", "", C.why));
    if (LIMIT && S.amt > LIMIT) rc.appendChild(el("p", "", "At " + peso(S.amt) + " this is over your " + peso(LIMIT) + " approval limit. You could only endorse it to " + (LIVE ? LIVE.upstairs || "a higher authority" : "the Chief Risk Officer") + "."));
    DIAL.dti.set(C.dti, C.dti <= POL.dtiAuto ? "comfortable" : C.dti <= POL.dtiSoft ? "inside policy" : C.dti <= POL.dtiMax ? "close to the " + POL.dtiMax + "% limit" : "over the " + POL.dtiMax + "% limit", wi ? A0.dti : null);
    if (C.ltv == null) DIAL.ltv.set(null, "unsecured loan", null); else DIAL.ltv.set(C.ltv, C.ltv <= POL.ltvAuto ? "well covered" : C.ltv <= POL.ltvMax ? "inside the " + POL.ltvMax + "% ceiling" : "over the " + POL.ltvMax + "% ceiling", wi ? A0.ltv : null);
    DIAL.fs.set(C.fs, C.fs == null ? "FinScore did not answer" : C.fs < POL.fsMin ? "poor" : C.fs < POL.fsAuto ? "fair" : "good", null);
    $("amtO").textContent = peso(S.amt); $("amt").value = S.amt; $("term").value = S.term;
    var sx = $("sumx"); sx.textContent = ""; var row = function (k, v, c) { sx.appendChild(el("dt", c || "", k)); sx.appendChild(el("dd", c || "", v)); };
    row("Existing monthly payments, from the report", peso(DEBT)); row("This loan each month (" + Math.round(RATE * 10000) / 100 + "% a month, " + METHOD + ")", peso(C.m)); row("All monthly payments", peso(DEBT + C.m), "ln"); row(LIVE && LIVE.kind !== "sme" ? "Verified monthly income" : "Verified monthly cash flow", peso(INCOME));
    row("Debt to income", pct(C.dti), "ln big"); sx.appendChild(el("div", "sp"));
    row("Amount", peso(S.amt)); if (COLL) { row(LIVE ? "Collateral, appraised" : "Collateral, appraised (delivery truck)", peso(COLL)); row("Loan to value", pct(C.ltv), "ln big"); } else row("Collateral", "none, unsecured"); sx.appendChild(el("div", "sp"));
    row("Total to repay over " + S.term + " months", peso(C.total)); row("Of which interest", peso(C.total - S.amt));
    /* rules */
    var rb = $("rules"); rb.textContent = ""; [["d", "Mandatory: failing any one declines automatically"], ["t", "Limits: failing any one makes it High risk"], ["a", "For Low tier and automatic approval: all must pass"]].forEach(function (g) {
      rb.appendChild(el("p", "grp", g[1])); var ul = el("ul", "rules"); C.R.filter(function (r) { return r.g === g[0]; }).forEach(function (r) { var st = r.ok === null ? "un" : r.ok ? "ok" : "no", key = r.name, li = el("li", st + (lastRules[key] && lastRules[key] !== st ? " chg" : "")); lastRules[key] = st;
        li.appendChild(el("i", "", r.ok === null ? "?" : r.ok ? "✓" : "×")); var d = el("span", "", r.name); d.appendChild(el("small", "", r.ok === null ? "Could not be run without the report" : r.lim)); li.appendChild(d); li.appendChild(el("b", "", r.val)); ul.appendChild(li); }); rb.appendChild(ul); });
    /* memo */
    var memo = LIVE ? "" : "GR8 LENDING COMPANY · CREDIT MEMO\nAPP-2026-0409 · Rule set version 14\n" + (wi ? "WHAT-IF DRAFT, NOT ON RECORD\n" : "") + "\nBORROWER  Norma Estrella, sole proprietor of Estrella Rice Trading, Malolos, operating " + YEARS + " years.\n\nREQUEST   " + peso(ASK.amt) + " over " + ASK.term + " months, SME loan, for working capital." + (wi ? "\nASSESSED AT  " + peso(S.amt) + " over " + S.term + " months." : "") +
      "\n\nBUREAU    " + (S.bureau === "ok" ? "FinScore " + S.score + " (fair). " + TL.length + " tradelines, " + TL.filter(function (t) { return t[6] === "Current"; }).length + " open. " + LATE24 + " payments 30 days late in 24 months, " + LATE12 + " in the last 12; all cured. No public records." : "No report. " + (S.bureau === "down" ? "FinScore was unavailable after 3 attempts." : "No inquiry was made: no valid consent on file.")) +
      "\n\nCAPACITY  Verified cash flow " + peso(INCOME) + " a month. Existing payments " + peso(DEBT) + ". New installment " + peso(C.m) + ". Debt-to-income " + pct(C.dti) + " against a limit of " + POL.dtiMax + "%.\n\nSECURITY  Delivery truck appraised at " + peso(COLL) + ". Loan-to-value " + pct(C.ltv) + " against a ceiling of " + POL.ltvMax + "%.\n\nTIER      " + (C.tier === "None" ? "Not assigned." : C.tier + ".") + "\n\nRECOMMENDATION  " + C.out + ". " + C.why +
      (S.bureau === "ok" && !wi && C.dti > POL.dtiSoft ? "\n\nThe largest amount that keeps debt-to-income at or under " + POL.dtiSoft + "% over " + ASK.term + " months is " + peso(fitAmt(ASK.term)) + "." : "") + "\n\nGenerated by the system. Not a decision.";
    if (LIVE) memo = !wi && LIVE.assessment ? LIVE.assessment.memo : "GR8 LENDING COMPANY · CREDIT MEMO\n" + LIVE.reference + " · Rule set version " + LIVE.ruleVersion + "\n" + (wi ? "WHAT-IF DRAFT, NOT ON RECORD\n\nASSESSED AT  " + peso(S.amt) + " over " + S.term + " months.\n\nCAPACITY  Debt-to-income " + pct(C.dti) + " against a limit of " + POL.dtiMax + "%." + (COLL ? " Loan-to-value " + pct(C.ltv) + "." : "") + "\n\nTIER      " + (C.tier === "None" ? "Not assigned." : C.tier + ".") + "\n\nAT THESE TERMS  " + C.out + ". " + C.why : "\nNo memo yet. It is written when the FinScore report arrives.");
    $("memo").textContent = memo; $("memoAt").textContent = wi ? "what-if draft" : LIVE ? (LIVE.assessment ? "generated " + whenL(LIVE.assessment.at) : "not yet") : "generated " + S.at;
    $("tlsum").textContent = S.bureau === "ok" ? "report " + REPNO + " · " + TL.length + " tradelines · " + (LIVE && LIVE.report ? LIVE.report.publicRecords : 0) + " public records" + (LIVE ? "" : " · 1 inquiry in 6 months") : "nothing";
    $("toDec").textContent = wi ? "Take " + peso(S.amt) + " over " + S.term + " months to the decision" : "Take the requested terms to the decision";
    if (!S.busy) { var seq = IDLE; var t = LIVE && S.bureau === "none" ? (LIVE.canInquire ? "No report yet. Wire FinScore, then we talk." : "No report yet. An underwriter wires FinScore.") : S.bureau !== "ok" ? "No report, no opinion from me. You decide this one on the papers." : wi ? (C.dti <= POL.dtiSoft && C.ltv <= POL.ltvMax ? "At " + peso(S.amt) + " she fits. It would go to her as a counter-offer." : C.dti > POL.dtiMax ? "That is past the limit. Do not even think about it." : "Still tight at " + pct(C.dti) + ". Keep going down.") : C.tier === "High" ? "High risk. If you approve, write down exactly why." : C.dti > POL.dtiSoft ? "She fits, but only just. Try a lower amount on the bench before you sign anything." : "Clean enough. Read the tradelines anyway.";
      $("says").textContent = t; if (lastTier && lastTier !== C.tier) loop(C.tier === "High" ? ALERT : NOD, function () { loop(IDLE); }); else if (!kT || !lastTier) loop(seq); }
    lastTier = C.tier; drawTL();
  }
  function drawTL() {
    var box = $("tlbox"); box.textContent = ""; if (S.bureau !== "ok") { box.appendChild(el("p", "", S.bureau === "none" ? "No report yet. Use “Wire FinScore” to ask for it; the borrower's signed consent form is on file." + (LIVE && !LIVE.consent ? "" : "") : S.bureau === "down" ? "No report. FinScore did not answer after three attempts, so there are no tradelines to show. The application stays in manual review and the inquiry can be wired again." : "No report. An inquiry cannot be made without the borrower's valid consent on file.")); return; }
    var sc = el("div", "scroll"), t = el("table"), hd = el("tr"); [["Creditor", ""], ["Opened", ""], ["Limit or original", "n"], ["Balance", "n"], ["Monthly", "n"], ["Last 24 months, oldest to newest", ""]].forEach(function (h) { var th = el("th", h[1], h[0]); th.scope = "col"; hd.appendChild(th); }); var th0 = el("thead"); th0.appendChild(hd); t.appendChild(th0); var tb = el("tbody");
    var now = new Date(), mon = function (i) { var d = new Date(now.getFullYear(), now.getMonth() - (23 - i), 1); return d.toLocaleDateString("en-PH", { month: "short", year: "numeric" }); };
    TL.forEach(function (x) { var tr = el("tr"), c = el("td", "", x[0]); c.appendChild(el("small", "", x[1] + " · " + x[6])); tr.appendChild(c); tr.appendChild(el("td", "", x[2])); tr.appendChild(el("td", "n", x[3] ? peso(x[3]) : "—")); tr.appendChild(el("td", "n", x[4] ? peso(x[4]) : "—")); tr.appendChild(el("td", "n", x[5] ? peso(x[5]) : "—"));
      var pc = el("td"), p = el("div", "punch"), late = 0; x[7].split("").forEach(function (ch, i) { var cls = ch === "n" ? "na" : ch === "0" ? "ok" : "l" + ch, cell = el("i", cls, ch > "0" && ch <= "3" ? String(+ch * 3) : ""); if (ch > "0" && ch <= "3") late++; cell.dataset.t = mon(i) + ": " + (ch === "n" ? "no data reported" : ch === "0" ? "paid on time" : (+ch * 30) + " days late"); p.appendChild(cell); });
      p.setAttribute("role", "img"); p.setAttribute("aria-label", x[0] + ": " + (x[7].indexOf("0") < 0 && late === 0 ? "no payment data in the last 24 months" : late ? late + " late payment" + (late > 1 ? "s" : "") + " in 24 months" : "every payment on time")); pc.appendChild(p); tr.appendChild(pc); tb.appendChild(tr); });
    var tf = el("tr"), l = el("td", "", "Monthly payments counted in debt-to-income"); l.colSpan = 4; l.style.fontWeight = "700"; tf.appendChild(l); tf.appendChild(el("td", "n", peso(DEBT))); tf.appendChild(el("td")); tb.appendChild(tf);
    t.appendChild(tb); sc.appendChild(t); box.appendChild(sc);
    var lg = el("div", "legend"); [["ok", "", "on time"], ["l1", "3", "30 days late"], ["l2", "6", "60 days late"], ["l3", "9", "90 days late"], ["na", "", "no data"]].forEach(function (g) { var s = el("span"), p = el("span", "punch"); p.style.gridTemplateColumns = "13px"; p.appendChild(el("i", g[0], g[1])); s.appendChild(p); s.appendChild(document.createTextNode(g[2])); lg.appendChild(s); }); lg.appendChild(el("span", "", LIVE && LIVE.report && LIVE.report.publicRecords ? "Public records: " + LIVE.report.publicRecords + " found." : "Public records: none found. The report itself is attached to the application unaltered.")); box.appendChild(lg);
  }
  /* punch card tooltip */
  var tip = null; document.addEventListener("mouseover", function (e) { var c = e.target.closest && e.target.closest(".punch i[data-t]"); if (!c) { if (tip) { tip.remove(); tip = null; } return; } if (!tip) { tip = el("div", "tip"); document.body.appendChild(tip); } tip.textContent = c.dataset.t; var r = c.getBoundingClientRect(); tip.style.left = Math.min(window.innerWidth - 240, Math.max(8, r.left - 20)) + "px"; tip.style.top = (r.top - 34) + "px"; });
  /* ---- the wire ---- */
  function wstat() { $("wstat").textContent = S.busy ? "sending" : S.bureau === "ok" ? "report on file" : S.bureau === "down" ? "no answer" : "blocked"; $("att").textContent = S.bureau === "ok" ? (LIVE ? "On file, read only: report " + REPNO + ", stored exactly as received. Simulated FinScore for this project." : "Attached, read only: finscore-report-FS-88213-PH.pdf · 184 KB · stored exactly as received, encrypted.") : "No report attached."; var il = $("ilog"); il.textContent = ""; LOG.slice().reverse().forEach(function (l) { il.appendChild(el("li", "", l[0] + "  " + l[1] + ": " + l[2])); }); $("wireBtn").setAttribute("aria-disabled", String(S.busy || (LIVE && !LIVE.canInquire))); }
  function tele(lines) { var t = $("tele"); t.textContent = ""; lines.forEach(function (l) { var s = el("span", l[1] ? "bad" : "", l[0] + "\n"); t.appendChild(s); }); }
  var REPORT = [["TO GR8 LENDING MALOLOS STOP"], ["RE ESTRELLA NORMA DELA PAZ TIN ENDING 21-000 STOP"], ["FINSCORE 642 STOP FIVE TRADELINES FOUR OPEN STOP"], ["TWO PAYMENTS THIRTY DAYS LATE IN 24 MONTHS BOTH CURED STOP"], ["NO PUBLIC RECORDS STOP REPORT FS-88213-PH FOLLOWS STOP"]];
  function liveWire() {
    if (S.busy) return; if (!LIVE.canInquire) { $("note").textContent = LIVE.status !== "review" ? "The bureau is asked only while the application is Under Review." : "Only an underwriter can wire FinScore."; return; }
    var mode = $("resp").value === "down" ? "down" : "ok", t0 = Date.now(), tm, lines = [], say = function (l, bad) { lines.push([l, bad]); tele(lines); }, tickW = function () { var s = (Date.now() - t0) / 1000; $("wsec").textContent = s.toFixed(1) + " s"; $("watch").firstChild.style.setProperty("--a", (s * 60 % 360) + "deg"); };
    S.busy = true; wstat(); loop(THINK); $("says").textContent = "Wiring FinScore. Hands off the dials."; say("INQUIRY SENT TO FINSCORE MANILA ..."); tm = setInterval(tickW, 80);
    CALMS.api("POST", "/api/applications/" + LIVE.reference + "/bureau", { simulate: mode }).then(function (d) {
      var R0 = d.report, k = reduce ? .05 : 1;
      if (!R0 || d.bureau === "down") { [1, 2, 3].forEach(function (n) { say("ATTEMPT " + n + " OF 3: NO ANSWER (503)", 1); }); say("GAVE UP AFTER 3 ATTEMPTS STOP", 1); say("APPLICATION HELD IN MANUAL REVIEW STOP"); clearInterval(tm); S.busy = false; LIVE = d; S.bureau = "down"; LOG = d.log.map(function (l) { return [whenL(l.at), l.who, l.text]; }); $("note").textContent = "FinScore did not answer (simulated outage). It stays in manual review; try again later."; wstat(); paint(); loop(ALERT, function () { loop(IDLE); }); return; }
      var rp = ["TO GR8 LENDING STOP", "RE " + d.borrower.toUpperCase() + " STOP", "FINSCORE " + R0.score + " STOP " + R0.tradelines.length + " TRADELINES STOP", (R0.publicRecords ? R0.publicRecords + " PUBLIC RECORD" : "NO PUBLIC RECORDS") + " STOP REPORT " + R0.no + " FOLLOWS STOP"], i = 0;
      (function next() { if (i < rp.length) { say(rp[i++]); setTimeout(next, 300 * k); return; }
        clearInterval(tm); say("ASSESSED: " + d.assessment.tier.toUpperCase() + " RISK STOP"); S.busy = false; LIVE = d; TL = R0.tradelines; DEBT = TL.reduce(function (m, t) { return m + t[5]; }, 0); LATE12 = 0; LATE24 = 0; WORST = 0;
        TL.forEach(function (t) { t[7].split("").forEach(function (c, j) { if (c > "0" && c <= "3") { LATE24++; if (j >= 12) LATE12++; WORST = Math.max(WORST, +c); } }); });
        REPNO = R0.no; S.bureau = "ok"; S.score = R0.score; S.at = whenL(R0.at); S.took = Math.max(.1, (Date.now() - t0) / 1000); LOG = d.log.map(function (l) { return [whenL(l.at), l.who, l.text]; });
        $("note").textContent = "Report received and assessed: " + d.assessment.tier + " risk. " + d.assessment.outcome + ". The memo is on file under rule set version " + d.assessment.version + "."; lastTier = "x"; wstat(); paint(); })();
    }, function (err) { clearInterval(tm); S.busy = false; if (err.status === 409 && /consent/i.test(err.message)) { S.bureau = "consent"; tele([["INQUIRY NOT SENT", 1], ["NO SIGNED CONSENT ON FILE", 1], ["NOTHING LEFT THIS OFFICE STOP"]]); } $("note").textContent = err.message; wstat(); paint(); loop(ALERT, function () { loop(IDLE); }); });
  }
  function wire() {
    if (LIVE) { liveWire(); return; }
    if (S.busy) return; var mode = $("resp").value, t0 = Date.now(), tm = null, lines = [], say = function (l, bad) { lines.push([l, bad]); tele(lines); }, tickW = function () { var s = (Date.now() - t0) / 1000; $("wsec").textContent = s.toFixed(1) + " s"; $("watch").firstChild.style.setProperty("--a", (s * 6 * 10 % 360) + "deg"); };
    if (mode === "consent") { S.bureau = "consent"; LOG.push([stamp(), "A. Reyes", "Inquiry BLOCKED before sending: no valid consent record."]); tele([["INQUIRY NOT SENT", 1], ["NO VALID BORROWER CONSENT ON FILE", 1], ["NOTHING LEFT THIS OFFICE STOP"]]); $("wsec").textContent = "0.0 s"; $("note").textContent = "Blocked. The system will not contact the bureau without a recorded, valid consent. The attempt is logged."; wstat(); paint(); loop(ALERT, function () { loop(IDLE); }); $("says").textContent = "No consent, no inquiry. Not even for you."; return; }
    S.busy = true; wstat(); loop(THINK); $("says").textContent = "Wiring FinScore. Hands off the dials."; LOG.push([stamp(), "A. Reyes", "Inquiry sent. Consent record CN-0409 valid."]); say("INQUIRY SENT TO FINSCORE MANILA ..."); tm = setInterval(tickW, 80);
    var k = reduce ? .05 : 1;
    if (mode === "down") { var n = 0; (function attempt() { n++; setTimeout(function () { say("ATTEMPT " + n + " OF 3: NO ANSWER (503)", 1); LOG.push([stamp(), "FinScore", "503 Service unavailable. Attempt " + n + " of 3."]); if (n < 3) { say("WAITING, THEN WIRING AGAIN ..."); attempt(); } else { clearInterval(tm); S.busy = false; S.bureau = "down"; say("GAVE UP AFTER 3 ATTEMPTS STOP", 1); say("APPLICATION HELD IN MANUAL REVIEW STOP"); LOG.push([stamp(), "System", "Retry rule exhausted. Application routed to manual review without bureau data."]); $("note").textContent = "FinScore is unavailable. After three attempts the application stays in manual review, and the rest of the system keeps working."; wstat(); paint(); loop(ALERT, function () { loop(IDLE); }); } }, 1500 * k); })(); return; }
    setTimeout(function () { var i = 0; (function next() { if (i < REPORT.length) { say(REPORT[i++][0]); setTimeout(next, 330 * k); return; }
      var got = (Date.now() - t0) / 1000; say("REPORT RECEIVED. RUNNING THE RULES ..."); setTimeout(function () { clearInterval(tm); S.busy = false; S.bureau = "ok"; S.at = stamp(); S.took = Math.max(.4, (Date.now() - t0) / 1000 - got); LOG.push([S.at, "FinScore", "200 OK. Report FS-88213-PH, score 642, 5 tradelines, 0 public records."]); say("ASSESSED " + S.took.toFixed(1) + " SECONDS AFTER RECEIPT STOP"); $("note").textContent = "Report received, parsed and assessed. The recommendation was ready " + S.took.toFixed(1) + " seconds after the report arrived (the requirement is under 30)."; lastTier = "x"; wstat(); paint(); }, 900 * k); })(); }, 1400 * k);
  }
  /* ---- wiring up ---- */
  var ds = $("dials"); ds.appendChild(mkDial("dti", "Debt to income", "%", 0, 70, [[POL.dtiAuto, "low"], [POL.dtiMax, "mod"], [70, "high"]])); ds.appendChild(mkDial("fs", "FinScore", "", 300, 850, [[POL.fsMin, "high"], [POL.fsAuto, "mod"], [850, "low"]])); ds.appendChild(mkDial("ltv", "Loan to value", "%", 0, 120, [[POL.ltvAuto, "low"], [POL.ltvMax, "mod"], [120, "high"]]));
  var ts = $("term"); (TERMS || [12, 18, 24, 30, 36, 42, 48, 54, 60]).forEach(function (n) { var o = el("option", "", n + " months"); o.value = n; ts.appendChild(o); });
  if (LIVE) { var ai = $("amt"); ai.min = MIN; ai.max = MAX; ai.step = 10000;
    $("subline").textContent = LIVE.borrower + " · " + LIVE.product + " · asked for " + peso(ASK.amt) + " over " + ASK.term + " months"; document.title = "CALMS Credit assessment " + LIVE.reference;
    var cq = $("cQ"), cr = $("cRef"); cq.classList.remove("px"); cq.href = "review-queue.html"; cr.classList.remove("px"); cr.href = "application-detail.html?ref=" + LIVE.reference; cr.textContent = LIVE.reference;
    $("respLab").textContent = "Simulated FinScore answers with"; var oc = $("resp").querySelector('option[value="consent"]'); if (oc) oc.remove();
    var ft = document.querySelectorAll("#foot span"); if (ft[1]) ft[1].textContent = "Live record. The FinScore report is simulated for this project; the rules and thresholds are rule set version " + LIVE.ruleVersion + "."; }
  $("amt").addEventListener("input", function () { S.amt = +this.value; paint(); }); ts.addEventListener("change", function () { S.term = +this.value; paint(); });
  $("reset").addEventListener("click", function () { S.amt = ASK.amt; S.term = ASK.term; paint(); $("note").textContent = "Back to the saved assessment at the terms she asked for."; });
  $("fit").addEventListener("click", function () { S.amt = fitAmt(S.term); paint(); $("note").textContent = peso(S.amt) + " is the largest amount over " + S.term + " months that keeps debt-to-income at or under " + POL.dtiSoft + "%" + (COLL ? " and loan-to-value inside the ceiling." : "."); });
  $("wireBtn").addEventListener("click", wire);
  $("toDec").addEventListener("click", function () { if (LIVE) { location.href = "decision.html?ref=" + LIVE.reference + (S.amt !== ASK.amt || S.term !== ASK.term ? "&amt=" + S.amt + "&term=" + S.term : ""); return; } $("note").textContent = "Prototype: the Decision page is not built yet. It would open with " + peso(S.amt) + " over " + S.term + " months" + (S.amt !== ASK.amt || S.term !== ASK.term ? ", which differs from the request and would raise a counter-offer." : "."); });
  $("dl").addEventListener("click", function () { if (LIVE) { var bt = $("dl"); bt.setAttribute("aria-disabled", "true"); CALMS.api("POST", "/api/applications/" + LIVE.reference + "/memo", {}).then(function (d) { bt.removeAttribute("aria-disabled"); CALMS.printPaper(d); $("note").textContent = "Credit memo " + d.number + " was downloaded as a PDF. The download is logged."; }, function (e) { bt.removeAttribute("aria-disabled"); $("note").textContent = e.message; }); return; } $("note").textContent = "Prototype: the memo would download as a PDF, and the download would be logged."; });
  if (LIVE) $("dl").textContent = "Save memo as PDF";
  [].forEach.call(document.querySelectorAll("a.px"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: that is another page."; }); });
  var NAV = [["My Queue", 0], ["Applications", 0], ["Review queue", 1], ["Counter-offers", 0], ["Reports", 0], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"); x.href = "#"; x.appendChild(el("span", "plate", n[0])); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  if (LIVE) { tele(S.bureau === "ok" ? [["REPORT " + REPNO + " ON FILE STOP"], ["FINSCORE " + S.score + " STOP"]] : [["NO REPORT YET STOP"]]); $("wsec").textContent = S.bureau === "ok" ? S.took.toFixed(1) + " s" : "0.0 s"; }
  else tele(REPORT.concat([["ASSESSED 4.2 SECONDS AFTER RECEIPT STOP"]]));
  if (!LIVE) $("wsec").textContent = "4.2 s"; wstat(); paint();
}
