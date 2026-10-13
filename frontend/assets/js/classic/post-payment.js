/* Post a payment, classic: find the account, see what she owes, enter the money; CALMS shows where every peso goes before you post. */
(function () {
  var h = CK.h; CK.loading();
  CK.api("GET", "/api/loan-accounts").then(function (d) {
    var A = d.accounts.filter(function (a) { return !a.closed; }), q = "", sel = null, posted = [];
    var listBox = h("div.ck-picklist"), formBox = h("div.ck-stack"), doneBox = h("div");
    function list() { listBox.textContent = ""; var L = A.filter(function (a) { return !q || (a.number + " " + a.borrower + " " + a.reference).toLowerCase().indexOf(q) >= 0; }).slice(0, 40);
      if (!L.length) listBox.appendChild(CK.empty("No open account matches", "Try the borrower's surname or the LN number.", "search"));
      L.forEach(function (a) { var b = h("button.ck-pick" + (sel && sel.number === a.number ? ".is-sel" : ""), { type: "button", on: { click: function () { pick(a.number); } } }, CK.av(a.borrower, 34), h("div.grow", h("b", a.borrower), h("small", a.number + " · " + (a.next ? "next " + CK.peso(a.next.amount, true) + " on " + CK.date(a.next.dueOn) : ""))), a.daysPastDue ? CK.pill(a.daysPastDue + "d late", "red") : CK.pill("Current", "green")); listBox.appendChild(b); }); }
    function pick(no) { formBox.textContent = ""; formBox.appendChild(h("div.ck-card", CK.skel(5)));
      CK.api("GET", "/api/loan-accounts/" + no).then(function (a) { sel = a; list(); formBox.textContent = "";
        if (!a.canPost) { formBox.appendChild(CK.card(null, CK.note("Your role can see accounts but not post payments.", "amber"))); return; }
        formBox.appendChild(h("div.ck-card.ck-panelin", h("div.ck-cardhead", h("h2", CK.ic("user"), a.borrower), h("a.ck-btn.ck-ghost.ck-sm", { href: "loan-account.html?no=" + a.number }, "Open the account")),
          h("div.ck-cardbody", CK.dl([["Account", a.number], ["Next due", a.next ? CK.peso(a.next.amount, true) + " on " + CK.date(a.next.dueOn) : "–"], ["Overdue", CK.peso(a.overdue, true)], ["Penalty", CK.peso(a.penalty, true)]]),
            h("div.ck-divider"), CK.paymentForm(a, a.channels, function (r) { posted.unshift({ a: a, r: r, at: new Date() }); if (!r.queued) CK.toast("Posted to " + a.number + ". Receipt " + (r.receipt || "") + "."); drawDone(); pick(a.number); }))));
      }, CK.fail); }
    function drawDone() { doneBox.textContent = ""; if (!posted.length) return; doneBox.appendChild(CK.card(posted.some(function (p) { return p.r.queued; }) ? "Posted and saved just now" : "Posted just now", h("ul.ck-list", posted.map(function (p) { return h("li", h("span.ck-filetile", CK.ic("check")), h("div.grow", h("b.ck-strong", p.a.borrower), h("small.ck-sm", p.a.number + " · receipt " + (p.r.receipt || "") + " · " + CK.dt(p.at))), CK.btn("Account", { kind: "ghost", href: "loan-account.html?no=" + p.a.number })); })), { icon: "check" })); }
    CK.render([CK.head({ crumbs: [["Loan accounts", "loan-accounts.html"], ["Post a payment"]], title: "Post a payment", sub: "Find the account, enter what came in. A mistake is fixed with a reversal on the account page, never an edit." }),
      h("div.ck-split", CK.card("Find the account", [CK.search("Name, LN or APP number", function (v) { q = v; list(); }), listBox], { icon: "search" }),
        h("div.ck-stack.ck-sticky", formBox, doneBox))]);
    formBox.appendChild(CK.card(null, CK.empty("Choose an account", "Pick one on the left to see what she owes and post her payment.", "wallet")));
    list(); var pre = CK.q("ref"); if (pre) pick(pre);
  }, function (e) { CK.error(e); });
})();
