/* Online with ?ref=APP-…, the offer comes from GET /api/applications/:ref/offers and sealing sends the answer,
   with the proof file, to POST /api/applications/:ref/offers/:n/answer. Opened from the folder, the sample is used. */
(function () {
  var REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1];
  if (!REF && window.CALMS && CALMS.noRecord("an application", "applications.html")) return;
  if (!REF || !window.CALMS || !CALMS.online) { start(null, null); return; }
  Promise.all([CALMS.api("GET", "/api/applications/" + encodeURIComponent(REF) + "/offers"), CALMS.api("GET", "/api/auth/me")])
    .then(function (r) { start(r[0], r[1].user); }, function (err) { if (err.status === 401 || CALMS.unreachable(err)) return; start(null, null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample instead."; });
})();
function start(LIVE, ME) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function stamp(t) { return new Date(t || Date.now()).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " PST"; }
  var ASK = { amt: 300000, term: 24 }, OFF = { amt: 250000, term: 24 }, RATE = .015, FEE = .033, ISSUED = Date.now() - 18 * 3600e3;
  var METHOD = "diminishing", OFFN = 1, UW = "A. Reyes", UWROLE = "Lead Underwriter", PFILE = null;
  var LO = LIVE && LIVE.offers.length ? LIVE.offers[LIVE.offers.length - 1] : null;
  if (LIVE && LO) { ASK = { amt: LIVE.ask.amount, term: LIVE.ask.term }; OFF = { amt: LO.amount, term: LO.term }; RATE = LIVE.rate; FEE = LIVE.fee; METHOD = LIVE.method; ISSUED = new Date(LO.at).getTime(); OFFN = LO.n; UW = LO.by; UWROLE = "Underwriter"; }
  function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
  var m = inst(OFF.amt, OFF.term), fee = OFF.amt * FEE, net = OFF.amt - fee, total = m * OFF.term, mAsk = inst(ASK.amt, ASK.term);
  var role = "je", proof = null, done = false, tried = false;
  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[28, 2400], [3, 110]], ALERT = [[22, 80], [23, 700], [24, 1400]], NOD = [[18, 140], [19, 500], [18, 140]], WATCH = [[0, 1200], [24, 900]], SLEEP = [[13, 900], [14, 900], [15, 900]];
  function say(t, mode) { $("says").textContent = t; if (mode === "alert") loop(ALERT, function () { loop(IDLE); }); else if (mode === "nod") loop(NOD, function () { loop(IDLE); }); else if (mode === "watch") loop(WATCH); else if (mode === "sleep") loop(SLEEP); else loop(IDLE); }
  function flyOff(then) {
    if (reduce) { then(); return; } clearTimeout(kT); kuwa.classList.add("carry"); var fr = [33, 34, 35, 36], n = 0, iv = setInterval(function () { kFrame(fr[n++ % 4]); }, 90);
    var a = kuwa.animate([{ transform: "translate(0,0)" }, { transform: "translate(40px,-70px)", offset: .25 }, { transform: "translate(" + (window.innerWidth) + "px,-220px)" }], { duration: 1500, easing: "cubic-bezier(.5,0,.8,.6)" });
    a.onfinish = function () { clearInterval(iv); kuwa.classList.remove("carry"); kuwa.animate([{ transform: "translate(0,-140px)", opacity: 0 }, { transform: "translate(0,0)", opacity: 1 }], { duration: 500, easing: "cubic-bezier(.3,1.3,.5,1)" }); then(); };
  }
  /* ---- the offer ---- */
  $("ometa").textContent = "Issued " + stamp(ISSUED) + " by " + UW + ", " + UWROLE + ". Assigned to you.";
  var dl = $("odl"); [["Loan amount", peso(OFF.amt), "she asked for " + peso(ASK.amt)], ["Monthly payments", OFF.term + " months", "same as she asked"], ["Interest", (Math.round(RATE * 10000) / 100) + "% a month", "on the remaining balance"], ["Processing charge", peso(fee), "taken out once, at release"], ["She receives", peso(net), ""], ["Each month", peso(m), "she asked for terms costing " + peso(mAsk)], ["Total she pays back", peso(total), ""]].forEach(function (r) { dl.appendChild(el("dt", "", r[0])); var dd = el("dd", "", r[1]); if (r[2]) dd.appendChild(el("small", "", r[2])); dl.appendChild(dd); });
  /* ---- show-to-borrower mode ---- */
  var lang = "en", pg = 0, opener = null;
  var SL = { en: [["You asked for", peso(ASK.amt), "to be paid in " + ASK.term + " monthly payments."], ["We can offer you", peso(OFF.amt), "to be paid in " + OFF.term + " monthly payments."], ["You will receive", peso(net), "after a one-time processing charge of " + peso(fee) + "."], ["You will pay each month", peso(m), "for " + OFF.term + " months. In total you pay back " + peso(total) + "."], ["The choice is yours", "Accept or decline", "You may accept this offer or decline it. Your agent will write down your answer and ask you to sign it."]],
             fil: [["Ang hiniling ninyo", peso(ASK.amt), "na babayaran sa loob ng " + ASK.term + " na buwan."], ["Ang maiaalok namin", peso(OFF.amt), "na babayaran sa loob ng " + OFF.term + " na buwan."], ["Ang matatanggap ninyo", peso(net), "matapos ibawas ang isang beses na singil sa pagproseso na " + peso(fee) + "."], ["Ang hulog ninyo bawat buwan", peso(m), "sa loob ng " + OFF.term + " na buwan. Ang kabuuang babayaran ninyo ay " + peso(total) + "."], ["Kayo ang magpapasya", "Tanggapin o hindi", "Maaari ninyong tanggapin o hindi tanggapin ang alok na ito. Isusulat ng inyong ahente ang inyong sagot at hihingin ang inyong pirma."]] };
  var NAVT = { en: ["Back", "Next", "Close"], fil: ["Bumalik", "Susunod", "Isara"] };
  function drawShow() { var s = SL[lang][pg], b = $("showBody"); b.textContent = ""; b.appendChild(el("div", "l", s[0])); b.appendChild(el("div", "v", s[1])); b.appendChild(el("div", "s", s[2])); $("pg").textContent = (pg + 1) + " / " + SL[lang].length; $("prev").disabled = pg === 0; $("next").disabled = pg === SL[lang].length - 1; $("prev").textContent = NAVT[lang][0]; $("next").textContent = NAVT[lang][1]; $("showX").textContent = NAVT[lang][2]; $("lEn").setAttribute("aria-pressed", String(lang === "en")); $("lFil").setAttribute("aria-pressed", String(lang === "fil")); $("show").lang = lang === "fil" ? "fil" : "en"; }
  $("showBtn").addEventListener("click", function () { opener = this; pg = 0; $("show").hidden = false; drawShow(); $("next").focus(); });
  function closeShow() { $("show").hidden = true; if (opener) opener.focus(); }
  $("showX").addEventListener("click", closeShow); $("prev").addEventListener("click", function () { pg = Math.max(0, pg - 1); drawShow(); }); $("next").addEventListener("click", function () { pg = Math.min(SL[lang].length - 1, pg + 1); drawShow(); });
  $("lEn").addEventListener("click", function () { lang = "en"; drawShow(); }); $("lFil").addEventListener("click", function () { lang = "fil"; drawShow(); });
  $("show").addEventListener("keydown", function (e) { if (e.key === "Escape") closeShow(); if (e.key === "ArrowRight") $("next").click(); if (e.key === "ArrowLeft") $("prev").click();
    if (e.key === "Tab") { var f = [].filter.call($("show").querySelectorAll("button"), function (b) { return !b.disabled; }), i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } } });
  /* ---- the form ---- */
  var ch = $("chan"); ["In person", "Phone call", "SMS", "Email"].forEach(function (c, i) { var l = el("label", "chip"), r = el("input"); r.type = "radio"; r.name = "chan"; r.id = "ch" + i; r.value = c; r.addEventListener("change", refresh); l.appendChild(r); l.appendChild(el("span", "", c)); ch.appendChild(l); });
  function local(t) { var d = new Date(t - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  $("when").value = local(Date.now()); $("when").max = local(Date.now() + 60000); $("when").min = local(ISSUED);
  function val() { var a = document.querySelector('input[name="ans"]:checked'), c = document.querySelector('input[name="chan"]:checked'); return { ans: a ? a.value : "", chan: c ? c.value : "", when: $("when").value, ptype: $("ptype").value, words: $("words").value.trim(), swear: $("swear").checked }; }
  function errs() { var v = val(), E = [], t = new Date(v.when).getTime();
    if (!v.ans) E.push(["eAns", "aYes", "Choose her answer: accepts or declines."]);
    if (!v.chan) E.push(["eChan", "ch0", "Choose how she was told the terms."]);
    if (!v.when || isNaN(t)) E.push(["eWhen", "when", "Enter the date and time she answered."]); else if (t > Date.now() + 60000) E.push(["eWhen", "when", "That time is in the future. Enter when she actually answered."]); else if (t < ISSUED - 60000) E.push(["eWhen", "when", "That is before the offer was issued (" + stamp(ISSUED) + ")."]);
    if (!v.ptype) E.push(["ePtype", "ptype", "Choose the kind of proof."]);
    if (!proof) E.push(["eProof", "proof", "Attach the proof. Her answer cannot be recorded without it."]);
    if (v.ans === "no" && v.words.length < 10) E.push(["eWords", "words", "Write her reason for declining (at least 10 characters). Underwriting needs it."]);
    if (!v.swear) E.push(["eSwear", "swear", "Tick the box to confirm you explained the terms as written."]); return E; }
  function refresh() { var v = val(), E = errs(), ids = ["eAns", "eChan", "eWhen", "ePtype", "eWords", "eSwear"]; ids.forEach(function (i) { $(i).textContent = ""; }); if (!$("eProof").dataset.keep) $("eProof").textContent = "";
    ["when", "ptype", "words"].forEach(function (i) { $(i).removeAttribute("aria-invalid"); });
    if (tried) E.forEach(function (e) { $(e[0]).textContent = e[2]; var f = $(e[1]); if (f && /when|ptype|words/.test(e[1])) f.setAttribute("aria-invalid", "true"); });
    $("wordsLab").textContent = v.ans === "no" ? "Why she declines, in her words " : "In her words (optional)"; if (v.ans === "no") $("wordsLab").appendChild(el("b", "", "*"));
    $("holdS").textContent = E.length ? E.length + " thing" + (E.length > 1 ? "s" : "") + " still missing. Hold to see " + (E.length > 1 ? "them" : "it") + "." : "Once sealed it cannot be changed, by you or anyone.";
    try { sessionStorage.setItem("calmsAnswer", JSON.stringify(v)); $("draftAt").textContent = "draft kept " + new Date().toLocaleTimeString("en-PH", { hour12: false }); } catch (e) {}
    if (!done && !hT) say(!v.ans ? "Do not come back without an answer, and proof of it." : !proof ? (v.ans === "yes" ? "She accepts? Show me her signature." : "She declines? I want it in writing, and I want to know why.") : E.length ? E.length + " more thing" + (E.length > 1 ? "s" : "") + " and I will carry it back." : "All here. Seal it and I will fly it to the office.", !v.ans || E.length ? "" : "watch"); return E; }
  ["aYes", "aNo", "when", "ptype", "words", "swear"].forEach(function (i) { $(i).addEventListener("input", refresh); $(i).addEventListener("change", refresh); });
  $("proof").addEventListener("change", function () { var f = this.files[0], e = $("eProof"), pv = $("pv"); proof = null; pv.textContent = ""; delete e.dataset.keep; $("drop").classList.remove("on");
    if (f && !/^(image\/|audio\/)|pdf$/i.test(f.type) && !/\.(pdf|jpe?g|png|heic|m4a|mp3|wav)$/i.test(f.name)) { e.textContent = "That file type cannot be used as proof. Attach a photo, a PDF or an audio recording."; e.dataset.keep = "1"; say("That is not proof. Try again.", "alert"); }
    else if (f && f.size > 10 * 1048576) { e.textContent = "That file is over 10 MB. Take the photo at a lower quality or trim the recording."; e.dataset.keep = "1"; say("Too big to carry. Under ten megabytes.", "alert"); }
    else if (f && LIVE && !/\.(pdf|jpe?g|png)$/i.test(f.name)) { e.textContent = "The office keeps proof as a PDF, JPG or PNG. Take a photo or a screenshot instead."; e.dataset.keep = "1"; say("Photo or PDF. Not that.", "alert"); }
    else if (f) { proof = { name: f.name, size: f.size, at: stamp() }; PFILE = f; $("drop").classList.add("on"); if (/^image\//.test(f.type)) { var im = el("img"); im.src = URL.createObjectURL(f); im.alt = "Proof: " + f.name; pv.appendChild(im); } pv.appendChild(el("span", "stamp slam", "Proof attached")); pv.appendChild(el("div", "h", f.name + " · " + Math.max(1, Math.round(f.size / 1024)) + " KB · " + proof.at)); }
    refresh(); });
  /* ---- hold to seal ---- */
  var hT = null, hb = $("hold");
  function hStop(msg) { cancelAnimationFrame(hT); hT = null; hb.style.setProperty("--p", "0%"); hb.style.setProperty("--s", 0); if (msg) $("note").textContent = msg; refresh(); }
  function hGo() { if (done || hT) return; tried = true; var E = refresh(), sum = $("sum"); if (E.length) { sum.hidden = false; sum.textContent = ""; sum.appendChild(el("b", "", "Not sealed. " + E.length + " thing" + (E.length > 1 ? "s" : "") + " to finish:")); var ul = el("ul"); E.forEach(function (x) { var li = el("li"), a = el("a", "", x[2]); a.href = "#" + x[1]; a.addEventListener("click", function (ev) { ev.preventDefault(); var t = $(x[1]); t.scrollIntoView({ block: "center" }); t.focus({ preventScroll: true }); }); li.appendChild(a); ul.appendChild(li); }); sum.appendChild(ul); sum.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); sum.focus({ preventScroll: true }); say("Not like this. " + E[0][2], "alert"); return; }
    $("sum").hidden = true; var t0 = performance.now(); say("Hold it. Let the wax set.", "watch"); (function f(now) { var p = Math.min(1, (now - t0) / (reduce ? 400 : 1500)); hb.style.setProperty("--p", (p * 100) + "%"); hb.style.setProperty("--s", p); if (p >= 1) { hT = null; seal(); return; } hT = requestAnimationFrame(f); })(performance.now()); }
  hb.addEventListener("pointerdown", function (e) { if (e.button) return; e.preventDefault(); hb.focus(); hGo(); }); ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { hb.addEventListener(ev, function () { if (hT) hStop("Let go too early. Nothing was sealed."); }); });
  hb.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); hGo(); } }); hb.addEventListener("keyup", function (e) { if ((e.key === " " || e.key === "Enter") && hT) hStop("Let go too early. Nothing was sealed."); }); hb.addEventListener("click", function (e) { e.preventDefault(); });
  function seal() { var v = val(), yes = v.ans === "yes";
    if (LIVE) { if (done) return; done = true; hb.style.setProperty("--p", "0%"); $("note").textContent = "Sending…";
      var rd = new FileReader(); rd.onload = function () {
        var note = (v.words ? v.words + " " : "") + "(Proof: " + v.ptype.toLowerCase() + ".)";
        CALMS.api("POST", "/api/applications/" + LIVE.reference + "/offers/" + OFFN + "/answer", { answer: yes ? "accepted" : "declined", channel: v.chan, toldAt: new Date(v.when).toISOString(), note: note, proof: { name: PFILE.name, data: String(rd.result).split(",")[1] || "" } })
          .then(function () { sealDone(v, yes); }, function (err) { done = false; $("note").textContent = err.message + " Nothing was sealed."; say("The office refused it. " + err.message, "alert"); });
      }; rd.readAsDataURL(PFILE); return; }
    sealDone(v, yes, true); }
  function sealDone(v, yes, offline) { done = true; hb.style.setProperty("--p", "0%"); try { sessionStorage.removeItem("calmsAnswer"); } catch (e) {}
    say("Sealed. I am taking it to the office.", ""); $("note").textContent = "Sealing…";
    flyOff(function () { $("form").hidden = true; $("record").hidden = false;
      var rc = $("rcd"); rc.textContent = ""; [["Her answer", (yes ? "ACCEPTED offer " : "DECLINED offer ") + OFFN], ["She answered", stamp(new Date(v.when).getTime())], ["Told", v.chan.toLowerCase()], ["Proof", v.ptype + ": " + proof.name], ["Her words", v.words || "none recorded"], ["Recorded by", LIVE && ME ? ME.name + ", " + ME.roleName : "Jun Espiritu, Sales Agent, her assigned agent"], ["Recorded", stamp()], ["Offer", peso(OFF.amt) + " over " + OFF.term + " months, now sealed"]].forEach(function (x) { rc.appendChild(el("dt", "", x[0])); rc.appendChild(el("dd", "", x[1])); });
      var th = $("then"); th.textContent = ""; (yes ? ["Status becomes Accepted by Borrower.", "The loan agreement and disclosure statement can now be generated for her to sign.", "It enters the disbursement queue once the signed agreement is uploaded.", "She is sent the outcome by SMS. You will be told when the agreement is ready to bring to her."] : ["Status becomes Declined by Borrower.", "It returns to underwriting (" + UW + ") with her reason.", "Underwriting will either issue a new offer or reject the application.", "If a new offer is issued, it comes to you to carry, like this one."]).forEach(function (s) { th.appendChild(el("li", "", s)); });
      $("note").textContent = "Her answer is sealed and on its way. Offer " + OFFN + " can no longer be changed by anyone."; say(yes ? "Delivered. She said yes. Now get that agreement signed." : "Delivered. She said no. Underwriting has it.", yes ? "nod" : "alert"); $("record").scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }); }
  $("again").addEventListener("click", function () { if (LIVE) { location.href = "application-detail.html?ref=" + LIVE.reference; return; } done = false; tried = false; proof = null; $("form").reset(); $("when").value = local(Date.now()); $("pv").textContent = ""; $("drop").classList.remove("on"); $("form").hidden = false; $("record").hidden = true; $("sum").hidden = true; $("note").textContent = ""; refresh(); });
  function who() { if (LIVE) { $("whoName").textContent = ME ? ME.name : ""; $("whoRole").textContent = ME ? ME.roleName : ""; $("field").hidden = !LIVE.canAnswer; $("blocked").hidden = LIVE.canAnswer;
      if (!LIVE.canAnswer) { var bp = $("blocked").querySelector("p"); if (bp) bp.textContent = !LO ? "There is no offer on this application." : LIVE.status !== "awaiting" ? "This offer is not waiting for an answer any more (status: " + LIVE.status + ")." : "Only the borrower's assigned sales agent (" + (LIVE.agent || "none") + ") or a loan processor records her answer."; $("note").textContent = ""; }
      else refresh(); return; }
    var mine = role === "je"; $("whoName").textContent = mine ? "Jun Espiritu" : "Karen Bernardo"; $("field").hidden = !mine; $("blocked").hidden = mine; if (!mine) { $("note").textContent = "Blocked: only the assigned agent can record this borrower's answer."; } else { $("note").textContent = ""; refresh(); } }
  $("role").addEventListener("change", function () { role = this.value; who(); });
  if (LIVE) { var pr = $("protoRole"); if (pr) pr.style.display = "none"; $("proof").setAttribute("accept", "image/jpeg,image/png,.pdf");
    $("subline").textContent = LIVE.borrower + " · " + LIVE.product + " · offer " + OFFN + " of " + LIVE.offers.length; $("oTitle").textContent = "Offer " + OFFN; $("showT").textContent = "GR8 Lending Company · Offer " + OFFN; document.title = "CALMS Record answer " + LIVE.reference;
    [["cQ", "my-queue.html"], ["cRef", "application-detail.html?ref=" + LIVE.reference], ["cCO", "counter-offers.html?ref=" + LIVE.reference]].forEach(function (x) { var a = $(x[0]); a.classList.remove("px"); a.href = x[1]; }); $("cRef").textContent = LIVE.reference;
    if (ME) { var ini = ME.name.split(" ").map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); $("waxI").textContent = ini; $("bigI").textContent = ini; }
    $("again").textContent = "Open the application"; }
  [].forEach.call(document.querySelectorAll("a.px"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: that is another page."; }); });
  var NAV = [["My Queue", 0], ["Applications", 0], ["Counter-offers", 1], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"); x.href = "#"; x.appendChild(el("span", "plate", n[0])); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  who();
}
