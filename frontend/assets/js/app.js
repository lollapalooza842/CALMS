/* CALMS as an app. Loaded on every page, after api.js.
   - In a browser, over http(s): registers the service worker (sw.js) so CALMS can be installed,
     and on the sign-in screen offers "Install CALMS" when the browser allows it.
   - Inside the desktop app (desktop/), or installed: marks the page with html.is-app so styles
     can tell. Nothing here is needed for the pages to work. */
(function () {
  var root = document.documentElement, atRoot = !/\/pages\/[^/]*$/.test(location.pathname), base = atRoot ? "" : "../";
  var desktop = /\bElectron\//.test(navigator.userAgent);
  var installed = desktop || (window.matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: window-controls-overlay)").matches)) || navigator.standalone === true;
  if (installed) root.classList.add("is-app"); if (desktop) root.classList.add("is-desktop");
  if (atRoot) try { sessionStorage.removeItem("calms-rail:western"); sessionStorage.removeItem("calms-rail:classic"); sessionStorage.removeItem("calms-seed"); sessionStorage.removeItem("calms-role"); } catch (e) {}   /* the sign-in screen: the next person gets their own rail (look.js) */
  window.CALMS = window.CALMS || {}; window.CALMS.app = installed ? (desktop ? "desktop" : "installed") : "browser";

  if (/^https?:$/.test(location.protocol)) {
  /* Safety net: if the page came up without its styles while the server is reachable (a broken copy kept by the service
     worker), drop the kept copies and the service worker, and load the page once more, fresh. */
  window.addEventListener("load", function () {
    var styled = [].some.call(document.styleSheets, function (s) { try { return s.href && /\/assets\/css\/(index|base)\.css/.test(s.href) && s.cssRules.length > 0; } catch (e) { return false; } });
    var once = false; try { once = sessionStorage.getItem("calms-healed") === "1"; } catch (e) {}
    if (styled || once || !navigator.onLine) return;
    fetch(base + "assets/css/" + (atRoot ? "index" : "base") + ".css", { cache: "no-store" }).then(function (r) { if (!r.ok) return;
      try { sessionStorage.setItem("calms-healed", "1"); } catch (e) {}
      Promise.all([navigator.serviceWorker ? navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.unregister(); })); }) : null,
        window.caches ? caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); }) : null]).then(function () { location.reload(); }, function () { location.reload(); }); }, function () {});
  });
  }
  if (!/^https?:$/.test(location.protocol) || !("serviceWorker" in navigator)) return;
  /* the desktop app too: with it, every screen opens when the connection drops (offline.js keeps the data) */
  window.addEventListener("load", function () { navigator.serviceWorker.register(base + "sw.js").catch(function () {}); });
  /* a new version of CALMS took over this page (sw.js activated with a new VERSION): reload once, so the screen runs the
     new files instead of the ones it opened with. Not on the very first install (nothing was in charge before). */
  var hadOne = !!navigator.serviceWorker.controller, reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", function () { if (!hadOne || reloaded) { hadOne = true; return; } reloaded = true;
    var busy = document.querySelector("input:focus, textarea:focus, .ck-modalback");   /* never mid-typing: then it waits for the next page */
    if (!busy) location.reload(); });
  if (desktop) return;

  /* the browser decides when CALMS may be installed, and tells us with this event */
  var offer = null;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); offer = e; show(); });
  window.addEventListener("appinstalled", function () { offer = null; var b = document.getElementById("install"); if (b) b.remove(); });
  function show() { if (!atRoot || document.getElementById("install")) return; var stage = document.getElementById("stage"); if (!stage) return;
    var menu = document.getElementById("gearMenu");     /* the sign-in screen's settings menu, when it has one */
    var b = document.createElement("button"); b.id = "install"; b.type = "button"; b.className = menu ? "mi" : "ghost"; if (menu) b.setAttribute("role", "menuitem"); b.textContent = "Install CALMS";
    b.addEventListener("click", function () { if (!offer) return; offer.prompt(); offer.userChoice.then(function () { offer = null; b.remove(); }); });
    (menu || stage).appendChild(b); }
})();
/* Quick search (Ctrl+K) in the western look; the classic look loads it from entrance.js */
(function () { if (!/\/pages\//.test(location.pathname) || document.documentElement.getAttribute("data-ui") === "classic") return;
  var s = document.createElement("script"); s.src = "../assets/js/classic/palette.js"; s.async = true; document.head.appendChild(s); })();
