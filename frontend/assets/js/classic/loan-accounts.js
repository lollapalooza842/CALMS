/* Loan accounts, classic: the money out, how it is ageing, what falls due this week, and every account in one table. */
(function () {
  var h = CK.h; CK.loading();
  CK.api("GET", "/api/loan-accounts").then(function (d) {
    var A = d.accounts, open = A.filter(function (a) { return !a.closed; }), today = new Date(d.today + "T00:00:00"), bucket = "", q = "", day = null;
    var BK = [["current", "Current", "#2f7a4f"], ["1-30", "1 to 30 days", "#c9821b"], ["31-60", "31 to 60 days", "#c2581e"], ["61-90", "61 to 90 days", "#b3261a"], ["90+", "Over 90 days", "#6e1a12"], ["closed", "Fully paid", "#9a8b7e"]];
    function bk(a) { return a.closed ? "closed" : a.bucket; }
    var out = open.reduce(function (s, a) { return s + a.principalLeft; }, 0), pastDue = open.filter(function (a) { return a.daysPastDue > 0; }), atRisk = open.filter(function (a) { return a.daysPastDue > 30; }).reduce(function (s, a) { return s + a.principalLeft; }, 0);
    var week = []; for (var i = 0; i < 7; i++) { var dd = new Date(today); dd.setDate(today.getDate() + i); week.push(dd); }
    function ymd(x) { return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); }
    var dueWeek = open.filter(function (a) { return a.next && a.next.dueOn >= ymd(week[0]) && a.next.dueOn <= ymd(week[6]); });
    var aging = h("div.ck-aging", BK.map(function (b) { var l = A.filter(function (a) { return bk(a) === b[0]; }), amt = l.reduce(function (s, a) { return s + (a.closed ? 0 : a.principalLeft); }, 0);
      var btn = h("button.ck-agecol", { type: "button", "aria-pressed": "false", style: { "--a": b[2] }, on: { click: function () { bucket = bucket === b[0] ? "" : b[0]; day = null; [].forEach.call(aging.children, function (c) { c.setAttribute("aria-pressed", String(c === btn && !!bucket)); }); [].forEach.call(cal.children, function (c) { c.setAttribute("aria-pressed", "false"); }); apply(); } } },
        h("span.lbl", b[1]), h("b", String(l.length)), h("small", b[0] === "closed" ? "closed" : CK.peso(amt)), h("i", { style: { width: (out ? amt / out * 100 : 0) + "%" } })); return btn; }));
    var cal = h("div.ck-week", week.map(function (dd, i) { var key = ymd(dd), l = dueWeek.filter(function (a) { return a.next.dueOn === key; }), amt = l.reduce(function (s, a) { return s + a.next.amount; }, 0);
      var b = h("button.ck-daybox" + (l.length ? ".has" : ""), { type: "button", "aria-pressed": "false", on: { click: function () { day = day === key ? null : key; bucket = ""; [].forEach.call(cal.children, function (c) { c.setAttribute("aria-pressed", String(c === b && !!day)); }); [].forEach.call(aging.children, function (c) { c.setAttribute("aria-pressed", "false"); }); apply(); } } },
        h("span.dw", i === 0 ? "Today" : dd.toLocaleDateString("en-PH", { weekday: "short" })), h("b", String(dd.getDate())), h("small", l.length ? l.length + " due · " + CK.peso(amt) : "none due")); return b; }));
    var tbl = CK.table([
      { k: "borrower", label: "Account", sort: true, render: function (a) { return h("div.ck-who", CK.av(a.borrower), h("div", h("b", a.borrower), h("small", a.number + " · " + a.product))); } },
      { k: "principalLeft", label: "Principal left", sort: true, desc: true, align: "right", render: function (a) { return h("div", h("span.ck-strong", CK.peso(a.principalLeft)), h("small.ck-sm", "of " + CK.peso(a.principal))); } },
      { k: "next", label: "Next due", sort: function (a) { return a.next ? a.next.dueOn : "9"; }, render: function (a) { return a.closed ? h("span.ck-sm", "Paid in full") : a.next ? h("div", h("span.ck-strong", CK.date(a.next.dueOn)), h("small.ck-sm", CK.peso(a.next.amount, true))) : "–"; } },
      { k: "paid", label: "Progress", sort: function (a) { return a.paidCount / a.term; }, render: function (a) { return h("div.ck-prog", CK.meter(a.paidCount, a.term, a.closed ? "green" : a.daysPastDue ? "amber" : "green"), h("small.ck-sm", a.paidCount + " of " + a.term + " paid")); } },
      { k: "daysPastDue", label: "Standing", sort: true, desc: true, render: function (a) { return a.closed ? CK.pill("Fully paid", "grey") : a.daysPastDue ? CK.pill(a.daysPastDue + " days past due", a.daysPastDue > 30 ? "red" : "amber") : CK.pill("Current", "green"); } }
    ], A, { sort: "daysPastDue", dir: -1, onRow: function (a) { CK.go("loan-account.html?no=" + a.number); }, empty: "No account matches." });
    function apply() { tbl.filter(function (a) { if (bucket && bk(a) !== bucket) return false; if (day && !(a.next && !a.closed && a.next.dueOn === day)) return false; return !q || (a.number + " " + a.borrower + " " + a.reference).toLowerCase().indexOf(q) >= 0; }); }
    CK.render([
      CK.head({ title: "Loan accounts", sub: open.length + " open accounts · " + (A.length - open.length) + " fully paid. Click a band or a day to see only those accounts.", actions: [CK.btn("Post a payment", { kind: "primary", icon: "peso", href: "post-payment.html" })] }),
      h("div.ck-stats.ck-in", { style: { "--cols": 4 } }, CK.stat("Principal still out", CK.peso(out), { icon: "wallet", tone: "brand", sub: "across " + open.length + " accounts" }),
        CK.stat("Past due", String(pastDue.length), { icon: "alert", tone: "amber", sub: CK.peso(pastDue.reduce(function (s, a) { return s + a.overdue; }, 0)) + " overdue" }),
        CK.stat("Falling due this week", String(dueWeek.length), { icon: "cal", tone: "blue", sub: CK.peso(dueWeek.reduce(function (s, a) { return s + a.next.amount; }, 0)) + " expected" }),
        CK.stat("At risk over 30 days", CK.pct(out ? atRisk / out * 100 : 0), { icon: "flag", tone: "red", sub: CK.peso(atRisk) + " of principal" })),
      h("div.ck-grid.side2.stretch", CK.card("How the money out is ageing", aging, { icon: "chart" }), CK.card("Falling due this week", cal, { icon: "cal" })),
      CK.card("Every account", [h("div.ck-toolbar", CK.search("Search a name, LN or APP number", function (v) { q = v; apply(); })), tbl], { icon: "list" })
    ]);
  }, function (e) { CK.error(e); });
})();
