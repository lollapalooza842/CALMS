/* CALMS front end <-> back end.
   Loaded first on every page. When the pages are opened through the back end (http://localhost:3000)
   it talks to the real API. When a page is opened straight from the folder (file://) there is no
   back end, so CALMS.online is false and every page falls back to its built-in sample data.
   Online, sample data is never shown: if the server cannot be reached or refuses, the page says so
   (CALMS.unreachable) and offers to try again, so a made-up record can never pass for a real one. */
(function () {
  var online = /^https?:$/.test(location.protocol);
  var atRoot = !/\/pages\/[^/]*$/.test(location.pathname);
  /* what CALMS does when the connection drops (offline.js); it runs right after this file, before the page's own script */
  if (online && !window.CALMS_NET && document.readyState === "loading") document.write('<script src="' + (atRoot ? "" : "../") + 'assets/js/offline.js"><\/script>');
  var signIn = (atRoot ? "" : "../") + "index.html#signin";

  /* The same read asked for twice on one page (the classic look's screen and the page underneath it, the rail and the
     top bar) goes to the server once: both get their own copy of the one answer. Kept for 4 seconds; any change
     (a POST, PUT, PATCH or DELETE) forgets every kept answer, so nothing stale is shown after an action. */
  var shared = {};
  /* Offline (offline.js, window.CALMS_NET): reads come from the copies kept on this computer; a change is refused with
     the reason, unless the page says it may wait (opt.offline: { kind, label, sub }), and then it goes to the outbox.
     Such a change carries its key from the first try, so if the connection dropped after the server had already done
     it, sending it again later is recognised and not done twice. */
  function api(method, path, body, opt) {
    var N = window.CALMS_NET, wait = opt && opt.offline && N ? opt.offline : null, key = wait ? N.newId() : "";
    if (method !== "GET") shared = {};
    else { var hit = shared[path]; if (hit && Date.now() - hit.t < 4000) return hit.p.then(copy); }
    if (N && N.isDown()) return method === "GET" ? N.fromCache(path) : later();
    var head = body ? { "Content-Type": "application/json" } : {}; if (key) head["Idempotency-Key"] = key;
    var p = fetch(path, { method: method, credentials: "same-origin", headers: head, body: body ? JSON.stringify(body) : undefined })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) {
        if (N && (res.status === 503 && data.offline || res.status === 502 || res.status === 504)) throw lost();   /* the server is up but cannot reach its database, or a gateway in between is down */
        var badCode = res.status === 401 && data.field === "mfa";                 /* a wrong authenticator code is a typo, not a lost session */
        if (res.status === 401 && !badCode && !atRoot) { location.href = signIn; }  /* session ended: back to sign-in */
        if (!res.ok) { var e = new Error(data.error || "Something went wrong."); e.status = badCode ? 400 : res.status; e.fields = data.fields; e.field = data.field; throw e; }
        return data; }); }, function () { throw lost(); });
    function lost() { var e = new Error("CALMS cannot be reached."); e.lost = true; e.status = 0; return e; }
    function later() { return wait ? N.queue(method, path, body, wait, key) : Promise.reject(N.err(N.why(method, path))); }
    if (method === "GET") {
      p = p.then(function (data) { if (N) N.keep(path, data); return data; }, function (e) { if (e.lost && N) { N.down(); return N.fromCache(path); } throw e; });
      shared[path] = { t: Date.now(), p: p }; p.catch(function () { delete shared[path]; }); return p.then(copy); }
    return p.catch(function (e) { if (e.lost && N) { N.down(); return later(); } throw e; });
  }
  function copy(d) { return d && typeof d === "object" ? JSON.parse(JSON.stringify(d)) : d; }

  /* Start a page. Fetches `path` first when online and hands the result to start(data);
     offline (opened from the folder) start(null) runs and the page uses its sample data. */
  function boot(path, start) {
    if (!online) { start(null); return; }
    api("GET", path).then(function (data) { start(data); }, function (err) { if (err.status !== 401) unreachable(err); });
  }

  /* Online and the page's record could not be loaded: cover the page with a plain notice and a way on.
     Returns true (online), so a page's own fallback to sample data is skipped. */
  var up = atRoot ? "pages/" : "";
  function notice(title, text, links) {
    if (!document.body) { document.addEventListener("DOMContentLoaded", function () { notice(title, text, links); }); return; }
    var old = document.getElementById("calmsDown"); if (old) old.remove();
    if (!document.getElementById("calmsDownCss")) { var st = document.createElement("style"); st.id = "calmsDownCss";
      st.textContent = "body.calms-down main{visibility:hidden}#calmsDown{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:rgba(26,15,8,.55)}" +
        "#calmsDown>div{max-width:440px;width:100%;box-sizing:border-box;background:#f6e7c8;color:#24130a;border:4px solid #5e3a1f;outline:2px solid #c98f4a;outline-offset:-8px;padding:20px 22px;font:16px/1.45 Georgia,serif;box-shadow:0 8px 0 rgba(26,15,8,.5)}" +
        "#calmsDown h2{margin:0 0 6px;font-size:22px}#calmsDown p{margin:0 0 14px}#calmsDown a{display:inline-block;margin:0 8px 6px 0;padding:9px 14px;background:#7e221c;color:#fff6dc;text-decoration:none;border:1px solid #24130a}#calmsDown a+a{background:#5e3a1f}";
      document.head.appendChild(st); }
    var box = document.createElement("div"), inner = document.createElement("div"); box.id = "calmsDown"; box.setAttribute("role", "alertdialog"); box.setAttribute("aria-labelledby", "calmsDownH");
    var h = document.createElement("h2"); h.id = "calmsDownH"; h.textContent = title; var p = document.createElement("p"); p.textContent = text; inner.appendChild(h); inner.appendChild(p);
    links.forEach(function (l) { var a = document.createElement("a"); a.textContent = l[0]; a.href = l[1] || "#"; if (!l[1]) a.addEventListener("click", function (e) { e.preventDefault(); location.reload(); }); inner.appendChild(a); });
    box.appendChild(inner); document.body.appendChild(box); document.body.classList.add("calms-down"); var f = inner.querySelector("a"); if (f) f.focus();
  }
  function unreachable(err) {
    if (!online) return false;
    if (err && err.offline) { notice("You're offline", err.message, [["Try again"], ["Go to My Queue", up + "my-queue.html"]]); return true; }
    var known = err && err.status >= 400 && err.status < 500;
    notice(known ? "This cannot be opened" : "CALMS cannot be reached",
      known ? (err.message || "The server refused.") : "The server did not answer. If nobody has used CALMS for a while it may be waking up, which can take up to a minute. Nothing was changed.",
      [["Try again"], ["Go to My Queue", up + "my-queue.html"]]);
    return true;
  }
  /* Online but the address names no record (the page was opened directly): the page stays empty (no sample),
     and links.js asks which application to open (its "Which application?" chooser). */
  function noRecord() {
    if (!online) return false;
    var hide = function () { document.body.classList.add("calms-down"); if (!document.getElementById("calmsHideCss")) { var st = document.createElement("style"); st.id = "calmsHideCss"; st.textContent = "body.calms-down main{visibility:hidden}"; document.head.appendChild(st); } };
    if (document.body) hide(); else document.addEventListener("DOMContentLoaded", hide);
    return true;
  }

  /* Hand the user a file made in the page (an export). rows: arrays of cells; the first row is the header. */
  function csv(rows) { return "\ufeff" + rows.map(function (r) { return r.map(function (c) { c = c == null ? "" : String(c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(","); }).join("\r\n"); }
  function download(name, text, type) { var url = URL.createObjectURL(new Blob([text], { type: type || "text/csv;charset=utf-8" })), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000); }
  /* Offline (opened from the folder) there is no server to make a PDF, so the rows are laid out as a plain
     table and the print window opens instead; "Save as PDF" there makes the file. */
  function printTableHtml(title, sub, rows) { var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    var html = "<!doctype html><meta charset=utf-8><title>" + esc(title) + "</title><style>body{font:11px/1.35 Arial,sans-serif;margin:18mm 12mm;color:#111}h1{font-size:16px;margin:0 0 2px}p{margin:0 0 10px;color:#444}table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:4px 5px;text-align:left;vertical-align:top}th{background:#eee}tr{page-break-inside:avoid}</style>" +
      "<h1>" + esc(title) + "</h1><p>" + esc(sub) + "</p><table><thead><tr>" + rows[0].map(function (c) { return "<th>" + esc(c) + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.slice(1).map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>";
    var f = document.createElement("iframe"); f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; f.srcdoc = html;
    f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 60000); }; document.body.appendChild(f); }

  /* A paper CALMS issued (statement, clearance, schedule, credit memo, report for the regulator), laid out on the
     company letterhead; the print window opens, where "Save as PDF" makes the file. d: what the server returned. */
  function paperHtml(d) { var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }, c = d.company || {};
    var when = new Date(d.issuedAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
    var reg = [c.secNo ? "SEC Registration No. " + c.secNo : "", c.caNo ? "Certificate of Authority No. " + c.caNo : ""].filter(Boolean).join(" · ");
    var h = "<!doctype html><meta charset=utf-8><title>" + esc(d.title + " " + d.number) + "</title><style>@page{size:A4;margin:16mm 14mm}body{font:10.5pt/1.45 Georgia,'Times New Roman',serif;color:#111;margin:0}" +
      ".lh{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px double #222;padding-bottom:8px;margin-bottom:14px}.lh b{font-size:17pt;letter-spacing:.04em}.lh div{font-size:9pt;color:#333;text-align:right}" +
      "h1{font-size:15pt;margin:0;text-transform:uppercase;letter-spacing:.06em}.meta{font-size:9.5pt;color:#333;margin:2px 0 14px}h2{font-size:11pt;margin:16px 0 6px;border-bottom:1px solid #999;padding-bottom:2px}" +
      "table{border-collapse:collapse;width:100%;font-size:9.5pt}th,td{border:1px solid #aaa;padding:3px 6px;text-align:left;vertical-align:top}th{background:#eee}td.k{width:34%;background:#f7f7f7}tr{page-break-inside:avoid}tbody tr:last-child td{font-weight:normal}" +
      "pre{white-space:pre-wrap;font:9.5pt/1.4 'Courier New',monospace;border:1px solid #aaa;padding:8px;margin:0}p{margin:8px 0}.signs{display:flex;gap:40px;margin-top:40px}.signs div{flex:1;border-top:1px solid #222;padding-top:4px;font-size:9.5pt}" +
      ".foot{margin-top:24px;font-size:8.5pt;color:#555;border-top:1px solid #ccc;padding-top:6px}</style>" +
      "<div class=lh><span><b>" + esc(c.name || "GR8 Lending Company") + "</b><br>" + esc(c.address || "") + "</span><div>" + esc(reg) + (reg ? "<br>" : "") + esc([c.phone, c.email].filter(Boolean).join(" · ")) + "</div></div>" +
      "<h1>" + esc(d.title) + "</h1><div class=meta>No. " + esc(d.number) + (d.period ? " · Period: " + esc(d.period.label) : "") + (d.to ? " · " + esc(d.to) : "") + " · Issued " + esc(when) + "</div>";
    (d.sections || []).forEach(function (x) { if (x.h) h += "<h2>" + esc(x.h) + "</h2>"; if (x.p) h += "<p>" + esc(x.p) + "</p>"; if (x.pre) h += "<pre>" + esc(x.pre) + "</pre>";
      if (x.rows) h += "<table><tbody>" + x.rows.map(function (r) { return "<tr><td class=k>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td></tr>"; }).join("") + "</tbody></table>";
      if (x.table) h += "<table><thead><tr>" + x.table.head.map(function (t) { return "<th>" + esc(t) + "</th>"; }).join("") + "</tr></thead><tbody>" + x.table.rows.map(function (r) { return "<tr>" + r.map(function (t) { return "<td>" + esc(t) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table>"; });
    var by = d.issuedBy || {};
    if (d.signs) h += "<div class=signs><div>Prepared by: " + esc(by.name) + (by.role ? ", " + esc(by.role) : "") + "</div><div>Certified correct: ______________________<br>Authorized officer</div></div>";
    else h += "<p style='margin-top:18px'>Issued by " + esc(by.name) + (by.role ? ", " + esc(by.role) : "") + ".</p>";
    return h + "<div class=foot>Made by CALMS, the credit approval and loan management system of " + esc(c.name || "GR8 Lending Company") + ". This copy is kept on record under No. " + esc(d.number) + "; reprints are logged.</div>"; }
  function printHtml(html) { var f = document.createElement("iframe"); f.setAttribute("aria-hidden", "true"); f.style.cssText = "position:fixed;width:0;height:0;border:0;right:0;bottom:0"; f.srcdoc = html;
    f.onload = function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 60000); }; document.body.appendChild(f); }
  function printPaperHtml(d) { printHtml(paperHtml(d)); }
  /* Online, the server makes a real PDF file (same in every browser and in the desktop app) and it downloads.
     Both return a promise; on failure the print window is used instead, so nothing is lost. */
  function pdfFile(body, name, fallback) {
    if (!online) { fallback(); return Promise.resolve("print"); }
    return fetch("/api/pdf", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (res) { if (!res.ok) throw new Error("The PDF could not be made."); return res.blob(); })
      .then(function (blob) { var url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 2000); return "pdf"; },
        function (e) { console.warn("CALMS:", e.message, "Using the print window instead."); fallback(); return "print"; });
  }
  function slug(t) { return String(t || "calms").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "calms"; }
  function printPaper(d) { return pdfFile({ paper: d }, slug(d.number || d.title) + ".pdf", function () { printPaperHtml(d); }); }
  function printTable(title, sub, rows) { return pdfFile({ table: { title: title, sub: sub, rows: rows } }, slug(title) + ".pdf", function () { printTableHtml(title, sub, rows); }); }
  /* The same paper as spreadsheet rows. */
  function paperRows(d) { var out = [[d.title], ["No. " + d.number + (d.period ? ", " + d.period.label : "")], []]; (d.sections || []).forEach(function (x) { if (x.h) out.push([x.h]); if (x.p) out.push([x.p]); if (x.pre) out.push([x.pre]);
      if (x.rows) x.rows.forEach(function (r) { out.push(r); }); if (x.table) { out.push(x.table.head); x.table.rows.forEach(function (r) { out.push(r); }); } out.push([]); }); return out; }

  window.CALMS = { online: online, api: api, boot: boot, unreachable: unreachable, noRecord: noRecord, user: null, csv: csv, download: download, printTable: printTable, printPaper: printPaper, paperRows: paperRows };
  if (!online || atRoot) return;

  /* On every inner page: who is signed in? Show their name in the rail, and sign out for real. */
  function whoAmI() { api("GET", "/api/auth/me").then(function (data) { window.CALMS.user = data.user;
    function paint() { var who = document.querySelector(".rail .who"); if (!who) return; var b = who.querySelector("b a") || who.querySelector("b"), s = who.querySelector("span"); if (b) b.textContent = data.user.name; if (s) s.textContent = data.user.roleName; }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", paint); else paint(); window.addEventListener("load", paint);
  }, function () {}); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", whoAmI); else whoAmI();   /* after offline.js has loaded, so the answer is kept */
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest(".rail .who a"); if (!a || !/Sign out/.test(a.textContent)) return; e.preventDefault(); e.stopPropagation();
    /* signing out wipes the copies kept on this computer (offline.js); saved work not yet sent stays until its owner signs in again */
    api("POST", "/api/auth/logout").then(go, go); function go() { var w = window.CALMS_NET ? window.CALMS_NET.wipe() : Promise.resolve(); w.then(leave, leave); }
    function leave() { if (window.CALMS_LEAVE) window.CALMS_LEAVE(signIn); else location.href = signIn; } }, true);
})();
