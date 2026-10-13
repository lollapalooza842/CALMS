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
var VERSION = "calms-shell-v2";
var SHELL = ["./", "index.html", "assets/css/index.css", "assets/css/fonts.css", "assets/css/entrance.css", "assets/css/icons.css", "assets/js/api.js", "assets/js/app.js", "assets/js/index.js", "assets/js/entrance.js", "assets/js/links.js", "assets/fonts/badhorse.otf", "assets/img/logo-large.webp", "assets/img/kuwa.png", "assets/img/app/icon-192.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    var one = function (f) { return c.add(f).catch(function () {}); };
    return Promise.all(SHELL.map(one)).then(function () {
      return fetch("sw-files.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; })
        .then(function (files) { return Promise.all(files.map(one)); });
    });
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.indexOf("/api/") !== -1) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()); });
    })
  );
});
