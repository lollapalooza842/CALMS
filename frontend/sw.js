/* CALMS service worker: what lets the browser (and the desktop app) install CALMS, and lets every screen open when
   the network drops.

   Rules, kept deliberately simple:
   - Anything under /api is never touched here. Copies of what the server said are kept by offline.js instead, for
     the person signed in only, and wiped when they sign out.
   - Pages, styles, scripts, pictures and fonts: ask the network first, so a new version shows up at once; keep a
     copy; if the network is down, use the copy.
   - On install, every screen and its files are fetched once (the list comes from the server, /sw-files.json), so a
     screen opens offline even if it was never visited on this computer.
   Change VERSION to throw away every old copy. */
var VERSION = "calms-shell-v4";
var SHELL = ["./", "index.html", "assets/css/fonts.css", "assets/css/theme-ui.css", "assets/css/index.css", "assets/css/entrance.css", "assets/css/classic-fonts.css", "assets/css/classic.css", "assets/css/icons.css",
  "assets/js/entrance.js", "assets/js/api.js", "assets/js/offline.js", "assets/js/app.js", "assets/js/index.js", "assets/js/links.js", "assets/fonts/badhorse.otf", "assets/img/logo-large.webp", "assets/img/kuwa.png", "assets/img/app/icon-192.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    /* a few at a time, so a small server (Render's free tier) is not hit with two hundred requests at once */
    var one = function (f) { return c.add(new Request(f, { cache: "reload" })).catch(function () {}); };
    var batches = function (files) { var i = 0; return (function next() { var part = files.slice(i, i += 6); return part.length ? Promise.all(part.map(one)).then(next) : null; })(); };
    return batches(SHELL).then(function () {
      return fetch("sw-files.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
        .then(function (files) { return batches(files.filter(function (f) { return SHELL.indexOf(f) < 0; })); });
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
var slowUntil = 0;
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.indexOf("/api/") !== -1) return;
  /* The network first, so a new version shows at once; but if the server is slow to answer (a free server waking up
     can take a minute), the kept copy is used after a moment instead of a blank page waiting. The network's answer
     still updates the copy for next time. */
  var net = fetch(req).then(function (res) {
    if (res && res.ok && res.type === "basic") { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  });
  e.waitUntil(net.catch(function () {}));
  var kept = function () { return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || (req.mode === "navigate" ? caches.match("index.html") : null); }); };
  e.respondWith(new Promise(function (resolve) {
    var done = false, finish = function (r) { if (!done && r) { done = true; resolve(r); } };
    /* once the server has been slow, the next files come from the kept copies at once (for 20 seconds), not after
       another wait each: a page loads a dozen files one after another */
    var wait = Date.now() < slowUntil ? 0 : req.mode === "navigate" ? 3000 : 2000;
    var t = setTimeout(function () { slowUntil = Date.now() + 20000; kept().then(finish); }, wait);
    net.then(function (res) { clearTimeout(t); if (wait) slowUntil = 0; finish(res); }, function () { clearTimeout(t); kept().then(function (hit) { finish(hit || Response.error()); }); });
  }));
});
