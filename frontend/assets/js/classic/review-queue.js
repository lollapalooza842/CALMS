/* Review queue, classic: every application Under Review, whose desk it sits on, and why the rules sent it to a person; the Lead Underwriter moves folders between desks. */
(function () {
  var h = CK.h, REASONS = ["Workload", "On leave", "Expertise", "Conflict of interest"];
  var TIER = { Low: "green", Moderate: "amber", High: "red", Pending: "grey" };
  var L, U, ORDER, A, me, lead, viewer, sel = "", fTier = "", fDesk = null, tbl, boxes = {};
  function load() { return CK.api("GET", "/api/review-queue"); }
  CK.loading();
  load().then(function (d) { take(d); page(); setInterval(poll, 60000); }, function (e) { CK.error(e, "my-queue.html"); });

  function take(d) { L = d; U = {}; d.people.forEach(function (p) { U[p.key] = p; }); ORDER = d.people.map(function (p) { return p.key; }); me = d.me; lead = !!d.lead; viewer = !U[me];
    A = d.items.map(function (x) { return Object.assign({ t0: Date.now() }, x); }); if (!A.some(function (a) { return a.ref === sel; })) sel = ""; }
  function all() { return lead || viewer; }
  function mine() { return all() ? A : A.filter(function (a) { return a.desk === me; }); }
  function on(k) { return A.filter(function (a) { return a.desk === k; }); }
  function hrs(a) { return a.hours + (Date.now() - a.t0) / 36e5; }
  function short(k) { var p = U[k]; if (!p) return k; return ORDER.filter(function (x) { return U[x].short === p.short; }).length > 1 ? p.short + " (" + k + ")" : p.short; }
  function name(k) { return k ? (U[k] ? U[k].name : k) : "Arrivals"; }
  function over(a) { return a.desk && a.desk !== leadKey() && U[a.desk] && a.amt > U[a.desk].limit; }
  function leadKey() { var l = L.people.filter(function (p) { return /Lead/.test(p.role); })[0]; return l ? l.key : ORDER[0]; }
  function pk(n) { return "₱" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round(n / 1000) + "k"); }

  function page() {
    boxes.stats = h("div.ck-stats.ck-in", { style: { "--cols": 4 } }); boxes.desks = h("div"); boxes.side = h("div.ck-stack.ck-sticky"); boxes.log = h("div"); boxes.tape = h("div");
    boxes.filters = h("div.ck-toolbar");
    tbl = CK.table([
      { k: "who", label: "Borrower", sort: true, render: function (a) { return h("div.ck-rq-bor", h("b", a.who), h("small", a.ref)); } },
      { k: "amt", label: "Loan", sort: true, desc: true, render: function (a) { return h("div", h("span.ck-strong", CK.peso(a.amt)), h("small.ck-sm", a.prod)); } },
      { k: "tier", label: "Risk", sort: function (a) { return ["Low", "Moderate", "High", "Pending"].indexOf(a.tier); }, render: function (a) { return CK.pill(a.tier === "Pending" ? "Not assessed" : a.tier, TIER[a.tier]); } },
      { k: "hours", label: "Waiting", sort: true, desc: true, render: function (a) { var f = [a.urg ? "Urgent" : "", a.late ? "Escalated" : "", over(a) ? "Over limit" : ""].filter(Boolean).join(" · ");
        return h("div", h("span.ck-strong" + (a.late ? ".ck-late" : ""), CK.span(hrs(a))), f ? h("small.ck-sm.ck-rq-flags", f) : null); } },
      { k: "desk", label: "With", align: "right", sort: function (a) { return name(a.desk); }, render: function (a) { return a.desk ? h("span.ck-rq-with", CK.av(name(a.desk), 26), h("span", short(a.desk))) : CK.pill("Not assigned", "blue"); } },
    ], mine(), { sort: "hours", dir: -1, onRow: function (a) { sel = sel === a.ref ? "" : a.ref; marks(); side(true); if (sel && window.matchMedia("(max-width: 1180px)").matches) boxes.side.scrollIntoView({ behavior: "smooth", block: "start" }); },
      empty: all() ? "Nothing is waiting for review." : "Your tray is empty." });
    var deal = lead ? CK.btn("Deal them out", { kind: "primary", icon: "users", on: dealOut }) : null;
    CK.render([
      CK.head({ crumbs: [["My Queue", "my-queue.html"], ["Review queue"]], title: "Review queue",
        sub: viewer ? "Everything the rules could not decide alone, on every desk. You can read it; only the Lead Underwriter moves folders." : lead ? "Everything the rules could not decide alone. As Lead you see every desk and may move folders between them." : "Your own tray. Only the Lead Underwriter sees the other desks or moves folders.",
        actions: [deal] }),
      boxes.stats,
      h("div.ck-split.ck-rq",
        h("div.ck-stack", CK.card(all() ? "In manual review" : "My tray", [boxes.filters, tbl], { icon: "list" }), all() ? CK.card("Desks", boxes.desks, { icon: "users", tools: h("span.ck-sm", "Click a desk to see only its folders") }) : null),
        boxes.side),
      h("div.ck-grid.ck-rq", { style: { "--cols": 2 } }, CK.card("Reassignment log", boxes.log, { icon: "swap" }), CK.card("Latest on these files", boxes.tape, { icon: "clock" }))
    ]);
    refresh(false);
  }

  /* everything that depends on the data, redrawn in place */
  function refresh(anim) { stats(); filters(); desks(); logs(); apply(); side(anim); }
  function apply() { tbl.set(mine()); tbl.filter(function (a) { return (!fTier || a.tier === fTier) && (fDesk === null || a.desk === fDesk); }); marks(); }
  function marks() { [].forEach.call(tbl.querySelectorAll("tbody tr"), function (tr) { var r = tr.querySelector(".ck-rq-bor small"); tr.classList.toggle("is-sel", !!(r && r.textContent === sel)); }); }
  function stats() { var M = mine(), late = M.filter(function (a) { return a.late; }).length, old = M.reduce(function (m, a) { return Math.max(m, hrs(a)); }, 0), un = all() ? on("").length : 0;
    boxes.stats.textContent = ""; [
      CK.stat(all() ? "In manual review" : "In my tray", String(M.length), { icon: "list", tone: "brand", sub: CK.peso(M.reduce(function (s, a) { return s + a.amt; }, 0)) + " asked" }),
      CK.stat("Not yet assigned", String(un), { icon: "users", tone: un ? "blue" : "green", sub: un ? "in the arrivals basket" : "every folder has an owner", on: all() && un ? function () { fDesk = fDesk === "" ? null : ""; filters(); desks(); apply(); } : null }),
      CK.stat("Past 48 hours", String(late), { icon: "alert", tone: late ? "red" : "green", sub: late ? "the supervisor has been told" : "nothing escalated" }),
      CK.stat("Oldest", M.length ? CK.span(old) : "none", { icon: "clock", tone: old >= 48 ? "red" : "amber", sub: "waiting at Under Review" })
    ].forEach(function (s) { s.classList.remove("ck-in"); boxes.stats.appendChild(s); }); }
  function filters() { var M = mine(), n = function (t) { return M.filter(function (a) { return !t || a.tier === t; }).length; };
    var opts = [["", "Every tier", n("")], ["Low", "Low", n("Low")], ["Moderate", "Moderate", n("Moderate")], ["High", "High", n("High")]]; if (n("Pending")) opts.push(["Pending", "Not assessed", n("Pending")]);
    boxes.filters.textContent = ""; boxes.filters.appendChild(CK.seg(opts, fTier, function (v) { fTier = v; apply(); }));
    if (fDesk !== null) boxes.filters.appendChild(h("span.ck-rq-chip", "Desk: " + name(fDesk), CK.btn("", { kind: "icon", icon: "x", aria: "Show every desk", on: function () { fDesk = null; filters(); desks(); apply(); } }))); }
  function desks() { if (!all()) return; boxes.desks.textContent = ""; var max = Math.max(1, Math.max.apply(null, [""].concat(ORDER).map(function (k) { return on(k).length; })));
    boxes.desks.appendChild(h("div.ck-rq-desks", [""].concat(ORDER).map(function (k, i) { var list = on(k), sum = list.reduce(function (s, a) { return s + a.amt; }, 0), p = U[k];
      var b = h("button.ck-rq-desk" + (fDesk === k ? ".is-on" : ""), { type: "button", style: { "--i": i }, on: { click: function () { fDesk = fDesk === k ? null : k; filters(); desks(); apply(); } } },
        k ? CK.av(p.name, 34) : h("span.ck-rq-basket", CK.ic("upload")),
        h("div.grow", h("b", k ? p.name : "Arrivals"), h("small", k ? p.role + " · limit " + CK.peso(p.limit) : "Routed here by the rules, not yet assigned"),
          h("div.ck-rq-load", h("i", { style: { width: (list.length / max * 100) + "%" } }))),
        h("div.ck-rq-n", h("b", String(list.length)), h("small", list.length ? pk(sum) : "empty")));
      return b; }))); }
  function logs() { boxes.log.textContent = ""; boxes.tape.textContent = "";
    var lu = h("ul.ck-time.ck-rq-log", L.log.map(function (l, i) { return h("li" + (i >= 5 ? ".more" : ""), h("i"), h("div", h("b", l.text), h("small", CK.dt(l.at)))); }));
    if (!L.log.length) boxes.log.appendChild(CK.empty("No folders moved yet", "Moves between desks show here, each with its reason.", "swap"));
    else { boxes.log.appendChild(lu); if (L.log.length > 5) { var lb = CK.btn("Show all " + L.log.length, { kind: "ghost", icon: "down", on: function () { lu.classList.add("open"); lb.remove(); } }); lb.classList.add("ck-sm"); boxes.log.appendChild(h("div", lb)); } }
    boxes.tape.appendChild(L.tape.length ? h("ul.ck-time", L.tape.map(function (t) { var s = t.text.replace(/\s*STOP$/, ""); s = s.charAt(0) + s.slice(1).toLowerCase(); s = s.replace(/^app-(\d{4})-(\d{4})/i, "APP-$1-$2");
      var m = /^(APP-\d{4}-\d{4})\s+(\S+)\s+(.*)$/.exec(t.text.replace(/\s*STOP$/, "")); return h("li", h("i"), h("div", h("b", m ? m[3].charAt(0) + m[3].slice(1).toLowerCase() : s), h("small", (m ? m[1] + " · " + m[2].charAt(0) + m[2].slice(1).toLowerCase() + " · " : "") + CK.dt(t.at)))); })) : CK.empty("Nothing new", "Status changes on these files show here.", "clock")); }

  /* ---- the dossier ---- */
  function gauge(label, v, unit, min, max, bands, word) { var tone = "green"; for (var i = 0; i < bands.length; i++) if (v <= bands[i][0]) { tone = bands[i][1]; break; }
    return h("div.ck-rq-gauge", h("div.ck-rq-gtop", h("span", label), h("b", CK.num(v, 2) + unit)), CK.meter(v - min, max - min, tone), h("small.t-" + tone, word)); }
  function side(anim) { var B = boxes.side; B.textContent = ""; var a = A.filter(function (x) { return x.ref === sel; })[0];
    if (!a) { B.appendChild(h("section.ck-card.ck-rq-idle" + (anim ? ".ck-panelin" : ""), h("div.ck-cardbody", CK.empty("Pull a folder", "Click any application on the left to read its dossier here: the ratios, why the rules sent it to a person, and what the system recommends.", "doc")))); return; }
    var holder = a.desk ? U[a.desk] : null, kids = [];
    kids.push(h("div.ck-who.big", CK.av(a.who, 46), h("div", h("b", a.who), h("small", a.ref + " · " + CK.peso(a.amt) + " · " + a.prod))));
    kids.push(h("div.ck-row-end.ck-rq-pills", CK.pill(a.tier === "Pending" ? "Not assessed" : a.tier + " risk", TIER[a.tier]), CK.pill("Waiting " + CK.span(hrs(a)), a.late ? "red" : "grey"), a.urg ? CK.pill("Critical priority", "violet") : null));
    if (a.late) kids.push(CK.note("Waited past 48 hours. It has been escalated to the supervisor.", "red"));
    var g = [];
    if (a.dti != null) g.push(gauge("Debt to income", a.dti, "%", 0, 70, [[35, "green"], [45, "amber"], [999, "red"]], a.dti <= 35 ? "Comfortable" : a.dti <= 45 ? "Inside the 45% limit" : "Over the 45% limit"));
    if (a.fs != null) g.push(gauge("FinScore", a.fs, "", 300, 850, [[579, "red"], [669, "amber"], [999, "green"]], a.fs < 580 ? "Poor" : a.fs < 670 ? "Fair" : "Good"));
    if (a.ltv) g.push(gauge("Loan to value", a.ltv, "%", 0, 110, [[60, "green"], [80, "amber"], [999, "red"]], a.ltv <= 60 ? "Well covered" : a.ltv <= 80 ? "Inside the 80% ceiling" : "Over the 80% ceiling"));
    kids.push(h("div.ck-rq-sec", h("b", "The ratios"), g.length ? h("div.ck-rq-gauges", g) : h("p.ck-sm", "No credit report yet, so there are no ratios to show.")));
    kids.push(h("div.ck-rq-sec", h("b", "Why the rules sent it to a person"), h("ul.ck-rq-why", a.why.map(function (w) { return h("li", w); }))));
    kids.push(h("div.ck-rq-sec", h("b", "System recommends"), h("p", a.rec + (a.version ? ". Rule set version " + a.version + "." : "."))));
    if (a.memo) { var memo = h("pre.ck-rq-memo", a.memo), mb = CK.btn("Read the whole memo", { kind: "ghost", icon: "down", on: function () { memo.classList.toggle("open"); mb.querySelector("span").textContent = memo.classList.contains("open") ? "Show less" : "Read the whole memo"; } }); mb.classList.add("ck-sm");
      kids.push(h("div.ck-rq-sec", h("b", "Credit memo"), memo, h("div", mb))); }
    kids.push(h("div.ck-rq-sec", h("b", "With"), h("p", holder ? holder.name + ", " + holder.role.toLowerCase() + ". Approval limit " + CK.peso(holder.limit) + (a.amt > holder.limit ? ", which this application exceeds." : ".") : "Nobody yet. It is in the arrivals basket.")));
    if (a.amt > L.leadMax) kids.push(CK.note("At " + CK.peso(a.amt) + " this is over the Lead's limit too. Whoever reviews it can only endorse it upward to the Chief Risk Officer.", "amber"));
    var acts = [];
    if (a.desk === me || lead) acts.push(CK.btn(a.tier === "Pending" ? "Open credit assessment" : "Open the decision", { kind: lead ? "soft" : "primary", icon: "next", href: (a.tier === "Pending" ? "credit-assessment" : "decision") + ".html?ref=" + a.ref }));
    acts.push(CK.btn("Application", { kind: "ghost", icon: "doc", href: "application-detail.html?ref=" + a.ref }));
    kids.push(h("div.ck-actions", acts));
    var cards = [h("section.ck-card" + (anim ? ".ck-panelin" : ""), h("div.ck-cardhead", h("h2", CK.ic("doc"), "Dossier"), CK.btn("", { kind: "icon", icon: "x", aria: "Close", on: function () { sel = ""; marks(); side(true); } })), h("div.ck-cardbody", kids))];
    if (lead) cards.push(assignCard(a, anim));
    cards.forEach(function (c) { B.appendChild(c); }); }
  function assignCard(a, anim) {
    var to = CK.select(ORDER.map(function (k) { return [k, (U[k].short !== short(k) ? U[k].name + " (" + k + ")" : U[k].name) + " · " + on(k).length + " in tray"]; }), a.desk || leadKey()), why = CK.select(REASONS.map(function (r) { return [r, r]; }), "Workload");
    var fTo = CK.field("Assign to", to), fWhy = CK.field("Reason", why, { hint: "It goes on the record." }), warn = h("div");
    function check() { warn.textContent = ""; fTo.setError(""); var k = to.value; if (U[k] && a.amt > U[k].limit) warn.appendChild(CK.note("Note: " + CK.peso(a.amt) + " is over this desk's " + CK.peso(U[k].limit) + " limit, so the decision can only be endorsed upward.", "amber")); }
    to.addEventListener("change", check); check();
    var go = CK.btn("Reassign", { kind: "primary", icon: "swap", on: function () { if (to.value === a.desk) { fTo.setError("It is already on that desk."); return; }
      CK.busy(go, true); move(a, to.value, why.value).then(function () { CK.busy(go, false); }, function (e) { CK.busy(go, false); fTo.setError(e.message); }); } });
    return h("section.ck-card" + (anim ? ".ck-panelin" : ""), { style: { animationDelay: "70ms" } }, h("div.ck-cardhead", h("h2", CK.ic("swap"), "Move to another desk")), h("div.ck-cardbody", h("div.ck-form", { style: { "--cols": 1 } }, fTo, fWhy), warn, h("div.ck-actions", go))); }
  function move(a, to, reason) {
    return CK.api("POST", "/api/review-queue/assign", { ref: a.ref, to: to, reason: reason }).then(function (d) { take(d); refresh(true);
      var p = U[to]; CK.toast(a.who + " is now with " + p.name + (a.amt > p.limit ? ". At " + CK.peso(a.amt) + " it is over that desk's " + CK.peso(p.limit) + " limit, so the decision can only be endorsed upward." : ". " + p.name.split(" ")[0] + " sees it in My Queue now.") + " Recorded in the audit log."); }); }

  /* ---- deal them out: unassigned and over-limit folders go to the least busy desk that may decide them ---- */
  function dealOut(ev) { var btn = ev.currentTarget;
    var pool = A.filter(function (a) { return !a.desk || over(a); }).sort(function (a, b) { return (b.urg - a.urg) || (hrs(b) - hrs(a)); });
    if (!pool.length) { CK.toast("Nothing to deal. Every folder already sits with an underwriter who may decide it.", "blue"); return; }
    var n = {}; ORDER.forEach(function (k) { n[k] = on(k).length; });
    var plan = pool.map(function (a) { var ok = ORDER.filter(function (k) { return U[k].limit >= Math.min(a.amt, L.leadMax) && k !== a.desk; }).sort(function (x, y) { return n[x] - n[y] || U[x].limit - U[y].limit; }), to = ok[0] || leadKey();
      if (a.desk) n[a.desk]--; n[to]++; return { a: a, to: to }; }).filter(function (p) { return p.to !== p.a.desk; });
    CK.modal({ title: "Deal out " + plan.length + (plan.length === 1 ? " folder" : " folders"), wide: true, body: [
      h("p.ck-pf-p", "Folders nobody owns, and folders over their desk's limit, go to the least busy underwriter who may decide them. Each move is recorded with the reason “Workload”."),
      h("ul.ck-list", plan.map(function (p) { return h("li", CK.av(p.a.who, 34), h("div.grow", h("b.ck-strong", p.a.who), h("small.ck-sm", p.a.ref + " · " + CK.peso(p.a.amt) + " · from " + (p.a.desk ? short(p.a.desk) : "arrivals"))), CK.ic("next"), h("span.ck-rq-with", CK.av(U[p.to].name, 26), h("span", short(p.to)))); }))],
      actions: [["Cancel", "ghost"], ["Deal them out", "primary", function (close, b, err) { CK.busy(b, true); var i = 0, done = 0;
        (function next() { if (i >= plan.length) { close(); CK.toast(done + (done === 1 ? " folder" : " folders") + " dealt by workload and approval limit."); return; }
          var p = plan[i++]; CK.api("POST", "/api/review-queue/assign", { ref: p.a.ref, to: p.to, reason: "Workload" }).then(function (d) { done++; take(d); refresh(false); next(); },
            function (e) { CK.busy(b, false); err("Stopped after " + done + ". " + p.a.ref + " was not moved: " + e.message); }); })(); }]] }); }

  function poll() { if (document.hidden || document.querySelector(".ck-modalback")) return;
    load().then(function (d) { var before = A.map(function (a) { return a.ref + a.desk; }).sort().join(); take(d); var after = A.map(function (a) { return a.ref + a.desk; }).sort().join();
      if (before !== after) { refresh(false); CK.toast("The review queue changed and was updated.", "blue"); } }, function () {}); }
})();
