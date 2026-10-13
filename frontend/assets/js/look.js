/* look.js: chooses the look before the page is drawn. Loaded at the end of <head> on every inner page, so the classic
   look's sheets are in place before the first paint and the western page never flashes while CALMS waits for the server.
   ?ui=classic or ?ui=western in the address chooses it too; kept per device. entrance.js loads the classic scripts. */
/* The side rail stays put from page to page (both looks). Each page keeps a copy of its rail (the drawers with their
   counts, the nameplate, the practice chip and the phone's tab bar) for the rest of the visit, and the next page draws
   that copy the moment its rail arrives, before the first paint, instead of an empty rail that fills in when the server
   answers. The server's answer then updates it in place. Kept per look, per tab; signing out or in clears it. */
/* The browser may draw a page's first frame before the rest of it has arrived. On a page change that first frame is the
   one that fades in, so a frame without the side rail made the rail blink pale. Hold the first frame until the page's
   main area has begun, by which time the whole rail (and its kept copy) is in. */
if (/\/pages\//.test(location.pathname) && document.readyState === "loading" && !document.getElementById("calmsMain")) document.write('<link rel="expect" href="#calmsMain" blocking="render">');
(function () {
  var ui = ""; try { ui = (/[?&]ui=(classic|western)\b/.exec(location.search) || [])[1] || localStorage.getItem("calms-ui") || "western"; } catch (e) {}
  var KEY = "calms-rail:" + ui, saved = null; try { saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); } catch (e) {}
  /* the first page after signing in has no copy yet: draw the rail for the person's role (index.js notes it at sign-in)
     so it is complete from the first paint, as links.js would draw it; the counts arrive with the server's answer */
  if (!saved) try { var seed = JSON.parse(sessionStorage.getItem("calms-seed") || "null"); if (seed && seed.role) {
    var RAIL = { sales_agent: ["My Queue", "Applications", "Counter-offers", "Notifications"], loan_processor: ["My Queue", "Applications", "New application", "Loan accounts", "Notifications"],
      underwriter: ["My Queue", "Review queue", "Applications", "Counter-offers", "Notifications"], lead_underwriter: ["My Queue", "Review queue", "Applications", "Counter-offers", "Loan accounts", "Notifications"],
      disbursement_officer: ["My Queue", "Disbursement queue", "Loan accounts", "Notifications"], loan_account_officer: ["My Queue", "Loan accounts", "Payments", "Notifications"],
      operations_manager: ["My Queue", "Applications", "Review queue", "Loan accounts", "Reports", "Rules", "Notifications"],
      compliance_auditor: ["My Queue", "Applications", "Loan accounts", "Reports", "Audit log", "Rules", "Notifications"], system_administrator: ["My Queue", "Users and roles", "Rules", "System", "Audit log", "Notifications"] };
    var TO = { "my queue": "my-queue", "applications": "applications", "new application": "new-application", "notifications": "notifications", "review queue": "review-queue", "counter-offers": "counter-offers",
      "disbursement queue": "disbursement-queue", "loan accounts": "loan-accounts", "payments": "post-payment", "reports": "reports", "audit log": "audit-log", "users and roles": "users-roles", "rules": "products-rules", "system": "system" };
    var esc = function (t) { return String(t || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    if (RAIL[seed.role]) saved = { nav: RAIL[seed.role].map(function (l) { var n = TO[l.toLowerCase()]; return '<li><a href="' + n + '.html"><i class="ic ic-lg ic-' + n + '" aria-hidden="true"></i><span class="plate">' + l + '</span></a></li>'; }).join(""),
      who: seed.name ? "<b>" + esc(seed.name) + "</b><span>" + esc(seed.roleName) + "</span>" : "" }; } } catch (e) {}
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var PARENT = { "application-detail": "applications", documents: "applications", "encode-verify": "applications", "credit-assessment": "review-queue", decision: "review-queue",
    "record-answer": "counter-offers", "loan-agreement": "applications", "release-loan": "disbursement-queue", "loan-account": "loan-accounts" };
  var here = PARENT[page] || page;
  function fill(el) {
    if (!saved || !el || el.dataset.kept) return; el.dataset.kept = "1";
    if (el.id === "nav" && saved.nav && !el.children.length) { el.innerHTML = saved.nav;
      [].forEach.call(el.querySelectorAll("a"), function (a) { a.removeAttribute("aria-current"); if ((a.getAttribute("href") || "").split("?")[0].replace(/\.html$/, "").split("/").pop() === here) a.setAttribute("aria-current", "page"); }); 
      /* the page's own script would now add its sample drawers (for use without a server) on top of the real rail, and
         then the server's answer would swap them out again: that was the rail changing on every page. Only links.js
         (which draws the rail for your role) may now put drawers in or clear it. */
      var ap = el.appendChild, tc = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
      el.appendChild = function (c) { return window.CALMS_RAIL_BUILD || !c || c.tagName !== "LI" ? ap.call(this, c) : c; };
      if (tc) Object.defineProperty(el, "textContent", { configurable: true, get: function () { return tc.get.call(this); }, set: function (v) { if (window.CALMS_RAIL_BUILD) tc.set.call(this, v); } }); }
    if (el.classList.contains("who") && saved.who) { var ob = el.querySelector("b"), os = el.querySelector("span"), bid = ob && ob.id, sid = os && os.id; el.innerHTML = saved.who;
      var nb = el.querySelector("b"), ns = el.querySelector(":scope > span"); if (nb) nb.removeAttribute("id"); if (ns) ns.removeAttribute("id"); if (bid && nb) nb.id = bid; if (sid && ns) ns.id = sid; }   /* the page's own ids stay (its script fills them) */   /* over the sample name some pages carry for offline use */
    if (el.classList.contains("rail") && saved.chip && !document.getElementById("practiceChip")) { var w0 = el.querySelector(".who"); if (w0) w0.insertAdjacentHTML("beforebegin", saved.chip); else el.insertAdjacentHTML("beforeend", saved.chip); }
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
  r.style.backgroundColor = "#f5f2ee"; r.style.colorScheme = "light";   /* the page's very first frame is warm white, never the dark of a dark-mode screen */
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, ""), web = /^https?:$/.test(location.protocol);
  var OWN = window.CK_PAGES = ["applications", "application-detail", "notifications", "loan-accounts", "loan-account", "audit-log", "reports",
    "users-roles", "system", "products-rules", "my-profile", "review-queue", "disbursement-queue", "counter-offers", "record-answer", "documents", "encode-verify", "credit-assessment", "decision",
    "loan-agreement", "release-loan", "post-payment", "new-application"];
  var own = OWN.indexOf(page) >= 0 && web; if (own) r.classList.add("c-own");
  /* the western page's own sheet would fight the rebuilt page */
  if (own) [].forEach.call(document.querySelectorAll('link[rel="stylesheet"]'), function (l) { if (l.href.split("/").pop() === page + ".css") l.media = "not all"; });
  /* written into <head> while it is still being read, so the browser waits for them before drawing anything */
  var css = (document.querySelector('link[href$="/base.css"]') ? [] : ["base.css"]).concat(["classic-fonts.css", "classic-app.css", "classic-ui.css", "classic-pages.css"]);
  /* the type, fetched at once: the fonts wait up to a moment for these (font-display: optional in classic-fonts.css), so
     every page's first frame is drawn in Lexend and Inter, never in a stand-in font that then swaps (the sidebar's words
     shifting a hair on every page change) */
  var FONTS = ["lexend-latin-500", "lexend-latin-600", "inter-latin-400", "inter-latin-500", "inter-latin-600"];
  document.write(FONTS.map(function (f) { return '<link rel="preload" as="font" type="font/woff2" crossorigin href="../assets/fonts/' + f + '-normal.woff2">'; }).join("") +
    css.map(function (f) { return '<link rel="stylesheet" href="../assets/css/' + f + '">'; }).join(""));
  var arrived = false; try { arrived = sessionStorage.getItem("calms-entered") === "1"; } catch (e) {}
  r.classList.add(arrived ? "c-arrive" : "c-page");
  /* the sidebar's extras (classic-app.css): folded to icons or not (remembered per device), the "Main" label, the chevron
     that folds it, and the card for what your role does most. Added the moment the rail arrives, before the first paint. */
  try { if (localStorage.getItem("calms-rail-mini") === "1") r.classList.add("c-mini"); } catch (e) {}
  var SVG = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var CTA = { loan_processor: ["Start an application", "Encode a borrower's papers in a few steps.", "New application", "new-application"],
    sales_agent: ["Your borrowers", "Answers to counter-offers and papers still missing.", "Counter-offers", "counter-offers"],
    underwriter: ["Next in line", "Pick up the next application waiting for a decision.", "Review queue", "review-queue"],
    lead_underwriter: ["Next in line", "Assign desks and decide what was endorsed to you.", "Review queue", "review-queue"],
    disbursement_officer: ["Ready to release", "Loans with a signed agreement, waiting for their money.", "Disbursement queue", "disbursement-queue"],
    loan_account_officer: ["Money came in?", "Post it to the loan account in seconds.", "Post a payment", "post-payment"],
    operations_manager: ["How lending is going", "Waiting times, decisions and collections this month.", "Reports", "reports"],
    compliance_auditor: ["Check the seals", "Every entry is sealed to the one before it.", "Audit log", "audit-log"],
    system_administrator: ["Add a person", "Accounts, roles and approval limits.", "Users and roles", "users-roles"] };
  window.CK_CTA = function (role) {
    var rail = document.querySelector(".rail"), c = CTA[role]; if (!rail || !c) return; var card = rail.querySelector(".c-card-cta"); if (card && card.dataset.role === role) return;
    if (!card) { card = document.createElement("div"); card.className = "c-card-cta"; rail.appendChild(card); }
    card.dataset.role = role; card.innerHTML = "<b>" + c[0] + "</b><p>" + c[1] + '</p><a class="c-cta" href="' + c[3] + '.html" title="' + c[2] + '">' + SVG(c[3] === "new-application" || c[3] === "users-roles" ? '<path d="M12 5v14M5 12h14"/>' : '<path d="M5 12h14M13 6l6 6-6 6"/>') + "<span>" + c[2] + "</span></a>";
    try { sessionStorage.setItem("calms-role", role); } catch (e) {} };
  function dress(rail) {
    if (rail.dataset.dressed) return; rail.dataset.dressed = "1";
    var nav = rail.querySelector("#nav"), sec = document.createElement("p"); sec.className = "c-sec"; sec.textContent = "Main"; if (nav) rail.insertBefore(sec, nav);
    var fold = document.createElement("button"); fold.type = "button"; fold.className = "c-fold"; fold.setAttribute("aria-label", "Fold the sidebar"); fold.title = "Fold or open the sidebar";
    fold.innerHTML = SVG('<path d="M15 6l-6 6 6 6"/>'); rail.appendChild(fold);
    fold.addEventListener("click", function () { var on = !r.classList.contains("c-mini"); r.classList.toggle("c-mini", on); fold.setAttribute("aria-expanded", String(!on)); try { localStorage.setItem("calms-rail-mini", on ? "1" : "0"); } catch (e) {} });
    var role = ""; try { role = sessionStorage.getItem("calms-role") || (JSON.parse(sessionStorage.getItem("calms-seed") || "null") || {}).role || ""; } catch (e) {}
    if (role) window.CK_CTA(role); }
  if (window.MutationObserver) { var mo2 = new MutationObserver(function () { var rail = document.querySelector(".rail"); if (rail && rail.querySelector(".who")) { dress(rail); mo2.disconnect(); } });
    mo2.observe(r, { childList: true, subtree: true }); }
  if (page === "my-queue" && web) r.classList.add("c-dash");
})();
/* Quick page changes: the moment the pointer rests on a link to another CALMS page (or a finger touches it), the
   browser fetches that page ahead, so the click shows it at once. Fetched only, not built out of sight: a page built
   out of sight flashed blank when shown, and its entrance animations had already played. Only the screens (/pages/...)
   are fetched ahead; papers, files, the sign-in page and anything that opens in a new tab never are. */
(function () {
  try { if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules")) || !/^https?:$/.test(location.protocol)) return;
    var s = document.createElement("script"); s.type = "speculationrules";
    s.textContent = JSON.stringify({ prefetch: [{ source: "document", where: { and: [{ href_matches: "/pages/*" }, { not: { selector_matches: "[target=_blank], [download], .out, [data-no-ahead]" } }] }, eagerness: "moderate" }] });
    document.head.appendChild(s); } catch (e) {}
})();

