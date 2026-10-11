/* Application detail, classic: where one application stands, what it needs next, the borrower, the papers and its history. */
(function () {
  var h = CK.h, ref = CK.q("ref"); if (!ref) return;
  CK.loading();
  CK.api("GET", "/api/applications/" + ref).then(function (d) {
    var a = d.application, st = a.status, idx = CK.FLOW.indexOf(st), off = /rejected|declined/.test(st);
    /* the road */
    var stageAt = {}; (a.stages || []).forEach(function (s) { stageAt[s.status] = s; });
    var steps = h("div.ck-steps", { style: { "--n": CK.FLOW.length } }, CK.FLOW.map(function (s, i) { var cls = off ? (i <= Math.max(0, CK.FLOW.indexOf(a.stages.length ? a.stages[a.stages.length - 1].status : "draft")) ? "done" : "") : i < idx ? "done" : i === idx ? "now" : "";
      var at = stageAt[s]; return h("div.ck-step." + (cls || "todo"), h("span.dot", cls === "done" ? CK.ic("check") : String(i + 1)), h("b", CK.ST[s][0]), h("small", i === idx ? "here " + CK.since(a.statusSince) : at ? CK.dt(at.enteredAt) : "")); }));
    if (off) steps.appendChild(h("div.ck-step.off", h("span.dot", CK.ic("x")), h("b", CK.ST[st][0]), h("small", CK.dt(a.statusSince))));
    if (off) steps.style.setProperty("--n", CK.FLOW.length + 1);
    /* what it needs */
    var T = [["Documents and checklist", "documents", "submitted"], ["Encode and verify", "encode-verify", "review"], ["Credit assessment", "credit-assessment", "approved"], ["Decision", "decision", "approved"],
      ["Counter-offers", "counter-offers", null], ["Loan agreement", "loan-agreement", "accepted"], ["Release the loan", "release-loan", "funded"]];
    var openNow = { draft: ["documents"], submitted: ["encode-verify"], review: ["credit-assessment", "decision"], approved: ["loan-agreement", "counter-offers"], awaiting: ["counter-offers"], declined: ["counter-offers"], accepted: ["release-loan"] }[st] || [];
    var tasks = h("div.ck-tasks", T.map(function (t, i) {
      var done = t[2] && CK.FLOW.indexOf(t[2]) >= 0 && idx >= CK.FLOW.indexOf(t[2]) && !off, open = openNow.indexOf(t[1]) >= 0, locked = !done && !open;
      if (t[1] === "counter-offers" && !open && !/awaiting|declined/.test(st) && !(a.trail || []).some(function (x) { return /offer/i.test(x.action); })) return null;
      var sub = done ? "Done" : open ? "Open now" : "Not yet";
      return h(locked ? "div.ck-task.lock" : "a.ck-task" + (done ? ".done" : ".open"), { href: locked ? null : (t[1] === "counter-offers" && st === "awaiting" ? "record-answer" : t[1]) + ".html?ref=" + ref },
        h("span.n", done ? CK.ic("check") : String(i + 1)), h("div.grow", h("b", t[0]), h("small", sub)), locked ? CK.ic("lock") : CK.ic("next")); }));
    /* the borrower */
    var b = a.borrower || {}, idSpan = h("span", b.idNumber || "–");
    var reveal = /•/.test(b.idNumber || "") ? CK.btn("Show", { kind: "ghost", icon: "eye", on: function () { CK.busy(reveal, true); CK.api("POST", "/api/applications/" + ref + "/reveal-id").then(function (r) { idSpan.textContent = r.idNumber; reveal.remove(); CK.toast("Full ID number shown. This was written to the audit log.", "blue"); }, function (e) { CK.busy(reveal, false); CK.fail(e); }); } }) : null;
    if (reveal) reveal.classList.add("ck-sm");
    var age = b.birthDate ? Math.floor((Date.now() - new Date(b.birthDate)) / (365.25 * 864e5)) : null;
    var det = a.details || {}, L = { income: "Monthly income", debts: "Monthly debts", years: "Years in work or business", employer: "Employer", position: "Position", business: "Business", revenue: "Monthly revenue", collateral: "Collateral", collateralValue: "Collateral value" };
    var extra = Object.keys(det).map(function (k) { var v = det[k]; return [L[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }), typeof v === "number" && /income|debt|revenue|value/i.test(k) ? CK.peso(v) : v]; });
    /* papers */
    var papers = (a.checklist || []).map(function (c) { var f = (a.documents || []).filter(function (x) { return x.slot === c.slot; }).sort(function (x, y) { return y.version - x.version; })[0];
      return h("li", h("span.ck-filetile" + (f ? "" : ".miss"), CK.ic(f ? "doc" : "alert")), h("div.grow", h("b.ck-strong", c.label), h("small.ck-sm", f ? f.name + " · v" + f.version + " · " + CK.dt(f.at) : "Missing")),
        f ? CK.btn("Open", { kind: "ghost", icon: "eye", href: "/api/applications/" + ref + "/documents/" + f.id }) : CK.pill("Missing", "red")); });
    var have = (a.checklist || []).filter(function (c) { return (a.documents || []).some(function (x) { return x.slot === c.slot; }); }).length;
    [].forEach.call(papers, function (li) { var l = li.querySelector("a"); if (l) l.target = "_blank"; });
    var next = CK.NEXT[st];
    CK.render([
      CK.head({ crumbs: [["Applications", "applications.html"], [ref]], title: b.name || ref, status: CK.status(st), sub: a.product + " · " + CK.peso(a.amount) + " over " + a.termMonths + " months · in this stage " + CK.since(a.statusSince),
        actions: [next && next[1] !== "application-detail" ? CK.btn(next[0], { kind: "primary", href: next[1] + ".html?ref=" + ref, icon: "next" }) : null] }),
      CK.card(null, steps, { cls: "ck-roadcard" }),
      h("div.ck-grid.side2",
        h("div.ck-stack",
          CK.card("The loan", CK.dl([["Product", a.product], ["Amount asked", CK.peso(a.amount)], ["Term", a.termMonths + " months"], ["Interest", a.rate + "% a month, " + (a.method === "flat" ? "flat" : "diminishing balance")],
            ["Purpose", a.purpose], ["Sales agent", a.agent || "Walk-in"], ["Encoded by", a.encodedBy], ["Submitted", CK.dt(a.submittedAt)]]), { icon: "peso" }),
          CK.card("The borrower", [h("div.ck-who.big", CK.av(b.name, 48), h("div", h("b", b.name), h("small", age ? age + " years old · born " + CK.date(b.birthDate) : ""))),
            CK.dl([["ID", h("span.ck-idline", (b.idType || "") + " ", idSpan, reveal)], ["Mobile", b.mobile], ["Email", b.email], ["Address", b.address]].concat(extra))], { icon: "user" })),
        h("div.ck-stack",
          CK.card("What it needs", tasks, { icon: "list" }),
          CK.card("Papers", [h("div.ck-sm", have + " of " + (a.checklist || []).length + " on file"), CK.meter(have, (a.checklist || []).length || 1, have === (a.checklist || []).length ? "green" : "amber"), h("ul.ck-list", papers)],
            { icon: "doc", tools: st === "draft" || st === "submitted" ? CK.btn("Manage", { kind: "ghost", href: "documents.html?ref=" + ref }) : null }),
          CK.card("History", h("ul.ck-time", (a.trail || []).slice(0, 12).map(function (t) { return h("li", h("i"), h("div", h("b", t.action), h("small", t.actor + " · " + CK.dt(t.at)))); })), { icon: "clock" })))
    ]);
  }, function (e) { CK.error(e, "applications.html"); });
})();
