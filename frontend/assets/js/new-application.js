/* Online, products and sales agents come from GET /api/applications/new/options and Submit sends the
   application with its signed consent form to POST /api/applications. Opened from the folder, the
   sample products below are used and nothing is sent. */
CALMS.boot("/api/applications/new/options", function (OPT) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function num(v) { var n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : NaN; }
  /* example product terms: in the real system these come from the product configuration */
  var PRODUCTS = { salary: { name: "Salary loan", who: "Employed borrowers, paid by salary deduction", min: 20000, max: 250000, t0: 6, t1: 36, rate: 2, method: "flat" },
                   personal: { name: "Personal loan", who: "Individuals, any accepted payment channel", min: 10000, max: 100000, t0: 3, t1: 24, rate: 2.5, method: "flat" },
                   sme: { name: "SME loan", who: "Registered businesses", min: 100000, max: 1000000, t0: 12, t1: 60, rate: 1.5, method: "diminishing" } };
  var LIVE = !!(OPT && OPT.products && OPT.products.length);
  if (LIVE) { PRODUCTS = {}; OPT.products.forEach(function (p) { PRODUCTS[p.key] = p; }); }
  function me() { var u = window.CALMS && CALMS.user; return u ? [u.name, u.shortName] : ["Liza Mendoza", "L. Mendoza"]; }
  var ACTIVE = [["jerome pascual", "personal", "APP-2026-0431", "Draft"], ["teresita villanueva", "sme", "APP-2026-0398", "Draft"], ["rosalinda ocampo", "personal", "APP-2026-0419", "Under Review"]];
  var PASTDUE = [["herminia cabrera", "LN-2025-1184", "31 to 60 days past due"]];
  if (LIVE) { ACTIVE = []; PASTDUE = []; var ft = document.querySelectorAll(".foot span"); if (ft[0]) ft[0].textContent = "A borrower can have only one active application per product. The check runs against the office's records as you type."; if (ft[1]) ft[1].textContent = "Submitting sends the application and the consent form to the CALMS database. Unsent drafts stay in this browser only."; }
  var IDS = { "PhilSys ID": [/^\d{4}-\d{4}-\d{4}-\d{4}$/, "0000-0000-0000-0000"], "TIN": [/^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/, "000-000-000-000"], "SSS": [/^\d{2}-\d{7}-\d$/, "00-0000000-0"], "Driver's license": [/^[A-Z]\d{2}-\d{2}-\d{6}$/i, "A00-00-000000"], "Passport": [/^[A-Z]\d{7}[A-Z]$/i, "P0000000A"] };
  var money = function (v) { return isNaN(num(v)) || num(v) < 0 ? "Enter an amount in pesos, for example 25,000.00." : ""; };
  /* field: id, label, type, required, options/validate, only for these products, wide */
  var SECTIONS = [
    { id: "request", title: "The request", hint: "Pick the product first. It decides which fields the form asks for.", fields: [
      { id: "amount", label: "Amount requested (pesos)", req: 1, mode: "decimal", money: 1, check: function (v, S) { var p = PRODUCTS[S.product]; if (money(v)) return money(v); if (p && (num(v) < p.min || num(v) > p.max)) return p.name + " runs from " + peso(p.min) + " to " + peso(p.max) + "."; return ""; } },
      { id: "term", label: "Term (months)", req: 1, mode: "numeric", check: function (v, S) { var p = PRODUCTS[S.product], n = num(v); if (isNaN(n) || n % 1) return "Enter the term as whole months, for example 12."; if (p && p.terms && p.terms.indexOf(n) < 0) return p.name + " terms are " + p.terms.join(", ").replace(/, (\d+)$/, " or $1") + " months."; if (p && (n < p.t0 || n > p.t1)) return p.name + " terms run from " + p.t0 + " to " + p.t1 + " months."; return ""; } },
      { id: "agent", label: "Endorsed by", req: 1, opts: ["", "No agent (walk-in)"].concat(OPT && OPT.agents ? OPT.agents.map(function (a) { return a.name; }) : ["J. Espiritu", "R. Dizon", "K. Bernardo"]), help: "Every application is linked to its sales agent, or marked walk-in." },
      { id: "purpose", label: "Purpose of the loan", req: 1, area: 1, wide: 1 } ] },
    { id: "borrower", title: "The borrower", hint: "Copy these exactly as they appear on the government ID.", fields: [
      { id: "name", label: "Full name", req: 1, auto: "off", check: function (v) { return v.trim().split(/\s+/).length < 2 ? "Enter the first and last name as on the ID." : ""; } },
      { id: "dob", label: "Date of birth", req: 1, type: "date", check: function (v) { var d = new Date(v), a = (Date.now() - d) / 31557600000; return isNaN(d) ? "Enter the date of birth." : a < 18 ? "The borrower must be at least 18 years old." : a > 100 ? "Check the year of birth." : ""; } },
      { id: "idtype", label: "Government ID", req: 1, opts: [""].concat(Object.keys(IDS)) },
      { id: "idno", label: "ID number", req: 1, auto: "off", check: function (v, S) { var t = IDS[S.idtype]; return t && !t[0].test(v.trim()) ? S.idtype + " numbers look like " + t[1] + "." : ""; } },
      { id: "mobile", label: "Mobile number", req: 1, mode: "tel", check: function (v) { return /^09\d{9}$/.test(v.replace(/[\s-]/g, "")) ? "" : "Enter an 11-digit mobile number starting with 09."; } },
      { id: "email", label: "Email address", mode: "email", help: "Leave blank if none. The sales agent will relay updates in person.", check: function (v) { return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? "" : "Check the email address. It should look like name@example.com."; } },
      { id: "address", label: "Home address", req: 1, area: 1, wide: 1 } ] },
    { id: "work", title: "Employment", only: ["salary", "personal"], hint: "From the pay stub or certificate of employment.", fields: [
      { id: "employer", label: "Employer", req: 1 }, { id: "position", label: "Position", req: 1 },
      { id: "years", label: "Years with employer", req: 1, mode: "decimal", check: function (v) { return isNaN(num(v)) ? "Enter the number of years, for example 3." : ""; } },
      { id: "income", label: "Gross monthly income (pesos)", req: 1, mode: "decimal", money: 1, check: money },
      { id: "debts", label: "Other monthly debt payments (pesos)", req: 1, mode: "decimal", money: 1, check: money, help: "Enter 0.00 if there are none. Used for the debt-to-income ratio." } ] },
    { id: "biz", title: "The business", only: ["sme"], hint: "From the business permit, registration and financial statements.", fields: [
      { id: "bizname", label: "Registered business name", req: 1 }, { id: "bizreg", label: "DTI or SEC registration number", req: 1 },
      { id: "biznature", label: "Nature of business", req: 1 },
      { id: "bizyears", label: "Years operating", req: 1, mode: "decimal", check: function (v) { return isNaN(num(v)) ? "Enter the number of years, for example 4." : ""; } },
      { id: "income", label: "Average monthly cash flow (pesos)", req: 1, mode: "decimal", money: 1, check: money },
      { id: "debts", label: "Other monthly debt payments (pesos)", req: 1, mode: "decimal", money: 1, check: money, help: "Enter 0.00 if there are none." },
      { id: "collateral", label: "Appraised value of collateral (pesos)", mode: "decimal", money: 1, help: "Leave blank if no collateral is declared.", check: function (v) { return v ? money(v) : ""; } } ] },
    { id: "consent", title: "Consent", hint: "No credit bureau inquiry can be made without the borrower's signed consent on file.", fields: [] },
    { id: "send", title: "Submit", hint: "Submitting issues the reference number and records you as the encoder.", fields: [] }
  ];
  var S = { product: "" }, touched = {}, tried = false, consent = null, done = null, fs = $("fs");
  try { var saved = JSON.parse(localStorage.getItem("calmsNewApp") || "null"); if (saved && saved.S) { S = saved.S; $("saved").textContent = "Draft restored from " + saved.at; } } catch (e) {}
  function secs() { return SECTIONS.filter(function (x) { return !x.only || x.only.indexOf(S.product) >= 0; }); }
  function fieldsNow() { var L = []; secs().forEach(function (s) { s.fields.forEach(function (f) { L.push(f); }); }); return L; }
  function err(f) { var v = String(S[f.id] || ""); if (!v.trim()) return f.req ? "Fill in: " + f.label.replace(" (pesos)", "").toLowerCase() + "." : ""; return f.check ? f.check(v, S) : ""; }
  var liveDup = null, dupT = null, dupKey = "";
  function dup() { if (LIVE) return liveDup; var n = String(S.name || "").trim().toLowerCase().replace(/\s+/g, " "); return ACTIVE.filter(function (a) { return a[0] === n && a[1] === S.product; })[0]; }
  /* online: ask the server, a moment after typing stops, whether this borrower already has an active one */
  function askDup() { if (!LIVE) return; var p = PRODUCTS[S.product], key = [S.name, S.product, S.idtype, S.idno].join("|"); if (key === dupKey) return; dupKey = key; clearTimeout(dupT);
    if (!p || String(S.name || "").trim().split(/\s+/).length < 2) { if (liveDup) { liveDup = null; refresh(); } return; }
    dupT = setTimeout(function () { CALMS.api("GET", "/api/applications/new/check?product=" + encodeURIComponent(p.name) + "&name=" + encodeURIComponent(S.name) + "&idType=" + encodeURIComponent(S.idtype || "") + "&idNo=" + encodeURIComponent(S.idno || ""))
      .then(function (d) { var x = d.duplicate; liveDup = x ? [S.name, S.product, x.reference, ({ draft: "Draft", submitted: "Submitted", review: "Under Review", approved: "Approved", awaiting: "Awaiting Borrower", accepted: "Accepted" })[x.status] || x.status] : null; refresh(); }, function () {}); }, 500); }
  function late() { var n = String(S.name || "").trim().toLowerCase().replace(/\s+/g, " "); return PASTDUE.filter(function (a) { return a[0] === n; })[0]; }

  function build() {
    fs.textContent = "";
    secs().forEach(function (sec, si) {
      var s = el("section", "sec"); s.id = "sec-" + sec.id;
      var h = el("h2", "sh"); h.appendChild(el("small", "", (si + 1) + ".")); h.appendChild(document.createTextNode(sec.title)); s.appendChild(h); s.appendChild(el("p", "hint", sec.hint));
      if (sec.id === "request") {
        var tk = el("div", "tickets"); tk.setAttribute("role", "radiogroup"); tk.setAttribute("aria-label", "Loan product");
        Object.keys(PRODUCTS).forEach(function (k) { var p = PRODUCTS[k], lab = el("label", "ticket"), inp = el("input"), sp = el("span"); inp.type = "radio"; inp.name = "product"; inp.id = "product-" + k; inp.value = k; inp.checked = S.product === k;
          inp.addEventListener("change", function () { S.product = k; build(); refresh(); save(); askDup(); var again = $("product-" + k); if (again) again.focus(); });
          sp.appendChild(el("b", "", p.name)); sp.appendChild(document.createTextNode(p.who)); sp.appendChild(el("span", "", peso(p.min) + " to " + peso(p.max))).style.cssText = "display:block;padding:0;border:0;background:none;font:700 13px/1.4 var(--figure);color:inherit";
          lab.appendChild(inp); lab.appendChild(sp); tk.appendChild(lab); });
        s.appendChild(tk);
        var pe = el("div", "f"); pe.appendChild(el("div", "e")).id = "e-product"; s.appendChild(pe);
      }
      if (sec.fields.length) {
        var g = el("div", "fields");
        sec.fields.forEach(function (f) {
          var w = el("div", "f" + (f.wide ? " wide" : "")), lab = el("label", "", f.label); lab.htmlFor = "f-" + f.id; if (f.req) { lab.appendChild(document.createTextNode(" ")); lab.appendChild(el("b", "", "*")); }
          var inp;
          if (f.opts) { inp = el("select"); f.opts.forEach(function (o) { var op = el("option", "", o || "Choose…"); op.value = o; inp.appendChild(op); }); }
          else if (f.area) inp = el("textarea"); else { inp = el("input"); inp.type = f.type || "text"; if (f.mode) inp.inputMode = f.mode; }
          inp.id = "f-" + f.id; inp.name = f.id; inp.value = S[f.id] || ""; inp.autocomplete = f.auto || "off"; if (f.req) inp.required = true; inp.setAttribute("aria-describedby", "e-" + f.id + (f.help ? " h-" + f.id : ""));
          if (f.id === "idno") inp.placeholder = (IDS[S.idtype] || [0, ""])[1];
          var on = function () { S[f.id] = inp.value; refresh(); save(); askDup(); if (f.id === "idtype") { var x = $("f-idno"); if (x) x.placeholder = (IDS[S.idtype] || [0, ""])[1]; } };
          inp.addEventListener("input", on); inp.addEventListener("change", on);
          inp.addEventListener("blur", function () { touched[f.id] = true; if (f.money && !isNaN(num(inp.value)) && inp.value.trim()) { inp.value = num(inp.value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); S[f.id] = inp.value; } refresh(); });
          inp.addEventListener("focus", function () { look(inp); });
          w.appendChild(lab); w.appendChild(inp); if (f.help) { var hh = el("div", "h", f.help); hh.id = "h-" + f.id; w.appendChild(hh); }
          var e = el("div", "e"); e.id = "e-" + f.id; w.appendChild(e); g.appendChild(w);
        });
        s.appendChild(g);
      }
      if (sec.id === "borrower") { var w1 = el("div"); w1.id = "warns"; s.appendChild(w1); }
      if (sec.id === "consent") {
        var slot = el("div", "slot" + (consent ? " on" : "")); slot.id = "slot";
        slot.appendChild(el("span", "lab", "Signed consent form (PDF, JPG or PNG, up to 10 MB) ")).appendChild(el("b", "", "*"));
        var fi = el("input"); fi.type = "file"; fi.id = "f-consent"; fi.accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"; fi.setAttribute("aria-describedby", "e-consent");
        fi.addEventListener("change", function () { var file = fi.files[0], e = $("e-consent"); consent = null;
          if (file && !/\.(pdf|jpe?g|png)$/i.test(file.name)) e.textContent = "That file type is not accepted. Use a PDF, JPG or PNG.";
          else if (file && file.size > 10 * 1048576) e.textContent = "That file is larger than 10 MB. Scan it at a lower resolution and try again.";
          else if (file) { e.textContent = ""; consent = { name: file.name, at: stampTime(), file: file }; }
          paintConsent(true); refresh(); });
        slot.appendChild(fi); var ee = el("div", "e"); ee.id = "e-consent"; ee.style.color = "var(--red)"; ee.style.fontSize = "14px"; slot.appendChild(ee);
        var st = el("div"); st.id = "cstamp"; slot.appendChild(st); s.appendChild(slot);
        var ck = el("label", "check"); var cb = el("input"); cb.type = "checkbox"; cb.id = "f-agree"; cb.checked = !!S.agree; cb.addEventListener("change", function () { S.agree = cb.checked; refresh(); save(); });
        ck.appendChild(cb); ck.appendChild(el("span", "", "The borrower signed this form in writing, consenting to credit investigation and to the processing of personal data for this loan.")); ck.style.marginTop = "12px"; s.appendChild(ck);
        var ae = el("div", "e"); ae.id = "e-agree"; ae.style.cssText = "color:var(--red);font-size:14px;margin-top:4px"; s.appendChild(ae);
      }
      if (sec.id === "send") { var bt = el("div", "btns"), b1 = el("button", "act", "Submit application"), b2 = el("button", "act quiet", "Save draft"), b3 = el("button", "act quiet", "Clear the form"); b1.type = "submit"; b2.type = "button"; b3.type = "button";
        b2.addEventListener("click", function () { save(true); $("note").textContent = "Draft saved. You can close this page and resume later."; });
        b3.addEventListener("click", function () { S = { product: "" }; touched = {}; tried = false; consent = null; try { localStorage.removeItem("calmsNewApp"); } catch (e) {} $("saved").textContent = "Not saved yet"; build(); refresh(); $("note").textContent = "Form cleared."; });
        bt.appendChild(b1); bt.appendChild(b2); bt.appendChild(b3); s.appendChild(bt); }
      fs.appendChild(s);
    });
    paintConsent(false);
  }
  function stampTime() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  function paintConsent(slam) { var st = $("cstamp"), slot = $("slot"); if (!st) return; st.textContent = ""; slot.classList.toggle("on", !!consent); if (consent) { st.appendChild(el("span", "stamp" + (slam ? " slam" : ""), "Consent on file")); st.appendChild(el("div", "h", consent.name + " · received " + consent.at + " · by " + me()[1])).style.marginTop = "6px"; } }

  function refresh() {
    var F = fieldsNow(), missing = [], bad = 0;
    F.forEach(function (f) { var e = err(f), inp = $("f-" + f.id), box = $("e-" + f.id), show = e && (tried || touched[f.id]) && !(e.indexOf("Fill in") === 0 && !tried);
      if (e) { missing.push([f, e]); if (e.indexOf("Fill in") !== 0) bad++; }
      if (inp) { if (show) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid"); } if (box) box.textContent = show ? e : ""; });
    var ep = $("e-product"); if (ep) ep.textContent = tried && !S.product ? "Choose a loan product." : "";
    var ea = $("e-agree"); if (ea) ea.textContent = tried && !S.agree ? "Confirm that the borrower signed the consent form." : "";
    var ec = $("e-consent"); if (ec && tried && !consent && !ec.textContent) ec.textContent = "Upload the signed consent form. The application cannot advance without it.";
    var d = dup(), l = late(), w = $("warns");
    if (w) { w.textContent = "";
      if (d) { var x = el("div", "warn"); x.appendChild(el("b", "", "Duplicate application")); x.appendChild(document.createTextNode(S.name.trim() + " already has an active " + PRODUCTS[S.product].name.replace(/^(\w)(?=[a-z])/, function (m) { return m.toLowerCase(); }) + " application, " + d[2] + " (" + d[3] + "). A second one cannot be created while it is active. Open that application instead.")); w.appendChild(x); }
      if (l) { var y = el("div", "warn soft"); y.appendChild(el("b", "", "Past-due account on record")); y.appendChild(document.createTextNode("Loan account " + l[1] + " is " + l[2] + ". You may encode this application, but it cannot be approved without documented management approval.")); w.appendChild(y); } }
    /* tabs */
    var tabs = $("tabs"); tabs.textContent = "";
    secs().forEach(function (sec) { var left = sec.fields.filter(function (f) { return err(f); }).length + (sec.id === "request" && !S.product ? 1 : 0) + (sec.id === "consent" ? (consent ? 0 : 1) + (S.agree ? 0 : 1) : 0);
      if (sec.id === "send") left = -1;
      var li = el("li"), a = el("a", left === 0 ? "ok" : "", sec.title); a.href = "#sec-" + sec.id; if (left >= 0) a.appendChild(el("i", "", left === 0 ? "done" : left + " left"));
      a.addEventListener("click", function (e) { e.preventDefault(); var t = $("sec-" + sec.id); t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); var c = t.querySelector("input, select, textarea, button"); if (c) c.focus({ preventScroll: true }); });
      li.appendChild(a); tabs.appendChild(li); });
    /* slip */
    var p = PRODUCTS[S.product], amt = num(S.amount), n = num(S.term), T = $("terms"); T.textContent = "";
    var row = function (k, v, c) { T.appendChild(el("dt", c || "", k)); T.appendChild(el("dd", c || "", v)); };
    row("Product", p ? p.name : "—"); row("Amount", isNaN(amt) ? "—" : peso(amt)); row("Term", isNaN(n) ? "—" : n + " months");
    if (p && !isNaN(amt) && !isNaN(n) && n > 0 && !err({ id: "amount", req: 1, check: SECTIONS[0].fields[0].check }) && !err({ id: "term", req: 1, check: SECTIONS[0].fields[1].check })) {
      var r = p.rate / 100, inst = p.method === "flat" ? (amt + amt * r * n) / n : amt * r / (1 - Math.pow(1 + r, -n)), total = inst * n;
      row("Interest", p.rate + "% a month, " + p.method); row("Total to repay", peso(total)); row("Each month", peso(inst), "tot");
      var inc = num(S.income), debts = num(S.debts); if (!isNaN(inc) && inc > 0 && !isNaN(debts)) row("Debt-to-income with this loan", ((debts + inst) / inc * 100).toFixed(1) + "%");
      var col = num(S.collateral); if (S.product === "sme" && !isNaN(col) && col > 0) row("Loan-to-value", (amt / col * 100).toFixed(1) + "%");
    }
    $("rule").textContent = p ? (LIVE ? "An estimate from the product's terms on file, before charges." : "An estimate from the example product terms, before charges.") + " Final terms are set at approval and may come back as a counter-offer." : "Pick a product to see its limits and an estimate.";
    var G = $("gate"); G.textContent = "";
    var reqLeft = missing.filter(function (m) { return m[0].req; }).length + (S.product ? 0 : 1), okAll = !reqLeft && !bad && consent && S.agree && !d;
    [[!reqLeft, reqLeft ? reqLeft + " required field" + (reqLeft > 1 ? "s" : "") + " still blank or wrong" : "All required fields filled"], [!bad, bad ? bad + " entr" + (bad > 1 ? "ies" : "y") + " in the wrong format" : "Formats check out"], [!!consent && !!S.agree, consent && S.agree ? "Signed consent on file" : "Signed consent not yet on file"], [!d, d ? "Duplicate of " + d[2] : "No duplicate active application"]].forEach(function (g) { var li = el("li", g[0] ? "ok" : "no"); li.appendChild(el("i", "", g[0] ? "✓" : "×")); li.appendChild(el("span", "", g[1])); G.appendChild(li); });
    if (!done) say(okAll ? "Nothing missing. Submit it before I change my mind." : d ? "That borrower already has one of these open. I am not letting a second through." : tried ? "Not yet. Fix what is marked in red." : !S.product ? "Start with the product. It decides what I ask for." : reqLeft + " blank" + (reqLeft === 1 ? "" : "s") + " to go. Copy from the papers, not from memory.", okAll ? "ready" : d || tried && (reqLeft || bad) ? "alert" : "idle");
    return { missing: missing, ok: okAll, dup: d };
  }
  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null, kM = "";
  var MOOD = { idle: [[28, 2400], [3, 110]], alert: [[22, 80], [23, 700], [24, 1600]], ready: [[18, 140], [19, 420], [18, 140], [0, 2600]], done: [[18, 140], [19, 420], [18, 140], [13, 900], [14, 900], [15, 900]] };
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function say(text, m) { $("says").textContent = text; if (m === kM) return; kM = m; clearTimeout(kT); var seq = MOOD[m], i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i = (i + 1) % seq.length; if (m === "done" && i === 0) i = 3; kT = setTimeout(step, d); })(); }
  function look(inp) { if (kM !== "idle" || reduce) return; var a = inp.getBoundingClientRect(), b = kuwa.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top; clearTimeout(kT); kFrame(Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx < 0 ? 25 : 26) : (dy < 0 ? 27 : 28)); kT = setTimeout(function () { var m = kM; kM = ""; say($("says").textContent, m); }, 1600); }
  var sT = null;
  function save(now) { clearTimeout(sT); sT = setTimeout(function () { if (done) return; var at = new Date().toLocaleTimeString("en-PH", { hour12: false }); try { localStorage.setItem("calmsNewApp", JSON.stringify({ S: S, at: at })); $("saved").textContent = "Draft saved " + at + " · " + me()[0]; } catch (e) { $("saved").textContent = "Draft kept on this page only"; } }, now ? 0 : 700); }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault(); if (done) return; tried = true; var r = refresh(), sum = $("sum"), items = [];
    if (!S.product) items.push(["Choose a loan product.", "product-salary"]);
    r.missing.forEach(function (m) { items.push([m[1], "f-" + m[0].id]); });
    if (!consent) items.push(["Upload the signed consent form.", "f-consent"]); if (!S.agree) items.push(["Confirm that the borrower signed the consent form.", "f-agree"]);
    if (r.dup) items.push(["This borrower already has an active application, " + r.dup[2] + ".", "f-name"]);
    if (items.length) { sum.hidden = false; sum.textContent = ""; sum.appendChild(el("b", "", "Not submitted. " + items.length + " thing" + (items.length > 1 ? "s" : "") + " to fix:")); var ul = el("ul"); items.forEach(function (it) { var li = el("li"), a = el("a", "", it[0]); a.href = "#" + it[1]; a.addEventListener("click", function (ev) { ev.preventDefault(); var t = $(it[1]); if (t) { t.scrollIntoView({ block: "center" }); t.focus({ preventScroll: true }); } }); li.appendChild(a); ul.appendChild(li); }); sum.appendChild(ul); sum.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); sum.focus({ preventScroll: true }); return; }
    sum.hidden = true;
    if (LIVE) { send(); return; }
    finish("APP-2026-0446");
  });
  /* ---- online: send it ---- */
  var sending = false;
  function fileData(f) { return new Promise(function (ok, bad) { var r = new FileReader(); r.onload = function () { ok(String(r.result).split(",")[1] || ""); }; r.onerror = function () { bad(new Error("The consent file could not be read.")); }; r.readAsDataURL(f); }); }
  function send() {
    if (sending) return; sending = true; var btn = document.querySelector("#form button[type=submit]"); if (btn) { btn.disabled = true; btn.textContent = "Submitting…"; }
    var p = PRODUCTS[S.product], keys = S.product === "sme" ? ["bizname", "bizreg", "biznature", "bizyears", "income", "debts", "collateral"] : ["employer", "position", "years", "income", "debts"], details = {};
    keys.forEach(function (k) { details[k] = S[k] || ""; });
    fileData(consent.file).then(function (data) {
      return CALMS.api("POST", "/api/applications", { product: p.name, amount: S.amount, termMonths: Number(String(S.term).replace(/[^0-9]/g, "")), agent: S.agent, purpose: S.purpose,
        borrower: { name: S.name, dob: S.dob, idType: S.idtype, idNo: S.idno, mobile: S.mobile, email: S.email, address: S.address }, details: details,
        consentConfirmed: !!S.agree, consent: { name: consent.name, data: data } });
    }).then(function (d) { sending = false; finish(d.reference); }, function (err) {
      sending = false; if (btn) { btn.disabled = false; btn.textContent = "Submit application"; }
      var sum = $("sum"), F = err.fields || {}, ks = Object.keys(F); sum.hidden = false; sum.textContent = "";
      sum.appendChild(el("b", "", "Not submitted. " + (err.status === 409 ? err.message : ks.length ? "The office's records say " + ks.length + " thing" + (ks.length > 1 ? "s need" : " needs") + " fixing:" : err.message || "The server could not be reached. Try again.")));
      if (ks.length && err.status !== 409) { var ul = el("ul"); ks.forEach(function (k) { var li = el("li"), id = k === "product" ? "product-" + (Object.keys(PRODUCTS)[0] || "") : "f-" + k, a = el("a", "", F[k]); a.href = "#" + id; a.addEventListener("click", function (ev) { ev.preventDefault(); var t = $(id); if (t) { t.scrollIntoView({ block: "center" }); t.focus({ preventScroll: true }); } }); li.appendChild(a); ul.appendChild(li); var box = $("e-" + k); if (box) box.textContent = F[k]; }); sum.appendChild(ul); }
      if (err.status === 409 && err.message) { var m = /APP-\d{4}-\d{4}/.exec(err.message); if (m) { var go = el("a", "act quiet", "Open " + m[0]); go.href = "application-detail.html?ref=" + m[0]; go.style.marginTop = "8px"; go.style.display = "inline-block"; sum.appendChild(go); } }
      sum.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" }); sum.focus({ preventScroll: true });
      say(err.status === 409 ? "That borrower already has one of these open. I am not letting a second through." : "The office sent it back. Fix what is marked.", "alert");
    });
  }
  function finish(ref) {
    done = { ref: ref, at: stampTime() };
    try { localStorage.removeItem("calmsNewApp"); } catch (er) {}
    fs.disabled = true; $("refline").textContent = done.ref + " · submitted " + done.at + " · encoded by " + me()[1];
    var big = el("div", "big", "Submitted"); big.appendChild(el("small", "", done.ref)); $("form").appendChild(big);
    $("saved").textContent = "Submitted " + done.at;
    if (LIVE) { var nt = $("note"); nt.textContent = done.ref + " is on file with its signed consent form. "; var a1 = el("a", "", "Open the application"); a1.href = "application-detail.html?ref=" + done.ref; var a2 = el("a", "", "file the other papers"); a2.href = "documents.html?ref=" + done.ref; nt.appendChild(a1); nt.appendChild(document.createTextNode(" or ")); nt.appendChild(a2); nt.appendChild(document.createTextNode(". Reload this page to start another.")); }
    else $("note").textContent = "Prototype: " + done.ref + " would now open on Documents and checklist. Nothing was sent. Reload the page to start another.";
    say("Reference " + done.ref + ". Now bring me the documents.", "done");
    $("form").scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  }
  var NAV = [["My Queue", 0], ["Applications", 0], ["New application", 1], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), a = el("a"); a.href = "#"; a.appendChild(el("span", "plate", n[0])); if (n[1]) a.setAttribute("aria-current", "page"); else { a.setAttribute("aria-disabled", "true"); a.title = "A separate prototype page"; }
    a.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is a separate prototype page."; }); li.appendChild(a); nav.appendChild(li); });
  build(); refresh();
});
