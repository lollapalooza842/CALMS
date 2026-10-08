/* Online with ?ref=APP-…, the checklist and the papers come from GET /api/applications/:ref, a chosen file is
   filed with POST /api/applications/:ref/documents, and opening a paper fetches it (each opening is logged).
   Opened from the folder, the two sample checklists below are shown and nothing is sent. */
(function () {
  var REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1];
  if (!REF || !window.CALMS || !CALMS.online) { start(null, null); return; }
  Promise.all([CALMS.api("GET", "/api/applications/" + encodeURIComponent(REF)), CALMS.api("GET", "/api/auth/me")])
    .then(function (r) { start(r[0].application, r[1].user); }, function (err) { if (err.status === 401) return; start(null, null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing the sample checklist instead."; });
})();
function start(LIVE, ME) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function now() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  var H = 3600e3, T = Date.now();
  function ago(h) { return new Date(T - h * H).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) + " PST"; }
  function v(name, kb, hrs, by) { return { name: name, size: kb * 1024, at: ago(hrs), by: by || "L. Mendoza", kind: "sample" }; }
  /* slot: [id, plate label, what it is, mock style, versions (oldest first)] */
  var LISTS = {
    sme: { who: "Norma Estrella · SME loan · APP-2026-0409", slots: [
      ["consent", "Signed consent form", "Credit investigation and data processing", "consent", [v("consent-estrella.pdf", 212, 6)]],
      ["id", "Government ID", "Front and back, readable", "id", [v("estrella-tin-id.jpg", 1840, 5.6), v("estrella-tin-id-rescan.jpg", 2210, 5.1)]],
      ["reg", "DTI or SEC registration", "Certificate in the business name", "permit", [v("dti-certificate.pdf", 388, 5.5)]],
      ["fs", "Financial statements", "Latest full year", "table", [v("fs-2025.pdf", 1320, 5.4)]],
      ["addr", "Proof of address", "Utility bill, last 3 months", "bill", [v("meralco-aug-2026.jpg", 960, 5.3)]],
      ["permit", "Business permit", "Current year, mayor's permit", "permit", []],
      ["bank", "Bank statements", "Latest 3 months", "table", []] ] },
    salary: { who: "Carmela Bautista · Salary loan · APP-2026-0436", slots: [
      ["consent", "Signed consent form", "Credit investigation and data processing", "consent", [v("consent-bautista.pdf", 198, 20, "A. Soriano")]],
      ["id", "Government ID", "Front and back, readable", "id", [v("bautista-sss-id.jpg", 1510, 19.8, "A. Soriano")]],
      ["pay", "Pay stubs", "Latest 2 pay periods", "table", [v("payslips-aug-sep.pdf", 440, 19.7, "A. Soriano")]],
      ["coe", "Certificate of employment", "Dated within 30 days", "consent", [v("coe-bwd.pdf", 156, 19.6, "A. Soriano")]],
      ["addr", "Proof of billing", "Utility bill, last 3 months", "bill", [v("primewater-sep-2026.jpg", 870, 19.5, "A. Soriano")]],
      ["bank", "Bank statement", "Payroll account, latest month", "table", [v("bdo-sep-2026.pdf", 610, 19.4, "A. Soriano")]] ] } };
  /* ---- the real application ---- */
  var DESC = { consent: ["Credit investigation and data processing", "consent"], id: ["Front and back, readable", "id"], reg: ["Certificate in the business name", "permit"], fs: ["Latest full year", "table"],
    addr: ["Utility bill, last 3 months", "bill"], permit: ["Current year, mayor's permit", "permit"], bank: ["Latest 3 months", "table"], pay: ["Latest 2 pay periods", "table"], coe: ["Dated within 30 days", "consent"], income: ["Pay stub or proof of business income", "table"] };
  function whenL(t) { return new Date(t).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  function ver(d) { return { id: d.id, name: d.name, size: d.size, at: whenL(d.at), by: d.by, kind: d.type === "application/pdf" ? "pdf" : "img", url: "" }; }
  var CAN_FILE = false;
  if (LIVE) {
    LISTS.live = { who: LIVE.borrower.name + " · " + LIVE.product + " · " + LIVE.reference, slots: LIVE.checklist.map(function (c) { var d = DESC[c.slot] || ["", "consent"];
      return [c.slot, c.label, d[0], d[1], LIVE.documents.filter(function (x) { return x.slot === c.slot; }).map(ver)]; }) };
    CAN_FILE = ME && (ME.role === "loan_processor" || ME.role === "sales_agent") && (LIVE.status === "draft" || LIVE.status === "submitted");
    var pr = document.getElementById("protos"); if (pr) pr.style.display = "none";
    var ca = document.getElementById("cApps"), cr = document.getElementById("cRef");
    if (ca) { ca.classList.remove("px"); ca.href = "applications.html"; } if (cr) { cr.classList.remove("px"); cr.href = "application-detail.html?ref=" + LIVE.reference; cr.textContent = LIVE.reference; }
    document.title = "CALMS Documents " + LIVE.reference;
  }
  var prod = LIVE ? "live" : "sme", role = LIVE ? (CAN_FILE ? "processor" : "underwriter") : "processor", open = null, openV = 0, linkT = null, left = 0, errs = {};
  var NAMES = { processor: ["Liza Mendoza", "Loan Processor", "L. Mendoza"], underwriter: ["Antonio Reyes", "Lead Underwriter", "A. Reyes"] };
  if (LIVE && ME) NAMES[role] = [ME.name, ME.roleName, ME.shortName];
  function lc(t) { return t.replace(/^(\w)(?=[a-z])/, function (m) { return m.toLowerCase(); }); }   /* "Government ID" -> "government ID", keeps "DTI" */
  function slots() { return LISTS[prod].slots; }
  function slot(id) { return slots().filter(function (s) { return s[0] === id; })[0]; }

  /* ---- Kuwa on the cabinet ---- */
  var kuwa = $("kuwa"), says = $("says"), wrap = $("cabwrap"), kT = null, kLeft = -1;
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[28, 2400], [3, 110]], SLEEP = [[13, 900], [14, 900], [15, 900]], ALERT = [[22, 80], [23, 700], [24, 1500]], NOD = [[18, 140], [19, 380], [18, 140]];
  function perch(text, mode) {
    var miss = slots().filter(function (s) { return !s[4].length; })[0], node = miss && document.getElementById("hole-" + miss[0]), w = wrap.clientWidth;
    var target = node ? node.offsetLeft + node.offsetWidth / 2 - 48 : w / 2 - 48; target = Math.max(0, Math.min(w - 96, target));
    var right = target < w * .5; says.textContent = text; says.style.left = right ? (target + 104) + "px" : "auto"; says.style.right = right ? "auto" : (w - target + 8) + "px";
    var rest = function () { kuwa.classList.remove("walk"); var base = miss ? IDLE : SLEEP; if (mode === "alert") loop(ALERT, function () { loop(base); }); else if (mode === "nod") loop(NOD, function () { loop(base); }); else loop(base); };
    if (kLeft < 0 || reduce || Math.abs(target - kLeft) < 6) { kuwa.style.left = target + "px"; kLeft = target; rest(); return; }
    clearTimeout(kT); kFrame(target > kLeft ? 39 : 41); kuwa.classList.add("walk"); kuwa.style.left = target + "px"; kLeft = target; kT = setTimeout(rest, 820);
  }

  /* ---- filing a paper ---- */
  function file(s, f) {
    delete errs[s[0]];
    if (role !== "processor") return;
    if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { errs[s[0]] = "Not filed. “" + f.name + "” is not a PDF, JPG or PNG."; draw(); perch("Wrong kind of paper. PDF, JPG or PNG only.", "alert"); return; }
    if (f.size > 10 * 1048576) { errs[s[0]] = "Not filed. " + size(f.size) + " is over the 10 MB limit. Rescan it smaller."; draw(); perch("Too heavy for the pigeonhole. Ten megabytes, no more.", "alert"); return; }
    var isImg = /\.(jpe?g|png)$/i.test(f.name), had = s[4].length;
    if (LIVE) { $("note").textContent = "Filing " + f.name + "…"; perch("Hold still. Filing it.", "nod");
      var rd = new FileReader(); rd.onload = function () {
        CALMS.api("POST", "/api/applications/" + LIVE.reference + "/documents", { slot: s[0], file: { name: f.name, data: String(rd.result).split(",")[1] || "" } }).then(function (r) {
          var v = ver(r.document); v.fresh = true; if (isImg) v.url = URL.createObjectURL(f); s[4].push(v);
          $("note").textContent = s[1] + (had ? ": version " + s[4].length + " filed. Version " + had + " is kept as superseded." : ": filed and linked to " + LIVE.reference + ".");
          draw(); var left2 = slots().filter(function (x) { return !x[4].length; }).length;
          perch(left2 ? (left2 === 1 ? "One hole still empty." : left2 + " holes still empty.") + " Keep them coming." : "Every hole is full. Send it on.", "nod"); view(s[0], s[4].length - 1);
        }, function (err) { errs[s[0]] = "Not filed. " + err.message; draw(); perch("The office refused it. Read the red note.", "alert"); }); };
      rd.readAsDataURL(f); return; }
    s[4].push({ name: f.name, size: f.size, at: now(), by: NAMES[role][2], kind: isImg ? "img" : "pdf", url: isImg ? URL.createObjectURL(f) : "", fresh: true });
    $("note").textContent = s[1] + (had ? ": version " + s[4].length + " filed. Version " + had + " is kept as superseded." : ": filed, encrypted and linked to the application.");
    draw(); var left = slots().filter(function (x) { return !x[4].length; }).length;
    perch(left ? (left === 1 ? "One hole still empty." : left + " holes still empty.") + " Keep them coming." : "Every hole is full. Send it on.", "nod");
    view(s[0], s[4].length - 1);
  }
  function draw() {
    var S = slots(), have = S.filter(function (s) { return s[4].length; }).length, cab = $("cab"); cab.textContent = "";
    $("sub").textContent = LISTS[prod].who; $("whoName").textContent = NAMES[role][0]; $("whoRole").textContent = NAMES[role][1];
    S.forEach(function (s, n) {
      var li = el("li", "hole"); li.id = "hole-" + s[0];
      var inp = el("input"); inp.type = "file"; inp.id = "file-" + s[0]; inp.accept = ".pdf,.jpg,.jpeg,.png"; inp.setAttribute("aria-label", "Add file for " + s[1]); inp.addEventListener("change", function () { if (inp.files[0]) file(s, inp.files[0]); });
      if (role === "processor") li.appendChild(inp);
      var box = el("div", "in");
      if (s[4].length) { var cur = s[4][s[4].length - 1], d = el("button", "doc" + (s[4].length === 1 ? " one" : "") + (cur.fresh ? " drop" : "")); d.type = "button"; d.style.setProperty("--r", ((n % 3) - 1) * 1.6 + "deg"); cur.fresh = false;
        d.setAttribute("aria-pressed", String(open === s[0])); d.appendChild(el("b", "", cur.name)); d.appendChild(el("span", "", size(cur.size) + " · " + cur.by)); d.appendChild(el("span", "", cur.at)); d.appendChild(el("i", "", "v" + s[4].length));
        d.addEventListener("click", function () { view(s[0], s[4].length - 1); }); box.appendChild(d); }
      else { var e = el("div", "empty"); e.appendChild(el("b", "", "Missing")); if (role === "processor") { var pk = el("button", "pick", "Choose file"); pk.type = "button"; pk.addEventListener("click", function () { inp.click(); }); e.appendChild(pk); e.appendChild(el("span", "", "or drop it here")); } else e.appendChild(el("span", "", "Not yet on file")); box.appendChild(e); }
      li.appendChild(box);
      var pl = el("div", "brassp"); var pd = el("span", "", s[1]); pd.appendChild(el("small", "", s[2])); pl.appendChild(pd); li.appendChild(pl);
      if (errs[s[0]]) { var er = el("div", "herr", errs[s[0]]); er.setAttribute("role", "alert"); li.appendChild(er); }
      if (s[4].length && role === "processor") { var tl = el("div", "tools"), rb = el("button", "", "Replace"); rb.type = "button"; rb.addEventListener("click", function () { inp.click(); }); tl.appendChild(rb); li.appendChild(tl); }
      if (role === "processor") { li.addEventListener("dragover", function (ev) { ev.preventDefault(); li.classList.add("over"); }); li.addEventListener("dragleave", function () { li.classList.remove("over"); }); li.addEventListener("drop", function (ev) { ev.preventDefault(); li.classList.remove("over"); var f = ev.dataTransfer.files[0]; if (f) file(s, f); }); }
      cab.appendChild(li);
    });
    var fl = $("flip"); fl.textContent = ""; fl.appendChild(el("span", "", String(have))); fl.appendChild(el("em", "", "of")); fl.appendChild(el("span", "", String(S.length))); fl.setAttribute("aria-label", have + " of " + S.length + " documents on file");
    var miss = S.filter(function (s) { return !s[4].length; }).map(function (s) { return lc(s[1]); }), go = $("go");
    $("state").textContent = miss.length ? "Still needed: " + miss.join(", ") + ". The application cannot go on to encoding and verification until every required paper is on file." : "Checklist complete. Every required paper is on file.";
    go.hidden = role !== "processor"; go.setAttribute("aria-disabled", String(!!miss.length));
  }
  /* ---- the light table ---- */
  function mock(kind, name) {
    var f = document.createDocumentFragment(), L = function (c, n) { for (var i = 0; i < n; i++) f.appendChild(el("div", "m-line " + c)); };
    if (kind === "id") { f.appendChild(el("div", "m-title", "Republic of the Philippines")); var w = el("div"); w.appendChild(el("div", "m-photo")); ["m", "s", "", "s", "m"].forEach(function (c) { var l = el("div", "m-line " + c); l.style.marginBottom = "10px"; w.appendChild(l); }); f.appendChild(w); }
    else if (kind === "table") { f.appendChild(el("div", "m-title", "Statement")); L("s", 1); for (var i = 0; i < 9; i++) { var r = el("div", "m-row"); r.appendChild(el("span")); r.appendChild(el("span")); r.appendChild(el("span")); f.appendChild(r); } }
    else if (kind === "permit") { f.appendChild(el("div", "m-title", "Certificate")); L("", 2); L("m", 1); L("", 2); L("s", 1); f.appendChild(el("div", "m-seal")); }
    else if (kind === "bill") { f.appendChild(el("div", "m-title", "Billing Statement")); L("s", 2); for (var j = 0; j < 5; j++) { var r2 = el("div", "m-row"); r2.appendChild(el("span")); r2.appendChild(el("span")); r2.appendChild(el("span")); f.appendChild(r2); } L("m", 1); }
    else { f.appendChild(el("div", "m-title", "Consent and Authorization")); L("", 3); L("m", 1); L("", 2); L("s", 1); f.appendChild(el("div", "m-sig")); }
    f.appendChild(el("div", "m-cap", "Stand-in picture for “" + name + "”")); return f;
  }
  function view(id, vi) {
    var s = slot(id); if (!s || !s[4].length) return; open = id; openV = vi; var d = s[4][vi], lamp = $("lamp"), cur = vi === s[4].length - 1;
    $("tTitle").textContent = s[1]; lamp.textContent = ""; lamp.classList.remove("expired");
    var src = LIVE && d.id ? "/api/applications/" + LIVE.reference + "/documents/" + d.id : "";
    if (src && d.kind === "img") { var im2 = el("img"); im2.src = d.url || src; im2.alt = s[1] + ", " + d.name; lamp.appendChild(im2); if (d.url) d.url = ""; }
    else if (src) { var fr = el("iframe"); fr.src = src; fr.title = s[1] + ", " + d.name; fr.style.cssText = "width:100%;height:100%;min-height:360px;border:0;background:#fff"; lamp.appendChild(fr); }
    else if (d.kind === "img" && d.url) { var im = el("img"); im.src = d.url; im.alt = s[1] + ", " + d.name; lamp.appendChild(im); } else lamp.appendChild(mock(d.kind === "pdf" ? s[3] : s[3], d.name));
    var m = $("meta"); m.textContent = ""; [["File", d.name], ["Version", "v" + (vi + 1) + (cur ? ", current" : ", superseded")], ["Size", size(d.size)], ["Filed", d.at + " by " + d.by], ["Storage", LIVE ? "In the CALMS database, encrypted at rest. Linked to " + LIVE.reference : "Encrypted at rest. Linked to " + LISTS[prod].who.split(" · ")[2]], ["Link", LIVE ? "Every opening is written to the audit log" : ""]].forEach(function (x) { m.appendChild(el("dt", "", x[0])); var dd = el("dd", "", x[1]); if (x[0] === "Link") dd.id = "ttl"; m.appendChild(dd); });
    var vs = $("vers"); vs.textContent = ""; if (s[4].length > 1) s[4].forEach(function (x, i) { var li = el("li"), b = el("button"); b.type = "button"; b.setAttribute("aria-pressed", String(i === vi)); var lab = "v" + (i + 1) + "  " + x.name + "  " + x.at; if (i < s[4].length - 1) b.appendChild(el("s", "", lab)); else b.textContent = lab + "  (current)"; b.addEventListener("click", function () { view(id, i); }); li.appendChild(b); vs.appendChild(li); });
    $("hush").textContent = s[4].length > 1 ? "Superseded versions stay on file and can still be read." : "One version on file.";
    var tb = $("tb"); tb.textContent = ""; var b1 = el("button", "", LIVE ? "Open in a new tab" : "Download"); b1.type = "button"; b1.addEventListener("click", function () { if (src) { window.open(src, "_blank", "noopener"); log("opened"); return; } $("note").textContent = "Prototype: a download would use a link that expires in five minutes, and would be logged."; log("downloaded"); }); tb.appendChild(b1);
    log("viewed"); clearInterval(linkT); if (LIVE) return; left = 300; var tickL = function () { var t = $("ttl"); if (!t) return; if (left <= 0) { clearInterval(linkT); t.textContent = "expired"; lamp.classList.add("expired"); var ex = el("div", "exp"); ex.appendChild(el("span", "", "This link has expired. Papers are only readable through a link that lasts five minutes.")); var rb = el("button", "pick", "Open it again"); rb.type = "button"; rb.addEventListener("click", function () { view(id, vi); }); ex.appendChild(rb); lamp.appendChild(ex); return; } t.textContent = "expires in " + Math.floor(left / 60) + ":" + ("0" + left % 60).slice(-2); left--; }; tickL(); linkT = setInterval(tickL, 1000);
    [].forEach.call(document.querySelectorAll(".doc"), function (b) { b.setAttribute("aria-pressed", "false"); }); var hb = document.querySelector("#hole-" + id + " .doc"); if (hb) hb.setAttribute("aria-pressed", "true");
    function log(what) { var a = $("acc"), li = el("li", "", new Date().toLocaleTimeString("en-PH", { hour12: false }) + "  " + NAMES[role][2] + " " + what + " " + d.name + " (v" + (vi + 1) + ")  logged"); a.insertBefore(li, a.firstChild); }
  }
  function clearTable() { open = null; clearInterval(linkT); $("tTitle").textContent = "Light table"; $("lamp").textContent = ""; $("lamp").classList.remove("expired"); $("meta").textContent = ""; $("vers").textContent = ""; $("tb").textContent = ""; $("hush").textContent = "Pull a paper out of the cabinet to see it here."; }
  function hello() { var left = slots().filter(function (s) { return !s[4].length; }).length; perch(role !== "processor" ? "You may read. Only the loan processor files papers." : left ? (left === 1 ? "One hole is" : left + " holes are") + " empty. Start with the one under me." : "Every hole is full. Send it on and let me sleep."); }
  $("go").addEventListener("click", function () { var miss = slots().filter(function (s) { return !s[4].length; }); if (miss.length) { $("note").textContent = "Not yet. " + miss.length + " required paper" + (miss.length > 1 ? "s are" : " is") + " still missing: " + miss.map(function (s) { return lc(s[1]); }).join(", ") + "."; perch("Not while a hole is empty.", "alert"); } else if (LIVE) location.href = "encode-verify.html?ref=" + LIVE.reference; else $("note").textContent = "Prototype: the Encode and verify page is not built yet."; });
  $("prod").addEventListener("change", function () { prod = this.value; errs = {}; kLeft = -1; clearTable(); draw(); hello(); });
  $("role").addEventListener("change", function () { role = this.value; errs = {}; draw(); hello(); if (open) view(open, openV); });
  [].forEach.call(document.querySelectorAll("a.px"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: that is a separate prototype page."; }); });
  var NAV = [["My Queue", 0], ["Applications", 1], ["Notifications", 0]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), a = el("a"); a.href = "#"; a.appendChild(el("span", "plate", n[0])); if (n[1]) a.setAttribute("aria-current", "page"); else { a.setAttribute("aria-disabled", "true"); a.title = "A separate prototype page"; } a.addEventListener("click", function (e) { e.preventDefault(); $("note").textContent = "Prototype: " + n[0] + " is a separate prototype page."; }); li.appendChild(a); nav.appendChild(li); });
  window.addEventListener("resize", function () { kLeft = -1; hello(); });
  draw(); hello();
  if (LIVE) { var first = slots().filter(function (s) { return s[4].length; })[0]; if (first) view(first[0], first[4].length - 1); else clearTable(); } else view("id", 1);
}
