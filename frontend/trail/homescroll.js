/* The home page's scroll journey (DRAFT): scrolling, swiping or the arrow keys carry the camera round the 8 of beads
   through five views, each with its own words; scrolling on from the fifth flies into the light at the 8's heart and
   comes out in About. Scrolling back up at the top of About comes out of the light in front of the 8 again.
   The camera itself is moved by scene.js (gr8:hs, 0 to 1: the views at 0, .2, .4, .6, .8; the way in from .8 to 1).
   On a phone each swipe moves one view, like turning a page; with a mouse wheel or trackpad it follows smoothly and
   settles on the nearest view. Also here: the phone's bottom bar and menu card (the menu and settings in one). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var html = document.documentElement, body = document.body, scopy = $(".scopy"), abUI = $("#aboutUI");
  if (!scopy) return;
  var VIEWS = 5, STEP = .2, END = .8;
  var t = 0, sent = -1, idleT = 0, going = false;

  /* ---- the words for views 2 to 5 (view 1 is the page's own headline) ---- */
  var WORDS = [
    null,
    ["Salary · Personal · SME", "Every peso <em>shown</em>", "Before you sign"],
    ["A real person at every step", "Your papers read", "By people who <em>care</em>"],
    ["Apply in about ten minutes", "Follow your loan", "<em>Step</em> by step"],
    ["Hi. We're GR8 Lending, and we care about one thing", "A loan is a promise", "We keep <em>ours</em>"]
  ];
  var wrap = document.createElement("div"); wrap.className = "hs"; wrap.setAttribute("aria-live", "polite");
  WORDS.forEach(function (w, i) { if (!w) return; var s = document.createElement("section"); s.className = "hs-st"; s.dataset.i = i;
    s.innerHTML = '<p class="hs-k mono">' + w[0] + '</p><h2 class="hs-h"><span class="l hl1"><span>' + w[1] + '</span></span><span class="l hl2"><span><i class="ar">↳</i>' + w[2] + "</span></span></h2>"; wrap.appendChild(s); });
  scopy.appendChild(wrap);
  var hint = document.createElement("div"); hint.className = "hs-hint"; hint.setAttribute("aria-hidden", "true"); hint.innerHTML = '<span class="mono">Scroll</span><i></i>'; body.appendChild(hint);
  var dots = document.createElement("div"); dots.className = "hs-dots"; dots.setAttribute("aria-hidden", "true"); dots.innerHTML = "<i></i><i></i><i></i><i></i><i></i>"; body.appendChild(dots);

  function view() { return t >= END + .06 ? -1 : Math.max(0, Math.min(VIEWS - 1, Math.round(t / STEP))); }
  function paint() {
    var v = view(); html.dataset.hs = String(v);
    scopy.classList.toggle("away", v !== 0);
    [].forEach.call(wrap.children, function (s) { s.classList.toggle("on", +s.dataset.i === v); });
    [].forEach.call(dots.children, function (d, i) { d.classList.toggle("on", i === v); });
  }
  function send() { if (Math.abs(t - sent) < 1e-4) return; sent = t; dispatchEvent(new CustomEvent("gr8:hs", { detail: t })); paint(); }
  function live() { return body.classList.contains("ready") && !document.getElementById("gate0") && !html.classList.contains("room-on") && !html.classList.contains("talk-open") && !html.classList.contains("kc-open") && !going; }
  function settle(dir) {   /* come to rest on a view; past the fifth, on into About */
    if (t > END + .06) { into(); return; }
    var v = dir > 0 ? Math.ceil(t / STEP - .25) : dir < 0 ? Math.floor(t / STEP + .25) : Math.round(t / STEP);
    t = Math.max(0, Math.min(END, v * STEP)); send();
  }
  function into() { going = true; t = 1; send(); setTimeout(function () { if (window.GR8_GO) window.GR8_GO("about", "beads"); }, 380); }
  addEventListener("gr8:place", function (e) { going = false; if (e.detail === "about" && t > END) { t = END; send(); } if (e.detail === "home") { paint(); } });

  /* ---- mouse wheel and trackpad: follow, then settle ---- */
  addEventListener("wheel", function (e) {
    if (!live() || (e.target.closest && e.target.closest(".snav, .kc, .tk, .lo-ui, .ab-ui, .kw, .gate0"))) return;
    var d = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1);
    t = Math.max(0, Math.min(1, t + d * .00055)); send();
    clearTimeout(idleT); var dir = d > 0 ? 1 : -1; idleT = setTimeout(function () { settle(dir); }, 220);
  }, { passive: true });

  /* ---- touch: each swipe turns one view, like a page ---- */
  var y0 = null, t0 = 0, moved = false;
  addEventListener("touchstart", function (e) { if (!live() || e.touches.length !== 1 || (e.target.closest && e.target.closest(".snav, .kc, .tk, .lo-ui, .ab-ui, .kw, a, button, input"))) { y0 = null; return; } y0 = e.touches[0].clientY; t0 = t; moved = false; }, { passive: true });
  addEventListener("touchmove", function (e) { if (y0 == null) return; var dy = y0 - e.touches[0].clientY; if (Math.abs(dy) > 6) moved = true;
    t = Math.max(0, Math.min(1, t0 + dy / (innerHeight * 2.2))); send(); }, { passive: true });
  addEventListener("touchend", function () { if (y0 == null) return; y0 = null; if (!moved) return;
    var d = t - t0; if (Math.abs(d) < .025) { t = t0; send(); return; }
    var v0 = Math.round(t0 / STEP), v = Math.max(0, Math.min(VIEWS, v0 + (d > 0 ? 1 : -1)));
    if (v === VIEWS) into(); else { t = v * STEP; send(); } }, { passive: true });

  /* ---- keys ---- */
  addEventListener("keydown", function (e) {
    if (!live() || (e.target.closest && e.target.closest("input, textarea, select, [contenteditable]"))) return;
    var k = e.key, v = view(); if (v < 0) return;
    if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) { e.preventDefault(); if (v === VIEWS - 1) into(); else { t = (v + 1) * STEP; send(); } }
    else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) { e.preventDefault(); t = Math.max(0, (v - 1) * STEP); send(); }
    else if (k === "Home") { t = 0; send(); }
  });

  /* ---- back out of About: scrolling up at its very top comes out of the light in front of the 8 ---- */
  if (abUI) {
    var pull = 0, ay = null;
    abUI.addEventListener("wheel", function (e) { if (abUI.scrollTop > 0 || e.deltaY >= 0) { pull = 0; return; } pull += -e.deltaY; if (pull > 260) { pull = 0; back(); } }, { passive: true });
    abUI.addEventListener("touchstart", function (e) { ay = abUI.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    abUI.addEventListener("touchend", function (e) { if (ay == null) return; var dy = (e.changedTouches[0] || {}).clientY - ay; ay = null; if (abUI.scrollTop <= 0 && dy > innerHeight * .18) back(); }, { passive: true });
  }
  function back() { if (going || !html.classList.contains("at-about") || !window.GR8_GO) return; going = true; t = END; sent = -1; window.GR8_GO(null, "beads"); setTimeout(function () { going = false; send(); }, 600); }

  [].forEach.call(document.querySelectorAll('[data-room="home"]'), function (a) { a.addEventListener("click", function () { t = 0; send(); }); });   /* Home: back to the first view */
  paint();

  /* ================= the phone: a bar at the bottom (menu, the name, Kuwa) and one card for the menu and the settings ================= */
  var phone = matchMedia("(max-width: 700px)"), nav = $(".snav"), mob = $(".snav .mob"), card = $("#setCard"), rows = null, extra = null;
  function arrange() {
    if (!nav || !mob || !card) return;
    if (phone.matches && !extra) {
      extra = document.createElement("div"); extra.className = "mob-more";
      extra.innerHTML = '<p class="mob-h">Settings</p><div class="mob-set"></div><a class="mob-talk" href="#talk">Let\'s talk <span>↳</span></a>';
      rows = [].slice.call(card.querySelectorAll(".set-row")); var box = extra.querySelector(".mob-set"); rows.forEach(function (r) { box.appendChild(r); });
      var h = document.createElement("p"); h.className = "mob-h"; h.textContent = "Menu"; mob.insertBefore(h, mob.firstChild); mob.appendChild(extra);
      extra.querySelector(".mob-talk").addEventListener("click", function (e) { e.preventDefault(); var mb = $(".menu-btn"); if (nav.classList.contains("open") && mb) mb.click(); var tk = $(".snav .links [data-talk]"); if (tk) tk.click(); });
    } else if (!phone.matches && extra) {
      var into2 = card.querySelector(".set-rule"); rows.forEach(function (r) { if (r.classList.contains("set-q")) card.appendChild(r); else card.insertBefore(r, into2); });
      extra.remove(); extra = null; var h2 = mob.querySelector(".mob-h"); if (h2) h2.remove();
    }
  }
  arrange(); if (phone.addEventListener) phone.addEventListener("change", arrange);
})();
