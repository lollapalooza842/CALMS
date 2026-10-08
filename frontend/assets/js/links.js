/* CALMS links: the one place that says which screen leads to which.
   Loaded after each page's own script. It turns the side-rail drawers, breadcrumbs and
   "open the next screen" buttons into real links between the pages of this prototype.

   How it works: each page script already says where a button would lead, by writing a
   short note ("Prototype: the Decision page is not built yet."). This file reads that
   note, together with the label of whatever was just clicked, and goes to the matching page. */
(function () {
  var HERE = (location.pathname.split("/").pop() || "index.html").replace(/\.html$/, "") || "index";
  var AT_ROOT = !/\/pages\/[^/]*$/.test(location.pathname);
  /* Screens that work on one application. Online, they need ?ref=APP-…; the reference you are working on is
     remembered and carried along every link, so the drawers and buttons stay on the same application. */
  var REF_PAGES = { "application-detail": [], documents: ["draft", "submitted"], "encode-verify": ["submitted"], "credit-assessment": ["review"], decision: ["review"],
    "counter-offers": ["approved", "awaiting", "declined"], "record-answer": ["awaiting"], "loan-agreement": ["approved", "accepted"], "release-loan": ["accepted"] };
  var ONLINE = /^https?:$/.test(location.protocol), REF = (/[?&]ref=(APP-\d{4}-\d{4})/.exec(location.search) || [])[1] || "";
  try { if (REF) sessionStorage.setItem("calms-ref", REF); else REF = sessionStorage.getItem("calms-ref") || ""; } catch (e) {}
  function url(name) { var u = name === "index" ? (AT_ROOT ? "index.html" : "../index.html") : (AT_ROOT ? "pages/" : "") + name + ".html"; return ONLINE && REF && REF_PAGES[name] ? u + "?ref=" + REF : u; }
  function go(name, wait) { if (!name || name === HERE) return false; setTimeout(function () { location.href = url(name); }, wait || 0); return true; }

  /* Side-rail drawers and breadcrumbs, by their label. */
  var BY_LABEL = {
    "my queue": "my-queue", "applications": "applications", "new application": "new-application", "notifications": "notifications",
    "review queue": "review-queue", "counter-offers": "counter-offers", "disbursement": "disbursement-queue", "disbursement queue": "disbursement-queue",
    "loan accounts": "loan-accounts", "payments": "post-payment", "reports": "reports", "audit log": "audit-log",
    "users and roles": "users-roles", "administration": "users-roles", "rules": "products-rules", "system": "system", "my profile": "my-profile"
  };
  /* Free text (a button label, an action name, a page name) to a screen. First match wins, so the order matters. */
  var BY_WORDS = [
    [/resume draft|finish (the )?draft/i, "new-application"],
    [/record.*(answer|response)|borrower.*(answer|response|reply)/i, "record-answer"],
    [/counter-?offer/i, "counter-offers"],
    [/review queue/i, "review-queue"],
    [/disbursement queue|back to the queue/i, "disbursement-queue"],
    [/release|disburs|payout/i, "release-loan"],
    [/agreement|signed copy|signature/i, "loan-agreement"],
    [/encode|verif/i, "encode-verify"],
    [/document|checklist|upload|missing paper|permit/i, "documents"],
    [/assess|finscore|bureau/i, "credit-assessment"],
    [/decision|decide|approv|declin/i, "decision"],
    [/post (a |this )?payment|payment/i, "post-payment"],
    [/loan accounts/i, "loan-accounts"],
    [/loan account|\bLN-\d/i, "loan-account"],
    [/new application|start an application/i, "new-application"],
    [/my profile|which notices/i, "my-profile"],
    [/my queue/i, "my-queue"],
    [/applications$/i, "applications"],
    [/application|\bAPP-\d/i, "application-detail"]
  ];
  function byWords(t) { if (!t) return null; for (var i = 0; i < BY_WORDS.length; i++) if (BY_WORDS[i][0].test(t)) return BY_WORDS[i][1]; return null; }
  function byLabel(t) { return BY_LABEL[String(t || "").replace(/\s*\d+\s*$/, "").trim().toLowerCase()] || null; }

  /* 0. Online, the side rail holds only the drawers the signed-in person's role may open (FR-111),
     with how much is waiting in My Queue and how many notices are new. */
  var RAIL = {
    sales_agent: ["My Queue", "Applications", "Counter-offers", "Notifications"],
    loan_processor: ["My Queue", "Applications", "New application", "Loan accounts", "Notifications"],
    underwriter: ["My Queue", "Review queue", "Applications", "Counter-offers", "Notifications"],
    lead_underwriter: ["My Queue", "Review queue", "Applications", "Counter-offers", "Loan accounts", "Notifications"],
    disbursement_officer: ["My Queue", "Disbursement queue", "Loan accounts", "Notifications"],
    loan_account_officer: ["My Queue", "Loan accounts", "Payments", "Notifications"],
    operations_manager: ["My Queue", "Applications", "Review queue", "Loan accounts", "Reports", "Rules", "Notifications"],
    compliance_auditor: ["My Queue", "Applications", "Loan accounts", "Reports", "Audit log", "Rules", "Notifications"],
    system_administrator: ["My Queue", "Users and roles", "Rules", "System", "Audit log", "Notifications"]
  };
  /* Screens reached from a drawer light up that drawer. */
  var PARENT = { "application-detail": "applications", documents: "applications", "encode-verify": "applications", "credit-assessment": "review-queue", decision: "review-queue",
    "record-answer": "counter-offers", "loan-agreement": "applications", "release-loan": "disbursement-queue", "loan-account": "loan-accounts" };
  var WANT = null, COUNTS = { queue: null, unread: null };
  function railLabels(nav) { return [].map.call(nav.querySelectorAll(".plate"), function (p) { return ((p.firstChild && p.firstChild.nodeValue) || p.textContent).trim(); }).join("|"); }
  function railBuild(nav) { nav.textContent = ""; var here = PARENT[HERE] || HERE;
    WANT.forEach(function (label) { var li = document.createElement("li"), a = document.createElement("a"), p = document.createElement("span"); p.className = "plate"; p.appendChild(document.createTextNode(label)); a.href = "#";
      var n = label === "My Queue" ? COUNTS.queue : label === "Notifications" ? COUNTS.unread : null; if (n) { var i = document.createElement("i"); i.textContent = String(n); p.appendChild(i); }
      if (byLabel(label) === here) a.setAttribute("aria-current", "page"); a.appendChild(p); li.appendChild(a); nav.appendChild(li); }); }
  function railLoad() { if (!window.CALMS) return; CALMS.api("GET", "/api/rail").then(function (d) { WANT = RAIL[d.role] || null; COUNTS = d; var nav = document.getElementById("nav"); if (nav && WANT) railBuild(nav); }, function () {}); }
  if (ONLINE && !AT_ROOT) { railLoad(); setInterval(function () { if (!document.hidden) railLoad(); }, 120000); }

  /* 1. Side rail: give every drawer a real address and let it be clicked. */
  function rail() { var nav = document.getElementById("nav"); if (!nav) return; if (WANT && railLabels(nav) !== WANT.join("|")) { railBuild(nav); return; } [].forEach.call(nav.querySelectorAll("a"), function (a) { var p = a.querySelector(".plate"), label = p ? (p.firstChild && p.firstChild.nodeValue) || p.textContent : a.textContent, name = byLabel(label); if (!name) return; a.setAttribute("href", url(name)); if (!a.querySelector(".ic")) { var ic = document.createElement("i"); ic.className = "ic ic-lg ic-" + name; ic.setAttribute("aria-hidden", "true"); a.insertBefore(ic, a.firstChild); } if (name !== HERE) { a.removeAttribute("aria-disabled"); a.removeAttribute("title"); } a.dataset.go = name; }); }
  rail(); var navEl = document.getElementById("nav"); if (navEl && window.MutationObserver) new MutationObserver(rail).observe(navEl, { childList: true, subtree: true });

  /* The page title wears the page's icon (drawn by design/icons/icons.py). */
  var h1 = document.querySelector("main h1"); if (h1 && HERE !== "index") h1.classList.add("ich", "ic-" + HERE);

  /* 2. The nameplate at the foot of the rail (styled in rail.css): a badge, the name as a link to My profile, and the way out. */
  var who = document.querySelector(".rail .who"); if (who && !who.querySelector("a")) { var b = who.querySelector("b");
    var badge = document.createElement("i"); badge.className = "ic ic-lg ic-my-profile"; badge.setAttribute("aria-hidden", "true"); who.insertBefore(badge, who.firstChild);
    if (b) { var a = document.createElement("a"); a.href = url("my-profile"); a.textContent = b.textContent; a.title = "My profile"; b.textContent = ""; b.appendChild(a); }
    var out = document.createElement("a"), door = document.createElement("i"); out.className = "out"; out.href = url("index") + "#signin"; door.className = "ic ic-sign-in"; door.setAttribute("aria-hidden", "true"); out.appendChild(door); out.appendChild(document.createTextNode("Sign out")); who.appendChild(out); }

  /* 3. Remember what was clicked; a drawer or breadcrumb goes straight to its page. */
  var last = "";
  document.addEventListener("click", function (e) { var t = e.target.closest ? e.target.closest("a, button") : null; if (!t) return; last = (t.textContent || "").replace(/\s+/g, " ").trim();
    if (t.dataset && t.dataset.go) { if (t.dataset.go === HERE) return; e.preventDefault(); e.stopPropagation(); go(t.dataset.go); return; }
    if (t.matches(".crumb a")) { var name = byLabel(last) || byWords(last); if (name && name !== HERE) { e.preventDefault(); e.stopPropagation(); go(name); } } }, true);

  /* 4. When a page says "that screen is not built yet", go to the screen it means. */
  var note = document.getElementById("note");
  var LEADS = /not built yet|another page|separate (prototype )?page|is a separate page|would (now )?open|opens a page/i, STAYS = /Marked done here|statement|clearance|would download|emailed|printing|disclosure|would start|would be generated|would be sent/i;
  function read() { var t = note.textContent || ""; if (!/^Prototype: /.test(t) || !LEADS.test(t) || STAYS.test(t)) return; var m, name = null;
    if ((m = t.match(/^Prototype: (.+?) is (?:another|a separate(?: prototype)?) page/)) || (m = t.match(/^Prototype: the (.+?) drawer is not built/))) name = byLabel(m[1]);
    if (!name && /would now open on Documents/.test(t)) { note.textContent = t.replace(/ Nothing was sent.*$/, " Opening it now."); go("documents", 1400); return; }
    if (!name && (m = t.match(/“([^”]+)”/))) name = byWords(m[1]);
    if (!name && (m = t.match(/^Prototype: the (.+?) page(?: for [A-Z]+-[\d-]+)? is not built/))) name = byWords(m[1]) || byLabel(m[1]);
    if (!name && /that (page )?is|would open here/.test(t)) name = byLabel(last) || byWords(last);
    if (!name) name = byWords(t.replace(/^Prototype: /, ""));
    go(name); }
  if (note && window.MutationObserver) new MutationObserver(read).observe(note, { childList: true, characterData: true, subtree: true });

  /* 5. Online, a one-application screen opened without ?ref asks which application, instead of showing the sample. */
  if (ONLINE && REF_PAGES[HERE] && !/[?&]ref=APP-/.test(location.search) && window.CALMS) {
    var want = REF_PAGES[HERE], box = document.createElement("div"); box.className = "chooser"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-labelledby", "chooserT");
    var card = document.createElement("div"); card.className = "chooser-card"; box.appendChild(card);
    var h = document.createElement("h2"); h.id = "chooserT"; h.textContent = "Which application?"; card.appendChild(h);
    var p = document.createElement("p"); p.textContent = "Loading the applications…"; card.appendChild(p);
    document.body.appendChild(box);
    var ST = { draft: "Draft", submitted: "Submitted", review: "Under Review", approved: "Approved", awaiting: "Awaiting Borrower", accepted: "Accepted", funded: "Funded", declined: "Declined by Borrower", rejected: "Rejected" };
    CALMS.api("GET", "/api/applications").then(function (d) {
      var L = d.applications.filter(function (x) { return !want.length || want.indexOf(x.status) >= 0; }).sort(function (x, y) { return (y.reference === REF) - (x.reference === REF) || new Date(x.statusSince) - new Date(y.statusSince); });
      p.textContent = L.length ? "This screen works on one application. Pick the one to open" + (want.length ? " (showing those at " + want.map(function (k) { return ST[k]; }).join(" or ") + ")" : "") + "." : "No application is at this stage right now" + (want.length ? " (" + want.map(function (k) { return ST[k]; }).join(" or ") + ")" : "") + ".";
      var ul = document.createElement("ul"); L.slice(0, 12).forEach(function (x) { var li = document.createElement("li"), a = document.createElement("a"); a.href = location.pathname + "?ref=" + x.reference;
        var b = document.createElement("b"); b.textContent = x.reference; a.appendChild(b); a.appendChild(document.createTextNode(" " + x.borrower + " · " + x.product + " · " + ST[x.status] + (x.reference === REF ? " · the one you had open" : ""))); li.appendChild(a); ul.appendChild(li); });
      card.appendChild(ul); var first = ul.querySelector("a"); if (first) first.focus();
      var back = document.createElement("a"); back.className = "chooser-back"; back.href = url("applications"); back.textContent = "Go to the full list of applications"; card.appendChild(back);
    }, function (err) { if (err.status === 401) return; p.textContent = err.message + " "; var back = document.createElement("a"); back.href = url("my-queue"); back.textContent = "Back to My Queue"; p.appendChild(back); });
  }

  /* 6. Sign-in: a successful sign-in opens My Queue. entrance.js does this with the walk into the bank; this is the plain fallback. */
  var welcome = document.getElementById("welcome"); if (welcome && window.MutationObserver && !window.CALMS_ENTRANCE) new MutationObserver(function () { if (/^Welcome back/.test(welcome.textContent)) go("my-queue", 1600); }).observe(welcome, { childList: true, characterData: true, subtree: true });
})();
