/* Loan agreement, classic: the three papers she signs, the disclosure handed over first, then the signed copy uploaded and locked. */
(function () {
  var h = CK.h, ref = CK.q("ref");
  function unhide() { document.documentElement.classList.add("ck-ownpick"); document.body.classList.remove("calms-down"); var s = document.getElementById("calmsHideCss"); if (s) s.remove(); }
  function P(n) { return CK.peso(n, true); }
  function day(s) { return s ? new Date(s + "T00:00:00").toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" }) : "–"; }
  function iso(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function kb(n) { return Math.max(1, Math.round(n / 1024)) + " KB"; }
  /* print what is on screen: the paper nodes are copied into a bare print frame */
  var PCSS = "@page{size:A4;margin:16mm 14mm}body{font:10.5pt/1.55 Georgia,'Times New Roman',serif;color:#111;margin:0}h2{font-size:15pt;text-align:center;margin:0;text-transform:uppercase;letter-spacing:.05em}.c{text-align:center;font-size:9pt;color:#444;margin:3px 0 14px}" +
    "h3{font-size:11pt;margin:14px 0 4px}p{margin:0 0 6px}table{width:100%;border-collapse:collapse;font-size:9.5pt;margin:6px 0 10px}th,td{border:1px solid #aaa;padding:3px 6px;text-align:left}th{background:#eee}.n{text-align:right}tr.tot td{font-weight:bold}" +
    ".sg{display:flex;gap:30px;margin-top:44px}.sg div{flex:1;border-top:1px solid #222;padding-top:4px;font-size:9pt}.esig{margin-top:18px;font-size:9pt;color:#333}.ck-lockband{font-size:9pt;color:#23603d;margin-bottom:10px}.ck-ic{display:none}.pb{page-break-before:always}";
  function printNodes(nodes, title) { var f = h("iframe", { "aria-hidden": "true", style: { position: "fixed", width: "0", height: "0", border: "0", right: "0", bottom: "0" } }); document.body.appendChild(f);
    var d = f.contentDocument; d.open(); d.write("<!doctype html><html><head><meta charset=utf-8><title></title><style>" + PCSS + "</style></head><body></body></html>"); d.close(); d.title = title;
    nodes.forEach(function (n, i) { var c = d.importNode(n, true); if (i) c.className = (c.className ? c.className + " " : "") + "pb"; c.removeAttribute("style"); d.body.appendChild(c); });
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 60000); }, 60); }

  if (!ref) { unhide(); picker(); return; }
  CK.loading(); load();
  function load() {
    Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/agreement"), CK.api("GET", "/api/auth/me").catch(function () { return {}; })])
      .then(function (r) { draw(r[0], r[1].user || null); }, function (e) { CK.error(e, "application-detail.html?ref=" + ref); });
  }
  function picker() {
    CK.loading();
    CK.api("GET", "/api/applications").then(function (d) {
      var L = d.applications.filter(function (a) { return a.status === "approved" || a.status === "accepted"; });
      CK.render([CK.head({ crumbs: [["Applications", "applications.html"], ["Loan agreement"]], title: "Loan agreement", sub: "Choose an approved or accepted application to prepare its papers." }),
        CK.card("Ready for papers", L.length ? h("div.ck-picklist", L.map(function (a) {
          return h("a.ck-pick", { href: "loan-agreement.html?ref=" + a.reference }, CK.av(a.borrower, 34), h("div.grow", h("b", a.borrower), h("small", a.reference + " · " + a.product + " · " + CK.peso(a.amount))), CK.status(a.status), CK.ic("next")); }))
          : CK.empty("Nothing to prepare", "Applications show here once they are approved or the borrower accepts an offer.", "check"), { icon: "file" })]);
    }, function (e) { CK.error(e, "applications.html"); });
  }

  function draw(G, ME) {
    var AMT = G.amount, N = G.term, RATE = G.rate, RT = Math.round(RATE * 10000) / 100, METHOD = G.method, fee = G.fee, net = G.net, m = G.payment, interest = G.interest, total = AMT + interest, fin = interest + fee;
    var PEN = Math.round(G.penalty * 1000) / 10, BORR = G.borrower, GEN = G.generatedAt ? new Date(G.generatedAt).getTime() : Date.now();
    /* effective rate: the monthly rate at which the payments are worth exactly what she receives */
    var lo = 0, hi = 1; for (var i = 0; i < 80; i++) { var r = (lo + hi) / 2, pv = m * (1 - Math.pow(1 + r, -N)) / r; if (pv > net) lo = r; else hi = r; } var EM = (lo + hi) / 2, EA = Math.pow(1 + EM, 12) - 1;
    var locked = !!G.lockedAt, handed = !!G.disclosedOn, can = !!G.canWork;

    /* ---- the papers ---- */
    function band() { return locked ? h("div.ck-lockband", CK.ic("lock"), "Record copy · locked " + CK.dt(G.lockedAt) + " · cannot be changed") : null; }
    function agreement() { var H = function (t) { return h("h3", t); }, Pp = function (t) { return h("p", t); };
      return h("article.ck-doc", band(), h("h2", "Loan Agreement"), h("div.c", "GR8 Lending Company · Application " + G.reference + " · " + (G.generatedAt ? "generated " + CK.dt(G.generatedAt) : "not yet generated")),
        Pp("This agreement is between GR8 Lending Company (the Lender) and " + BORR + (G.address ? " of " + G.address : "") + " (the Borrower)."),
        H("1. The loan"), Pp("The Lender lends the Borrower " + P(AMT) + " as a " + G.product.toLowerCase().replace(/^sme/, "SME") + ". After the one-time processing charge of " + P(fee) + ", the Borrower receives " + P(net) + "."),
        H("2. Interest"), Pp("Interest is " + RT + "% each month " + (METHOD === "flat" ? "on the amount borrowed (the add-on method)" : "on the balance that remains unpaid (the diminishing balance method)") + ". Over the full term the interest comes to " + P(interest) + "."),
        H("3. How the loan is repaid"), Pp("The Borrower pays about " + P(m) + " each month for " + N + " months, " + P(total) + " in all. The first payment is due one month after the loan is released. The attached schedule lists every payment."),
        H("4. Late payment"), Pp("If a payment is late, a penalty of " + PEN + "% of the unpaid installment is added for each month or part of a month it stays unpaid."),
        H("5. Paying early"), Pp("The Borrower may pay the loan in full at any time."),
        H("6. Personal information"), Pp("The Borrower has given written consent for the Lender to check her credit record and to keep and use her personal information for this loan, as allowed by the Data Privacy Act of 2012."),
        H("7. Disclosure"), Pp("The Borrower confirms that she received and read the Disclosure Statement of charges before signing this agreement."),
        h("div.sg", [BORR + ", Borrower", "Date signed", "Witness (sales agent)"].map(function (x) { return h("div", x); })),
        h("div.esig", "For the Lender: approved and signed electronically by underwriting; the decision and its signature are on the application's record.")); }
    function disclosure() {
      var rows = [["Amount of the loan", P(AMT)], ["Less: processing charge, taken once at release", P(fee)], ["Amount you receive", P(net), 1], ["Interest over " + N + " months (" + RT + "% a month, " + METHOD + ")", P(interest)], ["Processing charge", P(fee)], ["Total finance charge", P(fin), 1],
        ["Monthly payment (about)", P(m)], ["Number of payments", String(N)], ["Total of all payments", P(total), 1], ["Effective interest rate, including the charge", (EM * 100).toFixed(2) + "% a month, " + (EA * 100).toFixed(2) + "% a year"], ["Penalty if a payment is late", PEN + "% of the unpaid installment for each month late"]];
      return h("article.ck-doc", band(), h("h2", "Disclosure Statement"), h("div.c", "of loan charges, given to the borrower before she signs · Application " + G.reference),
        h("p", "Borrower: " + BORR + ". This statement shows the full cost of the loan so you can decide before you sign."),
        h("table", h("tbody", rows.map(function (r) { return h("tr" + (r[2] ? ".tot" : ""), h("td", r[0]), h("td.n", r[1])); }))),
        h("p", "The effective rate is higher than " + RT + "% a month because the processing charge is taken out of the money you receive."),
        h("div.sg", ["Received and read by: " + BORR, "Date received"].map(function (x) { return h("div", x); }))); }
    function schedule() { var sp = 0, si = 0;
      var body = G.schedule.map(function (r) { sp += r.principal; si += r.interest; return h("tr", h("td", String(r.n)), h("td", CK.date(r.dueOn)), h("td.n", P(r.principal)), h("td.n", P(r.interest)), h("td.n", P(r.principal + r.interest)), h("td.n", P(r.balance))); });
      return h("article.ck-doc", band(), h("h2", "Amortization Schedule"), h("div.c", "Dates assume release today. They are fixed when the loan is actually released."),
        h("table", h("thead", h("tr", ["No.", "Due date", "Principal", "Interest", "Payment", "Balance after"].map(function (t, j) { return h("th" + (j > 1 ? ".n" : ""), t); }))),
          h("tbody", body, h("tr.tot", h("td"), h("td", "Total"), h("td.n", P(sp)), h("td.n", P(si)), h("td.n", P(sp + si)), h("td"))))); }
    function signed() { var f = G.signedFile;
      return h("div.ck-stack", { style: { gap: "16px" } }, h("div.ck-attach.on", h("span.ck-filetile", CK.ic("doc")), h("div.grow", h("b", f.name), h("small", "Signed by the borrower on " + day(G.signedOn) + " · locked " + CK.dt(G.lockedAt))),
        h("a.ck-btn.ck-ghost", { href: "/api/applications/" + G.reference + "/documents/" + f.id, target: "_blank" }, CK.ic("eye"), h("span", "Open"))),
        CK.dl([["Fingerprint (SHA-256)", h("span.ck-seal", f.sha256 || "–")]], "one")); }
    var TABS = [["agr", "Agreement", agreement], ["dis", "Disclosure statement", disclosure], ["sch", "Schedule", schedule]].concat(locked && G.signedFile ? [["rec", "Signed copy", signed]] : []);
    var tab = "agr", paperBox = h("div");
    function showTab() { paperBox.textContent = ""; paperBox.appendChild(TABS.filter(function (t) { return t[0] === tab; })[0][2]()); printOne.disabled = tab === "rec"; }
    var printOne = CK.btn("Print this paper", { kind: "ghost", icon: "download", on: function () { var t = TABS.filter(function (x) { return x[0] === tab; })[0]; printNodes([t[2]()], t[1] + " " + G.reference); } });
    function printAll() { printNodes([agreement(), disclosure(), schedule()], "Loan papers " + G.reference); CK.toast("The print window is open: agreement, disclosure statement and schedule.", "blue"); }
    var papers = CK.card("The papers", [CK.tabs(TABS.map(function (t) { return [t[0], t[1]]; }), tab, function (v) { tab = v; showTab(); }), paperBox], { icon: "file", tools: printOne });

    /* ---- the steps ---- */
    var S = { disc: G.disclosedOn || "", printed: handed, file: null, sign: "", all: false, tried2: false, tried3: false };
    function e2() { var E = []; if (!S.disc) E.push("Enter the date the disclosure statement was given to her."); else { var d = new Date(S.disc + "T00:00"); if (d > new Date()) E.push("That date is in the future."); else if (d.getTime() < GEN - 86400e3) E.push("That is before these papers were generated."); }
      if (!S.printed) E.push("Tick the box to confirm the agreement was printed for her."); return E; }
    function e3() { var E = []; if (!S.file) E.push("Attach the scan of the signed agreement."); if (!S.sign) E.push("Enter the date she signed."); else { var d = new Date(S.sign + "T00:00"); if (d > new Date()) E.push("The signing date is in the future."); else if (S.disc && S.sign < S.disc) E.push("She cannot have signed before the disclosure statement was given to her (" + day(S.disc) + ")."); }
      if (!S.all) E.push("Confirm that she signed in every place marked."); return E; }
    function errBox(list) { var u = h("ul.ck-errs", { role: "alert" }); list.forEach(function (x) { u.appendChild(h("li", x)); }); return u; }
    function step(n, title, state, small, body) { return h("li.ck-fstep.is-" + state, h("span.ck-fdot", state === "done" ? CK.ic("check") : String(n)), h("div.ck-fbody", h("div.ck-fhead", h("b", title), small ? h("span.ck-sm", small) : null), body)); }
    var readOnly = !can && !locked ? CK.note("Read only: only a loan processor prepares the agreement, after approval or acceptance.", "amber", "lock") : null;

    /* 1 */
    var s1 = step(1, "Papers generated", "done", "version 1", [h("p", "Loan agreement, disclosure statement and amortization schedule at the " + (G.status === "approved" ? "approved" : "accepted") + " terms: " + P(AMT) + " over " + N + " months." + (G.generatedAt ? " Generated " + CK.dt(G.generatedAt) + "." : ""))]);
    /* 2 */
    var b2 = [];
    if (handed) b2.push(h("p", "Disclosure statement given to her on " + day(G.disclosedOn) + ", before signing."));
    else if (!can) b2.push(h("p", "Waiting for the loan processor to hand the papers to her."));
    else { var di = CK.input({ type: "date", value: S.disc }); di.max = iso(new Date()); var fD = CK.field("Disclosure statement given to her on", di, { req: true });
      var pc = CK.check("The agreement and schedule were printed in two copies for her to sign.", S.printed), e2b = h("div");
      var mark = CK.btn("Mark as handed over", { kind: "green", icon: "check" });
      function chk2() { e2b.textContent = ""; fD.setError(""); if (!S.tried2) return; var E = e2(); if (E.length) { e2b.appendChild(errBox(E)); if (/date|future|before/.test(E[0])) fD.setError(" "); } }
      di.addEventListener("change", function () { S.disc = di.value; chk2(); }); pc.querySelector("input").addEventListener("change", function () { S.printed = this.checked; chk2(); });
      mark.addEventListener("click", function () { S.tried2 = true; chk2(); var E = e2(); if (E.length) { CK.toast("Not yet. " + E[0], "red"); return; }
        CK.busy(mark, true); CK.api("POST", "/api/applications/" + G.reference + "/agreement/disclosure", { disclosedOn: S.disc }).then(function (d) { CK.toast("Recorded. The signed copy can now be uploaded."); draw(d, ME); },
          function (e) { CK.busy(mark, false); if (e.status === 401) return; e2b.textContent = ""; e2b.appendChild(errBox([e.message])); }); });
      b2.push(h("p", "Print the three papers. The law requires that she gets the disclosure statement of charges before she signs anything."), h("div.ck-actions", CK.btn("Print all three", { kind: "soft", icon: "download", on: printAll })), fD, pc, e2b, h("div.ck-actions", mark)); }
    var s2 = step(2, "Handed to the borrower", handed ? "done" : can ? "now" : "wait", handed ? "done" : "", b2);

    /* 3 + 4 */
    var b3 = [], b4 = [], st3 = locked ? "done" : handed ? "now" : "wait", st4 = locked ? "done" : "wait";
    if (locked) { b3.push(h("p", (G.signedFile ? G.signedFile.name + ", " : "") + "signed " + day(G.signedOn) + "."));
      b4.push(CK.dl([["File", G.signedFile ? G.signedFile.name : "–"], ["Signed by her", day(G.signedOn)], ["Uploaded by", G.lockedBy || "–"], ["Locked", CK.dt(G.lockedAt)], ["Fingerprint", G.signedFile && G.signedFile.sha256 ? h("span.ck-seal", G.signedFile.sha256.slice(0, 32) + "…") : "–"]], "rows"),
        h("p", "The loan is now in the disbursement queue. This copy can be read, never replaced."), h("div.ck-actions", CK.btn("Open disbursement queue", { kind: "green", icon: "next", href: "disbursement-queue.html" }))); }
    else if (!handed) { b3.push(h("p", "Opens once the papers are recorded as handed to her.")); b4.push(h("p", "Finish step 2 first.")); }
    else if (!can) { b3.push(h("p", "Waiting for the loan processor to upload the signed copy.")); b4.push(h("p", "Finish step 3 first.")); }
    else {
      var fin = h("input", { type: "file", accept: ".pdf,image/jpeg,image/png", "aria-label": "Scan of the signed agreement" }), dT = h("b", "No scan yet"), dS = h("small", "Scan or photograph every signed page as one file. PDF, JPG or PNG, up to 10 MB."), pv = h("div", { style: { width: "100%" } }), fileErr = "";
      var pickB = CK.btn("Choose a file", { kind: "ghost", icon: "upload", on: function () { fin.click(); } });
      var drop = h("div.ck-attach", h("span.ck-filetile", CK.ic("upload")), h("div.grow", dT, dS), pickB, fin, pv), fF = CK.field("Scan of the signed agreement", drop, { req: true });
      var si = CK.input({ type: "date" }); si.max = iso(new Date()); si.min = S.disc; var fS = CK.field("Date she signed", si, { req: true });
      var ac = CK.check("She signed in every place marked, on the agreement and on the disclosure statement.", false), e3b = h("div");
      var lockB = CK.btn("Upload and lock", { kind: "primary", icon: "lock" });
      function chk3() { e3b.textContent = ""; fF.setError(fileErr); fS.setError(""); var E = e3();
        var dateE = E.filter(function (x) { return /before|future/.test(x); }); if (dateE.length) fS.setError(dateE[0]);
        if (S.tried3 && E.length) e3b.appendChild(errBox(E.filter(function (x) { return dateE.indexOf(x) < 0; })));
        s4.className = "ck-fstep is-" + (E.length ? "wait" : "now"); s3.className = "ck-fstep is-" + (E.length ? "now" : "done"); s3.querySelector(".ck-fdot").textContent = ""; s3.querySelector(".ck-fdot").appendChild(E.length ? document.createTextNode("3") : CK.ic("check")); }
      fin.addEventListener("change", function () { var x = fin.files[0]; fileErr = ""; if (!x) return; pv.textContent = "";
        if (!/\.(pdf|jpe?g|png)$/i.test(x.name)) { fileErr = "That file type is not accepted. Use a PDF, JPG or PNG."; fin.value = ""; chk3(); return; }
        if (x.size > 10 * 1048576) { fileErr = "That file is over 10 MB. Scan at a lower resolution."; fin.value = ""; chk3(); return; }
        S.file = x; drop.classList.add("on"); dT.textContent = x.name; dS.textContent = kb(x.size) + " attached. Choose again to replace it."; pickB.querySelector("span").textContent = "Replace";
        if (/^image\//.test(x.type)) pv.appendChild(h("img", { src: URL.createObjectURL(x), alt: "Scan of the signed loan agreement" })); chk3(); });
      si.addEventListener("change", function () { S.sign = si.value; chk3(); }); ac.querySelector("input").addEventListener("change", function () { S.all = this.checked; chk3(); });
      lockB.addEventListener("click", function () { S.tried3 = true; chk3(); var E = e3(); if (E.length) { CK.toast("Not yet. " + E[0], "red"); return; }
        CK.modal({ title: "Lock the signed copy?", body: [CK.dl([["File", S.file.name + ", " + kb(S.file.size)], ["Signed by her", day(S.sign)], ["Disclosure given", day(S.disc)]], "one"),
            CK.note("After this, nobody can replace or edit the signed copy. No loan is released without it.", "amber", "lock")],
          actions: [["Go back", "ghost"], ["Upload and lock", "primary", function (close, b, err) { CK.busy(b, true); var rd = new FileReader();
            rd.onerror = function () { CK.busy(b, false); err("The file could not be read. Choose it again."); };
            rd.onload = function () { CK.api("POST", "/api/applications/" + G.reference + "/agreement/signed", { signedOn: S.sign, allSigned: S.all, file: { name: S.file.name, data: String(rd.result).split(",")[1] || "" } })
              .then(function (d) { close(); CK.toast("Locked. The signed agreement is the record copy and the loan has entered the disbursement queue."); draw(d, ME); },
                function (e) { CK.busy(b, false); if (e.status === 401) return; err(e.message + " Nothing was locked."); }); };
            rd.readAsDataURL(S.file); }]] }); });
      b3.push(fF, fS, ac, e3b);
      b4.push(h("p", "After this, nobody can replace or edit the signed copy. No loan is released without it."), h("div.ck-actions", lockB));
    }
    var s3 = step(3, "Signed copy uploaded", st3, locked ? "done" : "", b3), s4 = step(4, "Locked as the record copy", st4, locked ? "done" : "", b4);

    var state = locked ? ["Signed and locked", "green"] : handed ? ["With the borrower", "blue"] : ["Generated", "amber"];
    CK.render([
      CK.head({ crumbs: [["Applications", "applications.html"], [G.reference, "application-detail.html?ref=" + G.reference], ["Loan agreement"]], title: "Loan agreement", status: CK.pill(state[0], state[1]),
        sub: BORR + " · " + G.product + " · " + P(AMT) + " over " + N + " months",
        actions: [CK.btn("Application", { kind: "ghost", icon: "doc", href: "application-detail.html?ref=" + G.reference }), locked ? CK.btn("Disbursement queue", { kind: "primary", icon: "next", href: "disbursement-queue.html" }) : CK.btn("Print all three", { kind: "primary", icon: "download", on: printAll })] }),
      h("div.ck-stats.ck-in", { style: { "--cols": 4 } },
        CK.stat("Loan amount", CK.peso(AMT), { icon: "peso", tone: "brand", sub: N + " months · " + RT + "% a month" }),
        CK.stat("She receives", CK.peso(net), { icon: "wallet", tone: "green", sub: "after the " + P(fee) + " charge" }),
        CK.stat("Each month", CK.peso(m, true), { icon: "cal", tone: "blue", sub: P(total) + " in all" }),
        CK.stat("Disbursement", locked ? "Open" : "Held", { icon: locked ? "check" : "lock", tone: locked ? "green" : "amber", sub: locked ? "signed " + day(G.signedOn) : "until the signed copy is locked" })),
      h("div.ck-grid.side2", h("div.ck-stack", papers), h("div.ck-stack", CK.card("Getting it signed", [readOnly, h("ol.ck-flow", s1, s2, s3, s4)], { icon: "edit" })))
    ]);
    showTab();
  }
})();
