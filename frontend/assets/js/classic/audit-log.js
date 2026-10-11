/* Audit log, classic: the sealed record as a searchable table; a row opens to show before and after. */
(function () {
  var h = CK.h; CK.loading();
  var KIND = { login: ["Sign-ins", "blue"], application: ["Applications", "brand"], paper: ["Papers", "teal"], decision: ["Decisions", "amber"], money: ["Money", "green"], user: ["Users and roles", "violet"], rule: ["Rules", "amber"], audit: ["Audit", "grey"], system: ["System", "grey"] };
  function load(days) { return CK.api("GET", "/api/audit?days=" + days); }
  load(30).then(function (d) {
    var E = d.entries, q = "", kind = "", who = "", days = 30;
    var kinds = E.map(function (e) { return e.kind; }).filter(function (v, i, s) { return s.indexOf(v) === i; }), people = E.map(function (e) { return e.who; }).filter(function (v, i, s) { return s.indexOf(v) === i; }).sort();
    var count = h("span.ck-sm"), seal = h("div");
    var tbl = CK.table([
      { k: "n", label: "#", w: "70px", sort: true, desc: true, render: function (e) { return h("span.ck-sm", String(e.n)); } },
      { k: "at", label: "When", sort: true, desc: true, render: function (e) { return h("span.ck-strong", CK.dt(e.at)); } },
      { k: "who", label: "Who", sort: true, render: function (e) { return h("div.ck-who", CK.av(e.who, 32), h("div", h("b", e.who), h("small", e.role))); } },
      { k: "kind", label: "What happened", render: function (e) { return h("div", h("span", e.text), h("small.ck-sm", e.rec)); } },
      { k: "hot", label: "", align: "right", render: function (e) { var k = KIND[e.kind] || [e.kind, "grey"]; return h("span.ck-row-end", e.hot ? CK.pill("Watch", "red") : null, CK.pill(k[0], k[1])); } }
    ], E, { sort: "at", dir: -1, page: 40, onRow: function (e, row) { detail(e, row); }, empty: "No entry matches." });
    function detail(e, row) { var nxt = row.nextSibling; if (nxt && nxt.classList.contains("ck-detail")) { nxt.remove(); row.classList.remove("is-sel"); return; }
      [].forEach.call(row.parentNode.querySelectorAll(".ck-detail"), function (x) { x.remove(); }); [].forEach.call(row.parentNode.querySelectorAll(".is-sel"), function (x) { x.classList.remove("is-sel"); });
      row.classList.add("is-sel"); var td = h("td", { colSpan: 5 }, h("div.ck-detailbox.ck-panelin", CK.dl([["Before", e.was || "–"], ["After", e.now || "–"], ["Record", e.rec], ["From address", e.ip], ["Entry seal", h("code.ck-seal", e.seal)], ["Links to entry before", h("code.ck-seal", e.prev || "–")]], "three")));
      row.after(h("tr.ck-detail", td)); }
    function apply() { tbl.filter(function (e) { if (kind && e.kind !== kind) return false; if (who && e.who !== who) return false; return !q || (e.text + " " + e.rec + " " + e.who + " " + e.was + " " + e.now).toLowerCase().indexOf(q) >= 0; });
      var n = E.filter(function (e) { return (!kind || e.kind === kind) && (!who || e.who === who) && (!q || (e.text + " " + e.rec + " " + e.who + " " + e.was + " " + e.now).toLowerCase().indexOf(q) >= 0); }).length; count.textContent = n + " of " + E.length + " entries"; return n; }
    var kSel = CK.select([["", "Everything"]].concat(kinds.map(function (k) { return [k, (KIND[k] || [k])[0]]; })), ""), wSel = CK.select([["", "Anyone"]].concat(people.map(function (p) { return [p, p]; })), ""), dSel = CK.select([["1", "Today"], ["7", "Last 7 days"], ["30", "Last 30 days"]], "30");
    kSel.addEventListener("change", function () { kind = kSel.value; apply(); }); wSel.addEventListener("change", function () { who = wSel.value; apply(); });
    dSel.addEventListener("change", function () { days = +dSel.value; load(days).then(function (x) { E = x.entries; tbl.set(E); apply(); }, CK.fail); });
    function exp(fmt, b) { var L = E.filter(function (e) { return (!kind || e.kind === kind) && (!who || e.who === who) && (!q || (e.text + " " + e.rec + " " + e.who).toLowerCase().indexOf(q) >= 0); });
      var rows = [["Entry", "When", "Who", "Role", "Kind", "What", "Record", "Before", "After", "From address", "Seal"]].concat(L.map(function (e) { return [e.n, CK.dt(e.at), e.who, e.role, e.kind, e.text, e.rec, e.was, e.now, e.ip, e.seal]; }));
      CK.busy(b, true); CK.api("POST", "/api/audit/export", { count: L.length, format: fmt, filters: { kind: kind, who: who, q: q, days: days } }).then(function () { CK.busy(b, false); var stamp = CK.today();
        if (fmt === "PDF") CALMS.printTable("CALMS audit log extract", L.length + " entries, exported " + stamp + ". GR8 Lending Company.", rows); else CALMS.download("calms-audit-" + stamp + ".csv", CALMS.csv(rows)); CK.toast(L.length + " entries exported. The export was added to the log."); }, function (e) { CK.busy(b, false); CK.fail(e); }); }
    var eC = CK.btn("Spreadsheet", { kind: "ghost", icon: "download" }), eP = CK.btn("PDF", { kind: "ghost", icon: "download" }); eC.onclick = function () { exp("CSV", eC); }; eP.onclick = function () { exp("PDF", eP); };
    var chk = CK.btn("Check the seals", { kind: "primary", icon: "shield", on: function () { CK.busy(chk, true); CK.api("POST", "/api/audit/check").then(function (r) { CK.busy(chk, false); seal.textContent = "";
      seal.appendChild(r.unbroken ? CK.note(h("span", h("b", "The record is unbroken. "), CK.num(r.entries) + " entries checked; every seal matches the entry before it."), "green", "shield") : CK.note(h("span", h("b", "A break was found at entry " + r.firstBrokenEntry + ". "), "Something after that entry was changed outside CALMS."), "red")); }, function (e) { CK.busy(chk, false); CK.fail(e); }); } });
    CK.render([CK.head({ title: "Audit log", sub: "Everything anyone did in CALMS, in order. Nobody can change or delete an entry, not even an administrator. Each entry is sealed to the one before it.", actions: [chk] }),
      seal,
      h("div.ck-stats.ck-in", { style: { "--cols": 3 } }, CK.stat("Entries since " + CK.date(d.since), CK.num(d.total), { icon: "list", tone: "brand" }), CK.stat("Shown", String(E.length), { icon: "eye", tone: "blue", sub: "last 30 days" }), CK.stat("Flagged to watch", String(E.filter(function (e) { return e.hot; }).length), { icon: "flag", tone: "red" })),
      CK.card("Entries", [h("div.ck-toolbar", CK.search("A name, a record like APP-2026-0409, a word", function (v) { q = v; apply(); }), kSel, wSel, dSel), h("div.ck-toolbar.between", count, h("div.ck-actions", eC, eP)), tbl], { icon: "shield" })]);
    apply();
  }, function (e) { CK.error(e); });
})();
