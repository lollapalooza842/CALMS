/* Online, the folders are the applications Under Review from GET /api/review-queue, the desks are the active
   underwriters, and the Lead's moves are saved (with a reason) through POST /api/review-queue/assign.
   Opened from the folder, the sample office is used. */
(function () {
  if (!window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/review-queue").then(start, function (err) { if (err.status === 401) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample office instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function peso(n) { return "₱ " + n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pk(n) { return "₱" + (n >= 1e6 ? (n / 1e6).toFixed(2) + "M" : Math.round(n / 1000) + "k"); }
  function dur(s) { var h = Math.floor(s / 3600), d = Math.floor(h / 24); return d ? d + "d " + (h % 24) + "h" : h ? h + "h" : Math.floor(s / 60) + "m"; }
  function hm() { return new Date().toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour12: false }); }
  var U = { ar: { name: "Antonio Reyes", short: "A. Reyes", role: "Lead Underwriter", limit: 500000, out: "" }, mt: { name: "Maricar Tolentino", short: "M. Tolentino", role: "Credit Analyst", limit: 300000, out: "" },
            bc: { name: "Benjie Cruz", short: "B. Cruz", role: "Credit Analyst", limit: 150000, out: "" }, lv: { name: "Lorna Vidal", short: "L. Vidal", role: "Credit Analyst", limit: 300000, out: "Out until Oct 9" } };
  var ORDER = ["", "ar", "mt", "bc", "lv"], LEAD_MAX = 500000;
  /* [ref, borrower, product, amount, tier, dti, finscore, ltv, hours waiting, urgent, recommends, why routed here, memo, desk] */
  var RAW = [
    ["APP-2026-0377", "Lourdes Magbanua", "SME loan", 480000, "High", 44.1, 598, 71, 50, 0, "Approve a lower amount", ["FinScore was unavailable for 3 retries; assessed when it came back", "High tier always goes to a person"], "Cash flow covers the installment 1.3 times. Two late payments in 2025, both cured. Collateral appraised at ₱ 676,000.", "ar"],
    ["APP-2026-0447", "Cecilia Dantes", "Personal loan", 80000, "High", 46.3, 588, 0, 38, 0, "Decline", ["Debt-to-income above the 45% limit", "High tier always goes to a person"], "DTI is 1.3 points over policy. Employer of 6 years confirmed. No collateral.", "ar"],
    ["APP-2026-0433", "Imelda Pangilinan", "Salary loan", 90000, "Moderate", 36.5, 642, 0, 6, 0, "Approve", ["Two tradelines 30 days past due in the last year"], "Both late tradelines are now current. Salary deduction arrangement with employer on file.", "mt"],
    ["APP-2026-0455", "Renato Ibarra", "SME loan", 220000, "Moderate", 38.0, 668, 58, 11, 0, "Approve", ["SME loans above ₱ 200,000 are always reviewed"], "Seven years operating. Statements support the declared cash flow. LTV comfortably inside policy.", "mt"],
    ["APP-2026-0441", "Rodrigo Balagtas", "Salary loan", 110000, "Moderate", 37.7, 648, 0, 21, 0, "Approve", ["Thin credit file: one tradeline only"], "Single credit card, 3 years, never late. Tenure 4 years. Income verified from pay stubs.", "mt"],
    ["APP-2026-0425", "Crisanto Navarro", "SME loan", 350000, "Moderate", 39.2, 655, 64, 14, 1, "Approve", ["Amount above the analyst limit", "Marked critical priority by the branch"], "Supplier contract starts 15 October. Borrower asked for a decision this week.", "bc"],
    ["APP-2026-0419", "Rosalinda Ocampo", "Personal loan", 75000, "Moderate", 41.0, 631, 0, 47.98, 0, "Approve a lower amount", ["Debt-to-income between 40% and 45%"], "A lower amount of ₱ 60,000 would bring DTI to 38%. Would trigger a counter-offer.", "bc"],
    ["APP-2026-0450", "Arturo Villareal", "Salary loan", 140000, "Moderate", 43.8, 610, 0, 29, 0, "Approve a lower amount", ["Debt-to-income between 40% and 45%"], "Existing car loan ends in 5 months. Employer is on the accredited list.", "lv"],
    ["APP-2026-0452", "Divina Mercado", "Personal loan", 55000, "High", 47.9, 571, 0, 33, 0, "Decline", ["Debt-to-income above the 45% limit", "FinScore below 580"], "Stable employer for 11 years, but three active loans. Overriding would need a written justification.", "lv"],
    ["APP-2026-0457", "Gloria Tuazon", "Salary loan", 60000, "Low", 28.4, 702, 0, 3, 0, "Approve", ["Borrower has a past-due account on another loan: needs documented management approval"], "Metrics are clean, but loan LN-2025-1320 is 12 days past due.", ""],
    ["APP-2026-0458", "Efren Sarmiento", "SME loan", 520000, "Moderate", 35.9, 690, 62, 2, 0, "Approve", ["Amount above every underwriter's limit, including the Lead's"], "Strong file. At ₱ 520,000 the approval must be endorsed to the Chief Risk Officer.", ""],
    ["APP-2026-0460", "Lilibeth Zamora", "Personal loan", 35000, "Moderate", 40.2, 625, 0, 1, 0, "Approve", ["Debt-to-income between 40% and 45%"], "Small ticket. First-time borrower with the company.", ""]
  ];
  var COMING = [["APP-2026-0462", "Mario Quiambao", "Salary loan", 70000, "Moderate", 39.5, 637, 0, 0, 0, "Approve", ["Thin credit file: one tradeline only"], "Two years with employer. One credit card, never late.", ""],
                ["APP-2026-0463", "Estela Roque", "SME loan", 260000, "High", 45.6, 579, 77, 0, 1, "Decline", ["Debt-to-income above the 45% limit", "Marked critical priority by the branch"], "Seasonal business. LTV close to the 80% ceiling.", ""],
                ["APP-2026-0464", "Paulo Ferrer", "Personal loan", 45000, "Moderate", 40.9, 629, 0, 0, 0, "Approve", ["Debt-to-income between 40% and 45%"], "Call centre agent, 3 years. Rent verified.", ""]];
  var T0 = Date.now();
  function mk(r) { return { ref: r[0], who: r[1], last: r[1].split(" ").slice(-1)[0], prod: r[2], amt: r[3], tier: r[4], dti: r[5], fs: r[6], ltv: r[7], s0: r[8] * 3600, t0: Date.now(), urg: !!r[9], rec: r[10], why: r[11], memo: r[12], desk: r[13], late: r[8] >= 48 }; }
  var A = RAW.map(mk), role = "ar", sel = "", fTier = "", LOG = [], asking = null, fresh = {}, VIEWER = false;
  function fromLive(L) { return L.items.map(function (x) { return { ref: x.ref, who: x.who, last: x.who.split(" ").slice(-1)[0], prod: x.prod, amt: x.amt, tier: x.tier, dti: x.dti, fs: x.fs, ltv: x.ltv, s0: x.hours * 3600, t0: Date.now(), urg: x.urg, rec: x.rec, why: x.why, memo: x.memo, desk: x.desk, late: x.late, version: x.version }; }); }
  function logOf(L) { return L.log.map(function (l) { return new Date(l.at).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour12: false, hour: "2-digit", minute: "2-digit" }) + "  " + l.text; }); }
  if (LIVE) { U = {}; LIVE.people.forEach(function (p) { U[p.key] = { name: p.name, short: p.short, role: p.role, limit: p.limit, out: "" }; }); ORDER = [""].concat(LIVE.people.map(function (p) { return p.key; })); LEAD_MAX = LIVE.leadMax || LEAD_MAX;
    A = fromLive(LIVE); LOG = logOf(LIVE); role = LIVE.me; VIEWER = !U[role]; }
  function apply(L) { var keep = sel; LIVE = L; A = fromLive(L); LOG = logOf(L); if (!A.some(function (a) { return a.ref === keep; })) sel = ""; }
  function secs(a) { return a.s0 + (Date.now() - a.t0) / 1000; }
  function on(d) { return A.filter(function (a) { return a.desk === d; }).sort(function (a, b) { return (b.urg - a.urg) || (secs(b) - secs(a)); }); }
  function lead() { return LIVE ? LIVE.lead : role === "ar"; }
  function all() { return lead() || VIEWER; }

  /* ---- Kuwa on the desktops ---- */
  var kuwa = $("kuwa"), says = $("says"), office = $("office"), kT = null, kLeft = -1;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[28, 2400], [3, 110]], ALERT = [[22, 80], [23, 700], [24, 1400], [28, 1400]], SLEEP = [[13, 900], [14, 900], [15, 900]], NOD = [[18, 140], [19, 380], [18, 140]];
  function perch(force) {
    var target = "", text = "", seq = IDLE;
    if (!all()) { var mine = on(role), lt = mine.filter(function (a) { return a.late; }); target = role; text = !mine.length ? "Empty tray. Enjoy it while it lasts." : lt.length ? lt[0].last + " has sat past 48 hours. Your lead already knows." : mine.length + " in your tray. Urgent ones first, then the oldest."; seq = !mine.length ? SLEEP : lt.length ? ALERT : IDLE; }
    else {
      var out = Object.keys(U).filter(function (k) { return U[k].out && on(k).length; })[0], over = A.filter(function (a) { return a.desk && a.desk !== "ar" && a.amt > U[a.desk].limit; })[0], fresh2 = on(""), lateA = A.filter(function (a) { return a.late; })[0];
      if (out) { target = out; text = U[out].name.split(" ")[0] + " is out and " + on(out).length + " folder" + (on(out).length > 1 ? "s are" : " is") + " going stale on this desk. Move them."; seq = ALERT; }
      else if (over) { target = over.desk; text = over.last + " is " + pk(over.amt) + ", over " + U[over.desk].name.split(" ")[0] + "'s " + pk(U[over.desk].limit) + " limit. It will only come back to you."; seq = ALERT; }
      else if (fresh2.length) { target = ""; text = fresh2.length + " in the basket with nobody's name on " + (fresh2.length > 1 ? "them" : "it") + ". Deal them out."; }
      else if (lateA) { target = lateA.desk; text = lateA.last + " has sat past 48 hours on this desk."; seq = ALERT; }
      else if (!A.length) { target = "ar"; text = "Nothing in review. I am going back to sleep."; seq = SLEEP; }
      else { target = "ar"; text = "Every folder has an owner who may decide it. Good."; }
    }
    var node = document.querySelector('.desk[data-u="' + target + '"]'), w = office.clientWidth; if (!node) return;
    var x = Math.max(0, Math.min(w - 96, node.offsetLeft + node.offsetWidth / 2 - 48)), right = x < w * .5;
    says.textContent = text; says.style.left = right ? (x + 104) + "px" : "auto"; says.style.right = right ? "auto" : (w - x + 8) + "px";
    if (kLeft < 0 || reduce || Math.abs(x - kLeft) < 6) { kuwa.style.left = x + "px"; kLeft = x; kuwa.classList.remove("walk"); if (force === "nod") loop(NOD, function () { loop(seq); }); else loop(seq); return; }
    clearTimeout(kT); kFrame(x > kLeft ? 39 : 41); kuwa.classList.add("walk"); kuwa.style.left = x + "px"; kLeft = x; kT = setTimeout(function () { kuwa.classList.remove("walk"); loop(seq); }, 920);
  }
  /* ---- telegraph ---- */
  function tape(msg, quiet) { var t = $("tape"), li = el("li", quiet ? "" : "new", hm().slice(0, 5) + "  " + msg); t.insertBefore(li, t.firstChild); while (t.children.length > 5) t.lastChild.remove(); }
  /* ---- reassigning ---- */
  function move(a, to, reason, cb) {
    var from = a.desk; if (from === to) return;
    if (LIVE) { CALMS.api("POST", "/api/review-queue/assign", { ref: a.ref, to: to, reason: reason }).then(function (L) { apply(L); fresh[a.ref] = true; tape(a.ref + " " + a.last.toUpperCase() + " TO " + U[to].short.toUpperCase() + " STOP");
        $("note").textContent = a.who + " is now with " + U[to].name + (a.amt > U[to].limit ? ". At " + peso(a.amt) + " it is over that desk's " + peso(U[to].limit) + " limit, so the decision can only be endorsed upward." : ". " + U[to].name.split(" ")[0] + " sees it in My Queue now.") + " Recorded in the audit log."; draw(); perch("nod"); if (cb) cb(); },
      function (e) { $("note").textContent = "Not moved. " + e.message; draw(); if (cb) cb(e); }); return; }
    a.desk = to; fresh[a.ref] = true;
    var line = hm() + "  " + U.ar.short + " moved " + a.ref + " (" + a.last + ") from " + (from ? U[from].short : "arrivals") + " to " + U[to].short + ". Reason: " + reason.toLowerCase() + "."; LOG.unshift(line);
    tape(a.ref + " " + a.last.toUpperCase() + " TO " + U[to].short.toUpperCase() + " STOP");
    $("note").textContent = a.who + " is now with " + U[to].name + (a.amt > U[to].limit ? ". At " + peso(a.amt) + " it is over " + (to === "ar" ? "the Lead's limit and must be endorsed to the Chief Risk Officer." : "that analyst's " + peso(U[to].limit) + " limit, so the decision will escalate back to the Lead.") : ". " + U[to].name.split(" ")[0] + " has been notified.");
  }
  function ask(a, to) {
    if (!lead()) return;
    if (U[to].out) { var t = document.querySelector('.desk[data-u="' + to + '"] .tray'); if (t) { t.classList.add("no"); setTimeout(function () { t.classList.remove("no"); }, 500); } $("note").textContent = U[to].name + " is " + U[to].out.toLowerCase() + ". Folders cannot be assigned to an underwriter who is out."; return; }
    if (a.desk === to) return; asking = { a: a, to: to }; draw();
  }
  function deal() {
    if (!lead()) return; var pool = A.filter(function (a) { return !a.desk || U[a.desk].out || (a.desk !== "ar" && a.amt > U[a.desk].limit); }).sort(function (a, b) { return (b.urg - a.urg) || (secs(b) - secs(a)); });
    if (!pool.length) { $("note").textContent = "Nothing to deal. Every folder already sits with an underwriter who is in and may decide it."; return; }
    var i = 0; (function next() { if (i >= pool.length) { $("note").textContent = pool.length + " folders dealt by workload and approval limit."; return; }
      var a = pool[i++], ok = Object.keys(U).filter(function (k) { return !U[k].out && U[k].limit >= Math.min(a.amt, LEAD_MAX); }).sort(function (x, y) { return on(x).length - on(y).length || U[x].limit - U[y].limit; }), to = ok[0] || "ar";
      if (LIVE) { move(a, to, "Workload", function (e) { if (e) return; setTimeout(next, reduce ? 0 : 300); }); return; }
      move(a, to, a.desk && U[a.desk].out ? "On leave" : !a.desk ? "Dealt from arrivals by workload" : "Over the analyst's limit"); draw(); setTimeout(next, reduce ? 0 : 420); })();
  }
  /* ---- drawing ---- */
  function spine(a) {
    var s = secs(a), li = el("li", "spine" + (a.late ? " late" : "") + (sel === a.ref ? " sel" : "") + (fresh[a.ref] ? " fly" : "")); li.dataset.ref = a.ref; delete fresh[a.ref];
    li.style.setProperty("--x", ((a.ref.charCodeAt(11) % 5) - 2) + "px");
    var g = el("button", "grab"); g.type = "button"; g.setAttribute("aria-label", "Drag " + a.who + " to another desk"); if (!lead()) { g.disabled = true; g.style.visibility = "hidden"; } li.appendChild(g);
    var o = el("button", "opn"); o.type = "button"; o.setAttribute("aria-pressed", String(sel === a.ref));
    var se = el("span", "seal " + a.tier, a.tier[0]); se.title = a.tier + " risk"; o.appendChild(se); o.appendChild(el("b", "", a.last)); o.appendChild(el("span", "a", pk(a.amt)));
    var m = el("span", "m"); m.appendChild(el("span", "w", dur(s))); m.appendChild(el("span", "", a.prod.replace(" loan", "")));
    if (a.urg) m.appendChild(el("span", "flag urg", "Urgent")); if (a.late) m.appendChild(el("span", "flag esc", "Escalated"));
    if (a.desk && a.amt > U[a.desk].limit) m.appendChild(el("span", "flag lim", "Over limit")); o.appendChild(m);
    o.addEventListener("click", function () { sel = sel === a.ref ? "" : a.ref; draw(); }); li.appendChild(o);
    if (s >= 36 * 3600 && s < 48 * 3600) { var fz = el("div", "fz"), f = (s - 36 * 3600) / (12 * 3600) * 100, b = el("b"), i = el("i"); b.style.width = f + "%"; i.style.left = f + "%"; fz.appendChild(b); fz.appendChild(i); li.appendChild(fz); }
    drag(li, g, a); return li;
  }
  function desk(k) {
    var d = el("section", "desk" + (k ? "" : " basket") + (k && U[k].out ? " out" : "")); d.dataset.u = k; d.setAttribute("aria-label", k ? U[k].name + "'s desk" : "Arrivals basket");
    var list = on(k).filter(function (a) { return !fTier || a.tier === fTier; }), tr = el("ul", "tray"); tr.dataset.u = k;
    if (!list.length) tr.appendChild(el("li", "hole", k ? (fTier ? "None of that tier here" : "Empty tray") : "Nothing waiting to be assigned"));
    list.slice().reverse().forEach(function (a) { tr.appendChild(spine(a)); });
    if (asking && asking.to === k) { var q = el("div", "ask"); q.setAttribute("role", "group"); q.setAttribute("aria-label", "Reason for reassigning"); q.appendChild(el("b", "", "Move " + asking.a.last + " to " + U[k].name.split(" ")[0] + "?")); q.appendChild(document.createTextNode(asking.a.amt > U[k].limit ? "Note: " + peso(asking.a.amt) + " is over this desk's limit. " : "")); q.appendChild(el("span", "", "Give a reason. It goes on the record."));
      var bx = el("div"); ["Workload", "On leave", "Expertise", "Conflict of interest"].forEach(function (r) { var b = el("button", "", r); b.type = "button"; b.addEventListener("click", function () { var x = asking; asking = null; move(x.a, x.to, r); if (!LIVE) { draw(); perch("nod"); } else draw(); }); bx.appendChild(b); });
      var c = el("button", "x", "Cancel"); c.type = "button"; c.addEventListener("click", function () { asking = null; draw(); }); bx.appendChild(c); q.appendChild(bx); d.appendChild(q); }
    d.appendChild(tr);
    var p = el("div", "plank"), np = el("div", "np"); np.appendChild(el("b", "", k ? U[k].name : "Arrivals")); np.appendChild(el("span", "", k ? U[k].role + " · limit " + peso(U[k].limit) : "Routed here by the rules, not yet assigned")); p.appendChild(np);
    var st = el("div", "st"), n = on(k).length; st.appendChild(el("span", "", n + " in " + (k ? "tray" : "basket") + (k ? " · " + peso(on(k).reduce(function (m, a) { return m + a.amt; }, 0)) : "")));
    if (k) st.appendChild(el("span", "door" + (U[k].out ? " out" : ""), U[k].out ? "Out" : "In")); p.appendChild(st); if (k && U[k].out) p.appendChild(el("div", "st", U[k].out));
    d.appendChild(p); return d;
  }
  function flip(box, n, pad) { var s = String(n).length < 2 ? "0" + n : String(n), old = box.dataset.v || ""; if (old === s) return; box.dataset.v = s; box.textContent = ""; s.split("").forEach(function (c, i) { box.appendChild(el("span", old && old[i] !== c ? "turn" : "", c)); }); box.setAttribute("aria-label", String(n)); }
  function dial(label, val, unit, min, max, bands, word) {
    /* bands: [[upTo, status]] in ascending order; status low=good, mod=warning, high=critical */
    var ns = "http://www.w3.org/2000/svg", w = el("div", "dial"), svg = document.createElementNS(ns, "svg"); svg.setAttribute("viewBox", "0 0 140 84"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", label + " " + val + unit + ", " + word);
    var pt = function (v, r) { var t = Math.PI * (1 - (Math.max(min, Math.min(max, v)) - min) / (max - min)); return [70 + Math.cos(t) * r, 76 - Math.sin(t) * r]; }, from = min;
    bands.forEach(function (b) { var a = pt(from + (b[0] - from) * 0 + (from === min ? 0 : 0) + from - from, 50), a1 = pt(from, 46), a2 = pt(b[0], 46), p = document.createElementNS(ns, "path"); p.setAttribute("d", "M" + a1[0].toFixed(1) + " " + a1[1].toFixed(1) + " A46 46 0 0 1 " + a2[0].toFixed(1) + " " + a2[1].toFixed(1)); p.setAttribute("fill", "none"); p.setAttribute("stroke", "var(--" + b[1] + ")"); p.setAttribute("stroke-width", "9"); svg.appendChild(p);
      if (b[0] < max) { var g1 = pt(b[0], 40), g2 = pt(b[0], 52), gp = document.createElementNS(ns, "path"); gp.setAttribute("d", "M" + g1[0].toFixed(1) + " " + g1[1].toFixed(1) + " L" + g2[0].toFixed(1) + " " + g2[1].toFixed(1)); gp.setAttribute("stroke", "#fbf1d8"); gp.setAttribute("stroke-width", "2.5"); svg.appendChild(gp); var tp = pt(b[0], 62), tx = document.createElementNS(ns, "text"); tx.setAttribute("x", tp[0].toFixed(1)); tx.setAttribute("y", (tp[1] + 3).toFixed(1)); tx.setAttribute("text-anchor", "middle"); tx.setAttribute("font-size", "11"); tx.setAttribute("fill", "#4a3112"); tx.setAttribute("font-family", "Courier New, monospace"); tx.textContent = b[0]; svg.appendChild(tx); }
      from = b[0]; });
    var n = pt(val, 38), nd = document.createElementNS(ns, "path"); nd.setAttribute("d", "M70 76 L" + n[0].toFixed(1) + " " + n[1].toFixed(1)); nd.setAttribute("stroke", "#24130a"); nd.setAttribute("stroke-width", "3"); nd.setAttribute("stroke-linecap", "round"); svg.appendChild(nd);
    var hub = document.createElementNS(ns, "circle"); hub.setAttribute("cx", 70); hub.setAttribute("cy", 76); hub.setAttribute("r", 5); hub.setAttribute("fill", "#c98f4a"); hub.setAttribute("stroke", "#24130a"); hub.setAttribute("stroke-width", "2"); svg.appendChild(hub);
    var ti = document.createElementNS(ns, "title"); ti.textContent = label + ": " + val + unit + " (" + word + ")"; svg.appendChild(ti);
    w.appendChild(el("em", "", label)); w.appendChild(svg); w.appendChild(el("b", "", val + unit)); w.appendChild(el("span", "", word)); return w;
  }
  function dossier() {
    var d = $("dos"), a = A.filter(function (x) { return x.ref === sel; })[0]; d.textContent = "";
    if (!a || (!all() && a.desk !== role)) { d.dataset.ref = "No folder pulled"; var p0 = el("div", "page"); p0.appendChild(el("h2", "", "Pull a folder")); p0.appendChild(el("p", "", "Click any folder in a stack to read its dossier here: the ratios, why the rules sent it to a person, and what the system recommends.")); d.appendChild(p0); return; }
    d.dataset.ref = a.ref; var p = el("div", "page"), s = secs(a);
    p.appendChild(el("h2", "", a.who)); p.appendChild(el("div", "l1", peso(a.amt) + " · " + a.prod));
    var l2 = el("p"); var se = el("span", "seal " + a.tier, a.tier[0]); se.style.cssText = "display:inline-grid;vertical-align:-5px;margin-right:6px"; l2.appendChild(se); l2.appendChild(document.createTextNode(a.tier + " risk · waiting " + dur(s) + (a.late ? ", escalated to the supervisor" : "") + (a.urg ? " · critical priority" : ""))); p.appendChild(l2);
    p.appendChild(el("div", "h3", "The ratios")); var ds = el("div", "dials"); if (a.dti == null) ds.appendChild(el("p", "", "No credit report yet, so there are no ratios to show."));
    if (a.dti != null) ds.appendChild(dial("Debt to income", a.dti, "%", 0, 70, [[35, "low"], [45, "mod"], [70, "high"]], a.dti <= 35 ? "comfortable" : a.dti <= 45 ? "inside the 45% limit" : "over the 45% limit"));
    if (a.fs != null) ds.appendChild(dial("FinScore", a.fs, "", 300, 850, [[580, "high"], [670, "mod"], [850, "low"]], a.fs < 580 ? "poor" : a.fs < 670 ? "fair" : "good"));
    if (a.ltv) ds.appendChild(dial("Loan to value", a.ltv, "%", 0, 110, [[60, "low"], [80, "mod"], [110, "high"]], a.ltv <= 60 ? "well covered" : a.ltv <= 80 ? "inside the 80% ceiling" : "over the 80% ceiling"));
    p.appendChild(ds);
    p.appendChild(el("div", "h3", "Why the rules sent it to a person")); var ul = el("ul", "why"); a.why.forEach(function (w) { ul.appendChild(el("li", "", w)); }); p.appendChild(ul);
    p.appendChild(el("div", "h3", "System recommends")); p.appendChild(el("p", "", a.rec + (LIVE ? (a.version ? ". Rule set version " + a.version + "." : ".") : ". Rule set version 14."))); if (a.memo) p.appendChild(el("div", "memo", "Credit memo: " + a.memo));
    p.appendChild(el("div", "h3", "With")); var holder = a.desk ? U[a.desk] : null;
    p.appendChild(el("p", "", holder ? holder.name + ", " + holder.role.toLowerCase() + (holder.out ? " (" + holder.out.toLowerCase() + ")" : "") + ". Approval limit " + peso(holder.limit) + (a.amt > holder.limit ? ", which this application exceeds." : ".") : "Nobody yet. It is in the arrivals basket."));
    if (a.amt > LEAD_MAX) p.appendChild(el("p", "", "At " + peso(a.amt) + " this is over the Lead's limit too. Whoever reviews it can only endorse it upward to the Chief Risk Officer."));
    if (lead()) { var rs = el("div", "rs"), l = el("label", "", "Assign to"), s1 = el("select"); s1.id = "asg"; l.htmlFor = "asg"; Object.keys(U).forEach(function (k) { var o = el("option", "", U[k].name + (U[k].out ? " (out)" : "") + " · " + on(k).length + " in tray"); o.value = k; o.disabled = !!U[k].out; s1.appendChild(o); }); s1.value = a.desk && !U[a.desk].out ? a.desk : "ar";
      var lr = el("label", "", "Reason"), s2 = el("select"); s2.id = "rsn"; lr.htmlFor = "rsn"; ["Workload", "On leave", "Expertise", "Conflict of interest"].forEach(function (r) { s2.appendChild(el("option", "", r)); });
      var bb = el("button", "act q", "Reassign"); bb.type = "button"; bb.addEventListener("click", function () { if (s1.value === a.desk) { $("note").textContent = "It is already on that desk."; return; } move(a, s1.value, s2.value); if (!LIVE) { draw(); perch("nod"); } });
      rs.appendChild(l); rs.appendChild(s1); rs.appendChild(lr); rs.appendChild(s2); rs.appendChild(bb); p.appendChild(rs); }
    if (a.desk === role || (LIVE && lead())) { var ob = el("button", "act", a.tier === "Pending" ? "Open credit assessment" : LIVE ? "Open the decision" : "Open credit assessment"); ob.type = "button"; ob.addEventListener("click", function () { if (LIVE) { location.href = (a.tier === "Pending" ? "credit-assessment" : "decision") + ".html?ref=" + a.ref; return; } $("note").textContent = "Prototype: the Credit assessment page for " + a.ref + " is not built yet."; }); p.appendChild(ob); }
    else if (lead() && a.desk && !LIVE) p.appendChild(el("p", "", "Only " + U[a.desk].name.split(" ")[0] + " can open the assessment while it sits on that desk. Reassign it to yourself to decide it."));
    d.appendChild(p);
  }
  function draw() {
    if (U[role]) { $("whoName").textContent = U[role].name; $("whoRole").textContent = U[role].role; }
    $("lede").textContent = VIEWER ? "Everything the rules could not decide alone, on every desk. You can read it; only the Lead Underwriter moves folders." : lead() ? "Everything the rules could not decide alone. As Lead you see every desk and may move folders between them." : "Your own tray. Only the Lead Underwriter sees the other desks or moves folders.";
    var ds = $("desks"); ds.textContent = ""; (all() ? ORDER : [role]).forEach(function (k) { ds.appendChild(desk(k)); });
    var mine = all() ? A : on(role), late = mine.filter(function (a) { return a.late; }).length, old = mine.reduce(function (m, a) { return Math.max(m, secs(a)); }, 0);
    flip($("fAll"), mine.length); flip($("fNew"), lead() ? on("").length : 0); flip($("fLate"), late);
    var t = $("tOld"); t.textContent = mine.length ? dur(old) : "none"; t.classList.toggle("bad", old >= 48 * 3600);
    var mx = $("mix"); mx.textContent = ""; ["Low", "Moderate", "High"].forEach(function (tr) { var s = el("span"); var se = el("span", "seal " + tr, tr[0]); se.title = tr + " risk"; s.appendChild(se); s.appendChild(document.createTextNode(String(mine.filter(function (a) { return a.tier === tr; }).length))); s.setAttribute("aria-label", tr + " risk: " + mine.filter(function (a) { return a.tier === tr; }).length); mx.appendChild(s); });
    $("dealBox").hidden = !lead();
    var fl = $("fl"); fl.textContent = ""; fl.style.cssText = "display:flex;flex-wrap:wrap;gap:8px"; [["", "Every tier"], ["Low", "Low"], ["Moderate", "Moderate"], ["High", "High"]].forEach(function (f) { var b = el("button", "btnp", f[1]); b.type = "button"; b.setAttribute("aria-pressed", String(fTier === f[0])); b.addEventListener("click", function () { fTier = f[0]; draw(); }); fl.appendChild(b); });
    var lg = $("log"); lg.textContent = ""; if (!LOG.length) lg.appendChild(el("li", "", "No folders moved yet this session.")); LOG.forEach(function (l) { lg.appendChild(el("li", "", l)); });
    dossier(); perch();
  }
  function tick() {
    var crossed = null; A.forEach(function (a) { var s = secs(a); if (!a.late && s >= 48 * 3600) { a.late = true; crossed = a; } });
    if (crossed) { tape(crossed.ref + " " + crossed.last.toUpperCase() + " PAST 48 HOURS STOP SUPERVISOR NOTIFIED STOP"); $("note").textContent = crossed.who + " has now waited 48 hours. An escalation notice went to the supervisor."; draw(); return; }
    [].forEach.call(document.querySelectorAll(".spine"), function (n) { var a = A.filter(function (x) { return x.ref === n.dataset.ref; })[0]; if (!a) return; var s = secs(a), w = n.querySelector(".w"); if (w) w.textContent = dur(s); var fz = n.querySelector(".fz"); if (fz) { var f = Math.min(100, (s - 36 * 3600) / (12 * 3600) * 100); fz.firstChild.style.width = f + "%"; fz.lastChild.style.left = f + "%"; } });
  }
  function arrive() { if (!COMING.length || asking) return; var a = mk(COMING.shift()); A.push(a); fresh[a.ref] = true; tape(a.ref + " " + a.last.toUpperCase() + " " + a.tier.toUpperCase() + " RISK " + pk(a.amt) + (a.urg ? " URGENT" : "") + " ROUTED TO MANUAL REVIEW STOP"); if (lead()) $("note").textContent = a.who + " just arrived for manual review: " + a.why[0].toLowerCase() + "."; draw(); }
  /* ---- dragging a folder by its ridged edge ---- */
  function drag(li, grip, a) {
    grip.addEventListener("pointerdown", function (e) {
      if (e.button || !lead()) return; e.preventDefault(); var sx = e.clientX, sy = e.clientY, ghost = null, r = li.getBoundingClientRect(), ox = sx - r.left, oy = sy - r.top, over = null;
      function mv(ev) { if (!ghost) { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; ghost = li.cloneNode(true); ghost.classList.add("ghost"); ghost.classList.remove("fly", "sel"); ghost.style.width = r.width + "px"; document.body.appendChild(ghost); li.classList.add("dragging"); }
        ghost.style.left = (ev.clientX - ox) + "px"; ghost.style.top = (ev.clientY - oy) + "px"; var u = document.elementFromPoint(ev.clientX, ev.clientY), d = u && u.closest(".desk");
        [].forEach.call(document.querySelectorAll(".tray"), function (t) { t.classList.remove("over"); }); over = null; if (d && d.dataset.u && d.dataset.u !== a.desk) { over = d.dataset.u; d.querySelector(".tray").classList.add("over"); } }
      function up() { document.removeEventListener("pointermove", mv); document.removeEventListener("pointerup", up); document.removeEventListener("pointercancel", up); [].forEach.call(document.querySelectorAll(".tray"), function (t) { t.classList.remove("over"); }); if (!ghost) return; ghost.remove(); li.classList.remove("dragging"); if (over) ask(a, over); }
      document.addEventListener("pointermove", mv); document.addEventListener("pointerup", up); document.addEventListener("pointercancel", up);
    });
  }
  var rs = $("role"); [["ar", "Lead Underwriter: Antonio Reyes"], ["mt", "Credit Analyst: Maricar Tolentino"], ["bc", "Credit Analyst: Benjie Cruz"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; rs.appendChild(op); });
  rs.addEventListener("change", function () { role = rs.value; sel = ""; asking = null; kLeft = -1; draw(); });
  $("deal").addEventListener("click", deal);
  var NAV = [["My Queue", 0], ["Applications", 0], ["Review queue", 1], ["Counter-offers", 0], ["Reports", 0], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"); x.href = "#"; x.appendChild(el("span", "plate", n[0])); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  window.addEventListener("resize", function () { kLeft = -1; perch(); });
  tape("APP-2026-0460 ZAMORA MODERATE RISK ₱35k ROUTED TO MANUAL REVIEW STOP", true); tape("APP-2026-0458 SARMIENTO MODERATE RISK ₱520k OVER ALL LIMITS STOP", true); tape("APP-2026-0457 TUAZON LOW RISK ₱60k PAST-DUE ACCOUNT ON FILE STOP", true);
  if (LIVE) { var pl = document.querySelector("label.proto"); if (pl) pl.style.display = "none"; $("tape").textContent = ""; LIVE.tape.slice().reverse().forEach(function (t) { tape(t.text, true); });
    var ft = document.querySelectorAll(".foot span"); if (ft[1]) ft[1].textContent = "Live: every application Under Review. A folder on someone's desk can be worked on only by them or the Lead. Each move is kept with its reason.";
    draw(); setInterval(tick, 1000);
    setInterval(function () { if (document.hidden || asking) return; CALMS.api("GET", "/api/review-queue").then(function (L) { var before = A.map(function (a) { return a.ref + a.desk; }).sort().join(); apply(L); var after = A.map(function (a) { return a.ref + a.desk; }).sort().join(); if (before !== after) { draw(); $("note").textContent = "The review queue changed and was updated."; } }, function () {}); }, 60000);
    return; }
  draw(); setInterval(tick, 1000); setTimeout(arrive, 9000); setInterval(arrive, 26000);
}
