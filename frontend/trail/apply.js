/* The Apply page (DRAFT): the whole online application in the site's own style, over whatever page you came from.
   Five steps (your loan, about you, work and income, papers, sign and send), a live "ticket" on the right with the
   numbers, the same checks CALMS makes, and a real send to CALMS (POST /api/public/apply), answered with a reference.
   window.GR8_APPLY = { open({ kind, amount, months }), close() } */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement, ap = $("#apply"); if (!ap) return;
  var T = function () { return window.GR8_TOOLS; }, D = function () { return window.GR8_DATA; };
  var peso = function (n) { return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var peso0 = function (n) { return "₱" + Math.round(n).toLocaleString("en-PH"); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var sound = function (on) { if (window.GR8_STAGE) window.GR8_STAGE.pick(on); };
  var warn = function () { ap.classList.remove("warn"); void ap.offsetWidth; ap.classList.add("warn"); if (window.GR8_STAGE) window.GR8_STAGE.alarm(); };
  var ID_RX = { "PhilSys ID": /^\d{4}-\d{4}-\d{4}-\d{4}$/, "TIN": /^\d{3}-\d{3}-\d{3}(-\d{3,5})?$/, "SSS": /^\d{2}-\d{7}-\d$/, "Driver's license": /^[A-Z]\d{2}-\d{2}-\d{6}$/i, "Passport": /^[A-Z]\d{7}[A-Z]$/i };
  var PURPOSES = ["Tuition and school", "Home repair", "Medical bills", "Business stock or equipment", "Paying off other debts", "Something else"];
  var STEPS = ["Your loan", "About you", "Work and income", "Papers", "Sign and send"];
  var st, step = 0, files = {}, sigDirty = false;
  function fresh(pre) { pre = pre || {}; st = { kind: pre.kind || "salary", amount: pre.amount || 0, months: pre.months || 0, purpose: "", purposeOther: "", first: "", last: "", dob: "", mobile: "", email: "", address: "", idType: "", idNo: "",
    employer: "", position: "", years: "", income: "", debts: "", bizname: "", bizreg: "", biznature: "", bizyears: "", collateral: "", c1: false, c2: false, c3: false }; files = {}; sigDirty = false; step = 0; }
  function prod() { return T().byKind(st.kind); }
  function fix() { var p = prod(); st.amount = Math.min(p.max, Math.max(p.min, st.amount || Math.round((p.min + p.max) / 4 / 1000) * 1000)); if (p.months.indexOf(+st.months) < 0) st.months = p.months[Math.min(1, p.months.length - 1)]; }

  /* ---- the ticket on the right: always the live numbers ---- */
  function ticket() {
    var p = prod(), m = T().installment(st.amount, +st.months, p.rate, p.method), fee = st.amount * p.fee;
    $("#apTProd").textContent = p.name; $("#apTAmt").textContent = peso0(st.amount); $("#apTMo").textContent = st.months + " months";
    $("#apTEach").textContent = peso(m); $("#apTFee").textContent = peso(fee); $("#apTNet").textContent = peso(st.amount - fee); $("#apTTot").textContent = peso(m * st.months);
    $$(".ap-dots i").forEach(function (d, k) { d.className = k < step ? "done" : k === step ? "now" : ""; });
  }

  /* ---- the steps ---- */
  var opt = function (name, v, label, on) { return '<label class="tk-opt"><input type="radio" name="' + name + '" value="' + esc(v) + '"' + (on ? " checked" : "") + '><span class="dot"></span><span class="t">' + esc(label) + "</span></label>"; };
  var q = function (legend, inner, req, key) { return '<fieldset class="tk-q" data-k="' + (key || "") + '"><legend>' + legend + (req ? "<i>*</i>" : "") + '</legend><div class="ap-in">' + inner + '<p class="ap-err" data-err="' + (key || "") + '"></p></div></fieldset>'; };
  var f = function (name, label, val, attrs) { return '<label class="tk-f"><span>' + label + "</span><input name=\"" + name + '" value="' + esc(val || "") + '" ' + (attrs || "") + "></label>"; };
  function stepHTML() {
    var p = prod();
    if (step === 0) return q("Which loan", '<div class="tk-opts">' + D().products.map(function (x) { return opt("kind", x.kind, x.name, x.kind === st.kind); }).join("") + "</div>", 1, "product") +
      q("How much", '<div class="tl-amt"><input class="tl-big" name="amount" inputmode="numeric" value="' + peso0(st.amount).slice(1) + '"><span class="tl-cur">₱</span><input type="range" name="amountR" min="' + p.min + '" max="' + p.max + '" step="' + (p.max > 300000 ? 5000 : 1000) + '" value="' + st.amount + '"><div class="tl-ends"><span>' + peso0(p.min) + "</span><span>" + peso0(p.max) + "</span></div></div>", 1, "amount") +
      q("For how long", '<div class="tl-chips" data-name="months">' + p.months.map(function (n) { return '<button type="button" class="tl-chip' + (n === +st.months ? " on" : "") + '" data-v="' + n + '">' + n + " months</button>"; }).join("") + "</div>", 1, "term") +
      q("What it's for", '<div class="tk-opts">' + PURPOSES.map(function (x) { return opt("purpose", x, x, x === st.purpose); }).join("") + '</div><div class="tk-fields ap-other"' + (st.purpose === "Something else" ? "" : " hidden") + ">" + f("purposeOther", "Tell us", st.purposeOther, 'maxlength="200"') + "</div>", 1, "purpose");
    if (step === 1) return q("Your name, as on your ID", '<div class="tk-fields ap-2">' + f("first", "First name", st.first, 'autocomplete="given-name" maxlength="80"') + f("last", "Last name", st.last, 'autocomplete="family-name" maxlength="80"') + "</div>", 1, "name") +
      q("Birthday", '<div class="tk-fields">' + f("dob", "Date of birth", st.dob, 'type="date" autocomplete="bday"') + "</div>", 1, "dob") +
      q("How to reach you", '<div class="tk-fields">' + f("mobile", "Mobile", st.mobile, 'inputmode="tel" autocomplete="tel" placeholder="09XX XXX XXXX" maxlength="13"') + f("email", "Email (optional)", st.email, 'type="email" autocomplete="email" maxlength="160"') + "</div>", 1, "mobile") +
      q("Home address", '<div class="tk-fields"><label class="tk-f"><span>Street, barangay, town, province</span><textarea name="address" rows="2" maxlength="400" autocomplete="street-address">' + esc(st.address) + "</textarea></label></div>", 1, "address") +
      q("Your ID", '<div class="tk-opts">' + D().idTypes.map(function (x) { return opt("idType", x.name, x.name, x.name === st.idType); }).join("") + '</div><div class="tk-fields">' + f("idNo", "ID number", st.idNo, 'maxlength="40" spellcheck="false" placeholder="' + esc((D().idTypes.filter(function (x) { return x.name === st.idType; })[0] || { looks: "Pick the ID first" }).looks) + '"') + "</div>", 1, "idno");
    if (step === 2) return st.kind === "sme"
      ? q("Your business", '<div class="tk-fields">' + f("bizname", "Registered business name", st.bizname, 'maxlength="200"') + f("bizreg", "DTI or SEC registration number", st.bizreg, 'maxlength="60"') + f("biznature", "What the business does", st.biznature, 'maxlength="200"') + f("bizyears", "Years in business", st.bizyears, 'inputmode="decimal" maxlength="5"') + "</div>", 1, "bizname") +
        q("Money in and out", '<div class="tk-fields">' + f("income", "Monthly income of the business (₱)", st.income, 'inputmode="numeric"') + f("debts", "Other loan payments a month (₱)", st.debts, 'inputmode="numeric" placeholder="0"') + f("collateral", "Collateral you can offer, its value (₱, optional)", st.collateral, 'inputmode="numeric"') + "</div>", 1, "income")
      : q("Your work", '<div class="tk-fields">' + f("employer", "Employer", st.employer, 'maxlength="200"') + f("position", "Position", st.position, 'maxlength="200"') + f("years", "Years there", st.years, 'inputmode="decimal" maxlength="5"') + "</div>", 1, "employer") +
        q("Money in and out", '<div class="tk-fields">' + f("income", "Monthly income (₱)", st.income, 'inputmode="numeric"') + f("debts", "Other loan payments a month (₱)", st.debts, 'inputmode="numeric" placeholder="0"') + "</div>", 1, "income");
    if (step === 3) return q("Your papers <small>(optional now)</small>", '<ul class="ap-files">' + p.papers.map(function (d) { var fl = files[d.slot];
        return '<li><span class="t">' + esc(d.label) + '</span><span class="nm">' + (fl ? esc(fl.name) + " · " + Math.round(fl.size / 1024) + " KB" : "Not yet") + '</span><label class="tl-link ap-pick">' + (fl ? "Change" : "Attach") + '<input type="file" accept=".pdf,.jpg,.jpeg,.png" data-slot="' + d.slot + '" hidden></label>' + (fl ? '<button type="button" class="tl-link" data-drop="' + d.slot + '">Remove</button>' : "") + "</li>"; }).join("") + "</ul>" +
        '<p class="tl-note">PDF, JPG or PNG, up to 5 MB each. Missing some? Send it later from My GR8, or bring it to the branch. The consent form we give you to sign.</p>', 0, "papers");
    return q("Please read and tick", '<ul class="tl-check">' +
        [["c1", "I let GR8 Lending check my ID, my papers and my credit report (CIC) for this application."], ["c2", "I've read the privacy notice. My information is used only for my loan."], ["c3", "Everything I wrote is true. A false statement can end the application."]]
          .map(function (c) { return '<li><label><input type="checkbox" name="' + c[0] + '"' + (st[c[0]] ? " checked" : "") + '><span class="bx"></span><span class="t">' + c[1] + "</span></label></li>"; }).join("") + "</ul>", 1, "consents") +
      q("Your signature", '<div class="ap-sig"><canvas aria-label="Sign here with your finger or mouse"></canvas><span class="ap-sigline">Sign here</span></div><button type="button" class="tl-link" id="apSigClear">Clear</button>', 1, "signature") +
      '<label class="tk-hp" aria-hidden="true">Website <input name="website" tabindex="-1" autocomplete="off"></label>';
  }
  function draw(dir) {
    fix(); var body = $("#apBody"); body.innerHTML = stepHTML(); body.className = "ap-body in"; void body.offsetWidth;
    $("#apStepN").textContent = "0" + (step + 1); $("#apStepT").textContent = STEPS[step];
    $$(".ap-steps li").forEach(function (li, k) { li.className = k < step ? "done" : k === step ? "now" : ""; });
    $("#apBack").hidden = step === 0; $("#apNext span").textContent = step === 4 ? "Send my application" : "Next: " + STEPS[step + 1].toLowerCase();
    wire(); ticket(); if (dir) ap.querySelector(".ap-left").scrollTo({ top: 0, behavior: "smooth" });
  }
  function wire() {
    var body = $("#apBody");
    $$("input, textarea", body).forEach(function (el) {
      if (el.type === "radio") el.addEventListener("change", function () { if (el.name === "kind") { st.kind = el.value; st.amount = 0; st.months = 0; sound(true); draw(); return; } st[el.name] = el.value; if (el.name === "purpose") { var o = $(".ap-other", body); o.hidden = el.value !== "Something else"; } if (el.name === "idType") { var p = (D().idTypes.filter(function (x) { return x.name === el.value; })[0] || {}).looks; $('[name="idNo"]', body).placeholder = p || ""; } sound(true); clearErr(); });
      else if (el.type === "checkbox") el.addEventListener("change", function () { st[el.name] = el.checked; sound(el.checked); });
      else if (el.type === "file") el.addEventListener("change", function () { pickFile(el); });
      else if (el.name === "amountR") { el.addEventListener("input", function () { st.amount = +el.value; $('[name="amount"]', body).value = peso0(st.amount).slice(1); ticket(); }); }
      else if (el.name === "amount") el.addEventListener("change", function () { st.amount = +String(el.value).replace(/[^0-9.]/g, "") || st.amount; draw(); });
      else el.addEventListener("input", function () { st[el.name] = el.value; });
    });
    $$(".tl-chips", body).forEach(function (c) { c.addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (!b) return; st.months = +b.dataset.v; sound(true); draw(); }); });
    $$("[data-drop]", body).forEach(function (b) { b.addEventListener("click", function () { delete files[b.dataset.drop]; draw(); }); });
    if (step === 4) sigPad();
  }
  function pickFile(el) {
    var file = el.files && el.files[0]; if (!file) return;
    if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) { showErr({ papers: "That file type is not accepted. Use a PDF, JPG or PNG." }); return; }
    if (file.size > 5 * 1024 * 1024) { showErr({ papers: "“" + file.name + "” is larger than 5 MB. Bring it to the branch instead." }); return; }
    var rd = new FileReader(); rd.onload = function () { files[el.dataset.slot] = { name: file.name, size: file.size, data: String(rd.result).split(",")[1] }; sound(true); draw(); }; rd.readAsDataURL(file);
  }
  /* the signature pad */
  var sigCv = null;
  function sigPad() {
    sigCv = $(".ap-sig canvas"); var r = sigCv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); sigCv.width = r.width * dpr; sigCv.height = r.height * dpr;
    var g = sigCv.getContext("2d"); g.scale(dpr, dpr); g.lineWidth = 2.4; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = getComputedStyle(ap).getPropertyValue("--tk-ink") || "#2a1609"; var down = false, lx = 0, ly = 0;
    if (st.sig) { var im = new Image(); im.onload = function () { g.drawImage(im, 0, 0, r.width, r.height); }; im.src = st.sig; }
    sigCv.addEventListener("pointerdown", function (e) { down = true; sigCv.setPointerCapture(e.pointerId); var b = sigCv.getBoundingClientRect(); lx = e.clientX - b.left; ly = e.clientY - b.top; });
    sigCv.addEventListener("pointermove", function (e) { if (!down) return; var b = sigCv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top; g.beginPath(); g.moveTo(lx, ly); g.lineTo(x, y); g.stroke(); lx = x; ly = y; sigDirty = true; $(".ap-sig").classList.add("signed"); });
    var up = function () { if (down) { down = false; if (sigDirty) st.sig = sigCv.toDataURL("image/png"); } }; sigCv.addEventListener("pointerup", up); sigCv.addEventListener("pointercancel", up);
    if (st.sig) $(".ap-sig").classList.add("signed");
    $("#apSigClear").addEventListener("click", function () { g.clearRect(0, 0, sigCv.width, sigCv.height); st.sig = null; sigDirty = false; $(".ap-sig").classList.remove("signed"); });
  }

  /* ---- the checks (the same rules as CALMS's lib/intake.js) ---- */
  function errorsFor(k) {
    var e = {}, p = prod(), num = function (v) { return +String(v).replace(/[^0-9.]/g, ""); };
    if (k === 0) { if (!st.purpose || (st.purpose === "Something else" && !st.purposeOther.trim())) e.purpose = "Tell us what the loan is for."; }
    if (k === 1) {
      if (!st.first.trim() || !st.last.trim()) e.name = "Enter your first and last name as on your ID.";
      var age = (Date.now() - new Date(st.dob)) / 31557600000; if (!st.dob || isNaN(age)) e.dob = "Enter your date of birth."; else if (age < 18) e.dob = "You must be at least 18 to borrow."; else if (age > 100) e.dob = "Check the year of birth.";
      if (!/^09\d{9}$/.test(st.mobile.replace(/[\s-]/g, ""))) e.mobile = "Enter an 11-digit mobile number starting with 09.";
      else if (st.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(st.email)) e.mobile = "Check the email address. It should look like name@example.com.";
      if (!st.address.trim()) e.address = "Enter your home address.";
      if (!st.idType) e.idno = "Choose your government ID."; else if (!ID_RX[st.idType].test(st.idNo.trim())) e.idno = st.idType + " numbers look like " + ((D().idTypes.filter(function (x) { return x.name === st.idType; })[0] || {}).looks || "") + ".";
    }
    if (k === 2) {
      if (st.kind === "sme") { if (!st.bizname.trim() || !st.bizreg.trim() || !st.biznature.trim()) e.bizname = "Fill in the business name, its registration number and what it does."; else if (!isFinite(num(st.bizyears)) || String(st.bizyears).trim() === "") e.bizname = "Enter the years in business, for example 3."; }
      else { if (!st.employer.trim() || !st.position.trim()) e.employer = "Fill in your employer and position."; else if (String(st.years).trim() === "" || !isFinite(num(st.years))) e.employer = "Enter the years you've worked there, for example 3."; }
      if (!(num(st.income) > 0)) e.income = "Enter your monthly income in pesos.";
    }
    if (k === 4) { if (!(st.c1 && st.c2 && st.c3)) e.consents = "Tick all three boxes to send your application."; if (!st.sig) e.signature = "Sign in the box with your finger or mouse."; }
    return e;
  }
  function clearErr() { $$(".ap-err").forEach(function (x) { x.textContent = ""; }); $$(".tk-q.bad").forEach(function (x) { x.classList.remove("bad"); }); }
  function showErr(e) {
    clearErr(); var first = null;
    Object.keys(e).forEach(function (k) { var box = $('[data-err="' + k + '"]') || $('.tk-q[data-k="' + k + '"] .ap-err'); if (!box) { box = $(".ap-err"); } if (box) { box.textContent = e[k]; var fs = box.closest(".tk-q"); if (fs) { fs.classList.add("bad"); first = first || fs; } } });
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" }); warn(); sound(false);
  }
  var STEP_OF = { product: 0, amount: 0, term: 0, purpose: 0, name: 1, dob: 1, mobile: 1, email: 1, address: 1, idtype: 1, idno: 1, employer: 2, position: 2, years: 2, income: 2, debts: 2, bizname: 2, bizreg: 2, biznature: 2, bizyears: 2, collateral: 2, consents: 4, signature: 4 };

  /* ---- send it ---- */
  function send() {
    var p = prod(), btn = $("#apNext"); btn.disabled = true; $("span", btn).textContent = "Sending...";
    var details = st.kind === "sme" ? { bizname: st.bizname, bizreg: st.bizreg, biznature: st.biznature, bizyears: st.bizyears, income: st.income, debts: st.debts || "0", collateral: st.collateral } : { employer: st.employer, position: st.position, years: st.years, income: st.income, debts: st.debts || "0" };
    var body = { product: p.name, amount: st.amount, termMonths: +st.months, purpose: st.purpose === "Something else" ? st.purposeOther : st.purpose,
      borrower: { name: (st.first.trim() + " " + st.last.trim()), dob: st.dob, idType: st.idType, idNo: st.idNo.trim(), mobile: st.mobile.replace(/[\s-]/g, ""), email: st.email.trim(), address: st.address.trim() },
      details: details, consents: { check: st.c1, privacy: st.c2, truth: st.c3 }, signature: st.sig, website: ($('[name="website"]', ap) || {}).value || "",
      papers: Object.keys(files).map(function (k) { return { slot: k, name: files[k].name, data: files[k].data }; }) };
    fetch("/api/public/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) { var er = new Error(j.error || "network"); er.fields = j.fields; throw er; } return j; }); })
      .then(function (j) { done(j.reference); })
      .catch(function (err) {
        btn.disabled = false; $("span", btn).textContent = "Send my application";
        if (err.fields) { var ks = Object.keys(err.fields), back = Math.min.apply(null, ks.map(function (k) { return STEP_OF[k] != null ? STEP_OF[k] : (/^paper_/.test(k) ? 3 : 4); }));
          var map = {}; ks.forEach(function (k) { map[/^paper_/.test(k) ? "papers" : k] = err.fields[k]; }); if (back !== step) { step = back; draw(1); } setTimeout(function () { showErr(map); }, 60); }
        else showErr({ signature: /network|fetch/i.test(err.message) ? "We couldn't reach CALMS just now. Check your connection and try again." : err.message });
      });
  }
  function done(ref) {
    sound(true); ap.classList.add("sent");
    $("#apDoneName").textContent = st.first.trim(); $("#apDoneRef").textContent = ref; $("#apDoneL4").textContent = st.mobile.replace(/\D/g, "").slice(-4);
    ap.querySelector(".ap-left").scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---- open / close ---- */
  var lastFocus = null;
  function open(pre) {
    (window.GR8_DATA_READY || Promise.resolve()).then(function () {
      fresh(pre); ap.classList.remove("sent"); ap.hidden = false; ap.inert = false; lastFocus = document.activeElement;
      root.classList.add("ap-open"); draw(); requestAnimationFrame(function () { root.classList.add("ap-set"); });
      if (location.hash !== "#apply") history.pushState({ ap: 1 }, "", "#apply");
      if (window.GR8_STAGE) window.GR8_STAGE.menuSnd(true);
    });
  }
  function close() {
    if (!root.classList.contains("ap-open")) return; root.classList.remove("ap-set"); setTimeout(function () { root.classList.remove("ap-open"); ap.inert = true; }, 700);
    if (location.hash === "#apply") history.back();
    if (window.GR8_STAGE) window.GR8_STAGE.menuSnd(false); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  ap.inert = true;
  $("#apNext").addEventListener("click", function () {
    var e = errorsFor(step); if (Object.keys(e).length) { showErr(e); return; }
    clearErr(); if (step === 4) { send(); return; } step++; sound(true); draw(1);
  });
  $("#apBack").addEventListener("click", function () { if (step > 0) { step--; sound(false); draw(1); } });
  $("#apClose").addEventListener("click", close);
  $("#apDoneClose").addEventListener("click", close);
  $("#apTrack").addEventListener("click", function () {
    var out = $("#apTrackOut"); out.textContent = "Looking...";
    fetch("/api/public/track?ref=" + encodeURIComponent($("#apDoneRef").textContent) + "&last4=" + encodeURIComponent($("#apDoneL4").textContent)).then(function (r) { return r.json(); })
      .then(function (j) { out.textContent = j.note || j.error || ""; }).catch(function () { out.textContent = "We couldn't reach CALMS just now."; });
  });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("ap-open") && !root.classList.contains("kc-open")) close(); });
  addEventListener("popstate", function () { if (location.hash !== "#apply" && root.classList.contains("ap-open")) close(); });
  window.GR8_APPLY = { open: open, close: close };
})();
