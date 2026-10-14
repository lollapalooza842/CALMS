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
/* The CALMS icons: drawn for this app, on a 24px grid. Each has a soft filled body (class ic-f, the ink at low
   strength) under a crisp line, and most carry one small amber mark (class ic-a), the CALMS coin. Shared by the
   classic look's pages (kit.js), its sidebar and top bar (classic-app.js). Simple controls (plus, chevrons) stay plain. */
window.CALMS_IC = (function () {
  var DOC = 'M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h10a1.5 1.5 0 0 0 1.5-1.5V8z',
      TRI = 'M10.3 4.3a2 2 0 0 1 3.4 0l7.4 12.8a2 2 0 0 1-1.7 3H4.6a2 2 0 0 1-1.7-3z',
      SHIELD = 'M12 3 5 5.8v5.7c0 4.3 2.9 7.5 7 9.5 4.1-2 7-5.2 7-9.5V5.8z',
      BELL = 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z',
      TRAY = 'M4 13.5l1.7-6.8A2 2 0 0 1 7.6 5h8.8a2 2 0 0 1 1.9 1.7L20 13.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z',
      f = function (d) { return '<path class="ic-f" d="' + d + '"/><path d="' + d + '"/>'; },
      a = function (x, y, r) { return '<circle class="ic-a" cx="' + x + '" cy="' + y + '" r="' + (r || 1.5) + '"/>'; };
  var I = {
    search: '<circle class="ic-f" cx="10.5" cy="10.5" r="6.5"/><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20 20"/>' + a(8.6, 8.6, 1.3),
    plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', down: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>',
    dots: '<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/>' + a(18.5, 12, 1.6),
    doc: f(DOC) + '<path d="M14 3v4a1 1 0 0 0 1 1h4M13 14h3"/>' + a(10, 14),
    file: f(DOC) + '<path d="M14 3v4a1 1 0 0 0 1 1h4M9.5 12.5h6M9.5 16h3.5"/>' + a(16, 16, 1.2),
    upload: f('M4 14h16v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z') + '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/>' + a(16.5, 17, 1),
    download: f('M4 14h16v4.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z') + '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/>' + a(16.5, 17, 1),
    eye: f('M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z') + '<circle cx="12" cy="12" r="3"/>' + a(12, 12, 1.2),
    clock: '<circle class="ic-f" cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>' + a(12, 12, 1.2),
    hourglass: f('M7 3.5h10c0 4.5-3 6-5 8.5-2-2.5-5-4-5-8.5zM7 20.5h10c0-4.5-3-6-5-8.5-2 2.5-5 4-5 8.5z') + a(12, 17.6, 1.4),
    alert: f(TRI) + '<path d="M12 9.5v4"/>' + a(12, 16.6, 1.2),
    info: '<circle class="ic-f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/>' + a(12, 7.8, 1.2),
    user: '<circle class="ic-f" cx="12" cy="8" r="4"/><circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1.2-3.8 4.2-6 7.5-6s6.3 2.2 7.5 6"/>' + a(18.5, 15.5, 1.3),
    users: '<circle class="ic-f" cx="9" cy="8" r="3.5"/><circle cx="9" cy="8" r="3.5"/><path d="M3 20c.7-3.4 3-5 6-5s5.3 1.6 6 5M16 4.6a3.4 3.4 0 0 1 0 6.8M17.5 15c1.8.6 3 2.4 3.4 5"/>' + a(20, 7.5, 1.3),
    peso: '<circle class="ic-f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M10 16.8V7.6h2.4a2.3 2.3 0 0 1 0 4.6H10M8.4 9.4h7M8.4 10.8h7"/>' + a(16.6, 16.4, 1.2),
    bank: f('M3.5 9.5 12 4l8.5 5.5z') + '<path d="M5.5 9.5v8M10 9.5v8M14 9.5v8M18.5 9.5v8M3.5 20h17"/>' + a(12, 7.4, 1.1),
    shield: f(SHIELD) + '<path d="M9 12l2.2 2.2L15.5 10"/>',
    lock: '<rect class="ic-f" x="4.5" y="10" width="15" height="10.5" rx="2.5"/><rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/>' + a(12, 15.2),
    edit: f('M15 5l4 4L9 19H5v-4z') + '<path d="M13 7l4 4"/>' + a(19, 19.5, 1.2),
    send: f('M4 11.5 20 4l-7.5 16-2.3-6.2z') + '<path d="M10.2 13.8 20 4"/>',
    chart: '<rect class="ic-f" x="4.5" y="11" width="4" height="8.5" rx="1.2"/><rect x="4.5" y="11" width="4" height="8.5" rx="1.2"/><rect class="ic-f" x="10" y="7" width="4" height="12.5" rx="1.2"/><rect x="10" y="7" width="4" height="12.5" rx="1.2"/><rect class="ic-a" x="15.5" y="3.5" width="4" height="16" rx="1.2"/>',
    list: '<path d="M9.5 7H20M9.5 12H20M9.5 17H16"/>' + a(5, 7, 1.4) + '<circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.2h-4.2"/>' + a(12, 12, 1.4),
    cal: '<rect class="ic-f" x="4" y="5.5" width="16" height="14.5" rx="2.5"/><rect x="4" y="5.5" width="16" height="14.5" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>' + a(15.5, 15),
    bell: f(BELL) + '<path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>' + a(17.8, 5.6, 1.9),
    wallet: '<rect class="ic-f" x="3.5" y="7" width="17" height="13" rx="2.5"/><rect x="3.5" y="7" width="17" height="13" rx="2.5"/><path d="M6.5 7l9-3.5 1.3 3.5M20.5 11.3h-3.7a2.2 2.2 0 0 0 0 4.4h3.7"/>' + a(16.8, 13.5, 1.1),
    flag: f('M5.5 4h11l-2 4 2 4h-11z') + '<path d="M5.5 21V4"/>' + a(5.5, 21, 1.3),
    swap: '<path d="M7 8h12l-3.5-3.5M17 16H5l3.5 3.5"/>' + a(5, 8, 1.4) + a(19, 16, 1.4),
    gear: '<circle class="ic-f" cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="5"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>' + a(12, 12, 1.8),
    server: '<rect class="ic-f" x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="4" width="16" height="7" rx="2"/><rect class="ic-f" x="4" y="13" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M11 7.5h5M11 16.5h5"/>' + a(7.5, 7.5, 1.1) + a(7.5, 16.5, 1.1),
    mail: '<rect class="ic-f" x="3" y="5.5" width="18" height="13" rx="2.5"/><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7.5 12 13l8.5-5.5"/>' + a(12, 13, 1.4),
    phone: '<rect class="ic-f" x="7" y="3" width="10" height="18" rx="2.5"/><rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M10.5 6h3"/>' + a(12, 17.5, 1.2),
    key: '<circle class="ic-f" cx="8" cy="15" r="4.5"/><circle cx="8" cy="15" r="4.5"/><path d="M11.3 11.7 19.5 3.5M16.5 6.5l2 2M14.3 8.7l1.8 1.8"/>' + a(8, 15, 1.4),
    stamp: f('M5 15.5h14V19H5z') + '<path d="M9.5 15.5V12c0-1.2-1.5-2.2-1.5-4.5a4 4 0 0 1 8 0c0 2.3-1.5 3.3-1.5 4.5v3.5M6.5 21.5h11"/>' + a(12, 7.5, 1.3),
    done: '<circle class="ic-f" cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="9"/><path d="M7.8 12.3l2.8 2.8 5.6-5.6"/>',
    tray: f(TRAY) + '<path d="M4 13.5h4.2l1.6 2.5h4.4l1.6-2.5H20"/>' + a(12, 9.5, 1.6),
    docs: '<path class="ic-f" d="M9 3.5h6l4 4v10a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 8 17.5v-12.5A1.5 1.5 0 0 1 9 3.5z"/><path d="M15 3.5H9.5A1.5 1.5 0 0 0 8 5v12.5A1.5 1.5 0 0 0 9.5 19h8a1.5 1.5 0 0 0 1.5-1.5V7.5zM15 3.5v4h4M5 7.5v12A1.5 1.5 0 0 0 6.5 21H15"/>' + a(13.5, 13, 1.3),
    newdoc: f(DOC) + '<path d="M14 3v4a1 1 0 0 0 1 1h4M12.5 11.5v6M9.5 14.5h6"/>',
    clipboard: '<rect class="ic-f" x="5.5" y="4.5" width="13" height="16.5" rx="2"/><rect x="5.5" y="4.5" width="13" height="16.5" rx="2"/><path d="M9 4.5V3.2h6v1.3M9 13l2 2 4-4"/>' + a(15, 18, 1.1),
    note: '<rect class="ic-f" x="2.5" y="6.5" width="19" height="11" rx="2"/><rect x="2.5" y="6.5" width="19" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/>' + a(5.7, 9.6, 1.1) + a(18.3, 14.4, 1.1),
    card: '<rect class="ic-f" x="3" y="5.5" width="18" height="13" rx="2.5"/><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 14.5h4"/>' + a(17, 14.5, 1.3),
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle class="ic-f" cx="15" cy="7" r="2.3"/><circle cx="15" cy="7" r="2.3"/>' + a(9, 17, 2.3),
    ledger: f(SHIELD) + '<path d="M9 9.5h6M9 12.5h6M9 15.5h3.5"/>' + a(15, 15.5, 1.1)
  };
  /* the sidebar's names for them */
  I["my queue"] = I.tray; I.applications = I.docs; I["new application"] = I.newdoc; I["review queue"] = I.clipboard; I["counter-offers"] = I.swap;
  I["disbursement queue"] = I.note; I["loan accounts"] = I.wallet; I.payments = I.card; I.notifications = I.bell; I.reports = I.chart; I["audit log"] = I.ledger;
  I.rules = I.sliders; I.system = I.server; I["users and roles"] = I.users; I["my profile"] = I.user; I.more = I.dots;
  return I;
})();
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
  var css = (document.querySelector('link[href$="/base.css"]') ? [] : ["base.css"]).concat(["classic-fonts.css", "classic-app.css", "classic-ui.css", "classic-pages.css", "classic-neo.css"]);
  /* the type, fetched at once: the fonts wait up to a moment for these (font-display: optional in classic-fonts.css), so
     every page's first frame is drawn in Poppins and Manjari, never in a stand-in font that then swaps (the sidebar's words
     shifting a hair on every page change) */
  var FONTS = ["poppins-latin-700", "manjari-latin-100", "manjari-latin-400", "manjari-latin-700"];
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
    card.dataset.role = role; card.innerHTML = "<b>" + c[0] + '</b><a class="c-cta" href="' + c[3] + '.html" title="' + c[2] + '">' + SVG(c[3] === "new-application" || c[3] === "users-roles" ? '<path d="M12 5v14M5 12h14"/>' : '<path d="M5 12h14M13 6l6 6-6 6"/>') + "<span>" + c[2] + "</span></a>";
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

