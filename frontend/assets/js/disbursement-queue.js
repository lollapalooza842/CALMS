/* Online, the shelf comes from GET /api/disbursements: accepted loans whose signed agreement is locked are on the
   shelf, the others are held back with the reason, and today's releases are in the ledger. Opening a box goes to
   Release loan for that application. Opened from the folder, the sample shelf is used. */
(function () {
  if (!window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/disbursements").then(start, function (err) { if (err.status === 401 || CALMS.unreachable(err)) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample shelf instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function hm(t) { return new Date(t).toLocaleString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }) + " PST"; }
  function t12(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return ((h + 11) % 12 + 1) + ":" + ("0" + m).slice(-2) + (h < 12 ? " AM" : " PM"); }
  var FEE = .033, ME = "Corazon Ilagan";
  var CH = {
    pn: { name: "PESONet", nick: "The three o'clock coach", rule: "Bank transfer, any amount. All of them go out in one run.", open: 9 * 3600, cut: 15 * 3600 },
    ip: { name: "InstaPay", nick: "Pony express", rule: "Bank or e-wallet, up to ₱ 50,000 each. Arrives in minutes.", always: true },
    cq: { name: "Cheque", nick: "Counter pickup", rule: "Collected at the branch, with a valid ID.", open: 9 * 3600, cut: 17 * 3600 },
    ca: { name: "Cash", nick: "Cash window", rule: "Paid at the counter, up to ₱ 50,000.", open: 9 * 3600, cut: 16.5 * 3600 }
  }, ORDER = ["pn", "ip", "cq", "ca"];
  /* ---- the clock (Manila has no daylight saving, so UTC+8 is exact) ---- */
  var OFF = null, OFFT = 0;
  function now() { var d = new Date(Date.now() + 8 * 3600e3), s = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds(), dow = d.getUTCDay(); if (OFF != null) { s = (OFF + Math.floor((Date.now() - OFFT) / 1000)) % 86400; if (dow === 0 || dow === 6) dow = 3; } return { s: s, dow: dow }; }
  function chs(c) { var n = now(); if (c.always) return { open: true, leaves: "Runs all day", sub: "No cut-off", left: null };
    var wk = n.dow >= 1 && n.dow <= 5; if (wk && n.s < c.cut) return { open: true, leaves: "Leaves " + t12(c.cut), sub: "", left: c.cut - n.s, x: Math.max(0, Math.min(1, (n.s - c.open) / (c.cut - c.open))) };
    var nx = n.dow === 5 || n.dow === 6 ? "Monday" : "tomorrow";
    return { open: false, leaves: "Gone for today", sub: "Next: " + nx + ", " + t12(c.cut), left: -1, x: 1 }; }
  function cd(s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return h + ":" + ("0" + m).slice(-2) + ":" + ("0" + x).slice(-2); }
  /* ---- data ---- */
  var Q, HELD, LED, sel, F, warned;
  function freshLive() { var now0 = Date.now(), K = { PESONet: "pn", InstaPay: "ip", Cheque: "cq", Cash: "ca" };
    Q = LIVE.shelf.filter(function (x) { return x.ready; }).map(function (x) { return { id: x.reference, nm: x.borrower, idn: x.borrower, prod: x.product, amt: x.amount, net: x.net, term: x.term, ch: x.net > 50000 ? "pn" : "ip", bank: "Entered from her passbook at release", an: x.borrower, no: "typed twice at release", ver: null, wait: (now0 - new Date(x.since).getTime()) / 3600e3, claim: null, ok: ["underwriting"], fp: "" }; });
    HELD = LIVE.shelf.filter(function (x) { return !x.ready; }).map(function (x) { return { id: x.reference, nm: x.borrower, why: x.blocker, wh: "With the loan processor, for the signed agreement." }; });
    LED = LIVE.released.map(function (r) { var t = new Date(r.at).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }) + " PST"; return { t: t, acct: r.account, nm: r.borrower, net: r.net, ch: K[r.channel] || "pn", ref: r.ref, by: r.by, funded: t }; });
    sel = null; F = { ch: "", st: "all", q: "", sort: "wait" }; warned = false; }
  function fresh() { if (LIVE) { freshLive(); return; }
    Q = [
      { id: "APP-2026-0396", nm: "Arnel Bautista", idn: "Arnel Reyes Bautista", prod: "Personal loan", amt: 120000, term: 24, ch: "pn", bank: "BPI savings", an: "Arnel R. Bautista", no: "•••• •••• 3318", ver: { by: "N. Galang", h: 30 }, wait: 41.2, claim: null, ok: ["Maricar Tolentino"], fp: "9c41e07ab2d8" },
      { id: "APP-2026-0398", nm: "Ramon Dela Cruz", idn: "Ramon Santos Dela Cruz", prod: "Personal loan", amt: 40000, term: 12, ch: "ip", bank: "GCash", an: "Ramon S. Dela Cruz", no: "•••• ••• 2290", ver: { by: "C. Ilagan", h: 20 }, wait: 26.4, claim: null, ok: ["Benjie Cruz"], fp: "51fd0a77c3e9" },
      { id: "APP-2026-0405", nm: "Danilo Pangilinan", idn: "Danilo Sison Pangilinan", prod: "SME loan", amt: 450000, term: 36, ch: "pn", bank: "Metrobank current", an: "Pangilinan Hardware", no: "•••• •••• 8102", ver: null, differs: true, wait: 19.1, claim: null, ok: ["Antonio Reyes"], fp: "e2b7745d019a" },
      { id: "APP-2026-0402", nm: "Teresita Manalo", idn: "Teresita Cruz Manalo", prod: "Salary loan", amt: 80000, term: 18, ch: "cq", bank: "Cheque, Malolos branch", an: "Teresita C. Manalo", no: "to be written on release", ver: { by: "C. Ilagan", h: 4 }, wait: 5.3, claim: "Nestor Galang", ok: ["Benjie Cruz"], fp: "0aa3f9d2176c" },
      { id: "APP-2026-0409", nm: "Norma Estrella", idn: "Norma Dela Paz Estrella", prod: "SME loan", amt: 250000, term: 24, ch: "pn", bank: "BDO savings", an: "Norma D. Estrella", no: "•••• •••• 4471", ver: null, wait: 3.1, claim: null, ok: ["Antonio Reyes"], fp: "3172dd1e55c7" },
      { id: "APP-2026-0411", nm: "Josefina Ramos", idn: "Josefina Lim Ramos", prod: "Personal loan", amt: 25000, term: 6, ch: "ca", bank: "Cash at the counter", an: "Josefina L. Ramos", no: "paid in person", ver: { by: "C. Ilagan", h: 1 }, wait: 2.2, claim: ME, ok: ["Benjie Cruz"], fp: "7d06c1b4e83f" }
    ];
    HELD = [
      { id: "APP-2026-0413", nm: "Lourdes Katigbak", why: "A counter-offer was sent and she has not answered yet.", wh: "With Jun Espiritu, Sales Agent. 2 days left on the offer." },
      { id: "APP-2026-0407", nm: "Marvin Aquino", why: "Approved, but the signed agreement has not been uploaded and locked.", wh: "With Liza Mendoza, Loan Processor." },
      { id: "APP-2026-0410", nm: "Cristina Navarro", why: "Company approvals: 1 of 2 signed.", wh: "Waiting on the second approver." }
    ];
    LED = [
      { t: "09:14 PST", acct: "LN-2026-0161", nm: "Gloria Mercado", net: 58020, ch: "ip", ref: "IP-20261007-00418", by: "C. Ilagan", funded: "09:14 PST" },
      { t: "10:02 PST", acct: "", app: "APP-2026-0391", nm: "Efren Salonga", net: 193400, ch: "pn", ref: "PN-20261007-00077", by: "N. Galang", funded: "" }
    ];
    sel = null; F = { ch: "", st: "all", q: "", sort: "wait" }; warned = false;
  }
  function net(b) { return b.net != null ? b.net : b.amt * (1 - FEE); }
  function state(b) { return b.ver ? "ok" : b.differs ? "bad" : "amb"; }
  var SL = { ok: "Ready to release", amb: LIVE ? "Ready: payout checked at release" : "Payout details to verify", bad: "Account name differs from ID" };
  function hrs(h) { var a = Math.floor(h), m = Math.round((h - a) * 60); return a + " h " + m + " m"; }
  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[0, 2200], [3, 110], [0, 1600], [28, 1400]], ALERT = [[22, 80], [23, 700], [24, 1400]], NOD = [[16, 120], [17, 120], [18, 140], [19, 500], [20, 140], [21, 300]], THINK = [[4, 200], [5, 200], [6, 200], [7, 700], [8, 700]], DOWN = [[28, 1600]];
  function say(t, mode) { $("says").textContent = t; var back = function () { loop(IDLE); }; if (mode === "alert") loop(ALERT, back); else if (mode === "nod") loop(NOD, back); else if (mode === "think") loop(THINK, back); else if (mode === "down") loop(DOWN, back); else loop(IDLE); }
  /* ---- counters ---- */
  function counters() { var c = $("cnts"); c.textContent = ""; var rd = Q.filter(function (b) { return state(b) === "ok"; }), nv = Q.filter(function (b) { return state(b) !== "ok"; }), hot = Q.filter(function (b) { return b.wait >= 36; });
    var sum = function (a) { return a.reduce(function (s, b) { return s + net(b); }, 0); }, paid = LED.reduce(function (s, r) { return s + r.net; }, 0);
    [[Q.length, "On the shelf", peso(sum(Q)) + " waiting"], [rd.length, "Ready to release", peso(sum(rd))], [nv.length, "Payout details to check", nv.length ? "Cannot leave until checked against ID" : "Nothing to check"], [hot.length, "Close to escalating", "Waiting 36 hours or more; a notice goes out at 48"], [peso(paid), "Paid out today", LED.length + " releases"]].forEach(function (r) { var li = el("li"); li.appendChild(el("span", "", r[1])); li.appendChild(el("b", "", String(r[0]))); li.appendChild(el("small", "", r[2])); c.appendChild(li); }); }
  /* ---- departure board ---- */
  function board() { var b = $("board"); b.textContent = ""; ORDER.forEach(function (k) { var c = CH[k], li = el("li", "row"); li.id = "r-" + k;
      var bt = el("button", "chb"); bt.type = "button"; bt.setAttribute("aria-pressed", String(F.ch === k)); bt.appendChild(el("b", "", c.name)); bt.appendChild(el("small", "", c.nick)); bt.addEventListener("click", function () { F.ch = F.ch === k ? "" : k; board(); list(); $("note").textContent = F.ch ? "Showing only the boxes going by " + c.name + ". Press it again to show all." : "Showing every box."; document.querySelector("#r-" + k + " .chb").focus(); }); li.appendChild(bt);
      li.appendChild(el("div", "rule", c.rule)); var lv = el("div", "lv"); lv.appendChild(el("span", "lvt")); lv.appendChild(el("small", "lvs")); if (!c.always) { var tr = el("div", "trail"); tr.appendChild(el("i")); lv.appendChild(tr); } li.appendChild(lv);
      var lw = el("div"); lw.appendChild(el("span", "left")); li.appendChild(lw);
      var on = Q.filter(function (x) { return x.ch === k; }), ab = el("div", "ab", on.length + (on.length === 1 ? " box" : " boxes")); ab.appendChild(el("small", "", on.length ? peso(on.reduce(function (s, x) { return s + net(x); }, 0)) : "Nothing aboard")); li.appendChild(ab); b.appendChild(li); }); tick(); }
  function tick() { var n = now(); $("clock").textContent = "Malolos time " + t12(n.s).replace(" ", ":" + ("0" + n.s % 60).slice(-2) + " ") + " PST";
    ORDER.forEach(function (k) { var r = $("r-" + k); if (!r) return; var s = chs(CH[k]), L = r.querySelector(".left"); r.querySelector(".lvt").textContent = s.leaves; r.querySelector(".lvs").textContent = s.sub;
      var tr = r.querySelector(".trail"); if (tr) tr.style.setProperty("--x", (s.x * 100).toFixed(1) + "%");
      L.className = "left" + (s.left === -1 ? " gone" : s.left != null && s.left < 1800 ? " hurry" : ""); L.textContent = s.left == null ? "any time" : s.left === -1 ? "closed" : cd(s.left); L.setAttribute("aria-label", s.left == null ? "No cut-off" : s.left === -1 ? "Closed for today" : "Time left " + cd(s.left)); });
    var p = chs(CH.pn), np = Q.filter(function (x) { return x.ch === "pn"; }).length; if (p.left > 0 && p.left < 1800 && np && !warned) { warned = true; say("The three o'clock coach leaves in under half an hour. " + np + (np === 1 ? " box is" : " boxes are") + " still on the shelf for it.", "alert"); } }
  /* ---- the shelf ---- */
  var CHIPS = [["all", "All"], ["ok", "Ready"], ["chk", "To check"], ["mine", "Mine"]];
  function shown() { var q = F.q.trim().toLowerCase(); var a = Q.filter(function (b) { var s = state(b); return (!F.ch || b.ch === F.ch) && (F.st === "all" || (F.st === "ok" && s === "ok") || (F.st === "chk" && s !== "ok") || (F.st === "mine" && b.claim === ME)) && (!q || (b.nm + " " + b.id).toLowerCase().indexOf(q) > -1); });
    var dep = function (b) { var s = chs(CH[b.ch]); return s.left == null ? 9e8 : s.left === -1 ? 9e9 : s.left; };
    a.sort(function (x, y) { return F.sort === "amt" ? y.amt - x.amt : F.sort === "dep" ? dep(x) - dep(y) || y.wait - x.wait : y.wait - x.wait; }); return a; }
  function chips() { var c = $("chips"); c.textContent = ""; CHIPS.forEach(function (p) { var n = p[0] === "all" ? Q.length : Q.filter(function (b) { var s = state(b); return p[0] === "ok" ? s === "ok" : p[0] === "chk" ? s !== "ok" : b.claim === ME; }).length;
      var b = el("button", "chip", p[1]); b.type = "button"; b.appendChild(el("i", "", String(n))); b.setAttribute("aria-pressed", String(F.st === p[0])); b.addEventListener("click", function () { F.st = p[0]; chips(); list(); c.querySelectorAll("button")[CHIPS.indexOf(p)].focus(); }); c.appendChild(b); }); }
  function list(focusId) { var L = $("list"), a = shown(); L.textContent = ""; $("shn").textContent = a.length + " of " + Q.length + " shown" + (F.ch ? ", " + CH[F.ch].name + " only" : "");
    a.forEach(function (b) { var s = state(b), li = el("li"), bt = el("button", "it"); bt.type = "button"; bt.id = "b-" + b.id; bt.setAttribute("aria-pressed", String(sel === b.id));
      var sb = el("span", "sb " + s); sb.style.setProperty("--z", b.amt >= 200000 ? "1.12" : b.amt < 50000 ? ".84" : "1"); ["gold", "body", "lid", "pad"].forEach(function (x) { sb.appendChild(el("span", x)); }); sb.setAttribute("aria-hidden", "true"); bt.appendChild(sb);
      var tg = el("span", "tag"), l1 = el("span", "l1"); l1.appendChild(el("span", "nm", b.nm)); l1.appendChild(el("span", "no", b.id)); tg.appendChild(l1);
      var l2 = el("span", "l2"); l2.appendChild(el("span", "amt", peso(net(b)))); l2.appendChild(el("span", "via", "by " + CH[b.ch].name + " · " + b.prod)); tg.appendChild(l2);
      var l3 = el("span", "l3"); l3.appendChild(el("span", "st " + s, SL[s])); if (b.claim) l3.appendChild(el("span", "plq", b.claim === ME ? "Yours" : "Held by " + b.claim));
      var hot = b.wait >= 36, w = el("span", "wt" + (hot ? " hot" : "")), tr = el("span", "tr"), fi = el("i"); fi.style.setProperty("--w", Math.min(100, b.wait / 48 * 100).toFixed(0) + "%"); tr.appendChild(fi); w.appendChild(tr); w.appendChild(el("span", "", "Waiting " + hrs(b.wait) + (hot ? ". Escalates in " + hrs(48 - b.wait) : ""))); l3.appendChild(w); tg.appendChild(l3); bt.appendChild(tg);
      bt.addEventListener("click", function () { pick(b.id); }); li.appendChild(bt); L.appendChild(li); });
    var e = $("empty"); e.hidden = a.length > 0; if (!a.length) e.textContent = Q.length ? "No box matches. Clear the search or choose All." : "The shelf is empty. Nothing is waiting for release.";
    if (focusId && $("b-" + focusId)) $("b-" + focusId).focus(); }
  function pick(id) { sel = sel === id ? null : id; list(id); manifest(); var b = get(sel); if (!b) { say("Pick a box and I will read you its manifest.", ""); return; } var s = state(b);
    if (s === "bad") say("That account is under a business name, not his. I would not let it leave like that.", "alert"); else if (s === "amb") say("Papers are in order. The payout details still need checking against the ID.", "think"); else if (b.claim && b.claim !== ME) say(b.claim + " already has this one.", "down"); else if (b.wait >= 36) say("This one has waited " + hrs(b.wait) + ". Move it before the notice goes out.", "alert"); else say("All three seals are good. It can go.", "nod");
    if (window.matchMedia("(max-width: 1040px)").matches) $("man").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" }); }
  function get(id) { for (var i = 0; i < Q.length; i++) if (Q[i].id === id) return Q[i]; return null; }
  /* ---- the manifest ---- */
  var REASONS = ["The payout account is not in the borrower's name", "Payout details are missing or cannot be read", "The borrower asked to change how the money is sent", "Another problem with the papers"];
  function manifest() { var M = $("man"), b = get(sel); M.textContent = ""; if (!b) { M.appendChild(el("h2", "", "Manifest")); M.appendChild(el("p", "", "Pick a box on the shelf to read what is inside: the net proceeds, where the money goes, and the three seals it needs before it can leave.")).style.margin = "0"; return; }
    var s = state(b), hd = el("div", "hd"), hl = el("div"); hl.appendChild(el("h2", "", b.nm)); hl.appendChild(el("p", "", b.id + " · " + b.prod + " · " + b.term + " months")); hd.appendChild(hl); hd.appendChild(el("span", "stamp slam " + (s === "ok" ? "green" : s === "amb" ? "amber" : "red"), SL[s])); M.appendChild(hd);
    var sl = el("dl", "slip"); [["Approved amount", peso(b.amt)], ["Less: processing charge", "− " + peso(b.amt - net(b))], ["Net proceeds to release", peso(net(b))]].forEach(function (r) { var d = el("div"); d.appendChild(el("dt", "", r[0])); d.appendChild(el("dd", "", r[1])); sl.appendChild(d); }); M.appendChild(sl);
    var c = CH[b.ch], cs = chs(c), r = el("dl", "rcd"); [["Sent by", c.name + (cs.left == null ? ", any time" : cs.left === -1 ? ", closed for today" : ", leaves in " + cd(cs.left))], ["To", b.bank], ["Account name", b.an], ["Number", b.no], ["Name on ID", b.idn]].forEach(function (x) { r.appendChild(el("dt", "", x[0])); r.appendChild(el("dd", "", x[1])); }); M.appendChild(r);
    if (s === "bad") { var w = el("p", "warn"); w.appendChild(el("b", "", "Name does not match")); w.appendChild(document.createTextNode("The account is under “" + b.an + "” but the ID says “" + b.idn + "”. Money is released only to payout details verified against the borrower's ID. Send it back, or verify proof that the account is his on the release page.")); M.appendChild(w); }
    if ((b.ch === "ip" || b.ch === "ca") && net(b) > 50000) { var w2 = el("p", "warn"); w2.appendChild(el("b", "", "Over the channel limit")); w2.appendChild(document.createTextNode(c.name + " carries up to ₱ 50,000. Choose another channel on the release page.")); M.appendChild(w2); }
    var g = el("ul", "gates"); [["", "Signed agreement locked", LIVE ? "Record copy locked and on file" : "Record copy locked " + hrs(b.wait) + " ago · fingerprint " + b.fp + "…"], ["", LIVE ? "Approved and accepted" : "Company approvals signed", LIVE ? "Decision signed; the borrower accepted the terms" : b.ok.length + " of " + b.ok.length + ": " + b.ok.join(", ")], [s === "ok" ? "" : s === "bad" ? "bad" : "no", "Payout details verified against ID", b.ver ? "By " + b.ver.by + ", " + b.ver.h + " h ago" : s === "bad" ? "Not verified. The names differ." : "Not yet. Done on the release page, with her ID in hand."]].forEach(function (x) { var li = el("li", x[0]), d = el("div"); d.appendChild(el("b", "", x[1])); d.appendChild(el("small", "", x[2])); li.appendChild(d); g.appendChild(li); }); M.appendChild(g);
    if (b.wait >= 36) { var w3 = el("p", "warn"); w3.appendChild(el("b", "", "Close to escalating")); w3.appendChild(document.createTextNode("Waiting " + hrs(b.wait) + ". At 48 hours without movement a notice goes to the supervisor.")); M.appendChild(w3); }
    var other = b.claim && b.claim !== ME, ac = el("div", "acts"), cl = el("button", "btn", b.claim === ME ? "Let go of it" : "Claim this box"); cl.type = "button"; if (other) { cl.setAttribute("aria-disabled", "true"); cl.textContent = b.claim + " has it"; }
    cl.addEventListener("click", function () { if (other) { $("note").textContent = b.claim + " claimed this box. Ask them to let go of it first."; return; } b.claim = b.claim === ME ? null : ME; $("note").textContent = b.claim ? b.id + " is yours. Other officers see your name on it." : b.id + " is back on the shelf for anyone."; chips(); list(); manifest(); say(b.claim ? "Yours. Your name is on the box." : "Back on the shelf.", b.claim ? "nod" : ""); M.querySelector(".acts .btn").focus(); }); ac.appendChild(cl);
    var go = el("button", "btn grn", s === "ok" ? "Open release" : "Verify and release"); go.type = "button"; if (other) go.setAttribute("aria-disabled", "true"); go.addEventListener("click", function () { if (LIVE) { location.href = "release-loan.html?ref=" + b.id; return; } $("note").textContent = other ? b.claim + " claimed this box." : "Prototype: the Release loan page for " + b.id + " is not built yet."; }); ac.appendChild(go); M.appendChild(ac);
    if (LIVE) { cl.style.display = "none"; }
    if (!other && !LIVE) { var d = el("details", "back"), su = el("summary", "", "Send it back to the processor"), dv = el("div"), lb = el("label", "k", "Reason, required"), se = el("select"); se.id = "why"; lb.htmlFor = "why"; se.appendChild(new Option("Choose a reason", "")); REASONS.forEach(function (x) { se.appendChild(new Option(x, x)); }); var er = el("span", "e"); er.id = "whye"; se.setAttribute("aria-describedby", "whye"); var sb = el("button", "btn", "Send back"); sb.type = "button";
      sb.addEventListener("click", function () { if (!se.value) { er.textContent = "Choose a reason so the processor knows what to fix."; se.setAttribute("aria-invalid", "true"); se.focus(); return; } Q.splice(Q.indexOf(b), 1); HELD.unshift({ id: b.id, nm: b.nm, why: "Sent back by C. Ilagan at " + hm(Date.now()) + ": " + se.value.charAt(0).toLowerCase() + se.value.slice(1) + ".", wh: "With Liza Mendoza, Loan Processor. Recorded in the audit log.", isNew: true }); sel = null; all(); $("note").textContent = b.id + " left the shelf and went back to the processor with your reason."; say("Off my shelf. It comes back when it is fixed.", "alert"); $("man").focus(); });
      dv.appendChild(lb); dv.appendChild(se); dv.appendChild(er); dv.appendChild(sb); d.appendChild(su); d.appendChild(dv); M.appendChild(d); } }
  /* ---- held back ---- */
  function held() { var h = $("held"); h.textContent = ""; HELD.forEach(function (x) { var li = el("li", x.isNew ? "new" : ""); x.isNew = false; li.appendChild(el("b", "", x.nm)); li.appendChild(el("span", "no", x.id)); li.appendChild(el("span", "why", x.why)); li.appendChild(el("span", "wh", x.wh)); h.appendChild(li); }); }
  /* ---- the ledger ---- */
  function ledger() { var L = $("ledger"); L.textContent = ""; var t = el("table"), th = el("thead"), hr = el("tr"); [["Time", ""], ["Loan account", ""], ["Borrower", ""], ["Net proceeds", "r"], ["Channel", ""], ["Reference", ""], ["Released by", ""], ["Funding", ""]].forEach(function (h) { var x = el("th", h[1], h[0]); x.scope = "col"; hr.appendChild(x); }); th.appendChild(hr); t.appendChild(th); var tb = el("tbody"), sum = 0;
    LED.forEach(function (r) { sum += r.net; var tr = el("tr", r.isNew ? "new" : ""); r.isNew = false; [r.t, r.acct || "opens on funding", null, peso(r.net), CH[r.ch].name, r.ref, r.by].forEach(function (v, i) { var td = el("td", i === 3 ? "r" : i === 2 ? "b" : "", v == null ? r.nm : v); tr.appendChild(td); });
      var fd = el("td"); if (r.funded) fd.appendChild(el("span", "stamp green" + (r.just ? " slam" : ""), "Funded " + r.funded)); else { fd.appendChild(el("span", "wait", "Awaiting bank confirmation")); var b = el("button", "btn", "Prototype: bank confirms"); b.type = "button"; b.addEventListener("click", function () { r.funded = hm(Date.now()); r.acct = "LN-2026-0162"; r.just = true; ledger(); r.just = false; $("note").textContent = "Funding confirmed for " + r.nm + ". " + r.app + " is now Funded, loan account LN-2026-0162 is open and its payment schedule has been issued."; say("The bank has it. Account opened, schedule issued.", "nod"); }); fd.appendChild(b); } tr.appendChild(fd); tb.appendChild(tr); });
    t.appendChild(tb); var tf = el("tfoot"), fr = el("tr"), a = el("td", "", "Total, " + LED.length + " releases"); a.colSpan = 3; fr.appendChild(a); fr.appendChild(el("td", "r", peso(sum))); var z = el("td"); z.colSpan = 4; fr.appendChild(z); tf.appendChild(fr); t.appendChild(tf); L.appendChild(t); }
  function all() { var nb = document.querySelector("#nav [aria-current] i"); if (nb) nb.textContent = String(Q.length); counters(); board(); chips(); list(); manifest(); held(); ledger(); }
  $("q").addEventListener("input", function () { F.q = this.value; list(); });
  $("sort").addEventListener("change", function () { F.sort = this.value; list(); });
  $("pclock").addEventListener("change", function () { OFF = this.value === "" ? null : +this.value; OFFT = Date.now(); warned = false; tick(); list(); manifest(); $("note").textContent = OFF == null ? "Clock back to live Manila time." : "Prototype clock set. The board counts from there."; });
  if (LIVE) { var rs = $("reset"); if (rs) rs.style.display = "none"; }
  $("reset").addEventListener("click", function () { fresh(); $("q").value = ""; $("sort").value = "wait"; $("pclock").value = ""; OFF = null; $("note").textContent = ""; all(); say("Six boxes on the shelf. The oldest has waited 41 hours.", ""); });
  var NAV = [["My Queue", 0], ["Disbursement", 1, "6"], ["Loan accounts", 0], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"), p = el("span", "plate", n[0]); x.href = "#"; if (n[2]) p.appendChild(el("i", "", n[2])); x.appendChild(p); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  fresh(); all(); if (LIVE) say(Q.length ? Q.length + (Q.length === 1 ? " box" : " boxes") + " on the shelf. Pick one and read its manifest." : "The shelf is empty. Nothing is waiting for release.", ""); else say("Six boxes on the shelf. The oldest has waited 41 hours.", ""); setInterval(tick, 1000);
}
