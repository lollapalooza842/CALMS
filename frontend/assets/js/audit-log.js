/* Online, the entries of the last 30 days come from GET /api/audit; the seal check re-computes every real seal on
   the server, and exports download a real file (the export itself is logged). Opened from the folder, the sample is used. */
(function () {
  if (!window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/audit?days=30").then(start, function (err) { if (err.status === 401 || CALMS.unreachable(err)) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing sample entries instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var N0 = new Date(Date.now() + 8 * 3600e3), T0 = Date.UTC(N0.getUTCFullYear(), N0.getUTCMonth(), N0.getUTCDate());
  function dd(d) { return d === 0 ? "Today" : d === 1 ? "Yesterday" : new Date(T0 - d * 86400e3).toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" }); }
  function full(d, t) { return new Date(T0 - d * 86400e3).toLocaleDateString("en-PH", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" }) + ", " + t + " PST"; }
  function nowT() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
  var KINDS = [["", "Everything"], ["login", "Sign-ins"], ["data", "Records created or changed"], ["status", "Status changes"], ["decision", "Decisions and overrides"], ["doc", "Documents opened or downloaded"], ["bureau", "Credit bureau inquiries"], ["pay", "Payments and reversals"], ["config", "Settings, roles and limits"], ["audit", "Use of this log"]];
  var ROLE = { "Liza Mendoza": "Loan Processor", "Aurelio Soriano": "Loan Processor", "Antonio Reyes": "Lead Underwriter", "Jun Espiritu": "Sales Agent", "Corazon Ilagan": "Disbursement Officer", "Rodel Macaraeg": "Loan Account Officer", "Paolo Ventura": "System Administrator", "Regina Sy": "Compliance Auditor", "Benjie Cruz": "Underwriter", "CALMS": "The system itself", "Unknown": "Not signed in" };
  /* d = days ago, t, who, kind, text, record, was, now, address, sensitive */
  var RAW = [
    [0, "11:39", "Rodel Macaraeg", "pay", "Reversed a payment", "OR-0413 · LN-2026-0102", "Posted, ₱ 5,265.76", "Reversed by REV-0008. Reason: posted twice", "10.20.4.31", 1],
    [0, "11:32", "Liza Mendoza", "status", "Locked the signed agreement as the record copy", "APP-2026-0409", "Agreement generated", "Signed and locked", "10.20.4.17"],
    [0, "10:14", "Rodel Macaraeg", "pay", "Posted a payment", "OR-0413 · LN-2026-0102", "", "₱ 5,265.76 by GCash, ref GC-552", "10.20.4.31"],
    [0, "10:12", "Rodel Macaraeg", "pay", "Posted a payment", "OR-0412 · LN-2026-0102", "", "₱ 5,265.76 by GCash, ref GC-552", "10.20.4.31"],
    [0, "10:02", "Corazon Ilagan", "status", "Released a loan", "APP-2026-0391", "Awaiting release", "Instruction sent, ₱ 193,400.00 by PESONet", "10.20.4.22"],
    [0, "09:47", "Paolo Ventura", "config", "Changed an approval limit", "User: Benjie Cruz", "Approval limit ₱ 150,000", "Approval limit ₱ 200,000", "10.20.4.5", 1],
    [0, "09:20", "Jun Espiritu", "data", "Recorded the borrower's answer to a counter-offer", "APP-2026-0409", "Counter-offer sent", "Accepted offer 1: ₱ 250,000 over 24 months", "112.198.74.20"],
    [0, "08:58", "Unknown", "login", "Five failed sign-ins in a row, then the account was locked", "User: aurelio.soriano", "", "Wrong password, 5 times. Locked until an administrator unlocks it", "49.145.201.9", 1],
    [0, "08:31", "Regina Sy", "login", "Signed in with a second factor", "User: regina.sy", "", "Signed in", "10.20.4.40"],
    [1, "16:44", "Antonio Reyes", "decision", "Approved against the policy result, with a written reason", "APP-2026-0409", "Policy result: counter-offer", "Counter-offer of ₱ 250,000, override note attached", "10.20.4.12", 1],
    [1, "16:10", "Antonio Reyes", "doc", "Opened a document", "APP-2026-0409 · Business permit", "", "Viewed, not downloaded", "10.20.4.12"],
    [1, "15:52", "CALMS", "bureau", "Asked the credit bureau for a score", "APP-2026-0409", "", "FinScore 642 returned", "server"],
    [1, "14:05", "Aurelio Soriano", "data", "Verified encoded figures against the documents", "APP-2026-0409", "Monthly cash flow ₱ 55,000 (as encoded)", "Monthly cash flow ₱ 52,000 (as verified)", "10.20.4.18"],
    [1, "11:18", "Liza Mendoza", "doc", "Downloaded a document", "APP-2026-0409 · Government ID", "", "Downloaded", "10.20.4.17"],
    [1, "09:03", "CALMS", "status", "Sent a 48-hour escalation notice", "APP-2026-0388", "Waiting 48 h at Decision", "Supervisor notified", "server"],
    [2, "17:30", "CALMS", "login", "Ended a session after 15 minutes of no activity", "User: benjie.cruz", "Signed in", "Signed out", "server"],
    [2, "13:22", "Paolo Ventura", "config", "Changed a credit rule", "Loan product: SME loan", "Late penalty 2.5% a month", "Late penalty 3% a month", "10.20.4.5", 1],
    [2, "10:40", "Liza Mendoza", "data", "Created an application", "APP-2026-0409", "", "Norma Estrella, SME loan, ₱ 300,000 over 24 months", "10.20.4.17"],
    [4, "15:15", "Paolo Ventura", "config", "Deactivated a user account", "User: lorna.vidal", "Active", "Deactivated. Past actions stay on record", "10.20.4.5", 1],
    [6, "09:12", "Corazon Ilagan", "status", "Funding confirmed, loan account opened", "LN-2026-0148", "Instruction sent", "Funded", "10.20.4.22"],
    [12, "14:01", "Regina Sy", "audit", "Exported audit records", "Audit log", "", "212 entries, spreadsheet", "10.20.4.40"],
    [21, "10:26", "Paolo Ventura", "config", "Changed a role", "User: maricar.tolentino", "Loan Processor", "Underwriter, limit ₱ 300,000", "10.20.4.5", 1]
  ];
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ("0000000" + (h >>> 0).toString(16)).slice(-8); }
  var TOTAL = LIVE ? LIVE.total : 48212, E, F, open, shownMax, checking = false;
  function manila(at) { var m = new Date(new Date(at).getTime() + 8 * 3600e3); return { d: Math.round((T0 - Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate())) / 86400e3), t: ("0" + m.getUTCHours()).slice(-2) + ":" + ("0" + m.getUTCMinutes()).slice(-2) }; }
  function fromLive(L) { ROLE = {}; return L.entries.map(function (x) { var w = manila(x.at); if (x.role) ROLE[x.who] = x.role; return { n: x.n, d: w.d, t: w.t, who: x.who, kind: x.kind, text: x.text, rec: x.rec, was: x.was, now: x.now, ip: x.ip, hot: x.hot, seal: x.seal.slice(0, 16), prev: x.prev.slice(0, 16), at: x.at }; }); }
  function whoList() { var w = $("who"), keep = w.value; w.textContent = ""; fill(w, [["", "Anyone"]].concat(Object.keys(ROLE).sort().map(function (k) { return [k, k === "CALMS" ? "CALMS itself" : k === "Unknown" ? "Not signed in" : k]; }))); w.value = keep; if (w.value !== keep) { w.value = ""; F.who = ""; } }
  function reload() { return CALMS.api("GET", "/api/audit?days=30").then(function (d) { LIVE = d; TOTAL = d.total; var ok = {}; E.forEach(function (e) { if (e.ok) ok[e.n] = 1; }); E = fromLive(d); E.forEach(function (e) { if (ok[e.n]) e.ok = true; }); whoList(); SEAL0 = sealText(); if ($("wax").className === "wax") $("sealp").textContent = SEAL0; rows(); }); }
  function sealText() { return TOTAL.toLocaleString("en-PH") + " entries since " + new Date(LIVE.since).toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "long", day: "numeric", year: "numeric" }) + ". Each one is stamped with a seal made from the entry before it, so changing or removing one would break every seal after it. This page shows the last 30 days" + (LIVE.truncated ? " (the newest 1,000)" : "") + "."; }
  function chain() { var prev = "a41c09e7"; for (var i = E.length - 1; i >= 0; i--) { E[i].prev = prev; E[i].seal = hash(prev + E[i].text + E[i].t + E[i].rec); prev = E[i].seal; } }
  function fresh() { if (LIVE) { E = fromLive(LIVE); F = { q: "", kind: "", who: "", when: 7 }; open = null; shownMax = 12; return; } E = RAW.map(function (r, i) { return { n: TOTAL - i, d: r[0], t: r[1], who: r[2], kind: r[3], text: r[4], rec: r[5], was: r[6], now: r[7], ip: r[8], hot: !!r[9] }; }); chain(); F = { q: "", kind: "", who: "", when: 7 }; open = null; shownMax = 12; }
  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[0, 2400], [3, 110], [0, 1800], [28, 1200]], NOD = [[16, 120], [17, 120], [18, 140], [19, 500], [20, 140], [21, 300]], WATCH = [[28, 500], [25, 400], [28, 500], [26, 400]];
  var SEAL0 = LIVE ? "" : "48,212 entries since January 2026. Each one is stamped with a seal made from the entry before it, so changing or removing one would break every seal after it.";
  /* ---- the log ---- */
  function list() { var q = F.q.trim().toLowerCase(); return E.filter(function (e) { return e.d <= F.when && (!F.kind || e.kind === F.kind) && (!F.who || e.who === F.who) && (!q || (e.who + " " + e.text + " " + e.rec + " " + e.now).toLowerCase().indexOf(q) > -1); }); }
  function rows(focus) { var L = $("rows"), a = list(); L.textContent = ""; $("cnt").textContent = a.length === 1 ? "1 entry matches." : a.length + " entries match.";
    a.slice(0, shownMax).forEach(function (e) { var li = el("li", (open === e.n ? "open" : "") + (e.isNew ? " new" : "")); e.isNew = false; var b = el("button", "ent"); b.type = "button"; b.id = "e" + e.n; b.setAttribute("aria-expanded", String(open === e.n));
      b.appendChild(el("span", "ck", e.ok ? "✓" : "")); b.appendChild(el("span", "wh", dd(e.d) + " " + e.t)); var w = el("span", "by", e.who); w.appendChild(el("small", "", ROLE[e.who] || "")); b.appendChild(w); var t = el("span", "tx"); t.appendChild(document.createTextNode(e.text + " ")); t.appendChild(el("b", "", e.rec)); if (e.hot) t.appendChild(el("span", "tag", "Sensitive")); b.appendChild(t); b.appendChild(el("span", "ar"));
      b.addEventListener("click", function () { open = open === e.n ? null : e.n; rows(e.n); }); li.appendChild(b); if (open === e.n) li.appendChild(detail(e)); L.appendChild(li); });
    if (a.length > shownMax) { var li = el("li"), m = el("button", "more", "Show " + Math.min(12, a.length - shownMax) + " older entries"); m.type = "button"; m.id = "more"; m.addEventListener("click", function () { var first = a[shownMax]; shownMax += 12; rows(first.n); }); li.appendChild(m); L.appendChild(li); }
    var em = $("empty"); em.hidden = a.length > 0; if (!a.length) em.textContent = "Nothing matches. Widen the dates or clear a filter."; if (focus && $("e" + focus)) $("e" + focus).focus(); }
  function detail(e) { var d = el("div", "det"), r = el("dl", "rcd"); [["Entry", "No. " + e.n.toLocaleString("en-PH")], ["When", full(e.d, e.t)], ["Who", e.who + (ROLE[e.who] ? ", " + ROLE[e.who] : "")], ["Record", e.rec], ["From address", e.ip], ["This seal", e.seal], ["Seal before it", e.prev]].forEach(function (x) { r.appendChild(el("dt", "", x[0])); r.appendChild(el("dd", "", x[1])); }); d.appendChild(r);
    var c = el("dl", "chg"), a = el("div", "was"), b = el("div", "now"); a.appendChild(el("dt", "", "Before")); a.appendChild(el("dd", "", e.was || "nothing; this was new")); if (!e.was) a.querySelector("dd").style.textDecoration = "none"; b.appendChild(el("dt", "", "After")); b.appendChild(el("dd", "", e.now)); c.appendChild(a); c.appendChild(b); d.appendChild(c);
    d.appendChild(el("p", "ro", "This entry cannot be edited or deleted.")); return d; }
  /* ---- the seal ---- */
  function check() { if (checking) return; checking = true; var a = E.slice(), i = 0, bt = $("chk"); bt.setAttribute("aria-disabled", "true"); $("wax").className = "wax"; $("wax").innerHTML = "GR8<br>Seal"; E.forEach(function (e) { e.ok = false; }); rows(); $("sealp").textContent = "Checking every seal against the one before it…"; loop(WATCH);
    function done() { E.forEach(function (e) { e.ok = true; }); rows(); var w = $("wax"); w.className = "wax ok"; w.textContent = "Unbroken"; $("sealp").textContent = "Unbroken. All " + TOTAL.toLocaleString("en-PH") + " entries still match the one before them. Checked at " + nowT() + " PST."; $("note").textContent = "Seal check finished: nothing has been changed or removed."; checking = false; bt.removeAttribute("aria-disabled"); loop(NOD, function () { loop(IDLE); }); }
    if (LIVE) { var t0 = Date.now(), res = null, failed = null; a = list().slice(0, shownMax); /* tick the rows on screen; the server checks every entry */ CALMS.api("POST", "/api/audit/check").then(function (d) { res = d; }, function (e) { failed = e; });
      var tl = setInterval(function () { if (i < a.length && !reduce) { a[i].ok = true; var b = $("e" + a[i].n); if (b) b.querySelector(".ck").textContent = "✓"; i++; return; } if (!res && !failed) return; clearInterval(tl);
        if (failed) { checking = false; bt.removeAttribute("aria-disabled"); $("sealp").textContent = SEAL0; $("note").textContent = "The check could not run: " + failed.message; loop(IDLE); return; }
        if (res.unbroken) { done(); reload(); return; }
        checking = false; bt.removeAttribute("aria-disabled"); var w = $("wax"); w.className = "wax"; w.textContent = "Broken"; $("sealp").textContent = "Broken at entry " + Number(res.firstBrokenEntry).toLocaleString("en-PH") + ": it no longer matches the entry before it, so the log was changed outside CALMS. Tell the Compliance Auditor."; $("note").textContent = "Seal check finished: the record has been tampered with."; loop(IDLE); reload(); }, 70); return; }
    if (reduce) { done(); return; } var t = setInterval(function () { if (i >= a.length) { clearInterval(t); done(); return; } a[i].ok = true; var b = $("e" + a[i].n); if (b) b.querySelector(".ck").textContent = "✓"; i++; }, 70); }
  function exportIt(kind) { var n = list().length; if (!n) { $("note").textContent = "There is nothing to export. Change the filters first."; return; }
    if (LIVE) { var L = list(), head = ["Entry", "When (PST)", "Who", "Role", "Kind", "What", "Record", "Before", "After", "From address", "Seal"], KN = {}; KINDS.forEach(function (k) { KN[k[0]] = k[1]; });
      var rowsOut = [head].concat(L.map(function (e) { return [e.n, full(e.d, e.t), e.who, ROLE[e.who] || "", KN[e.kind] || e.kind, e.text, e.rec, e.was, e.now, e.ip, e.seal]; })), stamp = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
      CALMS.api("POST", "/api/audit/export", { count: n, format: kind, filters: F }).then(function () {
        if (kind === "PDF") CALMS.printTable("CALMS audit log extract", n + " entries, exported " + stamp + " by " + (CALMS.user ? CALMS.user.name : "") + ". GR8 Lending Company.", rowsOut);
        else CALMS.download("calms-audit-" + stamp + ".csv", CALMS.csv(rowsOut));
        $("note").textContent = n + (n === 1 ? " entry" : " entries") + (kind === "PDF" ? " downloaded as a PDF." : " downloaded as a spreadsheet (CSV).") + " The export itself was added to the log."; reload(); }, function (e) { $("note").textContent = "Not exported. " + e.message; });
      return; } TOTAL++; E.unshift({ n: TOTAL, d: 0, t: nowT().slice(0, 5), who: "Regina Sy", kind: "audit", text: "Exported audit records", rec: "Audit log", was: "", now: n + " entries, " + kind, ip: "10.20.4.40", hot: false, isNew: true }); chain(); SEAL0 = SEAL0.replace(/^[\d,]+/, TOTAL.toLocaleString("en-PH")); if ($("wax").className === "wax") $("sealp").textContent = SEAL0; rows(); $("note").textContent = "Prototype: " + n + " entries would download as a " + kind + ". The export itself was added to the log as entry " + TOTAL.toLocaleString("en-PH") + "."; }
  function fill(sel, opts) { opts.forEach(function (o) { sel.appendChild(new Option(o[1], o[0])); }); }
  fill($("kind"), KINDS); fill($("who"), [["", "Anyone"]].concat(Object.keys(ROLE).filter(function (k) { return k !== "Benjie Cruz"; }).map(function (k) { return [k, k === "CALMS" ? "CALMS itself" : k === "Unknown" ? "Not signed in" : k]; })));
  $("q").addEventListener("input", function () { F.q = this.value; shownMax = 12; rows(); }); $("kind").addEventListener("change", function () { F.kind = this.value; shownMax = 12; rows(); }); $("who").addEventListener("change", function () { F.who = this.value; shownMax = 12; rows(); }); $("when").addEventListener("change", function () { F.when = +this.value; shownMax = 12; rows(); });
  $("chk").addEventListener("click", check); $("xc").addEventListener("click", function () { exportIt("spreadsheet"); }); $("xp").addEventListener("click", function () { exportIt("PDF"); });
  var NAV = [["My Queue", 0], ["Audit log", 1], ["Reports", 0], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"); x.href = "#"; x.appendChild(el("span", "plate", n[0])); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  fresh(); if (LIVE) { SEAL0 = sealText(); whoList(); var ft = document.querySelectorAll(".foot span"); if (ft[1]) ft[1].textContent = "Live log. Nobody can change or delete an entry, not even an administrator: the database refuses."; } $("sealp").textContent = SEAL0; rows(); loop(IDLE);
}
