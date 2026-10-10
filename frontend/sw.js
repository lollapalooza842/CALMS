/* CALMS service worker: what lets the browser install CALMS as an app, and lets the app's
   screens open when the network drops.

   Rules, kept deliberately simple:
   - Anything under /api is never touched. Loan data always comes live from the server, and is
     never stored on the computer.
   - Pages, styles, scripts, pictures and fonts: ask the network first, so a new version shows up
     at once; keep a copy; if the network is down, use the copy.
   Change VERSION to throw away every old copy. */
var VERSION = "calms-shell-v1";
var SHELL = ["./", "index.html", "assets/css/index.css", "assets/css/fonts.css", "assets/css/entrance.css", "assets/css/icons.css", "assets/js/api.js", "assets/js/app.js", "assets/js/index.js", "assets/js/entrance.js", "assets/js/links.js", "assets/fonts/badhorse.otf", "assets/img/logo-large.webp", "assets/img/kuwa.png", "assets/img/app/icon-192.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL).catch(function () {}); }).then(function () { return self.skipWaiting(); }));
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
