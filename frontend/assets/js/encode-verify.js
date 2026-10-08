/* Online with ?ref=APP-…, the entries come from GET /api/applications/:ref/verification, the real scanned
   papers are shown beside them, and Verify / Return / Resubmit are sent to the server, which enforces the
   maker-checker rule. Opened from the folder, the sample application below is shown and nothing is sent. */
(function () {
  var REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1];
  if (!REF || !window.CALMS || !CALMS.online) { start(null, null); return; }
  Promise.all([CALMS.api("GET", "/api/applications/" + encodeURIComponent(REF) + "/verification"), CALMS.api("GET", "/api/auth/me")])
    .then(function (r) { start(r[0], r[1].user); }, function (err) { if (err.status === 401) return; start(null, null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample application instead."; });
})();
function start(LIVE, ME) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function now() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  var money = function (v) { return /^\d{1,3}(,\d{3})*\.\d{2}$/.test(v) ? "" : "Write the amount with commas and two decimals, for example 158,400.00."; };
  var date = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v)) ? "" : "Write the date as year-month-day, for example 1979-03-14."; };
  /* field: [key, label, what the paper says, what was encoded, optional format check] */
  var DOCS = [
    { id: "id", tab: "Government ID", file: "estrella-tin-id-rescan.jpg (v2)", title: "Republic of the Philippines", sub: "Bureau of Internal Revenue · Taxpayer Identification Card", kind: "id", fields: [
      ["name", "Full name", "NORMA DELA PAZ ESTRELLA", "Norma Dela Paz Estrella"],
      ["tin", "TIN", "214-608-921-000", "214-680-921-000", function (v) { return /^\d{3}-\d{3}-\d{3}-\d{3}$/.test(v) ? "" : "A TIN looks like 000-000-000-000."; }],
      ["dob", "Date of birth", "March 14, 1979", "1979-03-14", date],
      ["addr", "Address", "118 Paseo del Congreso, Catmon, Malolos, Bulacan", "118 Paseo del Congreso, Catmon, Malolos, Bulacan"] ] },
    { id: "reg", tab: "DTI registration", file: "dti-certificate.pdf (v1)", title: "Certificate of Business Name Registration", sub: "Department of Trade and Industry", kind: "seal", fields: [
      ["biz", "Business name", "ESTRELLA RICE TRADING", "Estrella Rice Trading"],
      ["regno", "Registration number", "2917845", "2917845", function (v) { return /^\d{7}$/.test(v) ? "" : "A DTI number has 7 digits."; }],
      ["valid", "Valid until", "August 22, 2029", "2029-08-22", date] ] },
    { id: "bank", tab: "Bank statements", file: "bdo-jul-sep-2026.pdf (v1)", title: "Statement of Account", sub: "Savings account · July to September 2026", kind: "bank", fields: [
      ["acname", "Account name", "NORMA D. ESTRELLA", "Norma D. Estrella"],
      ["acno", "Account number", "0041-2298-71", "0041-2298-71"],
      ["avg", "Average monthly credits", "158,400.00", "185,400.00", money],
      ["bal", "Ending balance", "96,215.40", "96,215.40", money] ] },
    { id: "fs", tab: "Financial statements", file: "fs-2025.pdf (v1)", title: "Statement of Income", sub: "Estrella Rice Trading · Year ended 31 December 2025", kind: "fs", fields: [
      ["rev", "Annual revenue", "2,184,000.00", "2,184,000.00", money],
      ["net", "Net income", "412,600.00", "412,600.00", money] ] }
  ];
  function whenL(t) { return new Date(t).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " PST"; }
  var FMT = { money: money, date: date, years: function (v) { return /^\d+(\.\d+)?$/.test(v) ? "" : "Enter the number of years, for example 3."; }, id: function (v) { return v.trim() ? "" : "Enter the ID number."; } };
  if (LIVE) DOCS = LIVE.papers.map(function (p) { return { id: p.slot, tab: p.label, file: p.file, live: true, fields: p.fields.map(function (f) { return [f.key, f.label, "", f.value, FMT[f.format] || null]; }) }; });
  var REASONS = ["Differs from the document", "Cannot be read on the document", "Belongs in a different field", "Missing from the document"];
  var F = {}; DOCS.forEach(function (d) { d.fields.forEach(function (f) { F[f[0]] = { val: f[3], check: null, reason: "", noteT: "", was: [], edited: false }; }); });
  if (LIVE) LIVE.papers.forEach(function (p) { p.fields.forEach(function (f) { var S = F[f.key]; S.wasVal = f.value;
    S.was = f.was.map(function (w) { return [w.value, w.by, whenL(w.at)]; });
    if (LIVE.state === "returned" && f.flag) { S.check = "flag"; S.reason = f.flag.reason; S.noteT = f.flag.note || ""; }
    else if (LIVE.state === "verified") S.check = "ok"; else if (LIVE.state === "waiting" && f.check === "ok") S.check = "ok"; }); });
  var status = LIVE ? ({ waiting: "encoded", returned: "returned", verified: "verified", draft: "encoded" })[LIVE.state] : "encoded", role = LIVE ? (LIVE.canCheck ? "v" : "e") : "v", cur = DOCS[0].id, active = "", zoom = 15, slam = false, tried = false;
  var REC = [["Oct 5, 13:42 PST", "L. Mendoza encoded 13 entries from 4 documents"], ["Oct 5, 13:44 PST", "L. Mendoza submitted the application for verification"]];
  var WHO = { v: ["Aurelio Soriano", "Loan Processor (second user)", "A. Soriano"], e: ["Liza Mendoza", "Loan Processor", "L. Mendoza"] };
  /* names in the sentences below: the checker, the encoder, and how many papers */
  var CHK = "A. Soriano", ENC = "L. Mendoza", ENCF = "Liza", NPAP = "all four documents", BUSY = false;
  if (LIVE) {
    REC = LIVE.record.map(function (r) { return [whenL(r.at), r.text]; });
    if (ME) WHO[role] = [ME.name, role === "v" ? ME.roleName + " (second user)" : ME.roleName, ME.shortName];
    ENC = LIVE.encodedBy; ENCF = LIVE.encodedBy; CHK = LIVE.canCheck && ME ? ME.shortName : (LIVE.returnedBy || LIVE.verifiedBy || "the checker");
    NPAP = "all " + DOCS.length + " papers";
    var pr = document.getElementById("protoRole"); if (pr) pr.style.display = "none";
    var ca = document.getElementById("cApps"), cr = document.getElementById("cRef");
    if (ca) { ca.classList.remove("px"); ca.href = "applications.html"; } if (cr) { cr.classList.remove("px"); cr.href = "application-detail.html?ref=" + LIVE.reference; cr.textContent = LIVE.reference; }
    document.getElementById("subline").textContent = LIVE.borrower + " · " + LIVE.product + " · " + LIVE.reference; document.title = "CALMS Encode and verify " + LIVE.reference;
  }
  function docNow() { return DOCS.filter(function (d) { return d.id === cur; })[0]; }
  function all() { var L = []; DOCS.forEach(function (d) { d.fields.forEach(function (f) { L.push(f); }); }); return L; }
  function canCheck() { return LIVE ? LIVE.canCheck && status === "encoded" : role === "v" && status === "encoded"; } function canFix() { return LIVE ? LIVE.canFix && status === "returned" : role === "e" && status === "returned"; }

  /* ---- Kuwa ---- */
  var kuwa = $("kuwa"), kT = null;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[28, 2400], [3, 110]];
  function say(t, m) { $("says").textContent = t; if (m === "alert") loop([[22, 80], [23, 700], [24, 1300]], function () { loop(IDLE); }); else if (m === "nod") loop([[18, 140], [19, 400], [18, 140]], function () { loop(IDLE); }); else if (m === "sleep") loop([[13, 900], [14, 900], [15, 900]]); else loop(IDLE); }

  /* ---- the paper ---- */
  function drawDoc() {
    var d = docNow(), box = $("doc"); box.textContent = ""; box.style.setProperty("--z", zoom + "px");
    if (d.live) { var zb = document.querySelector(".zoom"); if (zb) zb.style.display = "none";
      if (!d.file) { box.appendChild(el("div", "d-title", d.tab)); box.appendChild(el("div", "d-sub", "Not on file yet. Ask the encoder to file it on the Documents page.")); return; }
      var src = "/api/applications/" + LIVE.reference + "/documents/" + d.file.id;
      if (/^image\//.test(d.file.type)) { var im = el("img"); im.src = src; im.alt = d.tab + ", " + d.file.name; im.style.cssText = "display:block;width:100%;height:auto"; box.appendChild(im); }
      else { var fr = el("iframe"); fr.src = src; fr.title = d.tab + ", " + d.file.name; fr.style.cssText = "display:block;width:100%;height:520px;border:0;background:#fff"; box.appendChild(fr); }
      box.appendChild(el("div", "d-fine", d.file.name + " (v" + d.file.version + "). Opening a paper is written to the audit log.")); return; }
    box.appendChild(el("div", "d-title", d.title)); box.appendChild(el("div", "d-sub", d.sub));
    var val = function (k) { var f = d.fields.filter(function (x) { return x[0] === k; })[0], s = el("span", "val" + (active === k ? " on" : "") + (F[k].check === "flag" ? " circ" : ""), f[2]); s.dataset.k = k; s.addEventListener("mouseenter", function () { focusKey(k, true); }); return s; };
    var row = function (label, k, text) { var r = el("div", "d-row"); r.appendChild(el("span", "l", label)); if (k) { var c = el("span"); c.appendChild(val(k)); r.appendChild(c); } else r.appendChild(el("span", "", text)); box.appendChild(r); };
    if (d.kind === "id") { box.appendChild(el("div", "d-photo")); row("Name", "name"); row("TIN", "tin"); row("Birth date", "dob"); row("Address", "addr"); row("Issued", null, "June 2, 2021"); box.appendChild(el("div", "d-fine", "This card is not transferable. Signature of taxpayer on the reverse.")); }
    else if (d.kind === "seal") { row("Business name", "biz"); row("Certificate no.", "regno"); row("Owner", null, "NORMA DELA PAZ ESTRELLA"); row("Scope", null, "City / Municipality: Malolos, Bulacan"); row("Issued", null, "August 22, 2024"); row("Valid until", "valid"); box.appendChild(el("div", "d-seal", "DTI BULACAN")); }
    else if (d.kind === "bank") { row("Account name", "acname"); row("Account no.", "acno"); var t = el("table", "d-tbl"), hd = el("tr"); ["Month", "Credits", "Debits", "Balance"].forEach(function (h) { hd.appendChild(el("th", "", h)); }); t.appendChild(hd);
      [["Jul 2026", "149,200.00", "131,880.00", "88,470.15"], ["Aug 2026", "162,750.00", "158,010.25", "93,209.90"], ["Sep 2026", "163,250.00", "160,244.50", "96,215.40"]].forEach(function (r) { var tr = el("tr"); r.forEach(function (c) { tr.appendChild(el("td", "", c)); }); t.appendChild(tr); }); box.appendChild(t);
      row("Average monthly credits", "avg"); row("Ending balance", "bal"); box.appendChild(el("div", "d-fine", "Computer-generated statement. No signature required.")); }
    else { var t2 = el("table", "d-tbl"); [["Sales", null, "2,184,000.00", "rev"], ["Cost of sales", "1,502,300.00"], ["Gross profit", "681,700.00"], ["Operating expenses", "214,900.00"], ["Income before tax", "466,800.00"], ["Income tax", "54,200.00"], ["Net income", null, "412,600.00", "net"]].forEach(function (r) { var tr = el("tr"); tr.appendChild(el("td", "", r[0])); var td = el("td"); if (r[3]) td.appendChild(val(r[3])); else td.textContent = r[1]; tr.appendChild(td); t2.appendChild(tr); }); box.appendChild(t2); box.appendChild(el("div", "d-fine", "Prepared by the proprietor. Unaudited.")); }
    box.appendChild(el("div", "d-fine", "File: " + d.file + ". Stand-in drawing of the stored document."));
  }
  /* ---- the red thread ---- */
  function thread() {
    var svg = $("thread"); svg.textContent = ""; if (!active || getComputedStyle(svg).display === "none") return;
    var a = document.querySelector('#doc .val[data-k="' + active + '"]'), b = document.querySelector('#rows [data-k="' + active + '"] .enc, #rows [data-k="' + active + '"] input[type=text]'); if (!a || !b) return;
    var w = $("work").getBoundingClientRect(), ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), x1 = ra.right - w.left + 4, y1 = ra.top + ra.height / 2 - w.top, x2 = rb.left - w.left - 6, y2 = rb.top + rb.height / 2 - w.top;
    var ns = "http://www.w3.org/2000/svg", mk = function (n, at) { var e = document.createElementNS(ns, n); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); svg.appendChild(e); return e; };
    var sag = 26 + Math.abs(x2 - x1) * .06, dpath = "M" + x1 + " " + y1 + " Q" + (x1 + x2) / 2 + " " + (Math.max(y1, y2) + sag) + " " + x2 + " " + y2;
    mk("path", { d: dpath, fill: "none", stroke: "#24130a", "stroke-width": 5, opacity: .25, transform: "translate(2,3)" }); mk("path", { d: dpath, fill: "none", stroke: "#b3261a", "stroke-width": 3, "stroke-linecap": "round" });
    [[x1, y1], [x2, y2]].forEach(function (p) { mk("circle", { cx: p[0], cy: p[1], r: 6, fill: "#c98f4a", stroke: "#24130a", "stroke-width": 2 }); });
  }
  function focusKey(k, soft) { if (active === k) return; active = k; [].forEach.call(document.querySelectorAll("#doc .val"), function (v) { v.classList.toggle("on", v.dataset.k === k); }); [].forEach.call(document.querySelectorAll("#rows .rowf"), function (r) { r.classList.toggle("on", r.dataset.k === k); }); thread(); }

  /* ---- the entries ---- */
  function drawRows() {
    var d = docNow(), ul = $("rows"); ul.textContent = "";
    $("sTitle").textContent = "Entries copied from this " + (d.kind === "id" || d.id === "id" ? "ID" : "paper");
    $("hint").textContent = canCheck() ? "Compare each entry with the paper, one line at a time. Point at a line and the thread shows where it came from." : canFix() ? "Correct the entries the verifier marked. The rest are locked." : status === "verified" ? "Verified and locked." : LIVE && !LIVE.isEncoder && !LIVE.canCheck ? "Read only. Only a loan processor who did not encode it can check these entries." : role === "e" ? "Waiting for a second user. You encoded these entries, so you cannot verify them." : "Returned to the encoder. Waiting for corrections.";
    d.fields.forEach(function (f) {
      var k = f[0], S = F[k], li = el("li", "rowf" + (S.check === "ok" ? " ok" : S.check === "flag" ? " flag" : "") + (active === k ? " on" : "")); li.dataset.k = k;
      li.addEventListener("mouseenter", function () { focusKey(k); }); li.addEventListener("focusin", function () { focusKey(k); });
      li.appendChild(el("span", "rl", f[1]));
      if (canFix() && S.check === "flag") {
        var inp = el("input"); inp.type = "text"; inp.id = "fx-" + k; inp.value = S.val; inp.setAttribute("aria-label", "Corrected " + f[1].toLowerCase()); inp.autocomplete = "off";
        var fe = el("div", "fe"); inp.addEventListener("input", function () { if (!S.orig) S.orig = S.val === inp.value ? S.val : S.orig || f[3]; S.val = inp.value; S.edited = S.val !== S.wasVal; var e = f[4] ? f[4](S.val.trim()) : ""; fe.textContent = S.edited ? e : ""; if (e && S.edited) inp.setAttribute("aria-invalid", "true"); else inp.removeAttribute("aria-invalid"); drawDone(); thread(); });
        li.appendChild(inp); li.appendChild(fe);
      } else { li.appendChild(el("span", "enc" + (S.check === "flag" ? " circ" : ""), S.val)); }
      S.was.forEach(function (w) { li.appendChild(el("span", "was", "was “" + w[0] + "”, corrected by " + w[1] + " " + w[2])); });
      if (S.check === "flag" && !canCheck()) li.appendChild(el("span", "reason", "Marked by " + CHK + ": " + S.reason.toLowerCase() + (S.noteT ? ". “" + S.noteT + "”" : "") + "."));
      if (canCheck()) {
        var pr = el("div", "pair"), y = el("button", "y", "Matches"), n = el("button", "n", "Does not match"); y.type = n.type = "button"; y.setAttribute("aria-pressed", String(S.check === "ok")); n.setAttribute("aria-pressed", String(S.check === "flag"));
        y.addEventListener("click", function () { S.check = S.check === "ok" ? null : "ok"; S.reason = ""; redraw(k); say(left() ? left() + " line" + (left() > 1 ? "s" : "") + " still unchecked." : "Every line checked.", ""); });
        n.addEventListener("click", function () { S.check = S.check === "flag" ? null : "flag"; if (S.check) { S.reason = REASONS[0]; say("Circled. Say why, so she knows what to fix.", "alert"); } redraw(k); var s2 = $("rs-" + k); if (s2) s2.focus(); });
        pr.appendChild(y); pr.appendChild(n); li.appendChild(pr);
        if (S.check === "flag") { var why = el("div", "why"), l1 = el("label", "", "Reason"), sel = el("select"); sel.id = "rs-" + k; l1.htmlFor = sel.id; REASONS.forEach(function (r) { var o = el("option", "", r); sel.appendChild(o); }); sel.value = S.reason; sel.addEventListener("change", function () { S.reason = sel.value; });
          var l2 = el("label", "", "What the paper says (optional)"), nt = el("input"); nt.type = "text"; nt.id = "nt-" + k; l2.htmlFor = nt.id; nt.value = S.noteT; nt.autocomplete = "off"; nt.addEventListener("input", function () { S.noteT = nt.value; });
          why.appendChild(l1); why.appendChild(sel); why.appendChild(l2); why.appendChild(nt); li.appendChild(why); }
      } else if (S.check === "ok") li.appendChild(el("span", "was", "matches the document"));
      ul.appendChild(li);
    });
  }
  function left() { return all().filter(function (f) { return !F[f[0]].check; }).length; }
  function flags() { return all().filter(function (f) { return F[f[0]].check === "flag"; }); }
  function drawTabs() {
    var ul = $("tabs"); ul.textContent = "";
    DOCS.forEach(function (d) { var li = el("li"), b = el("button", "", d.tab); b.type = "button"; b.setAttribute("aria-pressed", String(cur === d.id));
      var ok = d.fields.filter(function (f) { return F[f[0]].check === "ok"; }).length, fl = d.fields.filter(function (f) { return F[f[0]].check === "flag"; }).length;
      b.appendChild(el("small", fl ? "bad" : "", fl ? fl + " circled, " + ok + " of " + d.fields.length + " match" : ok + " of " + d.fields.length + " checked"));
      b.addEventListener("click", function () { cur = d.id; active = ""; drawTabs(); drawDoc(); drawRows(); thread(); }); li.appendChild(b); ul.appendChild(li); });
  }
  function drawStrip() {
    var s = $("strip"); s.textContent = ""; var st = { encoded: ["Encoded", "blue"], returned: ["Returned for Correction", "red"], verified: ["Verified", "green"] }[status];
    var d0 = el("div"); d0.appendChild(el("span", "k", "Verification status")); d0.appendChild(el("span", "stamp " + st[1] + (slam ? " slam" : ""), st[0])); s.appendChild(d0); slam = false;
    var add = function (k, v) { var d = el("div"); d.appendChild(el("span", "k", k)); d.appendChild(el("b", "", v)); s.appendChild(d); };
    add("Encoded by", LIVE ? ENC + ", " + whenL(LIVE.encodedAt) : "L. Mendoza, Oct 5, 13:42 PST"); add("Verified by", status === "verified" ? (LIVE ? (LIVE.verifiedBy || CHK) + (LIVE.verifiedAt ? ", " + whenL(LIVE.verifiedAt) : "") : "A. Soriano, " + REC[REC.length - 1][0]) : "not yet");
    add("Checked", (all().length - left()) + " of " + all().length + " entries"); add("Circled", String(flags().length));
  }
  function drawDone() {
    var box = $("done"); box.textContent = ""; var fl = flags(), L = left();
    if (canCheck()) {
      box.appendChild(el("p", "", L ? L + " of " + all().length + " entries are still unchecked, across " + NPAP + "." : fl.length ? "All entries checked. " + fl.length + " do not match and go back to the encoder with your reasons." : "All entries checked, and all of them match."));
      var bt = el("div", "btns"), r = el("button", "act", "Return to the encoder"), ok = el("button", "act go", "Verify and send to underwriting"); r.type = ok.type = "button";
      r.setAttribute("aria-disabled", String(!fl.length)); ok.setAttribute("aria-disabled", String(!!L || !!fl.length));
      r.addEventListener("click", function () { if (!fl.length) { $("note").textContent = "Nothing is circled. Mark at least one entry as not matching before returning it."; return; }
        if (LIVE) { send("return"); return; }
        status = "returned"; slam = true; fl.forEach(function (f) { F[f[0]].wasVal = F[f[0]].val; REC.push([now(), "A. Soriano returned “" + f[1] + "”: " + F[f[0]].reason.toLowerCase() + (F[f[0]].noteT ? " (" + F[f[0]].noteT + ")" : "")]); });
        $("note").textContent = "Returned for correction. L. Mendoza has been notified with the " + fl.length + " entr" + (fl.length > 1 ? "ies" : "y") + " and your reasons. Switch to the encoder to see her side."; paint(); say("Sent back. She will hear about it.", "nod"); });
      ok.addEventListener("click", function () { if (L || fl.length) { $("note").textContent = L ? "Not yet. " + L + " entr" + (L > 1 ? "ies are" : "y is") + " still unchecked. There is no shortcut to check them all at once." : "Circled entries must go back to the encoder first."; say("Not until every line has been looked at.", "alert"); return; }
        if (LIVE) { send("verify"); return; }
        status = "verified"; slam = true; REC.push([now(), "A. Soriano verified all 13 entries. Application moved to Under Review"]); $("note").textContent = "Verified. The application moves to Under Review and the credit bureau inquiry begins."; paint(); say("Verified by a second pair of eyes. On to underwriting.", "sleep"); });
      bt.appendChild(r); bt.appendChild(ok); box.appendChild(bt);
    } else if (canFix()) {
      var bad = fl.filter(function (f) { var S = F[f[0]]; return !S.edited || (f[4] && f[4](S.val.trim())); });
      box.appendChild(el("p", "", fl.length + " entr" + (fl.length > 1 ? "ies were" : "y was") + " returned. " + (bad.length ? bad.length + " still to correct: " + bad.map(function (f) { return f[1].toLowerCase(); }).join(", ") + "." : "All corrected.")));
      var b2 = el("div", "btns"), rs = el("button", "act go", "Resubmit for verification"); rs.type = "button"; rs.setAttribute("aria-disabled", String(!!bad.length));
      rs.addEventListener("click", function () { if (bad.length) { $("note").textContent = "Correct every returned entry first: " + bad.map(function (f) { return f[1].toLowerCase(); }).join(", ") + "."; return; }
        if (LIVE) { var vals = {}; fl.forEach(function (f) { vals[f[0]] = F[f[0]].val.trim(); }); send("fix", vals); return; }
        fl.forEach(function (f) { var S = F[f[0]]; S.val = S.val.trim(); S.was.push([S.wasVal, "L. Mendoza", now()]); REC.push([now(), "L. Mendoza corrected “" + f[1] + "” from " + S.wasVal + " to " + S.val]); S.check = null; S.reason = ""; S.noteT = ""; S.edited = false; });
        status = "encoded"; slam = true; $("note").textContent = "Resubmitted. Only the corrected entries need checking again. Switch to the verifier to finish."; paint(); say("Corrected. Now someone else checks it again.", "nod"); });
      b2.appendChild(rs); box.appendChild(b2);
    } else box.appendChild(el("p", "", status === "verified" ? "This record is locked. Any later change needs a new correction cycle." : LIVE && !LIVE.isEncoder && status === "encoded" ? "Only a loan processor who did not encode this application can check it." : role === "e" ? "You cannot verify entries you encoded (a different user must). Nothing for you to do until it is verified or returned." : "Waiting for the encoder to correct the circled entries."));
    box.appendChild(el("span", "rl", "Record")); var rc = el("ul", "rec"); REC.slice().reverse().forEach(function (r) { rc.appendChild(el("li", "", r[0] + "  " + r[1])); }); box.appendChild(rc);
  }
  /* ---- online: send the decision; the server checks the maker-checker rule and the papers again ---- */
  function send(kind, vals) {
    if (BUSY) return; BUSY = true; $("note").textContent = "Sending…";
    var checks = {}, flg = {}; all().forEach(function (f) { var S = F[f[0]]; checks[f[0]] = S.check; if (S.check === "flag") flg[f[0]] = { reason: S.reason, note: S.noteT }; });
    var call = kind === "fix" ? CALMS.api("POST", "/api/applications/" + LIVE.reference + "/corrections", { values: vals }) : CALMS.api("POST", "/api/applications/" + LIVE.reference + "/verification", { decision: kind, checks: checks, flags: flg });
    call.then(function () { try { sessionStorage.setItem("calms-flash", kind === "verify" ? "Verified. The application moved to Under Review and goes to underwriting." : kind === "return" ? "Returned for correction. " + ENC + " will see the circled entries and your reasons." : "Resubmitted. Only the corrected entries need checking again, by a second user."); } catch (e) {} location.reload(); }, function (err) { BUSY = false; var F2 = err.fields || {}; $("note").textContent = err.message + (Object.keys(F2).length ? " " + Object.keys(F2).map(function (k) { return F2[k]; }).join(" ") : ""); say(err.status === 409 ? "Not yet. Read the note." : "The office sent it back. Read the note.", "alert"); });
  }
  var flash = ""; try { flash = sessionStorage.getItem("calms-flash") || ""; sessionStorage.removeItem("calms-flash"); } catch (e) {}
  if (flash) setTimeout(function () { $("note").textContent = flash; }, 0);
  else if (LIVE && LIVE.missing.length && LIVE.state === "waiting") setTimeout(function () { $("note").textContent = "Papers still missing: " + LIVE.missing.join(", ") + ". It can be checked now, but not verified until they are on file."; }, 0);
  function redraw(k) { drawTabs(); drawDoc(); drawRows(); drawStrip(); drawDone(); active = ""; focusKey(k); }
  function paint() { $("whoName").textContent = WHO[role][0]; $("whoRole").textContent = WHO[role][1]; drawTabs(); drawDoc(); drawRows(); drawStrip(); drawDone(); thread(); }
  function hello() { say(canCheck() ? "Check every line against the paper, " + (LIVE && ME ? ME.name.split(" ")[0] : "Aurelio") + ". There is no “all match” button, on purpose." : canFix() ? (LIVE ? CHK + " circled " : "He circled ") + flags().length + ". Fix them from the paper, not from memory." : status === "verified" ? "Verified. Leave it be." : LIVE && !LIVE.isEncoder && status === "encoded" ? "Look all you like. Checking is for a loan processor who did not write it." : role === "e" ? "You wrote it, so you do not get to check it. Wait." : "It is back with the encoder. Wait.", status === "verified" ? "sleep" : ""); }
  $("role").addEventListener("change", function () { role = this.value; active = ""; paint(); hello(); });
  $("zi").addEventListener("click", function () { zoom = Math.min(22, zoom + 2); drawDoc(); thread(); }); $("zo").addEventListener("click", function () { zoom = Math.max(12, zoom - 2); drawDoc(); thread(); });
  [].forEach.call(document.querySelectorAll("a.px"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: that is a separate prototype page."; }); });
  var NAV = [["My Queue", 0], ["Applications", 1], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), a = el("a"); a.href = "#"; a.appendChild(el("span", "plate", n[0])); if (n[1]) a.setAttribute("aria-current", "page"); else { a.setAttribute("aria-disabled", "true"); a.title = "A separate prototype page"; } a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: " + n[0] + " is a separate prototype page."; }); li.appendChild(a); nav.appendChild(li); });
  window.addEventListener("resize", thread); window.addEventListener("scroll", thread, true);
  paint(); hello();
}
