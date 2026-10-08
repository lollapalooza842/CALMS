/* Online, the list comes from GET /api/applications; opened from the folder, the sample list below is used. */
CALMS.boot("/api/applications", function (LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var NAV = [["My Queue", "q"], ["Applications", "a"], ["New application", "n"], ["Review queue", "r"], ["Counter-offers", "c"], ["Disbursement", "d"], ["Reports", "p"], ["Audit log", "u"], ["Notifications", "t"]];
  var ROLES = { processor: ["Loan Processor", "Liza Mendoza", "qant"], underwriter: ["Lead Underwriter", "Antonio Reyes", "qarcpt"], disbursement: ["Disbursement Officer", "Corazon Ilagan", "qadt"], agent: ["Sales Agent", "Jun Espiritu", "qact"], auditor: ["Compliance Auditor", "Atty. Regina Sy", "qaput"] };
  /* status: [label, tone, who holds it, next pending action] */
  var ST = { draft: ["Draft", "brown", "", "Finish encoding and submit"], submitted: ["Submitted", "blue", "Verification queue", "Second user verifies the encoded data"], review: ["Under Review", "blue", "", "Underwriter decision"],
             approved: ["Approved", "green", "", "Generate the loan agreement"], awaiting: ["Awaiting Borrower Acceptance", "red", "", "Sales agent records the borrower's response"], accepted: ["Accepted by Borrower", "green", "Disbursement queue", "Upload the signed agreement, then release"],
             funded: ["Funded", "green", "Loan accounts", "None. The loan account is open"], declined: ["Declined by Borrower", "red", "", "Underwriter revises the offer or rejects"], rejected: ["Rejected", "red", "", "None. Returned to the loan processor with the reason"] };
  var MAIN = ["draft", "submitted", "review", "approved", "awaiting", "accepted", "funded"], SPUR = { review: "rejected", awaiting: "declined" };
  var SHORT = { awaiting: "Awaiting Borrower", accepted: "Accepted", declined: "Declined by borrower" };
  var P = "L. Mendoza", P2 = "A. Soriano", U = "A. Reyes", U2 = "M. Tolentino", D = "C. Ilagan";
  /* [ref, borrower, product, amount, term, agent, status, hours in this stage, earlier stages as [status, by, hours spent]] */
  var RAW = [
    ["APP-2026-0377", "Lourdes Magbanua", "SME loan", 480000, "36 mo", "R. Dizon", "review", 50, [["draft", P2, 6], ["submitted", P, 9]]],
    ["APP-2026-0391", "Vicente Alcantara", "Salary loan", 120000, "24 mo", "J. Espiritu", "awaiting", 55, [["draft", P, 4], ["submitted", P2, 7], ["review", U, 20]]],
    ["APP-2026-0398", "Teresita Villanueva", "SME loan", 450000, "36 mo", "J. Espiritu", "draft", 52, []],
    ["APP-2026-0361", "Benigno Salazar", "Salary loan", 100000, "24 mo", "R. Dizon", "accepted", 49, [["draft", P, 3], ["submitted", P2, 5], ["review", U2, 12], ["approved", P, 8]]],
    ["APP-2026-0402", "Felipe Guevarra", "Salary loan", 150000, "24 mo", "K. Bernardo", "declined", 31, [["draft", P2, 5], ["submitted", P, 6], ["review", U, 15], ["awaiting", "K. Bernardo", 26]]],
    ["APP-2026-0431", "Jerome Pascual", "Personal loan", 60000, "12 mo", "", "draft", 27, []],
    ["APP-2026-0419", "Rosalinda Ocampo", "Personal loan", 75000, "12 mo", "J. Espiritu", "review", 22, [["draft", P, 2], ["submitted", P2, 4]]],
    ["APP-2026-0388", "Maricel Dumalagan", "Personal loan", 50000, "12 mo", "J. Espiritu", "accepted", 20, [["draft", P, 3], ["submitted", P2, 6], ["review", U2, 9], ["approved", P, 5]]],
    ["APP-2026-0436", "Carmela Bautista", "Salary loan", 120000, "24 mo", "R. Dizon", "submitted", 19, [["draft", P2, 5]]],
    ["APP-2026-0409", "Norma Estrella", "SME loan", 300000, "24 mo", "J. Espiritu", "awaiting", 18, [["draft", P, 6], ["submitted", P2, 8], ["review", U, 19]]],
    ["APP-2026-0425", "Crisanto Navarro", "SME loan", 350000, "24 mo", "K. Bernardo", "review", 14, [["draft", P, 7], ["submitted", P2, 5]]],
    ["APP-2026-0405", "Eduardo Catacutan", "SME loan", 400000, "36 mo", "R. Dizon", "accepted", 11, [["draft", P2, 8], ["submitted", P, 6], ["review", U, 22], ["approved", P2, 4]]],
    ["APP-2026-0440", "Nestor Aguilar", "SME loan", 300000, "24 mo", "K. Bernardo", "rejected", 9, [["draft", P, 5], ["submitted", P2, 4], ["review", U2, 11]]],
    ["APP-2026-0433", "Imelda Pangilinan", "Salary loan", 90000, "12 mo", "", "review", 6, [["draft", P2, 3], ["submitted", P, 5]]],
    ["APP-2026-0417", "Josefina Abad", "Salary loan", 65000, "12 mo", "J. Espiritu", "approved", 4, [["draft", P, 2], ["submitted", P2, 3], ["review", U, 8]]],
    ["APP-2026-0444", "Marivic Santos-Lim", "Personal loan", 40000, "6 mo", "", "draft", 3, []],
    ["APP-2026-0445", "Danilo Francisco", "Salary loan", 95000, "18 mo", "R. Dizon", "submitted", 2, [["draft", P, 1]]],
    ["APP-2026-0352", "Herminia Cabrera", "Salary loan", 180000, "24 mo", "R. Dizon", "funded", 70, [["draft", P, 4], ["submitted", P2, 6], ["review", U, 16], ["approved", P, 6], ["accepted", D, 9]]]
  ];
  var T0 = Date.now();
  var APPS = RAW.map(function (r) { return { ref: r[0], who: r[1], prod: r[2], amt: r[3], term: r[4], agent: r[5], st: r[6], since: T0 - r[7] * 3600e3, hist: r[8].slice(), enc: (r[8][0] || [0, P])[1], open: false }; });
  if (LIVE && LIVE.applications) APPS = LIVE.applications.map(function (a) { return { ref: a.reference, who: a.borrower, prod: a.product, amt: a.amount, term: a.termMonths + " mo", agent: a.agent, st: a.status, since: new Date(a.statusSince).getTime(), hist: a.history.map(function (h) { return [h.status, h.by, h.hours]; }), enc: a.encodedBy, assignee: a.assignee, open: false }; });
  function holder(a) { var s = ST[a.st][2]; if (s) return s; return a.st === "draft" || a.st === "approved" || a.st === "rejected" ? a.enc : a.st === "review" ? (LIVE ? a.assignee || "Review queue, not yet assigned" : (a.amt > 300000 ? U : U2)) : a.st === "declined" ? (LIVE ? "Underwriters" : (a.amt > 300000 ? U : U2)) : (a.agent || "No agent"); }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function dur(ms) { var m = Math.floor(ms / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24); return d ? d + "d " + (h % 24) + "h" : h ? h + "h " + (m % 60) + "m" : m ? m + "m" : Math.floor(ms / 1000) + "s"; }
  function when(t) { return new Date(t).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); }

  var role = "processor", station = "", sortKey = "t", sortDir = -1, running = true;
  try { role = localStorage.getItem("calmsRole") || role; } catch (e) {}
  if (!ROLES[role]) role = "processor";
  var line = $("line"), train = $("train"), rows = $("rows"), kuwa = $("kuwa");

  function scope() { return APPS.filter(function (a) { return role !== "agent" || a.agent === "J. Espiritu"; }); }
  function shown() {
    var q = $("q").value.trim().toLowerCase(), p = $("prod").value;
    var L = scope().filter(function (a) { return (!station || a.st === station) && (!p || a.prod === p) && (!q || (a.ref + " " + a.who).toLowerCase().indexOf(q) >= 0); });
    L.sort(function (a, b) { var x = sortKey === "t" ? b.since - a.since : sortKey === "amt" ? a.amt - b.amt : a.ref < b.ref ? -1 : 1; return x * sortDir; });
    return L;
  }

  /* ---- the railway ---- */
  function buildLine() {
    [].slice.call(line.querySelectorAll(".stop")).forEach(function (n) { n.remove(); });
    MAIN.forEach(function (k) {
      var s = el("div", "stop"); s.dataset.st = k;
      var b = el("button"); b.type = "button"; b.appendChild(el("span", "board-sign", SHORT[k] || ST[k][0])); b.appendChild(el("span", "post")); b.appendChild(el("span", "dot")); b.appendChild(el("span", "cnt", "0")); b.appendChild(el("span", "long", ""));
      b.addEventListener("click", function () { station = station === k ? "" : k; draw(); }); s.appendChild(b);
      if (SPUR[k]) { var sp = el("div", "spur"), sb = el("button", "", SHORT[SPUR[k]] || ST[SPUR[k]][0]); sb.type = "button"; sb.appendChild(el("b", "", "0")); sb.dataset.st = SPUR[k]; sb.addEventListener("click", function () { station = station === SPUR[k] ? "" : SPUR[k]; draw(); }); sp.appendChild(sb); s.appendChild(sp); }
      line.appendChild(s);
    });
  }
  function stations() {
    var S = scope(), now = Date.now(), slow = "", worst = 0;
    MAIN.forEach(function (k) { var L = S.filter(function (a) { return a.st === k; }), avg = L.reduce(function (m, a) { return m + (now - a.since); }, 0) / (L.length || 1); if (k !== "funded" && L.length && avg > worst) { worst = avg; slow = k; } });
    [].forEach.call(line.querySelectorAll(".stop"), function (s) {
      var k = s.dataset.st, L = S.filter(function (a) { return a.st === k; }), c = s.querySelector(".cnt"), b = s.firstChild;
      if (c.textContent !== String(L.length)) { c.textContent = String(L.length); c.classList.remove("turn"); void c.offsetWidth; c.classList.add("turn"); }
      var longest = L.reduce(function (m, a) { return Math.max(m, now - a.since); }, 0);
      s.classList.toggle("slow", k === slow);
      s.querySelector(".long").textContent = !L.length ? "empty" : (k === slow ? "Slowest stop. " : "") + "longest " + dur(longest);
      b.setAttribute("aria-pressed", String(station === k)); b.setAttribute("aria-label", ST[k][0] + ", " + L.length + " applications");
      var sb = s.querySelector(".spur button"); if (sb) { sb.querySelector("b").textContent = String(S.filter(function (a) { return a.st === sb.dataset.st; }).length); sb.setAttribute("aria-pressed", String(station === sb.dataset.st)); }
    });
    $("all").setAttribute("aria-pressed", String(!station));
  }
  function runTrain(from, to) {
    var a = line.querySelector('.stop[data-st="' + from + '"]'), b = line.querySelector('.stop[data-st="' + to + '"]'); if (!a || !b || reduce) return;
    var x1 = a.offsetLeft + a.offsetWidth / 2 - 45, x2 = b.offsetLeft + b.offsetWidth / 2 - 45;
    train.animate([{ transform: "translateX(" + x1 + "px)", opacity: 0 }, { transform: "translateX(" + x1 + "px)", opacity: 1, offset: .12 }, { transform: "translateX(" + x2 + "px)", opacity: 1, offset: .88 }, { transform: "translateX(" + x2 + "px)", opacity: 0 }], { duration: 1900, easing: "cubic-bezier(.4,0,.3,1)" });
    for (var i = 0; i < 6; i++) (function (i) { setTimeout(function () { var p = el("div", "puff"), x = x1 + (x2 - x1) * (i + 1) / 7 + 24; p.style.left = x + "px"; p.style.top = "58px"; line.appendChild(p); p.animate([{ transform: "translate(0,0) scale(.6)", opacity: .9 }, { transform: "translate(-16px,-34px) scale(2.2)", opacity: 0 }], { duration: 900, easing: "ease-out" }).onfinish = function () { p.remove(); }; }, 250 + i * 230); })(i);
  }

  /* ---- the ledger ---- */
  var COLS = [["Reference", "ref"], ["Borrower", ""], ["Amount", "amt", "r"], ["Status", ""], ["With", ""], ["In this stage", "t"], ["Next", ""]];
  function head() {
    var h = $("head"); h.textContent = "";
    COLS.forEach(function (c) {
      var th = el("th", c[2] || ""); th.scope = "col";
      if (c[1]) { var b = el("button", "", c[0]); b.type = "button"; b.addEventListener("click", function () { if (sortKey === c[1]) sortDir = -sortDir; else { sortKey = c[1]; sortDir = c[1] === "ref" ? 1 : -1; } draw(); }); th.appendChild(b); if (sortKey === c[1]) th.setAttribute("aria-sort", sortDir > 0 ? "ascending" : "descending"); }
      else th.textContent = c[0];
      h.appendChild(th);
    });
  }
  function slip(a) {
    var tr = el("tr", "slip"), td = el("td"), box = el("div", "slipin"); td.colSpan = COLS.length;
    var ul = el("ul", "trail"), t = a.since; a.hist.forEach(function (x) { t -= x[2] * 3600e3; });
    a.hist.forEach(function (x) { var li = el("li"); li.appendChild(el("b", "", ST[x[0]][0])); li.appendChild(el("span", "", when(t) + " · " + x[1])); li.appendChild(el("span", "", "stayed " + dur(x[2] * 3600e3))); ul.appendChild(li); t += x[2] * 3600e3; });
    var now = el("li", "now"); now.appendChild(el("b", "", ST[a.st][0])); now.appendChild(el("span", "", "since " + when(a.since))); now.appendChild(el("span", "", "with " + holder(a))); ul.appendChild(now);
    box.appendChild(ul);
    var p = el("p", "next"); p.appendChild(el("b", "", "Next: ")); p.appendChild(document.createTextNode(ST[a.st][3] + ". " + a.prod + ", " + a.term + (a.agent ? ". Endorsed by " + a.agent : ". No sales agent") + "."));
    box.appendChild(p);
    var b = el("button", "act", "Open application"); b.type = "button"; b.addEventListener("click", function () { location.href = "application-detail.html?ref=" + encodeURIComponent(a.ref); }); box.appendChild(b);
    td.appendChild(box); tr.appendChild(td); return tr;
  }
  function draw() {
    head(); stations();
    var L = shown(), now = Date.now(); rows.textContent = "";
    L.forEach(function (a) {
      var tr = el("tr", "row" + (now - a.since >= 48 * 3600e3 && a.st !== "funded" && a.st !== "rejected" ? " old" : "")); tr.dataset.ref = a.ref;
      var c0 = el("td"), rb = el("button", "refb", a.ref); rb.type = "button"; rb.setAttribute("aria-expanded", String(a.open)); rb.addEventListener("click", function () { a.open = !a.open; draw(); }); c0.appendChild(rb); tr.appendChild(c0);
      var c1 = el("td", "", a.who); c1.appendChild(el("small", "", a.prod + " · " + a.term)); tr.appendChild(c1);
      tr.appendChild(el("td", "n r", peso(a.amt)));
      var c3 = el("td"); c3.appendChild(el("span", "stamp " + ST[a.st][1] + (a.fresh ? " slam" : ""), ST[a.st][0])); tr.appendChild(c3);
      tr.appendChild(el("td", "", holder(a)));
      tr.appendChild(el("td", "n t", dur(now - a.since)));
      tr.appendChild(el("td", "", ST[a.st][3]));
      if (a.fresh) { tr.classList.add("flash"); a.fresh = false; }
      rows.appendChild(tr); if (a.open) rows.appendChild(slip(a));
    });
    if (!L.length) { var tr = el("tr"), td = el("td", "none", "No applications match. Clear the search or pick another station."); td.colSpan = COLS.length; tr.appendChild(td); rows.appendChild(tr); }
    var S = scope(); $("count").textContent = L.length + " of " + S.length + " shown · " + new Date().toLocaleDateString("en-PH", { month: "long", year: "numeric" });
    perch(L);
  }
  /* ---- Kuwa on the spine ---- */
  var kT = null, kTop = -1;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i = (i + 1) % seq.length; kT = setTimeout(step, d); })(); }
  function perch(L) {
    var live = L.filter(function (a) { return a.st !== "funded" && a.st !== "rejected"; }), worst = live.sort(function (a, b) { return a.since - b.since; })[0];
    var tr = worst && rows.querySelector('tr[data-ref="' + worst.ref + '"]'), pages = document.querySelector(".pages");
    var top = tr ? tr.getBoundingClientRect().top - pages.getBoundingClientRect().top + tr.offsetHeight / 2 - 60 : 4;
    var late = worst && Date.now() - worst.since >= 48 * 3600e3, seq = !worst ? [[13, 900], [14, 900], [15, 900]] : late ? [[26, 1600], [24, 1200], [26, 900], [3, 110]] : [[26, 2400], [3, 110]];
    if (kTop < 0 || reduce || Math.abs(top - kTop) < 4) { kuwa.style.top = top + "px"; kTop = top; kuwa.classList.remove("walk"); loop(seq); return; }
    clearTimeout(kT); kFrame(37); kuwa.classList.add("walk"); kuwa.style.top = top + "px"; kTop = top; kT = setTimeout(function () { kuwa.classList.remove("walk"); loop(seq); }, 740);
  }
  function tick() {
    var now = Date.now();
    [].forEach.call(rows.querySelectorAll("tr.row"), function (tr) { var a = APPS.filter(function (x) { return x.ref === tr.dataset.ref; })[0]; if (a) tr.querySelector(".t").textContent = dur(now - a.since); });
    [].forEach.call(line.querySelectorAll(".stop"), function (s) { var L = scope().filter(function (a) { return a.st === s.dataset.st; }); if (L.length) { var t = s.querySelector(".long"); t.textContent = (s.classList.contains("slow") ? "Slowest stop. " : "") + "longest " + dur(L.reduce(function (m, a) { return Math.max(m, now - a.since); }, 0)); } });
  }
  /* ---- simulated live activity (FR-071: a change reaches every viewer within two seconds) ---- */
  var NEXT = { draft: ["submitted"], submitted: ["review"], review: ["approved", "awaiting", "approved"], approved: ["accepted"], awaiting: ["accepted", "accepted", "declined"], accepted: ["funded"], declined: ["awaiting"] };
  var BY = { submitted: P, review: P2, approved: U, awaiting: U, accepted: "J. Espiritu", funded: D, declined: "J. Espiritu" };
  /* Online: every 20 seconds, ask the server what moved and show only real changes. */
  function poll() { if (!running || document.hidden) return; CALMS.api("GET", "/api/applications").then(function (d) { var old = {}; APPS.forEach(function (a) { old[a.ref] = a; });
      var next = d.applications.map(function (a) { var o = old[a.reference]; return { ref: a.reference, who: a.borrower, prod: a.product, amt: a.amount, term: a.termMonths + " mo", agent: a.agent, st: a.status, since: new Date(a.statusSince).getTime(), hist: a.history.map(function (h) { return [h.status, h.by, h.hours]; }), enc: a.encodedBy, assignee: a.assignee, open: o ? o.open : false, fresh: !o || o.st !== a.status }; });
      var moved = next.filter(function (a) { return old[a.ref] && old[a.ref].st !== a.st; }), added = next.filter(function (a) { return !old[a.ref]; });
      APPS = next; var m = moved.filter(function (a) { return scope().indexOf(a) >= 0; })[0];
      if (m) { var from = old[m.ref].st; $("note").textContent = m.ref + " (" + m.who + ") moved from " + ST[from][0] + " to " + ST[m.st][0] + "."; if (MAIN.indexOf(from) >= 0 && MAIN.indexOf(m.st) >= 0) runTrain(from, m.st); }
      else if (added.length) $("note").textContent = added.length === 1 ? added[0].ref + " (" + added[0].who + ") was just submitted." : added.length + " new applications were just submitted.";
      if (moved.length || added.length) draw(); }, function () {}); }
  function change() {
    if (LIVE) return;
    if (!running) return;
    var pool = APPS.filter(function (a) { return NEXT[a.st]; }); if (!pool.length) return;
    var a = pool[Math.floor(Math.random() * pool.length)], opts = NEXT[a.st], to = opts[Math.floor(Math.random() * opts.length)], from = a.st, now = Date.now();
    a.hist.push([from, BY[to] || holder(a), (now - a.since) / 3600e3]); a.st = to; a.since = now; a.fresh = true;
    var mine = scope().indexOf(a) >= 0;
    if (mine) { $("note").textContent = a.ref + " (" + a.who + ") moved from " + ST[from][0] + " to " + ST[to][0] + " just now."; if (MAIN.indexOf(from) >= 0 && MAIN.indexOf(to) >= 0) runTrain(from, to); }
    draw();
  }
  /* ---- chrome ---- */
  function chrome() {
    var R = ROLES[role]; $("whoName").textContent = R[1]; $("whoRole").textContent = R[0];
    $("lede").textContent = role === "agent" ? "Only the borrowers you endorsed. You can see where each one stands and relay it." : role === "auditor" ? "Every application, read only." : "Every application, where it stands, who has it and how long it has sat there.";
    var nav = $("nav"); nav.textContent = "";
    NAV.forEach(function (n) {
      if (R[2].indexOf(n[1]) < 0) return;
      var li = el("li"), a = el("a"), p = el("span", "plate", n[0]); a.href = "#"; a.appendChild(p);
      if (n[1] === "a") a.setAttribute("aria-current", "page"); else { a.setAttribute("aria-disabled", "true"); a.title = n[1] === "q" ? "A separate prototype page" : "Not built yet"; }
      a.addEventListener("click", function (e) { e.preventDefault(); if (n[1] !== "a") $("note").textContent = n[1] === "q" ? "Prototype: My Queue is a separate prototype page." : "Prototype: the " + n[0] + " drawer is not built yet."; });
      li.appendChild(a); nav.appendChild(li);
    });
  }
  var sel = $("role"); Object.keys(ROLES).forEach(function (k) { var o = el("option", "", ROLES[k][0]); o.value = k; sel.appendChild(o); }); sel.value = role;
  sel.addEventListener("change", function () { role = sel.value; station = ""; kTop = -1; try { localStorage.setItem("calmsRole", role); } catch (e) {} chrome(); draw(); });
  $("q").addEventListener("input", draw); $("prod").addEventListener("change", draw);
  $("all").addEventListener("click", function () { station = ""; draw(); });
  $("pause").addEventListener("click", function () { running = !running; this.setAttribute("aria-pressed", String(!running)); this.textContent = running ? "Pause" : "Resume"; $("live").classList.toggle("off", !running); $("liveText").textContent = running ? "Live" : "Paused"; });
  window.addEventListener("resize", function () { kTop = -1; perch(shown()); });
  buildLine(); chrome(); draw(); setInterval(tick, 1000); if (LIVE) setInterval(poll, 20000); else { setInterval(change, 9000); setTimeout(change, 3500); }
});
