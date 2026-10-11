/* Record her answer, classic: explain the offer to the borrower, then seal her answer (accepts or declines) with proof. */
(function () {
  var h = CK.h, ref = CK.q("ref");
  function unhide() { document.documentElement.classList.add("ck-ownpick"); document.body.classList.remove("calms-down"); var s = document.getElementById("calmsHideCss"); if (s) s.remove(); }
  function local(t) { var d = new Date(t - new Date().getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
  function kb(n) { return Math.max(1, Math.round(n / 1024)) + " KB"; }
  var OFFST = { awaiting: ["Waiting for her answer", "violet"], accepted: ["Accepted", "teal"], declined: ["Declined", "red"] };

  if (!ref) { unhide(); picker(); return; }
  CK.loading(); load();
  function load() {
    Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/offers"), CK.api("GET", "/api/auth/me").catch(function () { return {}; })])
      .then(function (r) { draw(r[0], r[1].user || null); }, function (e) { CK.error(e, "application-detail.html?ref=" + ref); });
  }

  /* no ?ref: the offers waiting for an answer */
  function picker() {
    CK.loading();
    CK.api("GET", "/api/applications").then(function (d) {
      var L = d.applications.filter(function (a) { return a.status === "awaiting"; });
      CK.render([CK.head({ crumbs: [["Applications", "applications.html"], ["Her answer"]], title: "Record her answer", sub: "Choose the application whose offer you explained to the borrower." }),
        CK.card("Waiting for the borrower's answer", L.length ? h("div.ck-picklist", L.map(function (a) {
          return h("a.ck-pick", { href: "record-answer.html?ref=" + a.reference }, CK.av(a.borrower, 34), h("div.grow", h("b", a.borrower), h("small", a.reference + " · " + a.product + " · " + CK.peso(a.amount))), h("span.ck-sm", CK.since(a.statusSince)), CK.ic("next")); }))
          : CK.empty("No offer is waiting", "When underwriting makes a counter-offer, it shows here for the agent to carry to her.", "check"), { icon: "clock" })]);
    }, function (e) { CK.error(e, "applications.html"); });
  }

  function draw(L, ME) {
    var LO = L.offers.length ? L.offers[L.offers.length - 1] : null;
    var crumbs = [["Applications", "applications.html"], [L.reference, "application-detail.html?ref=" + L.reference], ["Counter-offers", "counter-offers.html?ref=" + L.reference], ["Her answer"]];
    if (!LO) { CK.render([CK.head({ crumbs: crumbs, title: "Record her answer", status: CK.status(L.status), sub: L.borrower + " · " + L.product }),
      CK.card(null, CK.empty("There is no offer on this application", "Her answer is recorded only after underwriting makes an offer.", "info"))]); return; }
    var ASK = { amt: L.ask.amount, term: L.ask.term }, OFF = { amt: LO.amount, term: LO.term }, RATE = L.rate, FEE = L.fee, METHOD = L.method, N = LO.n, ISSUED = new Date(LO.at).getTime();
    function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
    var m = inst(OFF.amt, OFF.term), fee = OFF.amt * FEE, net = OFF.amt - fee, total = m * OFF.term, mAsk = inst(ASK.amt, ASK.term), P = function (n) { return CK.peso(n, true); };
    var RT = Math.round(RATE * 10000) / 100;

    /* ---- the offer ---- */
    function row(k, v, sub) { return [k, h("span", v, sub ? h("small.ck-sm", sub) : null)]; }
    var offerCard = CK.card("Offer " + N, [
      h("p.ck-sm", "Issued " + CK.dt(LO.at) + " by " + LO.by + ", underwriting." + (L.agent ? " Assigned to " + L.agent + "." : "")),
      CK.dl([row("Loan amount", P(OFF.amt), "she asked for " + P(ASK.amt)), row("Monthly payments", OFF.term + " months", OFF.term === ASK.term ? "same as she asked" : "she asked for " + ASK.term),
        row("Interest", RT + "% a month", METHOD === "flat" ? "on the amount borrowed" : "on the remaining balance"), row("Processing charge", P(fee), "taken out once, at release"),
        row("She receives", h("b", P(net))), row("Each month", P(m), "she asked for terms costing " + P(mAsk)), row("Total she pays back", P(total))], "rows"),
      LO.remarks ? CK.note(h("span", h("b", "From underwriting: "), LO.remarks), "blue") : null,
      h("div.ck-actions", CK.btn("Turn the screen to her", { kind: "soft", icon: "eye", on: show }))], { icon: "doc", tools: CK.pill.apply(null, OFFST[LO.status] || [LO.status, "grey"]) });

    var tips = CK.card("Before you ask her", h("ul.ck-tips", ["Say the amounts exactly as written. You cannot change the terms; only underwriting can.",
      "Get her answer in a form you can attach: the signed offer sheet, a written note, or a recording she agrees to.",
      "No signal where you are? Wait until you have it. The system does not work offline."].map(function (t) { return h("li", CK.ic("check"), h("span", t)); })), { icon: "info" });

    var history = L.offers.length > 1 ? CK.card("Offers so far", h("ul.ck-list", L.offers.slice().reverse().map(function (o) { var s = OFFST[o.status] || [o.status, "grey"];
      return h("li", h("span.ck-filetile", CK.ic("doc")), h("div.grow", h("b.ck-strong", "Offer " + o.n + " · " + CK.peso(o.amount) + " over " + o.term + " months"), h("small.ck-sm", o.by + " · " + CK.dt(o.at) + (o.answer ? " · answer recorded by " + o.answer.by : ""))), CK.pill(s[0], s[1])); })), { icon: "list" }) : null;

    /* ---- show-to-borrower ---- */
    var SL = { en: [["You asked for", P(ASK.amt), "to be paid in " + ASK.term + " monthly payments."], ["We can offer you", P(OFF.amt), "to be paid in " + OFF.term + " monthly payments."], ["You will receive", P(net), "after a one-time processing charge of " + P(fee) + "."], ["You will pay each month", P(m), "for " + OFF.term + " months. In total you pay back " + P(total) + "."], ["The choice is yours", "Accept or decline", "You may accept this offer or decline it. Your agent will write down your answer and ask you to sign it."]],
      fil: [["Ang hiniling ninyo", P(ASK.amt), "na babayaran sa loob ng " + ASK.term + " na buwan."], ["Ang maiaalok namin", P(OFF.amt), "na babayaran sa loob ng " + OFF.term + " na buwan."], ["Ang matatanggap ninyo", P(net), "matapos ibawas ang isang beses na singil sa pagproseso na " + P(fee) + "."], ["Ang hulog ninyo bawat buwan", P(m), "sa loob ng " + OFF.term + " na buwan. Ang kabuuang babayaran ninyo ay " + P(total) + "."], ["Kayo ang magpapasya", "Tanggapin o hindi", "Maaari ninyong tanggapin o hindi tanggapin ang alok na ito. Isusulat ng inyong ahente ang inyong sagot at hihingin ang inyong pirma."]] };
    var NAVT = { en: ["Back", "Next"], fil: ["Bumalik", "Susunod"] };
    function show() {
      var lang = "en", pg = 0, box = h("div.ck-slidebox", { "aria-live": "polite" }), dots = h("div.ck-dots"), prev = CK.btn("Back", { kind: "ghost", icon: "back" }), next = CK.btn("Next", { kind: "primary" });
      function paint(dir) { var s = SL[lang][pg]; box.textContent = ""; box.appendChild(h("div.ck-slide" + (dir < 0 ? ".back" : ""), { lang: lang === "fil" ? "fil" : "en" }, h("span.l", s[0]), h("b.v", s[1]), h("p", s[2])));
        dots.textContent = ""; SL[lang].forEach(function (_, i) { dots.appendChild(h("i" + (i === pg ? ".on" : ""))); });
        prev.disabled = pg === 0; next.disabled = pg === SL[lang].length - 1; prev.querySelector("span").textContent = NAVT[lang][0]; next.querySelector("span").textContent = NAVT[lang][1]; }
      prev.addEventListener("click", function () { if (pg > 0) { pg--; paint(-1); } }); next.addEventListener("click", function () { if (pg < SL[lang].length - 1) { pg++; paint(1); } });
      var md = CK.modal({ title: "GR8 Lending Company · Offer " + N, wide: true, body: [h("div.ck-slidetop", h("span.ck-sm", "Turn the screen so she can read it. Arrow keys move between pages."), CK.seg([["en", "English"], ["fil", "Filipino"]], "en", function (v) { lang = v; paint(0); })), box, h("div.ck-slidenav", prev, dots, next)] });
      md.box.addEventListener("keydown", function (e) { if (e.target.tagName === "INPUT") return; if (e.key === "ArrowRight") next.click(); if (e.key === "ArrowLeft") prev.click(); });
      paint(0); setTimeout(function () { next.focus(); }, 80);
    }

    var head = CK.head({ crumbs: crumbs, title: "Record her answer", status: CK.status(L.status), sub: L.borrower + " · " + L.product + " · offer " + N + " of " + L.offers.length,
      actions: [CK.btn("Application", { kind: "ghost", icon: "doc", href: "application-detail.html?ref=" + L.reference })] });

    /* ---- not open: already answered, or not hers to record ---- */
    if (!L.canAnswer) {
      var why = L.status !== "awaiting" || LO.status !== "awaiting" ? "This offer is not waiting for an answer any more (status: " + (CK.ST[L.status] ? CK.ST[L.status][0].toLowerCase() : L.status) + ")."
        : "Only the borrower's assigned sales agent (" + (L.agent || "none") + ") or a loan processor records her answer.";
      var ans = LO.answer, side = [];
      if (ans) side.push(CK.card("Her answer, sealed", [h("div.ck-outcome", { style: { "--a": ans.answer === "accepted" ? "#2f7a4f" : "#b3261a" } }, h("span.ck-tile", CK.ic(ans.answer === "accepted" ? "check" : "x")),
          h("div", h("b", (ans.answer === "accepted" ? "Accepted" : "Declined") + " offer " + N), h("p", "Recorded by " + ans.by + " · " + CK.dt(ans.at)))),
        CK.dl([["She answered", CK.dt(ans.toldAt)], ["Told", ans.channel], ["In her words", ans.note || "none recorded"]], "one"),
        ans.proof ? h("div.ck-actions", CK.btn("Open the proof", { kind: "ghost", icon: "eye", href: "/api/applications/" + L.reference + "/documents/" + ans.proof })) : null], { icon: "lock" }));
      else side.push(CK.card(null, CK.empty(L.status === "awaiting" ? "Not your borrower" : "Nothing to record", why, "lock")));
      side.push(tips); if (history) side.push(history);
      CK.render([head, h("div.ck-grid.side2", h("div.ck-stack", offerCard), h("div.ck-stack", side))]);
      [].forEach.call(document.querySelectorAll('.c-view a[href^="/api/"]'), function (a) { a.target = "_blank"; });
      return;
    }

    /* ---- the form ---- */
    var ansV = "", chanV = "", file = null, fileErr = "", tried = false;
    var choice = h("div.ck-opts", { role: "radiogroup", "aria-label": "Her answer" }, [["yes", "Accepts", "She takes the offer as written", "check", "green"], ["no", "Declines", "She does not take it", "x", "red"]].map(function (c) {
      var r = h("input", { type: "radio", name: "ckans", value: c[0], on: { change: function () { ansV = c[0]; refresh(); } } });
      return h("label.t-" + c[4], r, h("span.ck-optic", CK.ic(c[3])), h("span", h("b", c[1]), h("small", c[2]))); }));
    var fAns = CK.field("What did she say?", choice, { req: true, wide: true });
    var seg = CK.seg(["In person", "Phone call", "SMS", "Email"], "", function (v) { chanV = v; refresh(); });
    var fChan = CK.field("How was she told the terms?", seg, { req: true, wide: true });
    var when = CK.input({ type: "datetime-local", value: local(Date.now()) }); when.max = local(Date.now() + 60000); when.min = local(ISSUED);
    var fWhen = CK.field("When did she answer?", when, { req: true });
    var ptype = CK.select([["", "Choose…"], ["Signed offer sheet", "Signed offer sheet"], ["Written confirmation", "Written confirmation"], ["Recorded acknowledgment", "Recorded acknowledgment"]], "");
    var fPtype = CK.field("Kind of proof", ptype, { req: true });
    var fin = h("input", { type: "file", accept: "image/jpeg,image/png,.pdf", "aria-label": "Proof of her answer" });
    var dropT = h("b", "No file yet"), dropS = h("small", "A photo or a PDF, up to 10 MB. On a phone this opens the camera."), prev = h("div", { style: { width: "100%" } });
    var pick = CK.btn("Choose a file", { kind: "ghost", icon: "upload", on: function () { fin.click(); } });
    var drop = h("div.ck-attach", h("span.ck-filetile", CK.ic("upload")), h("div.grow", dropT, dropS), pick, fin, prev);
    var fProof = CK.field("The proof itself", drop, { req: true, wide: true });
    fin.addEventListener("change", function () { var f = fin.files[0]; file = null; fileErr = ""; prev.textContent = ""; drop.classList.remove("on"); dropS.textContent = "A photo or a PDF, up to 10 MB. On a phone this opens the camera."; pick.querySelector("span").textContent = "Choose a file";
      if (!f) { dropT.textContent = "No file yet"; refresh(); return; }
      if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { fileErr = (/\.(heic|m4a|mp3|wav)$/i.test(f.name) || /^audio\//.test(f.type) ? "The office keeps proof as a PDF, JPG or PNG. Take a photo or a screenshot instead." : "That file type cannot be used as proof. Attach a photo, a PDF or an audio recording."); dropT.textContent = "No file yet"; fin.value = ""; refresh(); return; }
      if (f.size > 10 * 1048576) { fileErr = "That file is over 10 MB. Take the photo at a lower quality or trim the recording."; dropT.textContent = "No file yet"; fin.value = ""; refresh(); return; }
      file = f; drop.classList.add("on"); dropT.textContent = f.name; dropS.textContent = kb(f.size) + " · attached " + CK.dt(new Date()) + ". Choose again to replace it."; pick.querySelector("span").textContent = "Replace";
      if (/^image\//.test(f.type)) prev.appendChild(h("img", { src: URL.createObjectURL(f), alt: "Proof: " + f.name }));
      refresh(); });
    var words = CK.textarea("", "What she said, in her words");
    var fWords = CK.field("In her words (optional)", words, { wide: true, hint: "Underwriting reads this before deciding what to do next." });
    var swear = CK.check("I explained the terms to her exactly as written on offer " + N + ", and this is her own answer.", false), swearErr = h("p.ck-err", { role: "alert" });
    var sealBtn = CK.btn("Seal her answer", { kind: "primary", icon: "lock" }), left = h("span.ck-sm", "Once sealed it cannot be changed, by you or anyone.");
    var formErr = h("p.ck-err", { role: "alert" });
    [when, ptype, words].forEach(function (i) { i.addEventListener("input", refresh); i.addEventListener("change", refresh); });
    swear.querySelector("input").addEventListener("change", refresh);

    function errs() { var E = [], t = new Date(when.value).getTime();
      if (!ansV) E.push([fAns, "Choose her answer: accepts or declines."]);
      if (!chanV) E.push([fChan, "Choose how she was told the terms."]);
      if (!when.value || isNaN(t)) E.push([fWhen, "Enter the date and time she answered."]); else if (t > Date.now() + 60000) E.push([fWhen, "That time is in the future. Enter when she actually answered."]); else if (t < ISSUED - 60000) E.push([fWhen, "That is before the offer was issued (" + CK.dt(ISSUED) + ")."]);
      if (!ptype.value) E.push([fPtype, "Choose the kind of proof."]);
      if (!file) E.push([fProof, "Attach the proof. Her answer cannot be recorded without it."]);
      if (ansV === "no" && words.value.trim().length < 10) E.push([fWords, "Write her reason for declining (at least 10 characters). Underwriting needs it."]);
      if (!swear.querySelector("input").checked) E.push([swearErr, "Tick the box to confirm you explained the terms as written."]); return E; }
    function refresh() { var E = errs(), lab = fWords.querySelector("label");
      lab.textContent = ansV === "no" ? "Why she declines, in her words" : "In her words (optional)"; if (ansV === "no") lab.appendChild(h("b", " *"));
      var msg = function (f) { var x = E.filter(function (e) { return e[0] === f; })[0]; return tried && x ? x[1] : ""; };
      [fAns, fChan, fWhen, fPtype, fWords].forEach(function (f) { f.setError(msg(f)); }); fProof.setError(fileErr || msg(fProof)); swearErr.textContent = msg(swearErr);
      left.textContent = E.length ? E.length + " thing" + (E.length > 1 ? "s" : "") + " still missing." : "All here. Once sealed it cannot be changed, by you or anyone.";
      left.classList.toggle("ck-late", tried && !!E.length); return E; }

    function route(msg) { if (/choose what/i.test(msg)) return fAns; if (/how the borrower/i.test(msg)) return fChan; if (/future|before the offer|when the borrower/i.test(msg)) return fWhen; if (/proof|file|PDF|JPG|PNG|MB|empty/i.test(msg)) return fProof; return null; }
    sealBtn.addEventListener("click", function () { tried = true; formErr.textContent = ""; var E = refresh();
      if (E.length) { var first = E[0][0]; (first.querySelector ? first : swear).scrollIntoView({ block: "center", behavior: "smooth" }); var fx = (first.querySelector && first.querySelector("input, select, textarea")) || swear.querySelector("input"); if (fx && fx.type !== "file" && fx.type !== "radio") fx.focus({ preventScroll: true }); CK.toast("Not sealed. " + E[0][1], "red"); return; }
      var yes = ansV === "yes";
      CK.modal({ title: "Seal her answer?", body: [
        h("div.ck-outcome", { style: { "--a": yes ? "#2f7a4f" : "#b3261a" } }, h("span.ck-tile", CK.ic(yes ? "check" : "x")), h("div", h("b", (yes ? "She accepts" : "She declines") + " offer " + N), h("p", P(OFF.amt) + " over " + OFF.term + " months"))),
        CK.dl([["She answered", CK.dt(new Date(when.value))], ["Told", chanV.toLowerCase()], ["Proof", ptype.value + ": " + file.name], ["Her words", words.value.trim() || "none recorded"], ["Recorded by", ME ? ME.name + ", " + ME.roleName : "you"]], "one"),
        CK.note("Once sealed it cannot be changed, by you or anyone.", "amber", "lock")],
        actions: [["Go back", "ghost"], ["Seal it", "primary", function (close, b, err) { CK.busy(b, true);
          var rd = new FileReader(); rd.onerror = function () { CK.busy(b, false); err("The file could not be read. Choose it again."); };
          rd.onload = function () { var note = (words.value.trim() ? words.value.trim() + " " : "") + "(Proof: " + ptype.value.toLowerCase() + ".)";
            CK.api("POST", "/api/applications/" + L.reference + "/offers/" + N + "/answer", { answer: yes ? "accepted" : "declined", channel: chanV, toldAt: new Date(when.value).toISOString(), note: note, proof: { name: file.name, data: String(rd.result).split(",")[1] || "" } })
              .then(function () { close(); CK.toast("Her answer is sealed. Offer " + N + " can no longer be changed by anyone."); done(yes); },
                function (e) { CK.busy(b, false); if (e.status === 401) return; err(e.message + " Nothing was sealed."); var f = route(e.message); if (f) f.setError(e.message); else formErr.textContent = e.message; }); };
          rd.readAsDataURL(file); }]] });
    });

    function done(yes) { var told = new Date(when.value);
      var then = yes ? ["Status becomes Accepted by Borrower.", "The loan agreement and disclosure statement can now be generated for her to sign.", "It enters the disbursement queue once the signed agreement is uploaded.", "She is sent the outcome by SMS. You will be told when the agreement is ready to bring to her."]
        : ["Status becomes Declined by Borrower.", "It returns to underwriting (" + LO.by + ") with her reason.", "Underwriting will either issue a new offer or reject the application.", "If a new offer is issued, it comes to you to carry, like this one."];
      CK.render([CK.head({ crumbs: crumbs, title: "Her answer is sealed", status: CK.status(yes ? "accepted" : "declined"), sub: L.borrower + " · " + L.product + " · offer " + N + " can no longer be changed by anyone.",
          actions: [CK.btn("Open the application", { kind: "primary", icon: "next", href: "application-detail.html?ref=" + L.reference })] }),
        h("div.ck-grid.side2",
          CK.card("Sealed", [h("div.ck-outcome", { style: { "--a": yes ? "#2f7a4f" : "#b3261a" } }, h("span.ck-tile", CK.ic(yes ? "check" : "x")), h("div", h("b", (yes ? "ACCEPTED" : "DECLINED") + " offer " + N), h("p", "Recorded " + CK.dt(new Date())))),
            CK.dl([["She answered", CK.dt(told)], ["Told", chanV.toLowerCase()], ["Proof", ptype.value + ": " + file.name], ["Her words", words.value.trim() || "none recorded"], ["Recorded by", ME ? ME.name + ", " + ME.roleName : "–"], ["Offer", P(OFF.amt) + " over " + OFF.term + " months, now sealed"]])], { icon: "lock" }),
          CK.card("What happens now", h("ol.ck-steps-ol", then.map(function (t) { return h("li", t); })), { icon: "list" }))]); }

    var form = CK.card("Her answer", [h("div.ck-form", fAns, fChan, fWhen, fPtype, fProof, fWords), h("div.ck-stack", { style: { gap: "6px" } }, swear, swearErr), h("div.ck-divider"),
      h("div.ck-toolbar.between", left, sealBtn), formErr], { icon: "edit" });
    CK.render([head, h("div.ck-grid.side2", h("div.ck-stack", form), h("div.ck-stack", offerCard, tips, history))]);
    refresh();
  }
})();
