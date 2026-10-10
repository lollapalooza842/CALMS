/* Online, the accounts and where each stands come from GET /api/loan-accounts (balances, days past due and
   penalties are worked out by the server as of today). Opened from the folder, the sample accounts are used. */
(function () {
  if (!window.CALMS || !CALMS.online) { start(null, null); return; }
  Promise.all([CALMS.api("GET", "/api/loan-accounts"), CALMS.api("GET", "/api/auth/me")]).then(function (r) { start(r[0], r[1].user); }, function (err) { if (err.status === 401 || CALMS.unreachable(err)) return; start(null, null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample accounts instead."; });
})();
function start(LIVE, ME0) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pk(n) { return n >= 1e6 ? "₱ " + (n / 1e6).toFixed(2) + " M" : "₱ " + Math.round(n / 1000) + " K"; }
  var N0 = new Date(Date.now() + 8 * 3600e3), T0 = Date.UTC(N0.getUTCFullYear(), N0.getUTCMonth(), N0.getUTCDate());
  function day(d) { return new Date(T0 + d * 86400e3); }
  function ds(d, o) { return d.toLocaleDateString("en-PH", o || { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" }); }
  var R = .015, ME = "Rodel Macaraeg";
  var BK = ["Current", "1 to 30 days", "31 to 60 days", "61 to 90 days", "Over 90 days", "Fully paid"], BC = ["--b0", "--b1", "--b2", "--b3", "--b4", "--b5"];
  var RAW = [
    ["LN-2026-0163", "Norma Estrella", "SME loan", 250000, 24, "", 0, 31, "Jun Espiritu", { isNew: 1 }],
    ["LN-2026-0162", "Efren Salonga", "SME loan", 200000, 24, "", 0, 31, "Jun Espiritu", { isNew: 1 }],
    ["LN-2026-0161", "Gloria Mercado", "Personal loan", 60000, 12, "", 0, 31, "Katrina Yap", { isNew: 1 }],
    ["LN-2026-0148", "Rosalinda Javier", "Salary loan", 80000, 18, "ooo", 0, 2, "Katrina Yap", {}],
    ["LN-2026-0140", "Josefa Marquez", "Salary loan", 120000, 24, "oooo", 0, 6, "Jun Espiritu", {}],
    ["LN-2026-0131", "Wilfredo Santos", "Personal loan", 50000, 12, "ooLoo", 0, 5, "Katrina Yap", {}],
    ["LN-2026-0125", "Dante Evangelista", "Personal loan", 70000, 18, "oooLoo", 0, 3, "Jun Espiritu", {}],
    ["LN-2026-0119", "Carmelita Ong", "SME loan", 400000, 36, "ooooooo", 0, 0, "Jun Espiritu", {}],
    ["LN-2026-0109", "Lilia Fernando", "SME loan", 150000, 12, "ooooooo", 2, 0, "Katrina Yap", {}],
    ["LN-2026-0102", "Ernesto Villanueva", "Personal loan", 30000, 6, "ooLL", 6, 0, "Katrina Yap", {}],
    ["LN-2025-0987", "Maricel Dizon", "Salary loan", 100000, 24, "ooooooLoL", 19, 0, "Jun Espiritu", {}],
    ["LN-2025-0954", "Rogelio Pascual", "SME loan", 300000, 24, "ooooLoLL", 44, 0, "Jun Espiritu", {}],
    ["LN-2025-0911", "Analyn Cortez", "Personal loan", 45000, 12, "ooLoLLL", 73, 0, "Katrina Yap", {}],
    ["LN-2025-0876", "Bernardo Lim", "SME loan", 500000, 36, "oooLooLLLL", 118, 0, "Jun Espiritu", {}],
    ["LN-2025-0822", "Teodoro Agustin", "Salary loan", 60000, 12, "ooooooLooooo", 0, 0, "Katrina Yap", { paid: 1, clr: "ready", closed: -3 }],
    ["LN-2025-0840", "Felicidad Ramos", "Personal loan", 25000, 6, "oooooo", 0, 0, "Katrina Yap", { paid: 1, clr: "issued", closed: -21 }]
  ];
  var A, F, open;
  if (LIVE && ME0) ME = ME0.name;
  function fresh() { if (LIVE) { var BI = { current: 0, "1-30": 1, "31-60": 2, "61-90": 3, "90+": 4, closed: 5 };
      A = LIVE.accounts.map(function (x) { var dueIn = x.next ? Math.round((Date.UTC.apply(null, x.next.dueOn.split("-").map(function (v, i) { return i === 1 ? v - 1 : +v; })) - T0) / 86400e3) : 0;
        return { id: x.number, nm: x.borrower, prod: x.product, P: x.principal, n: x.term, k: x.paidCount, hist: x.history, pay: x.payment, bal: x.closed ? 0 : x.principalLeft, dpd: x.daysPastDue, miss: x.missed, pd: x.overdue, pen: x.penalty, dueIn: dueIn, agent: x.agent || "no agent", isNew: x.releasedOn === LIVE.today, paid: x.closed, clr: x.closed ? "ready" : "", closed: 0, b: BI[x.bucket], rate: x.rate, method: x.method }; });
      F = { b: null, day: null, q: "", prod: "", sort: "att" }; open = null; return; }
    A = RAW.map(function (r) { var P = r[3], n = r[4], k = r[5].length, g = Math.pow(1 + R, n), pay = P * R / (1 - 1 / g), x = r[9], paid = !!x.paid, bal = paid ? 0 : P * (g - Math.pow(1 + R, k)) / (g - 1), dpd = r[6], miss = dpd ? Math.ceil(dpd / 30) : 0;
      return { id: r[0], nm: r[1], prod: r[2], P: P, n: n, k: k, hist: r[5], pay: pay, bal: bal, dpd: dpd, miss: miss, pd: miss * pay, pen: pay * .03 * miss * (miss + 1) / 2, dueIn: r[7], agent: r[8], isNew: !!x.isNew, paid: paid, clr: x.clr || "", closed: x.closed || 0, b: paid ? 5 : !dpd ? 0 : dpd <= 30 ? 1 : dpd <= 60 ? 2 : dpd <= 90 ? 3 : 4 }; });
    F = { b: null, day: null, q: "", prod: "", sort: "att" }; open = null; }
  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[0, 2200], [3, 110], [0, 1600], [28, 1400]], ALERT = [[22, 80], [23, 700], [24, 1400]], NOD = [[16, 120], [17, 120], [18, 140], [19, 500], [20, 140], [21, 300]], THINK = [[4, 200], [5, 200], [6, 200], [7, 700], [8, 700]], DOWN = [[28, 1600]];
  function say(t, mode) { $("says").textContent = t; var back = function () { loop(IDLE); }; loop(mode === "alert" ? ALERT : mode === "nod" ? NOD : mode === "think" ? THINK : mode === "down" ? DOWN : IDLE, mode ? back : null); }
  function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
  function inB(b) { return A.filter(function (x) { return x.b === b; }); }
  /* ---- counters ---- */
  function counters() { var act = A.filter(function (x) { return !x.paid; }), late = act.filter(function (x) { return x.dpd > 0; }), wk = act.filter(function (x) { return !x.dpd && x.dueIn <= 6; }), tot = sum(act, function (x) { return x.bal; }), risk = sum(act.filter(function (x) { return x.dpd > 30; }), function (x) { return x.bal; });
    $("sub").textContent = act.length + " open accounts · " + inB(5).length + " fully paid";
    var c = $("cnts"); c.textContent = ""; [[String(act.length), "Open accounts", A.filter(function (x) { return x.isNew; }).length + " opened today"], [peso(tot), "Principal still out", "Across all open accounts"], [String(late.length), "Past due", peso(sum(late, function (x) { return x.pd + x.pen; })) + " overdue, with penalties"], [String(wk.length), "Falling due this week", peso(sum(wk, function (x) { return x.pay; })) + " expected"], [(risk / tot * 100).toFixed(1) + "%", "At risk over 30 days", peso(risk) + " of principal in accounts more than 30 days late"]].forEach(function (r) { var li = el("li"); li.appendChild(el("span", "", r[1])); li.appendChild(el("b", "", r[0])); li.appendChild(el("small", "", r[2])); c.appendChild(li); }); }
  /* ---- the cabinet ---- */
  var QUIP = ["Paying as agreed. Nothing to say.", "A few days late. Usually a reminder is all it takes.", "Two payments behind. Their agent should know by now.", "Three behind. I have flagged them every month.", "Over ninety days. I flag it. Chasing it is not my job, or yours.", "Paid in full. Give them their clearance and let them go."];
  function cabinet() { var c = $("cab"); c.textContent = ""; var mx = Math.max.apply(null, A.map(function (x) { return x.bal; }));
    BK.forEach(function (name, b) { var a = inB(b), t = sum(a, function (x) { return x.bal; }), li = el("li"), bt = el("button", "hole"); bt.type = "button"; bt.id = "h" + b; bt.setAttribute("aria-pressed", String(F.b === b)); bt.setAttribute("aria-label", name + (b && b < 5 ? " past due" : "") + ": " + a.length + (a.length === 1 ? " account" : " accounts") + (b < 5 ? ", " + peso(t) + " principal left" : ""));
      bt.appendChild(el("span", "pl", name)); var inn = el("span", "in"); a.forEach(function (x) { var s = el("i"); s.style.setProperty("--h", (b === 5 ? 34 : 28 + 62 * Math.sqrt(x.bal / mx)).toFixed(0) + "%"); s.style.setProperty("--c", "var(" + BC[b] + ")"); inn.appendChild(s); }); bt.appendChild(inn);
      var ft = el("span", "ft"); ft.appendChild(el("b", "", a.length + (a.length === 1 ? " account" : " accounts"))); ft.appendChild(el("small", "", b === 5 ? "closed" : peso(t))); bt.appendChild(ft);
      bt.addEventListener("click", function () { F.b = F.b === b ? null : b; F.day = null; cabinet(); week(); rows(); $("h" + b).focus(); if (F.b === null) say("All of them, then.", ""); else say(a.length ? QUIP[b] : "Empty. Good.", b >= 3 && b < 5 ? "alert" : b === 5 ? "nod" : "down"); }); li.appendChild(bt); c.appendChild(li); });
    var sb = $("sbar"), tot = sum(A, function (x) { return x.bal; }), lab = []; sb.textContent = ""; [0, 1, 2, 3, 4].forEach(function (b) { var t = sum(inB(b), function (x) { return x.bal; }), p = t / tot * 100; if (!t) return; var s = el("span", "", p >= 7 ? p.toFixed(0) + "%" : ""); s.style.setProperty("--f", p.toFixed(2)); s.style.setProperty("--c", "var(" + BC[b] + ")"); if (b === 1) s.style.color = "#16110c"; s.title = BK[b] + ": " + p.toFixed(1) + "%"; sb.appendChild(s); lab.push(BK[b] + " " + p.toFixed(1) + "%"); }); sb.setAttribute("aria-label", "Share of outstanding principal. " + lab.join(", ") + "."); }
  /* ---- the week ---- */
  function week() { var w = $("week"); w.textContent = ""; for (var d = 0; d < 7; d++) (function (d) { var dt = day(d), a = A.filter(function (x) { return !x.paid && !x.dpd && x.dueIn === d; }), we = dt.getUTCDay() === 0 || dt.getUTCDay() === 6, li = el("li"), bt = el("button", "day" + (a.length ? "" : " none") + (d === 0 ? " today" : "") + (we ? " we" : "")); bt.type = "button"; bt.id = "d" + d; bt.setAttribute("aria-pressed", String(F.day === d));
      bt.appendChild(el("span", "hd", d === 0 ? "Today" : ds(dt, { timeZone: "UTC", weekday: "short" }))); var bd = el("span", "bd"); bd.appendChild(el("span", "n", String(dt.getUTCDate()))); bd.appendChild(el("span", "c", a.length ? a.length + " due" : "none due")); if (a.length) bd.appendChild(el("span", "a", peso(sum(a, function (x) { return x.pay; })))); bt.appendChild(bd);
      bt.setAttribute("aria-label", ds(dt, { timeZone: "UTC", weekday: "long", month: "long", day: "numeric" }) + ": " + (a.length ? a.length + " due, " + peso(sum(a, function (x) { return x.pay; })) : "none due"));
      bt.addEventListener("click", function () { F.day = F.day === d ? null : d; F.b = null; cabinet(); week(); rows(); $("d" + d).focus(); if (F.day !== null) say(a.length ? a.map(function (x) { return x.nm; }).join(" and ") + (a.length === 1 ? " is" : " are") + " due " + (d === 0 ? "today." : "that day.") : "Nobody is due that day.", "down"); }); li.appendChild(bt); w.appendChild(li); })(d); }
  /* ---- the ledger ---- */
  function shown() { var q = F.q.trim().toLowerCase(); var a = A.filter(function (x) { return (F.b === null || x.b === F.b) && (F.day === null || (!x.paid && !x.dpd && x.dueIn === F.day)) && (!F.prod || x.prod === F.prod) && (!q || (x.nm + " " + x.id).toLowerCase().indexOf(q) > -1); });
    var rank = function (x) { return x.paid ? 9e6 : x.dpd ? -x.dpd : x.dueIn + 1; };
    a.sort(function (x, y) { return F.sort === "bal" ? y.bal - x.bal : F.sort === "nm" ? x.nm.localeCompare(y.nm) : F.sort === "due" ? (x.paid - y.paid) || ((x.dpd ? -x.dpd : x.dueIn) - (y.dpd ? -y.dpd : y.dueIn)) : rank(x) - rank(y); }); return a; }
  function cell(lbl, cls) { var s = el("span", cls || ""); s.appendChild(el("span", "lbl", lbl)); return s; }
  function trail(x) { var t = el("span", "trail"), on = 0, late = 0, m = []; x.hist.split("").forEach(function (h) { if (h === "L") late++; else on++; m.push("p" + (h === "L" ? " L" : "")); }); for (var i = 0; i < x.miss; i++) m.push("p x"); if (!x.paid && !x.dpd) m.push("p u"); var cut = Math.max(0, m.length - 12); if (cut) { t.appendChild(el("span", "more", "+" + cut)); t.title = cut + " earlier payments not drawn"; } m.slice(cut).forEach(function (c) { t.appendChild(el("span", c)); });
    t.setAttribute("role", "img"); t.setAttribute("aria-label", x.k ? x.k + " of " + x.n + " paid: " + on + " on time, " + late + " late" + (x.miss ? ", " + x.miss + " missed" : "") : "No payments yet"); return t; }
  function rows(focus) { var L = $("rows"), a = shown(); L.textContent = ""; $("shn").textContent = a.length + " of " + A.length + " accounts";
    var fl = $("fl"); fl.textContent = ""; if (F.b === null && F.day === null) fl.appendChild(el("span", "", "Showing every account. Pick a pigeonhole or a day above to narrow it.")); else { fl.appendChild(el("span", "", "Showing only:")); var cb = el("button", "", (F.b !== null ? BK[F.b] + (F.b && F.b < 5 ? " past due" : "") : "Due " + (F.day === 0 ? "today" : ds(day(F.day), { timeZone: "UTC", weekday: "long" }))) + "  ✕"); cb.type = "button"; cb.setAttribute("aria-label", "Clear this filter"); cb.addEventListener("click", function () { F.b = F.day = null; cabinet(); week(); rows(); $("q").focus(); }); fl.appendChild(cb); }
    a.forEach(function (x) { var li = el("li", open === x.id ? "open" : ""), r = el("div", "lr");
      var c1 = el("span"), ab = el("button", "ab", x.id); ab.type = "button"; ab.id = "a-" + x.id; ab.setAttribute("aria-expanded", String(open === x.id)); ab.setAttribute("aria-label", x.id + ", " + x.nm + ". Show details"); ab.addEventListener("click", function () { open = open === x.id ? null : x.id; rows(x.id); if (open) say(x.paid ? (x.clr === "issued" ? "Closed and cleared. Nothing owed." : "Paid in full. Their clearance is waiting on you.") : x.dpd > 60 ? x.nm + ": " + x.miss + " payments missed. Flagged, and you were told." : x.dpd ? x.nm + " is " + x.dpd + " days late." : x.isNew ? "Opened today. First payment is a month away." : x.hist.indexOf("L") > -1 ? "Current now, but late before. Worth a glance each month." : "Never late. Good account.", x.dpd > 60 ? "alert" : x.paid ? "nod" : "down"); }); c1.appendChild(ab); r.appendChild(c1);
      var c2 = el("span", "nm", x.nm); if (x.isNew) c2.appendChild(el("span", "new", "Opened today")); c2.appendChild(el("small", "", x.prod + " · " + peso(x.P) + " · " + x.n + " months")); r.appendChild(c2);
      var c3 = cell("Principal left", "r"); c3.appendChild(document.createTextNode(x.paid ? "nil" : peso(x.bal))); r.appendChild(c3);
      var c4 = cell("Next due", "due"); if (x.paid) c4.appendChild(document.createTextNode("closed " + ds(day(x.closed), { timeZone: "UTC", month: "short", day: "numeric" }))); else { c4.appendChild(document.createTextNode(x.dpd ? "was " + ds(day(-x.dpd), { timeZone: "UTC", month: "short", day: "numeric" }) : x.dueIn === 0 ? "today" : ds(day(x.dueIn), { timeZone: "UTC", month: "short", day: "numeric" }))); c4.appendChild(el("small", "", peso(x.pay))); } r.appendChild(c4);
      var c5 = cell("Standing"), st = el("span", "stt", x.paid ? "Fully paid" : x.dpd ? x.dpd + (x.dpd === 1 ? " day" : " days") + " past due" : "Current"); st.style.setProperty("--c", "var(" + BC[x.b] + ")"); c5.appendChild(st); if (x.dpd) c5.appendChild(el("small", "", peso(x.pd + x.pen) + " overdue")); if (x.paid && x.clr === "issued") c5.appendChild(el("small", "", "clearance issued")).style.color = "#2c5a38"; r.appendChild(c5);
      var c6 = cell("Payment trail, oldest first", "tr"); c6.appendChild(trail(x)); r.appendChild(c6); li.appendChild(r);
      if (open === x.id) li.appendChild(peek(x)); L.appendChild(li); });
    var e = $("empty"); e.hidden = a.length > 0; if (!a.length) e.textContent = "No account matches. Clear the search or the filter above.";
    if (focus && $("a-" + focus)) $("a-" + focus).focus(); }
  function peek(x) { var p = el("div", "peek"), l = el("div"), r = el("div"); r.style.cssText = "display:grid;gap:8px;align-content:start";
    var rep = x.P - x.bal; l.appendChild(el("p", "", "Principal repaid: " + peso(rep) + " of " + peso(x.P) + " (" + (rep / x.P * 100).toFixed(0) + "%)")); var pg = el("div", "prog"), pi = el("i"); pi.style.setProperty("--w", (rep / x.P * 100).toFixed(1) + "%"); pg.appendChild(pi); pg.setAttribute("aria-hidden", "true"); l.appendChild(pg);
    var d = el("dl", "rcd"); [["Payments", x.k + " of " + x.n + " made, " + peso(x.pay) + " each"], ["Interest", x.rate != null ? Math.round(x.rate * 10000) / 100 + "% a month, " + (x.method === "flat" ? "flat" : "diminishing balance") : "1.5% a month, diminishing balance"], ["Sales agent", x.agent], ["Account officer", ME]].forEach(function (z) { d.appendChild(el("dt", "", z[0])); d.appendChild(el("dd", "", z[1])); }); l.appendChild(d); p.appendChild(l);
    if (x.dpd) { var f = el("p", "flag"); f.appendChild(el("b", "", "Past-due flag raised")); f.appendChild(document.createTextNode(x.miss + (x.miss === 1 ? " installment" : " installments") + " unpaid: " + peso(x.pd) + ", plus " + peso(x.pen) + " in late penalties. Oldest was due " + ds(day(-x.dpd)) + "." + (LIVE ? " CALMS flags it; it does not collect." : " You and " + x.agent + " were notified. CALMS does not collect."))); r.appendChild(f); }
    else if (x.paid) { r.appendChild(el("p", "", LIVE ? "Paid in full. The account is closed." : "Balance reached zero on " + ds(day(x.closed)) + ", interest and penalties included. The account is closed.")); if (x.clr === "issued") r.appendChild(el("span", "stamp green" + (x.just ? " slam" : ""), "Clearance issued")).style.justifySelf = "start"; x.just = false; }
    else r.appendChild(el("p", "", x.isNew ? "Released today. The payment schedule was issued to the borrower by email. First payment of " + peso(x.pay) + " is due " + ds(day(x.dueIn)) + "." : "In good standing. Next payment of " + peso(x.pay) + " is due " + (x.dueIn === 0 ? "today" : ds(day(x.dueIn))) + "."));
    p.appendChild(r); var ac = el("div", "acts"); function b(t, cls, fn) { var z = el("button", "btn " + cls, t); z.type = "button"; z.addEventListener("click", fn); ac.appendChild(z); return z; }
    b("Open account", "grn", function () { if (LIVE) { location.href = "loan-account.html?no=" + x.id; return; } $("note").textContent = "Prototype: the Loan account page for " + x.id + " is not built yet."; });
    if (LIVE) { var pp = function (path, what, bt) { bt.setAttribute("aria-disabled", "true"); CALMS.api(path[0], path[1], path[0] === "POST" ? {} : undefined).then(function (d) { bt.removeAttribute("aria-disabled"); CALMS.printPaper(d); $("note").textContent = what + " " + d.number + " was downloaded as a PDF."; }, function (e) { bt.removeAttribute("aria-disabled"); $("note").textContent = e.message; }); };
      if (!x.paid) { var sb = b("Statement of account", "ink", function () { pp(["POST", "/api/loan-accounts/" + x.id + "/statement"], "Statement of account", sb); }); b("Post a payment", "ink", function () { location.href = "post-payment.html?no=" + x.id; }); }
      else { var cb = b("Clearance", "ink", function () { CALMS.api("GET", "/api/loan-accounts/" + x.id + "/clearance").then(function (d) { if (d.clearance) pp(["GET", "/api/papers/" + d.clearance.number], "Clearance", cb); else pp(["POST", "/api/loan-accounts/" + x.id + "/clearance"], "Clearance", cb); }); }); }
      p.appendChild(ac); return p; }
    if (!x.paid) { b("Statement of account", "ink", function () { $("note").textContent = "Prototype: the statement for " + x.id + " would open here, ready to email or print for " + x.agent + " to deliver."; }); b("Post a payment", "ink", function () { $("note").textContent = "Prototype: the Post payment page is not built yet."; }); }
    else if (x.clr === "ready") b("Issue clearance record", "ink", function () { x.clr = "issued"; x.just = true; $("note").textContent = "Clearance record issued for " + x.id + ", " + x.nm + ". It can be printed or emailed from the account page."; rows(x.id); say("Cleared. " + x.nm + " owes this house nothing.", "nod"); }).id = "clr";
    else b("View clearance record", "ink", function () { $("note").textContent = "Prototype: the clearance record for " + x.id + " would open here."; });
    p.appendChild(ac); return p; }
  function all() { counters(); cabinet(); week(); rows(); }
  $("q").addEventListener("input", function () { F.q = this.value; rows(); }); $("prod").addEventListener("change", function () { F.prod = this.value; rows(); }); $("sort").addEventListener("change", function () { F.sort = this.value; rows(); });
  var HELLO = "Six accounts are late. I watch them and flag them. I do not chase them.";
  if (LIVE) { var nl = LIVE.accounts.filter(function (x) { return x.daysPastDue > 0; }).length; HELLO = nl ? nl + (nl === 1 ? " account is" : " accounts are") + " late. I watch them and flag them. I do not chase them." : "Everyone is paying as agreed. Enjoy it while it lasts.";
    var rs = $("reset"); if (rs) rs.style.display = "none"; var ft = document.querySelectorAll(".foot span"); if (ft[1]) ft[1].textContent = "Live records as of today. Penalties and days past due are worked out by the server."; }
  $("reset").addEventListener("click", function () { fresh(); $("q").value = ""; $("prod").value = ""; $("sort").value = "att"; $("note").textContent = ""; all(); say(HELLO, ""); });
  var NAV = [["My Queue", 0], ["Loan accounts", 1], ["Payments", 0], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"); x.href = "#"; x.appendChild(el("span", "plate", n[0])); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  fresh(); all(); say(HELLO, "");
}
