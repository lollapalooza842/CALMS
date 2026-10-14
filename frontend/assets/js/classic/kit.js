/* The classic look's toolkit (CK): the pieces every rebuilt page is made of. Each page in assets/js/classic/<page>.js
   draws itself into a <section class="c-view"> with these, from the same API the western page uses; the western page
   stays loaded underneath, hidden, so nothing about the rules or the audit log changes. Styles: classic-ui.css. */
(function () {
  var CK = window.CK = {};
  /* ---- making elements: h("div.card#id", {attrs}, child, "text", [children]) ---- */
  function h(sel, attrs) {
    var m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(sel || "div") || [], el = document.createElement(m[1] || "div");
    (m[2] || "").replace(/([.#])([\w-]+)/g, function (_, t, v) { if (t === ".") el.classList.add(v); else el.id = v; });
    var kids = [].slice.call(arguments, 2);
    if (attrs && (typeof attrs !== "object" || attrs.nodeType || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) Object.keys(attrs).forEach(function (k) { var v = attrs[k]; if (v == null || v === false) return;
      if (k === "on") Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
      else if (k === "style" && typeof v === "object") Object.keys(v).forEach(function (s) { if (s.indexOf("--") === 0) el.style.setProperty(s, v[s]); else el.style[s] = v[s]; });
      else if (k === "html") el.innerHTML = v; else if (k === "text") el.textContent = v;
      else if (k in el && k !== "list" && k !== "form" && typeof v !== "string") el[k] = v; else el.setAttribute(k, v === true ? "" : v); });
    (function add(list) { list.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) add(c); else el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); }); })(kids);
    return el;
  }
  CK.h = h;
  CK.api = function (m, p, b, o) { return window.CALMS ? CALMS.api(m, p, b, o) : Promise.reject(new Error("Offline")); };
  CK.q = function (k) { return new URLSearchParams(location.search).get(k) || ""; };
  CK.go = function (href) { CK.leave(href); };

  /* ---- words and numbers ---- */
  CK.peso = function (n, cents) { if (n == null || n === "") return "–"; return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); };
  CK.num = function (n, d) { return n == null ? "–" : Number(n).toLocaleString("en-PH", { maximumFractionDigits: d == null ? 0 : d }); };
  CK.pct = function (n, d) { return n == null ? "–" : Number(n).toFixed(d == null ? 1 : d) + "%"; };
  function D(x) { return x instanceof Date ? x : new Date(/^\d{4}-\d\d-\d\d$/.test(x) ? x + "T00:00:00" : x); }
  CK.date = function (x) { if (!x) return "–"; return D(x).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }); };
  CK.dt = function (x) { if (!x) return "–"; var d = D(x); return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }); };
  CK.ago = function (x) { if (!x) return "–"; var s = (Date.now() - D(x)) / 1000; if (s < 60) return "just now"; if (s < 3600) return Math.floor(s / 60) + " min ago"; if (s < 86400) return Math.floor(s / 3600) + " h ago"; if (s < 86400 * 30) return Math.floor(s / 86400) + " d ago"; return CK.date(x); };
  CK.span = function (h) { if (h == null) return "–"; return h >= 48 ? Math.floor(h / 24) + " days" : h >= 1 ? Math.floor(h) + " h" : Math.max(1, Math.round(h * 60)) + " min"; };
  CK.since = function (x) { return CK.span((Date.now() - D(x)) / 36e5); };
  CK.initials = function (n) { return String(n || "").replace(/^Ladder\s+/, "").split(/\s+/).filter(Boolean).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join("") || "·"; };
  var GR = ["#c9821b,#9a2f24", "#2c5e8a,#1f3f5e", "#2f7a4f,#1f5537", "#8a5a9a,#5a3a6b", "#b26a10,#7a4808", "#3d6b73,#24464c"];
  CK.av = function (name, size) { return window.CALMS_FACE ? CALMS_FACE(av0(name, size), String(name || "").replace(/^Ladder\s+/, "")) : av0(name, size); };
  function av0(name, size) { var s = String(name || ""), k = 0; for (var i = 0; i < s.length; i++) k += s.charCodeAt(i); return h("span.ck-av", { style: { background: "linear-gradient(140deg," + GR[k % GR.length] + ")", width: size ? size + "px" : null, height: size ? size + "px" : null } }, CK.initials(s)); }

  /* the stages an application passes through */
  CK.ST = { draft: ["Draft", "grey"], submitted: ["Submitted", "blue"], review: ["Under review", "amber"], approved: ["Approved", "green"], awaiting: ["Awaiting borrower", "violet"],
    accepted: ["Accepted", "teal"], declined: ["Declined by borrower", "red"], funded: ["Funded", "green"], rejected: ["Rejected", "red"] };
  CK.FLOW = ["draft", "submitted", "review", "approved", "awaiting", "accepted", "funded"];
  CK.NEXT = { draft: ["Finish the papers", "documents"], submitted: ["Encode and verify", "encode-verify"], review: ["Assess the credit", "credit-assessment"], approved: ["Loan agreement", "loan-agreement"],
    awaiting: ["Record her answer", "record-answer"], accepted: ["Release the loan", "release-loan"], declined: ["Counter-offers", "counter-offers"], funded: ["View", "application-detail"], rejected: ["View", "application-detail"] };
  CK.pill = function (text, tone) { return h("span.ck-pill.t-" + (tone || "grey"), text); };
  CK.status = function (s) { var x = CK.ST[s] || [s, "grey"]; return CK.pill(x[0], x[1]); };

  /* ---- icons (line, 24px grid) ---- */
  var IC = window.CALMS_IC || {};   /* the CALMS icons (look.js) */

  CK.ic = function (n, cls) { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ck-ic" + (cls ? " " + cls : "")); s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.7"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.innerHTML = IC[n] || ""; return s; };

  /* ---- controls ---- */
  CK.btn = function (label, opt) { opt = opt || {}; var b = h((opt.href ? "a" : "button") + ".ck-btn" + (opt.kind ? ".ck-" + opt.kind : ""), { type: opt.href ? null : "button", href: opt.href || null, title: opt.title || null, "aria-label": opt.aria || null, on: opt.on ? { click: opt.on } : null, disabled: !!opt.disabled }, opt.icon ? CK.ic(opt.icon) : null, label ? h("span", label) : null); return b; };
  CK.busy = function (b, on, text) { if (!b) return; if (on) { b.dataset.was = b.textContent; b.disabled = true; b.classList.add("is-busy"); if (text) b.querySelector("span") && (b.querySelector("span").textContent = text); } else { b.disabled = false; b.classList.remove("is-busy"); if (b.dataset.was && b.querySelector("span")) b.querySelector("span").textContent = b.dataset.was; } };
  CK.field = function (label, input, opt) { opt = opt || {}; if (opt.hint) opt.hint = rule(opt.hint); var id = input.id || ("f" + Math.random().toString(36).slice(2, 8)); input.id = id;
    var err = h("p.ck-err", { role: "alert" }); var f = h("div.ck-field" + (opt.wide ? ".wide" : ""), h("label", { "for": id }, label, opt.req ? h("b", " *") : null), input, opt.hint ? h("p.ck-hint", opt.hint) : null, err);
    f.setError = function (t) { err.textContent = t || ""; input.setAttribute("aria-invalid", t ? "true" : "false"); }; return f; };
  CK.input = function (opt) { opt = opt || {}; return h("input.ck-input", { type: opt.type || "text", value: opt.value == null ? "" : opt.value, placeholder: opt.ph || null, inputmode: opt.mode || null, autocomplete: opt.ac || "off", maxlength: opt.max || null, min: opt.min, max: opt.maxv, step: opt.step }); };
  CK.select = function (options, value) { var s = h("select.ck-input"); options.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; var op = h("option", { value: v }, t); if (String(v) === String(value)) op.selected = true; s.appendChild(op); }); return s; };
  CK.textarea = function (value, ph) { return h("textarea.ck-input", { placeholder: ph || null, rows: 3 }, value || ""); };
  CK.check = function (label, on, opt) { var i = h("input", { type: "checkbox" }); i.checked = !!on; if (opt && opt.disabled) i.disabled = true; return h("label.ck-check", i, h("span", label)); };
  CK.seg = function (opts, value, onChange) { var g = h("div.ck-seg", { role: "group" }); opts.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o, n = Array.isArray(o) ? o[2] : null;
      var b = h("button", { type: "button", "aria-pressed": String(v === value), on: { click: function () { [].forEach.call(g.children, function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); onChange(v); } } }, t, n != null ? h("em", String(n)) : null); g.appendChild(b); });
    thumb(g); return g; };
  /* a white thumb that glides to the chosen button (classic-ui.css .ck-thumb); follows clicks, size changes and re-draws */
  function thumb(g) {
    if (!window.ResizeObserver) return; var t = h("i.ck-thumb", { "aria-hidden": "true" }); g.classList.add("has-thumb"); g.appendChild(t);   /* last, so pages that count the buttons by position still line up */
    function place(jump) { var b = g.querySelector('button[aria-pressed="true"]'); if (!b || !g.isConnected) { t.style.opacity = 0; return; } t.style.opacity = 1;
      if (jump) t.style.transition = "none"; t.style.width = b.offsetWidth + "px"; t.style.height = b.offsetHeight + "px"; t.style.transform = "translate(" + b.offsetLeft + "px," + b.offsetTop + "px)";
      if (jump) { t.offsetWidth; t.style.transition = ""; } }
    var first = true; new ResizeObserver(function () { place(first); first = false; }).observe(g);
    g.addEventListener("click", function () { place(false); });
    if (window.MutationObserver) new MutationObserver(function () { place(false); }).observe(g, { attributes: true, subtree: true, attributeFilter: ["aria-pressed"] }); }
  CK.tabs = function (opts, value, onChange) { var t = CK.seg(opts, value, onChange); t.className = "ck-tabs has-thumb"; t.setAttribute("role", "tablist"); return t; };
  CK.search = function (ph, onInput) { var i = h("input.ck-input", { type: "search", placeholder: ph || "Search" }); i.addEventListener("input", function () { onInput(i.value.trim().toLowerCase()); }); return h("div.ck-search", CK.ic("search"), i); };

  /* ---- layout ---- */
  /* No guide text: a subtitle that only explains the page (a sentence, not facts like "name · product · amount") is left
     out, and so is a field hint that does not state a rule (a length, a format, a limit). People know their work. */
  function guide(t) { return typeof t === "string" && /\.\s|\.$/.test(t.trim()) && t.indexOf("·") < 0; }
  function rule(t) { if (typeof t !== "string") return t; var first = t.split(/(?<=\.)\s/)[0]; return /\d|at least|digits|characters|exactly|PDF|MB/i.test(first) ? first : null; }
  CK.guide = guide;
  CK.head = function (o) { /* {crumbs:[[label,href]], title, sub, actions:[], status} */
    if (guide(o.sub)) o.sub = null;
    return h("header.ck-head.ck-in",
      o.crumbs ? h("nav.ck-crumbs", { "aria-label": "Breadcrumb" }, o.crumbs.map(function (c, i) { return [i ? h("span.sep", "/") : null, c[1] ? h("a", { href: c[1] }, c[0]) : h("span", c[0])]; })) : null,
      h("div.ck-headrow", h("div", h("h1", o.title, o.status || null), o.sub ? h("p.ck-sub", o.sub) : null), o.actions ? h("div.ck-actions", o.actions) : null)); };
  CK.card = function (title, body, opt) { opt = opt || {}; return h("section.ck-card.ck-in" + (opt.cls ? "." + opt.cls : ""), title || opt.tools ? h("div.ck-cardhead", title ? h("h2", opt.icon ? CK.ic(opt.icon) : null, title) : h("span"), opt.tools || null) : null, h("div.ck-cardbody" + (opt.flush ? ".flush" : ""), body)); };
  CK.grid = function (cols, kids, cls) { return h("div.ck-grid" + (cls ? "." + cls : ""), { style: { "--cols": cols } }, kids); };
  /* figures count up from zero as their card rises in (keeps the formatting: peso sign, commas, %, decimals, "days") */
  var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  CK.countUp = function (el, delay) {
    var txt = el.textContent, m = /^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/.exec(txt); if (REDUCE || !m || /\d/.test(m[3]) || /\d/.test(m[1])) return;   /* one figure only (not a date) */
    var raw = m[2].replace(/,/g, ""), to = parseFloat(raw), dec = (raw.split(".")[1] || "").length, comma = m[2].indexOf(",") >= 0; if (!isFinite(to) || to === 0) return;
    var fmt = function (v) { var s2 = v.toFixed(dec); if (comma) { var p = s2.split("."); p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","); s2 = p.join("."); } return m[1] + s2 + m[3]; };
    el.textContent = fmt(0); var t0 = null, D = 900;
    setTimeout(function () { requestAnimationFrame(function step(t) { if (t0 === null) t0 = t; var k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); el.textContent = k < 1 ? fmt(to * e) : txt; if (k < 1) requestAnimationFrame(step); }); }, delay || 0); };
  CK.stat = function (label, value, opt) { opt = opt || {}; return statFig(h("div.ck-stat.ck-in" + (opt.tone ? ".t-" + opt.tone : "") + (opt.on ? ".is-click" : ""), { on: opt.on ? { click: opt.on } : null, role: opt.on ? "button" : null, tabindex: opt.on ? 0 : null },
      h("span.ck-tile", CK.ic(opt.icon || "chart")), h("div", h("span.lbl", label), h("b", value), opt.sub ? h("small", opt.sub) : null))); };
  function statFig(card) { var b = card.querySelector("b"); if (b && typeof b.firstChild === "object" && b.childNodes.length === 1 && b.firstChild.nodeType === 3) setTimeout(function () { var i = +(card.style.getPropertyValue("--i") || 0); CK.countUp(b, i * 55 + 120); }, 0); return card; }
  CK.dl = function (rows, cls) { return h("dl.ck-dl" + (cls ? "." + cls : ""), rows.filter(Boolean).map(function (r) { return h("div", h("dt", r[0]), h("dd", r[1] == null || r[1] === "" ? "–" : r[1])); })); };
  CK.empty = function (title, text, icon) { return h("div.ck-empty", h("span.ck-emptyic", CK.ic(icon || "check")), h("b", title)); };   /* the title says it; no explaining line */
  CK.note = function (text, tone, icon) { return h("div.ck-note.t-" + (tone || "blue"), CK.ic(icon || (tone === "red" ? "alert" : "info")), h("div", text)); };
  CK.skel = function (n) { var w = h("div.ck-skel"); for (var i = 0; i < (n || 4); i++) w.appendChild(h("i", { style: { width: (55 + Math.random() * 40) + "%" } })); return w; };
  CK.bar = function (parts) { return h("div.ck-bar", parts.filter(function (p) { return p[0] > 0; }).map(function (p) { return h("i", { style: { flexGrow: p[0], background: p[1] }, title: p[2] || null }); })); };
  CK.meter = function (v, max, tone) { return h("div.ck-meter.t-" + (tone || "brand"), h("i", { style: { width: Math.max(0, Math.min(100, v / max * 100)) + "%" } })); };

  /* table: cols [{k, label, w, align, sort:fn|true, render(row)}], rows; opt {key, onRow(row), empty, page} */
  CK.table = function (cols, rows, opt) {
    opt = opt || {}; var sortK = opt.sort || null, dir = opt.dir || 1, shown = opt.page || 50, filterFn = null;
    var wrap = h("div.ck-tablewrap"), tbl = h("table.ck-table"), thead = h("thead"), tbody = h("tbody"), more = h("div.ck-more");
    var tr = h("tr"); cols.forEach(function (c) { var th = h("th", { style: { width: c.w || null, textAlign: c.align || null } }, c.label || "");
      if (c.sort) { th.classList.add("sortable"); th.tabIndex = 0; th.addEventListener("click", function () { if (sortK === c.k) dir = -dir; else { sortK = c.k; dir = c.desc ? -1 : 1; } draw(true); }); }
      tr.appendChild(th); }); thead.appendChild(tr); tbl.appendChild(thead); tbl.appendChild(tbody); wrap.appendChild(tbl); wrap.appendChild(more);
    function val(r, c) { return typeof c.sort === "function" ? c.sort(r) : r[c.k]; }
    function draw(anim) {
      var list = rows.filter(function (r) { return !filterFn || filterFn(r); });
      if (sortK) { var c = cols.filter(function (x) { return x.k === sortK; })[0]; list = list.slice().sort(function (a, b) { var x = val(a, c), y = val(b, c); return (x > y ? 1 : x < y ? -1 : 0) * dir; }); }
      [].forEach.call(thead.querySelectorAll("th"), function (th, i) { th.removeAttribute("aria-sort"); if (cols[i].k === sortK) th.setAttribute("aria-sort", dir > 0 ? "ascending" : "descending"); });
      tbody.textContent = "";
      if (!list.length) { tbody.appendChild(h("tr.ck-emptyrow", h("td", { colSpan: cols.length }, opt.empty || "Nothing to show."))); more.textContent = ""; return; }
      list.slice(0, shown).forEach(function (r, i) { var row = h("tr" + (opt.onRow ? ".is-click" : ""), { style: anim ? { "--i": Math.min(i, 14) } : null });
        if (anim) row.classList.add("ck-rowin");
        if (opt.onRow) { row.tabIndex = 0; row.addEventListener("click", function (e) { if (e.target.closest("a, button, input, select")) return; opt.onRow(r, row); }); row.addEventListener("keydown", function (e) { if (e.key === "Enter") opt.onRow(r, row); }); }
        cols.forEach(function (c) { var td = h("td", { style: { textAlign: c.align || null }, "data-label": c.label || null }); var v = c.render ? c.render(r) : r[c.k]; if (v != null) td.appendChild(v.nodeType ? v : document.createTextNode(String(v))); row.appendChild(td); });
        tbody.appendChild(row); });
      more.textContent = ""; if (list.length > shown) more.appendChild(CK.btn("Show " + Math.min(opt.page || 50, list.length - shown) + " more (" + (list.length - shown) + " left)", { kind: "ghost", on: function () { shown += opt.page || 50; draw(false); } }));
    }
    wrap.filter = function (fn) { filterFn = fn; shown = opt.page || 50; draw(false); }; wrap.set = function (r) { rows = r; draw(false); }; wrap.redraw = draw;
    draw(true); return wrap;
  };

  /* ---- feedback ---- */
  var toasts = null;
  CK.toast = function (text, tone) { if (!toasts) { toasts = h("div.ck-toasts", { role: "status", "aria-live": "polite" }); document.body.appendChild(toasts); }
    var t = h("div.ck-toast.t-" + (tone || "green"), CK.ic(tone === "red" ? "alert" : tone === "blue" ? "info" : "check"), h("span", text)); toasts.appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 300); }, tone === "red" ? 6500 : 3800); };
  /* modal({title, body, actions:[[label, kind, fn(close, btn)]], wide}) */
  CK.modal = function (o) {
    var last = document.activeElement, back = h("div.ck-modalback"), box = h("div.ck-modal" + (o.wide ? ".wide" : ""), { role: "dialog", "aria-modal": "true", "aria-label": o.title });
    function close() { back.classList.add("out"); document.removeEventListener("keydown", key); setTimeout(function () { back.remove(); if (last && last.focus) last.focus(); }, 220); }
    function key(e) { if (e.key === "Escape") close(); }
    box.appendChild(h("div.ck-modalhead", h("h2", o.title), CK.btn("", { kind: "icon", icon: "x", aria: "Close", on: close })));
    box.appendChild(h("div.ck-modalbody", o.body)); var err = h("p.ck-err.ck-modalerr", { role: "alert" }); box.appendChild(err);
    if (o.actions) box.appendChild(h("div.ck-modalfoot", o.actions.map(function (a) { var b = CK.btn(a[0], { kind: a[1] || "ghost", on: function () { if (!a[2]) { close(); return; } err.textContent = ""; a[2](close, b, function (t) { err.textContent = t; }); } }); return b; })));
    back.appendChild(box); back.addEventListener("mousedown", function (e) { if (e.target === back) close(); }); document.body.appendChild(back); document.addEventListener("keydown", key);
    setTimeout(function () { var f = box.querySelector("input, select, textarea, .ck-primary"); if (f) f.focus(); }, 60); return { close: close, box: box, error: function (t) { err.textContent = t; } };
  };
  /* a decision that needs the authenticator code: returns the code (or "" when not needed) */
  CK.codeField = function () { var i = CK.input({ mode: "numeric", max: 6, ph: "6-digit code", ac: "one-time-code" }); i.classList.add("ck-code"); return CK.field("Code from your authenticator", i, { hint: "Your second step for this action. In practice mode the practice code works." }); };
  CK.fail = function (err, where) { if (err && err.status === 401) return; var t = (err && err.message) || "Something went wrong."; if (where && where.setError) where.setError(t); else if (typeof where === "function") where(t); else CK.toast(t, "red"); };

  /* ---- the page's own area: everything the western page drew is hidden; this draws in its place ---- */
  CK.view = function () { var v = document.querySelector(".c-view"); if (v) return v; var main = document.querySelector("main"), top = main.querySelector(".c-top");
    v = h("section.c-view"); if (top) top.after(v); else main.prepend(v); document.documentElement.classList.add("c-own"); return v; };
  CK.render = function (kids) { var v = CK.view(); v.textContent = ""; (Array.isArray(kids) ? kids : [kids]).forEach(function (k) { if (k) v.appendChild(k); }); CK.stagger(v); };
  CK.stagger = function (root) { var i = 0; [].forEach.call(root.querySelectorAll(".ck-in"), function (e) { if (e.dataset.in) return; e.dataset.in = 1; e.style.setProperty("--i", i++); }); };
  CK.loading = function () { CK.render([h("div.ck-head.ck-in", h("div.ck-skel.big", h("i", { style: { width: "34%" } }), h("i", { style: { width: "52%" } }))), CK.grid(3, [0, 1, 2].map(function () { return h("div.ck-card.ck-in", CK.skel(3)); })), h("div.ck-card.ck-in", CK.skel(6))]); };
  CK.error = function (err, back) { if (err && err.status === 401) return;
    if (err && err.offline) { CK.render([CK.head({ title: "You're offline" }), CK.card(null, [CK.note(err.message, "amber"), h("div.ck-actions", CK.btn("Try again", { kind: "ghost", icon: "refresh", on: function () { location.reload(); } }), back ? CK.btn("Back", { href: back, kind: "ghost" }) : null)])]);
      CK.view().setAttribute("data-offline-error", "1"); return; }   /* offline.js reloads the page by itself when the connection is back */
    CK.render([CK.head({ title: "This could not be opened" }), CK.card(null, [CK.note((err && err.message) || "CALMS could not be reached.", "red"), h("div.ck-actions", CK.btn("Try again", { kind: "primary", icon: "refresh", on: function () { location.reload(); } }), back ? CK.btn("Back", { href: back, kind: "ghost" }) : null)])]); };
  /* the page leaves smoothly: the view fades down before the next page loads */
  CK.leave = function (href) { document.documentElement.classList.add("c-leaving"); setTimeout(function () { location.href = href; }, 170); };
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a[href]"); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank" || a.hasAttribute("download")) return;
    var href = a.getAttribute("href"); if (!href || href.charAt(0) === "#" || /^(mailto|tel|javascript):/.test(href)) return; var u = new URL(href, location.href); if (u.origin !== location.origin || u.pathname.indexOf("/api/") === 0) return;
    if (document.startViewTransition) return;                                  /* the browser blends the pages itself (rail.css @view-transition) */
    e.preventDefault(); CK.leave(u.href); });
  window.addEventListener("pageshow", function () { document.documentElement.classList.remove("c-leaving"); });
})();
/* ---- shared by Loan account and Post a payment: the payment form with a live "where the money goes" ---- */
(function () {
  var h = CK.h;
  CK.today = function () { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  CK.paymentForm = function (acct, channels, done) {
    var amt = CK.input({ mode: "decimal", ph: "0.00", value: acct.next ? Number(acct.next.amount + (acct.penalty || 0)).toFixed(2) : "" }), date = CK.input({ type: "date", value: CK.today() }),
      chan = CK.select([["", "Choose…"]].concat((channels || ["Cash at the branch", "Bank deposit", "GCash", "Salary deduction", "Cheque"]).map(function (c) { return [c, c]; })), ""), ref = CK.input({ ph: "Deposit, GCash or cheque number" });
    var fA = CK.field("Amount received (₱)", amt, { req: true }), fD = CK.field("Date paid", date, { req: true }), fC = CK.field("How it came in", chan, { req: true }), fR = CK.field("Reference", ref, { hint: "Not needed for cash at the branch." });
    var where = h("div.ck-alloc"), btn = CK.btn("Post the payment", { kind: "primary", icon: "check" }), T = 0;
    function preview() { clearTimeout(T); where.textContent = ""; var v = amt.value.replace(/[^\d.]/g, ""); if (!(+v > 0)) return;
      T = setTimeout(function () { CK.api("GET", "/api/loan-accounts/" + acct.number + "/allocation?amount=" + v + "&paidOn=" + date.value).then(function (d) {
        var tot = { penalty: 0, interest: 0, principal: 0 }; d.allocation.forEach(function (x) { tot.penalty += x.penalty; tot.interest += x.interest; tot.principal += x.principal; });
        where.textContent = ""; where.appendChild(h("div.ck-sm", "Where the money goes: penalties first, then interest, then principal, oldest payment first."));
        where.appendChild(CK.bar([[tot.penalty, "#b3261a", "Penalty"], [tot.interest, "#c9821b", "Interest"], [tot.principal, "#2f7a4f", "Principal"]]));
        where.appendChild(h("div.ck-legend", [["Penalty", "#b3261a", tot.penalty], ["Interest", "#c9821b", tot.interest], ["Principal", "#2f7a4f", tot.principal]].map(function (x) { return h("span", h("i", { style: { background: x[1] } }), x[0] + " " + CK.peso(x[2], true)); })));
        where.appendChild(h("div.ck-sm", "Covers payment" + (d.allocation.length > 1 ? "s " : " ") + d.allocation.map(function (x) { return "no. " + x.n; }).join(", ") + "."));
        fA.setError(""); }, function (e) { if (e.offline) { where.textContent = ""; where.appendChild(h("div.ck-sm", "Offline: where the money goes (penalties, interest, principal) is worked out by the office's server when the payment is sent.")); return; } fA.setError(e.message); }); }, 300); }
    amt.addEventListener("input", preview); date.addEventListener("change", preview); preview();
    btn.addEventListener("click", function () { [fA, fD, fC, fR].forEach(function (f) { f.setError(""); });
      if (!(+amt.value.replace(/[^\d.]/g, "") > 0)) { fA.setError("Enter the amount received."); amt.focus(); return; } if (!chan.value) { fC.setError("Choose how the money came in."); return; }
      if (chan.value !== "Cash at the branch" && !ref.value.trim()) { fR.setError("Enter the deposit, GCash or cheque reference."); ref.focus(); return; }
      var money = amt.value.replace(/[^\d.]/g, "");
      CK.busy(btn, true); CK.api("POST", "/api/loan-accounts/" + acct.number + "/payments", { amount: money, paidOn: date.value, channel: chan.value, reference: ref.value.trim() },
        { offline: { kind: "pay", label: "Payment · " + acct.borrower, sub: acct.number + " · " + CK.peso(+money, true) + " · " + chan.value + (ref.value.trim() ? " " + ref.value.trim() : "") } }).then(function (r) { CK.busy(btn, false);
          if (r.queued) { r.receipt = r.temp + " (temporary)"; CK.toast("Saved on this computer. Temporary receipt " + r.temp + "; the official receipt number comes when it is sent.", "amber"); }   /* offline (offline.js) */
          done(r); },
        function (e) { CK.busy(btn, false); var m = { amt: fA, date: fD, chan: fC, ref: fR }[e.field || e.fields] || fA; m.setError(e.message); }); });
    return h("div.ck-stack.ck-payform", h("div.ck-form", fA, fD, fC, fR), where, h("div.ck-actions", btn));
  };
  CK.paper = function (path, btn, what) { CK.busy(btn, true); return CK.api("POST", path, {}).then(function (d) { CK.busy(btn, false); CALMS.printPaper(d); CK.toast(what + " " + (d.number || "") + " is ready. It is kept on record and logged."); return d; }, function (e) { CK.busy(btn, false); CK.fail(e); throw e; }); };
})();
