/* One loan account, classic: where it stands, the schedule, every payment, and the papers. */
(function () {
  var h = CK.h, no = CK.q("no") || CK.q("ref"); if (!no) return;
  function load() { CK.api("GET", "/api/loan-accounts/" + no).then(draw, function (e) { CK.error(e, "loan-accounts.html"); }); }
  CK.loading(); load();
  function draw(a) {
    var today = a.today, paid = 0;
    var rows = a.schedule.map(function (s) { var due = s.principal + s.interest, got = s.paidPrincipal + s.paidInterest, st = got >= due - .005 ? "paid" : s.dueOn < today ? "over" : got > 0 ? "part" : "next"; if (st === "paid") paid++; return Object.assign({ due: due, got: got, st: st }, s); });
    var payIt = a.canPost && !a.closed ? CK.btn("Post a payment", { kind: "primary", icon: "peso", on: function () {
      var m = CK.modal({ title: "Post a payment · " + a.number, wide: true, body: CK.paymentForm(a, a.channels, function (r) { m.close(); CK.toast("Payment posted. Receipt " + (r.receipt || r.payment && r.payment.receipt || "") + "."); load(); }) }); } }) : null;
    var stand = a.closed ? CK.pill("Fully paid", "grey") : a.daysPastDue ? CK.pill(a.daysPastDue + " days past due", a.daysPastDue > 30 ? "red" : "amber") : CK.pill("Current", "green");
    var schedT = CK.table([
      { k: "n", label: "No.", w: "60px", render: function (s) { return h("span.ck-strong", String(s.n)); } },
      { k: "dueOn", label: "Due", render: function (s) { return CK.date(s.dueOn); } },
      { k: "principal", label: "Principal", align: "right", render: function (s) { return CK.peso(s.principal, true); } },
      { k: "interest", label: "Interest", align: "right", render: function (s) { return CK.peso(s.interest, true); } },
      { k: "due", label: "Amount due", align: "right", render: function (s) { return h("span.ck-strong", CK.peso(s.due, true)); } },
      { k: "st", label: "", align: "right", render: function (s) { return s.st === "paid" ? CK.pill("Paid", "green") : s.st === "over" ? CK.pill("Overdue", "red") : s.st === "part" ? CK.pill("Part paid", "amber") : CK.pill("Upcoming", "grey"); } }
    ], rows, { page: 12 });
    var payT = CK.table([
      { k: "receipt", label: "Receipt", render: function (p) { return h("div", h("span.ck-strong", p.receipt), h("small.ck-sm", p.reverses ? "reverses " + p.reverses : p.reference || "")); } },
      { k: "paidOn", label: "Paid", render: function (p) { return CK.date(p.paidOn); } },
      { k: "channel", label: "How", render: function (p) { return p.channel; } },
      { k: "amount", label: "Amount", align: "right", render: function (p) { return h("span.ck-strong" + (p.amount < 0 ? ".ck-late" : ""), CK.peso(p.amount, true)); } },
      { k: "by", label: "Posted by", render: function (p) { return h("span.ck-sm", p.by + (p.reason ? " · " + p.reason : "")); } },
      { k: "x", label: "", align: "right", render: function (p) { if (p.reversedBy) return CK.pill("Reversed", "grey"); if (p.amount < 0 || !a.canReverse) return null; return CK.btn("Reverse", { kind: "danger", on: function () { reverse(p); } }); } }
    ], a.payments.slice().reverse(), { empty: "No payment yet." });
    function reverse(p) { var why = CK.select([["", "Choose a reason…"], "Posted twice", "Posted to the wrong account", "Wrong amount typed", "The payment bounced or was returned", "Another reason"].map(function (x) { return Array.isArray(x) ? x : [x, x]; }), ""), more = CK.textarea("", "What happened, in a few words");
      var f1 = CK.field("Reason", why, { req: true }), f2 = CK.field("Details", more);
      CK.modal({ title: "Reverse receipt " + p.receipt, body: [CK.note("A payment is never edited or deleted. A reversal entry of " + CK.peso(-p.amount, true) + " is added and both stay on the record.", "amber"), f1, f2],
        actions: [["Cancel", "ghost"], ["Reverse the payment", "danger", function (close, b, err) { if (!why.value) { f1.setError("Choose a reason."); return; } var reason = why.value + (more.value.trim() ? ": " + more.value.trim() : ""); if (reason.length < 10) { f2.setError("Say a little more (at least 10 characters)."); return; }
          CK.busy(b, true); CK.api("POST", "/api/loan-accounts/" + a.number + "/payments/" + p.receipt + "/reverse", { reason: reason }).then(function () { close(); CK.toast("Reversed. The account is back as it was before " + p.receipt + "."); load(); }, function (e) { CK.busy(b, false); err(e.message); }); }]] }); }
    var papers = h("div.ck-tasks");
    function paperRow(t, d, label, path) { var b = CK.btn(label, { kind: "soft", icon: "download" }); b.addEventListener("click", function () { CK.paper(path, b, t).then(function () { if (/clearance/.test(path)) load(); }, function () {}); }); papers.appendChild(h("div.ck-task", h("span.n", CK.ic("file")), h("div.grow", h("b", t), h("small", d)), b)); }
    paperRow("Payment schedule", "All " + a.term + " payments and their due dates.", "Print", "/api/loan-accounts/" + a.number + "/schedule");
    if (!a.closed) paperRow("Statement of account", "What she has paid and what she owes, as of today.", "Print", "/api/loan-accounts/" + a.number + "/statement");
    if (a.closed) paperRow("Clearance", "Paid in full. Issued once, with its own number.", "Issue", "/api/loan-accounts/" + a.number + "/clearance");
    var r = a.release || {};
    CK.render([
      CK.head({ crumbs: [["Loan accounts", "loan-accounts.html"], [a.number]], title: a.borrower, status: stand, sub: a.product + " · " + a.number + " · from " + a.reference + " · released " + CK.date(a.releasedOn), actions: [CK.btn("Application", { kind: "ghost", icon: "doc", href: "application-detail.html?ref=" + a.reference }), payIt] }),
      h("div.ck-stats.ck-in", { style: { "--cols": 4 } },
        CK.stat("Principal left", CK.peso(a.principalLeft), { icon: "wallet", tone: "brand", sub: "of " + CK.peso(a.principal) }),
        CK.stat("Next payment", a.closed ? "–" : a.next ? CK.peso(a.next.amount, true) : "–", { icon: "cal", tone: "blue", sub: a.next && !a.closed ? "due " + CK.date(a.next.dueOn) : "" }),
        CK.stat("Overdue", CK.peso(a.overdue, true), { icon: "alert", tone: a.overdue ? "red" : "green", sub: a.penalty ? "plus " + CK.peso(a.penalty, true) + " penalty" : "no penalty" }),
        CK.stat("Paid so far", paid + " of " + a.term, { icon: "check", tone: "green", sub: Math.round(paid / a.term * 100) + "% of the schedule" })),
      h("div.ck-grid.side",
        h("div.ck-stack", CK.card("Payment schedule", [CK.meter(paid, a.term, "green"), schedT], { icon: "cal" }), CK.card("Payments received", payT, { icon: "peso" })),
        h("div.ck-stack",
          CK.card("The loan", CK.dl([["Principal", CK.peso(a.principal)], ["Term", a.term + " months"], ["Interest", (a.rate * 100).toFixed(2).replace(/\.?0+$/, "") + "% a month, " + (a.method === "flat" ? "flat" : "diminishing")], ["Each month", CK.peso(a.payment, true)], ["Late penalty", (a.penaltyRate * 100) + "% a month on what is overdue"], ["Sales agent", a.agent]], "one"), { icon: "info" }),
          CK.card("Released", CK.dl([["Net to her", CK.peso(r.net, true)], ["How", (r.channel || "–") + (r.reference ? " · " + r.reference : "")], ["To", r.payee ? r.payee.bank + " " + r.payee.account : "–"], ["By", r.by ? r.by + ", " + CK.dt(r.at) : "–"]], "one"), { icon: "bank" }),
          CK.card("Borrower", CK.dl([["Mobile", a.mobile], ["Address", a.address]], "one"), { icon: "user" }),
          CK.card("Papers", papers, { icon: "file" })))
    ]);
  }
})();
