/* Notifications, classic: an inbox grouped by day. "Needs you" first, a click opens the record and marks it read. */
(function () {
  var h = CK.h; CK.loading();
  CK.api("GET", "/api/notifications").then(function (d) {
    var N = d.notices, view = "all";
    function open(x) { var go = function () { CK.go(x.ref ? "application-detail.html?ref=" + encodeURIComponent(x.ref) : "users-roles.html"); };
      if (x.un) CK.api("POST", "/api/notifications/read", { ids: [x.id], read: true }).then(go, go); else go(); }
    function mark(x, read, row) { CK.api("POST", "/api/notifications/read", { ids: [x.id], read: read }).then(function () { x.un = read ? 0 : 1; draw(); }, CK.fail); }
    function day(t) { var d0 = new Date(t), n = new Date(); n.setHours(0, 0, 0, 0); var diff = Math.round((n - new Date(d0.getFullYear(), d0.getMonth(), d0.getDate())) / 864e5);
      return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : d0.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" }); }
    var list = h("div.ck-inbox"), counts = h("div");
    function draw() {
      var L = N.filter(function (x) { return view === "all" || (view === "need" ? x.need : x.un); }); list.textContent = "";
      if (!L.length) { list.appendChild(CK.empty("All caught up", view === "need" ? "Nothing needs you right now." : "No new notices.")); return; }
      var last = ""; L.forEach(function (x, i) { var dd = day(x.at); if (dd !== last) { list.appendChild(h("h3.ck-day", dd)); last = dd; }
        var row = h("div.ck-msg" + (x.un ? ".un" : "") + (i < 14 ? ".ck-rowin" : ""), { style: { "--i": i }, tabindex: 0, role: "button", on: { click: function (e) { if (e.target.closest("button")) return; open(x); }, keydown: function (e) { if (e.key === "Enter") open(x); } } },
          h("span.ck-msgic" + (x.need ? ".need" : /Escalat/.test(x.m) ? ".late" : ""), CK.ic(x.need ? "flag" : /Escalat/.test(x.m) ? "clock" : /decision/i.test(x.m) ? "stamp" : /release|paid|payment/i.test(x.m) ? "peso" : "bell")),
          h("div.grow", h("b", x.m), h("small", [x.ref, x.d].filter(Boolean).join(" · "))),
          x.need ? CK.pill("Needs you", "red") : null,
          h("span.ck-when", CK.dt(x.at).split(", ")[1] || ""),
          CK.btn("", { kind: "icon", icon: x.un ? "check" : "mail", aria: x.un ? "Mark as read" : "Mark as unread", title: x.un ? "Mark as read" : "Mark as unread", on: function () { mark(x, !!x.un); } }));
        list.appendChild(row); });
    }
    var un = N.filter(function (x) { return x.un; }).length, need = N.filter(function (x) { return x.need; }).length;
    var seg = CK.seg([["all", "All", N.length], ["need", "Needs you", need], ["new", "Unread", un]], "all", function (v) { view = v; draw(); });
    var allBtn = CK.btn("Mark all as read", { kind: "ghost", icon: "check", on: function () { CK.busy(allBtn, true); CK.api("POST", "/api/notifications/read", { all: true }).then(function (r) { N.forEach(function (x) { x.un = 0; }); CK.busy(allBtn, false); draw(); CK.toast((r.marked || 0) + " marked as read."); }, function (e) { CK.busy(allBtn, false); CK.fail(e); }); } });
    CK.render([
      CK.head({ title: "Notifications", sub: "What CALMS has told you, newest first. The ones marked “Needs you” are waiting on something only you can do.", actions: [CK.btn("Which notices I get", { kind: "ghost", icon: "gear", href: "my-profile.html" }), allBtn] }),
      h("div.ck-stats.ck-in", { style: { "--cols": 3 } }, CK.stat("Unread", String(un), { icon: "bell", tone: "brand" }), CK.stat("Needs you", String(need), { icon: "flag", tone: "red" }), CK.stat("Oldest waiting", need ? CK.since(N.filter(function (x) { return x.need; }).slice(-1)[0].at) : "–", { icon: "clock", tone: "amber" })),
      CK.card(null, [h("div.ck-toolbar", seg), list], {})
    ]); draw();
  }, function (e) { CK.error(e); });
})();
