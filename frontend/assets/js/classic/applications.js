/* Applications, classic: every application as a pipeline you can filter by stage, and one plain table. */
(function () {
  var h = CK.h;
  CK.loading();
  Promise.all([CK.api("GET", "/api/applications"), CK.api("GET", "/api/rail").catch(function () { return {}; })]).then(function (r) {
    var A = r[0].applications, rail = r[1], stage = "", q = "", prod = "", closed = "active";
    var STAGES = ["draft", "submitted", "review", "approved", "awaiting", "accepted", "funded"];
    var maker = /loan_processor/.test(rail.role || "");
    function inStage(s) { return A.filter(function (a) { return a.status === s; }); }
    function longest(list) { return list.reduce(function (m, a) { return Math.max(m, (Date.now() - new Date(a.statusSince)) / 36e5); }, 0); }
    var pipe = h("div.ck-pipe.ck-in", STAGES.map(function (s) { var l = inStage(s), lg = longest(l), x = CK.ST[s];
      var b = h("button.ck-pipestep.t-" + x[1], { type: "button", "aria-pressed": "false", on: { click: function () { stage = stage === s ? "" : s; [].forEach.call(pipe.children, function (c) { c.setAttribute("aria-pressed", String(c === b && stage === s)); }); closed = "all"; segC.querySelectorAll("button").forEach(function (z, i) { z.setAttribute("aria-pressed", String(i === 0)); }); apply(); } } },
        h("span.lbl", x[0]), h("b", String(l.length)), h("small", l.length ? "longest " + CK.span(lg) : "none waiting"), s !== "funded" && lg > 48 ? h("i.ck-latedot", { title: "Over 48 hours" }) : null); return b; }));
    var products = A.map(function (a) { return a.product; }).filter(function (v, i, s) { return s.indexOf(v) === i; });
    var segC = CK.seg([["all", "All", A.length], ["active", "In progress", A.filter(function (a) { return !/funded|rejected|declined/.test(a.status); }).length], ["closed", "Closed", A.filter(function (a) { return /funded|rejected|declined/.test(a.status); }).length]], "active", function (v) { closed = v; stage = ""; [].forEach.call(pipe.children, function (c) { c.setAttribute("aria-pressed", "false"); }); apply(); });
    var tbl = CK.table([
      { k: "borrower", label: "Borrower", sort: true, render: function (a) { return h("div.ck-who", CK.av(a.borrower), h("div", h("b", a.borrower), h("small", a.reference))); } },
      { k: "amount", label: "Loan", sort: true, desc: true, render: function (a) { return h("div", h("span.ck-strong", CK.peso(a.amount)), h("small.ck-sm", a.product + " · " + a.termMonths + " months")); } },
      { k: "status", label: "Status", sort: function (a) { return STAGES.indexOf(a.status); }, render: function (a) { return CK.status(a.status); } },
      { k: "assignee", label: "With", render: function (a) { return h("span.ck-sm", a.assignee || (a.status === "funded" ? "Loan accounts" : a.status === "rejected" ? "Closed" : "–")); } },
      { k: "statusSince", label: "In this stage", sort: function (a) { return -new Date(a.statusSince); }, render: function (a) { var hr = (Date.now() - new Date(a.statusSince)) / 36e5, late = hr > 48 && !/funded|rejected|declined/.test(a.status); return h("span.ck-strong" + (late ? ".ck-late" : ""), CK.span(hr)); } },
      { k: "go", label: "", align: "right", render: function (a) { var n = CK.NEXT[a.status] || ["View", "application-detail"]; return CK.btn(n[0], { kind: "soft", href: n[1] + ".html?ref=" + a.reference }); } }
    ], A, { sort: "statusSince", onRow: function (a) { CK.go("application-detail.html?ref=" + a.reference); }, empty: "No application matches." });
    function apply() { tbl.filter(function (a) { if (stage && a.status !== stage) return false; if (prod && a.product !== prod) return false;
      if (!stage && closed === "active" && /funded|rejected|declined/.test(a.status)) return false; if (!stage && closed === "closed" && !/funded|rejected|declined/.test(a.status)) return false;
      return !q || (a.reference + " " + a.borrower).toLowerCase().indexOf(q) >= 0; }); }
    var prodSel = CK.select([["", "All products"]].concat(products.map(function (p) { return [p, p]; })), ""); prodSel.addEventListener("change", function () { prod = prodSel.value; apply(); });
    CK.render([
      CK.head({ title: "Applications", sub: "Every application, where it stands and how long it has waited. Click a stage to see only those.", actions: maker ? [CK.btn("New application", { kind: "primary", icon: "plus", href: "new-application.html" })] : null }),
      pipe,
      CK.card("All applications", [h("div.ck-toolbar", CK.search("Search a name or APP number", function (v) { q = v; apply(); }), prodSel, segC), tbl], { icon: "list" })
    ]);
    apply();
  }, function (e) { CK.error(e); });
})();
