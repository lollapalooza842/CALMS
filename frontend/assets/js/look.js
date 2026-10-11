/* look.js: chooses the look before the page is drawn. Loaded at the end of <head> on every inner page, so the classic
   look's sheets are in place before the first paint and the western page never flashes while CALMS waits for the server.
   ?ui=classic or ?ui=western in the address chooses it too; kept per device. entrance.js loads the classic scripts. */
/* The side rail stays put from page to page (both looks). Each page keeps a copy of its rail (the drawers with their
   counts, the nameplate, the practice chip and the phone's tab bar) for the rest of the visit, and the next page draws
   that copy the moment its rail arrives, before the first paint, instead of an empty rail that fills in when the server
   answers. The server's answer then updates it in place. Kept per look, per tab; signing out or in clears it. */
(function () {
  var ui = ""; try { ui = (/[?&]ui=(classic|western)\b/.exec(location.search) || [])[1] || localStorage.getItem("calms-ui") || "western"; } catch (e) {}
  var KEY = "calms-rail:" + ui, saved = null; try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var PARENT = { "application-detail": "applications", documents: "applications", "encode-verify": "applications", "credit-assessment": "review-queue", decision: "review-queue",
    "record-answer": "counter-offers", "loan-agreement": "applications", "release-loan": "disbursement-queue", "loan-account": "loan-accounts" };
  var here = PARENT[page] || page;
  function fill(el) {
    if (!saved || !el || el.dataset.kept) return; el.dataset.kept = "1";
    if (el.id === "nav" && saved.nav && !el.children.length) { el.innerHTML = saved.nav;
      [].forEach.call(el.querySelectorAll("a"), function (a) { a.removeAttribute("aria-current"); if ((a.getAttribute("href") || "").split("?")[0].replace(/\.html$/, "").split("/").pop() === here) a.setAttribute("aria-current", "page"); }); }
    if (el.classList.contains("who") && saved.who) el.innerHTML = saved.who;   /* over the sample name some pages carry for offline use */
    if (el.classList.contains("rail") && saved.chip && !document.getElementById("practiceChip")) el.insertAdjacentHTML("afterbegin", saved.chip);
  }
  if (saved && window.MutationObserver) {
    var mo = new MutationObserver(function () {
      fill(document.querySelector(".rail")); fill(document.getElementById("nav")); var w = document.querySelector(".rail .who"); if (w) { fill(w); }
      if (w && saved.tabs && document.body && !document.getElementById("tabbar")) { document.body.insertAdjacentHTML("beforeend", saved.tabs); var t = document.getElementById("tabbar"); if (t) { t.dataset.kept = "1"; delete t.dataset.key; } }   /* no key: links.js rebuilds it in place, with its buttons working */
      if (w) mo.disconnect(); });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }
  function keep() { var nav = document.getElementById("nav"), who = document.querySelector(".rail .who"); if (!nav || !nav.children.length) return;
    var chip = document.getElementById("practiceChip"), tabs = document.getElementById("tabbar");
    try { sessionStorage.setItem(KEY, JSON.stringify({ nav: nav.innerHTML, who: who ? who.innerHTML : "", chip: chip ? chip.outerHTML : "", tabs: tabs ? tabs.outerHTML : "" })); } catch (e) {} }
  window.addEventListener("pagehide", keep);
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    if (/Sign out/.test(a.textContent) || /index\.html/.test(a.getAttribute("href") || "")) { try { sessionStorage.removeItem("calms-rail:western"); sessionStorage.removeItem("calms-rail:classic"); } catch (x) {} window.removeEventListener("pagehide", keep); }
    else keep(); }, true);
})();
(function () {
  var r = document.documentElement, ui = "";
  try { var q = (/[?&]ui=(classic|western)\b/.exec(location.search) || [])[1]; if (q) localStorage.setItem("calms-ui", q); ui = q || localStorage.getItem("calms-ui") || ""; } catch (e) {}
  if (ui !== "classic") return;
  r.setAttribute("data-ui", "classic"); r.setAttribute("data-theme", "light"); window.CK_LOOK = true;
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, ""), web = /^https?:$/.test(location.protocol);
  var OWN = window.CK_PAGES = ["applications", "application-detail", "notifications", "loan-accounts", "loan-account", "audit-log", "reports",
    "users-roles", "system", "products-rules", "my-profile", "review-queue", "disbursement-queue", "counter-offers", "record-answer", "documents", "encode-verify", "credit-assessment", "decision",
    "loan-agreement", "release-loan", "post-payment", "new-application"];
  var own = OWN.indexOf(page) >= 0 && web; if (own) r.classList.add("c-own");
  /* the western page's own sheet would fight the rebuilt page */
  if (own) [].forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { if (l.href.split("/").pop() === page + ".css") l.media = "not all"; });
  /* written into <head> while it is still being read, so the browser waits for them before drawing anything */
  var css = (document.querySelector('link[href$="/base.css"]') ? [] : ["base.css"]).concat(["classic-fonts.css", "classic-app.css", "classic-ui.css", "classic-pages.css"]);
  document.write(css.map(function (f) { return '<link rel="stylesheet" href="../assets/css/' + f + '">'; }).join(""));
  var arrived = false; try { arrived = sessionStorage.getItem("calms-entered") === "1"; } catch (e) {}
  r.classList.add(arrived ? "c-arrive" : "c-page");
  if (page === "my-queue" && web) r.classList.add("c-dash");
})();
