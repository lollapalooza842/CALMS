/* New application, classic: encode a borrower's application step by step from her papers, attach the signed consent, review it and submit. */
(function () {
  var h = CK.h, KEY = "calmsNewApp";
  /* the western page covers itself with its own notice when the options cannot be opened; this page says it instead */
  function quiet() { var n = 0, t = setInterval(function () { var d = document.getElementById("calmsDown"); if (d) d.remove(); document.body.classList.remove("calms-down"); if (++n > 25) clearInterval(t); }, 200); }
  CK.loading();
  Promise.all([CK.api("GET", "/api/applications/new/options"), CK.api("GET", "/api/auth/me").then(null, function () { return {}; })]).then(function (r) {
    start(r[0] || {}, (r[1] && r[1].user) || (window.CALMS && CALMS.user) || {});
  }, function (e) {
    if (e && e.status === 401) return; quiet();
    if (e && e.status === 403) { CK.render([CK.head({ crumbs: [["Applications", "applications.html"], ["New application"]], title: "New application" }),
      CK.card(null, [CK.empty("Only a loan processor encodes new applications", (e.message || "Your role cannot open this.") + " Ask a loan processor to encode it from the borrower's papers.", "lock"),
        h("div.ck-actions.ck-center", CK.btn("Back to applications", { kind: "primary", href: "applications.html" }))])]); return; }
    CK.error(e, "applications.html");
  });

  function start(OPT, ME) {
    var P = {}; (OPT.products || []).forEach(function (p) { P[p.key] = p; });
    var MEN = [ME.name || "you", ME.shortName || ME.name || "you"];
    function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function num(v) { var n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isFinite(n) ? n : NaN; }
    var IDS = { "PhilSys ID": [/^\d{4}-\d{4}-\d{4}-\d{4}$/, "0000-0000-0000-0000"], "TIN": [/^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/, "000-000-000-000"], "SSS": [/^\d{2}-\d{7}-\d$/, "00-0000000-0"], "Driver's license": [/^[A-Z]\d{2}-\d{2}-\d{6}$/i, "A00-00-000000"], "Passport": [/^[A-Z]\d{7}[A-Z]$/i, "P0000000A"] };
    var money = function (v) { return isNaN(num(v)) || num(v) < 0 ? "Enter an amount in pesos, for example 25,000.00." : ""; };
    var years = function (eg) { return function (v) { return isNaN(num(v)) ? "Enter the number of years, for example " + eg + "." : ""; }; };
    /* the same sections, fields, rules and words as the western form */
    var SECTIONS = [
      { id: "request", title: "The request", short: "Request", icon: "peso", hint: "Pick the product first. It decides which fields the form asks for.", fields: [
        { id: "amount", label: "Amount requested (pesos)", req: 1, mode: "decimal", money: 1, check: function (v, S) { var p = P[S.product]; if (money(v)) return money(v); if (p && (num(v) < p.min || num(v) > p.max)) return p.name + " runs from " + peso(p.min) + " to " + peso(p.max) + "."; return ""; } },
        { id: "term", label: "Term (months)", req: 1, mode: "numeric", check: function (v, S) { var p = P[S.product], n = num(v); if (isNaN(n) || n % 1) return "Enter the term as whole months, for example 12."; if (p && p.terms && p.terms.indexOf(n) < 0) return p.name + " terms are " + p.terms.join(", ").replace(/, (\d+)$/, " or $1") + " months."; if (p && (n < p.t0 || n > p.t1)) return p.name + " terms run from " + p.t0 + " to " + p.t1 + " months."; return ""; } },
        { id: "agent", label: "Endorsed by", req: 1, opts: ["No agent (walk-in)"].concat((OPT.agents || []).map(function (a) { return a.name; })), help: "Every application is linked to its sales agent, or marked walk-in." },
        { id: "purpose", label: "Purpose of the loan", req: 1, area: 1, wide: 1 } ] },
      { id: "borrower", title: "The borrower", short: "Borrower", icon: "user", hint: "Copy these exactly as they appear on the government ID.", fields: [
        { id: "name", label: "Full name", req: 1, check: function (v) { return v.trim().split(/\s+/).length < 2 ? "Enter the first and last name as on the ID." : ""; } },
        { id: "dob", label: "Date of birth", req: 1, type: "date", check: function (v) { var d = new Date(v), a = (Date.now() - d) / 31557600000; return isNaN(d) ? "Enter the date of birth." : a < 18 ? "The borrower must be at least 18 years old." : a > 100 ? "Check the year of birth." : ""; } },
        { id: "idtype", label: "Government ID", req: 1, opts: Object.keys(IDS) },
        { id: "idno", label: "ID number", req: 1, check: function (v, S) { var t = IDS[S.idtype]; return t && !t[0].test(v.trim()) ? S.idtype + " numbers look like " + t[1] + "." : ""; } },
        { id: "mobile", label: "Mobile number", req: 1, mode: "tel", check: function (v) { return /^09\d{9}$/.test(v.replace(/[\s-]/g, "")) ? "" : "Enter an 11-digit mobile number starting with 09."; } },
        { id: "email", label: "Email address", mode: "email", help: "Leave blank if none. The sales agent will relay updates in person.", check: function (v) { return !v || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? "" : "Check the email address. It should look like name@example.com."; } },
        { id: "address", label: "Home address", req: 1, area: 1, wide: 1 } ] },
      { id: "work", title: "Employment", icon: "users", only: ["salary", "personal"], hint: "From the pay stub or certificate of employment.", fields: [
        { id: "employer", label: "Employer", req: 1 }, { id: "position", label: "Position", req: 1 },
        { id: "years", label: "Years with employer", req: 1, mode: "decimal", check: years(3) },
        { id: "income", label: "Gross monthly income (pesos)", req: 1, mode: "decimal", money: 1, check: money },
        { id: "debts", label: "Other monthly debt payments (pesos)", req: 1, mode: "decimal", money: 1, check: money, help: "Enter 0.00 if there are none. Used for the debt-to-income ratio." } ] },
      { id: "biz", title: "The business", short: "Business", icon: "bank", only: ["sme"], hint: "From the business permit, registration and financial statements.", fields: [
        { id: "bizname", label: "Registered business name", req: 1 }, { id: "bizreg", label: "DTI or SEC registration number", req: 1 },
        { id: "biznature", label: "Nature of business", req: 1 },
        { id: "bizyears", label: "Years operating", req: 1, mode: "decimal", check: years(4) },
        { id: "income", label: "Average monthly cash flow (pesos)", req: 1, mode: "decimal", money: 1, check: money },
        { id: "debts", label: "Other monthly debt payments (pesos)", req: 1, mode: "decimal", money: 1, check: money, help: "Enter 0.00 if there are none." },
        { id: "collateral", label: "Appraised value of collateral (pesos)", mode: "decimal", money: 1, help: "Leave blank if no collateral is declared.", check: function (v) { return v ? money(v) : ""; } } ] },
      { id: "consent", title: "Consent", icon: "shield", hint: "No credit bureau inquiry can be made without the borrower's signed consent on file.", fields: [] },
      { id: "send", title: "Review and submit", short: "Review", icon: "send", hint: "Submitting issues the reference number and records you as the encoder.", fields: [] }
    ];
    var S = { product: "" }, touched = {}, tried = {}, triedAll = false, consent = null, srv = {}, cur = "request", sending = false, savedAt = "Not saved yet", dupKey = "", dupT = 0, liveDup = null, sT = 0;
    try { var sv = JSON.parse(localStorage.getItem(KEY) || "null"); if (sv && sv.S) { S = sv.S; if (S.product && !P[S.product]) S.product = ""; savedAt = "Draft restored from " + sv.at; } } catch (e) {}

    function secs() { return SECTIONS.filter(function (x) { return !x.only || x.only.indexOf(S.product) >= 0; }); }
    function sec(id) { return SECTIONS.filter(function (x) { return x.id === id; })[0]; }
    function secOf(key) { if (key === "product") return "request"; if (key === "consent" || key === "agree") return "consent"; var s = secs().filter(function (x) { return x.fields.some(function (f) { return f.id === key; }); })[0]; return s ? s.id : "request"; }
    function fieldsNow() { var L = []; secs().forEach(function (s) { s.fields.forEach(function (f) { L.push(f); }); }); return L; }
    function err(f) { if (srv[f.id]) return srv[f.id]; var v = String(S[f.id] || ""); if (!v.trim()) return f.req ? "Fill in: " + f.label.replace(" (pesos)", "").toLowerCase() + "." : ""; return f.check ? f.check(v, S) : ""; }
    function leftIn(s) { if (s.id === "send") return -1; return s.fields.filter(function (f) { return err(f); }).length + (s.id === "request" && !S.product ? 1 : 0) + (s.id === "consent" ? (consent ? 0 : 1) + (S.agree ? 0 : 1) : 0); }
    function isTried(id) { return triedAll || tried[id]; }
    function lc(t) { return t.replace(/^(\w)(?=[a-z])/, function (m) { return m.toLowerCase(); }); }
    function stamp() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }

    /* ---- the draft, kept in this browser like the western form (same key, so it carries across looks) ---- */
    var chip = h("span.ck-savechip", CK.ic("clock"), h("span", savedAt));
    function save(now) { clearTimeout(sT); sT = setTimeout(function () { var at = new Date().toLocaleTimeString("en-PH", { hour12: false });
      try { localStorage.setItem(KEY, JSON.stringify({ S: S, at: at })); chip.lastChild.textContent = "Draft saved " + at + " · " + MEN[0]; } catch (e) { chip.lastChild.textContent = "Draft kept on this page only"; } chip.classList.remove("pop"); void chip.offsetWidth; chip.classList.add("pop"); }, now ? 0 : 700); }

    /* ---- is she already in the middle of one? asked a moment after typing stops ---- */
    function askDup() { var p = P[S.product], key = [S.name, S.product, S.idtype, S.idno].join("|"); if (key === dupKey) return; dupKey = key; clearTimeout(dupT);
      if (!p || String(S.name || "").trim().split(/\s+/).length < 2) { if (liveDup) { liveDup = null; refresh(); } return; }
      dupT = setTimeout(function () { CK.api("GET", "/api/applications/new/check?product=" + encodeURIComponent(p.name) + "&name=" + encodeURIComponent(S.name) + "&idType=" + encodeURIComponent(S.idtype || "") + "&idNo=" + encodeURIComponent(S.idno || ""))
        .then(function (d) { var x = d.duplicate; liveDup = x ? { ref: x.reference, st: (CK.ST[x.status] || [x.status])[0] } : null; refresh(); }, function () {}); }, 500); }

    /* ---- the frame: steps on top, one section at a time, the terms and the gate beside ---- */
    var wiz = h("nav.ck-wiz", { "aria-label": "Sections" }), bar = h("div.ck-wizbar", h("i")), panel = h("div.ck-wpanel"), foot = h("div.ck-wfoot");
    var terms = h("dl.ck-dl.rows"), rule = h("p.ck-hint"), gate = h("ul.ck-gate");
    var clearBtn = CK.btn("Clear the form", { kind: "ghost", icon: "refresh", on: function () {
      CK.modal({ title: "Clear the form?", body: [h("p", "Everything typed here and the attached consent form are removed from this browser. Nothing has been sent.")], actions: [["Keep it", "ghost"], ["Clear the form", "danger", function (close) {
        S = { product: "" }; touched = {}; tried = {}; triedAll = false; consent = null; srv = {}; liveDup = null; dupKey = ""; try { localStorage.removeItem(KEY); } catch (e) {}
        chip.lastChild.textContent = "Not saved yet"; close(); go("request", -1); CK.toast("Form cleared.", "blue"); }]] }); } });
    var reg = {};   /* the fields drawn in the open section: id -> {field, input} */
    var sumBox = h("div.ck-stack.ck-sumbox"), warnBox = h("div.ck-stack.ck-warns");

    function drawWiz() { var L = secs(), i0 = L.map(function (s) { return s.id; }).indexOf(cur); wiz.textContent = "";
      L.forEach(function (s, i) { var left = leftIn(s), done = left === 0, now = s.id === cur, bad = !now && left > 0 && isTried(s.id);
        wiz.appendChild(h("button.ck-wstep" + (now ? ".is-now" : "") + (done ? ".is-done" : "") + (bad ? ".is-bad" : ""), { type: "button", "aria-current": now ? "step" : null, on: { click: function () { go(s.id); } } },
          h("span.dot", done && !now ? CK.ic("check") : bad ? CK.ic("alert") : String(i + 1)), h("span.t", h("b", s.short || s.title), h("small", s.id === "send" ? "Last look" : done ? "Done" : left + " left")))); });
      bar.firstChild.style.width = (L.length > 1 ? i0 / (L.length - 1) * 100 : 0) + "%"; }

    /* ---- one field ---- */
    function fieldFor(f) {
      var inp, opt = { req: !!f.req, wide: !!f.wide, hint: f.help };
      if (f.opts) inp = CK.select([["", "Choose…"]].concat(f.opts.map(function (o) { return [o, o]; })), S[f.id] || "");
      else if (f.area) { inp = CK.textarea(S[f.id] || ""); inp.value = S[f.id] || ""; }
      else inp = CK.input({ type: f.type || "text", mode: f.mode, value: S[f.id] || "", ph: f.id === "idno" ? (IDS[S.idtype] || [0, ""])[1] : f.money ? "0.00" : null });
      inp.id = "na-" + f.id; inp.name = f.id;
      var fld = CK.field(f.label, inp, opt);
      var on = function () { S[f.id] = inp.value; delete srv[f.id]; refresh(); save(); askDup(); if (f.id === "idtype" && reg.idno) reg.idno.input.placeholder = (IDS[S.idtype] || [0, ""])[1]; };
      inp.addEventListener("input", on); inp.addEventListener("change", on);
      inp.addEventListener("blur", function () { touched[f.id] = true; if (f.money && inp.value.trim() && !isNaN(num(inp.value))) { inp.value = num(inp.value).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); S[f.id] = inp.value; save(); } refresh(); });
      reg[f.id] = { field: fld, input: inp, f: f }; return fld;
    }
    function productPicker() {
      var g = h("div.ck-prods", { role: "radiogroup", "aria-label": "Loan product" }), pe = h("p.ck-err", { role: "alert", id: "na-e-product" });
      Object.keys(P).forEach(function (k) { var p = P[k], on = S.product === k;
        var b = h("button.ck-prod" + (on ? ".is-on" : ""), { type: "button", role: "radio", "aria-checked": String(on), id: "na-product-" + k, on: { click: function () {
            if (S.product === k) return; S.product = k; delete srv.product; save(); askDup(); refresh(); drawPanel(0); var again = document.getElementById("na-product-" + k); if (again) again.focus(); } } },
          h("span.ck-prodtick", CK.ic("check")), h("b", p.name), h("span.ck-pwho", p.who), h("span.ck-prng", peso(p.min) + " to " + peso(p.max)),
          h("span.ck-prodmeta", h("span", (p.terms ? p.terms.join(", ") : p.t0 + "–" + p.t1) + " months"), h("span", p.rate + "% a month, " + (p.method === "flat" ? "flat" : "diminishing")))); g.appendChild(b); });
      reg.product = { err: pe }; return h("div.ck-stack.ck-tight", g, pe);
    }
    function consentBlock() {
      var fi = h("input.ck-hidefile", { type: "file", id: "na-consent", accept: ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" }), ce = h("p.ck-err", { role: "alert" });
      function take(file) { consent = null; ce.textContent = ""; delete srv.consent;
        if (file && !/\.(pdf|jpe?g|png)$/i.test(file.name)) ce.textContent = "That file type is not accepted. Use a PDF, JPG or PNG.";
        else if (file && file.size > 10 * 1048576) ce.textContent = "That file is larger than 10 MB. Scan it at a lower resolution and try again.";
        else if (file) { consent = { name: file.name, at: stamp(), file: file, size: file.size }; CK.toast("Consent form attached."); }
        fi.value = ""; drawPanel(0); refresh(); }
      fi.addEventListener("change", function () { if (fi.files[0]) take(fi.files[0]); });
      var drop;
      if (consent) drop = h("div.ck-drop.is-on.ck-panelin", h("span.ck-filetile.ok", CK.ic("doc")), h("div.grow", h("b", consent.name), h("small", "Received " + consent.at + " · by " + MEN[1] + " · " + (consent.size > 1048576 ? (consent.size / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(consent.size / 1024)) + " KB"))),
        CK.pill("Consent on file", "green"), CK.btn("Replace", { kind: "ghost", icon: "upload", on: function () { fi.click(); } }));
      else drop = h("div.ck-drop", { tabindex: 0, role: "button", "aria-label": "Choose the signed consent form", on: { click: function () { fi.click(); }, keydown: function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } } } },
        h("span.ck-dropic", CK.ic("upload")), h("div.grow", h("b", "Signed consent form ", h("em", "*")), h("small", "PDF, JPG or PNG, up to 10 MB. Choose the file or drop it here.")), CK.btn("Choose file", { kind: "soft", icon: "upload" }));
      ["dragover", "dragenter"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("is-over"); }); });
      drop.addEventListener("dragleave", function () { drop.classList.remove("is-over"); });
      drop.addEventListener("drop", function (e) { e.preventDefault(); drop.classList.remove("is-over"); var f = e.dataTransfer.files[0]; if (f) take(f); });
      var ck = CK.check("The borrower signed this form in writing, consenting to credit investigation and to the processing of personal data for this loan.", !!S.agree), cb = ck.querySelector("input"); cb.id = "na-agree";
      var ae = h("p.ck-err", { role: "alert" });
      cb.addEventListener("change", function () { S.agree = cb.checked; delete srv.agree; refresh(); save(); });
      reg.consent = { err: ce, input: drop }; reg.agree = { err: ae, input: cb };
      return h("div.ck-stack.ck-tight", drop, fi, ce, h("div.ck-agree", ck, ae));
    }
    /* ---- the last look: everything on one page, with a way back to each part ---- */
    function review() { return h("div.ck-stack", sumBox, reviewBlocks()); }
    function reviewBlocks() {
      var blocks = secs().filter(function (s) { return s.id !== "send"; }).map(function (s) {
        var rows = [], left = leftIn(s);
        if (s.id === "request") rows.push(["Product", P[S.product] ? P[S.product].name : CK.pill("Not chosen", "red")]);
        s.fields.forEach(function (f) { var v = String(S[f.id] || "").trim(), e = err(f);
          rows.push([f.label.replace(" (pesos)", ""), e && (v || f.req) ? h("span.ck-bad", v || "Missing", h("small", e)) : f.money && v ? "₱ " + v : f.id === "dob" && v ? CK.date(v) : v || "–"]); });
        if (s.id === "consent") { rows.push(["Signed consent form", consent ? consent.name : h("span.ck-bad", "Missing", h("small", "Upload the signed consent form."))]); rows.push(["Borrower signed in writing", S.agree ? "Confirmed" : h("span.ck-bad", "Not confirmed", h("small", "Confirm that the borrower signed the consent form."))]); }
        return h("div.ck-revblock", h("div.ck-revhead", h("b", CK.ic(s.icon), s.title), left > 0 ? CK.pill(left + " to fix", "red") : CK.pill("Done", "green"), CK.btn("Edit", { kind: "ghost", icon: "edit", on: function () { go(s.id); } })), CK.dl(rows, "ck-revdl"));
      });
      return h("div.ck-review", blocks);
    }
    function drawPanel(dir) {
      var s = sec(cur), L = secs(), i = L.indexOf(s); reg = {}; panel.textContent = "";
      var body = [h("div.ck-whead", h("span.ck-wic", CK.ic(s.icon)), h("div", h("small", "Step " + (i + 1) + " of " + L.length), h("h2", s.title), h("p.ck-hint", s.hint)))];
      if (s.id === "request") body.push(productPicker());
      if (s.fields.length) body.push(h("div.ck-form", s.fields.map(fieldFor)));
      if (s.id === "borrower") body.push(warnBox);
      if (s.id === "consent") body.push(consentBlock());
      if (s.id === "send") body.push(review());
      var inner = h("div.ck-wbody" + (dir > 0 ? ".ck-fromr" : dir < 0 ? ".ck-froml" : ""), body); panel.appendChild(inner);
      /* the foot: back, where you are, and on */
      foot.textContent = "";
      var back = i > 0 ? CK.btn("Back", { kind: "ghost", icon: "back", on: function () { go(L[i - 1].id, -1); } }) : h("span");
      var right;
      if (s.id === "send") right = h("div.ck-actions", CK.btn("Save draft", { kind: "ghost", on: function () { save(true); CK.toast("Draft saved. You can close this page and resume later.", "blue"); } }), sendBtn);
      else right = CK.btn(L[i + 1].id === "send" ? "Review" : "Continue", { kind: "primary", icon: "next", on: function () { tried[s.id] = true; var r = refresh();
        var bad = r.firstBad(s.id); if (bad) { bad.focus(); panel.classList.remove("ck-shake"); void panel.offsetWidth; panel.classList.add("ck-shake"); return; }
        go(L[i + 1].id, 1); } });
      if (right.classList.contains("ck-btn")) right.classList.add("ck-wnext");
      foot.appendChild(back); foot.appendChild(right);
      drawWiz(); paintErrors();
    }
    function go(id, dir) { var L = secs().map(function (s) { return s.id; }); if (L.indexOf(id) < 0) id = "request"; if (dir == null) dir = L.indexOf(id) - L.indexOf(cur);
      cur = id; drawPanel(dir > 0 ? 1 : dir < 0 ? -1 : 0); var top = wizCard.getBoundingClientRect().top; if (top < 0) wizCard.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { var c = panel.querySelector(".ck-wbody input:not([type=file]), .ck-wbody select, .ck-wbody textarea, .ck-wbody .ck-prod"); if (c && cur !== "send" && !c.value) c.focus({ preventScroll: true }); }, 380); }
    function paintErrors() {
      Object.keys(reg).forEach(function (k) { var R = reg[k]; if (!R.f) return; var e = err(R.f), show = e && (isTried(cur) || touched[k] || srv[k]) && !(e.indexOf("Fill in") === 0 && !isTried(cur) && !srv[k]); R.field.setError(show ? e : ""); });
      if (reg.product) reg.product.err.textContent = isTried("request") && !S.product ? (srv.product || "Choose a loan product.") : "";
      if (reg.agree) reg.agree.err.textContent = isTried("consent") && !S.agree ? (srv.agree || "Confirm that the borrower signed the consent form.") : "";
      if (reg.consent && !consent && isTried("consent") && !reg.consent.err.textContent) reg.consent.err.textContent = srv.consent || "Upload the signed consent form. The application cannot advance without it.";
    }

    /* ---- everything that follows from what is typed ---- */
    function refresh() {
      var F = fieldsNow(), missing = [], bad = 0;
      F.forEach(function (f) { var e = err(f); if (e) { missing.push([f, e]); if (e.indexOf("Fill in") !== 0) bad++; } });
      paintErrors(); drawWiz();
      /* the duplicate warning */
      warnBox.textContent = "";
      if (liveDup) warnBox.appendChild(h("div.ck-note.t-red.ck-panelin", CK.ic("alert"), h("div", h("b", "Duplicate application. "), S.name.trim() + " already has an active " + lc(P[S.product].name) + " application, " + liveDup.ref + " (" + liveDup.st + "). A second one cannot be created while it is active. ",
        h("a", { href: "application-detail.html?ref=" + liveDup.ref }, "Open that application instead."))));
      /* the terms */
      var p = P[S.product], amt = num(S.amount), n = num(S.term), rows = [["Product", p ? p.name : "–"], ["Amount", isNaN(amt) ? "–" : peso(amt)], ["Term", isNaN(n) ? "–" : n + " months"]], tot = null;
      var okA = !SECTIONS[0].fields[0].check(String(S.amount || ""), S) && String(S.amount || "").trim(), okT = !SECTIONS[0].fields[1].check(String(S.term || ""), S) && String(S.term || "").trim();
      if (p && okA && okT && n > 0) { var r = p.rate / 100, inst = p.method === "flat" ? (amt + amt * r * n) / n : amt * r / (1 - Math.pow(1 + r, -n)), total = inst * n;
        rows.push(["Interest", p.rate + "% a month, " + p.method]); rows.push(["Total to repay", peso(total)]);
        var inc = num(S.income), debts = num(S.debts); if (!isNaN(inc) && inc > 0 && !isNaN(debts)) rows.push(["Debt-to-income with this loan", ((debts + inst) / inc * 100).toFixed(1) + "%"]);
        var col = num(S.collateral); if (S.product === "sme" && !isNaN(col) && col > 0) rows.push(["Loan-to-value", (amt / col * 100).toFixed(1) + "%"]);
        tot = ["Each month", peso(inst)]; }
      var nd = CK.dl(rows, "rows"); if (tot) { var tr = h("div.tot", h("dt", tot[0]), h("dd", tot[1])); nd.appendChild(tr); }
      terms.replaceWith(nd); terms = nd;
      rule.textContent = p ? "An estimate from the product's terms on file, before charges. Final terms are set at approval and may come back as a counter-offer." : "Pick a product to see its limits and an estimate.";
      /* the gate */
      var reqLeft = missing.filter(function (m) { return m[0].req; }).length + (S.product ? 0 : 1), ok = !reqLeft && !bad && consent && S.agree && !liveDup;
      gate.textContent = "";
      [[!reqLeft, reqLeft ? reqLeft + " required field" + (reqLeft > 1 ? "s" : "") + " still blank or wrong" : "All required fields filled"], [!bad, bad ? bad + " entr" + (bad > 1 ? "ies" : "y") + " in the wrong format" : "Formats check out"],
        [!!consent && !!S.agree, consent && S.agree ? "Signed consent on file" : "Signed consent not yet on file"], [!liveDup, liveDup ? "Duplicate of " + liveDup.ref : "No duplicate active application"]].forEach(function (g) {
        gate.appendChild(h("li" + (g[0] ? ".ok" : ".no"), h("i", CK.ic(g[0] ? "check" : "x")), h("span", g[1]))); });
      gateHead.lastChild.textContent = ok ? "Ready to submit" : "Not ready yet"; gateHead.classList.toggle("ok", !!ok);
      if (cur === "send") { var rv = panel.querySelector(".ck-review"); if (rv) rv.replaceWith(reviewBlocks()); }
      return { missing: missing, ok: ok, firstBad: function (sid) { var s = sec(sid);
        if (sid === "request" && !S.product) return document.querySelector(".ck-prod");
        var f = s.fields.filter(function (x) { return err(x); })[0]; if (f && reg[f.id]) return reg[f.id].input;
        if (sid === "consent") { if (!consent) return reg.consent.input; if (!S.agree) return reg.agree.input; } return null; } };
    }

    /* ---- submit ---- */
    var sendBtn = CK.btn("Submit application", { kind: "primary", icon: "send", on: submit });
    function fixList(title, items) { sumBox.textContent = "";
      var ul = h("ul.ck-fixlist", items.map(function (it) { return h("li", h("button", { type: "button", on: { click: function () { go(it[1]); setTimeout(function () { var t = it[2] && document.getElementById(it[2]); if (t) { t.scrollIntoView({ block: "center", behavior: "smooth" }); t.focus({ preventScroll: true }); } }, 420); } } }, h("span", it[0]), h("em", sec(it[1]).title, CK.ic("next")))); }));
      var n = h("div.ck-note.t-red.ck-panelin", CK.ic("alert"), h("div.ck-stack.ck-tight", h("b", title), ul)); sumBox.appendChild(n); return n; }
    function submit() {
      if (sending) return; triedAll = true; var r = refresh(), items = [];
      if (!S.product) items.push(["Choose a loan product.", "request", "na-product-" + Object.keys(P)[0]]);
      r.missing.forEach(function (m) { items.push([m[1], secOf(m[0].id), "na-" + m[0].id]); });
      if (!consent) items.push(["Upload the signed consent form.", "consent", "na-consent"]); if (!S.agree) items.push(["Confirm that the borrower signed the consent form.", "consent", "na-agree"]);
      if (liveDup) items.push(["This borrower already has an active application, " + liveDup.ref + ".", "borrower", "na-name"]);
      if (items.length) { var n = fixList("Not submitted. " + items.length + " thing" + (items.length > 1 ? "s" : "") + " to fix:", items); n.dataset.srv = "1"; n.scrollIntoView({ block: "nearest", behavior: "smooth" }); return; }
      sending = true; sumBox.textContent = ""; CK.busy(sendBtn, true, "Submitting…");
      var p = P[S.product], keys = S.product === "sme" ? ["bizname", "bizreg", "biznature", "bizyears", "income", "debts", "collateral"] : ["employer", "position", "years", "income", "debts"], details = {};
      keys.forEach(function (k) { details[k] = S[k] || ""; });
      new Promise(function (ok, no) { var rd = new FileReader(); rd.onload = function () { ok(String(rd.result).split(",")[1] || ""); }; rd.onerror = function () { no(new Error("The consent file could not be read.")); }; rd.readAsDataURL(consent.file); }).then(function (data) {
        return CK.api("POST", "/api/applications", { product: p.name, amount: S.amount, termMonths: Number(String(S.term).replace(/[^0-9]/g, "")), agent: S.agent, purpose: S.purpose,
          borrower: { name: S.name, dob: S.dob, idType: S.idtype, idNo: S.idno, mobile: S.mobile, email: S.email, address: S.address }, details: details,
          consentConfirmed: !!S.agree, consent: { name: consent.name, data: data } });
      }).then(function (d) { sending = false; CK.busy(sendBtn, false); finish(d.reference); }, function (e) {
        sending = false; CK.busy(sendBtn, false); if (e && e.status === 401) return;
        var Fe = e.fields || {}, ks = Object.keys(Fe), n;
        if (e.status === 409) { sumBox.textContent = ""; var m = /APP-\d{4}-\d{4}/.exec(e.message || "");
          n = h("div.ck-note.t-red.ck-panelin", CK.ic("alert"), h("div.ck-stack.ck-tight", h("b", "Not submitted. " + e.message), m ? h("div", CK.btn("Open " + m[0], { kind: "ghost", icon: "next", href: "application-detail.html?ref=" + m[0] })) : null)); sumBox.appendChild(n); }
        else if (ks.length) { ks.forEach(function (k) { srv[k] = Fe[k]; }); n = fixList("Not submitted. The office's records say " + ks.length + " thing" + (ks.length > 1 ? "s need" : " needs") + " fixing:", ks.map(function (k) { return [Fe[k], secOf(k), k === "product" ? "na-product-" + Object.keys(P)[0] : "na-" + k]; })); refresh(); }
        else { sumBox.textContent = ""; n = h("div.ck-note.t-red.ck-panelin", CK.ic("alert"), h("div", h("b", "Not submitted. "), e.message || "The server could not be reached. Try again.")); sumBox.appendChild(n); }
        n.dataset.srv = "1"; n.scrollIntoView({ block: "nearest", behavior: "smooth" }); CK.toast("Not submitted. " + (e.status === 409 ? "That borrower already has one of these open." : "Fix what is marked."), "red");
      });
    }
    function finish(ref) {
      var at = stamp(), p = P[S.product], b = S.name; try { localStorage.removeItem(KEY); } catch (er) {}
      CK.toast("Submitted. Reference " + ref + ".");
      CK.render([CK.head({ crumbs: [["Applications", "applications.html"], ["New application"]], title: "Application submitted", status: CK.status("submitted"), sub: ref + " is on file with its signed consent form." }),
        h("div.ck-grid.side2",
          h("section.ck-card.ck-in.ck-donecard", h("div.ck-cardbody", h("div.ck-doneic", CK.ic("check")), h("small.ck-sm", "Reference number"), h("div.ck-doneref", ref),
            CK.dl([["Borrower", b], ["Product", p.name], ["Amount", "₱ " + S.amount], ["Term", S.term + " months"], ["Submitted", at], ["Encoded by", MEN[1]]], "ck-donedl"),
            h("div.ck-actions", CK.btn("Open the application", { kind: "primary", icon: "next", href: "application-detail.html?ref=" + ref }), CK.btn("File the other papers", { kind: "ghost", icon: "upload", href: "documents.html?ref=" + ref })))),
          CK.card("What happens next", h("div.ck-tasks",
            h("a.ck-task.open", { href: "documents.html?ref=" + ref }, h("span.n", "1"), h("div.grow", h("b", "File the other papers"), h("small", "The consent form is on file. The rest of the checklist is next.")), CK.ic("next")),
            h("div.ck-task.lock", h("span.n", "2"), h("div.grow", h("b", "Encode and verify"), h("small", "A second loan processor checks every entry against the papers.")), CK.ic("lock")),
            h("div.ck-task.lock", h("span.n", "3"), h("div.grow", h("b", "Credit assessment"), h("small", "Underwriting scores it and decides.")), CK.ic("lock")),
            h("button.ck-task.ck-again", { type: "button", on: { click: function () { location.reload(); } } }, h("span.n", CK.ic("plus")), h("div.grow", h("b", "Start another application"), h("small", "A fresh, empty form.")), CK.ic("next"))), { icon: "list" }))]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    var wizCard = h("section.ck-card.ck-in.ck-wizcard", h("div.ck-wiztop", wiz, bar), panel, foot);
    var gateHead = h("div.ck-gatehead", CK.ic("shield"), h("span", ""));
    var side = h("div.ck-stack.ck-sticky",
      CK.card("Terms requested", [terms, rule], { icon: "peso" }),
      CK.card("Before it can be submitted", [gateHead, gate], { icon: "check" }));
    CK.render([CK.head({ crumbs: [["Applications", "applications.html"], ["New application"]], title: "New application", sub: "Encode it once from the borrower's papers. Fields marked * are required before it can be submitted.", actions: [chip, clearBtn] }),
      h("div.ck-grid.ck-nagrid", wizCard, side)]);
    refresh(); drawPanel(0);
    if (S.name) askDup();
  }
})();
