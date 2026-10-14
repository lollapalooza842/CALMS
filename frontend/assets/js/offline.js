/* offline.js: what CALMS does when the connection drops. Loaded by api.js on every page served by the back end.

   1. It notices. A small bar at the top says CALMS is offline, a dot by your name turns amber, and on pages whose
      changes need the server the action buttons rest, with the reason. When the connection is back, it says so.
   2. It keeps showing what you last saw. Every read from the server is kept on this computer (in the browser's own
      database, for the person signed in only). Offline, pages are drawn from those copies, marked "as of" when they
      were taken. Signing out, or someone else signing in, wipes them.
   3. It keeps safe work. A few actions may be done offline: a new application, a payment, the borrower's answer to an
      offer, a paper for an application. They wait in an outbox on this computer and are sent, in order, when the
      connection is back. Each carries its own key, so the server never does one twice (backend lib/idempotency.js);
      if the record changed meanwhile, the item waits for you under "Needs your look" instead of being forced through.
   Decisions, releases, the agreement, FinScore and changes to users and rules always need the connection. */
(function () {
  if (!/^https?:$/.test(location.protocol) || !window.indexedDB) return;
  var atRoot = !/\/pages\/[^/]*$/.test(location.pathname), base = atRoot ? "" : "../";
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var down = !navigator.onLine, stale = 0, failedLoad = false, sending = false, needSignIn = false, lastSent = [], beat = 0, retryT = 0;
  /* whose copies these are: set from /api/auth/me. The sign-in screen sets it aside ("last"), so the next person's first
     reads are not filed under the previous person; they wait until the server says who is signed in. */
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k) || ""; if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return ""; } }
  if (atRoot && ls("calms-uid")) { ls("calms-uid-last", ls("calms-uid")); ls("calms-uid", null); }
  function uid() { return ls("calms-uid") || ls("calms-uid-last"); }
  /* Once CALMS has found it is offline, every page (and every tab) knows at once, and skips the waiting: pages, files
     and data come straight from the copies on this computer. Only the quiet check in the background asks the server,
     and the moment it answers, everything goes back to live. Kept for 12 hours at most. */
  var mark = Number(ls("calms-down") || 0), firstBeat = false;
  if (mark && Date.now() - mark < 12 * 3600000) { down = true; firstBeat = true; } else if (mark) ls("calms-down", null);
  function tellWorker(isDown) { try { var sw = navigator.serviceWorker; if (sw && sw.controller) sw.controller.postMessage({ calms: "net", down: isDown }); } catch (e) {} }

  /* ---- the store on this computer (IndexedDB): "cache" for copies of reads, "outbox" for saved work ---- */
  var dbp = null;
  function idb() { if (!dbp) dbp = new Promise(function (ok, no) { var r = indexedDB.open("calms-offline", 1);
    r.onupgradeneeded = function () { var d = r.result; if (!d.objectStoreNames.contains("cache")) d.createObjectStore("cache"); if (!d.objectStoreNames.contains("outbox")) d.createObjectStore("outbox", { keyPath: "id" }); };
    r.onsuccess = function () { ok(r.result); }; r.onerror = function () { dbp = null; no(r.error); }; }); return dbp; }
  function run(store, mode, fn) { return idb().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction(store, mode), out, q = fn(t.objectStore(store));
    if (q) q.onsuccess = function () { out = q.result; }; t.oncomplete = function () { ok(out); }; t.onerror = t.onabort = function () { no(t.error); }; }); }); }
  var put = function (store, v, k) { return run(store, "readwrite", function (s) { return k === undefined ? s.put(v) : s.put(v, k); }); };
  var get = function (store, k) { return run(store, "readonly", function (s) { return s.get(k); }); };
  var del = function (store, k) { return run(store, "readwrite", function (s) { return s.delete(k); }); };
  var all = function (store) { return run(store, "readonly", function (s) { return s.getAll(); }); };
  var clear = function (store) { return run(store, "readwrite", function (s) { return s.clear(); }); };
  function copy(d) { return d && typeof d === "object" ? JSON.parse(JSON.stringify(d)) : d; }

  /* ---- layer 2: copies of what the server said ---- */
  var puts = 0, pending = [];
  function keep(path, data) {
    if (slow) { slow = 0; if (!down) stale = 0; paint(); }   /* the server answered: no longer slow */
    if (path === "/api/auth/me" && data && data.user) {
      var was = uid(), first = !ls("calms-uid");
      if (was && was !== data.user.id) clear("cache").catch(function () {});   /* someone else signed in: the last person's copies go */
      ls("calms-uid", data.user.id); ls("calms-uid-last", null); ls("calms-uname", data.user.name);
      if (first) { var q = pending; pending = []; q.forEach(function (x) { keep(x[0], x[1]); }); }
    }
    if (!ls("calms-uid")) { if (pending.length < 30) pending.push([path, data]); return; }
    put("cache", { at: Date.now(), data: data }, ls("calms-uid") + "|" + path).then(function () { if (++puts % 40 === 0) prune(); }).catch(function () {});
  }
  function prune() { idb().then(function (d) { var t = d.transaction("cache", "readwrite"), s = t.objectStore("cache"), rows = [];
    s.openCursor().onsuccess = function (e) { var c = e.target.result; if (c) { rows.push([c.key, c.value.at]); c.continue(); } else if (rows.length > 400) { rows.sort(function (a, b) { return a[1] - b[1]; }); rows.slice(0, rows.length - 400).forEach(function (r) { s.delete(r[0]); }); } }; }).catch(function () {}); }
  function fromCache(path) {
    return get("cache", uid() + "|" + path).then(function (hit) {
      if (!hit) { failedLoad = true; throw err("You are offline, and this has not been opened on this computer before. It will load when the connection is back."); }
      if (!stale || hit.at < stale) { stale = hit.at; paint(); }
      return copy(hit.data);
    }, function () { failedLoad = true; throw err("You are offline, and the copies on this computer could not be read."); });
  }
  /* the server is up but slow: a copy, if this computer has one (undefined if not), and the bar says why */
  var slow = 0;
  /* the page itself came slowly (the service worker waited, then used its copy): treat the server as slow from the start */
  try { var nav = performance.getEntriesByType("navigation")[0]; if (nav && nav.responseStart - nav.requestStart > 2000) slow = Date.now(); } catch (e) {}
  function copyIfSlow(path) { probe(); return get("cache", uid() + "|" + path).then(function (hit) { if (!hit) return undefined; slow = Date.now(); if (!stale || hit.at < stale) stale = hit.at; paint(); return copy(hit.data); }, function () { return undefined; }); }
  /* Slow, or offline? A connection with no internet behind it (Wi-Fi with no data, a dead hotspot) makes every request
     hang instead of fail. A quick check settles it: if even the server's health check does not answer in 5 seconds,
     CALMS is offline (the bar, the outbox) until it does. */
  var probing = 0;
  function probe() { if (down || Date.now() - probing < 15000) return; probing = Date.now();
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 5000);
    fetch("/api/health", { cache: "no-store", signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(t); if (!r.ok) goDown(); }, function () { clearTimeout(t); goDown(); }); }
  function wipe() { return Promise.all([clear("cache")]).catch(function () {}).then(function () { ls("calms-uid", null); ls("calms-uid-last", null); ls("calms-uname", null); }); }
  function err(msg, extra) { var e = new Error(msg); e.status = 0; e.offline = true; if (extra) for (var k in extra) e[k] = extra[k]; return e; }

  /* what needs the connection, and why (said on the button that cannot work offline) */
  function why(method, path) {
    if (/\/(decision|offers|reject|bureau)(\/|$)/.test(path) && !/\/answer$/.test(path)) return "Decisions need the connection: they are checked against your approval limit and signed with your authenticator code.";
    if (/\/release$/.test(path)) return "Releasing money needs the connection, so a loan can never be paid out twice.";
    if (/\/agreement/.test(path)) return "The loan agreement needs the connection: it is locked on the office's server.";
    if (/\/(verification|corrections)$/.test(path)) return "Verifying needs the connection: the second check is made against the papers on the office's server.";
    if (/\/(users|rule-sets|templates|system|settings)/.test(path)) return "Changes to users and rules need the connection.";
    if (/\/reverse$/.test(path)) return "A reversal needs the connection: it has to see every payment already posted.";
    if (/\/(statement|schedule|clearance|memo|pdf|export|run)$/.test(path)) return "Papers and exports are made by the office's server, so they need the connection.";
    return "This needs the connection. Nothing was changed.";
  }

  /* ---- layer 3: the outbox ---- */
  function newId() { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); var s = ""; for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16); return s.slice(0, 8) + "-" + s.slice(8, 12) + "-4" + s.slice(13, 16) + "-a" + s.slice(17, 20) + "-" + s.slice(20); }
  function tempNo(prefix) { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return prefix + "-" + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) + "-" + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function enqueue(method, path, body, opt, id) {
    var item = { id: id || newId(), uid: uid(), who: ls("calms-uname"), method: method, path: path, body: body,
      kind: opt.kind || "other", label: opt.label || "Saved change", sub: opt.sub || "", temp: opt.kind === "pay" ? tempNo("TR") : opt.kind === "app" ? tempNo("SAVED") : "",
      createdAt: new Date().toISOString(), status: "waiting", tries: 0 };
    return put("outbox", item).then(function () { refresh(); if (!down) setTimeout(flush, 300); return { queued: true, id: item.id, temp: item.temp, savedAt: item.createdAt }; },
      function () { throw err("This could not be kept on this computer (its storage is full or blocked). Nothing was saved."); });
  }
  function mine(items) { var u = uid(); return items.filter(function (x) { return x.uid === u; }).sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; }); }
  function flush() {
    if (sending || down) return; clearTimeout(retryT);
    all("outbox").then(function (items) {
      var list = mine(items).filter(function (x) { return x.status === "waiting"; }); if (!list.length) { refresh(); return; }
      sending = true; needSignIn = false; paint(); var sentNow = [];
      (function next(i) {
        if (i >= list.length || down) return finish();
        var it = list[i]; it.status = "sending"; put("outbox", it).then(refresh);
        fetch(it.path, { method: it.method, credentials: "same-origin", headers: { "Content-Type": "application/json", "Idempotency-Key": it.id, "X-Calms-Saved-At": it.createdAt }, body: it.body ? JSON.stringify(it.body) : undefined })
          .then(function (res) { return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; }); })
          .then(function (r) {
            var s = r.res.status, d = r.data;
            if (s === 503 && d.offline || s === 502 || s === 504) { it.status = "waiting"; return put("outbox", it).then(function () { goDown(); finish(); }); }
            if (r.res.ok) { it.status = "sent"; it.result = d; it.sentAt = new Date().toISOString(); sentNow.push(it); return put("outbox", it).then(function () { next(i + 1); }); }
            if (s === 401) { it.status = "waiting"; needSignIn = true; return put("outbox", it).then(finish); }
            if (s === 409 && d.retry || s >= 500) { it.status = "waiting"; it.tries++; return put("outbox", it).then(function () { retryT = setTimeout(flush, Math.min(60000, 5000 * it.tries)); finish(); }); }
            it.status = "look"; it.error = d.error || "The office's server refused this."; it.fields = d.fields || null; return put("outbox", it).then(function () { next(i + 1); });
          }, function () { it.status = "waiting"; return put("outbox", it).then(function () { goDown(); finish(); }); });
      })(0);
      function finish() { sending = false; if (sentNow.length) { lastSent = sentNow; announce(sentNow); } refresh(); }
    }).catch(function () { sending = false; });
  }
  function resultText(it) { var r = it.result || {};
    if (it.kind === "app") return r.reference ? r.reference + " is on file" : "Sent";
    if (it.kind === "pay") return r.receipt ? "Official receipt " + r.receipt : "Posted";
    if (it.kind === "answer") return "Her answer is recorded";
    if (it.kind === "doc") return "Filed";
    return "Sent"; }
  function announce(list) {
    var t = list.length === 1 ? list[0].label + ": " + resultText(list[0]) + "." : "All " + list.length + " saved items were sent.";
    flash = { text: "Back online. " + t, until: Date.now() + 7000 }; paint(); setTimeout(paint, 7100);
    try { window.dispatchEvent(new CustomEvent("calms:sent", { detail: list })); } catch (e) {}
  }

  /* ---- going down and coming back ---- */
  var flash = null;
  function goDown() { if (!down) { down = true; flash = null; } if (!ls("calms-down")) ls("calms-down", String(Date.now())); tellWorker(true); paint(); heartbeat(); }
  function heartbeat() { clearTimeout(beat); if (!down) return;
    beat = setTimeout(function () {
      var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
      fetch("/api/health", { cache: "no-store", signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(t); if (r.ok) comeBack(); else heartbeat(); }, function () { clearTimeout(t); heartbeat(); });
    }, firstBeat ? (firstBeat = false, 300) : navigator.onLine ? 4000 : 8000); }   /* a page opened while offline checks once right away */
  function comeBack(quiet) { if (!down) return; var wasStale = stale; down = false; slow = 0; probing = 0; stale = 0; ls("calms-down", null); tellWorker(false);
    flash = { text: wasStale ? "Back online. This page still shows the copy from " + hhmm(wasStale) + "." : "Back online.", until: Date.now() + (wasStale ? 15000 : 4000), refresh: !!wasStale }; paint(); setTimeout(paint, wasStale ? 15100 : 4100);
    if (quiet) return;
    if (failedLoad && document.querySelector("#calmsDown, [data-offline-error]")) { setTimeout(function () { location.reload(); }, 600); return; }   /* the page could not open offline: open it now */
    flush(); }
  window.addEventListener("offline", goDown);
  /* another tab found out first */
  window.addEventListener("storage", function (e) { if (e.key !== "calms-down") return; if (e.newValue && !down) goDown(); else if (!e.newValue && down) { comeBack(true); flush(); } });
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener("controllerchange", function () { tellWorker(down); });
  window.addEventListener("load", function () { tellWorker(down); });
  window.addEventListener("online", function () { clearTimeout(beat); beat = setTimeout(function () { down = true; heartbeat(); }, 0); });
  if (down) heartbeat();

  /* ---- what api.js asks of this file ---- */
  window.CALMS_NET = {
    isDown: function () { return down; },
    down: goDown,
    keep: keep, fromCache: fromCache, wipe: wipe, why: why, err: err,
    queue: enqueue, flush: flush, newId: newId, copyIfSlow: copyIfSlow, probe: probe, isSlow: function () { return slow && Date.now() - slow < 30000; },
    open: function () { openPanel(); },
  };

  /* ---- layer 1: what you see ---- */
  var css = "#calmsNet{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:400;display:flex;align-items:center;gap:10px;width:max-content;max-width:min(560px,calc(100vw - 24px));box-sizing:border-box;padding:8px 10px 8px 14px;border-radius:999px;background:#2a1712;color:#fbeee4;font:500 13px/1.35 Inter,'Segoe UI',system-ui,sans-serif;box-shadow:0 10px 30px -8px rgba(31,14,10,.55),0 0 0 1px rgba(255,255,255,.08) inset;animation:calmsNetIn .35s cubic-bezier(.22,1,.36,1) both}" +
    "#calmsNet[hidden]{display:none}#calmsNet i.dot{flex:none;width:9px;height:9px;border-radius:50%;background:#f0a23b;box-shadow:0 0 0 3px rgba(240,162,59,.25)}#calmsNet.ok i.dot{background:#4cc27e;box-shadow:0 0 0 3px rgba(76,194,126,.25)}#calmsNet.busy i.dot{animation:calmsPulse 1s ease-in-out infinite}" +
    "#calmsNet span{min-width:0}#calmsNet button{flex:none;border:0;border-radius:999px;padding:5px 11px;background:rgba(255,255,255,.12);color:inherit;font:600 12.5px/1.2 inherit;cursor:pointer}#calmsNet button:hover{background:rgba(255,255,255,.2)}" +
    "@keyframes calmsNetIn{from{opacity:0;transform:translate(-50%,8px)}}@media (max-width:600px){#calmsNet{bottom:calc(84px + env(safe-area-inset-bottom,0px));border-radius:16px}}@keyframes calmsPulse{50%{opacity:.35}}" +
    "html.calms-offline .rail .who{position:relative}html.calms-offline .rail .who::after{content:'';position:absolute;left:44px;top:8px;width:10px;height:10px;border-radius:50%;background:#f0a23b;box-shadow:0 0 0 2px #2a1712;z-index:3}" +
    "html.calms-offline:not([data-ui=classic]) .rail .who::after{left:auto;right:8px}" +
    ".c-outbox{gap:6px!important}.c-outbox b{font:600 12px/1 inherit}.c-outbox.look{color:#a8321f!important}" +
    "html.calms-offline:not(.calms-net-ok) .c-view button.ck-btn:is(.ck-primary,.ck-danger,.ck-green),html.calms-offline:not(.calms-net-ok) .ck-modal button.ck-btn:is(.ck-primary,.ck-danger,.ck-green){opacity:.45;pointer-events:none}" +
    "html.calms-offline:not(.calms-net-ok) main > div#calmsRo.calms-ro[role=note]{display:flex!important}" +
    ".calms-ro{display:flex;flex-wrap:wrap;gap:4px 6px;align-items:baseline;margin:18px 0 0;padding:12px 16px;border-radius:14px;background:#fff6ea;border:1px solid #f1d7b3;color:#6b4519;font:14px/1.45 Inter,system-ui,sans-serif}.calms-ro b{color:#4a2d10}" +
    "#calmsBox{position:fixed;inset:0;z-index:410;display:flex;justify-content:flex-end;background:rgba(31,23,18,.35);animation:calmsFade .2s ease both}@keyframes calmsFade{from{opacity:0}}" +
    "#calmsBox>div{width:min(440px,100vw);height:100%;overflow:auto;box-sizing:border-box;padding:22px 20px 28px;background:#fbf8f4;color:#1f1712;font:14px/1.5 Inter,system-ui,sans-serif;box-shadow:-20px 0 40px -20px rgba(31,14,10,.4);animation:calmsSlide .32s cubic-bezier(.22,1,.36,1) both}@keyframes calmsSlide{from{transform:translateX(24px);opacity:0}}" +
    "#calmsBox h2{margin:0 0 4px;font:600 20px/1.25 Lexend,Inter,sans-serif}#calmsBox .sub{margin:0 0 16px;color:#6b5c50}#calmsBox h3{margin:18px 0 8px;font:600 12px/1 Inter,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#9a8b7e}" +
    "#calmsBox ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}#calmsBox li{padding:12px 14px;border-radius:14px;background:#fff;border:1px solid #ece5dc}#calmsBox li b{display:block;font-weight:600}#calmsBox li small{display:block;color:#6b5c50}" +
    "#calmsBox li .st{display:inline-block;margin-top:6px;padding:2px 9px;border-radius:999px;font:600 12px/1.6 Inter,sans-serif;background:#f3ece4;color:#6b4519}#calmsBox li.sent .st{background:#e6f4ec;color:#22603f}#calmsBox li.look{border-color:#f0c4b8}#calmsBox li.look .st{background:#fbe6e1;color:#a8321f}" +
    "#calmsBox li .err{margin:8px 0 0;color:#a8321f}#calmsBox .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#calmsBox button{border:1px solid #e2d6c9;background:#fff;border-radius:10px;padding:7px 12px;font:600 13px/1.2 Inter,sans-serif;color:#1f1712;cursor:pointer}" +
    "#calmsBox button.go{background:#7a2318;border-color:#7a2318;color:#fff}#calmsBox button:disabled{opacity:.5;cursor:default}#calmsBox .x{position:absolute;right:18px;top:16px}#calmsBox .empty{padding:18px;border-radius:14px;background:#fff;border:1px dashed #e2d6c9;color:#6b5c50;text-align:center}" +
    "@media (prefers-reduced-motion:reduce){#calmsNet,#calmsBox,#calmsBox>div{animation:none}#calmsNet.busy i.dot{animation:none}}";
  var bar = null, counts = { waiting: 0, look: 0 };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function ensureUi() { if (bar || !document.body) return; var st = el("style"); st.id = "calmsNetCss"; st.textContent = css; document.head.appendChild(st);
    bar = el("div"); bar.id = "calmsNet"; bar.setAttribute("role", "status"); bar.setAttribute("aria-live", "polite"); bar.hidden = true; document.body.appendChild(bar); }
  function hhmm(t) { return new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }); }
  function paint() {
    if (!document.body) { document.addEventListener("DOMContentLoaded", paint); return; } ensureUi();
    var r = document.documentElement; r.classList.toggle("calms-offline", down);
    readOnly();
    var n = counts.waiting, look = counts.look, text = "", tone = "", act = null;
    if (down) { text = "You're offline. Work you save here is kept on this computer and sent when you're back." + (stale ? " Showing copies from " + hhmm(stale) + "." : ""); if (n) act = n + " waiting"; }
    else if (slow) { text = "The server is slow to answer (it may be waking up). Showing copies from " + hhmm(stale) + " until it does."; tone = "busy"; }
    else if (sending) { text = "Back online. Sending " + n + " saved item" + (n === 1 ? "" : "s") + "…"; tone = "busy"; }
    else if (needSignIn && n) { text = "Sign in again to send " + n + " saved item" + (n === 1 ? "" : "s") + ". They stay on this computer until then."; act = "Sign in"; }
    else if (flash && Date.now() < flash.until) { text = flash.text; tone = "ok"; if (flash.refresh) act = "Refresh"; }
    else if (look) { text = look + " saved item" + (look === 1 ? " needs" : "s need") + " your look."; act = "See"; }
    else if (n) { text = n + " saved item" + (n === 1 ? " is" : "s are") + " waiting to send."; act = "See"; }
    bar.hidden = !text; bar.className = tone; bar.textContent = ""; if (!text) return;
    bar.appendChild(el("i", "dot")); bar.appendChild(el("span", "", text));
    if (act) { var b = el("button", "", act); b.type = "button"; b.addEventListener("click", function () { if (act === "Sign in") location.href = base + "index.html#signin"; else if (act === "Refresh") location.reload(); else openPanel(); }); bar.appendChild(b); }
    chip();
  }
  function chip() { var right = document.querySelector(".c-top .c-right"); if (!right) return; var c = right.querySelector(".c-outbox"), total = counts.waiting + counts.look;
    if (!total) { if (c) c.remove(); return; }
    if (!c) { c = el("button", "c-chip c-outbox"); c.type = "button"; c.addEventListener("click", openPanel); right.insertBefore(c, right.firstChild); }
    c.className = "c-chip c-outbox" + (counts.look ? " look" : ""); c.textContent = ""; c.setAttribute("aria-label", total + " saved items");
    c.insertAdjacentHTML("beforeend", '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 13h4l2 3h4l2-3h4"/><path d="M4 13l2.5-7h11L20 13v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/></svg>');
    c.appendChild(el("b", "", counts.look ? counts.look + " to look at" : counts.waiting + " waiting")); }
  function refresh() { return all("outbox").then(function (items) { var m = mine(items), now = Date.now();
      m.filter(function (x) { return x.status === "sent" && now - new Date(x.sentAt).getTime() > 86400000; }).forEach(function (x) { del("outbox", x.id); });   /* sent ones are listed for a day */
      counts = { waiting: m.filter(function (x) { return x.status === "waiting" || x.status === "sending"; }).length, look: m.filter(function (x) { return x.status === "look"; }).length };
      paint(); if (panel) drawPanel(m); return m; }).catch(function () {}); }

  /* pages whose changes may wait in the outbox; every other page is read-only while offline */
  var OK = ["new-application", "post-payment", "record-answer", "documents", "my-queue", "applications", "loan-accounts", "notifications", "my-profile", "application-detail", "loan-account", "reports", "audit-log"];
  var WHY = { decision: "decisions", "credit-assessment": "decisions", "counter-offers": "decisions", "review-queue": "decisions", "release-loan": "release", "disbursement-queue": "release", "loan-agreement": "agreement",
    "encode-verify": "verify", "users-roles": "admin", system: "admin", "products-rules": "admin" };
  var WHYTEXT = { decisions: "Decisions need the connection: they are checked against your approval limit and signed with your authenticator code.", release: "Releasing money needs the connection, so a loan can never be paid out twice.",
    agreement: "The loan agreement is locked on the office's server, so it needs the connection.", verify: "Verifying needs the connection: the second check is made against the papers on the office's server.", admin: "Changes to users and rules need the connection." };
  function readOnly() {
    var r = document.documentElement, ok = OK.indexOf(page) >= 0; r.classList.toggle("calms-net-ok", ok);
    var note = document.getElementById("calmsRo"); if (!down || ok || atRoot) { if (note) note.remove(); return; }
    var main = document.querySelector("main"); if (!main) return;
    if (!note) { note = el("div", "calms-ro"); note.id = "calmsRo"; note.setAttribute("role", "note");
      note.appendChild(el("b", "", "Offline: this page is read-only for now.")); note.appendChild(el("span", "", " " + (WHYTEXT[WHY[page]] || "Changes here need the connection.") + " Everything else you see is the last copy on this computer.")); }
    /* just above the page itself (the classic look's view, drawn after this file runs), below the top bar */
    var view = main.querySelector(":scope > .c-view, :scope > .c-dash"), top = main.querySelector(":scope > .c-top");
    if (view) { if (note.nextElementSibling !== view) main.insertBefore(note, view); }
    else if (top) { if (note.previousElementSibling !== top) main.insertBefore(note, top.nextSibling); }
    else if (!note.parentNode) main.insertBefore(note, main.firstChild);
  }
  window.addEventListener("load", function () { readOnly(); setTimeout(readOnly, 800); });

  /* ---- the outbox panel ---- */
  var panel = null;
  function openPanel() { if (panel) return; ensureUi(); panel = el("div"); panel.id = "calmsBox"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", "Saved on this computer");
    panel.addEventListener("click", function (e) { if (e.target === panel) closePanel(); }); document.addEventListener("keydown", esc);
    panel.appendChild(el("div")); document.body.appendChild(panel); refresh(); }
  function esc(e) { if (e.key === "Escape") closePanel(); }
  function closePanel() { if (panel) panel.remove(); panel = null; document.removeEventListener("keydown", esc); }
  function drawPanel(m) {
    var box = panel.firstChild; box.textContent = "";
    var x = el("button", "x", "Close"); x.type = "button"; x.addEventListener("click", closePanel); box.appendChild(x);
    box.appendChild(el("h2", "", "Saved on this computer"));
    box.appendChild(el("p", "sub", down ? "You're offline. These are sent, in order, as soon as the connection is back. Each is done once, even if sending is tried again." : "Work saved while the connection was down. Each is done once, even if sending is tried again."));
    var look = m.filter(function (i) { return i.status === "look"; }), wait = m.filter(function (i) { return i.status === "waiting" || i.status === "sending"; }), sent = m.filter(function (i) { return i.status === "sent"; }).reverse();
    if (!m.length) box.appendChild(el("div", "empty", "Nothing is waiting. Work you save while offline shows up here."));
    if (look.length) { box.appendChild(el("h3", "", "Needs your look")); box.appendChild(list(look)); }
    if (wait.length) { box.appendChild(el("h3", "", "Waiting to send")); box.appendChild(list(wait));
      var row = el("div", "row"), go = el("button", "go", down ? "Offline: sends by itself when back" : sending ? "Sending…" : "Send now"); go.type = "button"; go.disabled = down || sending; go.addEventListener("click", flush); row.appendChild(go); box.appendChild(row); }
    if (sent.length) { box.appendChild(el("h3", "", "Sent today")); box.appendChild(list(sent)); }
    var others = 0; all("outbox").then(function (items) { others = items.filter(function (i) { return i.uid !== uid() && i.status !== "sent"; }).length; if (others) box.appendChild(el("p", "sub", others + " saved item" + (others === 1 ? " belongs" : "s belong") + " to someone else who used this computer. They are sent when that person signs in.")); });
  }
  function list(items) { var ul = el("ul");
    items.forEach(function (it) { var li = el("li", it.status); li.appendChild(el("b", "", it.label)); if (it.sub) li.appendChild(el("small", "", it.sub));
      li.appendChild(el("small", "", "Saved " + new Date(it.createdAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + (it.temp && it.kind === "pay" ? " · temporary receipt " + it.temp : "")));
      li.appendChild(el("span", "st", it.status === "sent" ? resultText(it) : it.status === "look" ? "Not sent" : it.status === "sending" ? "Sending…" : "Waiting"));
      if (it.status === "look") { li.appendChild(el("p", "err", it.error));
        var row = el("div", "row"), again = el("button", "", "Try again"), rm = el("button", "", "Remove");
        again.type = rm.type = "button"; again.addEventListener("click", function () { it.status = "waiting"; it.error = ""; put("outbox", it).then(function () { refresh(); flush(); }); });
        rm.addEventListener("click", function () { if (confirm("Remove this saved item? It will not be sent.")) del("outbox", it.id).then(refresh); });
        var ref = /\b(APP-\d{4}-\d{4}|LN-\d{4}-\d{4})\b/.exec(it.error || "");   /* the record the server pointed to */
        if (ref) { var open = el("button", "", "Open " + ref[1]); open.type = "button"; open.addEventListener("click", function () { location.href = base + "pages/" + (/^LN/.test(ref[1]) ? "loan-account.html?no=" : "application-detail.html?ref=") + ref[1]; }); row.appendChild(open); }
        row.appendChild(again); row.appendChild(rm); li.appendChild(row); }
      else if (it.status === "waiting") { var row2 = el("div", "row"), rm2 = el("button", "", "Remove"); rm2.type = "button";
        rm2.addEventListener("click", function () { if (confirm("Remove this saved item? It will not be sent.")) del("outbox", it.id).then(refresh); }); row2.appendChild(rm2); li.appendChild(row2); }
      ul.appendChild(li); });
    return ul; }

  /* ---- ready for the next time: copies of what each role uses most, taken quietly while online ---- */
  function warm() {
    if (atRoot || down || !window.CALMS || !CALMS.api) return;
    try { var last = Number(sessionStorage.getItem("calms-warm") || 0); if (Date.now() - last < 10 * 60000) return; sessionStorage.setItem("calms-warm", String(Date.now())); } catch (e) {}
    var A = function (p) { return CALMS.api("GET", p).catch(function () { return null; }); };
    A("/api/auth/me").then(function (me) { if (!me || !me.user) return; var role = me.user.role;
      var paths = ["/api/rail", "/api/queue", "/api/notifications"];
      if (role !== "system_administrator") paths.push("/api/applications");
      if (/loan_processor|sales_agent/.test(role)) paths.push("/api/applications/new/options");
      if (/loan_account_officer|operations_manager|disbursement_officer|compliance_auditor|loan_processor/.test(role)) paths.push("/api/loan-accounts");
      (function next(i) { if (i >= paths.length || down) return more(role); A(paths[i]).then(function () { setTimeout(function () { next(i + 1); }, 150); }); })(0);
    });
    function more(role) {
      /* the accounts a payment may be posted to, and the offers waiting for the borrower's answer */
      var jobs = [];
      if (/loan_account_officer|operations_manager/.test(role)) jobs.push(A("/api/loan-accounts").then(function (d) { return ((d && d.accounts) || []).filter(function (a) { return !a.closed; }).slice(0, 40).map(function (a) { return "/api/loan-accounts/" + a.number; }); }));
      if (/sales_agent|loan_processor/.test(role)) jobs.push(A("/api/queue").then(function (q) { return ((q && q.items) || []).filter(function (x) { return x.kind === "offer"; }).map(function (x) { return "/api/applications/" + x.ref + "/offers"; }); }));
      Promise.all(jobs).then(function (lists) { var ps = [].concat.apply([], lists); (function next(i) { if (i >= ps.length || down) return; A(ps[i]).then(function () { setTimeout(function () { next(i + 1); }, 120); }); })(0); });
    }
  }
  function start() { paint(); refresh().then(function () { if (!down) flush(); }); setTimeout(function () { if (window.requestIdleCallback) requestIdleCallback(warm, { timeout: 4000 }); else warm(); }, 2500); setInterval(function () { if (!down && counts.waiting && !sending) flush(); }, 30000); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
