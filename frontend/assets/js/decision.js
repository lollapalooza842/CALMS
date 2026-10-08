/* Online with ?ref=APP-…, the terms, the recommendation, your limit and the checks come from
   GET /api/applications/:ref/decision, and holding the stamp sends the decision with your authenticator code to
   POST /api/applications/:ref/decision, which checks everything again before signing. ?amt=&term= (from the
   Credit assessment bench) opens it on "Approve other terms". Opened from the folder, the sample is used. */
(function () {
  var REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1];
  if (!REF || !window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/applications/" + encodeURIComponent(REF) + "/decision").then(start, function (err) { if (err.status === 401) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample application instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(n) { return n.toFixed(1) + "%"; }
  function stamp() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  var ASK = { amt: 300000, term: 24 }, INCOME = 52000, DEBT = 7490, COLL = 400000, RATE = .015, FEE = .033, FIT = 260000, MIN = 100000, MAX = 1000000;
  var WHO = { ar: ["Antonio Reyes", "Lead Underwriter", 500000, "the Chief Risk Officer"], bc: ["Benjie Cruz", "Credit Analyst", 150000, "the Lead Underwriter"] };
  var KIND = { asis: ["Approve as asked", "#2c5a38", "Approved"], other: ["Approve other terms", "#b87a1e", "Approved, changed terms"], no: ["Decline", "#8f2a22", "Declined"], up: ["Endorse upward", "#2c4868", "Endorsed upward"] };
  var role = "ar", S = { kind: "", amt: 250000, term: 24 }, mfa = false, done = null, tried = false;
  var METHOD = "diminishing", TERMS = null, POL = { dtiMax: 45, dtiSoft: 40 }, AGENT = "J. Espiritu", ENCODER = "L. Mendoza", VERIFIER = "A. Soriano", PROD = "SME loans", BUSY = false;
  function whenL(t) { return new Date(t).toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  if (LIVE) {
    ASK = { amt: LIVE.ask.amount, term: LIVE.ask.term }; INCOME = LIVE.income; DEBT = LIVE.debt; COLL = LIVE.collateral || 0; RATE = LIVE.rate; METHOD = LIVE.method; FEE = LIVE.fee;
    FIT = LIVE.fit; MIN = LIVE.min; MAX = LIVE.max; TERMS = LIVE.terms; POL = LIVE.policy; AGENT = LIVE.agent || "no sales agent (walk-in)"; ENCODER = LIVE.encodedBy; VERIFIER = LIVE.verifiedBy; PROD = LIVE.product.replace(/ loan$/, " loans");
    WHO = { me: [LIVE.me.name, LIVE.me.roleName, LIVE.me.limit, LIVE.me.upstairs || "a higher authority"] }; role = "me";
    S.amt = ASK.amt; S.term = ASK.term;
    var qa = /[?&]amt=(\d+)/.exec(location.search), qt = /[?&]term=(\d+)/.exec(location.search);
    if (qa && LIVE.me.canDecide && !LIVE.decision) { S.kind = "other"; S.amt = +qa[1]; S.term = qt ? +qt[1] : ASK.term; }
  }
  function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
  function T(a, n) { var m = inst(a, n); return { m: m, dti: (DEBT + m) / INCOME * 100, ltv: COLL ? a / COLL * 100 : null, fee: a * FEE, net: a - a * FEE, total: m * n }; }
  function terms() { return S.kind === "other" ? { amt: S.amt, term: S.term } : ASK; }
  function over() { return terms().amt > WHO[role][2]; }
  function isOverride() { var t = terms(); if (LIVE && LIVE.assessment) { var rec = LIVE.assessment.outcome, ok = /Approve automatically|leans approve/.test(rec); return S.kind === "asis" ? !ok : S.kind === "no" ? ok || /lower amount/.test(rec) : S.kind === "other" ? (t.amt > FIT || T(t.amt, t.term).dti > POL.dtiSoft) : false; }
    return S.kind === "asis" || S.kind === "no" || (S.kind === "other" && (t.amt > FIT || T(t.amt, t.term).dti > 40)); }
  function amtErr() { if (S.kind !== "other") return ""; if (isNaN(S.amt) || S.amt % 1000) return "Enter the amount in whole thousands, for example 250,000."; if (S.amt < MIN || S.amt > MAX) return PROD + " run from " + peso(MIN) + " to " + peso(MAX) + "."; if (S.amt === ASK.amt && S.term === ASK.term) return "Those are the terms she asked for. Use “Approve as asked” instead."; return ""; }
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[28, 2400], [3, 110]], ALERT = [[22, 80], [23, 700], [24, 1400]], NOD = [[18, 140], [19, 500], [18, 140], [0, 1800]], WATCH = [[0, 1200], [24, 900]];
  function say(t, m) { $("says").textContent = t; if (m === "alert") loop(ALERT, function () { loop(IDLE); }); else if (m === "nod") loop(NOD, function () { loop(IDLE); }); else if (m === "watch") loop(WATCH); else loop(IDLE); }

  function ready() { if (LIVE && !LIVE.me.canDecide) return LIVE.decision ? "Already decided." : LIVE.status !== "review" ? "Only an application Under Review can be decided." : LIVE.encodedByMe ? "You encoded this application, so you cannot decide it." : "Only an underwriter can decide."; if (LIVE && !LIVE.assessment) return "No credit assessment yet. Ask FinScore on the Credit assessment screen first."; if (!S.kind) return "Pick up a stamp first."; if (S.kind !== "up" && over()) return "This amount is over your limit. You can only endorse it upward."; if (amtErr()) return amtErr(); var rm = $("rm").value.trim(); if (S.kind === "no" && !$("why").value) return "Choose a reason for declining."; if ((isOverride() || S.kind === "up") && rm.length < 20) return "Write your " + (S.kind === "up" ? "endorsement" : "justification") + " in the remarks (at least 20 characters)."; if (!mfa) return "Enter your six-digit authenticator code."; return ""; }
  function paint() {
    var W = WHO[role], t = terms(), a = T(ASK.amt, ASK.term), b = T(t.amt, t.term), diff = S.kind === "other";
    $("whoName").textContent = W[0]; $("whoRole").textContent = W[1]; $("lim").textContent = "limit " + peso(W[2]);
    $("thNow").textContent = S.kind === "no" ? "Declined" : S.kind === "up" ? "You are endorsing" : "You are granting";
    var tb = $("terms"); tb.textContent = ""; var row = function (k, x, y, cls) { var tr = el("tr", cls || ""); tr.appendChild(el("td", "", k)); tr.appendChild(el("td", "", x)); var c = el("td", diff && x !== y && S.kind !== "no" ? "diff" : "", S.kind === "no" ? "—" : y); tr.appendChild(c); tb.appendChild(tr); };
    row("Amount", peso(ASK.amt), peso(t.amt)); row("Term", ASK.term + " months", t.term + " months"); var rt = Math.round(RATE * 10000) / 100 + "% a month, " + METHOD; row("Interest", rt, rt); row("Processing charge (" + Math.round(FEE * 1000) / 10 + "%)", peso(a.fee), peso(b.fee)); row("Net proceeds", peso(a.net), peso(b.net)); row("Each month", peso(a.m), peso(b.m)); row("Total to repay", peso(a.total), peso(b.total)); row("Debt to income", pct(a.dti), pct(b.dti), COLL ? "" : "tot"); if (COLL) row("Loan to value", pct(a.ltv), pct(b.ltv), "tot");
    $("edit").hidden = S.kind !== "other" || !!done; if (document.activeElement !== $("amt")) $("amt").value = isNaN(S.amt) ? "" : S.amt.toLocaleString("en-PH"); $("term").value = S.term;
    var ae = amtErr(); $("eAmt").textContent = S.kind === "other" ? ae : ""; if (ae && S.kind === "other") $("amt").setAttribute("aria-invalid", "true"); else $("amt").removeAttribute("aria-invalid");
    var bn = $("banner"); bn.textContent = "";
    if (S.kind === "other" && !ae) { var x = el("div", "banner"); x.appendChild(el("b", "", "This raises counter-offer 1")); x.appendChild(document.createTextNode("The terms differ from what was asked for, so the system will issue a counter-offer, handled by " + AGENT + ". Nothing moves to the loan agreement until the borrower's answer is recorded.")); bn.appendChild(x); }
    if (S.kind && S.kind !== "no" && S.kind !== "up" && b.dti > POL.dtiMax) { var y = el("div", "banner warn"); y.appendChild(el("b", "", "Over the " + POL.dtiMax + "% limit")); y.appendChild(document.createTextNode("At these terms debt-to-income is " + pct(b.dti) + ". You may still grant it inside your limit, but it is an override and needs a written justification.")); bn.appendChild(y); }
    /* authority */
    var f = Math.min(100, t.amt / (W[2] * 1.4) * 100), bar = $("bar"); bar.textContent = ""; var fb = el("b", over() ? "over" : ""); fb.style.width = f + "%"; bar.appendChild(fb); var u = el("u"); u.style.left = (100 / 1.4) + "%"; bar.appendChild(u); var s1 = el("span", "", "your limit " + peso(W[2])); s1.style.left = (100 / 1.4) + "%"; bar.appendChild(s1); bar.setAttribute("role", "img"); bar.setAttribute("aria-label", peso(t.amt) + " against your limit of " + peso(W[2]));
    var au = $("auth"); au.textContent = ""; [[!over(), over() ? peso(t.amt) + " is over your limit. You cannot approve it; you can endorse it to " + W[3] + "." : peso(t.amt) + " is inside your limit."], [!(LIVE && LIVE.encodedByMe), LIVE && LIVE.encodedByMe ? "You encoded this application, so you cannot decide it." : "You did not encode or submit this application (" + ENCODER + " did)."], [!LIVE || !!VERIFIER, VERIFIER ? "Encoded data verified by a second user (" + VERIFIER + ")." : "Not verified by a second user on record."], [!LIVE || !!(LIVE.assessment && LIVE.reportOnFile), !LIVE || (LIVE.assessment && LIVE.reportOnFile) ? "Credit assessment complete, with the FinScore report on file." + (LIVE && LIVE.assessment ? " Recommended: " + LIVE.assessment.outcome.replace(/^Manual review: /, "") + "." : "") : "No credit assessment yet."]].concat(LIVE ? [] : [[true, "No past-due account on record for this borrower."]]).forEach(function (r) { var li = el("li", r[0] ? "ok" : "no"); li.appendChild(el("i", "", r[0] ? "✓" : "×")); li.appendChild(el("span", "", r[1])); au.appendChild(li); });
    /* rack */
    var rk = $("rack"); rk.textContent = ""; Object.keys(KIND).forEach(function (k) { var dis = k === "up" ? !(ASK.amt > W[2] || over()) : (k === "asis" && ASK.amt > W[2]);
      var b2 = el("button", "rs"); b2.type = "button"; b2.style.setProperty("--c", KIND[k][1]); b2.appendChild(el("span", "", KIND[k][0])); b2.setAttribute("aria-pressed", String(S.kind === k)); if (dis) b2.setAttribute("aria-disabled", "true");
      b2.addEventListener("click", function () { if (dis) { $("note").textContent = k === "up" ? "Endorsing upward is for amounts over your own limit. This one is inside it." : "The requested " + peso(ASK.amt) + " is over your limit. Endorse it upward, or grant a smaller amount."; return; } S.kind = S.kind === k ? "" : k; tried = false; paint(); hello(); }); rk.appendChild(b2); });
    /* remarks */
    var ov = isOverride() && S.kind !== "up"; $("ov").hidden = !ov; $("whyBox").hidden = S.kind !== "no";
    $("rmNeed").textContent = ov || S.kind === "up" ? "required" : "optional"; $("rmLab").textContent = S.kind === "up" ? "Endorsement to " + W[3] : ov ? "Justification for the override" : "Remarks";
    var rmBad = tried && (ov || S.kind === "up") && $("rm").value.trim().length < 20; $("eRm").textContent = rmBad ? "Write at least 20 characters. It is recorded with your name." : ""; if (rmBad) $("rm").setAttribute("aria-invalid", "true"); else $("rm").removeAttribute("aria-invalid");
    /* hold */
    var r = ready(), h = $("hold"); h.setAttribute("aria-disabled", String(!!r)); h.classList.toggle("no", S.kind === "no"); h.style.setProperty("--c", S.kind ? KIND[S.kind][1] : "#8a8a86");
    $("holdT").textContent = "4. Press and hold to stamp" + (S.kind ? ": " + KIND[S.kind][2] : ""); $("holdS").textContent = r || "Hold for a second and a half. Letting go early cancels.";
    $("steps").hidden = !!done || !!(LIVE && !LIVE.me.canDecide); $("record").hidden = !done;
  }
  function hello() { var W = WHO[role], t = terms(); if (done) return; if (!S.kind) { say(over() ? "The request is over your limit, " + W[0].split(" ")[0] + ". Endorse it up or grant less." : "Pick a stamp. Whatever you choose goes on the record under your name.", over() ? "alert" : ""); return; }
    if (S.kind !== "up" && over()) { say("Over your limit. You do not get to stamp that.", "alert"); return; }
    say(S.kind === "asis" ? "The rules said lower. Granting it all is an override. Write down why." : S.kind === "no" ? "Declining against a lean-approve needs a reason she can be told." : S.kind === "up" ? "Passing it upstairs. Say why it deserves their time." : amtErr() ? "Fix the amount." : isOverride() ? "Still past what the rules suggested. Justify it." : "Inside the recommendation. She gets a counter-offer.", isOverride() && S.kind !== "up" ? "watch" : ""); }
  /* ---- tumblers ---- */
  var tb2 = $("tumb"); for (var i = 0; i < 6; i++) (function (i) { var x = el("input"); x.id = "t" + i; x.inputMode = "numeric"; x.maxLength = 1; x.autocomplete = i ? "off" : "one-time-code"; x.setAttribute("aria-label", "Digit " + (i + 1));
    x.addEventListener("input", function () { x.value = x.value.replace(/\D/g, "").slice(-1); if (x.value && i < 5) $("t" + (i + 1)).focus(); check(); });
    x.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !x.value && i) $("t" + (i - 1)).focus(); });
    x.addEventListener("paste", function (e) { var d = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, 6); if (d.length > 1) { e.preventDefault(); d.split("").forEach(function (c, k) { $("t" + k).value = c; }); check(); } }); tb2.appendChild(x); })(i);
  function check() { var v = ""; for (var k = 0; k < 6; k++) v += $("t" + k).value; mfa = /^\d{6}$/.test(v); tb2.classList.toggle("ok", mfa); $("eMfa").textContent = ""; if (mfa) $("note").textContent = "Identity confirmed for this signature."; paint(); }
  /* ---- hold to stamp ---- */
  var hT = null, hStart = 0, HOLD = 1500;
  function hStop(msg) { cancelAnimationFrame(hT); hT = null; $("hold").style.setProperty("--p", "0%"); if (msg) $("note").textContent = msg; }
  function hGo() { var r = ready(); if (r) { tried = true; paint(); $("note").textContent = r; if (!mfa && S.kind) $("eMfa").textContent = /identity|code/i.test(r) ? "Enter all six digits." : ""; say("Not yet. " + r, "alert"); return; } if (hT) return; hStart = performance.now(); say("Hold it. Steady.", "watch");
    (function f(now) { var p = Math.min(1, (now - hStart) / (reduce ? 400 : HOLD)); $("hold").style.setProperty("--p", (p * 100) + "%"); if (p >= 1) { hT = null; sign(); return; } hT = requestAnimationFrame(f); })(performance.now()); }
  var hb = $("hold"); hb.addEventListener("pointerdown", function (e) { if (e.button) return; e.preventDefault(); hb.focus(); hGo(); });
  ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { hb.addEventListener(ev, function () { if (hT) hStop("Let go too early. Nothing was signed."); }); });
  hb.addEventListener("keydown", function (e) { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); hGo(); } }); hb.addEventListener("keyup", function (e) { if ((e.key === " " || e.key === "Enter") && hT) hStop("Let go too early. Nothing was signed."); });
  hb.addEventListener("click", function (e) { e.preventDefault(); });
  function code() { var v = ""; for (var k = 0; k < 6; k++) v += $("t" + k).value; return v; }
  function sign() {
    if (LIVE) { if (BUSY) return; BUSY = true; $("note").textContent = "Signing…";
      CALMS.api("POST", "/api/applications/" + LIVE.reference + "/decision", { kind: S.kind, amount: String(S.amt), termMonths: S.term, reason: $("why").value, remarks: $("rm").value, code: code() })
        .then(function (r) { BUSY = false; done = { at: whenL(r.at), ref: r.signature }; LIVE.status = r.status; LIVE.me.canDecide = false; stampIt(done.at, done.ref, r.override); },
          function (err) { BUSY = false; $("hold").style.setProperty("--p", "0%"); $("note").textContent = err.message + " Nothing was signed."; if (/code/i.test(err.message)) { for (var k = 0; k < 6; k++) $("t" + k).value = ""; mfa = false; tb2.classList.remove("ok"); $("eMfa").textContent = "Enter the code again."; } paint(); say("Refused. " + err.message, "alert"); });
      return; }
    stampIt(stamp(), "SIG-" + Date.now().toString(36).toUpperCase().slice(-8));
  }
  function stampIt(at0, ref0, ovServer) {
    var W = WHO[role], t = terms(), b = T(t.amt, t.term), at = at0, ref = ref0, k = S.kind, ov = ovServer != null ? ovServer : isOverride() && k !== "up";
    done = { at: at, ref: ref }; $("hold").style.setProperty("--p", "0%");
    var sg = $("sig"), im = el("div", "imprint slam" + (k === "no" ? " no" : k === "up" ? " up" : ""), KIND[k][2]); im.appendChild(el("small", "", W[0] + " · " + at)); sg.appendChild(im);
    $("sigText").textContent = "Signed electronically by " + W[0] + ", " + W[1] + ". Identity confirmed by authenticator code. Signature reference " + ref + ".";
    var sh = $("sheet"); sh.classList.remove("shake"); void sh.offsetWidth; sh.classList.add("shake");
    var rc = $("rcd"); rc.textContent = ""; [["Decision", KIND[k][2] + (ov ? " (override of the system's recommendation)" : "")], ["Terms", k === "no" ? "none granted" : peso(t.amt) + " over " + t.term + " months, " + Math.round(RATE * 10000) / 100 + "% a month " + METHOD + ", charges " + peso(b.fee)], ["By", W[0] + ", " + W[1] + ", limit " + peso(W[2])], ["When", at], ["Identity", "Multi-factor check passed at signing"], ["Signature", ref], ["Rule set", LIVE ? "Version " + LIVE.ruleVersion + ". System recommended: " + (LIVE.assessment ? LIVE.assessment.outcome.replace(/^Manual review: /, "").toLowerCase() : "nothing") : "Version 14. System recommended: approve a lower amount"], ["Reason", k === "no" ? $("why").value : "—"], ["Remarks", $("rm").value.trim() || "none"]].forEach(function (x) { if (x[1] === "—") return; rc.appendChild(el("dt", "", x[0])); rc.appendChild(el("dd", "", x[1])); });
    var th = $("then"); th.textContent = ""; var steps = LIVE ? (k === "other" ? ["Status became Approved, then Awaiting Borrower Acceptance.", "Counter-offer 1: " + peso(t.amt) + " over " + t.term + " months against the " + peso(ASK.amt) + " asked for.", "It is handled by " + AGENT + ".", "The loan agreement and disbursement stay locked until the borrower's answer is recorded with proof."]
      : k === "asis" ? ["Status became Approved.", "No counter-offer: the terms are exactly what was asked for.", "The loan agreement and disclosure statement can now be generated."]
      : k === "no" ? ["Status became Rejected.", "The application returns to the loan processor, " + ENCODER + ", with your reason."]
      : ["Status stays Under Review.", "It goes to " + W[3] + " with the credit memo and your endorsement."])
      : k === "other" ? ["Status becomes Approved, then Awaiting Borrower Acceptance.", "Counter-offer 1 is issued: " + peso(t.amt) + " over " + t.term + " months against the " + peso(ASK.amt) + " she asked for.", "It is assigned to her sales agent, J. Espiritu, who is notified now.", "She is told directly by SMS (no email on file). No amounts are put in the message.", "The loan agreement and disbursement stay locked until her answer is recorded with proof."]
      : k === "asis" ? ["Status becomes Approved.", "No counter-offer: the terms are exactly what she asked for.", "The loan agreement and disclosure statement can now be generated.", "She and J. Espiritu are notified of the approval."]
      : k === "no" ? ["Status becomes Rejected.", "The application returns to the loan processor, L. Mendoza, with your reason.", "She is told the outcome by SMS, and J. Espiritu is alerted to tell her in person."]
      : ["Status stays Under Review.", "The application moves to " + W[3] + "'s queue with the credit memo and your endorsement.", "You are notified when it is decided."];
    steps.forEach(function (s) { th.appendChild(el("li", "", s)); });
    $("nextB").textContent = k === "other" ? "Open counter-offers" : k === "asis" ? "Open loan agreement" : "Back to the review queue";
    $("note").textContent = LIVE ? "Signed and locked under " + ref + ". It is in the audit log." : "Signed and locked. Every detail above is in the audit log.";
    paint(); say(k === "no" ? "Declined, with a reason. That is how it is done." : k === "up" ? "Upstairs it goes. Not your problem until it comes back." : ov ? "Signed, and the override is under your name. I will remember." : "Signed. Now we wait for her answer.", k === "no" ? "alert" : "nod");
  }
  /* ---- wiring ---- */
  var ts = $("term"); (TERMS || [12, 18, 24, 30, 36, 42, 48, 54, 60]).forEach(function (n) { var o = el("option", "", n + " months"); o.value = n; ts.appendChild(o); });
  $("amt").addEventListener("input", function () { S.amt = parseFloat(this.value.replace(/[^0-9.]/g, "")); paint(); hello(); }); $("amt").addEventListener("blur", function () { if (!isNaN(S.amt)) this.value = S.amt.toLocaleString("en-PH"); });
  ts.addEventListener("change", function () { S.term = +this.value; paint(); hello(); }); $("rm").addEventListener("input", paint); $("why").addEventListener("change", paint);
  $("role").addEventListener("change", function () { role = this.value; S.kind = ""; tried = false; again(); });
  function again() { done = null; S.kind = ""; mfa = false; tried = false; for (var k = 0; k < 6; k++) $("t" + k).value = ""; tb2.classList.remove("ok"); $("rm").value = ""; $("why").value = ""; var im = document.querySelector(".imprint"); if (im) im.remove(); $("sigText").textContent = "Not yet signed."; $("note").textContent = ""; paint(); hello(); }
  $("again").addEventListener("click", function () { if (LIVE) { location.href = "application-detail.html?ref=" + LIVE.reference; return; } again(); });
  $("nextB").addEventListener("click", function () { if (LIVE) { location.href = S.kind === "other" ? "counter-offers.html?ref=" + LIVE.reference : S.kind === "asis" ? "loan-agreement.html?ref=" + LIVE.reference : "review-queue.html"; return; } $("note").textContent = "Prototype: that page is not built yet."; });
  if (LIVE) {
    var pr = $("protoRole"); if (pr) pr.style.display = "none"; var ag = $("again"); if (ag) ag.textContent = "Open the application";
    $("subline").textContent = LIVE.borrower + " · " + LIVE.product + " · asked for " + peso(ASK.amt) + " over " + ASK.term + " months"; document.title = "CALMS Decision " + LIVE.reference;
    $("lhs").textContent = LIVE.reference + (LIVE.assessment ? " · " + LIVE.assessment.tier + " risk" : " · not yet assessed") + " · rule set version " + LIVE.ruleVersion;
    [["cQ", "review-queue.html"], ["cRef", "application-detail.html?ref=" + LIVE.reference], ["cCA", "credit-assessment.html?ref=" + LIVE.reference]].forEach(function (x) { var a = $(x[0]); a.classList.remove("px"); a.href = x[1]; }); $("cRef").textContent = LIVE.reference;
    var ft = document.querySelectorAll("#foot span"); if (ft[1]) ft[1].textContent = "Live record. The server checks your limit, the override rules and your authenticator code again before it signs.";
    if (LIVE.decision) { var D = LIVE.decision; S.kind = D.kind; if (D.amount) { S.amt = D.amount; S.term = D.term; } if (D.remarks) $("rm").value = D.remarks; if (D.reason) $("why").value = D.reason; done = { at: whenL(D.at), ref: D.signature };
      setTimeout(function () { var sg = $("sig"), im = el("div", "imprint" + (D.kind === "no" ? " no" : D.kind === "up" ? " up" : ""), D.label); im.appendChild(el("small", "", D.by + " · " + whenL(D.at))); sg.appendChild(im);
        $("sigText").textContent = "Signed electronically by " + D.by + ". Signature reference " + D.signature + "."; var rc = $("rcd"); rc.textContent = "";
        [["Decision", D.label + (D.override ? " (override of the system's recommendation)" : "")], ["Terms", D.kind === "no" ? "none granted" : peso(D.amount) + " over " + D.term + " months"], ["By", D.by], ["When", whenL(D.at)], ["Signature", D.signature], ["Rule set", "Version " + D.version + ". System recommended: " + (D.recommended || "").replace(/^Manual review: /, "").toLowerCase()], ["Reason", D.reason || "—"], ["Remarks", D.remarks || "none"]].forEach(function (x) { if (x[1] === "—") return; rc.appendChild(el("dt", "", x[0])); rc.appendChild(el("dd", "", x[1])); });
        $("then").textContent = ""; $("nextB").textContent = D.kind === "other" ? "Open counter-offers" : D.kind === "asis" ? "Open loan agreement" : "Back to the review queue"; paint(); say("Already signed. It stays signed.", ""); }, 0); }
    else if (!LIVE.me.canDecide) setTimeout(function () { $("note").textContent = ready(); say(ready(), ""); }, 0);
  }
  [].forEach.call(document.querySelectorAll("a.px"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: that is another page."; }); });
  var NAV = [["My Queue", 0], ["Applications", 0], ["Review queue", 1], ["Counter-offers", 0], ["Reports", 0], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"); x.href = "#"; x.appendChild(el("span", "plate", n[0])); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  paint(); hello();
}
