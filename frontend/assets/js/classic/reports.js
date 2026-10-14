/* Reports, classic: the headline numbers for a period, charts that read at a glance, and the regulatory papers. */
(function () {
  var h = CK.h; CK.loading();
  Promise.all([CK.api("GET", "/api/reports"), CK.api("GET", "/api/regulatory").catch(function () { return { reports: [] }; })]).then(function (r) {
    var R = r[0], REG = r[1].reports || [], per = "now", wrap = h("div.ck-stack");
    function bars(rows, fmt, color) { var max = Math.max.apply(null, rows.map(function (x) { return x[1] || 0; }).concat([1]));
      return h("div.ck-hbars", rows.map(function (x, i) { return h("div.ck-hbar", h("span.l", x[0]), h("span.b", h("i", { style: { width: ((x[1] || 0) / max * 100) + "%", background: x[2] || color || "var(--c-brand)", "--i": i } })), h("span.v", fmt ? fmt(x[1]) : CK.num(x[1]))); })); }
    function delta(a, b, unit, goodUp) { if (b == null || a == null) return "nothing to compare with"; var d = a - b; if (Math.abs(d) < .05) return "same as " + P().prev; return (d > 0 ? "▲ " : "▼ ") + CK.num(Math.abs(d), 1) + (unit || "") + (d > 0 ? " more" : " less") + " than " + P().prev; }
    function P() { return R.periods[per]; }
    function exp(title, rows, fmt, b) { CK.busy(b, true); CK.api("POST", "/api/reports/export", { report: title, period: P().name, format: fmt }).then(function () { CK.busy(b, false); var stamp = CK.today();
      if (fmt === "PDF") CALMS.printTable(title + ", " + P().name, "GR8 Lending Company. Made by CALMS on " + stamp + ".", rows); else CALMS.download("calms-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + stamp + ".csv", CALMS.csv(rows)); CK.toast("“" + title + "” exported. Recorded in the audit log."); }, function (e) { CK.busy(b, false); CK.fail(e); }); }
    function tools(title, rows) { var a = CK.btn("CSV", { kind: "ghost", icon: "download" }), b = CK.btn("PDF", { kind: "ghost", icon: "download" }); a.classList.add("ck-sm"); b.classList.add("ck-sm"); a.onclick = function () { exp(title, rows, "CSV", a); }; b.onclick = function () { exp(title, rows, "PDF", b); }; return h("div.ck-actions", a, b); }
    function draw() { var p = P(); wrap.textContent = "";
      var dec = p.ok + p.up + p.co + p.no;
      wrap.appendChild(h("div.ck-stats", { style: { "--cols": 4 } },
        CK.stat("Applications received", String(p.recv[0]), { icon: "file", tone: "brand", sub: delta(p.recv[0], p.recv[1]) }),
        CK.stat("Approved as asked", dec ? Math.round(p.ok / dec * 100) + "%" : "–", { icon: "check", tone: "green", sub: p.ok + " approved, " + p.co + " counter-offered, " + p.no + " declined" }),
        CK.stat("Days to release", p.days[0] == null ? "–" : CK.num(p.days[0], 1), { icon: "clock", tone: "blue", sub: delta(p.days[0], p.days[1], " d") }),
        CK.stat("Collected of what fell due", CK.pct(p.eff[0]), { icon: "peso", tone: "amber", sub: delta(p.eff[0], p.eff[1], " pts") })));
      var stg = R.stages.map(function (s, i) { return [s, p.wait[i], i === p.wait.indexOf(Math.max.apply(null, p.wait)) ? "#b3261a" : "#d2bfac"]; });
      var dec2 = [["Approved as asked", p.ok, "#2f7a4f"], ["Approved higher up", p.up, "#2c5e8a"], ["Counter-offered", p.co, "#c9821b"], ["Declined", p.no, "#b3261a"]];
      wrap.appendChild(h("div.ck-grid.stretch", { style: { "--cols": 2 } },
        CK.card("Where applications wait", [null, bars(stg, function (v) { return CK.num(v) + " h"; }), h("div.ck-sm", "Waiting now: " + R.stages.map(function (s, i) { return s + " " + p.q[i]; }).join(" · "))],
          { icon: "clock", tools: tools("Where applications wait", [["Step", "Average hours", "Waiting now"]].concat(R.stages.map(function (s, i) { return [s, p.wait[i], p.q[i]]; }))) }),
        CK.card("Decisions", [CK.bar(dec2.map(function (x) { return [x[1], x[2], x[0]]; })), h("div.ck-legend", dec2.map(function (x) { return h("span", h("i", { style: { background: x[2] } }), x[0] + " · " + x[1]); })), bars(p.vol.map(function (x) { return [x[0], x[1]]; }), null, "#2c5e8a")],
          { icon: "stamp", tools: tools("Decisions and volume", [["Week", "Applications"]].concat(p.vol)) })));
      wrap.appendChild(h("div.ck-grid.stretch", { style: { "--cols": 2 } },
        CK.card("Collections", p.col.length ? h("div.ck-stack", p.col.map(function (x) { return h("div.ck-collect", h("div.ck-toolbar.between", h("b.ck-strong", x[0]), h("span.ck-sm", CK.peso(x[2], true) + " of " + CK.peso(x[1], true))), CK.meter(x[2], x[1] || 1, "green")); })) : CK.empty("Nothing fell due", "No payment was due in this period.", "peso"),
          { icon: "peso", tools: tools("Collections", [["Week", "Due", "Collected"]].concat(p.col)) }),
        CK.card("Portfolio by age", [bars(R.aging.map(function (x, i) { return [x[0] + " (" + x[2] + ")", x[1], ["#2f7a4f", "#c9821b", "#c2581e", "#b3261a", "#6e1a12"][i]]; }), function (v) { return CK.peso(v); })],
          { icon: "chart", tools: tools("Portfolio by age", [["Band", "Principal", "Accounts"]].concat(R.aging.map(function (x) { return [x[0], x[1], x[2]]; }))) })));
      wrap.appendChild(h("div.ck-grid.stretch", { style: { "--cols": 2 } },
        CK.card("Turnaround by product", p.tat.length ? bars(p.tat, function (v) { return CK.num(v, 1) + " d"; }, "#6b4a8a") : CK.empty("Nothing released yet", "", "clock"), { icon: "clock" }),
        CK.card("Work done by each officer", p.off.length ? bars(p.off.map(function (x) { return [x[0] + " · " + x[1], x[2]]; }), function (v) { return CK.num(v) + " actions"; }, "#2f6f73") : CK.empty("No activity", "", "users"),
          { icon: "users", tools: tools("Work by officer", [["Officer", "Role", "Actions"]].concat(p.off)) })));
      if (REG.length) wrap.appendChild(CK.card("Regulatory papers", h("div.ck-tasks", REG.map(function (x) { var b = CK.btn("Make it now", { kind: "soft", icon: "file" });
        b.onclick = function () { CK.busy(b, true); CK.api("POST", "/api/regulatory/" + x.kind + "/run", {}).then(function (d) { CK.busy(b, false); if (d && (d.html || d.rows)) CALMS.printPaper(d); CK.toast(x.title + " made. Kept on record."); }, function (e) { CK.busy(b, false); CK.fail(e); }); };
        return h("div.ck-task", h("span.n", CK.ic("file")), h("div.grow", h("b", x.title), h("small", x.to + " · " + x.when + (x.last ? " · last " + x.last.number + " by " + x.last.who + ", " + CK.date(x.last.at) : ""))), b); })), { icon: "shield" }));
      CK.stagger(wrap); [].forEach.call(wrap.children, function (c) { c.classList.add("ck-in"); });
    }
    CK.render([CK.head({ title: "Reports", sub: "How lending is going, for the period you choose. Every export is recorded in the audit log.", actions: [CK.seg([["now", "This month"], ["last", "Last month"], ["qtr", "Last 3 months"]], "now", function (v) { per = v; draw(); })] }), wrap]);
    draw();
  }, function (e) { CK.error(e); });
})();
