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
  if (atRoot) try { sessionStorage.removeItem("calms-rail:western"); sessionStorage.removeItem("calms-rail:classic"); } catch (e) {}   /* the sign-in screen: the next person gets their own rail (look.js) */
  window.CALMS = window.CALMS || {}; window.CALMS.app = installed ? (desktop ? "desktop" : "installed") : "browser";

  if (desktop || !/^https?:$/.test(location.protocol) || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () { navigator.serviceWorker.register(base + "sw.js").catch(function () {}); });

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
