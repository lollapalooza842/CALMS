/* The classic look inside CALMS (classic-app.css): line icons in the sidebar, a round initials badge for the person
   signed in, a slim top bar (where you are, today's date, notices), and My Queue as a plain dashboard: four numbers
   and one table of the work waiting on you, from the same /api/queue the western board uses.
   entrance.js adds this file, and the html classes c-arrive (just signed in: everything slides in) or c-page. */
(function () {
  if (document.documentElement.getAttribute("data-ui") !== "classic") return;
  var HERE = (location.pathname.split("/").pop() || "").replace(/\.html$/, "");
  var S = function (d) { return '<svg class="c-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; };
  var IC = window.CALMS_IC || {};   /* the CALMS icons (look.js) */

  var ALIAS = { queue: "my queue", "disbursement": "disbursement queue", release: "disbursement queue", accounts: "loan accounts", notices: "notifications", users: "users and roles", audit: "audit log", offers: "counter-offers", review: "review queue", new: "new application", "sign out": null };
  function icon(label) { var k = String(label || "").replace(/\s*\d+\s*$/, "").trim().toLowerCase(); k = ALIAS.hasOwnProperty(k) ? ALIAS[k] : k; return k && IC[k] ? S(IC[k]) : ""; }
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function initials(n) { return String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "·"; }

  /* a mock-up portrait over the initials (the server draws it from the name: /api/face); the initials stay underneath
     while it loads, and if it cannot load */
  /* a photo for each person: the same name always gets the same face, women and men from their own sets */
  var WOMEN = " liza mila corazon regina maricar katrina lourdes rosalinda imelda teresita carmela josefina marivic norma herminia felisa emily maria ana grace joy rose luz carmen nenita lorna cristina elena jocelyn marites susan michelle angelica kristine princess divina ligaya remedios consuelo precious glenda irene evelyn marilyn rowena jennifer ",
      MEN = " antonio aurelio benjie jun rodel paolo benigno vicente crisanto nestor ramon glenn juan jose luca joshua noel andrea ",
      SHE = ["p01", "p05", "p09", "p11"], HE = ["p02", "p03", "p04", "p06", "p07", "p08", "p10", "p12"];
  function isWoman(first) { if (WOMEN.indexOf(" " + first + " ") >= 0) return true; if (MEN.indexOf(" " + first + " ") >= 0) return false; return /(a|ita|ine|elle|ette|ie)$/.test(first) && !/o$/.test(first); }
  window.CALMS_PHOTO = function (name) {
    var n = String(name || "").replace(/^(ladder|atty\.?|dr\.?|engr\.?)\s+/i, "").trim(), first = n.split(/\s+/)[0].toLowerCase().replace(/[^a-z\u00f1]/g, "");
    var set = isWoman(first) ? SHE : HE, h = 0; for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    return "/assets/img/people/" + set[h % set.length] + ".jpg"; };
  window.CALMS_FACE = function (span, name) {
    if (!span || !name) return span; var old = span.querySelector("img.c-face"); if (old && old.dataset.n === name) return span; if (old) old.remove();
    var img = document.createElement("img"); img.className = "c-face"; img.alt = ""; img.decoding = "async"; img.dataset.n = name;
    img.addEventListener("load", function () { img.classList.add("ok"); }); img.addEventListener("error", function () { img.remove(); });
    img.src = window.CALMS_PHOTO(name); if (img.complete && img.naturalWidth) img.classList.add("ok"); span.appendChild(img); return span; };
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  ready(function () {
    /* ---- the sidebar: icons and the order they slide in ---- */
    var nav = document.getElementById("nav");
    function dress() { if (!nav) return; [].forEach.call(nav.querySelectorAll("li"), function (li, i) { li.style.setProperty("--i", i); var a = li.querySelector("a"); if (!a || a.querySelector(".c-ic")) return;
      var p = a.querySelector(".plate"), label = p ? ((p.firstChild && p.firstChild.nodeValue) || p.textContent) : a.textContent, s = icon(label); if (s) a.insertAdjacentHTML("afterbegin", s); });
      [].forEach.call(document.querySelectorAll("#tabbar .tab, #tabmore .row"), function (t) { if (t.querySelector(".c-ic")) return; var s = icon(t.getAttribute("aria-label") || t.textContent); if (s) t.insertAdjacentHTML("afterbegin", s); }); }
    dress(); if (nav && window.MutationObserver) new MutationObserver(dress).observe(nav, { childList: true, subtree: true });   /* at once, before the next paint: the icons never blink out */
    if (window.MutationObserver) new MutationObserver(function () { setTimeout(dress, 0); }).observe(document.body, { childList: true });
    var who = document.querySelector(".rail .who");
    /* the photo is an <i>, not a <span>: the pages fill "the first span" of the nameplate with the role, which used to
       land in the photo and show "Loan Proces..." for a moment on every page */
    function badge() { if (!who) return; var n = (who.querySelector("b") || {}).textContent || ""; var av = who.querySelector(".c-av");
      if (av && av.tagName !== "I") { av.remove(); av = null; }
      if (!av) { av = el("i", "c-av"); av.setAttribute("aria-hidden", "true"); who.insertBefore(av, who.firstChild); }
      if (av.dataset.n !== n || av.firstChild && av.firstChild.nodeType === 3 && av.firstChild.nodeValue !== initials(n)) { var img = av.querySelector("img.c-face"); av.textContent = initials(n); av.dataset.n = n; if (img && img.dataset.n === n) av.appendChild(img); }
      window.CALMS_FACE(av, n); inline(av.querySelector("img.c-face")); }
    /* the nameplate photo is kept inside the page itself (a small copy written into the image), so the next page draws it
       in its very first frame from the kept sidebar, instead of the initials showing until the photo file arrives */
    function inline(img) { if (!img || /^data:/.test(img.src)) return; img.decoding = "sync";
      function go() { try { var c = document.createElement("canvas"); c.width = c.height = 96; c.getContext("2d").drawImage(img, 0, 0, 96, 96); img.src = c.toDataURL("image/jpeg", 0.85); } catch (e) {} }
      if (img.complete && img.naturalWidth) go(); else img.addEventListener("load", go, { once: true }); }
    badge(); if (who && window.MutationObserver) new MutationObserver(function () { var av = who.querySelector(".c-av"), n = (who.querySelector("b") || {}).textContent || ""; if (!av || av.tagName !== "I" || av.textContent !== initials(n) || !av.querySelector("img.c-face")) badge(); }).observe(who, { childList: true, subtree: true, characterData: true });

    /* ---- the top bar ---- */
    var main = document.querySelector("main"); if (!main) return;
    var top = el("header", "c-top"), crumb = el("span", "c-crumb", "GR8 Lending Company · CALMS"), right = el("div", "c-right");
    var date = el("span", "c-chip c-date"); date.innerHTML = S(IC.cal);
    date.appendChild(document.createTextNode(new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" })));
    var bell = el("a", "c-chip c-bell"); bell.href = "notifications.html"; bell.setAttribute("aria-label", "Notifications"); bell.innerHTML = S(IC.notifications);
    right.appendChild(date); right.appendChild(bell); top.appendChild(crumb); top.appendChild(right); main.insertBefore(top, main.firstChild);
    if (window.CALMS && CALMS.online) CALMS.api("GET", "/api/rail").then(function (d) { if (d.unread) { var b = el("b", "", d.unread > 99 ? "99+" : String(d.unread)); bell.appendChild(b); bell.setAttribute("aria-label", d.unread + " unread notices"); } }, function () {});

    /* ---- every page, made plain: classify what the western sheets drew (see the end of classic-app.css) ---- */
    var done = new WeakSet();
    function rgb(str) { var m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(str || ""); return m ? [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]] : null; }
    function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
    function bgOf(cs) { var c = rgb(cs.backgroundColor); if (c && c[3] > .5) return c; if (/gradient/.test(cs.backgroundImage)) { var g = rgb(cs.backgroundImage); if (g && g[3] > .5) return g; } return null; }
    function warm(c) { var mx = Math.max(c[0], c[1], c[2]), mn = Math.min(c[0], c[1], c[2]); return mx - mn > 18 && c[0] >= c[2]; }
    function flatten(root) {
      var all = [].slice.call(root.querySelectorAll("*")), fresh = [];
      all.forEach(function (e) { if (done.has(e) || e.closest("svg, .c-dash, .c-top, .c-fab, #tabbar, #tabmore, canvas, img, video, iframe")) return; done.add(e); fresh.push(e); });
      fresh.forEach(function (e) {
        var cs = getComputedStyle(e); if (cs.display === "none") return;
        var r = e.getBoundingClientRect(), big = r.width > 220 && r.height > 70, bg = bgOf(cs), tag = e.tagName;
        var isBtn = tag === "BUTTON" || (tag === "A" && /btn|act|go/.test(e.className)) || e.getAttribute("role") === "button";
        var hasText = /\S/.test(e.textContent || "") || /^(INPUT|SELECT|TEXTAREA)$/.test(tag);
        if (bg && hasText) {                                   /* a box with no words in it is a bar, a swatch or a dot: its colour is the point, so it keeps it */
          var L = lum(bg);
          if (L < .42 && !isBtn) e.classList.add(big ? "c-card" : "c-chip2");
          else if (L < .42 && isBtn && e.getAttribute("aria-pressed") !== "true") e.classList.add("c-btn");
          else if (L >= .42 && L < .97 && warm(bg) && bg[2] < 225 && !isBtn) e.classList.add("c-paper", big ? "c-big" : "c-small");
          if (e.classList.contains("c-card") && e.parentElement && e.parentElement.closest(".c-card")) e.classList.add("c-inner");
        }
        var bw = Math.max(parseFloat(cs.borderTopWidth) || 0, parseFloat(cs.borderLeftWidth) || 0, parseFloat(cs.borderBottomWidth) || 0);
        if (bw >= 3 || /double|dashed|dotted/.test(cs.borderTopStyle + cs.borderBottomStyle) && bw >= 2 || cs.borderImageSource !== "none") { if (!e.classList.contains("c-card")) e.classList.add("c-thin"); }
        else if (bw >= 1 && /^(rgb\(1[0-9]|rgb\([0-4]?\d,)/.test(cs.borderTopColor) && !isBtn) e.classList.add("c-thin");
        var sh = cs.boxShadow; if (sh && sh !== "none" && !/inset/.test(sh) && /\d+px \d+px 0px/.test(sh)) e.classList.add(big ? "c-soft" : "c-flat");
        if (cs.transform !== "none" && /^matrix\(([-\d.e]+), ([-\d.e]+)/.test(cs.transform)) { var b = +RegExp.$2; if (Math.abs(b) > .005 && !e.getAnimations().length) e.classList.add("c-norot"); }
      });
      [].forEach.call(root.querySelectorAll("*"), function (e) { if (e.classList.contains("c-ink") || e.classList.contains("c-ink2") || e.closest("svg, .c-dash, .c-top, .c-btn, .c-go, button[aria-pressed='true'], .act, .btn.grn, .hold")) return; var cs = getComputedStyle(e); if (cs.display === "none" || !/\S/.test(e.textContent || "")) return;
        var c = rgb(cs.color); if (!c || lum(c) < .6) return; var p = e, back = null; while (p && p !== document.body) { back = bgOf(getComputedStyle(p)); if (back) break; p = p.parentElement; }
        if (!back || lum(back) > .6) e.classList.add(lum(c) > .85 ? "c-ink" : "c-ink2"); });
    }
    var fT = 0; function soon() { clearTimeout(fT); fT = setTimeout(function () { flatten(main); }, 60); }
    if (document.documentElement.classList.contains("c-own")) { /* rebuilt page: nothing western to flatten */ }
    else if (HERE !== "my-queue" || !document.documentElement.classList.contains("c-dash")) { flatten(main); setTimeout(soon, 400); setTimeout(soon, 1500);
      if (window.MutationObserver) new MutationObserver(soon).observe(main, { childList: true, subtree: true }); }
    var ch = document.querySelector(".chooser"); if (ch) flatten(ch);

    /* ---- every page: its parts slide up in turn ---- */
    function slide(list) { var k = 0; [].forEach.call(list, function (e) { if (e === top || e.id === "note" || e.classList.contains("c-dash")) return; e.classList.add("c-slide"); e.style.setProperty("--i", k++); }); }
    if (document.documentElement.classList.contains("c-own")) return;
    if (HERE !== "my-queue") { slide(main.children); return; }

    /* ---- My Queue, the dashboard ---- */
    if (!(window.CALMS && CALMS.online)) { document.documentElement.classList.remove("c-dash"); slide(main.children); return; }
    var dash = el("section", "c-dash"); dash.setAttribute("aria-label", "My Queue"); main.insertBefore(dash, top.nextSibling);
    /* while the server answers (it can take a minute to wake): a calm skeleton of the dashboard, never the western page */
    dash.innerHTML = '<div class="ck-skel big"><i style="width:30%"></i><i style="width:46%"></i></div>' +
      '<div class="c-skelrow">' + [0, 1, 2, 3].map(function () { return '<div class="ck-card"><div class="ck-skel"><i style="width:40%"></i><i style="width:25%"></i><i style="width:60%"></i></div></div>'; }).join("") + '</div>' +
      '<div class="ck-card"><div class="ck-skel"><i style="width:90%"></i><i style="width:70%"></i><i style="width:84%"></i><i style="width:62%"></i><i style="width:76%"></i></div></div>';
    var filter = "all", Q = null, ME = null;
    function hrs(h) { return h >= 48 ? Math.floor(h / 24) + " days" : h >= 1 ? Math.floor(h) + " h" : Math.max(1, Math.round(h * 60)) + " min"; }
    function peso(n) { return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }); }
    var TONE = { red: "#9a2f24", amber: "#b26a10", gold: "#b26a10", blue: "#2c5e8a", ink: "#5b4a3d", green: "#2f7a4f", grey: "#6b5c50" };
    var GRAD = ["linear-gradient(140deg,#c9821b,#9a2f24)", "linear-gradient(140deg,#2c5e8a,#1f3f5e)", "linear-gradient(140deg,#2f7a4f,#1f5537)", "linear-gradient(140deg,#8a5a9a,#5a3a6b)", "linear-gradient(140deg,#b26a10,#7a4808)"];
    function stat(label, value, sub, accent, svg, i) { var li = el("li", "c-stat c-slide"); li.style.setProperty("--a", accent); li.style.setProperty("--i", i);
      var t = el("span", "c-tile"); t.innerHTML = S(svg); li.appendChild(t); var d = el("div"); d.appendChild(el("span", "", label)); d.appendChild(el("b", "", value)); if (sub) d.appendChild(el("small", "", sub)); li.appendChild(d); return li; }
    function draw(first) {
      var items = Q.items, late = items.filter(function (x) { return x.hours > Q.limitHours; }), oldest = items.reduce(function (m, x) { return Math.max(m, x.hours); }, 0);
      dash.textContent = "";
      var hello = el("div", "c-hello c-slide"); hello.style.setProperty("--i", 0); var hd = el("div"); var hr = new Date().getHours();
      hd.appendChild(el("h1", "", (hr < 12 ? "Good morning, " : hr < 18 ? "Good afternoon, " : "Good evening, ") + String(Q.name || "").split(" ")[0]));
      hd.appendChild(el("p", "", (Q.title || "") + (ME && ME.user && ME.user.branch ? " · " + ME.user.branch + " branch" : "") + " · " + (items.length ? items.length + " thing" + (items.length > 1 ? "s" : "") + " waiting on you" : "nothing waiting on you")));
      hello.appendChild(hd); dash.appendChild(hello);
      var stats = el("ul", "c-stats");
      stats.appendChild(stat("Waiting on you", String(items.length), "", "#9a2f24", IC["my queue"], 1));
      stats.appendChild(stat("Over " + Q.limitHours + " hours", String(late.length), "", "#c9821b", IC.clock, 2));
      stats.appendChild(stat("Oldest", items.length ? hrs(oldest) : "–", "", "#2c5e8a", IC.hourglass, 3));
      var ex = Q.extra || ["Unread notices", Q.unread]; stats.appendChild(stat(ex[0], String(ex[1] == null ? "–" : ex[1]), "", "#2f7a4f", IC.done, 4));
      dash.appendChild(stats);
      var panel = el("section", "c-panel c-slide"); panel.style.setProperty("--i", 5);
      var ph = el("div", "c-phead"); ph.appendChild(el("h2", "", "Waiting on you"));
      var fl = el("div", "c-filters"); fl.setAttribute("role", "group"); fl.setAttribute("aria-label", "Show");
      var kinds = [["all", "All", items.length]].concat(Object.keys(Q.kinds || {}).map(function (k) { return [k, Q.kinds[k], items.filter(function (x) { return x.kind === k; }).length]; }).filter(function (k) { return k[2]; }));
      kinds.forEach(function (k) { var b = el("button", "c-f", k[1]); b.type = "button"; b.setAttribute("aria-pressed", String(filter === k[0])); b.appendChild(el("em", "", String(k[2]))); b.addEventListener("click", function () { filter = k[0]; draw(false); }); fl.appendChild(b); });
      ph.appendChild(fl); panel.appendChild(ph);
      var show = items.filter(function (x) { return filter === "all" || x.kind === filter; }).sort(function (a, b) { return b.hours - a.hours; });
      if (!show.length) panel.appendChild(el("p", "c-empty", items.length ? "Nothing of this kind." : "All clear. Nothing is waiting on you right now."));
      else {
        var tb = el("table", "c-table"), th = el("thead"), tr = el("tr"); ["Borrower", "Loan", "What is needed", "Waiting", ""].forEach(function (h) { tr.appendChild(el("th", "", h)); }); th.appendChild(tr); tb.appendChild(th);
        var body = el("tbody");
        show.forEach(function (x, i) { var r = el("tr", "c-row"); r.style.setProperty("--i", i);
          var c1 = el("td", "c-td-who"), w = el("div", "c-who"), av = el("span", "c-av", initials(x.who)); av.style.setProperty("--g", GRAD[(x.who || "").length % GRAD.length]); window.CALMS_FACE(av, x.who); w.appendChild(av);
          var wn = el("div"); wn.appendChild(el("b", "", x.who)); wn.appendChild(el("small", "", x.ref)); w.appendChild(wn); c1.appendChild(w); r.appendChild(c1);
          var c2 = el("td", "c-loan c-td-loan"); c2.appendChild(el("b", "", peso(x.amt))); c2.appendChild(el("small", "", x.prod + (x.term ? " · " + x.term : ""))); r.appendChild(c2);
          var c3 = el("td", "c-need"), pill = el("span", "c-pill", x.stamp); pill.style.setProperty("--t", TONE[x.tone] || TONE.ink); c3.appendChild(pill); if (x.why) c3.appendChild(el("small", "", x.why)); r.appendChild(c3);
          var c4 = el("td"), wt = el("span", "c-wait" + (x.hours > Q.limitHours ? " late" : ""), hrs(x.hours)); c4.appendChild(wt); r.appendChild(c4);
          var c5 = el("td"), go = el("a", "c-go", x.act || "Open"); go.href = String(x.page || "").replace(/^([a-z-]+)(\?|$)/, "$1.html$2"); c5.appendChild(go); r.appendChild(c5);
          body.appendChild(r); });
        tb.appendChild(body); panel.appendChild(tb);
      }
      dash.appendChild(panel);
      if (!first) [].forEach.call(dash.querySelectorAll(".c-slide, .c-row"), function (e) { e.style.animation = "none"; });   /* a filter click redraws without sliding everything in again */
    }
    function load(first) { return CALMS.api("GET", "/api/queue").then(function (d) { Q = d; draw(first); }, function (err) { if (err && err.status === 401) return; dash.textContent = ""; dash.appendChild(el("p", "c-empty", "Your queue could not be loaded. " + ((err && err.message) || ""))); }); }
    CALMS.api("GET", "/api/me").then(function (d) { ME = d; if (Q) draw(false); }, function () {});
    load(true);
    setInterval(function () { if (!document.hidden) load(false); }, 120000);
    /* a quick way to start new work, for those who may: once the sidebar shows "New application" */
    function fab() { if (document.querySelector(".c-fab") || !nav || ![].some.call(nav.querySelectorAll(".plate"), function (p) { return /new application/i.test(p.textContent); })) return;
      var f = el("a", "c-fab"); f.href = "new-application.html"; f.setAttribute("aria-label", "New application"); f.title = "New application"; f.innerHTML = S('<path d="M12 5v14M5 12h14"/>'); document.body.appendChild(f); }
    fab(); if (nav && window.MutationObserver) new MutationObserver(fab).observe(nav, { childList: true, subtree: true });
  });
})();
