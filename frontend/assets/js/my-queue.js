/* Online, the notices on the board are the signed-in person's real work from GET /api/queue, oldest first, and
   each button opens the screen that does the job. Opened from the folder, the sample roles are used. */
(function () {
  if (!window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/queue").then(start, function (err) { if (err.status === 401 || CALMS.unreachable(err)) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample board instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var NAV = [["My Queue", "q"], ["Applications", "a"], ["New application", "n"], ["Review queue", "r"], ["Counter-offers", "c"], ["Disbursement", "d"], ["Loan accounts", "l"], ["Reports", "p"], ["Audit log", "u"], ["Administration", "s"], ["Notifications", "t"]];
  /* item: [ref, who, product, amount, term, kind, hours waited, stamp, tone, action, why] */
  var ROLES = {
    processor: { title: "Loan Processor", name: "Liza Mendoza", nav: "qant", bell: 5, extra: ["Submitted today", 4],
      kinds: { draft: "Drafts to finish", docs: "Documents outstanding", back: "Returned to you", verify: "Yours to verify" },
      items: [
        ["APP-2026-0412", "Ramon Dela Cruz", "Salary loan", 85000, "18 months", "back", 61, "Returned for correction", "red", "Fix and resubmit", "Verifier: monthly income on the pay stub is 32,500.00, encoded as 35,200.00."],
        ["APP-2026-0398", "Teresita Villanueva", "SME loan", 450000, "36 months", "docs", 52, "2 documents missing", "red", "Open checklist", "Still needed: business permit, latest bank statement."],
        ["APP-2026-0431", "Jerome Pascual", "Personal loan", 60000, "12 months", "draft", 47.975, "Draft", "brown", "Resume draft", "Employment details and consent form not yet encoded."],
        ["APP-2026-0436", "Carmela Bautista", "Salary loan", 120000, "24 months", "verify", 19, "Encoded", "blue", "Verify against documents", "Encoded by A. Soriano. You cannot verify your own entries."],
        ["APP-2026-0440", "Nestor Aguilar", "SME loan", 300000, "24 months", "back", 9, "Rejected", "red", "Read the reason", "Underwriter: debt-to-income ratio of 58% is above the 45% limit for this product."],
        ["APP-2026-0444", "Marivic Santos-Lim", "Personal loan", 40000, "6 months", "draft", 3, "Draft", "brown", "Resume draft", "Signed consent form not yet uploaded."],
        ["APP-2026-0445", "Danilo Francisco", "Salary loan", 95000, "18 months", "docs", 2, "1 document missing", "brown", "Open checklist", "Still needed: certificate of employment."]
      ] },
    underwriter: { title: "Lead Underwriter", name: "Antonio Reyes", nav: "qarcpt", bell: 3, extra: ["Your approval limit", "500,000.00"],
      kinds: { review: "Manual review", counter: "Counter-offer declined", above: "Escalated to you" },
      items: [
        ["APP-2026-0377", "Lourdes Magbanua", "SME loan", 480000, "36 months", "review", 50, "High risk", "red", "Open assessment", "FinScore was unavailable after 3 retries. Routed for manual review."],
        ["APP-2026-0402", "Felipe Guevarra", "Salary loan", 150000, "24 months", "counter", 31, "Declined by borrower", "red", "Revise or reject", "Offer 2: 110,000.00 for 18 months was declined on 5 October."],
        ["APP-2026-0419", "Rosalinda Ocampo", "Personal loan", 75000, "12 months", "review", 47.975, "Moderate risk", "blue", "Open assessment", "Debt-to-income 41%. Credit memo ready."],
        ["APP-2026-0425", "Crisanto Navarro", "SME loan", 350000, "24 months", "above", 14, "Above analyst limit", "blue", "Open assessment", "Endorsed by M. Tolentino with credit memo. Critical priority."],
        ["APP-2026-0433", "Imelda Pangilinan", "Salary loan", 90000, "12 months", "review", 6, "Moderate risk", "blue", "Open assessment", "Two tradelines 30 days past due in the last year."]
      ] },
    disbursement: { title: "Disbursement Officer", name: "Corazon Ilagan", nav: "qdt", bell: 2, extra: ["Released today", "385,000.00"],
      kinds: { payout: "Payout details to verify", release: "Ready to release" },
      items: [
        ["APP-2026-0361", "Benigno Salazar", "Salary loan", 100000, "24 months", "payout", 49, "Name mismatch", "red", "Verify payout details", "Bank account name differs from the ID on file by one middle initial."],
        ["APP-2026-0388", "Maricel Dumalagan", "Personal loan", 50000, "12 months", "release", 44, "Signed agreement on file", "green", "Release loan", "Net proceeds 48,250.00 after charges."],
        ["APP-2026-0405", "Eduardo Catacutan", "SME loan", 400000, "36 months", "release", 11, "Signed agreement on file", "green", "Release loan", "Net proceeds 388,000.00 after charges."],
        ["APP-2026-0417", "Josefina Abad", "Salary loan", 65000, "12 months", "payout", 4, "Accepted by borrower", "blue", "Verify payout details", "E-wallet number supplied by the sales agent."]
      ] },
    account: { title: "Loan Account Officer", name: "Rodel Macaraeg", nav: "qlpt", bell: 6, extra: ["Payments posted today", 14],
      kinds: { post: "Payments to post", late: "Newly past due", soa: "Statements requested" },
      items: [
        ["LN-2025-1184", "Herminia Cabrera", "Salary loan", 4850, "Installment 9 of 24", "late", 72, "31 to 60 days", "red", "Open account", "Moved into the 31 to 60 day bucket on 4 October."],
        ["LN-2026-0092", "Wilfredo Tan", "SME loan", 15300, "Installment 4 of 36", "post", 41, "Bank transfer", "blue", "Post payment", "Reference BT-88213 in yesterday's bank report, not yet matched."],
        ["LN-2025-1320", "Analyn Robles", "Personal loan", 5200, "Installment 6 of 12", "late", 25, "1 to 30 days", "red", "Open account", "Due 6 October. No payment in any channel report."],
        ["LN-2026-0140", "Gregorio Lacson", "Salary loan", 6100, "Installment 2 of 18", "post", 5, "Salary deduction", "blue", "Post payment", "Employer remittance file received this morning."],
        ["LN-2025-0977", "Perla Montemayor", "Salary loan", 0, "Fully paid", "soa", 3, "Clearance due", "green", "Issue clearance", "Balance reached zero on 6 October."]
      ] },
    agent: { title: "Sales Agent", name: "Jun Espiritu", nav: "qact", bell: 4, extra: ["Borrowers in progress", 11],
      kinds: { offer: "Counter-offers to deliver", relay: "News to relay" },
      items: [
        ["APP-2026-0391", "Vicente Alcantara", "Salary loan", 80000, "Asked for 120,000.00", "offer", 55, "Awaiting borrower", "red", "Record the response", "Offer 1: 80,000.00 for 18 months. Proof of the borrower's answer is required."],
        ["APP-2026-0409", "Norma Estrella", "SME loan", 250000, "Asked for 300,000.00", "offer", 45, "Awaiting borrower", "blue", "Record the response", "Offer 1: 250,000.00 for 24 months at the same rate."],
        ["APP-2026-0398", "Teresita Villanueva", "SME loan", 450000, "36 months", "relay", 12, "2 documents missing", "brown", "See what is needed", "Ask her for the business permit and latest bank statement."],
        ["APP-2026-0388", "Maricel Dumalagan", "Personal loan", 50000, "12 months", "relay", 2, "Approved", "green", "See the terms", "No email on file. Tell her in person that release is scheduled."]
      ] },
    auditor: { title: "Compliance Auditor", name: "Atty. Regina Sy", nav: "qaput", bell: 1, extra: ["Access", "Read only"],
      kinds: { over: "Overrides to review", exc: "Exceptions" },
      items: [
        ["APP-2026-0352", "Override by A. Reyes", "Salary loan", 180000, "Auto-decline overridden", "over", 40, "Override", "red", "Open the record", "Remark: employer guarantee letter on file. Rule set version 14."],
        ["APP-2026-0370", "Override by M. Tolentino", "SME loan", 320000, "Risk tier lowered", "over", 39, "Override", "blue", "Open the record", "Remark: audited statements show stronger cash flow than encoded."],
        ["LN-2025-1102", "Payment reversal", "Personal loan", 5200, "Posted by R. Macaraeg", "exc", 8, "Reversal", "blue", "Open the record", "Reason: duplicate posting of reference OTC-55120."],
        ["USR-0031", "Five failed sign-ins", "User account", 0, "Account locked", "exc", 2, "Locked", "brown", "Open the record", "Five failed attempts from one address at 08:14."]
      ] },
    admin: { title: "System Administrator", name: "Paolo Ventura", nav: "qpust", bell: 2, extra: ["Integrations up", "5 of 6"],
      kinds: { acct: "Accounts", sys: "System health" },
      items: [
        ["INT-FINSCORE", "FinScore credit bureau", "Integration", 0, "3 failed inquiries", "sys", 50, "Degraded", "red", "Open system health", "Applications are falling back to manual review while this lasts."],
        ["USR-0031", "D. Aquino, Loan Processor", "User account", 0, "Locked after 5 attempts", "acct", 2, "Locked", "brown", "Open the account", "Unlock only through the recovery procedure."],
        ["USR-0044", "New hire: K. Bernardo", "User account", 0, "Role: Sales Agent", "acct", 43, "To create", "blue", "Create the account", "Requested by the sales supervisor."],
        ["JOB-SMS-RETRY", "SMS gateway", "Scheduled job", 0, "7 messages queued", "sys", 1, "Retrying", "blue", "Open system health", "Delivery retries every 15 minutes."]
      ] }
  };
  function liveRole(L) { return { title: L.title, name: L.name, nav: "", bell: L.unread, extra: L.extra, kinds: L.kinds,
    items: L.items.map(function (x) { return [x.ref, x.who, x.prod, x.amt, x.term, x.kind, x.escalated ? Math.max(x.hours, L.limitHours) : x.hours, x.stamp, x.tone, x.act, x.why, x.page]; }) }; }
  if (LIVE) { ROLES = {}; ROLES[LIVE.role] = liveRole(LIVE); }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var HRS = LIVE ? LIVE.limitHours : 48, T0 = Date.now(), LIMIT = HRS * 3600, FUSE = Math.max(1, HRS - 12) * 3600;
  function go(page) { location.href = page.replace(/^([a-z-]+)/, "$1.html"); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function secs(it) { return it.s0 + (Date.now() - T0) / 1000; }
  function waited(s) { var h = Math.floor(s / 3600), d = Math.floor(h / 24); return d ? d + "d " + (h % 24) + "h" : h ? h + "h" : Math.floor(s / 60) + "m"; }
  function mmss(s) { s = Math.max(0, Math.ceil(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + "h " : "") + (h || m ? m + "m " : "") + (h ? "" : x + "s"); }
  function mix(a, b, t) { var p = function (c, i) { return parseInt(c.substr(1 + i * 2, 2), 16); }, o = "#"; for (var i = 0; i < 3; i++) o += ("0" + Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16)).slice(-2); return o; }
  function edge() {
    var p = [], j = function () { return (Math.random() * 2.6).toFixed(1) + "px"; }, i;
    for (i = 0; i <= 8; i++) p.push((i * 12.5) + "% " + j());
    for (i = 1; i <= 5; i++) p.push("calc(100% - " + j() + ") " + (i * 14) + "%");
    p.push("100% calc(100% - var(--c))"); p.push("calc(100% - var(--c)) 100%");
    for (i = 7; i >= 0; i--) p.push((i * 12.5) + "% calc(100% - " + j() + ")");
    for (i = 6; i >= 1; i--) p.push(j() + " " + (i * 14) + "%");
    return "polygon(" + p.join(",") + ")";
  }
  /* build state: every role keeps its own list, order and desk */
  var STATE = {};
  function build(k) {
    STATE[k] = ROLES[k].items.map(function (x, i) {
      return { id: k + i, ref: x[0], who: x[1], prod: x[2], amt: x[3], term: x[4], kind: x[5], s0: Math.round(x[6] * 3600), stamp: x[7], tone: x[8], act: x[9], why: x[10], page: x[11],
               desk: false, done: false, late: x[6] >= HRS, edge: edge(), r: (Math.random() * 2.2 - 1.1), pin: i % 3, ring: (20 + Math.random() * 60).toFixed(0) + "% " + (25 + Math.random() * 50).toFixed(0) + "%" };
    }).sort(function (a, b) { return b.s0 - a.s0; });
  }
  Object.keys(ROLES).forEach(build);
  var role = "processor", filter = "all", view = "board", custom = false;
  try { role = localStorage.getItem("calmsRole") || role; view = localStorage.getItem("calmsView") || view; } catch (e) {}
  if (LIVE) role = LIVE.role;
  if (!ROLES[role]) role = "processor";
  var grid = $("grid"), desk = $("desk"), wrap = $("wrap"), kuwa = $("kuwa"), says = $("says"), ledger = $("ledger"), board = $("board");
  function live() { return STATE[role].filter(function (x) { return !x.done; }); }
  function byId(id) { return STATE[role].filter(function (x) { return x.id === id; })[0]; }

  /* ---- Kuwa on the frame ---- */
  var MOODS = { glare: [[28, 2400], [3, 110]], idle: [[0, 1800], [1, 700], [0, 1200], [3, 110]], alert: [[22, 80], [23, 650], [24, 1400], [28, 1600]], sleep: [[13, 900], [14, 900], [15, 900]], tap: [[18, 140], [19, 220], [18, 140], [19, 220], [18, 140], [24, 900]] };
  var kT = null, kLeft = -1, kMood = "";
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function mood(m, then) { clearTimeout(kT); kMood = m; var seq = MOODS[m], i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  function perch(text, m, tapFirst) {
    var w = wrap.clientWidth, target = w / 2 - 48, first = null;
    if (view === "board") { var shown = [].slice.call(grid.querySelectorAll(".notice:not(.gone)")); var best = -1; shown.forEach(function (n) { var it = byId(n.dataset.id); if (it && secs(it) > best) { best = secs(it); first = n; } }); }
    if (first) target = first.offsetLeft + board.offsetLeft + first.offsetWidth / 2 - 48 + 10;
    target = Math.max(0, Math.min(w - 96, target));
    var right = target < w * .5;
    says.textContent = text; says.style.left = right ? (target + 104) + "px" : "auto"; says.style.right = right ? "auto" : (w - target + 8) + "px";
    var settle = function () { kuwa.classList.remove("walk"); if (tapFirst) mood("tap", function () { mood(m); }); else mood(m); };
    if (kLeft < 0 || reduce || Math.abs(target - kLeft) < 6) { kuwa.style.left = target + "px"; kLeft = target; settle(); return; }
    clearTimeout(kT); kFrame(target > kLeft ? 39 : 41); kuwa.classList.add("walk"); kuwa.style.left = target + "px"; kLeft = target; kT = setTimeout(settle, 820);
  }
  function speak(tapFirst) {
    var L = live(), on = L.filter(function (x) { return !x.desk && (filter === "all" || x.kind === filter); }), late = on.filter(function (x) { return x.late; });
    wrap.classList.toggle("cleared", !L.length);
    if (!L.length) return perch("Board's clear. Lamp's lit. Do not wake me.", "sleep");
    if (!on.length) return perch(filter === "all" ? "Everything left is on your desk. Get to it." : "Nothing of that kind. Look elsewhere.", "idle");
    if (late.length) return perch((late.length === 1 ? "This one has" : late.length + " have") + " sat past " + HRS + " hours. Your supervisor knows. Start here.", "alert", tapFirst);
    perch("Nothing overdue. Oldest is under me. Start here.", "glare", tapFirst);
  }

  /* ---- the wall objects ---- */
  function flip(box, n) {
    var s = String(n).length < 2 ? "0" + n : String(n), old = box.dataset.v || "";
    if (old === s) return; box.dataset.v = s; box.textContent = "";
    s.split("").forEach(function (c, i) { var d = el("span", old && old[i] !== c ? "turn" : "", c); box.appendChild(d); });
    box.setAttribute("aria-label", String(n));
  }
  function wall() {
    var R = ROLES[role], L = live(), late = L.filter(function (x) { return x.late; }).length, oldest = L.reduce(function (m, x) { return Math.max(m, secs(x)); }, 0);
    flip($("fWait"), L.length); flip($("fLate"), late);
    var t = $("tOld"); t.textContent = L.length ? waited(oldest) : "none"; t.classList.toggle("bad", oldest >= LIMIT);
    $("xCap").textContent = R.extra[0];
    var sl = $("slate"); sl.textContent = "";
    if (typeof R.extra[1] === "number") { var n = R.extra[1], ty = el("div", "tally"); ty.setAttribute("aria-label", String(n)); for (var g = 0; g < Math.ceil(n / 5); g++) { var c = Math.min(5, n - g * 5), u = el("u", c === 5 ? "five" : ""); for (var k = 0; k < Math.min(c, 4); k++) u.appendChild(el("i")); ty.appendChild(u); } sl.appendChild(ty); }
    else sl.textContent = R.extra[1];
    var nq = document.querySelector("#nav [aria-current] .plate i"); if (nq) nq.textContent = String(L.length);
  }
  function chrome() {
    var R = ROLES[role], now = new Date(), h = now.getHours();
    $("hello").textContent = (h < 12 ? "Good morning, " : h < 18 ? "Good afternoon, " : "Good evening, ") + R.name.split(" ")[R.name.indexOf("Atty.") === 0 ? 1 : 0] + ".";
    $("whoName").textContent = R.name; $("whoRole").textContent = R.title;
    var cal = $("cal"); cal.textContent = ""; cal.appendChild(el("b", "", now.toLocaleDateString("en-PH", { month: "short" }).toUpperCase())); cal.appendChild(el("strong", "", String(now.getDate()))); cal.appendChild(el("span", "", now.toLocaleDateString("en-PH", { weekday: "long" })));
    cal.setAttribute("aria-label", now.toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }));
    var nav = $("nav"); if (!LIVE) nav.textContent = "";
    if (!LIVE) NAV.forEach(function (n) {
      if (R.nav.indexOf(n[1]) < 0) return;
      var li = el("li"), a = el("a"), p = el("span", "plate", n[0]); a.href = "#"; a.appendChild(p);
      if (n[1] === "q") { a.setAttribute("aria-current", "page"); p.appendChild(el("i", "", "0")); } else { a.setAttribute("aria-disabled", "true"); a.title = "Not built yet"; }
      if (n[1] === "t") p.appendChild(el("i", "", String(R.bell)));
      a.addEventListener("click", function (e) { e.preventDefault(); if (n[1] !== "q") $("note").textContent = "Prototype: the " + n[0] + " drawer is not built yet."; });
      li.appendChild(a); nav.appendChild(li);
    });
    /* the window: the town at this hour */
    var part = h >= 5 && h < 8 ? ["dawn", "rgba(255,196,150,.75)", 62] : h >= 8 && h < 16 ? ["day", "rgba(255,255,255,0)", 18 + Math.abs(12 - h) * 5] : h >= 16 && h < 19 ? ["sunset", "rgba(255,170,110,.55)", 58] : ["night", "rgba(40,36,92,.9)", 120];
    $("wtint").style.background = part[1]; $("wsun").style.top = part[2] + "%"; $("wsun").style.left = (h < 12 ? 22 : h < 16 ? 46 : 62) + "%";
    $("wga").style.opacity = $("wgb").style.opacity = part[0] === "night" ? 1 : part[0] === "day" ? 0 : .7;
    $("wincap").textContent = "Main street, " + (part[0] === "day" ? "daytime" : part[0]) + ". Follows your clock.";
  }

  /* ---- notices ---- */
  function notice(it, fresh, n) {
    var R = ROLES[role], s = secs(it), age = Math.min(1, s / (72 * 3600));
    var li = el("li", "notice p" + it.pin + (it.late ? " late" : "") + (fresh ? " drop" : "")); li.dataset.id = it.id;
    li.style.setProperty("--r", (it.r * (1 + age)).toFixed(2) + "deg"); if (fresh) li.style.animationDelay = (n * 70) + "ms";
    li.appendChild(el("span", "pin"));
    var sh = el("div", "sheet"); sh.style.setProperty("--edge", it.edge);
    var cs = getComputedStyle(document.documentElement); sh.style.setProperty("--tone", mix(cs.getPropertyValue("--paper").trim(), cs.getPropertyValue("--paper-old").trim(), age));
    if (s > 24 * 3600) sh.style.setProperty("--ring", "radial-gradient(circle at " + it.ring + ", transparent 17px, rgba(120,72,30,.2) 18px, rgba(120,72,30,.2) 20.5px, transparent 21.5px)");
    var g = el("div", "grip", R.kinds[it.kind]); g.title = "Drag to move"; g.appendChild(el("span", "wait", "")); sh.appendChild(g);
    var fz = el("div", "fuse"); fz.hidden = true; fz.appendChild(el("b")); fz.appendChild(el("i")); sh.appendChild(fz);
    var so = el("div", "soon"); so.hidden = true; sh.appendChild(so);
    sh.appendChild(el("h3", "name", it.who));
    if (it.amt) sh.appendChild(el("div", "amt", peso(it.amt)));
    sh.appendChild(el("div", "meta", it.prod + " · " + it.term));
    sh.appendChild(el("div", "ref", it.ref));
    var st = el("div", "stamps"); st.appendChild(el("span", "stamp " + it.tone, it.stamp)); if (it.late) st.appendChild(el("span", "stamp red esc", "Escalated")); sh.appendChild(st);
    sh.appendChild(el("p", "why", it.why));
    var b = el("button", "act" + (role === "auditor" ? " quiet" : ""), it.act); b.type = "button"; b.addEventListener("click", function () { finish(it, li); }); sh.appendChild(b);
    var mv = el("button", "move", it.desk ? "Back to the board" : "Take to my desk"); mv.type = "button"; mv.addEventListener("click", function () { it.desk = !it.desk; custom = true; draw(false); $("note").textContent = it.desk ? it.who + " is on your desk." : it.who + " is back on the board."; }); sh.appendChild(mv);
    li.appendChild(sh); drag(li, g, it); return li;
  }
  function finish(it, li) {
    if (LIVE) { go(it.page); return; }
    if (li.querySelector(".done")) return;
    $("note").textContent = "Prototype: “" + it.act + "” would open " + it.ref + ". Marked done here so you can watch the board clear.";
    li.appendChild(el("div", "done", "Done"));
    setTimeout(function () { li.classList.add("gone"); }, reduce ? 0 : 420);
    setTimeout(function () { it.done = true; draw(false); }, reduce ? 10 : 980);
  }
  function tick() {
    var crossed = null;
    STATE[role].forEach(function (it) {
      if (it.done) return; var s = secs(it);
      if (!it.late && s >= LIMIT) { it.late = true; crossed = it; }
      [].forEach.call(document.querySelectorAll('[data-id="' + it.id + '"]'), function (n) {
        var w = n.querySelector(".wait, .w"); if (w) w.textContent = (n.tagName === "TR" ? "" : "waiting ") + waited(s);
        var fz = n.querySelector(".fuse"); if (!fz) return;
        var on = s >= FUSE && s < LIMIT, so = n.querySelector(".soon"); fz.hidden = so.hidden = !on;
        if (on) { var f = (s - FUSE) / (LIMIT - FUSE) * 100; fz.firstChild.style.width = f + "%"; fz.lastChild.style.left = f + "%"; so.textContent = "escalates in " + mmss(LIMIT - s); }
      });
    });
    if (crossed) {
      [].forEach.call(document.querySelectorAll('[data-id="' + crossed.id + '"]'), function (n) { n.classList.add("late"); var st = n.querySelector(".stamps"); if (st) st.appendChild(el("span", "stamp red esc slam", "Escalated")); });
      $("note").textContent = crossed.ref + " just passed " + HRS + " hours. Your supervisor has been notified.";
      wall(); speak(true);
    } else { var L = live(), t = $("tOld"); if (L.length) t.textContent = waited(L.reduce(function (m, x) { return Math.max(m, secs(x)); }, 0)); }
  }
  function bare(text, sub) {
    var b = el("li", "bare"); b.style.gridColumn = "1 / -1";
    for (var i = 0; i < 16; i++) { var u = el("u"); u.style.left = (4 + Math.random() * 92) + "%"; u.style.top = (6 + Math.random() * 88) + "%"; b.appendChild(u); }
    var d = el("div"); d.appendChild(el("b", "", text)); d.appendChild(document.createTextNode(sub)); b.appendChild(d); return b;
  }
  function draw(fresh) {
    var R = ROLES[role], L = live();
    var chips = $("chips"); chips.textContent = "";
    [["all", "Everything", L.length]].concat(Object.keys(R.kinds).map(function (k) { return [k, R.kinds[k], L.filter(function (x) { return x.kind === k; }).length]; })).forEach(function (c) {
      var b = el("button", "", c[1]); b.type = "button"; b.appendChild(el("b", "", String(c[2]))); b.setAttribute("aria-pressed", String(filter === c[0]));
      b.addEventListener("click", function () { filter = c[0]; draw(false); }); chips.appendChild(b);
    });
    $("vBoard").setAttribute("aria-pressed", String(view === "board")); $("vLedger").setAttribute("aria-pressed", String(view === "ledger"));
    board.hidden = view !== "board"; ledger.hidden = view !== "ledger"; $("deskBox").hidden = view !== "board"; $("work").style.gridTemplateColumns = view === "board" ? "" : "minmax(0, 1fr)";
    $("resetOrder").hidden = !custom;
    var shown = L.filter(function (x) { return filter === "all" || x.kind === filter; });
    grid.textContent = ""; desk.textContent = ""; ledger.textContent = "";
    if (view === "board") {
      var n = 0; shown.forEach(function (it) { (it.desk ? desk : grid).appendChild(notice(it, fresh, it.desk ? 0 : n++)); });
      if (!L.length) grid.appendChild(bare("Queue cleared.", "Nothing is waiting on you. Lock the drawer and go home."));
      else if (!grid.children.length) grid.appendChild(bare(filter === "all" ? "All of it is on your desk." : "Nothing of this kind.", filter === "all" ? "The board is empty until something new is pinned." : "Pick another filter."));
    } else {
      var tb = el("table"), hd = el("tr"); ["Waiting", "Borrower", "Kind", "Amount", "Status", ""].forEach(function (h, i) { var th = el("th", "", h); if (i === 3) th.style.textAlign = "right"; hd.appendChild(th); });
      var thead = el("thead"); thead.appendChild(hd); tb.appendChild(thead); var body = el("tbody");
      shown.forEach(function (it) {
        var tr = el("tr", it.late ? "late" : ""); tr.dataset.id = it.id;
        tr.appendChild(el("td", "n w", "")); var who = el("td", "", it.who); who.appendChild(el("small", "", it.ref + " · " + it.prod)); tr.appendChild(who);
        tr.appendChild(el("td", "", R.kinds[it.kind])); tr.appendChild(el("td", "n r", it.amt ? peso(it.amt) : "—"));
        tr.appendChild(el("td", "", it.stamp + (it.late ? " · Escalated" : "")));
        var td = el("td", "r"), b = el("button", "act" + (role === "auditor" ? " quiet" : ""), it.act); b.type = "button";
        b.addEventListener("click", function () { if (LIVE) { go(it.page); return; } $("note").textContent = "Prototype: “" + it.act + "” would open " + it.ref + ". That page is not built yet."; }); td.appendChild(b); tr.appendChild(td); body.appendChild(tr);
      });
      if (!shown.length) { var tr = el("tr"), td = el("td", "", L.length ? "Nothing of this kind." : "Queue cleared. Nothing is waiting on you."); td.colSpan = 6; tr.appendChild(td); body.appendChild(tr); }
      tb.appendChild(body); ledger.appendChild(tb);
    }
    wall(); tick(); speak(false);
  }

  /* ---- drag a notice by its top strip ---- */
  function drag(li, grip, it) {
    grip.addEventListener("pointerdown", function (e) {
      if (e.button) return;
      var sx = e.clientX, sy = e.clientY, ghost = null, r = li.getBoundingClientRect(), ox = sx - r.left, oy = sy - r.top;
      e.preventDefault();
      function move(ev) {
        if (!ghost) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; ghost = li.cloneNode(true); ghost.classList.add("ghost"); ghost.classList.remove("drop"); ghost.style.width = r.width + "px"; document.body.appendChild(ghost); li.classList.add("dragging"); }
        ghost.style.left = (ev.clientX - ox) + "px"; ghost.style.top = (ev.clientY - oy) + "px";
        var under = document.elementFromPoint(ev.clientX, ev.clientY); if (!under) return;
        var zone = under.closest("#grid, #desk, #deskBox"); grid.classList.remove("over"); desk.classList.remove("over"); if (!zone) return;
        if (zone.id === "deskBox") zone = desk; zone.classList.add("over");
        [].forEach.call(zone.querySelectorAll(".bare"), function (b) { b.remove(); });
        var other = under.closest(".notice");
        if (other && other !== li && other.parentNode === zone) { var q = other.getBoundingClientRect(), after = zone === desk ? ev.clientY > q.top + q.height / 2 : ev.clientX > q.left + q.width / 2; zone.insertBefore(li, after ? other.nextSibling : other); }
        else if (li.parentNode !== zone) zone.appendChild(li);
      }
      function up() {
        document.removeEventListener("pointermove", move); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up);
        grid.classList.remove("over"); desk.classList.remove("over");
        if (!ghost) return; ghost.remove(); li.classList.remove("dragging");
        var order = [].map.call(document.querySelectorAll("#grid .notice, #desk .notice"), function (n) { byId(n.dataset.id).desk = n.parentNode === desk; return n.dataset.id; });
        STATE[role].sort(function (a, b) { var i = order.indexOf(a.id), j = order.indexOf(b.id); return (i < 0 ? 999 : i) - (j < 0 ? 999 : j); });
        custom = true; draw(false); $("note").textContent = it.who + (it.desk ? " is on your desk." : " moved. The board is in your order now.");
      }
      document.addEventListener("pointermove", move); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    });
  }

  /* ---- controls ---- */
  var sel = $("role");
  Object.keys(ROLES).forEach(function (k) { var o = el("option", "", ROLES[k].title); o.value = k; sel.appendChild(o); });
  sel.value = role;
  sel.addEventListener("change", function () { role = sel.value; filter = "all"; custom = false; kLeft = -1; try { localStorage.setItem("calmsRole", role); } catch (e) {} chrome(); draw(true); });
  function setView(v) { view = v; try { localStorage.setItem("calmsView", v); } catch (e) {} draw(false); }
  $("vBoard").addEventListener("click", function () { setView("board"); }); $("vLedger").addEventListener("click", function () { setView("ledger"); });
  $("resetOrder").addEventListener("click", function () { STATE[role].sort(function (a, b) { return b.s0 - a.s0; }); custom = false; draw(false); });
  $("restore").addEventListener("click", function () { STATE[role].forEach(function (x) { x.done = false; x.desk = false; }); STATE[role].sort(function (a, b) { return b.s0 - a.s0; }); custom = false; filter = "all"; draw(true); $("note").textContent = "Everything is pinned back on the board."; });
  window.addEventListener("resize", function () { kLeft = -1; speak(false); });
  if (LIVE) { var pl = document.querySelector("label.proto"); if (pl) pl.style.display = "none"; $("restore").style.display = "none";
    var ft = document.querySelectorAll(".foot span"); if (ft[0] && ft[0].firstChild) ft[0].firstChild.nodeValue = "A red pin means it has sat more than " + HRS + " hours at one step and the Operations Manager has been told. ";
    if (ft[1]) ft[1].textContent = "Your real work, oldest first. Drag notices to your desk to plan your day; the order is only kept on this screen.";
    /* Every two minutes: if the work has changed, pin the new board. */
    setInterval(function () { if (document.hidden) return; CALMS.api("GET", "/api/queue").then(function (d) { var was = STATE[role].filter(function (x) { return !x.done; }).map(function (x) { return x.ref + x.kind; }).sort().join(), now = d.items.map(function (x) { return x.ref + x.kind; }).sort().join();
      ROLES[role].bell = d.unread; if (was === now) return; var desk0 = {}; STATE[role].forEach(function (x) { if (x.desk) desk0[x.ref + x.kind] = 1; }); ROLES[role] = liveRole(d); build(role); STATE[role].forEach(function (x) { if (desk0[x.ref + x.kind]) x.desk = true; }); custom = false; draw(true); $("note").textContent = "Your queue was updated."; }, function () {}); }, 120000); }
  chrome(); draw(true); setInterval(tick, 1000);
}
