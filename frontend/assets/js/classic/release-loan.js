/* Release the loan, classic: choose how the net proceeds go out, check the payout against her ID, and release with the authenticator code. */
(function () {
  var h = CK.h, ref = CK.q("ref");
  function unhide() { document.documentElement.classList.add("ck-ownpick"); document.body.classList.remove("calms-down"); var s = document.getElementById("calmsHideCss"); if (s) s.remove(); }
  function P(n) { return CK.peso(n, true); }
  function digits(s) { return String(s || "").replace(/\D/g, ""); }
  /* Manila has no daylight saving, so UTC+8 is exact */
  function mnl() { return new Date(Date.now() + 8 * 3600e3); }
  function dstr(d) { return d.toLocaleDateString("en-PH", { timeZone: "UTC", year: "numeric", month: "long", day: "numeric" }); }
  function addM(k) { var n = mnl(), y = n.getUTCFullYear(), m = n.getUTCMonth(), d = n.getUTCDate(), r = new Date(Date.UTC(y, m + k, d)); if (r.getUTCDate() !== d) r = new Date(Date.UTC(y, m + k + 1, 0)); return r; }
  function nextBank() { var n = mnl(), d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)); while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d = new Date(d.getTime() + 86400e3); return d; }
  var PCSS = "@page{size:A4;margin:16mm 14mm}body{font:10.5pt/1.5 Georgia,'Times New Roman',serif;color:#111;margin:0}h1{font-size:15pt;text-transform:uppercase;letter-spacing:.05em;margin:0 0 4px}p{margin:0 0 12px;color:#444;font-size:9.5pt}" +
    "table{width:100%;border-collapse:collapse;font-size:10pt}td{border:1px solid #aaa;padding:5px 8px}td:first-child{width:34%;background:#f4f4f4}.sg{display:flex;gap:30px;margin-top:48px}.sg div{flex:1;border-top:1px solid #222;padding-top:4px;font-size:9pt}";
  function printVoucher(title, sub, rows) { var f = h("iframe", { "aria-hidden": "true", style: { position: "fixed", width: "0", height: "0", border: "0", right: "0", bottom: "0" } }); document.body.appendChild(f);
    var d = f.contentDocument; d.open(); d.write("<!doctype html><html><head><meta charset=utf-8><title></title><style>" + PCSS + "</style></head><body></body></html>"); d.close(); d.title = title;
    var t = d.createElement("table"); rows.forEach(function (r) { var tr = d.createElement("tr"); r.forEach(function (c) { var td = d.createElement("td"); td.textContent = c; tr.appendChild(td); }); t.appendChild(tr); });
    var h1 = d.createElement("h1"); h1.textContent = title; var p = d.createElement("p"); p.textContent = sub; var sg = d.createElement("div"); sg.className = "sg";
    ["Released by", "Received by the borrower"].forEach(function (x) { var e = d.createElement("div"); e.textContent = x; sg.appendChild(e); });
    d.body.appendChild(h1); d.body.appendChild(p); d.body.appendChild(t); d.body.appendChild(sg);
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 60000); }, 60); }

  if (!ref) { unhide(); picker(); return; }
  CK.loading(); load();
  function load() {
    Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/release"), CK.api("GET", "/api/auth/me").catch(function () { return {}; })])
      .then(function (r) { draw(r[0], r[1].user || null); }, function (e) { CK.error(e, "disbursement-queue.html"); });
  }
  function picker() {
    CK.loading();
    CK.api("GET", "/api/disbursements").then(function (d) {
      var L = d.shelf || [];
      CK.render([CK.head({ crumbs: [["Disbursement queue", "disbursement-queue.html"], ["Release"]], title: "Release the loan", sub: "Choose an accepted loan whose signed agreement is on file." }),
        CK.card("Waiting for release", L.length ? h("div.ck-picklist", L.map(function (a) {
          return h("a.ck-pick", { href: "release-loan.html?ref=" + a.reference }, CK.av(a.borrower, 34), h("div.grow", h("b", a.borrower), h("small", a.reference + " · " + a.product + " · net " + P(a.net))), a.ready ? CK.pill("Ready", "green") : CK.pill("Agreement not signed", "amber"), CK.ic("next")); }))
          : CK.empty("Nothing to release", "Accepted loans show here once their signed agreement is locked.", "check"), { icon: "bank" })]);
    }, function (e) { CK.error(e, "disbursement-queue.html"); });
  }

  function draw(R, ME) {
    var AMT = R.amount, N = R.term, FEE = R.feeRate, fee = R.fee, NET = R.net, PAY = R.payment, BORR = R.borrower;
    var CH = { pn: ["PESONet", "Bank transfer to her own account. Same-day if sent before the 3:00 PM run.", "bank"], ip: ["InstaPay", NET > 50000 ? "Carries up to ₱ 50,000. This is more." : "Instant bank transfer, up to ₱ 50,000.", "send"],
      cq: ["Cheque", "She collects it at the branch with her ID.", "doc"], ca: ["Cash", NET > 100000 ? "Paid at the counter, up to ₱ 100,000. This is more." : "Paid at the counter, up to ₱ 100,000.", "wallet"] };
    var OFF = { ip: NET > 50000, ca: NET > 100000 };
    var crumbs = [["Disbursement queue", "disbursement-queue.html"], [R.reference, "application-detail.html?ref=" + R.reference], ["Release"]];
    var sub = BORR + " · " + R.product + " · " + P(AMT) + " over " + N + " months";

    /* ---- the side: the money, the agreement, the borrower ---- */
    var netDd = h("dd.ck-big", P(NET));
    var money = CK.card("Net proceeds", [h("dl.ck-dl.rows", h("div", h("dt", "Approved amount"), h("dd", P(AMT))), h("div.neg", h("dt", "Less: processing charge, " + Math.round(FEE * 1000) / 10 + "%"), h("dd", "− " + P(fee))), h("div.tot", h("dt", "Net proceeds to release"), netDd)),
      null], { icon: "peso" });
    var sf = R.signedFile;
    var agree = CK.card("Signed agreement", [CK.dl([["Status", R.agreementLocked ? CK.pill("Locked", "green") : CK.pill("Not on file", "red")], ["Signed by her", R.signedOn ? CK.date(R.signedOn) : "–"], ["Locked by", R.lockedBy ? R.lockedBy + ", " + CK.dt(R.lockedAt) : "–"],
        ["Fingerprint", sf && sf.sha256 ? h("span.ck-seal", sf.sha256.slice(0, 24) + "…") : "–"]], "one"),
      sf ? h("div.ck-actions", h("a.ck-btn.ck-ghost.ck-sm", { href: "/api/applications/" + R.reference + "/documents/" + sf.id, target: "_blank" }, CK.ic("eye"), h("span", "Open the signed copy")), CK.btn("Agreement", { kind: "ghost", icon: "file", href: "loan-agreement.html?ref=" + R.reference })) : null], { icon: "lock" });
    var who = CK.card("Borrower", [h("div.ck-who", CK.av(BORR, 40), h("div", h("b", BORR), h("small", R.reference))), CK.dl([["ID on file", R.idType || "–"], ["Mobile", R.mobile], ["Address", R.address], ["Sales agent", R.agent || "Walk-in"], ["Encoded by", R.encodedBy]], "one")], { icon: "user" });

    /* ---- already released ---- */
    if (R.released) { var X = R.released, ac = ["Loan account " + X.account + " is open", "Balance " + P(AMT) + ". " + N + " payments of about " + P(PAY) + "; the schedule was generated from the release date."];
      var paidTo = X.payee ? [X.payee.name, X.payee.bank, X.payee.account, X.payee.cheque ? "cheque no. " + X.payee.cheque : ""].filter(Boolean).join(" · ") : BORR;
      var vrows = [["Amount", P(X.net)], ["Reference", X.reference], ["Channel", X.channel], ["Paid to", paidTo], ["Released", CK.dt(X.at)], ["Released by", X.by], ["Second factor", "passed"], ["Loan account", X.account]];
      CK.render([CK.head({ crumbs: crumbs, title: "Released", status: CK.status("funded"), sub: sub,
          actions: [CK.btn("Back to the queue", { kind: "ghost", icon: "back", href: "disbursement-queue.html" }), CK.btn("Open the loan account", { kind: "primary", icon: "next", href: "loan-account.html?no=" + X.account })] }),
        h("div.ck-grid.side2",
          h("div.ck-stack",
            CK.card(null, h("div.ck-outcome", h("span.ck-tile", CK.ic("check")), h("div", h("b", ac[0]), h("p", ac[1]), h("p", "Reference " + X.reference + ". The account is now with the loan account officers.")))),
            CK.card("Disbursement voucher", [CK.dl(vrows, "rows"), h("div.ck-actions", CK.btn("Print voucher", { kind: "soft", icon: "download", on: function () { printVoucher("Disbursement voucher", "GR8 Lending Company · " + R.reference + " · " + BORR, vrows); } }))], { icon: "file", tools: CK.pill("Funded", "green") })),
          h("div.ck-stack", money, agree, who))]); return; }

    /* ---- the three checks ---- */
    var S = { ch: "pn", chq: "", one: 0, idok: false, nameok: false, bank: "", acct: "", acct2: "", two: 0 };
    var bank = function () { return S.ch === "pn" || S.ch === "ip"; };
    function to() { return S.ch === "cq" ? BORR + ", by cheque no. " + digits(S.chq) + " at the branch" : S.ch === "ca" ? BORR + ", in cash at the counter" : BORR + ", " + S.bank + " •••• " + digits(S.acct).slice(-4); }
    function e1() { return S.ch === "cq" && digits(S.chq).length < 6 ? ["Enter the cheque number, at least 6 digits."] : []; }
    function e2() { var e = []; if (!S.idok) e.push("Confirm you are holding her original, valid ID.");
      if (bank()) { if (!S.nameok) e.push("Confirm the account is in her own name."); if (!S.bank.trim()) e.push("Enter the bank."); var d = digits(S.acct);
        if (d.length < 10 || d.length > 16) e.push("Type the account number from her passbook (10 to 16 digits)."); else if (digits(S.acct2) !== d) e.push("The number typed the second time does not match. Read the passbook again."); }
      return e; }
    function errBox(list) { var u = h("ul.ck-errs", { role: "alert" }); list.forEach(function (x) { u.appendChild(h("li", x)); }); return u; }
    function step(n, title, state, small, body) { return h("li.ck-fstep.is-" + state, h("span.ck-fdot", state === "done" ? CK.ic("check") : String(n)), h("div.ck-fbody", h("div.ck-fhead", h("b", title), small ? h("span.ck-sm", small) : null), body)); }
    var flow = h("ol.ck-flow"), checks = h("div.ck-tasks");
    function paintChecks() { checks.textContent = ""; [["Amount and channel confirmed", S.one ? P(NET) + " by " + CH[S.ch][0] : "Not yet"], ["Payout checked against her ID", S.two ? "By " + (ME ? ME.shortName : "you") + ", " + CK.dt(S.two) : "Not yet"], ["Released with your code", "Not yet"]].forEach(function (r, i) {
      var ok = i === 0 ? S.one : i === 1 ? S.two : 0; checks.appendChild(h("div.ck-task" + (ok ? ".done" : i === (S.one ? (S.two ? 2 : 1) : 0) ? ".open" : ""), h("span.n", ok ? CK.ic("check") : String(i + 1)), h("div.grow", h("b", r[0]), h("small", r[1])))); }); }

    function paint(focusSel) {
      flow.textContent = ""; paintChecks();
      if (!R.canRelease) { flow.appendChild(h("li", { style: { listStyle: "none" } }, CK.note(R.status !== "accepted" ? "Only an accepted application can be released (this one is " + (CK.ST[R.status] ? CK.ST[R.status][0].toLowerCase() : R.status) + ")." : !R.agreementLocked ? "The signed loan agreement is not on file yet. Nothing can be released." : "Only a disbursement officer releases money.", "amber", "lock"))); return; }
      /* 1: channel */
      var b1 = [];
      if (S.one) { b1.push(CK.dl([["Sent by", CH[S.ch][0]], ["Amount", P(NET)]], "rows"), h("div.ck-actions", CK.btn("Change the channel", { kind: "ghost", icon: "edit", on: function () { S.one = 0; S.two = 0; paint(); } }))); }
      else {
        var opts = h("div.ck-opts.four", { role: "radiogroup", "aria-label": "How the money is sent", style: { "--n": 2 } }, ["pn", "ip", "cq", "ca"].map(function (k) {
          var r = h("input", { type: "radio", name: "ckch", value: k, checked: S.ch === k, disabled: !!OFF[k], on: { change: function () { S.ch = k; paint("input[name=ckch]:checked"); } } });
          return h("label" + (OFF[k] ? ".is-off" : ""), r, h("span.ck-optic", CK.ic(CH[k][2])), h("span", h("b", CH[k][0]), h("small", CH[k][1]))); }));
        b1.push(opts);
        if (S.ch === "cq") { var ci = CK.input({ mode: "numeric", value: S.chq, max: 10, ph: "6 to 10 digits" }), fC = CK.field("Cheque number", ci, { req: true, hint: "From the cheque you are writing. Changing from her chosen channel is recorded." }); ci.id = "ckchq"; ci.addEventListener("input", function () { S.chq = ci.value; fC.setError(""); }); b1.push(fC); }
        var n = mnl(), s = n.getUTCHours() * 3600 + n.getUTCMinutes() * 60, wk = n.getUTCDay() >= 1 && n.getUTCDay() <= 5, inRun = wk && s < 15 * 3600, today = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
        var goes = S.ch === "cq" ? "Cheque ready at the counter today" : S.ch === "ca" ? "Paid at the counter today" : inRun ? "In today's 3:00 PM bank run" : "Today's run has left. The bank sends it on " + dstr(nextBank());
        b1.push(CK.dl([["Release date", dstr(today)], ["Goes out", goes], ["Monthly payment", P(PAY) + " × " + N], ["First payment due", dstr(addM(1))], ["Last payment due", dstr(addM(N))]], "rows"));
        b1.push(h("div.ck-actions", CK.btn("Confirm amount and channel", { kind: "green", icon: "check", on: function () { var e = e1(); if (e.length) { fC.setError(e[0]); ci.focus(); CK.toast("Not yet. " + e[0], "red"); return; }
          S.one = Date.now(); CK.toast(P(NET) + " by " + CH[S.ch][0] + " confirmed."); paint(); } })));
      }
      flow.appendChild(step(1, "Count it out", S.one ? "done" : "now", S.one ? "done" : "", b1));
      /* 2: who gets paid */
      var b2 = [];
      if (!S.one) b2.push(h("p", "Opens once the amount and channel are confirmed."));
      else if (S.two) { b2.push(CK.dl([["Paid to", BORR], ["Account", bank() ? S.bank + " •••• " + digits(S.acct).slice(-4) : "none (" + CH[S.ch][0].toLowerCase() + ")"], ["ID seen", R.idType || "government ID"], ["Verified by", (ME ? ME.shortName : "you") + ", " + CK.dt(S.two)]], "rows"),
          h("div.ck-actions", CK.btn("Check again", { kind: "ghost", icon: "edit", on: function () { S.two = 0; paint(); } }))); }
      else {
        b2.push(h("p", bank() ? "Money goes only to an account in her own name. Have her original ID and her passbook in your hands, and type the account number from the passbook twice." : "Have her original ID in your hands. The " + CH[S.ch][0].toLowerCase() + " is handed only to her."));
        var idc = CK.check("I am holding her original ID (" + (R.idType || "government ID") + "). It is valid and the photo is her.", S.idok); idc.querySelector("input").addEventListener("change", function () { S.idok = this.checked; }); b2.push(idc);
        if (bank()) {
          var nc = CK.check("The account is in her own name, not a business or another person.", S.nameok); nc.querySelector("input").addEventListener("change", function () { S.nameok = this.checked; }); b2.push(nc);
          var bi = CK.input({ value: S.bank, ph: "BDO, Landbank…" }); bi.addEventListener("input", function () { S.bank = bi.value; });
          var a1 = CK.input({ mode: "numeric", value: S.acct, max: 24 }); a1.addEventListener("input", function () { S.acct = a1.value; });
          var a2 = CK.input({ mode: "numeric", value: S.acct2, max: 24 }); a2.addEventListener("input", function () { S.acct2 = a2.value; }); a2.addEventListener("paste", function (e) { e.preventDefault(); CK.toast("Type it again from the passbook; pasting is turned off here.", "blue"); });
          b2.push(h("div.ck-form", { style: { "--cols": 1 } }, CK.field("Bank", bi, { req: true, hint: "As printed on the passbook, for example BDO or Landbank." }), CK.field("Account number, from the passbook", a1, { req: true }),
            CK.field("Type it again", a2, { req: true, hint: "Typed again, not copied, so a wrong digit is caught before money moves." })));
        }
        var eb = h("div"); b2.push(eb);
        b2.push(h("div.ck-actions", CK.btn("Mark payout details as verified", { kind: "green", icon: "shield", on: function () { var e = e2(); eb.textContent = ""; if (e.length) { eb.appendChild(errBox(e)); CK.toast("Not yet. " + e[0], "red"); return; }
          S.two = Date.now(); CK.toast("Payout details verified against her ID."); paint(); } })));
      }
      flow.appendChild(step(2, "Check who gets paid", !S.one ? "wait" : S.two ? "done" : "now", S.two ? "done" : "", b2));
      /* 3: release */
      var b3 = [];
      if (!S.two) b3.push(h("p", "Opens once the payout details are verified."));
      else {
        b3.push(h("p", "Release ", h("b", P(NET)), " to " + to() + (S.ch === "pn" ? ", by PESONet." : ".")));
        var cf = CK.codeField(), ci3 = cf.querySelector("input"); cf.querySelector(".ck-hint").textContent = "Asked every time money is released, even if you are signed in.";
        ci3.addEventListener("input", function () { cf.setError(""); });
        var go = CK.btn("Release " + P(NET), { kind: "primary", icon: "key", on: function () {
          if (digits(ci3.value).length !== 6) { cf.setError("Enter the six-digit code first."); ci3.focus(); return; }
          CK.modal({ title: "Release " + P(NET) + "?", body: [CK.dl([["Paid to", to()], ["Sent by", CH[S.ch][0]], ["Approved amount", P(AMT)], ["Processing charge", "− " + P(fee)], ["Net proceeds", P(NET)]], "rows"),
              CK.note("Once the bank accepts it, it cannot be called back from here. The loan account opens and its schedule starts from today.", "amber", "alert")],
            actions: [["Go back", "ghost"], ["Release the money", "primary", function (close, b, err) { CK.busy(b, true);
              CK.api("POST", "/api/applications/" + R.reference + "/release", { channel: S.ch, bank: S.bank, accountName: BORR, accountNo: S.acct, accountNoAgain: S.acct2, idChecked: S.idok, nameMatches: S.nameok, reference: S.chq, code: digits(ci3.value) })
                .then(function (r) { close(); CK.toast("Released. " + R.reference + " is Funded and loan account " + r.account + " is open."); load(); },
                  function (e) { CK.busy(b, false); if (e.status === 401 && !/code/i.test(e.message)) return; err(e.message + " Nothing was released.");
                    if (/code/i.test(e.message)) { ci3.value = ""; cf.setError(e.message); } }); }]] }); } });
        b3.push(cf, h("div.ck-actions", go));
      }
      flow.appendChild(step(3, "Turn the key", !S.two ? "wait" : "now", "", b3));
      CK.stagger(flow);
      if (focusSel) { var f = flow.querySelector(focusSel); if (f) f.focus(); }
    }

    CK.render([CK.head({ crumbs: crumbs, title: "Release the loan", status: CK.pill(R.canRelease ? "Awaiting release" : CK.ST[R.status] ? CK.ST[R.status][0] : R.status, R.canRelease ? "amber" : "grey"), sub: sub,
        actions: [CK.btn("Back to the queue", { kind: "ghost", icon: "back", href: "disbursement-queue.html" })] }),
      h("div.ck-grid.side2",
        h("div.ck-stack", CK.card("Three checks before money moves", flow, { icon: "shield" })),
        h("div.ck-stack", money, CK.card("Where it stands", checks, { icon: "list" }), agree, who))]);
    paint();
    /* the net proceeds count up once, as the page settles */
    if (!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) { var t0 = performance.now() + 300; (function up(t) { var p = Math.max(0, Math.min(1, (t - t0) / 900)); netDd.textContent = P(NET * (1 - Math.pow(1 - p, 3))); if (p < 1 && netDd.isConnected) requestAnimationFrame(up); else netDd.textContent = P(NET); })(performance.now()); }
  }
})();
