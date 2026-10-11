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
  CK.api = function (m, p, b) { return window.CALMS ? CALMS.api(m, p, b) : Promise.reject(new Error("Offline")); };
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
  CK.av = function (name, size) { var s = String(name || ""), k = 0; for (var i = 0; i < s.length; i++) k += s.charCodeAt(i); return h("span.ck-av", { style: { background: "linear-gradient(140deg," + GR[k % GR.length] + ")", width: size ? size + "px" : null, height: size ? size + "px" : null } }, CK.initials(s)); };

  /* the stages an application passes through */
  CK.ST = { draft: ["Draft", "grey"], submitted: ["Submitted", "blue"], review: ["Under review", "amber"], approved: ["Approved", "green"], awaiting: ["Awaiting borrower", "violet"],
    accepted: ["Accepted", "teal"], declined: ["Declined by borrower", "red"], funded: ["Funded", "green"], rejected: ["Rejected", "red"] };
  CK.FLOW = ["draft", "submitted", "review", "approved", "awaiting", "accepted", "funded"];
  CK.NEXT = { draft: ["Finish the papers", "documents"], submitted: ["Encode and verify", "encode-verify"], review: ["Assess the credit", "credit-assessment"], approved: ["Loan agreement", "loan-agreement"],
    awaiting: ["Record her answer", "record-answer"], accepted: ["Release the loan", "release-loan"], declined: ["Counter-offers", "counter-offers"], funded: ["View", "application-detail"], rejected: ["View", "application-detail"] };
  CK.pill = function (text, tone) { return h("span.ck-pill.t-" + (tone || "grey"), text); };
  CK.status = function (s) { var x = CK.ST[s] || [s, "grey"]; return CK.pill(x[0], x[1]); };

  /* ---- icons (line, 24px grid) ---- */
  var IC = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/>', plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 5l-7 7 7 7"/>', next: '<path d="M9 5l7 7-7 7"/>', down: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>', dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>', upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 18v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"/>', eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5v.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.7-3.4 3-5 6-5s5.3 1.6 6 5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c1.6.6 2.6 2.3 3 5"/>',
    peso: '<path d="M8 20V4h5a4.5 4.5 0 0 1 0 9H8M5 8h14M5 11h14"/>', bank: '<path d="M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>', shield: '<path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6z"/><path d="M9 12l2 2 4-4"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>', send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/>',
    chart: '<path d="M4 20h16M7 16v-4M12 16V8M17 16v-7"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>', refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>', cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>', wallet: '<path d="M4 7a2 2 0 0 1 2-2h11v4"/><rect x="4" y="9" width="16" height="11" rx="2"/><path d="M16 14.5h.01"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    server: '<rect x="4" y="4" width="16" height="7" rx="2"/><rect x="4" y="13" width="16" height="7" rx="2"/><path d="M8 7.5h.01M8 16.5h.01"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2 2M14 9l2 2"/>', stamp: '<path d="M9 4h6v6l3 4H6l3-4z"/><path d="M5 18h14v2H5z"/>'
  };
  CK.ic = function (n, cls) { var s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "ck-ic" + (cls ? " " + cls : "")); s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.8"); s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.innerHTML = IC[n] || ""; return s; };

  /* ---- controls ---- */
  CK.btn = function (label, opt) { opt = opt || {}; var b = h((opt.href ? "a" : "button") + ".ck-btn" + (opt.kind ? ".ck-" + opt.kind : ""), { type: opt.href ? null : "button", href: opt.href || null, title: opt.title || null, "aria-label": opt.aria || null, on: opt.on ? { click: opt.on } : null, disabled: !!opt.disabled }, opt.icon ? CK.ic(opt.icon) : null, label ? h("span", label) : null); return b; };
  CK.busy = function (b, on, text) { if (!b) return; if (on) { b.dataset.was = b.textContent; b.disabled = true; b.classList.add("is-busy"); if (text) b.querySelector("span") && (b.querySelector("span").textContent = text); } else { b.disabled = false; b.classList.remove("is-busy"); if (b.dataset.was && b.querySelector("span")) b.querySelector("span").textContent = b.dataset.was; } };
  CK.field = function (label, input, opt) { opt = opt || {}; var id = input.id || ("f" + Math.random().toString(36).slice(2, 8)); input.id = id;
    var err = h("p.ck-err", { role: "alert" }); var f = h("div.ck-field" + (opt.wide ? ".wide" : ""), h("label", { "for": id }, label, opt.req ? h("b", " *") : null), input, opt.hint ? h("p.ck-hint", opt.hint) : null, err);
    f.setError = function (t) { err.textContent = t || ""; input.setAttribute("aria-invalid", t ? "true" : "false"); }; return f; };
  CK.input = function (opt) { opt = opt || {}; return h("input.ck-input", { type: opt.type || "text", value: opt.value == null ? "" : opt.value, placeholder: opt.ph || null, inputmode: opt.mode || null, autocomplete: opt.ac || "off", maxlength: opt.max || null, min: opt.min, max: opt.maxv, step: opt.step }); };
  CK.select = function (options, value) { var s = h("select.ck-input"); options.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; var op = h("option", { value: v }, t); if (String(v) === String(value)) op.selected = true; s.appendChild(op); }); return s; };
  CK.textarea = function (value, ph) { return h("textarea.ck-input", { placeholder: ph || null, rows: 3 }, value || ""); };
  CK.check = function (label, on, opt) { var i = h("input", { type: "checkbox" }); i.checked = !!on; if (opt && opt.disabled) i.disabled = true; return h("label.ck-check", i, h("span", label)); };
  CK.seg = function (opts, value, onChange) { var g = h("div.ck-seg", { role: "group" }); opts.forEach(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o, n = Array.isArray(o) ? o[2] : null;
      var b = h("button", { type: "button", "aria-pressed": String(v === value), on: { click: function () { [].forEach.call(g.children, function (x) { x.setAttribute("aria-pressed", "false"); }); b.setAttribute("aria-pressed", "true"); onChange(v); } } }, t, n != null ? h("em", String(n)) : null); g.appendChild(b); });
    return g; };
  CK.tabs = function (opts, value, onChange) { var t = CK.seg(opts, value, onChange); t.className = "ck-tabs"; t.setAttribute("role", "tablist"); return t; };
  CK.search = function (ph, onInput) { var i = h("input.ck-input", { type: "search", placeholder: ph || "Search" }); i.addEventListener("input", function () { onInput(i.value.trim().toLowerCase()); }); return h("div.ck-search", CK.ic("search"), i); };

  /* ---- layout ---- */
  CK.head = function (o) { /* {crumbs:[[label,href]], title, sub, actions:[], status} */
    return h("header.ck-head.ck-in",
      o.crumbs ? h("nav.ck-crumbs", { "aria-label": "Breadcrumb" }, o.crumbs.map(function (c, i) { return [i ? h("span.sep", "/") : null, c[1] ? h("a", { href: c[1] }, c[0]) : h("span", c[0])]; })) : null,
      h("div.ck-headrow", h("div", h("h1", o.title, o.status || null), o.sub ? h("p.ck-sub", o.sub) : null), o.actions ? h("div.ck-actions", o.actions) : null)); };
  CK.card = function (title, body, opt) { opt = opt || {}; return h("section.ck-card.ck-in" + (opt.cls ? "." + opt.cls : ""), title || opt.tools ? h("div.ck-cardhead", title ? h("h2", opt.icon ? CK.ic(opt.icon) : null, title) : h("span"), opt.tools || null) : null, h("div.ck-cardbody" + (opt.flush ? ".flush" : ""), body)); };
  CK.grid = function (cols, kids, cls) { return h("div.ck-grid" + (cls ? "." + cls : ""), { style: { "--cols": cols } }, kids); };
  CK.stat = function (label, value, opt) { opt = opt || {}; return h("div.ck-stat.ck-in" + (opt.tone ? ".t-" + opt.tone : "") + (opt.on ? ".is-click" : ""), { on: opt.on ? { click: opt.on } : null, role: opt.on ? "button" : null, tabindex: opt.on ? 0 : null },
      h("span.ck-tile", CK.ic(opt.icon || "chart")), h("div", h("span.lbl", label), h("b", value), opt.sub ? h("small", opt.sub) : null)); };
  CK.dl = function (rows, cls) { return h("dl.ck-dl" + (cls ? "." + cls : ""), rows.filter(Boolean).map(function (r) { return h("div", h("dt", r[0]), h("dd", r[1] == null || r[1] === "" ? "–" : r[1])); })); };
  CK.empty = function (title, text, icon) { return h("div.ck-empty", h("span.ck-emptyic", CK.ic(icon || "check")), h("b", title), text ? h("p", text) : null); };
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
  CK.error = function (err, back) { if (err && err.status === 401) return; CK.render([CK.head({ title: "This could not be opened" }), CK.card(null, [CK.note((err && err.message) || "CALMS could not be reached.", "red"), h("div.ck-actions", CK.btn("Try again", { kind: "primary", icon: "refresh", on: function () { location.reload(); } }), back ? CK.btn("Back", { href: back, kind: "ghost" }) : null)])]); };
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
        fA.setError(""); }, function (e) { fA.setError(e.message); }); }, 300); }
    amt.addEventListener("input", preview); date.addEventListener("change", preview); preview();
    btn.addEventListener("click", function () { [fA, fD, fC, fR].forEach(function (f) { f.setError(""); });
      if (!(+amt.value.replace(/[^\d.]/g, "") > 0)) { fA.setError("Enter the amount received."); amt.focus(); return; } if (!chan.value) { fC.setError("Choose how the money came in."); return; }
      if (chan.value !== "Cash at the branch" && !ref.value.trim()) { fR.setError("Enter the deposit, GCash or cheque reference."); ref.focus(); return; }
      CK.busy(btn, true); CK.api("POST", "/api/loan-accounts/" + acct.number + "/payments", { amount: amt.value.replace(/[^\d.]/g, ""), paidOn: date.value, channel: chan.value, reference: ref.value.trim() }).then(function (r) { CK.busy(btn, false); done(r); },
        function (e) { CK.busy(btn, false); var m = { amt: fA, date: fD, chan: fC, ref: fR }[e.field || e.fields] || fA; m.setError(e.message); }); });
    return h("div.ck-stack.ck-payform", h("div.ck-form", fA, fD, fC, fR), where, h("div.ck-actions", btn));
  };
  CK.paper = function (path, btn, what) { CK.busy(btn, true); return CK.api("POST", path, {}).then(function (d) { CK.busy(btn, false); CALMS.printPaper(d); CK.toast(what + " " + (d.number || "") + " is ready. It is kept on record and logged."); return d; }, function (e) { CK.busy(btn, false); CK.fail(e); throw e; }); };
})();
