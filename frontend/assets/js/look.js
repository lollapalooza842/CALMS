/* look.js: chooses the look before the page is drawn. Loaded at the end of <head> on every inner page, so the classic
   look's sheets are in place before the first paint and the western page never flashes while CALMS waits for the server.
   ?ui=classic or ?ui=western in the address chooses it too; kept per device. entrance.js loads the classic scripts. */
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
