/* Credit assessment, classic: the FinScore report, the three ratios against the rule thresholds, the rules one by one, a what-if bench and the credit memo. */
(function () {
  var h = CK.h, ref = CK.q("ref");
  if (!ref) { CK.render([CK.head({ crumbs: [["Review queue", "review-queue.html"], ["Credit assessment"]], title: "Credit assessment" }),
    CK.card(null, [CK.empty("Open an application first", "A credit assessment belongs to one application. Pick one from the review queue.", "search"), h("div.ck-actions", CK.btn("Review queue", { kind: "primary", icon: "next", href: "review-queue.html" }))])]); return; }
  var GREEN = "#2f7a4f", AMBER = "#c9821b", RED = "#b3261a";
  function pesoC(n) { return CK.peso(n, true); }
  function pct(n) { return n == null ? "–" : n.toFixed(1) + "%"; }
  function load() { return CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/assessment"); }
  CK.loading(); load().then(function (d) { draw(d); }, function (e) { CK.error(e, "review-queue.html"); });

  /* a half-dial: coloured bands at the rule thresholds, a needle for the figure, a dashed needle for "as asked" */
  function gauge(label, unit, min, max, bands) {
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 220 128"); svg.setAttribute("class", "ck-gsvg"); svg.setAttribute("role", "img");
    function S(n, at, txt) { var e = document.createElementNS(NS, n); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; }
    function pt(v, r) { var t = Math.PI * (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)); return [110 + Math.cos(t) * r, 110 - Math.sin(t) * r]; }
    function arc(a, b, r) { var p = pt(a, r), q = pt(b, r); return "M" + p[0].toFixed(1) + " " + p[1].toFixed(1) + " A" + r + " " + r + " 0 0 1 " + q[0].toFixed(1) + " " + q[1].toFixed(1); }
    S("path", { d: arc(min, max, 82), fill: "none", stroke: "#f1ebe4", "stroke-width": 16, "stroke-linecap": "round" });
    var from = min; bands.forEach(function (b) { S("path", { d: arc(from, b[0], 82), fill: "none", stroke: b[1], "stroke-width": 16, opacity: .85 });
      if (b[0] < max) { var g1 = pt(b[0], 72), g2 = pt(b[0], 92), tp = pt(b[0], 104); S("path", { d: "M" + g1[0].toFixed(1) + " " + g1[1].toFixed(1) + " L" + g2[0].toFixed(1) + " " + g2[1].toFixed(1), stroke: "#fff", "stroke-width": 3 });
        S("text", { x: tp[0].toFixed(1), y: (tp[1] + 4).toFixed(1), "text-anchor": "middle", "class": "ck-gtick" }, b[0] + (unit === "%" ? "%" : "")); }
      from = b[0]; });
    S("text", { x: 28, y: 126, "text-anchor": "middle", "class": "ck-gend" }, String(min)); S("text", { x: 192, y: 126, "text-anchor": "middle", "class": "ck-gend" }, String(max));
    var ghost = S("line", { x1: 110, y1: 110, x2: 110, y2: 42, "class": "ck-gghost" }), nd = S("line", { x1: 110, y1: 110, x2: 110, y2: 36, "class": "ck-gneedle" });
    S("circle", { cx: 110, cy: 110, r: 8, "class": "ck-ghub" });
    var val = h("b.ck-gval", "–"), word = h("span.ck-gword"), was = h("small.ck-gwas");
    var box = h("section.ck-card.ck-in.ck-gauge", h("div.ck-cardhead", h("h2", label)), h("div.ck-cardbody", svg, h("div.ck-gread", val, word, was)));
    function ang(v) { return -90 + 180 * (Math.max(min, Math.min(max, v)) - min) / (max - min); }
    var first = true; function turn(el, deg) { var t = "rotate(" + deg + "deg)"; if (first) setTimeout(function () { el.style.transform = t; }, 420); else el.style.transform = t; }
    box.set = function (v, w, tone, asked) { set(v, w, tone, asked); first = false; };
    function set(v, w, tone, asked) {
      if (v == null) { nd.style.transform = "rotate(-90deg)"; nd.style.opacity = .25; ghost.style.opacity = 0; val.textContent = "no data"; word.textContent = w; word.className = "ck-gword t-grey"; was.textContent = ""; svg.setAttribute("aria-label", label + ": no data"); return; }
      var txt = (unit === "%" ? v.toFixed(1) : String(v)) + unit; nd.style.opacity = 1; turn(nd, ang(v)); val.textContent = txt; word.textContent = w; word.className = "ck-gword t-" + tone;
      svg.setAttribute("aria-label", label + " " + txt + ", " + w);
      if (asked != null && Math.abs(asked - v) > .05) { ghost.style.opacity = .55; turn(ghost, ang(asked)); was.textContent = "as asked: " + (unit === "%" ? asked.toFixed(1) : asked) + unit; }
      else { ghost.style.opacity = 0; was.textContent = ""; } }
    nd.style.transform = "rotate(-90deg)"; ghost.style.opacity = 0; return box;
  }

  function draw(L) {
    var ASK = { amt: L.ask.amount, term: L.ask.term }, INCOME = L.income, COLL = L.collateral || 0, RATE = L.rate, METHOD = L.method, YEARS = L.years, YLAB = L.yearsLabel,
      LIMIT = L.limit || 0, POL = L.policy, MIN = L.min, MAX = L.max, TERMS = L.terms || [12, 18, 24, 30, 36, 42, 48, 54, 60], TL = L.report ? L.report.tradelines : [];
    var bureau = L.report ? "ok" : L.bureau === "blocked" ? "consent" : L.bureau === "down" ? "down" : "none", has = bureau === "ok", score = has ? L.report.score : null;
    var DEBT = has ? TL.reduce(function (m, t) { return m + t[5]; }, 0) : L.debt, LATE12 = 0, LATE24 = 0, WORST = 0;
    TL.forEach(function (t) { t[7].split("").forEach(function (c, i) { if (c > "0" && c <= "3") { LATE24++; if (i >= 12) LATE12++; WORST = Math.max(WORST, +c); } }); });
    var S = { amt: ASK.amt, term: ASK.term };
    function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
    /* the same rules the server runs, so the bench can answer "what if" on the screen */
    function calc(a, n) {
      var m = inst(a, n), dti = (DEBT + m) / INCOME * 100, ltv = COLL ? a / COLL * 100 : 0, fs = score, R = [];
      var add = function (g, name, ok, val, lim) { if (!COLL && /^Loan-to-value/.test(name)) return; R.push({ g: g, name: name, ok: ok, val: val, lim: lim }); };
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
      add("a", "Amount at most " + pesoC(POL.autoMax), a <= POL.autoMax, pesoC(a), "for automatic approval");
      add("a", YLAB + " at least " + POL.yrs + " years", YEARS >= POL.yrs, YEARS + " years", "for automatic approval");
      var gd = R.filter(function (r) { return r.g === "d"; }), gt = R.filter(function (r) { return r.g === "t"; }), ga = R.filter(function (r) { return r.g === "a"; });
      var decline = gd.some(function (r) { return r.ok === false; }), high = gt.some(function (r) { return r.ok === false; }), auto = ga.every(function (r) { return r.ok === true; }),
        low = ga.filter(function (r) { return /^(FinScore|Debt-to-income|Loan-to-value)/.test(r.name); }).every(function (r) { return r.ok === true; });
      var tier = !has ? "None" : high ? "High" : low ? "Low" : "Moderate", out, why;
      if (!has && bureau === "none") { out = "Waiting for the report"; why = "Ask FinScore for the report. The rules that need it cannot run before it arrives."; }
      else if (!has) { out = "Manual review"; why = "The bureau did not answer, so the rules that need the report could not be run. A person must decide, with or without a later report."; }
      else if (decline) { out = "Decline automatically"; why = "It breaks a mandatory rule: " + gd.filter(function (r) { return r.ok === false; })[0].name.toLowerCase() + "."; }
      else if (auto && !high) { out = "Approve automatically"; why = "Every rule for automatic approval is met."; }
      else if (high) { out = "Manual review: leans decline"; why = "High tier. " + gt.filter(function (r) { return r.ok === false; }).map(function (r) { return r.name; }).join("; ") + " failed."; }
      else if (dti > POL.dtiSoft) { out = "Manual review: approve a lower amount"; why = "Debt-to-income is between " + POL.dtiSoft + "% and " + POL.dtiMax + "%. A smaller loan would bring it down."; }
      else { out = "Manual review: leans approve"; why = "Inside every limit, but not every rule for automatic approval is met: " + ga.filter(function (r) { return r.ok !== true; }).map(function (r) { return r.name.toLowerCase(); }).join("; ") + "."; }
      return { m: m, dti: dti, ltv: COLL ? ltv : null, fs: fs, R: R, tier: tier, out: out, why: why, total: m * n };
    }
    function fitAmt(n) { var best = MIN; for (var a = MIN; a <= MAX; a += 10000) { if ((DEBT + inst(a, n)) / INCOME * 100 <= POL.dtiSoft && (!COLL || a / COLL * 100 <= POL.ltvMax)) best = a; } return best; }
    var TIER = { Low: ["Low risk", "green"], Moderate: ["Moderate risk", "amber"], High: ["High risk", "red"], None: ["No tier assigned", "grey"] };

    /* ---- the verdict ---- */
    var seal = h("div.ck-seal2"), tierT = h("b.ck-tiername"), tierS = h("small.ck-sm"), wiPill = h("span"), recBox = h("div.ck-rec");
    var verdict = CK.card("What the rules say", [h("div.ck-verdict", seal, h("div", tierT, tierS)), recBox], { icon: "shield", tools: wiPill, cls: "ck-verdictcard" });

    /* ---- the bureau ---- */
    var B = { ok: ["Report on file", "green"], none: ["No report yet", "grey"], down: ["No answer", "amber"], consent: ["Blocked: no consent", "red"] }[bureau];
    var wire = h("ol.ck-wire"), secs = h("span.ck-secs"), resp = CK.select([["ok", "A report"], ["down", "Service unavailable"]], "ok");
    var askBtn = CK.btn(has || bureau === "down" ? "Ask FinScore again" : "Ask FinScore", { kind: has ? "soft" : "primary", icon: "send" });
    var bBody = [];
    if (has) bBody.push(h("div.ck-score", h("div.ck-scoreval.t-" + (score < POL.fsMin ? "red" : score < POL.fsAuto ? "amber" : "green"), h("span.lbl", "FinScore"), h("b", String(score)), h("small", score < POL.fsMin ? "poor" : score < POL.fsAuto ? "fair" : "good")),
      CK.dl([["Report", L.report.no], ["Tradelines", String(TL.length)], ["Public records", String(L.report.publicRecords || 0)], ["Received", CK.dt(L.report.at)]])));
    else bBody.push(CK.note(bureau === "none" ? "No report yet. Ask FinScore for it; the borrower's signed consent form is " + (L.consent === false ? "not on file." : "on file.") : bureau === "down" ? "FinScore did not answer after three attempts, so there are no tradelines to show. The application stays in manual review and the inquiry can be made again." : "No report. An inquiry cannot be made without the borrower's valid consent on file.", bureau === "none" ? "blue" : bureau === "down" ? "amber" : "red"));
    if (L.canInquire) bBody.push(h("div.ck-askrow", CK.field("Simulated FinScore answers with", resp), h("div.ck-actions", askBtn, secs)));
    else bBody.push(h("p.ck-sm", L.status !== "review" ? "The bureau is asked only while the application is Under Review." : "Only an underwriter can ask FinScore."));
    bBody.push(wire);
    var logs = (L.log || []).slice().reverse();
    if (logs.length) bBody.push(h("div", h("div.ck-sm.ck-k", "Inquiry log"), h("ul.ck-time.ck-ilog", logs.map(function (l) { return h("li", h("i"), h("div", h("b", l.text), h("small", l.who + " · " + CK.dt(l.at)))); }))));
    if (has) bBody.push(h("p.ck-sm", "On file, read only: report " + L.report.no + ", stored exactly as received. Simulated FinScore for this project."));
    var bureauCard = CK.card("FinScore", bBody, { icon: "server", tools: CK.pill(B[0], B[1]) });
    askBtn.addEventListener("click", function () { ask(resp.value); });
    function ask(mode) {
      var t0 = Date.now(), tm = setInterval(function () { secs.textContent = ((Date.now() - t0) / 1000).toFixed(1) + " s"; }, 80), line = function (t, bad) { wire.appendChild(h("li" + (bad ? ".bad" : ""), t)); };
      wire.textContent = ""; CK.busy(askBtn, true); resp.disabled = true; line("Inquiry sent to FinScore …");
      CK.api("POST", "/api/applications/" + encodeURIComponent(ref) + "/bureau", { simulate: mode }).then(function (d) {
        var R0 = d.report, lines = !R0 || d.bureau === "down" ? [["Attempt 1 of 3: no answer (503)", 1], ["Attempt 2 of 3: no answer (503)", 1], ["Attempt 3 of 3: no answer (503)", 1], ["Gave up. Held in manual review."]]
          : [["Report " + R0.no + " received"], ["FinScore " + R0.score + " · " + R0.tradelines.length + " tradelines · " + (R0.publicRecords ? R0.publicRecords + " public record" : "no public records")], ["Assessed: " + d.assessment.tier + " risk"]], i = 0;
        (function next() { if (i < lines.length) { line(lines[i][0], lines[i][1]); i++; setTimeout(next, 260); return; }
          clearInterval(tm); CK.busy(askBtn, false);
          if (!R0 || d.bureau === "down") CK.toast("FinScore did not answer (simulated outage). It stays in manual review; try again later.", "red");
          else CK.toast("Report received and assessed: " + d.assessment.tier + " risk. " + d.assessment.outcome + ". The memo is on file under rule set version " + d.assessment.version + ".");
          setTimeout(function () { draw(d); }, 350); })();
      }, function (e) { clearInterval(tm); CK.busy(askBtn, false); resp.disabled = false; if (e.status === 409 && /consent/i.test(e.message)) { line("Inquiry not sent", 1); line("No signed consent on file", 1); } else line(e.message, 1); CK.fail(e); });
    }

    /* ---- the dials ---- */
    var gD = gauge("Debt to income", "%", 0, 70, [[POL.dtiAuto, GREEN], [POL.dtiMax, AMBER], [70, RED]]), gF = gauge("FinScore", "", 300, 850, [[POL.fsMin, RED], [POL.fsAuto, AMBER], [850, GREEN]]),
      gL = gauge("Loan to value", "%", 0, 120, [[POL.ltvAuto, GREEN], [POL.ltvMax, AMBER], [120, RED]]);

    /* ---- the bench ---- */
    var range = h("input.ck-range", { type: "range", min: MIN, max: MAX, step: 10000, value: S.amt, "aria-label": "Amount" }), amtOut = h("b.ck-rangeval"), term = CK.select(TERMS.map(function (n) { return [n, n + " months"]; }), S.term);
    var sumx = h("dl.ck-sumx"), toDec = CK.btn("Take these terms to the decision", { kind: "primary", icon: "next" });
    range.addEventListener("input", function () { S.amt = +range.value; paint(); }); term.addEventListener("change", function () { S.term = +term.value; paint(); });
    var resetB = CK.btn("Back to what she asked for", { kind: "ghost", icon: "refresh", on: function () { S.amt = ASK.amt; S.term = ASK.term; paint(); CK.toast("Back to the saved assessment at the terms she asked for.", "blue"); } });
    var fitB = CK.btn("Largest amount inside " + POL.dtiSoft + "%", { kind: "soft", icon: "chart", on: function () { S.amt = fitAmt(S.term); paint(); CK.toast(CK.peso(S.amt) + " is the largest amount over " + S.term + " months that keeps debt-to-income at or under " + POL.dtiSoft + "%" + (COLL ? " and loan-to-value inside the ceiling." : "."), "blue"); } });
    var bench = CK.card("What-if bench", h("div.ck-bench",
      h("div.ck-stack.ck-benchctl", h("div.ck-field", h("label", "Amount ", amtOut), range, h("div.ck-rangeends", h("span", CK.peso(MIN)), h("span", CK.peso(MAX)))), CK.field("Term", term),
        h("div.ck-actions", resetB, fitB), null),
      sumx), { icon: "edit", tools: h("span.ck-sm", "try terms before you decide") });

    /* ---- tradelines ---- */
    var now = new Date();
    function mon(i) { var x = new Date(now.getFullYear(), now.getMonth() - (23 - i), 1); return x.toLocaleDateString("en-PH", { month: "short", year: "numeric" }); }
    function punch(x) { var late = 0, p = h("div.ck-punch"); x[7].split("").forEach(function (ch, i) { var bad = ch > "0" && ch <= "3"; if (bad) late++;
        p.appendChild(h("i." + (ch === "n" ? "na" : ch === "0" ? "ok" : "l" + ch), { title: mon(i) + ": " + (ch === "n" ? "no data reported" : ch === "0" ? "paid on time" : (+ch * 30) + " days late") }, bad ? String(+ch * 3) : "")); });
      p.setAttribute("role", "img"); p.setAttribute("aria-label", x[0] + ": " + (x[7].indexOf("0") < 0 && !late ? "no payment data in the last 24 months" : late ? late + " late payment" + (late > 1 ? "s" : "") + " in 24 months" : "every payment on time")); return p; }
    var tlBody = has ? [CK.table([
      { k: "0", label: "Creditor", render: function (x) { return h("div", h("span.ck-strong", x[0]), h("small.ck-sm", x[1] + " · " + x[6])); } },
      { k: "2", label: "Opened", render: function (x) { return x[2]; } },
      { k: "3", label: "Limit or original", align: "right", render: function (x) { return x[3] ? pesoC(x[3]) : "–"; } },
      { k: "4", label: "Balance", align: "right", render: function (x) { return x[4] ? pesoC(x[4]) : "–"; } },
      { k: "5", label: "Monthly", align: "right", render: function (x) { return x[5] ? h("span.ck-strong", pesoC(x[5])) : "–"; } },
      { k: "7", label: "Last 24 months, oldest to newest", render: punch }], TL, { empty: "The report lists no tradelines." }),
      h("div.ck-tlfoot", h("span", "Monthly payments counted in debt-to-income"), h("b", pesoC(DEBT))),
      h("div.ck-legend", [["ok", "", "on time"], ["l1", "3", "30 days late"], ["l2", "6", "60 days late"], ["l3", "9", "90 days late"], ["na", "", "no data"]].map(function (g) { return h("span", h("span.ck-punch.one", h("i." + g[0], g[1])), g[2]); }),
        h("span", L.report.publicRecords ? "Public records: " + L.report.publicRecords + " found." : "Public records: none found."))]
      : [CK.empty(bureau === "none" ? "No report yet" : "No tradelines", bureau === "none" ? "Ask FinScore for the report. The tradelines show here when it arrives." : "There is no report, so there are no tradelines to show.", "server")];
    var tlCard = CK.card("What FinScore sent", tlBody, { icon: "list", flush: false, tools: h("span.ck-sm", has ? "report " + L.report.no + " · " + TL.length + " tradelines · " + (L.report.publicRecords || 0) + " public records" : "nothing yet") });

    /* ---- rules and memo ---- */
    var rulesBox = h("div.ck-rulegroups"), memo = h("pre.ck-memo"), memoAt = h("span.ck-sm");
    var memoBtn = CK.btn("Save memo as PDF", { kind: "ghost", icon: "download" });
    memoBtn.addEventListener("click", function () { CK.paper("/api/applications/" + encodeURIComponent(ref) + "/memo", memoBtn, "Credit memo").catch(function () {}); });
    var lastRules = {}, lastTier = null;

    function paint() {
      var C = calc(S.amt, S.term), A0 = calc(ASK.amt, ASK.term), wi = S.amt !== ASK.amt || S.term !== ASK.term, T = TIER[C.tier];
      wiPill.textContent = ""; if (wi) wiPill.appendChild(CK.pill("What-if, not the saved assessment", "violet"));
      seal.className = "ck-seal2 t-" + T[1] + (lastTier && lastTier !== C.tier ? " is-new" : ""); seal.textContent = C.tier === "None" ? "?" : C.tier.charAt(0); seal.title = T[0];
      tierT.textContent = T[0]; tierS.textContent = has ? "Assessed " + (L.report.took != null ? Math.max(.1, L.report.took).toFixed(1) + " seconds" : "") + " after the report arrived, " + CK.dt(L.report.at) + "." : "Assessment incomplete.";
      recBox.textContent = ""; recBox.appendChild(h("span.ck-sm", wi ? "At these terms the rules would say" : "The rules say")); recBox.appendChild(h("b", C.out)); recBox.appendChild(h("p", C.why));
      if (LIMIT && S.amt > LIMIT) recBox.appendChild(CK.note("At " + pesoC(S.amt) + " this is over your " + pesoC(LIMIT) + " approval limit. You could only endorse it to " + (L.upstairs || "a higher authority") + ".", "amber"));
      gD.set(C.dti, C.dti <= POL.dtiAuto ? "comfortable" : C.dti <= POL.dtiSoft ? "inside policy" : C.dti <= POL.dtiMax ? "close to the " + POL.dtiMax + "% limit" : "over the " + POL.dtiMax + "% limit", C.dti <= POL.dtiAuto ? "green" : C.dti <= POL.dtiMax ? "amber" : "red", wi ? A0.dti : null);
      if (C.ltv == null) gL.set(null, "unsecured loan"); else gL.set(C.ltv, C.ltv <= POL.ltvAuto ? "well covered" : C.ltv <= POL.ltvMax ? "inside the " + POL.ltvMax + "% ceiling" : "over the " + POL.ltvMax + "% ceiling", C.ltv <= POL.ltvAuto ? "green" : C.ltv <= POL.ltvMax ? "amber" : "red", wi ? A0.ltv : null);
      gF.set(C.fs, C.fs == null ? "FinScore did not answer" : C.fs < POL.fsMin ? "poor" : C.fs < POL.fsAuto ? "fair" : "good", C.fs == null ? "grey" : C.fs < POL.fsMin ? "red" : C.fs < POL.fsAuto ? "amber" : "green");
      if (C.fs == null && bureau === "none") gF.set(null, "no report yet");
      amtOut.textContent = CK.peso(S.amt); range.value = S.amt; term.value = S.term; range.style.setProperty("--p", ((S.amt - MIN) / (MAX - MIN) * 100) + "%");
      sumx.textContent = ""; var row = function (k, v, cls) { sumx.appendChild(h("div" + (cls ? "." + cls : ""), h("dt", k), h("dd", v))); };
      row("Existing monthly payments" + (has ? ", from the report" : ""), pesoC(DEBT)); row("This loan each month (" + Math.round(RATE * 10000) / 100 + "% a month, " + METHOD + ")", pesoC(C.m));
      row("All monthly payments", pesoC(DEBT + C.m), "ln"); row(L.kind !== "sme" ? "Verified monthly income" : "Verified monthly cash flow", pesoC(INCOME)); row("Debt to income", pct(C.dti), "big");
      row("Amount", pesoC(S.amt), "gap"); if (COLL) { row("Collateral, appraised", pesoC(COLL)); row("Loan to value", pct(C.ltv), "big"); } else row("Collateral", "none, unsecured");
      row("Total to repay over " + S.term + " months", pesoC(C.total), "gap"); row("Of which interest", pesoC(C.total - S.amt));
      rulesBox.textContent = ""; [["d", "Mandatory", "failing any one declines automatically"], ["t", "Limits", "failing any one makes it High risk"], ["a", "For Low tier and automatic approval", "all must pass"]].forEach(function (g) {
        rulesBox.appendChild(h("div.ck-rulehead", h("b", g[1]), h("small", g[2])));
        rulesBox.appendChild(h("ul.ck-rules", C.R.filter(function (r) { return r.g === g[0]; }).map(function (r) { var st = r.ok === null ? "un" : r.ok ? "ok" : "no", chg = lastRules[r.name] && lastRules[r.name] !== st; lastRules[r.name] = st;
          return h("li." + st + (chg ? ".chg" : ""), h("span.ck-rmark", CK.ic(st === "ok" ? "check" : st === "no" ? "x" : "info")), h("div.grow", h("span", r.name), h("small", r.ok === null ? "Could not be run without the report" : r.lim)), h("b", r.val)); }))); });
      memo.textContent = !wi && L.assessment ? L.assessment.memo : "GR8 LENDING COMPANY · CREDIT MEMO\n" + L.reference + " · Rule set version " + L.ruleVersion + "\n" + (wi ? "WHAT-IF DRAFT, NOT ON RECORD\n\nASSESSED AT  " + pesoC(S.amt) + " over " + S.term + " months.\n\nCAPACITY  Debt-to-income " + pct(C.dti) + " against a limit of " + POL.dtiMax + "%." + (COLL ? " Loan-to-value " + pct(C.ltv) + "." : "") + "\n\nTIER      " + (C.tier === "None" ? "Not assigned." : C.tier + ".") + "\n\nAT THESE TERMS  " + C.out + ". " + C.why : "\nNo memo yet. It is written when the FinScore report arrives.");
      memo.classList.toggle("is-draft", wi); memoAt.textContent = wi ? "what-if draft" : L.assessment ? "generated " + CK.dt(L.assessment.at) : "not yet";
      toDec.querySelector("span").textContent = wi ? "Take " + CK.peso(S.amt) + " over " + S.term + " months to the decision" : "Take the requested terms to the decision";
      lastTier = C.tier;
    }
    toDec.addEventListener("click", function () { CK.go("decision.html?ref=" + encodeURIComponent(L.reference) + (S.amt !== ASK.amt || S.term !== ASK.term ? "&amt=" + S.amt + "&term=" + S.term : "")); });

    CK.render([
      CK.head({ crumbs: [["Review queue", "review-queue.html"], [L.reference, "application-detail.html?ref=" + encodeURIComponent(L.reference)], ["Credit assessment"]], title: "Credit assessment", status: CK.status(L.status),
        sub: L.borrower + " · " + L.product + " · asked for " + CK.peso(ASK.amt) + " over " + ASK.term + " months", actions: [memoBtn, CK.btn("Decision", { kind: "soft", icon: "stamp", href: "decision.html?ref=" + encodeURIComponent(L.reference) })] }),
      h("div.ck-grid.side2", verdict, bureauCard),
      h("div.ck-grid.ck-gauges", { style: { "--cols": 3 } }, gD, gF, gL),
      bench,
      tlCard,
      h("div.ck-grid", { style: { "--cols": 2 } },
        CK.card("The rules, one by one", rulesBox, { icon: "check", tools: h("span.ck-sm", "rule set version " + L.ruleVersion) }),
        CK.card("Credit memo", [memo, h("div.ck-actions", toDec)], { icon: "file", tools: memoAt })),
      h("p.ck-foot.ck-in", "The ratios are computed by the system from verified entries. No figure on this page can be typed over. The FinScore report is simulated for this project; the rules and thresholds are rule set version " + L.ruleVersion + ".")
    ]);
    paint();
  }
})();
