/* Products and rules, classic: the terms of each loan product, the lines CALMS uses to approve, refer or decline, the house rules, and publishing them as a new version. */
(function () {
  var h = CK.h;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function num(v) { var t = String(v).replace(/[,\s]/g, ""); return /^\d+(\.\d+)?$/.test(t) ? +t : NaN; }
  var FIELDS = { min: ["prod", "Smallest loan, in pesos", "₱", "pre"], max: ["prod", "Largest loan, in pesos", "₱", "pre"], terms: ["prod", "Months a borrower can choose", "months"], rate: ["prod", "Interest, percent a month", "%"], method: ["prod", "How interest is worked out"],
    fee: ["prod", "Processing charge, percent of the loan", "%"], pen: ["prod", "Late penalty, percent a month", "%"],
    dtiA: ["rule", "Approve automatically up to", "%"], dtiM: ["rule", "Decline above", "%"], ltvA: ["rule", "Approve automatically up to", "%"], ltvM: ["rule", "Decline above", "%"], fsA: ["rule", "Approve automatically from", ""], fsMin: ["rule", "Decline below", ""],
    esc: ["house", "Tell the supervisor when an application sits untouched for", "hours"], idle: ["house", "Sign a person out after no activity for", "minutes"] };
  var PK = ["min", "max", "terms", "rate", "method", "fee", "pen"];
  var RULES = [["dti", "Debt to income", "Monthly debt payments as a share of monthly income. Lower is safer.", 0, 70, "dtiA", "dtiM", "%", 1], ["ltv", "Loan to collateral value", "The loan as a share of what the collateral is worth. Lower is safer. Skipped for loans with no collateral.", 0, 100, "ltvA", "ltvM", "%", 2],
    ["fs", "FinScore from the credit bureau", "The bureau's score, 300 to 850. Higher is safer.", 300, 850, "fsMin", "fsA", "", 3]];
  var ZW = { a: "approved automatically", r: "an underwriter decides", d: "declined" }, ZT = { a: "green", r: "amber", d: "red" };
  var RL = { dtiA: "Debt to income, automatic approval up to", dtiM: "Debt to income, decline above", ltvA: "Loan to collateral value, automatic approval up to", ltvM: "Loan to collateral value, decline above", fsA: "FinScore, automatic approval from", fsMin: "FinScore, decline below", esc: "Idle application escalation", idle: "Sign-out after no activity" };

  CK.loading();
  CK.api("GET", "/api/products-rules").then(start, function (e) { CK.error(e); });

  function start(LIVE) {
    var RO = !LIVE.canEdit, DOCS = LIVE.catalog.map(function (d) { return d[1]; });
    var B, S, version, HIST, prod = LIVE.products[0].name, reason = "", tried = false, samp = 0;
    var SAMP = LIVE.samples.length ? LIVE.samples.map(function (x) { return [x.label, x.dti, x.ltv, x.score]; }) : [["Norma Estrella, SME loan", 38.4, 62.5, 642], ["Ramon Dela Cruz, Personal loan", 29.0, 0, 701], ["Danilo Pangilinan, SME loan", 47.2, 71.0, 615], ["Analyn Cortez, Personal loan", 41.0, 0, 566]];
    function base() { var p = {}; LIVE.products.forEach(function (x) { p[x.name] = { min: String(x.min), max: String(x.max), terms: x.terms.join(", "), rate: String(x.rate), method: x.method, fee: String(x.fee), pen: String(x.pen), docs: LIVE.catalog.map(function (d) { return x.docs.indexOf(d[0]) > -1 ? 1 : 0; }) }; });
      var r = LIVE.rule; return { prod: p, rule: { dtiA: String(r.dtiA), dtiM: String(r.dtiM), ltvA: String(r.ltvA), ltvM: String(r.ltvM), fsMin: String(r.fsMin), fsA: String(r.fsA) }, house: { esc: String(LIVE.house.esc), idle: String(LIVE.house.idle) } }; }
    function fresh() { B = base(); S = clone(B); version = LIVE.version; HIST = LIVE.history; reason = ""; tried = false; if (!S.prod[prod]) prod = LIVE.products[0].name; }
    fresh();

    /* ---- checks (the same as the western page) ---- */
    function errOf(key, pn) { var p = S.prod[pn || prod], r = S.rule, hs = S.house, n;
      switch (key) {
        case "min": n = num(p.min); return isNaN(n) || n < 1000 ? "Enter an amount of at least 1,000." : "";
        case "max": n = num(p.max); return isNaN(n) ? "Enter an amount in digits." : n <= num(p.min) ? "The largest amount must be more than the smallest." : n > 5000000 ? "The most a product can lend is 5,000,000." : "";
        case "terms": return /^\s*\d{1,2}(\s*,\s*\d{1,2})*\s*$/.test(p.terms) ? "" : "List the months with commas, like 12, 18, 24.";
        case "rate": n = num(p.rate); return isNaN(n) || n <= 0 || n > 5 ? "Enter a monthly rate above 0 and up to 5." : "";
        case "fee": n = num(p.fee); return isNaN(n) || n > 10 ? "Enter a charge from 0 to 10." : "";
        case "pen": n = num(p.pen); return isNaN(n) || n > 10 ? "Enter a penalty from 0 to 10." : "";
        case "dtiA": n = num(r.dtiA); return isNaN(n) || n < 0 ? "Enter a percent." : n > num(r.dtiM) ? "This cannot be above the decline line (" + r.dtiM + "%)." : "";
        case "dtiM": n = num(r.dtiM); return isNaN(n) || n > 70 ? "Enter a percent up to 70." : "";
        case "ltvA": n = num(r.ltvA); return isNaN(n) || n < 0 ? "Enter a percent." : n > num(r.ltvM) ? "This cannot be above the decline line (" + r.ltvM + "%)." : "";
        case "ltvM": n = num(r.ltvM); return isNaN(n) || n > 100 ? "Enter a percent up to 100." : "";
        case "fsMin": n = num(r.fsMin); return isNaN(n) || n < 300 || n > 850 ? "FinScore runs from 300 to 850." : "";
        case "fsA": n = num(r.fsA); return isNaN(n) || n > 850 ? "FinScore runs from 300 to 850." : n < num(r.fsMin) ? "This cannot be below the decline line (" + r.fsMin + ")." : "";
        case "esc": n = num(hs.esc); return isNaN(n) || n < 12 || n > 168 ? "Enter hours from 12 to 168." : "";
        case "idle": n = num(hs.idle); return isNaN(n) || n < 5 || n > 60 ? "Enter minutes from 5 to 60." : "";
      } return ""; }
    function prodErr(pn) { return ["min", "max", "terms", "rate", "fee", "pen"].some(function (k) { return errOf(k, pn); }); }
    function anyErr() { return Object.keys(S.prod).some(prodErr) || ["dtiA", "dtiM", "ltvA", "ltvM", "fsA", "fsMin", "esc", "idle"].some(function (k) { return errOf(k); }); }
    function val(key, src) { var g = FIELDS[key][0]; return g === "prod" ? src.prod[prod][key] : src[g][key]; }
    function setv(key, v) { var g = FIELDS[key][0]; if (g === "prod") S.prod[prod][key] = v; else S[g][key] = v; }

    /* ---- a field: label, input with its unit, error ---- */
    var F = {};
    function field(key) { var i, d = FIELDS[key];
      if (key === "method") i = CK.select(["Diminishing balance", "Flat (add-on)"], val(key, S)); else i = CK.input({ value: val(key, S), mode: key === "terms" ? "text" : "decimal" });
      i.disabled = RO; var ctl = d[2] ? h("div.ck-prio" + (d[3] ? ".pre" : ""), d[3] ? h("span", d[2]) : null, i, d[3] ? null : h("span", d[2])) : i;
      var f = CK.field(d[1], ctl); var lab = f.querySelector("label"), er = f.querySelector(".ck-err"); i.id = "f-" + key; lab.setAttribute("for", i.id); ctl.removeAttribute("aria-invalid"); f.input = i; F[key] = f;
      f.setError = function (t) { er.textContent = t || ""; i.setAttribute("aria-invalid", t ? "true" : "false"); };
      i.addEventListener(key === "method" ? "change" : "input", function () { setv(key, i.value); live(); }); return f; }
    function mark() { Object.keys(F).forEach(function (k) { var f = F[k]; if (!f.isConnected) return; var e = (tried || String(val(k, S)).trim() !== String(val(k, B)).trim()) ? errOf(k) : ""; f.setError(e);
      f.classList.toggle("ck-dirty", String(val(k, S)).trim() !== String(val(k, B)).trim()); }); }

    /* ---- the product ---- */
    var prodBody = h("div.ck-stack"), tabsWrap = h("div");
    function prodTabs() { tabsWrap.textContent = ""; var counts = {}; changes().forEach(function (c) { if (c.p) counts[c.p] = (counts[c.p] || 0) + 1; });
      tabsWrap.appendChild(CK.tabs(Object.keys(S.prod).map(function (p) { return [p, p, counts[p] || null]; }), prod, function (v) {
        if (prodErr(prod)) { tried = true; mark(); prodTabs(); CK.toast("Fix the marked fields on " + prod + " before switching product.", "red"); return; } prod = v; drawProd(); })); }
    function drawProd() { prodBody.textContent = ""; PK.forEach(function (k) { delete F[k]; });
      var form = h("div.ck-form.ck-prform", PK.map(field));
      var docs = h("div.ck-prdocs", DOCS.map(function (d, i) { var c = CK.check(d, !!S.prod[prod].docs[i], { disabled: RO || LIVE.catalog[i][0] === "id" }), inp = c.querySelector("input");
        if (LIVE.catalog[i][0] === "id") c.title = "A government ID is always needed.";
        inp.addEventListener("change", function () { S.prod[prod].docs[i] = inp.checked ? 1 : 0; c.classList.toggle("ck-dirty", S.prod[prod].docs[i] !== B.prod[prod].docs[i]); live(); });
        c.classList.toggle("ck-dirty", S.prod[prod].docs[i] !== B.prod[prod].docs[i]); return c; }));
      var box = h("div.ck-stack.ck-afade", form, h("div.ck-field", h("label", "Papers the borrower must hand in"), docs, h("p.ck-hint", "The signed consent form is always required, so it is not in this list.")));
      prodBody.appendChild(box); prodTabs(); mark(); }

    /* ---- the three tracks ---- */
    var T = {};
    function rulesBlock() { return h("div.ck-stack", RULES.map(function (r) {
      var tr = h("div.ck-prtrack", { role: "img" }), zs = [h("span.z"), h("span.z"), h("span.z")], m1 = h("span.ck-prmark"), m2 = h("span.ck-prmark"), dot = h("span.ck-prdot", h("em"));
      zs.forEach(function (z) { tr.appendChild(z); }); tr.appendChild(m1); tr.appendChild(m2); tr.appendChild(dot);
      var say = h("p.ck-sm.ck-prsay"); T[r[0]] = { tr: tr, zs: zs, m1: m1, m2: m2, dot: dot, say: say };
      var pair = (r[0] === "fs" ? [r[6], r[5]] : [r[5], r[6]]).map(field);
      return h("div.ck-prrule", h("div.ck-stack.ck-atight", h("b.ck-prrt", r[1]), h("p.ck-sm", r[2]), tr, say), h("div.ck-stack.ck-atight", pair)); })); }
    function zone(r, v) { var a = num(S.rule[r[5]]), b = num(S.rule[r[6]]); if (r[0] === "fs") return v < a ? "d" : v >= b ? "a" : "r"; return v <= a ? "a" : v <= b ? "r" : "d"; }
    var verdict = h("div");
    function tracks() { var sm = SAMP[samp], worst = "a", bits = [], name = sm[0].split(",")[0];
      RULES.forEach(function (r) { var t = T[r[0]], lo = r[3], hi = r[4], a = num(S.rule[r[5]]), b = num(S.rule[r[6]]), u = r[7], v = sm[r[8]], ok = !errOf(r[5]) && !errOf(r[6]) && !isNaN(a) && !isNaN(b);
        t.tr.classList.toggle("is-bad", !ok); if (!ok) { t.say.textContent = "Fix the two numbers on the right to see this line."; return; }
        var x = function (n) { return Math.max(0, Math.min(100, (n - lo) / (hi - lo) * 100)); }, order = r[0] === "fs" ? ["d", "r", "a"] : ["a", "r", "d"], w = [x(a), x(b) - x(a), 100 - x(b)];
        t.zs.forEach(function (z, i) { z.className = "z " + order[i]; z.style.setProperty("--f", Math.max(.001, w[i]).toFixed(3)); });
        var close = Math.abs(x(b) - x(a)) < 9; t.m1.style.setProperty("--x", x(a).toFixed(2)); t.m1.textContent = close ? a + u + " | " + b + u : a + u; t.m2.style.setProperty("--x", x(b).toFixed(2)); t.m2.textContent = b + u; t.m2.hidden = close;
        var skip = r[0] === "ltv" && !v, say = r[0] === "fs" ? "Below " + a + ": declined. " + a + " to " + (b - 1) + ": an underwriter decides. " + b + " and above: approved automatically." : "Up to " + a + u + ": approved automatically. Over " + a + u + " and up to " + b + u + ": an underwriter decides. Over " + b + u + ": declined.";
        t.say.textContent = say; t.dot.hidden = skip;
        if (!skip) { var z = zone(r, v); t.dot.style.setProperty("--x", x(v).toFixed(2)); t.dot.className = "ck-prdot z-" + z; t.dot.firstChild.textContent = name.split(" ")[0] + " " + v + u; bits.push([r[1], v + u, z]); if (z === "d" || (z === "r" && worst === "a")) worst = z; }
        t.tr.setAttribute("aria-label", r[1] + ". " + say + (skip ? "" : " The sample applicant is at " + v + u + ": " + ZW[zone(r, v)] + ".")); });
      verdict.textContent = "";
      if (bits.length < 2) { verdict.appendChild(CK.note("Fix the marked numbers to see the result.", "grey")); return; }
      verdict.appendChild(h("div.ck-note.t-" + ZT[worst] + ".ck-prverdict", CK.ic(worst === "a" ? "check" : worst === "r" ? "user" : "x"),
        h("div", h("div", h("b", "With these lines, " + name + " would be: "), CK.pill(worst === "a" ? "Approved automatically" : worst === "r" ? "Sent to an underwriter" : "Declined", ZT[worst])),
          h("small.ck-sm", bits.map(function (b) { return b[0] + " " + b[1] + " (" + ZW[b[2]] + ")"; }).join(". ") + ". The strictest result wins.")))); }

    /* ---- changes and publishing ---- */
    function changes() { var c = []; Object.keys(S.prod).forEach(function (p) { var a = B.prod[p], b = S.prod[p];
        PK.forEach(function (k) { var u = k === "min" || k === "max" ? "" : k === "terms" ? "" : FIELDS[k][2] || ""; if (String(a[k]).trim() !== String(b[k]).trim()) c.push({ p: p, t: p + ": " + FIELDS[k][1].toLowerCase(), a: a[k] + u, b: b[k] + u }); });
        DOCS.forEach(function (d, i) { if (a.docs[i] !== b.docs[i]) c.push({ p: p, t: p + ": " + d, a: a.docs[i] ? "required" : "not required", b: b.docs[i] ? "required" : "not required" }); }); });
      ["dtiA", "dtiM", "ltvA", "ltvM", "fsA", "fsMin"].forEach(function (k) { if (S.rule[k].trim() !== B.rule[k]) c.push({ t: RL[k], a: B.rule[k] + FIELDS[k][2], b: S.rule[k] + FIELDS[k][2] }); });
      ["esc", "idle"].forEach(function (k) { if (S.house[k].trim() !== B.house[k]) c.push({ t: RL[k], a: B.house[k] + " " + FIELDS[k][2], b: S.house[k] + " " + FIELDS[k][2] }); }); return c; }
    var pubCard = h("div"), verPill = h("span"), lastN = -1, whyI = null;
    function pub() { var c = changes(); verPill.textContent = ""; verPill.appendChild(c.length && !RO ? CK.pill("Version " + version + " in force · draft open", "amber") : CK.pill("Version " + version + " in force", "green"));
      var keepFocus = whyI && document.activeElement === whyI, caret = keepFocus ? whyI.selectionStart : 0;
      if (c.length === lastN && c.length && !tried) { /* only the list of changes moves */ var ul = pubCard.querySelector(".ck-prchg"); if (ul) { ul.replaceWith(chgList(c)); return; } }
      lastN = c.length; pubCard.textContent = "";
      if (RO) { pubCard.appendChild(CK.card("Read only", [h("p.ck-ap", "You can read the rules and try them on a sample applicant. Only the System Administrator can change them.")], { icon: "lock", cls: "ck-panelin" })); return; }
      if (!c.length) { pubCard.appendChild(CK.card("Nothing to publish", [h("p.ck-ap", "Change a term, a paper or a line. Your changes collect here, and nothing takes effect until you publish.")], { icon: "send", cls: "ck-panelin" })); return; }
      whyI = CK.textarea(reason, "What changed in the business, in a sentence"); var fWhy = CK.field("Why are you changing it? This goes in the audit log.", whyI, { req: true });
      if (tried && reason.trim().length < 10) fWhy.setError("Give a reason of at least 10 characters.");
      whyI.addEventListener("input", function () { reason = whyI.value; if (reason.trim().length >= 10) fWhy.setError(""); });
      var go = CK.btn("Publish as version " + (version + 1), { kind: "primary", icon: "send" }), no = CK.btn("Throw the draft away", { kind: "ghost", icon: "x" });
      go.addEventListener("click", function () { tried = true;
        if (anyErr()) { mark(); lastN = -1; pub(); var bad = Object.keys(S.prod).filter(prodErr)[0]; if (bad && bad !== prod) { prod = bad; drawProd(); } CK.toast("Some numbers are not valid. Fix the fields marked in red, then publish.", "red"); var f = document.querySelector(".c-view [aria-invalid='true']"); if (f) f.focus(); return; }
        if (reason.trim().length < 10) { fWhy.setError("Give a reason of at least 10 characters."); whyI.focus(); return; }
        var body = { products: {}, rule: S.rule, house: S.house, reason: reason.trim(), changes: c.map(function (x) { return x.t + ": " + x.a + " became " + x.b; }) };
        Object.keys(S.prod).forEach(function (p) { var x = S.prod[p]; body.products[p] = { min: x.min, max: x.max, terms: x.terms, rate: x.rate, method: x.method, fee: x.fee, pen: x.pen, docs: LIVE.catalog.filter(function (d, i) { return x.docs[i]; }).map(function (d) { return d[0]; }) }; });
        CK.busy(go, true); CK.api("POST", "/api/rule-sets", body).then(function (d) { LIVE = d.view; fresh(); lastN = -1; draw(); CK.toast("Version " + version + " is in force. " + c.length + (c.length === 1 ? " change" : " changes") + " recorded in the audit log. New applications and decisions use it from now on."); },
          function (e) { CK.busy(go, false); if (e.fields && e.fields.why) fWhy.setError(e.fields.why); CK.toast("Not published. " + e.message, "red"); }); });
      no.addEventListener("click", function () { CK.modal({ title: "Throw the draft away?", body: [h("p.ck-ap", "All " + c.length + (c.length === 1 ? " change" : " changes") + " you made are undone. Version " + version + " stays as it is.")],
        actions: [["Keep editing", "ghost"], ["Throw it away", "danger", function (close) { close(); fresh(); lastN = -1; draw(); CK.toast("Draft thrown away. Version " + version + " is unchanged.", "blue"); }]] }); });
      pubCard.appendChild(CK.card("Draft: " + c.length + (c.length === 1 ? " change" : " changes") + " not yet in force", [chgList(c),
        h("p.ck-sm", "Publishing makes this version " + (version + 1) + " for every decision from now on. Decisions already made keep version " + version + " on their record."), fWhy, h("div.ck-actions", go, no)], { icon: "edit", cls: "ck-panelin.ck-prpub" }));
      if (keepFocus) { whyI.focus(); whyI.selectionStart = whyI.selectionEnd = caret; } }
    function chgList(c) { return h("ul.ck-prchg", c.map(function (x) { return h("li", h("span", x.t), h("span.ck-prab", h("s", x.a), CK.ic("next"), h("b", x.b))); })); }
    function hist() { return CK.card("Earlier versions", h("ul.ck-time", HIST.map(function (v) { var extra = (v.changes || []).slice(0, 4);
      return h("li", h("i"), h("div", h("b", "Version " + v.version + (v.inForce ? " · in force" : "")), h("small", CK.date(v.at) + " · " + v.by), h("small", v.reason), extra.length ? h("ul.ck-prhchg", extra.map(function (x) { return h("li", x); }), v.changes.length > 4 ? h("li", "and " + (v.changes.length - 4) + " more") : null) : null)); })),
      { icon: "clock", tools: h("span.ck-sm", "Every decision records the version it was made under.") }); }

    function live() { mark(); tracks(); pub(); prodTabs(); }

    /* ---- the page ---- */
    function draw() { F = {}; T = {};
      var sampSel = CK.select(SAMP.map(function (s, i) { return [i, s[0]]; }), samp); sampSel.addEventListener("change", function () { samp = +sampSel.value; tracks(); });
      var legend = h("div.ck-legend", [["Approved automatically", "#2f7a4f"], ["An underwriter decides", "#c9821b"], ["Declined", "#b3261a"]].map(function (x) { return h("span", h("i", { style: { background: x[1] } }), x[0]); }), h("span", h("i.ck-prlgdot"), "The sample applicant"));
      prodBody = h("div.ck-stack"); drawProd();
      var house = h("div.ck-form", ["esc", "idle"].map(field));
      CK.render([
        CK.head({ title: "Products and rules", status: verPill, sub: "The terms of each loan product and the lines CALMS uses to approve, refer or decline. Nothing you type here takes effect until you publish it." }),
        h("div.ck-grid.side.ck-prgrid",
          h("div.ck-stack",
            CK.card("Loan product", [tabsWrap, prodBody], { icon: "peso" }),
            CK.card("Where the lines are drawn", [h("p.ck-ap", "These three lines apply to every product. Move a line and see where a real applicant would land."), h("div.ck-toolbar.between", CK.field("Sample applicant", sampSel), legend), rulesBlock(), verdict], { icon: "chart" }),
            CK.card("House rules", house, { icon: "gear" })),
          h("div.ck-stack.ck-sticky", pubCard, hist()))
      ]);
      live(); }
    draw();
  }
})();
