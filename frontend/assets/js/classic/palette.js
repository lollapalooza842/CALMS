/* Quick search for the classic look: Ctrl+K (⌘K on a Mac), or "/" when not typing, opens one box from anywhere.
   Type a borrower's name, an application or loan number, a mobile number, a page, or an action, and Enter goes there.
   - Pages and actions come from this person's own sidebar, so nobody is shown a door they cannot open.
   - Borrowers, applications, loan accounts (and, for the administrator, people with an account) come from
     /api/search, which applies the same rules as the pages. Offline, the copies kept on this computer are searched.
   - With the box empty: the last few things opened from it, then every page.
   Keys: ↑ ↓ move, Enter opens, Ctrl+Enter opens in a new tab, Esc closes. */
(function () {
  if (document.documentElement.getAttribute("data-ui") !== "classic") return;
  var IC = window.CALMS_IC || {}, MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  function S(d) { return '<svg class="c-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (d || "") + "</svg>"; }
  function el(t, c, txt) { var e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; }
  function peso(n) { return "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 }); }
  function initials(n) { return String(n || "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "·"; }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
  function sfx(n) { if (window.CALMS_SFX) CALMS_SFX.play(n); }

  /* ---- what can be found without asking the server ---- */
  function pages() {
    var seen = {}, out = [];
    [].forEach.call(document.querySelectorAll("#nav a[href], #tabmore a.row[href]"), function (a) {
      var p = a.querySelector(".plate"), label = (p ? ((p.firstChild && p.firstChild.nodeValue) || p.textContent) : (a.getAttribute("aria-label") || a.textContent)) || "";
      label = label.replace(/\s*\d+\s*$/, "").replace(/\s+/g, " ").trim(); var href = a.getAttribute("href");
      if (!label || !href || seen[label.toLowerCase()]) return; seen[label.toLowerCase()] = 1;
      var ic = a.querySelector("svg.c-ic"), here = a.getAttribute("aria-current") === "page" || a.classList.contains("on") || a.classList.contains("here");
      out.push({ kind: "page", title: label, sub: here ? "You are here" : "", href: href, svg: ic ? ic.outerHTML : S(IC.next), out: /sign out/i.test(label) });
    });
    return out;
  }
  function actions() {
    var out = [], chip = document.querySelector(".c-sfx");
    if (chip && window.CALMS_SFX) out.push({ kind: "action", title: CALMS_SFX.isOn() ? "Turn sounds off" : "Turn sounds on", sub: "Clicks, hovers and alert chimes", words: "sound sfx mute audio", svg: chip.querySelector("svg").outerHTML, run: function () { chip.click(); } });
    out.push({ kind: "action", title: "Reload this page", sub: "Fetch everything fresh", words: "refresh", svg: S(IC.refresh), run: function () { location.reload(); } });
    return out;
  }
  /* page and action names: whole words first, then letters in order ("nap" finds "New application") */
  function score(item, q) {
    var t = norm(item.title + " " + (item.words || "")), i = t.indexOf(q);
    if (i === 0) return 0; if (i > 0) return /\s/.test(t.charAt(i - 1)) ? 1 : 2;
    var k = 0; for (var j = 0; j < t.length && k < q.length; j++) if (t.charAt(j) === q.charAt(k)) k++;
    return k === q.length && q.length >= 2 ? 3 : -1;
  }
  function filterLocal(list, q) { return list.map(function (x) { return [score(x, q), x]; }).filter(function (p) { return p[0] >= 0; }).sort(function (a, b) { return a[0] - b[0]; }).map(function (p) { return p[1]; }); }

  /* ---- what was opened from here before (this computer, this person) ---- */
  function rkey() { var u = ""; try { u = localStorage.getItem("calms-uid") || ""; } catch (e) {} return "calms-recent|" + u; }
  function recent() { try { return JSON.parse(localStorage.getItem(rkey()) || "[]").slice(0, 5); } catch (e) { return []; } }
  function remember(x) { if (!x.href || x.kind === "action" || x.out) return;
    var keep = { kind: x.kind, title: x.title, sub: x.sub, href: x.href, svg: x.kind === "page" ? x.svg : "", face: x.face || "", pill: x.pill || null };
    try { var list = recent().filter(function (r) { return r.href !== keep.href; }); list.unshift(keep); localStorage.setItem(rkey(), JSON.stringify(list.slice(0, 5))); } catch (e) {} }

  /* ---- records: the server, or the copies on this computer when offline ---- */
  function fromServer(q) {
    /* a connection that hangs instead of failing: after 4 seconds, the copies on this computer instead */
    var ctl = window.AbortController ? new AbortController() : null, t = ctl ? setTimeout(function () { ctl.abort(); }, 4000) : 0;
    return fetch("/api/search?q=" + encodeURIComponent(q), { credentials: "same-origin", headers: { Accept: "application/json" }, signal: ctl ? ctl.signal : undefined }).then(function (r) { clearTimeout(t);
      if (r.status === 401) { var e = new Error("signed out"); e.status = 401; throw e; }
      if (!r.ok) throw new Error("search failed"); return r.json(); });
  }
  function fromCopies(q) {
    var N = window.CALMS_NET; if (!N || !N.peek) return Promise.resolve({ applications: [], accounts: [], people: [], offline: true });
    var has = function (s) { return norm(s).indexOf(q) >= 0; };
    return Promise.all([N.peek("/api/applications"), N.peek("/api/loan-accounts"), N.peek("/api/users")]).then(function (c) {
      return { offline: true,
        applications: ((c[0] || {}).applications || []).filter(function (a) { return has(a.borrower) || has(a.reference); }).slice(0, 6)
          .map(function (a) { return { ref: a.reference, name: a.borrower, product: a.product, amount: a.amount, statusName: "", tone: "grey" }; }),
        accounts: ((c[1] || {}).accounts || []).filter(function (a) { return has(a.borrower) || has(a.number) || has(a.reference); }).slice(0, 6)
          .map(function (a) { return { no: a.number, name: a.borrower, product: a.product, principal: a.principal }; }),
        people: ((c[2] || {}).users || []).filter(function (u) { return has(u.name) || has(u.username); }).slice(0, 6)
          .map(function (u) { return { username: u.username, name: u.name, roleName: u.roleName }; }) }; });
  }
  function records(d) {
    var out = [];
    (d.applications || []).forEach(function (a) { out.push({ kind: "application", group: "Applications", title: a.name, sub: a.ref + " · " + a.product + " · " + peso(a.amount), face: a.name, href: "application-detail.html?ref=" + encodeURIComponent(a.ref), pill: a.statusName ? [a.statusName, a.tone] : null }); });
    (d.accounts || []).forEach(function (a) { out.push({ kind: "account", group: "Loan accounts", title: a.name, sub: a.no + " · " + a.product + " · " + peso(a.principal), face: a.name, href: "loan-account.html?no=" + encodeURIComponent(a.no), pill: a.closed ? ["Closed", "grey"] : null }); });
    (d.people || []).forEach(function (u) { out.push({ kind: "person", group: "People with an account", title: u.name, sub: u.username + " · " + u.roleName, face: u.name, href: "users-roles.html?u=" + encodeURIComponent(u.username), pill: u.off ? ["Deactivated", "grey"] : null }); });
    return out;
  }

  /* ---- the box ---- */
  var back = null, input, list, foot, items = [], at = 0, seq = 0, timer = 0, lastFocus = null, lastMove = 0;
  function build() {
    back = el("div", "ck-palback"); back.hidden = true;
    var box = el("div", "ck-pal"); box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Quick search");
    var row = el("label", "ck-palin"); row.insertAdjacentHTML("afterbegin", S(IC.search));
    input = el("input"); input.type = "text"; input.placeholder = "Search borrowers, loan numbers, pages…"; input.autocomplete = "off"; input.spellcheck = false;
    input.setAttribute("role", "combobox"); input.setAttribute("aria-expanded", "true"); input.setAttribute("aria-controls", "ckPalList"); input.setAttribute("aria-autocomplete", "list");
    var esc = el("kbd", "ck-palesc", "Esc"); esc.addEventListener("click", close);
    row.appendChild(input); row.appendChild(esc);
    list = el("div", "ck-pallist"); list.id = "ckPalList"; list.setAttribute("role", "listbox"); list.setAttribute("aria-label", "Results");
    foot = el("div", "ck-palfoot"); foot.innerHTML = "<span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>" + (MAC ? "⌘" : "Ctrl") + "</kbd><kbd>K</kbd> from anywhere</span>";
    box.appendChild(row); box.appendChild(list); box.appendChild(foot); back.appendChild(box); document.body.appendChild(back);
    back.addEventListener("mousedown", function (e) { if (e.target === back) close(); });
    input.addEventListener("input", function () { clearTimeout(timer); var q = input.value; draw(q, null); if (norm(q.trim()).length >= 2) { list.setAttribute("aria-busy", "true"); timer = setTimeout(function () { ask(q); }, 140); } });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); move(e.key === "ArrowDown" ? 1 : -1); }
      else if (e.key === "Enter") { e.preventDefault(); if (e.isComposing) return; go(items[at], e.ctrlKey || e.metaKey); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { e.preventDefault(); move(e.shiftKey ? -1 : 1); }
      else if (e.key === "Home" && items.length && !input.value) { e.preventDefault(); set(0); }
    });
  }
  function open() {
    if (!back) build(); if (!back.hidden) { input.select(); return; }
    lastFocus = document.activeElement; back.hidden = false; back.classList.remove("out"); document.documentElement.classList.add("ck-palopen");
    input.value = ""; draw("", null); input.focus(); sfx("pop");
  }
  function close() {
    if (!back || back.hidden || back.classList.contains("out")) return; clearTimeout(timer); seq++;
    back.classList.add("out"); document.documentElement.classList.remove("ck-palopen");
    setTimeout(function () { back.hidden = true; back.classList.remove("out"); }, 160);
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) try { lastFocus.focus({ preventScroll: true }); } catch (e) {}
  }
  function ask(q) {
    var my = ++seq, nq = norm(q.trim()), N = window.CALMS_NET, down = N && N.isDown && N.isDown();
    (down ? fromCopies(nq) : fromServer(q.trim()).catch(function (e) { if (e.status === 401) throw e; return fromCopies(nq); }))
      .then(function (d) { if (my !== seq) return; list.removeAttribute("aria-busy"); draw(q, d); },
            function () { if (my !== seq) return; list.removeAttribute("aria-busy"); draw(q, { applications: [], accounts: [], people: [], failed: true }); });
  }

  function mark(text, q) {   /* the typed letters, highlighted where they appear in the name */
    var span = el("span"), t = String(text || ""), i = q ? norm(t).indexOf(q) : -1;
    if (i < 0) { span.textContent = t; return span; }
    span.appendChild(document.createTextNode(t.slice(0, i))); span.appendChild(el("mark", "", t.slice(i, i + q.length))); span.appendChild(document.createTextNode(t.slice(i + q.length))); return span;
  }
  function draw(raw, d) {
    var q = norm((raw || "").trim()), groups = [];
    if (!q) {
      var r = recent(); if (r.length) groups.push(["Recent", r]);
      groups.push(["Pages", pages()]);
    } else {
      var pg = filterLocal(pages(), q), ac = filterLocal(actions(), q);
      var rec = d ? records(d) : [], by = {};
      rec.forEach(function (x) { (by[x.group] = by[x.group] || []).push(x); });
      /* a name or number typed: the records lead; a word that names a page: the page leads */
      var pagesFirst = pg.length && score(pg[0], q) <= 1;
      if (pagesFirst) { groups.push(["Pages", pg.slice(0, 5)]); }
      ["Applications", "Loan accounts", "People with an account"].forEach(function (g) { if (by[g]) groups.push([g, by[g]]); });
      if (!pagesFirst && pg.length) groups.push(["Pages", pg.slice(0, 5)]);
      if (ac.length) groups.push(["Actions", ac]);
    }
    list.textContent = ""; items = []; var n = 0;
    groups.forEach(function (g) { if (!g[1].length) return;
      var sec = el("div", "ck-palgroup"); sec.setAttribute("role", "group"); var hd = el("div", "ck-palhead", g[0]); hd.id = "ckPalG" + n; sec.setAttribute("aria-labelledby", hd.id); sec.appendChild(hd);
      g[1].forEach(function (x) { var idx = items.length; items.push(x);
        var a = el(x.href ? "a" : "button", "ck-palitem"); a.id = "ckPalI" + idx; a.setAttribute("role", "option"); a.tabIndex = -1; if (x.href) a.href = x.href; else a.type = "button";
        var lead;
        if (x.face) { lead = el("span", "ck-palav", initials(x.face)); if (window.CALMS_FACE) CALMS_FACE(lead, x.face); }
        else { lead = el("span", "ck-palic"); lead.innerHTML = x.svg || S(IC.next); }
        a.appendChild(lead);
        var mid = el("span", "ck-palmid"), b = el("b"); b.appendChild(mark(x.title, q)); mid.appendChild(b); if (x.sub) { var sm = mark(x.sub, q.length >= 3 ? q : ""); sm.className = "ck-palsub"; mid.appendChild(sm); }
        a.appendChild(mid);
        if (x.pill) a.appendChild(el("span", "ck-pill t-" + (x.pill[1] || "grey"), x.pill[0]));
        var ret = el("span", "ck-palret"); ret.innerHTML = S('<path d="M19 6v5a3 3 0 0 1-3 3H6M9.5 10.5 6 14l3.5 3.5"/>'); a.appendChild(ret);
        a.addEventListener("click", function (e) { if (e.ctrlKey || e.metaKey || e.shiftKey || e.button) { remember(x); return; } e.preventDefault(); go(x, false); });
        a.addEventListener("mousemove", function () { if (at !== idx) set(idx, true); });
        sec.appendChild(a); });
      list.appendChild(sec); n++; });
    var busy = q.length >= 2 && !d;
    if (busy) { var s = el("div", "ck-palnote ck-palbusy"); s.appendChild(el("i")); s.appendChild(document.createTextNode("Looking through borrowers and loans…")); list.appendChild(s); }
    if (d && d.offline && q.length >= 2) list.appendChild(el("div", "ck-palnote", "Offline: searching only what this computer has opened before."));
    if (d && d.failed) list.appendChild(el("div", "ck-palnote", "Borrowers and loans could not be searched just now."));
    if (!items.length && !busy) { var none = el("div", "ck-palempty"); none.innerHTML = S(IC.search); none.appendChild(el("b", "", "Nothing matches “" + raw.trim() + "”")); none.appendChild(el("small", "", "Try a surname, an application or loan number, or the last digits of a mobile number.")); list.appendChild(none); }
    set(0, true);
  }
  function set(i, quiet) {
    if (!items.length) { input.removeAttribute("aria-activedescendant"); return; }
    at = (i + items.length) % items.length;
    [].forEach.call(list.querySelectorAll(".ck-palitem.on"), function (e) { e.classList.remove("on"); e.setAttribute("aria-selected", "false"); });
    var e = document.getElementById("ckPalI" + at); if (!e) return; e.classList.add("on"); e.setAttribute("aria-selected", "true"); input.setAttribute("aria-activedescendant", e.id);
    if (!quiet) { e.scrollIntoView({ block: "nearest" }); var t = performance.now(); if (t - lastMove > 45) { sfx("hover"); lastMove = t; } }
  }
  function move(step) { set(at + step); }
  function go(x, newTab) {
    if (!x) return; remember(x);
    if (x.run) { close(); setTimeout(x.run, 60); return; }
    if (newTab) { window.open(x.href, "_blank"); return; }
    sfx("press"); close(); var u = new URL(x.href, location.href);
    if (u.href === location.href) return;
    if (window.CK && CK.leave && !document.startViewTransition) CK.leave(u.href); else location.href = u.href;
  }

  /* ---- ways in: the keys, and a chip in the top bar ---- */
  function typing(t) { return t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)); }
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.key === "k" || e.key === "K")) { e.preventDefault(); if (back && !back.hidden) close(); else open(); return; }
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !typing(e.target) && !document.querySelector(".ck-modalback")) { e.preventDefault(); open(); }
  }, true);
  function chip() {
    var right = document.querySelector(".c-top .c-right"); if (!right) return false; if (right.querySelector(".c-find")) return true;
    var b = el("button", "c-chip c-find"); b.type = "button"; b.setAttribute("aria-label", "Quick search (" + (MAC ? "⌘K" : "Ctrl+K") + ")"); b.setAttribute("aria-keyshortcuts", MAC ? "Meta+K" : "Control+K");
    b.innerHTML = S(IC.search) + '<span class="c-findtx">Search</span><span class="c-findk"><kbd>' + (MAC ? "⌘" : "Ctrl") + "</kbd><kbd>K</kbd></span>";
    b.addEventListener("click", open); right.insertBefore(b, right.firstChild); return true;
  }
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  ready(function () { if (!chip() && window.MutationObserver) { var mo = new MutationObserver(function () { if (chip()) mo.disconnect(); }); mo.observe(document.body, { childList: true, subtree: true }); } });
  window.CALMS_FIND = { open: open, close: close };
})();
