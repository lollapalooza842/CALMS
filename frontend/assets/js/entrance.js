/* The walk into the bank: sign-in screen to My Queue. Loaded on two pages.

   index.html (end of body). After a successful sign-in:
     1. Kuwa hops off the sign-in card and the card drops away.
     2. The camera zooms from the town toward the GR8 Lending building. Partway in, the town
        dissolves into a close shot of the porch that is growing at the same rate from the same
        spot, so it reads as one continuous zoom and the town art is never enlarged far.
     3. Kuwa glides in, flares and lands on the porch rail, shedding a few feathers. He ruffles,
        turns to the doors, nods, and they swing inward, frame by frame, onto plain light.
        He tips his hat.
     4. He takes off and flies in first; the camera follows him through the doorway into the
        light, and the page changes.

   my-queue.html (in the head). If you came through the doors, the office appears out of that
   light, the drawers slide in and Kuwa flies in over your shoulder and lands.

   Closing time: signing out is the same walk backwards, and shorter. Loaded on every inner page.
     1. Inside: the drawers shut, Kuwa takes off from wherever he is and leaves, the light takes over.
     2. Outside (index.html#signin): you come out through the doorway, Kuwa lands on the rail,
        turns, and the doors swing shut with a thud. He flies off, the camera pulls back to the
        town, the sign-in card comes up and he drops onto it.

   A click or any key skips either walk. With reduced motion there is only a short fade. */
/* the look of the sign-in page: western (the town, the default) or classic (a plain form). ?ui=classic or ?ui=western
   in the address chooses it too. Kept per device; set before anything is drawn so the page never flashes the other one. */
(function () { try { var q = (/[?&]ui=(classic|western)\b/.exec(location.search) || [])[1]; if (q) localStorage.setItem("calms-ui", q);
  if ((q || localStorage.getItem("calms-ui")) === "classic") document.documentElement.setAttribute("data-ui", "classic"); } catch (e) {} })();
/* the classic look inside the app: its type, its sheet and its script (classic-app.css/.js). Just signed in: everything
   slides in (c-arrive); any other page: a lighter slide (c-page). My Queue online becomes a dashboard (c-dash). */
(function () { var r = document.documentElement; if (r.getAttribute("data-ui") !== "classic" || !/\/pages\/[^/]*$/.test(location.pathname)) return;
  if (!window.CK_LOOK) return;                                   /* look.js (in the head) sets the classic look up */
  var page = (location.pathname.split("/").pop() || "").replace(/\.html$/, ""), own = r.classList.contains("c-own");
  /* pages rebuilt for the classic look draw themselves (assets/js/classic/<page>.js); the western page stays loaded but hidden */
  ["classic-app.js", "classic/sfx.js"].concat(own ? ["classic/kit.js", "classic/" + page + ".js"] : []).forEach(function (f) { var s = document.createElement("script"); s.src = "../assets/js/" + f; s.async = false; document.head.appendChild(s); }); })();
/* Kuwa's hat, chosen on the sign-in card (index.js): set before anything is drawn, so he wears it on every page */
(function () { try { var h = localStorage.getItem("calms-hat"); if (h && h !== "cowboy" && /^(sheriff|bowler|sombrero)$/.test(h)) document.documentElement.setAttribute("data-hat", h); } catch (e) {} })();
(function () {
  var KEY = "calms-entered", OUT = "calms-left", reduce = (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || document.documentElement.getAttribute("data-ui") === "classic";   /* the classic look: the short fade, not the walk into the bank */
  window.CALMS_ENTRANCE = true;

  /* ---- Kuwa's wings: assets/audio/wings, takeoff, landing (made by design/sound/sfx.py) ----
     Silent when "Sound off" was chosen on the sign-in screen, or with reduced motion. */
  var Wings = (function () {
    var AC = window.AudioContext || window.webkitAudioContext, ctx = null, bufs = {}, base = "";
    try { base = new URL("../audio/", (document.currentScript && document.currentScript.src) || location.href).href; } catch (e) {}
    function off() { try { return localStorage.getItem("calms-sound") === "off"; } catch (e) { return false; } }
    function init() {
      if (ctx || !AC || off() || reduce || !base) return;
      try { ctx = new AC(); } catch (e) { return; }
      ["wings", "takeoff", "landing", "click", "toggle"].forEach(function (n) {
        bufs[n] = fetch(base + n + ".mp3").then(function (r) { return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, no) { ctx.decodeAudioData(b, ok, no); }); }).catch(function () { return null; });
      });
    }
    function play(n, vol) {
      init(); if (!ctx || off() || !bufs[n]) return;
      if (ctx.state !== "running") ctx.resume().catch(function () {});
      bufs[n].then(function (buf) {
        if (!buf || ctx.state !== "running") return;
        var src = ctx.createBufferSource(), g = ctx.createGain(); src.buffer = buf; g.gain.value = vol == null ? 0.8 : vol;
        src.connect(g); g.connect(ctx.destination); src.start();
      });
    }
    return { init: init, play: play };
  })();
  /* a wooden tick on buttons and links, a lighter one on checkboxes and switches; inner pages only */
  if (!document.getElementById("front") && !reduce) {
    document.addEventListener("pointerdown", function () { Wings.init(); }, { capture: true, passive: true });
    document.addEventListener("click", function (e) {
      var el = e.target.closest && e.target.closest("button, a[href], [role=button], [role=tab], summary, input[type=checkbox], input[type=radio], label, select");
      if (!el || el.closest("#kuwa, .kcarry")) return;
      if (/^(INPUT|LABEL|SELECT)$/.test(el.tagName) || el.getAttribute("role") === "tab") Wings.play("toggle", .35); else Wings.play("click", .4);
    }, true);
  }

  /* ---- Kuwa, feathers and dust: shared by both halves ---- */
  var FLAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (f) { return [f, 42]; });           /* one wing beat */
  var WATCH = [[17, 900], [18, 650], [17, 500], [19, 110], [17, 700], [18, 650], [17, 300], [19, 110]];   /* facing the doors: breathing and blinking */
  function Bird(id) { var d = document.createElement("div"), i = document.createElement("i"), t = null; d.id = id; d.className = "kfly"; d.appendChild(i);
    function frame(f) { i.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
    return { el: d, frame: frame, stop: function () { clearTimeout(t); },
      play: function (seq, loop, then) { clearTimeout(t); var k = 0; (function step() { frame(seq[k][0]); var ms = seq[k][1]; k++; if (k >= seq.length) { if (loop) k = 0; else { if (then) t = setTimeout(then, ms); return; } } t = setTimeout(step, ms); })(); },
      centre: function () { var r = d.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; } }; }
  function feather(x, y, size) { var f = document.createElement("div"), s = Math.max(1.5, size / 40) * (.8 + Math.random() * .6), dx = (Math.random() - .5) * 90, dy = 70 + Math.random() * 90, r0 = Math.random() * 360, r1 = r0 + (Math.random() - .5) * 420; f.className = "feather"; f.style.left = x + "px"; f.style.top = y + "px"; document.body.appendChild(f);
    if (!f.animate) { f.remove(); return; }
    f.animate([{ transform: "translate(0px,0px) rotate(" + r0 + "deg) scale(" + s + ")", opacity: 1 }, { transform: "translate(" + dx * .7 + "px," + dy * .35 + "px) rotate(" + (r0 + r1) / 2 + "deg) scale(" + s + ")", opacity: 1, offset: .45 }, { transform: "translate(" + dx + "px," + dy + "px) rotate(" + r1 + "deg) scale(" + s + ")", opacity: 0 }], { duration: 1100 + Math.random() * 700, easing: "cubic-bezier(.2,.5,.5,1)" }).onfinish = function () { f.remove(); }; }
  function shed(bird, every) { return setInterval(function () { var c = bird.centre(); if (c[2] > 4) feather(c[0] + (Math.random() - .5) * c[2] * .5, c[1] + c[2] * .1, c[2]); }, every); }
  function dust(x, y, size) { for (var n = 0; n < 7; n++) (function (n) { var p = document.createElement("div"), a = (n / 6 - .5) * 2, s = Math.max(1, size / 60); p.className = "dust"; p.style.left = x + "px"; p.style.top = y + "px"; document.body.appendChild(p); if (!p.animate) { p.remove(); return; }
      p.animate([{ transform: "translate(0px,0px) scale(" + s + ")", opacity: .9 }, { transform: "translate(" + a * size * .55 + "px," + (-size * (.12 + Math.random() * .16)) + "px) scale(" + s * .6 + ")", opacity: 0 }], { duration: 420 + Math.random() * 200, easing: "ease-out" }).onfinish = function () { p.remove(); }; })(n); }

  /* ---- inside: my-queue.html ---- */
  var arrived = false; try { arrived = sessionStorage.getItem(KEY) === "1"; sessionStorage.removeItem(KEY); } catch (e) {}
  if (arrived) { Wings.init(); var root = document.documentElement; root.classList.add("arriving"); setTimeout(function () { root.classList.remove("arriving"); }, reduce ? 500 : 2000);
    if (!reduce) { root.classList.add("kuwa-away"); document.addEventListener("DOMContentLoaded", function () { setTimeout(flyIn, 420); }); } }
  /* he comes in over your shoulder from the top right, dips, flares and lands where the page keeps him */
  function flyIn() { var home = document.querySelector(".kcarry") || document.getElementById("kuwa"), root = document.documentElement; if (!home || !home.animate) { root.classList.remove("kuwa-away"); return; }
    var r = home.getBoundingClientRect(), b = Bird("kflier"), vw = window.innerWidth, T = 1500; b.el.classList.add("left"); b.el.style.left = r.left + "px"; b.el.style.top = r.top + "px"; b.el.style.transformOrigin = "50% 50%"; document.body.appendChild(b.el);
    var sx = Math.min(vw - r.left + 60, vw * .55), sy = -(r.top + 180);
    b.el.animate([{ transform: "translate(" + sx + "px," + sy + "px) scale(2.3)" }, { transform: "translate(" + sx * .55 + "px," + sy * .42 + "px) scale(1.8)", offset: .3 }, { transform: "translate(" + sx * .22 + "px," + 26 + "px) scale(1.25)", offset: .62 }, { transform: "translate(" + 34 + "px," + 10 + "px) scale(1.05)", offset: .8 }, { transform: "translate(8px,-22px) scale(1)", offset: .92 }, { transform: "translate(0px,0px) scale(1)" }], { duration: T, easing: "cubic-bezier(.3,.3,.4,1)", fill: "both" });
    b.play(FLAP, true); var sh = shed(b, 120); Wings.play("wings", 0.75);
    setTimeout(function () { Wings.play("landing", 0.7); }, T - 600);              /* the landing sound brakes for 0.6 s before his feet touch */
    setTimeout(function () { clearInterval(sh); b.play([[12, 170], [13, 130]]); }, T * .8);
    setTimeout(function () { var c = b.centre(); dust(c[0], c[1] + 44, 96); feather(c[0] - 20, c[1], 96); feather(c[0] + 24, c[1] - 10, 96); b.play([[14, 130], [15, 150], [16, 120]], false, function () { root.classList.remove("kuwa-away"); b.el.remove(); }); }, T); }

  /* ---- the way out, inside: every inner page ---- */
  var leaving = false;
  function leave(url) { if (leaving) return; leaving = true; var root = document.documentElement, done = false, light = document.createElement("div");
    function go() { if (done) return; done = true; try { sessionStorage.setItem(OUT, "1"); } catch (e) {} location.href = url; }
    light.id = "roomlight"; document.body.appendChild(light); light.offsetWidth;
    if (reduce || !document.body.animate) { light.classList.add("on"); setTimeout(go, 320); return; }
    root.classList.add("leaving"); Wings.play("takeoff", 0.75); flyOut();
    setTimeout(function () { light.classList.add("on"); }, 700); setTimeout(go, 1050);
    setTimeout(function () { document.addEventListener("keydown", go, true); document.addEventListener("pointerdown", go, true); }, 0); }
  /* he crouches, lifts off whatever he was standing on and goes out over your shoulder, the way he came in */
  function flyOut() { var home = document.querySelector(".kcarry") || document.getElementById("kuwa"), root = document.documentElement; if (!home) return;
    var r = home.getBoundingClientRect(), vw = window.innerWidth; if (r.width < 8 || r.bottom < 0 || r.top > window.innerHeight) return;
    var b = Bird("kflier"), T = 900; b.el.style.left = (r.left + r.width / 2 - 48) + "px"; b.el.style.top = (r.bottom - 96) + "px"; b.el.style.transformOrigin = "50% 50%"; document.body.appendChild(b.el); root.classList.add("kuwa-away");
    var ex = Math.min(vw - r.left + 60, vw * .55), ey = -(r.bottom + 180);
    b.play([[23, 170]], false, function () { var c = b.centre(); dust(c[0], c[1] + 44, 96); feather(c[0] - 18, c[1], 96); feather(c[0] + 22, c[1] - 8, 96); b.play(FLAP, true); shed(b, 100);
      b.el.animate([{ transform: "translate(0px,0px) scale(1)" }, { transform: "translate(10px,-26px) scale(1.05)", offset: .12 }, { transform: "translate(" + ex * .3 + "px," + ey * .16 + "px) scale(1.3)", offset: .4 }, { transform: "translate(" + ex * .62 + "px," + ey * .5 + "px) scale(1.8)", offset: .7 }, { transform: "translate(" + ex + "px," + ey + "px) scale(2.3)" }], { duration: T, easing: "cubic-bezier(.5,0,.7,.6)", fill: "both" }); }); }
  window.CALMS_LEAVE = leave;
  /* opened from the folder there is no back end to tell first; with one, api.js signs out and then calls CALMS_LEAVE */
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest(".rail .who a"); if (!a || !/Sign out/.test(a.textContent)) return; if (window.CALMS && window.CALMS.online) return; e.preventDefault(); leave(a.href); }, true);
  /* coming back out: keep the sign-in screen behind the light until the porch is built */
  var left = false; try { left = sessionStorage.getItem(OUT) === "1"; sessionStorage.removeItem(OUT); } catch (e) {}
  if (left && location.hash === "#signin" && !/\/pages\/[^/]*$/.test(location.pathname)) document.documentElement.classList.add(reduce ? "arriving" : "returning"); else left = false;
  if (left && reduce) { setTimeout(function () { document.documentElement.classList.remove("arriving"); }, 900); left = false; }

  /* ---- outside: index.html ---- */
  var DEST = "pages/my-queue.html", GRID_W = 256, GRID_H = 144, DOOR = { x: 80, y: 54, w: 96, h: 60 };
  var TOWN_DOOR = { x: .5112, y: .775 }, TOWN_BANK_W = .30;   /* where the bank's door is in the town picture, and how wide the close shot's view is there, as a share of the picture's width */
  function wire() { var welcome = document.getElementById("welcome"), scene = document.getElementById("scene"); if (!welcome || !scene || !window.MutationObserver) return;
    var porch, cam, doors, spill, pk, bird, light, going = false, timers = [], shedT = null;
    function el(id) { var d = document.createElement("div"); d.id = id; return d; }
    function build() { porch = el("porch"); porch.setAttribute("aria-hidden", "true"); cam = el("pcam"); doors = el("pdoors"); spill = el("pspill"); bird = Bird("pkuwa"); pk = bird.el;
      cam.appendChild(el("plight")); cam.appendChild(doors); cam.appendChild(el("pscene")); cam.appendChild(spill); cam.appendChild(el("pglow")); cam.appendChild(pk); porch.appendChild(cam); document.body.appendChild(porch);
      light = el("roomlight"); document.body.appendChild(light); }
    function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function finish() { timers.forEach(clearTimeout); clearInterval(shedT); if (bird) bird.stop(); document.removeEventListener("keydown", skip, true); document.removeEventListener("pointerdown", skip, true); try { sessionStorage.setItem(KEY, "1"); } catch (e) {} location.replace(DEST); }
    function skip(e) { if (e.type === "keydown" && (e.key === "Tab" || e.key === "Shift")) return; finish(); }
    function walk() { if (going) return; going = true;
      if (reduce || !scene.animate) { light = el("roomlight"); document.body.appendChild(light); at(700, function () { light.classList.add("on"); }); at(1050, finish); return; }
      build(); var clerk = document.getElementById("clerk"); Wings.init();
      at(650, function () { if (clerk) clerk.classList.add("hop"); Wings.play("takeoff", 0.55); });
      at(900, function () { document.getElementById("front").classList.add("leaving"); var s = document.getElementById("sign"); if (s) s.classList.add("lifted"); [].forEach.call(document.querySelectorAll(".ghost"), function (g) { g.classList.add("leaving"); }); document.addEventListener("keydown", skip, true); document.addEventListener("pointerdown", skip, true); });
      at(1050, zoom); }
    function zoom() {
      /* lay the porch grid over the screen (on a narrow screen, shrink it so the whole doorway shows) */
      var vw = window.innerWidth, vh = window.innerHeight, u = Math.min(Math.max(vw / GRID_W, vh / GRID_H), vw * .86 / DOOR.w), left = (vw - GRID_W * u) / 2, top = (vh - GRID_H * u) / 2;
      porch.style.setProperty("--u", u + "px"); cam.style.left = left + "px"; cam.style.top = top + "px"; pk.style.setProperty("--k", (u * 28 / 96).toFixed(3)); if ((vw - left) / u < 240) { pk.style.left = Math.min(207, (vw - left) / u - 34) * u + "px"; pk.style.top = 109 * u + "px"; }   /* a narrow screen cannot show the rail: he lands on the boards by the door instead, in view */
      /* the door in the town (P0) and the door in the close shot (P1); s0 is how small the close shot must start to sit over the building */
      var r = scene.getBoundingClientRect(), p0x = r.left + r.width * TOWN_DOOR.x, p0y = r.top + r.height * TOWN_DOOR.y, dcx = (DOOR.x + DOOR.w / 2) * u, dcy = (DOOR.y + DOOR.h) * u, p1x = left + dcx, p1y = top + dcy;
      var s0 = Math.max(.28, Math.min(.7, r.width * TOWN_BANK_W / (GRID_W * u))), K = 1 / s0, T = 1150, ease = "cubic-bezier(.5,0,.2,1)";
      scene.style.transformOrigin = (p0x - r.left) + "px " + (p0y - r.top) + "px"; cam.style.transformOrigin = dcx + "px " + dcy + "px"; porch.classList.add("on");
      scene.animate([{ transform: "translate(0px,0px) scale(1)" }, { transform: "translate(" + (p1x - p0x) + "px," + (p1y - p0y) + "px) scale(" + K + ")" }], { duration: T, easing: ease, fill: "forwards" });
      cam.animate([{ transform: "translate(" + (p0x - p1x) + "px," + (p0y - p1y) + "px) scale(" + s0 + ")" }, { transform: "translate(0px,0px) scale(1)" }], { duration: T, easing: ease, fill: "forwards" });
      cam.animate([{ opacity: 0, maskSize: "100% 100%", webkitMaskSize: "100% 100%" }, { opacity: 0, maskSize: "130% 130%", webkitMaskSize: "130% 130%", offset: .3 }, { opacity: 1, maskSize: "260% 260%", webkitMaskSize: "260% 260%", offset: .78 }, { opacity: 1, maskSize: "420% 420%", webkitMaskSize: "420% 420%" }], { duration: T, easing: "linear", fill: "forwards" });
      at(T, function () { porch.classList.add("solid"); cam.classList.add("clear"); });
      /* Kuwa glides in as the camera settles: down across the porch, a dip, a flare, and onto the rail */
      var F = 1350, f0 = T - 420;
      at(f0, function () { pk.style.visibility = "visible"; bird.play(FLAP, true); shedT = shed(bird, 130); Wings.play("wings", 0.85);
        pk.animate([{ translate: (-175 * u) + "px " + (-78 * u) + "px" }, { translate: (-110 * u) + "px " + (-44 * u) + "px", offset: .3 }, { translate: (-52 * u) + "px " + (-6 * u) + "px", offset: .6 }, { translate: (-20 * u) + "px " + (2 * u) + "px", offset: .78 }, { translate: (-5 * u) + "px " + (-9 * u) + "px", offset: .92 }, { translate: "0px 0px" }], { duration: F, easing: "cubic-bezier(.3,.3,.4,1)", fill: "backwards" }); });
      at(f0 + F - 600, function () { Wings.play("landing", 0.8); });
      at(f0 + F * .8, function () { clearInterval(shedT); bird.play([[12, 160], [13, 120]]); });
      at(f0 + F, function () { var c = bird.centre(); dust(c[0], c[1] + c[2] * .46, c[2]); feather(c[0] - c[2] * .2, c[1], c[2]); feather(c[0] + c[2] * .25, c[1] - c[2] * .1, c[2]);
        bird.play([[14, 130], [15, 150], [16, 260], [24, 110], [16, 90], [24, 110], [16, 200]], false, function () { bird.play(WATCH, true); }); });
      var D = f0 + F + 1150;                                   /* when the doors start to move */
      at(D - 300, function () { bird.play([[20, 240], [17, 200]], false, function () { bird.play(WATCH, true); }); });
      /* the doors swing in, one drawn frame at a time, and the light comes out with them */
      [1, 2, 3, 4].forEach(function (n) { at(D + (n - 1) * 90, function () { doors.style.setProperty("--f", n); spill.style.opacity = [0, .3, .55, .85, 1][n]; }); });
      at(D + 270, function () { porch.animate([{ transform: "translateY(0)" }, { transform: "translateY(" + (u * .6) + "px)" }, { transform: "translateY(0)" }], { duration: 130 }); });
      at(D + 330, function () { bird.play([[22, 90], [21, 420], [22, 90], [17, 160]], false, function () { bird.play(WATCH, true); }); });
      /* he goes in first: a crouch, then off the rail and into the light, and the camera follows */
      at(D + 850, function () { Wings.play("takeoff", 0.8); at(250, function () { Wings.play("wings", 0.5); });
        bird.play([[23, 170]], false, function () { pk.classList.add("left"); bird.play(FLAP, true); shedT = shed(bird, 110);
        pk.animate([{ translate: "0px 0px", scale: "1", opacity: 1 }, { translate: (-30 * u) + "px " + (-16 * u) + "px", scale: ".9", opacity: 1, offset: .35 }, { translate: (-78 * u) + "px " + (-6 * u) + "px", scale: ".55", opacity: 1, offset: .8 }, { translate: (-86 * u) + "px " + (0 * u) + "px", scale: ".4", opacity: 0 }], { duration: 800, easing: "cubic-bezier(.4,0,.7,1)", fill: "forwards" }); }); });
      at(D + 1250, function () { var mx = left + (DOOR.x + DOOR.w / 2) * u, my = top + (DOOR.y + DOOR.h / 2) * u, K2 = Math.max(vw / (DOOR.w * u), vh / (DOOR.h * u)) * 1.15;
        cam.style.transformOrigin = (mx - left) + "px " + (my - top) + "px"; cam.animate([{ transform: "translate(0px,0px) scale(1)" }, { transform: "translate(" + (vw / 2 - mx) + "px," + (vh / 2 - my) + "px) scale(" + K2 + ")" }], { duration: 620, easing: "cubic-bezier(.6,0,.8,.4)", fill: "forwards" }); });
      at(D + 1530, function () { clearInterval(shedT); light.classList.add("on"); });
      at(D + 1880, finish); }
    /* closing time, outside: out through the doorway, the doors shut behind you, back to the street */
    function comeOut() { var root = document.documentElement, front = document.getElementById("front"), clerk = document.getElementById("clerk"), over = false, anims = [];
      function end() { if (over) return; over = true; timers.forEach(clearTimeout); timers = []; clearInterval(shedT); bird.stop(); anims.forEach(function (a) { try { a.cancel(); } catch (e) {} });
        document.removeEventListener("keydown", quit, true); document.removeEventListener("pointerdown", quit, true); porch.remove(); light.remove(); root.classList.remove("returning"); root.classList.remove("out"); root.classList.add("returned"); setTimeout(function () { root.classList.remove("returned"); }, 700);
        if (clerk && clerk.animate) { clerk.animate([{ transform: "translateY(-70vh) rotate(-20deg)" }, { transform: "translateY(0) rotate(0deg)" }], { duration: 420, delay: 120, easing: "cubic-bezier(.5,0,1,.7)", fill: "backwards" });
          Wings.play("landing", 0.6);
          setTimeout(function () { var c = clerk.getBoundingClientRect(); if (!c.width) return; dust(c.left + 48, c.bottom - 6, 96); feather(c.left + 30, c.top + 40, 96); feather(c.left + 70, c.top + 30, 96); var card = document.getElementById("card"); if (card) card.animate([{ transform: "translateY(0)" }, { transform: "translateY(6px)", offset: .3 }, { transform: "translateY(0)" }], { duration: 280 }); }, 540); } }
      function quit(e) { if (e.type === "keydown" && (e.key === "Tab" || e.key === "Shift")) return; end(); }
      if (!scene.animate) { root.classList.remove("returning"); return; }
      build(); document.addEventListener("keydown", quit, true); document.addEventListener("pointerdown", quit, true);
      var vw = window.innerWidth, vh = window.innerHeight, u = Math.min(Math.max(vw / GRID_W, vh / GRID_H), vw * .86 / DOOR.w), left = (vw - GRID_W * u) / 2, top = (vh - GRID_H * u) / 2;
      porch.style.setProperty("--u", u + "px"); cam.style.left = left + "px"; cam.style.top = top + "px"; pk.style.setProperty("--k", (u * 28 / 96).toFixed(3)); if ((vw - left) / u < 240) { pk.style.left = Math.min(207, (vw - left) / u - 34) * u + "px"; pk.style.top = 109 * u + "px"; }   /* a narrow screen cannot show the rail: he lands on the boards by the door instead, in view */
      var r = scene.getBoundingClientRect(), p0x = r.left + r.width * TOWN_DOOR.x, p0y = r.top + r.height * TOWN_DOOR.y, dcx = (DOOR.x + DOOR.w / 2) * u, dcy = (DOOR.y + DOOR.h) * u, p1x = left + dcx, p1y = top + dcy;
      var s0 = Math.max(.28, Math.min(.7, r.width * TOWN_BANK_W / (GRID_W * u))), K = 1 / s0, mx = left + dcx, my = top + (DOOR.y + DOOR.h / 2) * u, K2 = Math.max(vw / (DOOR.w * u), vh / (DOOR.h * u)) * 1.15;
      /* start where the walk in ended: in the doorway, in the light, doors open */
      porch.classList.add("on"); porch.classList.add("solid"); cam.classList.add("clear"); doors.style.setProperty("--f", 4); spill.style.opacity = 1;
      scene.style.transformOrigin = (p0x - r.left) + "px " + (p0y - r.top) + "px"; anims.push(scene.animate([{ transform: "translate(" + (p1x - p0x) + "px," + (p1y - p0y) + "px) scale(" + K + ")" }, { transform: "translate(" + (p1x - p0x) + "px," + (p1y - p0y) + "px) scale(" + K + ")" }], { duration: 10, fill: "forwards" }));
      cam.style.transformOrigin = (mx - left) + "px " + (my - top) + "px"; var back = cam.animate([{ transform: "translate(" + (vw / 2 - mx) + "px," + (vh / 2 - my) + "px) scale(" + K2 + ")" }, { transform: "translate(0px,0px) scale(1)" }], { duration: 700, easing: "cubic-bezier(.2,.6,.3,1)", fill: "both" }); anims.push(back);
      root.classList.add("out");
      /* Kuwa comes out after you and settles on the rail */
      var F = 850;
      Wings.init();
      at(180, function () { pk.style.visibility = "visible"; bird.play(FLAP, true); shedT = shed(bird, 120); Wings.play("wings", 0.6);
        pk.animate([{ translate: (-86 * u) + "px 0px", scale: ".4", opacity: 0 }, { translate: (-76 * u) + "px " + (-6 * u) + "px", scale: ".55", opacity: 1, offset: .18 }, { translate: (-30 * u) + "px " + (-17 * u) + "px", scale: ".9", opacity: 1, offset: .62 }, { translate: (-5 * u) + "px " + (-9 * u) + "px", scale: "1", opacity: 1, offset: .9 }, { translate: "0px 0px", scale: "1", opacity: 1 }], { duration: F, easing: "cubic-bezier(.3,.3,.4,1)", fill: "backwards" }); });
      at(180 + F - 600, function () { Wings.play("landing", 0.7); });
      at(180 + F * .8, function () { clearInterval(shedT); bird.play([[12, 150], [13, 110]]); });
      at(180 + F, function () { var c = bird.centre(); dust(c[0], c[1] + c[2] * .46, c[2]); feather(c[0] - c[2] * .2, c[1], c[2]); feather(c[0] + c[2] * .25, c[1] - c[2] * .1, c[2]);
        bird.play([[14, 120], [15, 140], [16, 200], [20, 220], [17, 240]], false, function () { bird.play(WATCH, true); }); });
      /* the doors swing shut, one drawn frame at a time, and the light goes with them */
      var D = 180 + F + 780;
      [3, 2, 1, 0].forEach(function (n, k) { at(D + k * 85, function () { doors.style.setProperty("--f", n); spill.style.opacity = [0, .3, .55, .85, 1][n]; }); });
      at(D + 270, function () { porch.animate([{ transform: "translateY(0)" }, { transform: "translateY(" + (u * .9) + "px)" }, { transform: "translateY(" + (-u * .3) + "px)" }, { transform: "translateY(0)" }], { duration: 170 }); dust(left + dcx - 10 * u, top + dcy, 26 * u); dust(left + dcx + 10 * u, top + dcy, 26 * u); });
      at(D + 420, function () { bird.play([[22, 90], [21, 380], [22, 90], [17, 120]], false, function () { bird.play(WATCH, true); }); });
      /* he leaves the rail, and the camera pulls back from the porch to the town */
      var P = D + 1150, T = 1050, ease = "cubic-bezier(.5,0,.2,1)";
      at(P - 260, function () { Wings.play("takeoff", 0.7); bird.play([[23, 150]], false, function () { pk.classList.add("left"); bird.play(FLAP, true); shedT = shed(bird, 110);
        pk.animate([{ translate: "0px 0px" }, { translate: (-6 * u) + "px " + (-12 * u) + "px", offset: .12 }, { translate: (-55 * u) + "px " + (-30 * u) + "px", offset: .45 }, { translate: (-115 * u) + "px " + (-60 * u) + "px", offset: .75 }, { translate: (-180 * u) + "px " + (-95 * u) + "px" }], { duration: 900, easing: "cubic-bezier(.5,0,.8,.7)", fill: "forwards" }); }); });
      at(P, function () { back.cancel(); cam.style.transformOrigin = dcx + "px " + dcy + "px"; porch.classList.remove("solid"); cam.classList.remove("clear"); anims[0].cancel();
        anims.push(scene.animate([{ transform: "translate(" + (p1x - p0x) + "px," + (p1y - p0y) + "px) scale(" + K + ")" }, { transform: "translate(0px,0px) scale(1)" }], { duration: T, easing: ease, fill: "backwards" }));
        anims.push(cam.animate([{ transform: "translate(0px,0px) scale(1)" }, { transform: "translate(" + (p0x - p1x) + "px," + (p0y - p1y) + "px) scale(" + s0 + ")" }], { duration: T, easing: ease, fill: "forwards" }));
        anims.push(cam.animate([{ opacity: 1, maskSize: "420% 420%", webkitMaskSize: "420% 420%" }, { opacity: 1, maskSize: "260% 260%", webkitMaskSize: "260% 260%", offset: .22 }, { opacity: 0, maskSize: "130% 130%", webkitMaskSize: "130% 130%", offset: .7 }, { opacity: 0, maskSize: "100% 100%", webkitMaskSize: "100% 100%" }], { duration: T, easing: "linear", fill: "forwards" })); });
      at(P + T - 150, end); }
    if (left) comeOut();
    new MutationObserver(function () { if (/^Welcome back/.test(welcome.textContent)) walk(); }).observe(welcome, { childList: true, characterData: true, subtree: true });
    /* signing out again before the card has gone cancels the walk */
    var again = document.getElementById("again"); if (again) again.addEventListener("click", function () { if (!going || document.getElementById("front").classList.contains("leaving")) return; timers.forEach(clearTimeout); timers = []; going = false; if (porch) porch.remove(); if (light) light.remove(); var c = document.getElementById("clerk"); if (c) c.classList.remove("hop"); }); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();
