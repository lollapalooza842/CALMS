(function () {
  var FR = [[0, 0, 1800], [1, 0, 700], [2, 0, 1200], [3, 0, 110], [4, 0, 600], [5, 0, 350], [6, 0, 350], [7, 0, 700], [0, 1, 600], [1, 1, 1500], [2, 1, 1500], [3, 1, 1000], [4, 1, 350], [5, 1, 900], [6, 1, 900], [7, 1, 900], [0, 2, 120], [1, 2, 100], [2, 2, 120], [3, 2, 380], [4, 2, 120], [5, 2, 500], [6, 2, 80], [7, 2, 500], [0, 3, 300], [1, 3, 100], [2, 3, 100], [3, 3, 100], [4, 3, 100], [5, 3, 110], [6, 3, 90], [7, 3, 130], [0, 4, 90], [1, 4, 110], [2, 4, 90], [3, 4, 130], [4, 4, 90], [5, 4, 400], [6, 4, 400], [7, 4, 400], [0, 5, 400], [1, 5, 400], [2, 5, 400], [3, 5, 55], [4, 5, 55], [5, 5, 55], [6, 5, 55], [7, 5, 55], [0, 6, 55], [1, 6, 55], [2, 6, 55], [3, 6, 80], [4, 6, 80], [5, 6, 80], [6, 6, 80], [7, 6, 60], [0, 7, 60], [1, 7, 60], [2, 7, 60], [3, 7, 60], [4, 7, 60], [5, 7, 60], [6, 7, 60]], TAGS = {"idle": [0, 3], "think": [4, 8], "rest": [9, 12], "sleep": [13, 15], "approve": [16, 21], "alert": [22, 24], "look": [25, 28], "fly": [29, 32], "fly-side": [33, 36], "turn": [37, 42], "fly8": [43, 50], "bank": [51, 54], "gust": [55, 62]};
  var $ = function (id) { return document.getElementById(id); };
  /* Kuwa's hat: cowboy, sheriff, bowler or sombrero. Click his hat to change it; the choice is kept
     (localStorage "calms-hat") and he wears it inside the app too (entrance.js, kuwa-life.css). */
  var HATS = ["cowboy", "sheriff", "bowler", "sombrero"], hatNow = "cowboy";
  try { hatNow = localStorage.getItem("calms-hat") || "cowboy"; } catch (e) {}
  if (HATS.indexOf(hatNow) < 0) hatNow = "cowboy";
  function wearHat(h) { hatNow = h; if (h === "cowboy") document.documentElement.removeAttribute("data-hat"); else document.documentElement.setAttribute("data-hat", h);
    var hi = document.getElementById("hatItem"); if (hi) hi.innerHTML = "Kuwa's hat <b>" + h.charAt(0).toUpperCase() + h.slice(1) + "</b>"; }
  wearHat(hatNow);
  window.addEventListener("load", function () { HATS.slice(1).forEach(function (h) { new Image().src = "assets/img/kuwa-" + h + ".png"; }); });
  var stage = $("stage"), scene = $("scene"), kuwa = $("kuwa"), kb = $("kb"), ke = $("ke"), hd = $("kuwahd"), clerk = $("clerk"),
      logoWrap = $("logoWrap"), glint = $("glint"), card = $("card"), night = $("night"), curtL = $("curtL"), curtR = $("curtR"),
      title = $("title"), barT = $("barT"), barB = $("barB"), grain = $("grain"), flash = $("flash"), crack = $("crack"), bits = $("bits"),
      sil = $("sil"), shade = $("shade"), fake = $("fake"), tumble = $("tumble"), l4g = $("l4g"), skip = $("skip"), replay = $("replay");
  var CAM = [["l1", 1.03, 0], ["l2", 1.07, 0], ["l3", 1.12, 0], ["l4", 1.24, 0], ["l4g", 1.24, 0], ["l5", 1.7, 16]];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* the classic look (classic.css): no town, no intro; the town's pointer games are switched off so nothing runs unseen */
  var CLASSIC = document.documentElement.getAttribute("data-ui") === "classic";
  if (CLASSIC) ["pointermove", "pointerdown", "pointerleave"].forEach(function (t) { stage.addEventListener(t, function (e) { e.stopImmediatePropagation(); }, true); });
  function setLook(ui) { try { localStorage.setItem("calms-ui", ui); } catch (e) {} location.hash = "signin"; location.reload(); }   /* #signin: no intro on the way back */
  var K = 3, timers = [], anims = [], ivs = [], running = false, W = 0, H = 0, PH = 1, PY = 0, wide = false, LW = 0, LH = 0, sceneKey = "";
  glint.style.webkitMaskImage = glint.style.maskImage = "url(" + $("logo").src + ")";

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    var phone = W <= 600 && H > W;                        /* a portrait phone: the town is a picture across the top (see the phone rules in index.css) */
    if (phone && W === LW && H < LH) var HT = LH; else { HT = H; LW = W; LH = H; }   /* the keyboard opening shrinks the screen: keep the town as it was, or it would jump and rescale under your thumb */
    if (phone && sceneKey === W + "x" + HT && !wide) return;  /* nothing changed for the town (a phone's address bar sliding away) */
    sceneKey = W + "x" + HT;
    var sh = phone ? Math.round(HT * .47) : Math.max(H, W * 0.375), sw = sh * 480 / 180;
    scene.style.width = sw + "px"; scene.style.height = sh + "px"; scene.style.left = (W - sw) / 2 + "px"; scene.style.top = (phone ? 0 : (H - sh) / 2) + "px";
    scene.style.setProperty("--u", (sh / 180) + "px");
    /* a portrait phone: during the intro the town fills the whole screen (scaled up from the top band), so Kuwa's flight
       and the street are not cut off above an empty dark half; when the card arrives it glides up into its band (wideOff) */
    PH = phone ? H / sh : 1; PY = 0;                     /* the whole height: a portrait phone gets a full-screen town (the bank in the middle, the street running off both sides) */
    scene.style.transformOrigin = "50% 0"; scene.style.transform = wide && PH > 1 ? camWide() : "none";
    K = phone ? 2 : Math.max(2, Math.min(4, Math.round(H / 240)));     /* the close-up peeks: a phone is narrow, so Kuwa stays a size that fits it */
    var s = 96 * K;
    kuwa.style.width = kuwa.style.height = s + "px"; kuwa.style.margin = (-s / 2) + "px 0 0 " + (-s / 2) + "px";
    kuwa.style.setProperty("--k", K + "px");
    kb.style.backgroundSize = (768 * K) + "px " + (768 * K) + "px";
    var u = ke.children;
    [[35, 48], [54, 48]].forEach(function (p, i) { u[i].style.left = p[0] * K + "px"; u[i].style.top = p[1] * K + "px"; u[i].style.width = u[i].style.height = 7 * K + "px"; });   /* his eyes, as drawn at FIT .85 in kuwa.py */
  }
  function wideOff(ms) {                                  /* the phone's full-screen town glides up into its band */
    if (!wide) return; wide = false; scene.style.transform = "none";
    if (ms && PH > 1) scene.animate([{ transform: camWide() }, { transform: "none" }], { duration: ms, easing: "cubic-bezier(.4,0,.2,1)" });
  }
  function camWide() { return "translateY(" + PY + "px) scale(" + PH + ")"; }
  function frame(el, i, k) { el.style.backgroundPosition = (-96 * k * FR[i][0]) + "px " + (-96 * k * FR[i][1]) + "px"; }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function every(ms, fn) { var id = setInterval(fn, ms); ivs.push(id); return id; }
  function anim(el, kf, opt) { var a = el.animate(kf, Object.assign({ fill: "forwards", easing: "ease" }, opt)); anims.push(a); return a; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; ivs.forEach(clearInterval); ivs = []; anims.forEach(function (a) { a.cancel(); }); anims = []; bits.textContent = ""; }

  /* ---- sound (files in assets/audio, made by design/sound/intro_sound.py and sfx.py) ----
     The intro's music, then quiet sign-in music that loops, a stamp-and-coins sound on signing
     in, and small wooden ticks on clicks. Browsers allow sound only after a click or key press,
     so until then the button reads "Tap for sound"; the first tap starts the music at the right
     moment. The desktop app may play sound at once. "Sound off" is remembered. */
  var Sound = (function () {
    var AC = window.AudioContext || window.webkitAudioContext, ctx = null, out = null, bufs = {}, waits = {}, music = null;
    var NAMES = ["intro", "signin-loop", "admitted", "click", "toggle", "error", "hoot", "gust", "burst", "creak", "snort", "rain", "dust", "lasso", "piano", "train", "noon", "duel", "bang", "spur", "paper", "swap"];
    var amb = null, ambWant = null;                       /* a second channel, for the weather */
    var bed = null, bedT = 0;                             /* a third, for the saloon piano (kept in step with the music) */
    var LOOP_LEN = 32 * 60 / 82;                          /* the loop is exactly 8 bars at 82 bpm */
    var muted = CLASSIC; try { muted = muted || localStorage.getItem("calms-sound") === "off"; } catch (e) {}   /* the classic look is a quiet office: no music, no town */
    function init() {
      if (ctx || !AC) return;
      try { ctx = new AC(); } catch (e) { return; }
      out = ctx.createGain(); out.gain.value = muted ? 0 : 1; out.connect(ctx.destination);
      function load(n) {
        return fetch("assets/audio/" + n + ".mp3").then(function (r) { return r.arrayBuffer(); })
          .then(function (b) { return new Promise(function (ok, no) { ctx.decodeAudioData(b, ok, no); }); })
          .then(function (buf) { bufs[n] = buf; (waits[n] || []).forEach(function (f) { f(); }); delete waits[n]; })
          .catch(function () {});
      }
      /* the intro's sounds at once; the town's (piano, train, weather, the duel...) one at a time once the intro is over,
         so a phone is not decoding twenty files while Kuwa is flying */
      var LATER = ["piano", "train", "rain", "dust", "noon", "duel", "bang", "spur", "paper", "swap", "gust", "snort", "creak"];
      NAMES.filter(function (n) { return LATER.indexOf(n) < 0; }).forEach(load);
      setTimeout(function next() { if (introGoing) { setTimeout(next, 1000); return; } var n = LATER.shift(); if (n) load(n).then(function () { setTimeout(next, 250); }); }, 1500);
    }
    function when(n, f) { if (bufs[n]) f(); else (waits[n] = waits[n] || []).push(f); }
    function live() { return ctx && ctx.state === "running" && !muted; }
    function fx(n, vol, rate) {
      if (!live() || !bufs[n]) return;
      var s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = bufs[n]; g.gain.value = vol == null ? 1 : vol; if (rate) s.playbackRate.value = rate;
      s.connect(g); g.connect(out); s.start();
    }
    /* one piece of music at a time; a new one fades the old one out */
    function stopMusic(fade) {
      if (bed) piano(0);
      if (!music) return; var m = music; music = null;
      try { var t = ctx.currentTime; m.g.gain.cancelScheduledValues(t); m.g.gain.setValueAtTime(m.g.gain.value, t); m.g.gain.linearRampToValueAtTime(0, t + (fade || 0.4)); m.s.stop(t + (fade || 0.4) + 0.05); } catch (e) {}
    }
    function playMusic(n, opt) {
      opt = opt || {}; if (!ctx) return;
      var token = {}; music = { pending: token, name: n };
      when(n, function () {
        if (!music || music.pending !== token) return;   /* something else was asked for meanwhile */
        var s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime + (opt.delay || 0), vol = opt.vol == null ? 1 : opt.vol;
        s.buffer = bufs[n];
        if (opt.loop) { s.loop = true; s.loopStart = 0; s.loopEnd = Math.min(LOOP_LEN, bufs[n].duration); }
        g.gain.setValueAtTime(opt.fadeIn ? 0 : vol, t); if (opt.fadeIn) g.gain.linearRampToValueAtTime(vol, t + opt.fadeIn);
        s.connect(g); g.connect(out);
        var off = typeof opt.offset === "function" ? opt.offset() : (opt.offset || 0);
        if (off >= bufs[n].duration) return;
        s.start(t, opt.loop ? off % LOOP_LEN : off);
        music = { s: s, g: g, name: n, vol: vol, t0: t - (opt.loop ? off % LOOP_LEN : off) };   /* t0: when the loop's bar 1 started */
      });
    }
    /* weather: a looping bed of rain or wind under the music; null fades it out */
    function ambient(n, vol, fade) {
      fade = fade || 2.5;
      if (amb) { var a = amb; amb = null; try { var t = ctx.currentTime; a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.linearRampToValueAtTime(0, t + fade); a.s.stop(t + fade + 0.05); } catch (e) {} }
      var token = {}; ambWant = n ? token : null;
      if (!n || !ctx) return;
      when(n, function () {
        if (ambWant !== token) return;
        var s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
        s.buffer = bufs[n]; s.loop = true; s.loopStart = 0; s.loopEnd = Math.min(8, bufs[n].duration);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + fade);
        s.connect(g); g.connect(out); s.start(t); amb = { s: s, g: g };
      });
    }
    /* the saloon piano: same key, chords and length as the sign-in loop, started at the loop's
       current position so the two play in step; vol 0 fades it out (and stops it a little later) */
    function piano(vol) {
      if (!ctx || ctx.state !== "running") return;
      if (vol > 0.001 && !bed) {
        if (!bufs.piano || !music || music.name !== "signin-loop" || !music.s) return;
        var s = ctx.createBufferSource(), g = ctx.createGain(), now = ctx.currentTime + 0.05;
        s.buffer = bufs.piano; s.loop = true; s.loopStart = 0; s.loopEnd = Math.min(LOOP_LEN, bufs.piano.duration);
        var pos = (((now - music.t0) % LOOP_LEN) + LOOP_LEN) % LOOP_LEN;
        g.gain.setValueAtTime(0, now); s.connect(g); g.connect(out); s.start(now, pos); bed = { s: s, g: g };
      }
      if (!bed) return;
      bed.g.gain.setTargetAtTime(vol, ctx.currentTime, 0.3);
      clearTimeout(bedT);
      if (vol <= 0.001) bedT = setTimeout(function () { if (bed) { try { bed.s.stop(); } catch (e) {} bed = null; } }, 2500);
    }
    /* quieten the music for a while (the duel), then bring it back */
    function duck(level, sec) {
      if (!music || !music.g) return;
      var g = music.g.gain, t = ctx.currentTime, v = music.vol;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v * level, t + 0.6);
      g.setValueAtTime(v * level, t + sec); g.linearRampToValueAtTime(v, t + sec + 1.5);
    }
    return {
      init: init, fx: fx, playMusic: playMusic, stopMusic: stopMusic, live: live, ambient: ambient, piano: piano, duck: duck,
      get muted() { return muted; },
      get blocked() { return !ctx || ctx.state !== "running"; },
      unlock: function () { init(); return ctx && ctx.state !== "running" ? ctx.resume() : Promise.resolve(); },
      setMuted: function (m) { muted = m; try { localStorage.setItem("calms-sound", m ? "off" : "on"); } catch (e) {} if (out) out.gain.setTargetAtTime(m ? 0 : 1, ctx.currentTime, 0.05); },
      playing: function () { return music && music.name; }
    };
  })();
  var sndBtn = $("sound"), gearBtn = $("gearBtn"), gearMenu = $("gearMenu"), t0 = 0, introGoing = false;
  /* the settings cog: opens a small menu (sound, Kuwa's hat, Replay intro, and Install when the browser offers it) */
  function gearOpen(on) { gearMenu.hidden = !on; gearBtn.setAttribute("aria-expanded", String(on)); if (on) { var f = gearMenu.querySelector(".mi:not([hidden])"); if (f) f.focus(); } }
  gearBtn.addEventListener("click", function (e) { e.stopPropagation(); gearOpen(gearMenu.hidden); });
  document.addEventListener("click", function (e) { if (!gearMenu.hidden && !$("gear").contains(e.target)) gearOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !gearMenu.hidden) { gearOpen(false); gearBtn.focus(); } });
  $("hatItem").addEventListener("click", function (e) { e.stopPropagation(); swapHat(); });
  function paintSound() {
    var ask = !Sound.muted && Sound.blocked;
    sndBtn.textContent = Sound.muted ? "Sound off" : ask ? "Tap for sound" : "Sound on";
    sndBtn.setAttribute("aria-checked", String(!Sound.muted)); sndBtn.classList.toggle("ask", ask); gearBtn.classList.toggle("ask", ask);
  }
  /* what should be playing right now: the intro (from wherever it has got to) or the sign-in loop */
  function musicNow(fadeIn) {
    if (Sound.muted || Sound.blocked) return;
    if (introGoing) { if (Sound.playing() !== "intro") Sound.playMusic("intro", { offset: function () { return (performance.now() - t0) / 1000; } }); }
    else if (Sound.playing() !== "signin-loop") Sound.playMusic("signin-loop", { loop: true, vol: 0.45, fadeIn: fadeIn == null ? 1.5 : fadeIn });
  }
  function gesture() { if (Sound.muted) return; var was = Sound.blocked; Sound.unlock().then(function () { paintSound(); if (was) musicNow(); }, function () {}); }
  document.addEventListener("keydown", gesture, true);
  ["pointerdown", "touchstart"].forEach(function (ev) { document.addEventListener(ev, gesture, { passive: true, capture: true }); });
  sndBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (!Sound.muted && Sound.blocked) { gesture(); return; }
    Sound.setMuted(!Sound.muted); paintSound();
    if (!Sound.muted) { Sound.unlock().then(function () { paintSound(); musicNow(0.6); }); }
  });
  /* little sounds: a tick on buttons and links, a lighter one on toggles, a hoot from Kuwa */
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("button, a, input[type=checkbox], label.remember");
    if (!el || el === sndBtn) return;
    if (el.id === "eye" || el.type === "checkbox" || el.classList.contains("remember")) Sound.fx("toggle", 0.5);
    else Sound.fx("click", 0.55);
  });
  var lastHoot = 0;
  clerk.addEventListener("click", function (e) {
    var r = clerk.getBoundingClientRect();
    if (e.clientY - r.top < r.height * 0.46) { swapHat(); return; }          /* on his hat: a different hat */
    if (Date.now() - lastHoot > 1500) { lastHoot = Date.now(); Sound.fx("hoot", 0.8); }
  });
  function swapHat() {
    var next = HATS[(HATS.indexOf(hatNow) + 1) % HATS.length];
    Sound.fx("swap", 0.6);
    if (clerk.animate && !reduce) clerk.animate([{ translate: "0 0" }, { translate: "0 -10px", offset: .35 }, { translate: "0 0" }], { duration: 300, easing: "ease-out" });
    setTimeout(function () { wearHat(next); try { localStorage.setItem("calms-hat", next); } catch (e) {} }, reduce ? 0 : 110);
  }
  Sound.init(); paintSound();
  /* practice mode: say so plainly when the server accepts the practice code instead of an authenticator */
  if (window.CALMS && CALMS.online) fetch("/api/health").then(function (r) { return r.json(); }).then(function (h) {
    if (!h || !h.practice) return;
    var b = document.createElement("div"); b.id = "practice"; b.setAttribute("role", "note");
    b.innerHTML = "<b>Practice mode</b><br><span class=\"long\">The practice code works in place of the authenticator. </span>Not for real money.";
    stage.appendChild(b);
  }).catch(function () {});
  function camEnd(k) { return "translateY(" + CAM[k][2] + "%) scale(" + CAM[k][1] + ")"; }

  /* ---- the sign-in desk owl ---- */
  var cTimer = null, cTag = null, cHold = false;
  function clerkPlay(tag, once, then) {
    clearTimeout(cTimer); cTag = tag;
    var a = TAGS[tag][0], b = TAGS[tag][1], i = a;
    (function step() {
      frame(clerk, i, 1);
      if (reduce) return;
      var d = FR[i][2];
      if (i === b) { if (once) { cTimer = setTimeout(function () { cHold = false; (then || function () { clerkPlay("idle"); })(); }, d); return; } i = a; } else i++;
      cTimer = setTimeout(step, d);
    })();
  }
  function clerkStill(i) { clearTimeout(cTimer); cTag = null; frame(clerk, i, 1); }
  /* ---- Kuwa won't have the cursor near him: he beats his wings and blows it away ----
     The cursor you see near him is a stand-in (#fake) with weight: it is pushed by the gust, swirls,
     spins and trails ghosts, and springs back to the real pointer once you move off. Wind streaks,
     dust and the odd feather come off his wings. Keep the cursor on him and the gust builds; after
     about two seconds he gives a "!" and one big burst that flings it away and shakes the card,
     then catches his breath. Drawn on one canvas (#gustfx) so it stays smooth. */
  var mp = null, blowing = false, RAD = 110, gfx = document.createElement("canvas"), g2 = gfx.getContext("2d"), DPR = Math.min(2, window.devicePixelRatio || 1);
  gfx.id = "gustfx"; gfx.setAttribute("aria-hidden", "true"); stage.appendChild(gfx);
  var G = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, av: 0, hold: 0, last: 0, raf: 0, trail: [], parts: [], emit: 0, sndT: 0, featherT: 0, coolUntil: 0, bursting: false };
  var LITE = matchMedia("(hover: none), (pointer: coarse)").matches;   /* a touch phone: smaller canvases, and the full-screen ones are hidden whenever nothing is drawn on them (a big see-through layer over the town costs every frame) */
  gfx.style.display = "none";
  function sizeFx() { if (gfx.width === stage.clientWidth * DPR && gfx.height === stage.clientHeight * DPR) return; gfx.width = stage.clientWidth * DPR; gfx.height = stage.clientHeight * DPR; gfx.style.width = stage.clientWidth + "px"; gfx.style.height = stage.clientHeight + "px"; }
  sizeFx(); window.addEventListener("resize", sizeFx);
  function owlAt() { var r = clerk.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left + 48, y: r.top - s.top + 54 }; }
  function lean(on, dx, t) {
    if (!on) { if (clerk.style.rotate) { clerk.animate && clerk.animate([{ rotate: clerk.style.rotate, scale: clerk.style.scale || "1" }, { rotate: "0deg", scale: "1" }], { duration: 380, easing: "cubic-bezier(.3,1.6,.5,1)" }); clerk.style.rotate = ""; clerk.style.scale = ""; } return; }
    var beat = Math.sin(t / 1000 * Math.PI * 2 * 7);
    clerk.style.rotate = (Math.max(-14, Math.min(14, -dx * .09)) + beat * 2).toFixed(1) + "deg";                     /* leans into each wing beat, away from the cursor */
    clerk.style.scale = (1 + beat * .035).toFixed(3) + " " + (1 - beat * .035).toFixed(3);
  }
  function streak(c, ang, speed, life, w) {
    G.parts.push({ k: "s", x: c.x + Math.cos(ang) * 26, y: c.y + Math.sin(ang) * 22, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, curl: (Math.random() < .5 ? -1 : 1) * (3 + Math.random() * 5), t: 0, life: life, w: w, pts: [] });
  }
  function mote(c, ang, speed) { G.parts.push({ k: "m", x: c.x + (Math.random() - .5) * 40, y: c.y + 20 + Math.random() * 20, vx: Math.cos(ang) * speed * .5, vy: Math.sin(ang) * speed * .5 - 40, t: 0, life: .6 + Math.random() * .5, r: 1 + Math.random() * 1.6 }); }
  function featherP(c, ang) { G.parts.push({ k: "f", x: c.x + (Math.random() - .5) * 30, y: c.y, vx: Math.cos(ang) * 160 + (Math.random() - .5) * 80, vy: -120 - Math.random() * 80, t: 0, life: 1.8, a: Math.random() * 6, av: (Math.random() - .5) * 9 }); }
  function gustBurst(c, dx, dy, dist) {
    G.bursting = true; clerkStill(23); Sound.fx("hoot", .35, 1.2);                                    /* "!" */
    setTimeout(function () {
      var ux = dx / dist, uy = dy / dist; G.vx += ux * 2600; G.vy += uy * 2600 - 400; G.av += (Math.random() < .5 ? -1 : 1) * 22;
      for (var i = 0; i < 26; i++) streak(c, Math.atan2(uy, ux) + (Math.random() - .5) * 2.6, 900 + Math.random() * 700, .5 + Math.random() * .4, 2.6);
      for (var j = 0; j < 14; j++) mote(c, Math.atan2(uy, ux) + (Math.random() - .5) * 2, 700);
      featherP(c, Math.atan2(uy, ux)); featherP(c, Math.atan2(uy, ux) + .6);
      Sound.fx("burst", .7);
      if (card.animate) card.animate([{ transform: "none" }, { transform: "translate(" + (-ux * 6) + "px," + (-uy * 3) + "px) rotate(" + (-ux * .8) + "deg)" }, { transform: "translate(" + (ux * 3) + "px,0) rotate(" + (ux * .4) + "deg)" }, { transform: "none" }], { duration: 420, easing: "ease-out" });
      clerkPlay("gust", false); G.hold = 0; G.coolUntil = Date.now() + 1900;
      setTimeout(function () { G.bursting = false; if (!running) { blowing = false; lean(false); cHold = true; clerkPlay("rest", true); } }, 380);   /* then he catches his breath */
    }, 230);
  }
  function gustLoop(ts) {
    G.raf = 0; gfx.style.display = ""; var t = ts || performance.now(), dt = Math.min(.05, (t - (G.last || t)) / 1000) || .016; G.last = t;
    var c = owlAt(), live = mp && !fake.hidden;
    var dx = live ? mp.x - c.x : 0, dy = live ? mp.y - c.y : 0, dist = Math.hypot(dx, dy) || 1;
    var inside = live && dist < RAD && !cHold && !running && Date.now() > G.coolUntil;
    G.hold = Math.max(0, Math.min(3, G.hold + (inside ? dt : -dt * 2)));
    var power = .75 + Math.min(G.hold, 2.2) * .45, beat = .7 + .3 * Math.sin(t / 1000 * Math.PI * 2 * 7);
    if (inside && !blowing) { blowing = true; clerkPlay("gust"); }
    if (!inside && blowing && !G.bursting) { blowing = false; lean(false); if (!cHold) clerkPlay("idle"); }
    if (blowing && !G.bursting) lean(true, dx, t);
    if (inside && G.hold > 2.2 && !G.bursting) gustBurst(c, dx, dy, dist);
    /* the cursor: a spring to your pointer, pushed away and swirled round by the gust */
    if (live) {
      var ax = (mp.x - G.x) * 60 - G.vx * 12, ay = (mp.y - G.y) * 60 - G.vy * 12, fx = G.x - c.x, fy = G.y - c.y, fd = Math.hypot(fx, fy) || 1;
      if (blowing && fd < 190) { var f = 15000 * power * beat * Math.pow(1 - fd / 190, 1.2); ax += fx / fd * f - fy / fd * f * .35; ay += fy / fd * f + fx / fd * f * .35; }
      G.vx += ax * dt; G.vy += ay * dt; G.x += G.vx * dt; G.y += G.vy * dt;
      var lean_ = Math.max(-.9, Math.min(.9, G.vx * .0011 + (blowing ? Math.sin(t / 110) * .35 * power : 0)));
      G.av *= Math.exp(-dt * 3.5); G.rot += G.av * dt;                                              /* a spin from the burst, dying away */
      G.rot += (lean_ - G.rot) * (1 - Math.exp(-dt * (Math.abs(G.av) > 2 ? 1.5 : 9)));                /* then back to a lean with the wind */
      fake.style.transform = "translate(" + G.x.toFixed(1) + "px," + G.y.toFixed(1) + "px) rotate(" + G.rot.toFixed(3) + "rad)";
      G.trail.unshift([G.x, G.y, G.rot]); if (G.trail.length > 7) G.trail.pop();
    }
    /* wind off his wings */
    if (blowing && !G.bursting) {
      var base = Math.atan2(dy, dx); G.emit += dt * 34 * power;
      while (G.emit > 1) { G.emit--; streak(c, base + (Math.random() - .5) * 1.5, 520 + Math.random() * 380 * power, .45 + Math.random() * .35, 1.8 + power * 1.1); if (Math.random() < .5) mote(c, base + (Math.random() - .5) * 1.8, 420); }
      if (power > 1.4 && Date.now() - G.featherT > 650) { G.featherT = Date.now(); featherP(c, base); }
      if (Date.now() - G.sndT > 420) { G.sndT = Date.now(); Sound.fx("gust", .18 + .14 * power); }
    }
    draw(dt);
    var speed = Math.hypot(G.vx, G.vy);
    if (!inside && !blowing && live && Math.hypot(G.x - mp.x, G.y - mp.y) < 1.5 && speed < 20 && !G.parts.length) { fake.hidden = true; stage.classList.remove("nocur"); G.trail = []; g2.clearRect(0, 0, gfx.width, gfx.height); gfx.style.display = "none"; return; }
    if (!live && !G.parts.length) { g2.clearRect(0, 0, gfx.width, gfx.height); gfx.style.display = "none"; return; }
    G.raf = requestAnimationFrame(gustLoop);
  }
  function arrow(x, y, rot, a) {   /* the same arrow as #fake, for its ghost trail */
    g2.save(); g2.translate(x, y); g2.rotate(rot); g2.scale(2, 2); g2.globalAlpha = a;
    g2.beginPath(); g2.moveTo(1, 1); g2.lineTo(1, 12); g2.lineTo(4, 10); g2.lineTo(6, 14); g2.lineTo(8, 13); g2.lineTo(6, 9); g2.lineTo(10, 9); g2.closePath();
    g2.fillStyle = "#f3ddb0"; g2.fill(); g2.lineWidth = .8; g2.strokeStyle = "#24130a"; g2.stroke(); g2.restore();
  }
  function draw(dt) {
    g2.setTransform(DPR, 0, 0, DPR, 0, 0); g2.clearRect(0, 0, gfx.width, gfx.height);
    var speed = Math.hypot(G.vx, G.vy);
    if (!fake.hidden && speed > 260) for (var i = G.trail.length - 1; i > 0; i--) arrow(G.trail[i][0], G.trail[i][1], G.trail[i][2], Math.min(.35, speed / 4000) * (1 - i / G.trail.length));
    G.parts = G.parts.filter(function (p) { p.t += dt; return p.t < p.life; });
    G.parts.forEach(function (p) {
      var u = p.t / p.life, fade = Math.sin(Math.PI * Math.min(1, u * 1.15));
      if (p.k === "s") {                                                                    /* a streak that curls as it slows */
        var ang = Math.atan2(p.vy, p.vx) + p.curl * dt * (.4 + u), sp = Math.hypot(p.vx, p.vy) * (1 - dt * 1.6);
        p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp; p.x += p.vx * dt; p.y += p.vy * dt;
        p.pts.unshift([p.x, p.y]); if (p.pts.length > 9) p.pts.pop();
        g2.lineCap = "round"; g2.lineJoin = "round";
        for (var pass = 0; pass < 2; pass++) for (var k = 1; k < p.pts.length; k++) { var q = 1 - k / p.pts.length; g2.beginPath(); g2.moveTo(p.pts[k - 1][0], p.pts[k - 1][1]); g2.lineTo(p.pts[k][0], p.pts[k][1]);
          g2.strokeStyle = pass ? "rgba(255,246,226," + (fade * .9 * q).toFixed(3) + ")" : "rgba(70,40,20," + (fade * .38 * q).toFixed(3) + ")"; g2.lineWidth = (p.w * q + .4) * (pass ? 1 : 1) + (pass ? 0 : 1.6); g2.stroke(); }
      } else if (p.k === "m") {                                                             /* dust */
        p.vx *= 1 - dt * 2; p.vy = p.vy * (1 - dt * 2) + 30 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        g2.fillStyle = "rgba(214,178,128," + (fade * .8).toFixed(3) + ")"; g2.fillRect(p.x, p.y, p.r * 2, p.r * 2);
      } else {                                                                              /* a feather, fluttering down */
        p.vx *= 1 - dt * 1.5; p.vy = p.vy * (1 - dt * 2.5) + 160 * dt; p.x += (p.vx + Math.sin(p.t * 7) * 60) * dt; p.y += p.vy * dt; p.a += p.av * dt;
        g2.save(); g2.translate(p.x, p.y); g2.rotate(p.a + Math.sin(p.t * 7) * .6); g2.globalAlpha = Math.min(1, (1 - u) * 2);
        g2.fillStyle = "#8a5a33"; g2.beginPath(); g2.ellipse(0, 0, 7, 2.6, 0, 0, Math.PI * 2); g2.fill();
        g2.fillStyle = "#e9d2a6"; g2.fillRect(-6, -.4, 12, .8); g2.restore();
      }
    });
  }
  stage.addEventListener("pointermove", function (e) {
    if (running || reduce) return;
    var s = stage.getBoundingClientRect(); mp = { x: e.clientX - s.left, y: e.clientY - s.top };
    var c = owlAt(), dx = mp.x - c.x, dy = mp.y - c.y, near = Math.hypot(dx, dy) < RAD + 30;
    if (e.pointerType === "mouse" && near && !cHold && fake.hidden && Date.now() > G.coolUntil) { G.x = mp.x; G.y = mp.y; G.vx = G.vy = 0; G.rot = G.av = 0; G.last = 0; fake.hidden = false; stage.classList.add("nocur"); }
    if (!fake.hidden || G.parts.length) { if (!G.raf) G.raf = requestAnimationFrame(gustLoop); if (!fake.hidden) return; }
    if (cHold || document.activeElement === $("pass") || WX.kind === "dust") return;   /* in a dust storm he keeps his eyes screwed shut */
    clerkStill(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 25 : 26) : (dy < 0 ? 27 : 28));
  });
  stage.addEventListener("pointerleave", function () { mp = null; fake.hidden = true; stage.classList.remove("nocur"); blowing = false; lean(false); G.trail = []; if (!cHold && !running) clerkPlay("idle"); });
  /* ---- Kuwa and your typing ----
     Password: he pulls his hat over his eyes and fidgets with each key; stop typing for a couple of
     seconds and he peeks out from under it, then pulls it back down when you carry on.
     Username: once it looks like a staff username (first.last) he gives it a wing up. */
  var peekT = 0, thumbT = 0, thumbed = "";
  function hatDown() { clearTimeout(peekT); clerkStill(13); }
  function fidget() { if (clerk.animate && !reduce) clerk.animate([{ translate: "0 0" }, { translate: (Math.random() < .5 ? -1 : 1) + "px -2px" }, { translate: "0 0" }], { duration: 130, easing: "ease-out" }); }
  $("pass").addEventListener("focus", function () { cHold = true; hatDown(); });   /* hat over his eyes: he does not watch you type it */
  $("pass").addEventListener("blur", function () { clearTimeout(peekT); cHold = false; clerkPlay("idle"); });
  $("pass").addEventListener("input", function () {
    hatDown(); fidget();
    peekT = setTimeout(function () {                    /* a quiet spell: a peek from under the brim */
      if (document.activeElement !== $("pass")) return;
      clerkStill(9); peekT = setTimeout(function () { if (document.activeElement === $("pass")) clerkStill(13); }, 900);
    }, 2000);
  });
  function thumbsUp() {
    clearTimeout(thumbT);
    var v = $("user").value.trim();
    if (!/^\w+\.\w+$/.test(v) || v === thumbed || running || document.activeElement === $("pass")) return;
    thumbed = v; cHold = true; clerkPlay("approve", true); Sound.fx("toggle", 0.45, 1.3);
  }
  $("user").addEventListener("input", function () { clearTimeout(thumbT); thumbT = setTimeout(thumbsUp, 800); });
  $("user").addEventListener("blur", function () { setTimeout(thumbsUp, 0); });   /* not if you went straight on to the password */

  /* ---- the sign-in steps (prototype: nothing leaves the page) ---- */
  function show(n) { ["step1", "step2", "step3"].forEach(function (id, k) { $(id).hidden = k !== n; }); }
  function scold(el, msg) { Sound.fx("error", 0.7); el.textContent = msg; cHold = true; clerkPlay("alert", true); }
  $("step1").addEventListener("submit", function (e) {
    e.preventDefault();
    var u = $("user").value.trim(), p = $("pass").value;
    if (!u) { scold($("err1"), "Enter your username."); $("user").focus(); return; }
    if (!p) { scold($("err1"), "Enter your password."); $("pass").focus(); return; }
    if (window.CALMS && CALMS.online) {                       /* the real sign-in, through the back end */
      CALMS.api("POST", "/api/auth/login", { username: u, password: p }).then(function (r) {
        rememberName(u); $("err1").textContent = ""; if (r.step === "mfa" || r.step === "enrol") { enrolView(r); show(1); $("code").value = ""; $("code").focus(); cHold = true; clerkPlay("think"); } else admitted(r.user);
      }, function (e) { scold($("err1"), e.message); wrongTry(e.message); $("pass").value = ""; $("pass").focus(); });
      return;
    }
    $("err1").textContent = ""; show(1); $("code").value = ""; $("code").focus(); cHold = true; clerkPlay("think");
  });
  /* first sign-in of someone whose role needs an authenticator: show the setup key with the code box */
  function enrolView(r) {
    var on = r && r.step === "enrol";
    $("enrol").hidden = !on;
    $("codeSub").textContent = on ? "Then type the 6-digit code the app shows." : "Enter the 6-digit code from your authenticator.";
    if (on) { $("enrolKey").textContent = r.secret.replace(/(.{4})/g, "$1 ").trim(); $("enrolLink").href = r.uri; }
  }
  function admitted(user) { wrongs = 0; $("pinch").hidden = true; stopWeather(); Sound.stopMusic(0.9); Sound.fx("admitted", 0.9); $("err1").textContent = $("err2").textContent = ""; $("welcome").textContent = "Welcome back, " + user.name.split(" ")[0] + ". Your queue is next."; $("pass").value = ""; show(2); cHold = true; clerkPlay("approve", true); }
  $("step2").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!/^\d{6}$/.test($("code").value.trim())) { scold($("err2"), "The code is 6 digits. Check your authenticator and try again."); $("code").focus(); return; }
    if (window.CALMS && CALMS.online) {
      CALMS.api("POST", "/api/auth/verify", { code: $("code").value.trim() }).then(function (r) { admitted(r.user); }, function (e) { scold($("err2"), e.message); wrongTry(e.message); $("code").value = ""; $("code").focus(); });
      return;
    }
    $("err2").textContent = ""; $("welcome").textContent = "Welcome back, " + $("user").value.trim() + ". Your queue is next.";
    $("pass").value = ""; show(2); cHold = true; clerkPlay("approve", true);
  });
  /* ---- sign-in helpers ---- */
  var KEEP = "calms-username";
  function rememberName(u) { try { if ($("remember").checked) localStorage.setItem(KEEP, u); else localStorage.removeItem(KEEP); } catch (e) {} }
  function recall() { var u = ""; try { u = localStorage.getItem(KEEP) || ""; } catch (e) {} $("user").value = u; $("remember").checked = !!u; }
  recall();
  $("eye").addEventListener("click", function () {      /* show or hide the password; the cursor stays where it was */
    var f = $("pass"), show = f.type === "password", at_ = f.selectionStart;
    f.type = show ? "text" : "password"; this.textContent = show ? "Hide" : "Show"; this.setAttribute("aria-pressed", String(show));
    f.focus(); try { f.setSelectionRange(at_, at_); } catch (e) {}
  });
  function caps(e) { if (e.getModifierState) $("caps").hidden = !e.getModifierState("CapsLock"); }
  ["keydown", "keyup"].forEach(function (ev) { $("pass").addEventListener(ev, caps); $("user").addEventListener(ev, caps); });
  $("pass").addEventListener("blur", function () { $("caps").hidden = true; });
  $("forgot").addEventListener("click", function () { var n = $("forgotNote"); n.hidden = !n.hidden; this.setAttribute("aria-expanded", String(!n.hidden)); });
  function reset() { $("user").value = $("pass").value = $("code").value = ""; $("err1").textContent = $("err2").textContent = ""; $("pass").type = "password"; $("eye").textContent = "Show"; recall(); show(0); cHold = false; clerkPlay("idle"); }
  $("back").addEventListener("click", function () { reset(); $("user").focus(); });
  $("again").addEventListener("click", function () { reset(); $("user").focus(); });


  /* ---- town life: the horse outside the bank and the saloon's swing doors ----
     Sprites from design/town/town_life.py; the lantern on the porch swings by itself (CSS). */
  var horse = $("horse"), doors = $("batwing");
  function hframe(i) { horse.style.backgroundPosition = "calc(var(--u) * " + -(i * 26 + 1) + ") calc(var(--u) * -1)"; }   /* 26 x 20 cells with a 1px gutter */
  function dframe(i) { doors.style.backgroundPosition = "calc(var(--u) * " + -(i * 13 + 1) + ") calc(var(--u) * -1)"; }
  function seq(set, list, ms, done) { var k = 0; (function nx() { if (k >= list.length) { if (done) done(); return; } set(list[k++]); setTimeout(nx, ms); })(); }
  function horseLife() {
    setTimeout(function () {
      if (Math.random() < .25) {                                   /* head down to the trough, maybe a snort */
        hframe(3); if (!running && Math.random() < .5) Sound.fx("snort", 0.3, 0.9 + Math.random() * .2);
        setTimeout(function () { hframe(0); horseLife(); }, 1200 + Math.random() * 900);
      } else seq(hframe, [1, 2, 1, 2, 0], 110, horseLife);         /* a flick of the tail */
    }, reduce ? 1e9 : 3000 + Math.random() * 4000);
  }
  function doorLife() {
    setTimeout(function () {
      if (!running) Sound.fx("creak", 0.22, 0.9 + Math.random() * .2);
      seq(dframe, [2, 1, 2, 1, 0], 150, doorLife);                  /* someone pushes through; the flaps swing and settle */
    }, reduce ? 1e9 : 8000 + Math.random() * 8000);
  }
  hframe(0); dframe(0); horseLife(); doorLife();

  /* ---- weather, now and then: light rain (drops bead on the card) or a dust storm Kuwa squints through ----
     It starts a while after the intro and lasts half a minute or so. To see one now, add ?weather=rain
     or ?weather=dust to the address (?weather=clear turns it off). */
  var WX = { kind: null, I: 0, target: 0, parts: [], raf: 0, last: 0, timer: 0, beadT: 0, squintT: 0, sq: 0 };
  var wxsky = document.createElement("div"); wxsky.id = "wxsky"; wxsky.setAttribute("aria-hidden", "true"); scene.appendChild(wxsky);
  var wxc = document.createElement("canvas"), w2 = wxc.getContext("2d"); wxc.id = "wxfx"; wxc.setAttribute("aria-hidden", "true"); stage.insertBefore(wxc, $("front"));
  var WD = LITE ? 1 : DPR; wxc.style.display = "none";
  function sizeWx() { if (wxc.width === stage.clientWidth * WD && wxc.height === stage.clientHeight * WD) return; wxc.width = stage.clientWidth * WD; wxc.height = stage.clientHeight * WD; wxc.style.width = stage.clientWidth + "px"; wxc.style.height = stage.clientHeight + "px"; }
  sizeWx(); window.addEventListener("resize", sizeWx);
  var forced = (function () { try { return new URLSearchParams(location.search).get("weather"); } catch (e) { return null; } })();
  function startWeather(kind, sec) {
    stopWeather(true);
    WX.kind = kind; WX.target = 1; wxsky.className = "wx-" + kind; wxsky.style.opacity = 1;
    Sound.ambient(kind, kind === "rain" ? 0.35 : 0.3);
    if (kind === "rain") (function bead() { WX.beadT = setTimeout(function () { addBead(); bead(); }, 500 + Math.random() * 900); })();
    if (kind === "dust") {
      (function squint() { WX.squintT = setTimeout(function () {
        if (!cHold && !blowing && !running && document.activeElement !== $("pass")) clerkStill(WX.sq++ % 3 ? 10 : 9);
        squint(); }, 650); })();
      [0, 9000].forEach(function (d) { setTimeout(function () { if (WX.kind === "dust") rollWeed(); }, d + 1500); });
    }
    if (!WX.raf) WX.raf = requestAnimationFrame(wxLoop);
    if (sec) WX.timer = setTimeout(function () { stopWeather(); planWeather(); }, sec * 1000);
  }
  function stopWeather(now) {
    clearTimeout(WX.timer); clearTimeout(WX.beadT); clearTimeout(WX.squintT);
    var was = WX.kind; WX.kind = null; WX.target = 0; wxsky.style.opacity = 0; Sound.ambient(null, 0, now ? 0.3 : 3);
    if (was === "dust" && !cHold) clerkPlay("idle");
    Array.prototype.forEach.call(card.querySelectorAll(".bead"), function (b) { b.animate ? b.animate([{ opacity: 1 }, { opacity: 0 }], { duration: now ? 200 : 2500, fill: "forwards" }).onfinish = function () { b.remove(); } : b.remove(); });
    if (now) { WX.I = 0; WX.parts = []; w2.clearRect(0, 0, wxc.width, wxc.height); wxc.style.display = "none"; }
  }
  function planWeather() {
    clearTimeout(WX.timer);
    if (forced === "clear" || reduce) return;
    if (forced === "rain" || forced === "dust") { startWeather(forced); return; }
    WX.timer = setTimeout(function () { if (!running) startWeather(Math.random() < .5 ? "rain" : "dust", 25 + Math.random() * 15); else planWeather(); }, (40 + Math.random() * 50) * 1000);
  }
  function addBead() {                                            /* a raindrop lands on the card and slides a little way */
    if (card.querySelectorAll(".bead").length > 14 || card.style.opacity === "0") return;
    var b = document.createElement("div"); b.className = "bead"; card.appendChild(b);
    var x = 4 + Math.random() * 92, y = 2 + Math.random() * 70, s = .7 + Math.random() * .7;
    b.style.left = x + "%"; b.style.top = y + "%"; b.style.transform = "scale(" + s + ")";
    if (!b.animate) return;
    var a = b.animate([{ opacity: 0, translate: "0 -3px" }, { opacity: 1, translate: "0 0", offset: .06 }, { opacity: 1, translate: "0 0", offset: .45 },
                       { opacity: .9, translate: "0 " + (8 + Math.random() * 26) + "px", offset: .8 }, { opacity: 0, translate: "0 " + (12 + Math.random() * 30) + "px" }],
                      { duration: 4000 + Math.random() * 3000, easing: "ease-in" });
    a.onfinish = function () { b.remove(); };
  }
  function rollWeed() {                                           /* the dust brings a tumbleweed across the street */
    if (!tumble.animate) return;
    tumble.style.opacity = 1;
    var a = tumble.animate([{ transform: "translateX(" + (-scene.clientWidth * .2) + "px)" }, { transform: "translateX(" + (scene.clientWidth * 1.1) + "px)" }], { duration: 5200, easing: "linear" });
    a.onfinish = function () { tumble.style.opacity = 0; };
  }
  function wxLoop(ts) {
    WX.raf = 0; wxc.style.display = ""; var t = ts || performance.now();
    var dt = Math.min(.05, (t - (WX.last || t)) / 1000) || .016; WX.last = t;
    var w = stage.clientWidth, h = stage.clientHeight;
    WX.I += (WX.target - WX.I) * (1 - Math.exp(-dt / 1.2));      /* the weather comes and goes gradually */
    var kind = WX.kind || WX.fading, want = Math.round((kind === "dust" ? 260 : 170) * (LITE ? .6 : 1) * WX.I);
    if (WX.kind) WX.fading = WX.kind;
    while (WX.parts.length < want) WX.parts.push(kind === "dust"
      ? { x: Math.random() * w - w * .3, y: Math.random() * h, v: 380 + Math.random() * 520, r: 1 + Math.random() * 2.6, a: .35 + Math.random() * .5, ph: Math.random() * 6 }
      : { x: Math.random() * w * 1.2, y: Math.random() * h - h, v: 700 + Math.random() * 400, len: 10 + Math.random() * 14, a: .2 + Math.random() * .3 });
    if (WX.parts.length > want) WX.parts.length = want;
    w2.setTransform(WD, 0, 0, WD, 0, 0); w2.clearRect(0, 0, w, h);
    /* drawn in three shades, one path each: a style change and a stroke per drop is what makes a phone stutter */
    var B = [[], [], []]; WX.parts.forEach(function (p) { B[p.a > .62 || (kind === "rain" && p.a > .4) ? 2 : p.a > .5 || (kind === "rain" && p.a > .3) ? 1 : 0].push(p); });
    if (kind === "rain") {
      w2.lineCap = "round"; w2.lineWidth = 1.2; w2.fillStyle = "rgba(210,225,240,.35)";
      B.forEach(function (bk, i) {
        w2.strokeStyle = "rgba(205,220,240," + ((.25 + i * .1) * WX.I).toFixed(3) + ")"; w2.beginPath();
        bk.forEach(function (p) {
          p.y += p.v * dt; p.x -= p.v * .18 * dt;
          if (p.y > h) { p.y = -p.len - Math.random() * 60; p.x = Math.random() * w * 1.2; if (Math.random() < .5) w2.fillRect(p.x - 2, h - 3 - Math.random() * h * .15, 4, 1); }
          w2.moveTo(p.x, p.y); w2.lineTo(p.x + p.len * .18, p.y - p.len);
        });
        w2.stroke();
      });
    } else if (kind === "dust") {
      var gust = .75 + .35 * Math.sin(t / 1300) + .15 * Math.sin(t / 370);
      B.forEach(function (bk, i) {
        w2.fillStyle = "rgba(225,180,120," + ((.42 + i * .17) * WX.I).toFixed(3) + ")";
        bk.forEach(function (p) {
          p.x += p.v * gust * dt; p.y += Math.sin(t / 400 + p.ph) * 22 * dt + 10 * dt;
          if (p.x > w + 10) { p.x = -10 - Math.random() * 80; p.y = Math.random() * h; }
          w2.fillRect(p.x, p.y, p.r * 2.4, p.r);
        });
      });
    }
    if (WX.kind || WX.I > .01) WX.raf = requestAnimationFrame(wxLoop);
    else { WX.parts = []; WX.fading = null; w2.clearRect(0, 0, w, h); wxc.style.display = "none"; }
  }

  /* ---- the lasso: a rope flies in from off the right, loops the sign-in card off to the left and hauls it in ---- */
  var LS = { svg: null, raf: 0 };
  function stopLasso() { cancelAnimationFrame(LS.raf); LS.raf = 0; if (LS.svg) { LS.svg.remove(); LS.svg = null; } }
  function lassoIn() {
    stopLasso();
    var NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"); svg.id = "lasso"; svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = '<path class="r0" fill="none" stroke="#3a2412" stroke-width="7" stroke-linecap="round"/><path class="r1" fill="none" stroke="#e0bd84" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="5 3"/>' +
                    '<ellipse class="k0" fill="none" stroke="#3a2412" stroke-width="7"/><ellipse class="k1" fill="none" stroke="#e0bd84" stroke-width="3.6"/>';
    stage.appendChild(svg); LS.svg = svg;
    var r0 = svg.querySelector(".r0"), r1 = svg.querySelector(".r1"), k0 = svg.querySelector(".k0"), k1 = svg.querySelector(".k1");
    var w = stage.clientWidth, h = stage.clientHeight; svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    card.style.opacity = 1;
    var s = stage.getBoundingClientRect(), cr = card.getBoundingClientRect(), off = -(cr.right - s.left + 40);
    card.style.transform = "translateX(" + off + "px) rotate(-6deg)";            /* waiting off to the left */
    var O = { x: w + 12, y: Math.max(20, cr.top - s.top - h * .12) }, t0_ = performance.now();
    Sound.fx("lasso", 0.6);
    /* 0-.7 s whirled off-screen (heard, not seen) . .7-1.05 thrown across . 1.05 caught and pulled tight
       1.05-1.6 the card hauled in . 1.6-1.75 slack . 1.75-2.0 flicked off to the right */
    function end() { var c = card.getBoundingClientRect(); return { x: c.right - s.left - 4, y: c.top - s.top + c.height * .5 }; }
    var pulled = false;
    function rope(e, sag, rx, ry) {
      var mx = (O.x + e.x) / 2, my = (O.y + e.y) / 2 + sag, d = "M" + O.x + " " + O.y + " Q" + mx.toFixed(1) + " " + my.toFixed(1) + " " + e.x.toFixed(1) + " " + e.y.toFixed(1);
      r0.setAttribute("d", d); r1.setAttribute("d", d);
      [k0, k1].forEach(function (k) { k.setAttribute("cx", e.x.toFixed(1)); k.setAttribute("cy", e.y.toFixed(1)); k.setAttribute("rx", rx); k.setAttribute("ry", ry); });
    }
    (function step() {
      LS.raf = 0; if (!LS.svg) return;
      var u = (performance.now() - t0_) / 1000;
      if (u < .7) { svg.style.opacity = 0; }
      else if (u < 1.05) {                                                       /* the throw: the loop sails across in an arc */
        svg.style.opacity = 1; var q = (u - .7) / .35, ex = O.x + (-30 - O.x) * q, ey = O.y + ((cr.top - s.top + cr.height / 2) - O.y) * q - Math.sin(Math.PI * q) * h * .12;
        rope({ x: ex, y: ey }, Math.sin(Math.PI * q) * 30, 16, 9);
      } else if (u < 1.6) {                                                      /* caught: hauled in, the rope tight */
        if (!pulled) {
          pulled = true;
          anim(card, [{ transform: "translateX(" + off + "px) rotate(-6deg)" }, { transform: "translateX(14px) rotate(1.5deg)", offset: .72 }, { transform: "translateX(-4px) rotate(-.4deg)", offset: .88 }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.3,.1,.3,1)" });
          shake(4, 160);
        }
        rope(end(), 4, 6, 14);
      } else if (u < 1.75) rope(end(), (u - 1.6) / .15 * 60, 6, 14);             /* it goes slack */
      else if (u < 2.0) {                                                        /* and is flicked away */
        var q2 = (u - 1.75) / .25, e = end(); e.x += (O.x + 60 - e.x) * q2 * q2; e.y += (O.y - e.y) * q2;
        rope(e, 60 * (1 - q2) - 40 * Math.sin(Math.PI * q2), 14 * (1 - q2) + 4, 9);
      } else { stopLasso(); return; }
      LS.raf = requestAnimationFrame(step);
    })();
  }

  /* ==== the town by the clock, and the people in it ====
     Sky, sun and moon follow the time on this computer: morning, noon, afternoon, evening, night.
     At night the moon shows tonight's real phase. Vultures circle by day, a train crosses the far
     hills every few minutes, cowboys pass along the street, two deputies keep watch, and at high
     noon two cowboys settle things in the street. Sprites from design/town/town_folk.py.
     To see things at once: ?time=morning|noon|afternoon|evening|night  ?show=train,duel,vultures,walker */
  var Q = (function () { try { return new URLSearchParams(location.search); } catch (e) { return { get: function () { return null; } }; } })();
  var SHOW = (Q.get("show") || "").split(",");
  var l1 = $("l1"), l2 = $("l2"), l4 = $("l4"), sky2 = $("sky2"), moonC = $("moon"), trainEl = $("train");
  var TODS = {
    morning: { sky: "morning", night: .06, glow: 0 }, noon: { sky: "noon", night: 0, glow: 0 }, afternoon: { sky: "noon", night: .1, glow: 0 },
    evening: { sky: null, night: .3, glow: .7 }, night: { sky: "night", night: .45, glow: 1 }
  };
  function todName() {
    var f = Q.get("time"); if (TODS[f]) return f;
    var h = new Date().getHours();
    return h >= 5 && h < 11 ? "morning" : h >= 11 && h < 14 ? "noon" : h >= 14 && h < 17 ? "afternoon" : h >= 17 && h < 19 ? "evening" : "night";
  }
  var TOD = todName();
  function applyTod(soft) {
    TOD = todName(); var T = TODS[TOD];
    Object.keys(TODS).forEach(function (k) { stage.classList.toggle("tod-" + k, k === TOD); });
    if (T.sky) sky2.style.backgroundImage = "url(assets/img/town/sky-" + T.sky + ".png)";
    sky2.style.opacity = T.sky ? 1 : 0;
    if (!running) { night.style.transition = l4g.style.transition = soft ? "opacity 3s ease" : ""; night.style.opacity = T.night; l4g.style.opacity = T.glow; }
    drawMoon();
  }
  function clearTod() { Object.keys(TODS).forEach(function (k) { stage.classList.remove("tod-" + k); }); sky2.style.opacity = 0; night.style.transition = l4g.style.transition = ""; }
  setInterval(function () { if (!running && todName() !== TOD) applyTod(true); }, 60000);
  function drawMoon() {                                          /* tonight's moon, a pixel at a time */
    var c = moonC.getContext("2d"), N = 16, R = 6.5, cx = 8, cy = 8, img = c.createImageData(N, N);
    var SYN = 29.530588853, age = ((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % SYN; if (age < 0) age += SYN;
    var p = Q.get("moon") != null ? +Q.get("moon") % 1 : age / SYN, k = Math.cos(2 * Math.PI * p), craters = { "9,6": 1, "6,9": 1, "10,10": 1, "7,5": 1, "5,7": 1 };
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var nx = (x + .5 - cx) / R, ny = (y + .5 - cy) / R, d2 = nx * nx + ny * ny; if (d2 > 1) continue;
      var w = Math.sqrt(1 - ny * ny), lit = p < .5 ? nx >= w * k : nx <= -w * k, i = (y * N + x) * 4;
      var col = lit ? (craters[x + "," + y] ? [204, 194, 162, 255] : d2 > .75 ? [222, 212, 178, 255] : [240, 233, 202, 255]) : [64, 66, 98, 120];   /* the dark part, faintly lit by the earth */
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = col[3];
    }
    c.putImageData(img, 0, 0);
    var names = [[.03, "new moon"], [.22, "waxing crescent"], [.28, "first quarter"], [.47, "waxing gibbous"], [.53, "full moon"], [.72, "waning gibbous"], [.78, "last quarter"], [.97, "waning crescent"], [1, "new moon"]];
    for (var j = 0; j < names.length; j++) if (p < names[j][0]) { moonC.setAttribute("aria-label", "Tonight's moon: " + names[j][1]); break; }
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function later(fn, a, b) { setTimeout(fn, (a + Math.random() * (b - a)) * 1000); }
  var dayTime = function () { return TOD === "morning" || TOD === "noon" || TOD === "afternoon"; };

  /* ---- vultures, circling high on a warm current ---- */
  function vultures() {
    if (reduce || running || !dayTime()) return;
    var n = 2 + (Math.random() < .5 ? 1 : 0), cx = 22 + Math.random() * 50, cy = 12 + Math.random() * 10, dir = Math.random() < .5 ? 1 : -1, t0 = performance.now(), dur = 26000, birds = [];
    for (var i = 0; i < n; i++) {
      var el = document.createElement("div"); el.className = "px vult"; l1.appendChild(el);
      birds.push({ el: el, ph: i * 2 * Math.PI / n + Math.random() * .5, rx: 5 + Math.random() * 3, ry: 2 + Math.random(), w: .32 + Math.random() * .08, flapAt: Math.random() * 4000 });
      requestAnimationFrame(function (e) { return function () { e.style.opacity = 1; }; }(el));
    }
    (function fly(now) {
      var t = (now - t0) / 1000;
      birds.forEach(function (b) {
        var a = b.ph + b.w * t * dir, x = cx + dir * t * .25 + b.rx * Math.cos(a), y = cy + b.ry * Math.sin(a), vx = -Math.sin(a) * dir;
        b.el.style.left = x + "%"; b.el.style.top = y + "%"; b.el.style.transform = vx < 0 ? "scaleX(-1)" : "none";
        var f = ((now - t0 + b.flapAt) % 4200) < 600 ? [0, 1, 2, 1][Math.floor(((now - t0 + b.flapAt) % 4200) / 150)] : 1;   /* soaring, with a flap now and then */
        b.el.style.backgroundPosition = "calc(var(--u) * " + -(f * 21 + 1) + ") calc(var(--u) * -1)";
      });
      if (now - t0 > dur - 2500) birds.forEach(function (b) { b.el.style.opacity = 0; });
      if (now - t0 < dur) requestAnimationFrame(fly); else birds.forEach(function (b) { b.el.remove(); });
    })(t0);
  }

  /* ---- the train on the far horizon, its smoke rising over the rooftops ---- */
  var trainOn = false;
  function runTrain() {
    if (reduce || running || trainOn) return; trainOn = true;
    var t0 = performance.now(), dur = 34000, lastF = 0, lastP = 0, fr = 0;
    Sound.fx("train", 0.5);
    (function go(now) {
      var u = (now - t0) / dur, left = 102 - 118 * u;
      trainEl.style.left = left + "%";
      if (now - lastF > 150) { lastF = now; fr ^= 1; trainEl.style.backgroundPosition = "calc(var(--u) * " + -(fr * 66 + 1) + ") calc(var(--u) * -1)"; }
      if (now - lastP > 240) { lastP = now; puff(left + 4.5 / 4.8, 65.56); }
      if (u < 1) requestAnimationFrame(go); else { trainOn = false; trainEl.style.left = "102%"; }
    })(t0);
  }
  function puff(x, y) {
    var p = document.createElement("div"), U = l2.clientHeight / 180; p.className = "puff"; p.style.left = x + "%"; p.style.top = y + "%"; l2.appendChild(p);
    var dx = (10 + Math.random() * 10) * U, dy = -(58 + Math.random() * 18) * U;   /* high enough to clear the rooftops */
    var a = p.animate([{ transform: "translate(0,0) scale(.5)", opacity: .95 }, { transform: "translate(" + dx * .4 + "px," + dy * .5 + "px) scale(1.8)", opacity: .7, offset: .4 }, { transform: "translate(" + dx + "px," + dy + "px) scale(3.2)", opacity: 0 }], { duration: 4200 + Math.random() * 900, easing: "ease-out" });
    a.onfinish = function () { p.remove(); };
  }

  /* ---- townsfolk ---- */
  function fpos(el, x, feet) { el.style.left = (x / 480 * 100) + "%"; el.style.top = ((feet - 18) / 180 * 100) + "%"; el.style.zIndex = feet; }
  function fframe(el, col, row) { el.style.backgroundPosition = "calc(var(--u) * " + -(col * 18 + 1) + ") calc(var(--u) * " + -(row * 20 + 1) + ")"; }   /* 18 x 20 cells with a 1px gutter */
  function person(row, x, feet) { var el = document.createElement("div"); el.className = "px folk"; l4.appendChild(el); fframe(el, 4, row); fpos(el, x, feet); return el; }
  /* walk from x0 to x1 (town pixels); resolves on arrival. opt: hatless, fast, spur (jingle every other step) */
  function walk(el, row, x0, x1, feet, speed, opt) {
    opt = opt || {};
    return new Promise(function (done) {
      var dir = x1 > x0 ? 1 : -1, t0 = performance.now(), dur = Math.abs(x1 - x0) / speed * 1000, cols = opt.hatless ? [7, 8, 9, 10] : [0, 1, 2, 3], ms = opt.fast ? 85 : 140, last = -1;
      el.classList.toggle("left", dir < 0);
      (function step(now) {
        if (!el.isConnected) return done(false);
        var u = Math.min(1, (now - t0) / dur); fpos(el, x0 + (x1 - x0) * u, feet);
        var k = Math.floor((now - t0) / ms) % 4;
        if (k !== last) { last = k; fframe(el, cols[k], row); if (opt.spur && k % 2 === 0) Sound.fx("spur", 0.12, 0.9 + Math.random() * .2); }
        if (u < 1) requestAnimationFrame(step); else { fframe(el, opt.hatless ? 11 : 4, row); done(true); }
      })(t0);
    });
  }
  function walker() {
    if (reduce || running) return;
    var dir = Math.random() < .5 ? 1 : -1, x0 = dir > 0 ? -20 : 484, x1 = dir > 0 ? 484 : -20, speed = 10 + Math.random() * 5, rows = [0, 1, 2].sort(function () { return Math.random() - .5; });
    var n = Math.random() < .3 ? 2 : 1;
    for (var i = 0; i < n; i++) (function (row, off, feet) {
      var el = person(row, x0 - dir * off, feet);
      walk(el, row, x0 - dir * off, x1 - dir * off, feet, speed).then(function () { el.remove(); });
    })(rows[i], i * 15, 151 + i * 2 + Math.floor(Math.random() * 2));
  }
  /* two deputies: one walks his beat in front of the store, one stands by the saloon */
  var deputies = null, duelOn = false, duelMid = 0;
  function startDeputies() {
    if (deputies) return;
    var a = person(3, 300, 147), b = person(3, 412, 147); deputies = [a, b];
    if (reduce) return;
    (async function beat() {
      var x = 300;
      for (;;) {
        if (duelOn) { a.classList.toggle("left", duelMid < x); await sleep(1000); continue; }
        var to = x < 316 ? 330 + Math.random() * 6 : 296 + Math.random() * 6;
        await walk(a, 3, x, to, 147, 7); x = to;
        await sleep(2500 + Math.random() * 4500);
        if (Math.random() < .5) { a.classList.toggle("left"); await sleep(1500 + Math.random() * 2000); }
      }
    })();
    (function look() { setTimeout(function () { b.classList.toggle("left", duelOn ? duelMid < 420 : Math.random() < .5); look(); }, duelOn ? 800 : 5000 + Math.random() * 7000); })();
  }

  /* ---- high noon: two cowboys face off in the street. One is quicker; the other's hat goes flying ---- */
  async function duel() {
    if (reduce || running || duelOn) return;
    var r = l4.getBoundingClientRect(), s = stage.getBoundingClientRect(), cr = card.getBoundingClientRect();
    function tx(px) { return (px - r.left) / r.width * 480; }
    var v0 = tx(s.left) + 10, v1 = tx(s.right) - 26, cL = tx(cr.left - 14) - 16, cR = tx(cr.right + 14);
    var roomL = cL - v0, roomR = v1 - cR, onLeft = roomL >= 60 || roomL >= roomR, room = onLeft ? roomL : roomR;   /* the left if it fits: the deputies are on the right */
    if (room < 60) return;                                         /* no clear stretch of street beside the card (a phone): not today */
    duelOn = true;
    var mid = onLeft ? (v0 + cL) / 2 : (cR + v1) / 2, gap = Math.min(20, (room - 24) / 2), xa = mid - gap - 8, xb = mid + gap - 8, feet = 153;
    var ax0 = onLeft ? v0 - 26 : cR - 22, bx0 = onLeft ? cL + 6 : v1 + 26, rows = [0, 1, 2].sort(function () { return Math.random() - .5; }), ra = rows[0], rb = rows[1];
    duelMid = mid;
    Sound.fx("noon", 0.5); Sound.duck(0.25, 11);
    var a = person(ra, ax0, feet), b = person(rb, bx0, feet), T = 3600;
    await Promise.all([walk(a, ra, ax0, xa, feet, Math.abs(xa - ax0) / T * 1000, { spur: true }), walk(b, rb, bx0, xb, feet, Math.abs(xb - bx0) / T * 1000, { spur: true })]);
    a.classList.remove("left"); b.classList.add("left");           /* face to face */
    Sound.fx("duel", 0.6);
    await sleep(1200); if (!reduce) rollWeed();
    await sleep(2500);
    fframe(a, 5, ra); await sleep(120); fframe(b, 5, rb);           /* both draw: he is quicker */
    var m = document.createElement("div"); m.className = "px muzzle"; l4.appendChild(m); fpos(m, xa + 16, feet - 18 + 7 + 18); m.style.zIndex = 200;
    m.animate([{ opacity: 1, transform: "scale(1.3)" }, { opacity: 0, transform: "scale(.6)" }], { duration: 160 }).onfinish = function () { m.remove(); };
    Sound.fx("bang", 0.7); shake(3, 180);
    if (!cHold && document.activeElement !== $("pass")) { cHold = true; clerkPlay("alert", true); }
    fframe(b, 11, rb);                                              /* his hat is shot clean off */
    var hat = person(rb, xb, feet), U = l4.clientHeight / 180; fframe(hat, 12, rb);
    hat.animate([{ transform: "translate(0,0) rotate(0)" }, { transform: "translate(" + 9 * U + "px," + (-16 * U) + "px) rotate(220deg)", offset: .45, easing: "ease-in" }, { transform: "translate(" + 17 * U + "px," + 8 * U + "px) rotate(380deg)" }], { duration: 900, easing: "ease-out", fill: "forwards" });
    await sleep(650);
    walk(b, rb, xb, bx0, feet, 42, { hatless: true, fast: true }).then(function () { b.remove(); });   /* and he runs for it */
    await sleep(500); fframe(a, 4, ra);
    await sleep(500); fframe(a, 6, ra);                             /* tips his hat to the town */
    if (!cHold && document.activeElement !== $("pass")) { cHold = true; clerkPlay("approve", true); }
    await sleep(1000); fframe(a, 4, ra);
    await sleep(700);
    hat.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1500, delay: 2500, fill: "forwards" }).onfinish = function () { hat.remove(); };
    await walk(a, ra, xa, ax0, feet, 12); a.remove();
    duelOn = false;
  }

  /* ---- start the town once the intro is over ---- */
  var townGoing = false;
  function startTown() {
    if (townGoing) return; townGoing = true;
    startDeputies();
    (function walkers() { later(function () { if (TOD !== "night" || Math.random() < .3) walker(); walkers(); }, 25, 55); })();
    setTimeout(walker, 6000 + Math.random() * 8000);
    (function birds() { later(function () { vultures(); birds(); }, 70, 150); })();
    later(vultures, 15, 35);
    (function trains() { later(function () { runTrain(); trains(); }, 150, 300); })();
    later(runTrain, 30, 70);
    (function duels() { later(function () { if (TOD === "noon") duel(); duels(); }, 180, 300); })();
    if (TOD === "noon") later(duel, 12, 25);
    if (SHOW.indexOf("train") >= 0) setTimeout(runTrain, 2000);
    if (SHOW.indexOf("duel") >= 0) setTimeout(duel, 2500);
    if (SHOW.indexOf("vultures") >= 0) setTimeout(vultures, 1500);
    if (SHOW.indexOf("walker") >= 0) setTimeout(walker, 1000);
  }

  /* ---- the saloon piano: louder the nearer your pointer is to the saloon; notes drift out ---- */
  var PN = { vol: 0, t: 0, notesT: 0, R: null };
  function saloonRect() {
    var r = l4.getBoundingClientRect(), s = stage.getBoundingClientRect(), k = r.width / 480, kh = r.height / 180;
    var R = { l: r.left + 77 * k - s.left, r: r.left + 144 * k - s.left, t: r.top + 70 * kh - s.top, b: r.top + 142 * kh - s.top };
    R.r = Math.max(R.r, 70); R.l = Math.min(R.l, R.r - 50);           /* mostly off the edge on narrow screens: keep a corner to hover */
    return R;
  }
  function pianoAt(x, y) {
    var R = saloonRect(), dx = Math.max(R.l - x, 0, x - R.r), dy = Math.max(R.t - y, 0, y - R.b), d = Math.hypot(dx, dy);
    PN.R = R; PN.vol = d <= 0 ? .5 : Math.max(0, .5 * (1 - d / 240)); Sound.piano(PN.vol);
    if (PN.vol > .18 && Sound.live() && !PN.notesT) notes();
  }
  function notes() {
    PN.notesT = setTimeout(function () {
      PN.notesT = 0; if (PN.vol <= .18 || !Sound.live() || running) return;
      var n = document.createElement("span"), R = PN.R; n.className = "note8"; n.textContent = Math.random() < .5 ? "♪" : "♫";
      var x = Math.max(12, Math.min(R.r - 26, W - 30)) + Math.random() * 16, y = R.t + (R.b - R.t) * (.3 + Math.random() * .2);
      n.style.left = x + "px"; n.style.top = y + "px"; stage.appendChild(n);
      n.animate([{ transform: "translate(0,0) rotate(-8deg)", opacity: 0 }, { transform: "translate(8px,-24px) rotate(6deg)", opacity: PN.vol * 1.8, offset: .3 }, { transform: "translate(-6px,-70px) rotate(-6deg)", opacity: 0 }], { duration: 2400, easing: "ease-out" }).onfinish = function () { n.remove(); };
      notes();
    }, 650 + Math.random() * 300);
  }
  stage.addEventListener("pointermove", function (e) {
    if (running) return;
    var now = performance.now(); if (now - PN.t < 80) return; PN.t = now;
    var s = stage.getBoundingClientRect(); pianoAt(e.clientX - s.left, e.clientY - s.top);
  });
  stage.addEventListener("pointerleave", function () { PN.vol = 0; Sound.piano(0); });
  stage.addEventListener("pointerdown", function (e) {             /* on a touch screen, tap the saloon */
    if (running || e.pointerType === "mouse") return;
    var s = stage.getBoundingClientRect(), R = saloonRect(), x = e.clientX - s.left, y = e.clientY - s.top;
    if (x > R.l - 30 && x < R.r + 30 && y > R.t - 30 && y < R.b + 30) { setTimeout(function () { pianoAt(R.l + 5, R.t + 5); }, 50); clearTimeout(PN.off); PN.off = setTimeout(function () { PN.vol = 0; Sound.piano(0); }, 14000); }
  });

  /* ---- the card hangs from a nail: whip the pointer past it and it swings ---- */
  stage.addEventListener("scroll", function () { if (stage.scrollLeft || stage.scrollTop) stage.scrollLeft = stage.scrollTop = 0; });   /* older browsers without overflow: clip */
  var SW = { a: 0, v: 0, raf: 0, x: 0, t: 0, creak: 0 };
  stage.addEventListener("pointermove", function (e) {
    if (running || reduce || (W <= 600 && H > W)) return;           /* on a phone the card is a sheet, not a sign on a nail */
    var now = performance.now(), dt = now - SW.t, cr = card.getBoundingClientRect();
    if (dt > 0 && dt < 80 && e.clientX > cr.left - 160 && e.clientX < cr.right + 160 && e.clientY > cr.top - 120 && e.clientY < cr.bottom + 60) {
      var vx = (e.clientX - SW.x) / dt * 1000;
      if (Math.abs(vx) > 1500) {
        SW.v -= Math.sign(vx) * Math.min(1, (Math.abs(vx) - 1500) / 2500) * 8;
        if (now - SW.creak > 1600 && Math.abs(SW.v) > 9) { SW.creak = now; Sound.fx("creak", 0.1, 1.7); }
        if (!SW.raf) { SW.last = now; SW.raf = requestAnimationFrame(swing); }
      }
    }
    SW.x = e.clientX; SW.t = now;
  });
  function swing(now) {
    var dt = Math.min(.04, (now - SW.last) / 1000); SW.last = now; SW.raf = 0;
    var w = 2 * Math.PI * 1.05;
    SW.v += (-w * w * SW.a - 2 * .11 * w * SW.v) * dt; SW.a = SW.a + SW.v * dt; if (Math.abs(SW.a) > 4) { SW.a = Math.sign(SW.a) * 4; SW.v *= -.4; }   /* the string goes taut */
    if (Math.abs(SW.a) < .01 && Math.abs(SW.v) < .05) { SW.a = SW.v = 0; card.style.rotate = ""; return; }
    card.style.rotate = SW.a.toFixed(3) + "deg"; SW.raf = requestAnimationFrame(swing);
  }

  /* ---- three wrong tries: Kuwa slides a note out from under the card ---- */
  var wrongs = 0;
  function wrongTry(msg) {
    wrongs++;
    if (wrongs >= 3 || /lock/i.test(msg || "")) setTimeout(pinchHint, 900);
  }
  function pinchHint() {
    var n = $("pinch"); if (!n.hidden) return;
    var side = stage.clientWidth - card.getBoundingClientRect().right > 260;           /* beside the card if there is room, else below it */
    if (matchMedia("(max-width: 600px) and (orientation: portrait)").matches) {           /* a phone: it pops up above the sheet, over the town */
      n.classList.remove("side"); n.hidden = false; Sound.fx("paper", 0.6);
      if (n.animate && !reduce) n.animate([{ transform: "translate(-50%,40px) rotate(-1deg)", opacity: 0 }, { transform: "translate(-50%,0) rotate(-1deg)", opacity: 1 }], { duration: 500, easing: "cubic-bezier(.2,1.3,.4,1)" });
      clerkStill(28); setTimeout(function () { if (document.activeElement === $("pass")) clerkStill(13); else if (!cHold) clerkPlay("idle"); }, 1300); return;
    }
    n.classList.toggle("side", side); n.hidden = false; Sound.fx("paper", 0.6);
    if (n.animate && !reduce) n.animate(side
      ? [{ transform: "translate(-100%,0) rotate(2deg)", clipPath: "inset(0 0 0 100%)" }, { transform: "translate(0,0) rotate(2deg)", clipPath: "inset(0 0 0 0)" }]
      : [{ transform: "translate(-50%,-100%) rotate(-1.2deg)", clipPath: "inset(100% 0 0 0)" }, { transform: "translate(-50%,0) rotate(-1.2deg)", clipPath: "inset(0 0 0 0)" }], { duration: 750, easing: "cubic-bezier(.2,.8,.3,1)" });
    if (!side) setTimeout(function () { n.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }); }, 760);
    clerkStill(28); setTimeout(function () { if (document.activeElement === $("pass")) clerkStill(13); else if (!cHold) clerkPlay("idle"); }, 1300);
  }
  $("pinch").addEventListener("click", function () { this.hidden = true; });

  /* ---- impact pieces ---- */
  function buildCrack() {
    var cx = W / 2, cy = H * .55, R = Math.max(W, H), out = "", rays = [];
    for (var i = 0; i < 15; i++) {
      var a = (i / 15) * Math.PI * 2 + (Math.random() - .5) * .3, len = R * (.22 + Math.random() * .5), pts = [[cx, cy]], n = 5;
      for (var j = 1; j <= n; j++) { var r = len * j / n, aa = a + (Math.random() - .5) * .22; pts.push([cx + Math.cos(aa) * r, cy + Math.sin(aa) * r]); }
      rays.push(pts);
      out += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
    }
    [1, 2, 3].forEach(function (ring) {
      for (var i = 0; i < 15; i++) { if (Math.random() < .35) continue; var p = rays[i][ring], q = rays[(i + 1) % 15][ring]; out += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; }
    });
    crack.setAttribute("viewBox", "0 0 " + W + " " + H);
    crack.innerHTML = '<g fill="none" stroke="#1a0f08" stroke-width="5" opacity=".55" transform="translate(2,2)">' + out + '</g><g fill="none" stroke="#fff6dc" stroke-width="2" stroke-linejoin="bevel">' + out + "</g>";
  }
  function burst() {
    var m = Math.min(W, H);
    for (var i = 0; i < 16; i++) {
      var f = document.createElement("div"); f.className = "f"; bits.appendChild(f);
      var a = Math.random() * Math.PI * 2, d = m * (.18 + Math.random() * .3), x = Math.cos(a) * d, y = Math.sin(a) * d * .7 - m * .08, r = Math.random() * 360;
      anim(f, [{ transform: "translate(0,0) rotate(" + r + "deg) scale(.4)", opacity: 1, easing: "cubic-bezier(.1,.8,.3,1)" },
               { transform: "translate(" + x + "px," + y + "px) rotate(" + (r + 200) + "deg) scale(1)", opacity: 1, offset: .22, easing: "ease-in-out" },
               { transform: "translate(" + (x + 40) + "px," + (y + m * .16) + "px) rotate(" + (r + 150) + "deg) scale(1)", opacity: 1, offset: .6, easing: "ease-in-out" },
               { transform: "translate(" + (x - 30) + "px," + (y + m * .4) + "px) rotate(" + (r + 260) + "deg) scale(1)", opacity: 0 }], { duration: 2400 + Math.random() * 900, easing: "linear" });
    }
    for (var j = 0; j < 9; j++) {
      var p = document.createElement("div"); p.className = "d"; bits.appendChild(p);
      var b = Math.random() * Math.PI * 2, e = m * (.1 + Math.random() * .3);
      anim(p, [{ transform: "translate(0,0) scale(1)", opacity: .8 }, { transform: "translate(" + Math.cos(b) * e + "px," + Math.sin(b) * e * .6 + "px) scale(" + (5 + Math.random() * 7) + ")", opacity: 0 }], { duration: 900 + Math.random() * 500, easing: "ease-out" });
    }
  }
  function shake(px, ms) {
    var k = [{ transform: "translate(0,0)" }];
    for (var i = 0; i < 9; i++) { var f = 1 - i / 9; k.push({ transform: "translate(" + ((Math.random() - .5) * 2 * px * f) + "px," + ((Math.random() - .5) * 2 * px * f) + "px)" }); }
    k.push({ transform: "translate(0,0)" }); anim(stage, k, { duration: ms, fill: "none", easing: "linear" });
  }

  /* ---- the intro ---- */
  function finish(focus, natural) {
    clearAll(); stopLasso(); running = false; wideOff(0); stage.classList.remove("intro"); grain.style.display = "none";
    introGoing = false;
    if (natural) { if (Sound.live()) Sound.playMusic("signin-loop", { loop: true, vol: 0.45, delay: 0.76, fadeIn: 0.8 }); }   /* the intro rings out; the loop comes in on the next bar */
    else musicNow(1.2);
    curtL.style.transform = "translateX(-101%)"; curtR.style.transform = "translateX(101%)";
    barT.style.transform = "translateY(-101%)"; barB.style.transform = "translateY(101%)";
    [kuwa, hd, title, flash, crack, grain, sil, tumble, shade].forEach(function (e) { e.style.opacity = 0; });
    fake.hidden = true; stage.classList.remove("nocur"); blowing = false; kuwa.style.transform = "none";
    applyTod(false);
    CAM.forEach(function (c, k) { $(c[0]).style.transform = camEnd(k); });
    logoWrap.style.opacity = 1; logoWrap.style.transform = "none"; logoWrap.style.filter = "none";
    card.style.opacity = 1; card.style.transform = "none"; clerk.style.opacity = 1; clerk.style.transform = "none";
    skip.hidden = true; replay.hidden = false; cHold = false; clerkPlay("idle");
    planWeather(); startTown();
    if (focus) ($("user").value ? $("pass") : $("user")).focus({ preventScroll: true });
  }
  function play() {
    clearAll(); stopLasso(); stopWeather(true); clearTod(); Sound.piano(0); running = true; wide = true; sceneKey = ""; stage.classList.add("intro"); grain.style.display = ""; layout();
    t0 = performance.now(); introGoing = true; Sound.stopMusic(0.3); musicNow();
    var s = 96 * K;
    skip.hidden = false; replay.hidden = true;
    curtL.style.transform = curtR.style.transform = barT.style.transform = barB.style.transform = "none";
    [logoWrap, card, clerk, night, flash, crack, hd, sil, tumble, kuwa, title, shade].forEach(function (e) { e.style.opacity = 0; });
    grain.style.opacity = 0; l4g.style.opacity = .5;   /* no film grain on the title card; it comes in softly with Kuwa's eyes */ kb.style.opacity = 1; kb.style.filter = "none"; ke.style.opacity = 0;
    CAM.forEach(function (c) { $(c[0]).style.transform = "none"; });

    /* 0. title card */
    anim(title, [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "scale(1)", offset: .2 }, { opacity: 1, transform: "scale(1.02)", offset: .8 }, { opacity: 0, transform: "scale(1.03)" }], { duration: 2300, easing: "linear" });

    at(2300, function () { anim(grain, [{ opacity: 0 }, { opacity: .3 }], { duration: 900 }); });
    /* 1. first peek: eyes in the dark, then the hat */
    var e1 = W / 2 - s * 0.22, y1 = H * .06, p1 = "translate(" + (-e1) + "px," + y1 + "px) rotate(12deg)";
    at(2500, function () {
      kuwa.style.opacity = 1; kuwa.style.transform = p1; kb.style.opacity = 0; frame(kb, 26, K);
      anim(ke, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
      var u = ke.children, blink = [{ transform: "scaleY(1)" }, { transform: "scaleY(.08)", offset: .5 }, { transform: "scaleY(1)" }];
      at(650, function () { anim(u[0], blink, { duration: 150, fill: "none" }); anim(u[1], blink, { duration: 150, fill: "none" }); });
      at(1000, function () { anim(u[0], blink, { duration: 150, fill: "none" }); anim(u[1], blink, { duration: 150, fill: "none" }); });
    });
    at(3800, function () {
      anim(kb, [{ opacity: 0, filter: "brightness(.15)" }, { opacity: 1, filter: "brightness(1)" }], { duration: 420 });
      anim(ke, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    });
    at(4550, function () { anim(kuwa, [{ transform: p1 }, { transform: "translate(" + (-e1 - s * 1.2) + "px," + y1 + "px) rotate(12deg)" }], { duration: 260, easing: "ease-in" }); });
    /* 2. second peek: closer, bigger, sizing you up */
    var e2 = W / 2 - s * 0.2, y2 = -H * .04, sc = 1.75;
    at(5000, function () {
      kb.style.opacity = 1; kb.style.filter = "none"; ke.style.opacity = 0; frame(kb, 25, K);
      anim(kuwa, [{ transform: "translate(" + (e2 + s * 2) + "px," + y2 + "px) scale(" + sc + ") rotate(-10deg)", easing: "cubic-bezier(.2,.9,.3,1)" },
                  { transform: "translate(" + e2 + "px," + y2 + "px) scale(" + sc + ") rotate(-10deg)", offset: .22 },
                  { transform: "translate(" + (e2 - s * .08) + "px," + y2 + "px) scale(" + (sc * 1.06) + ") rotate(-7deg)", offset: .8, easing: "ease-in" },
                  { transform: "translate(" + (e2 + s * 2) + "px," + y2 + "px) scale(" + sc + ") rotate(-10deg)" }], { duration: 1500, easing: "linear" });
    });
    at(5450, function () { frame(kb, 3, K); }); at(5560, function () { frame(kb, 25, K); }); at(5800, function () { frame(kb, 24, K); });
    /* 3. the town, and a slow push down the main street */
    at(6600, function () {
      kuwa.style.opacity = 0;
      anim(curtL, [{ transform: "none" }, { transform: "translateX(-101%)" }], { duration: 1100, easing: "cubic-bezier(.7,0,.2,1)" });
      anim(curtR, [{ transform: "none" }, { transform: "translateX(101%)" }], { duration: 1100, easing: "cubic-bezier(.7,0,.2,1)" });
      CAM.forEach(function (c, k) { anim($(c[0]), [{ transform: "translateY(0%) scale(1)" }, { transform: camEnd(k) }], { duration: 6900, easing: "cubic-bezier(.4,0,.5,1)" }); });
      tumble.style.opacity = 1;
      anim(tumble, [{ transform: "translateX(0)" }, { transform: "translateX(" + (scene.clientWidth * 1.15) + "px)" }], { duration: 6500, easing: "linear" });
    });
    /* 4. his shadow crosses the sun */
    at(7900, function () {
      var q = [33, 34, 35, 36], n = 0, U = scene.clientHeight / 180 * 26 / 96;
      sil.style.opacity = 1;
      every(100, function () { n = (n + 1) % 4; sil.style.backgroundPosition = (-FR[q[n]][0] * 96 * U) + "px " + (-FR[q[n]][1] * 96 * U) + "px"; });
      anim(sil, [{ transform: "translate(0,0)", opacity: 0 }, { transform: "translate(" + (scene.clientWidth * .06) + "px," + (-scene.clientHeight * .05) + "px)", opacity: 1, offset: .15 }, { transform: "translate(" + (scene.clientWidth * .3) + "px," + (-scene.clientHeight * .2) + "px)", opacity: 1, offset: .85 }, { transform: "translate(" + (scene.clientWidth * .36) + "px," + (-scene.clientHeight * .26) + "px)", opacity: 0 }], { duration: 1500, easing: "linear" });
    });
    /* 5. his shadow sweeps the rooftops */
    at(9500, function () {
      var sw = scene.clientWidth;
      anim(shade, [{ transform: "translateX(" + (sw * .95) + "px) scale(.8)", opacity: 0 }, { transform: "translateX(" + (sw * .7) + "px) scale(.9)", opacity: .42, offset: .15 }, { transform: "translateX(" + (sw * .2) + "px) scale(1.15)", opacity: .42, offset: .85 }, { transform: "translateX(" + (-sw * .1) + "px) scale(1.25)", opacity: 0 }], { duration: 1150, easing: "cubic-bezier(.3,0,.7,1)" });
    });
    /* 6. he banks round, then dives */
    var big = 256 / s, small = Math.max(.1, 30 / s);
    at(10700, function () {
      var a = TAGS.bank[0], n = 0;
      kb.style.opacity = 1; kb.style.filter = "none"; kuwa.style.opacity = 1; frame(kb, a, K);
      every(80, function () { n = (n + 1) % 4; frame(kb, a + n, K); });
      anim(kuwa, [{ transform: "translate(" + (-W * .34) + "px," + (-H * .2) + "px) scale(" + (small * 1.9) + ") rotate(34deg)", opacity: 0 },
                  { transform: "translate(" + (-W * .2) + "px," + (-H * .32) + "px) scale(" + (small * 1.5) + ") rotate(26deg)", opacity: 1, offset: .25 },
                  { transform: "translate(" + (W * .02) + "px," + (-H * .36) + "px) scale(" + (small * 1.15) + ") rotate(12deg)", opacity: 1, offset: .7 },
                  { transform: "translate(" + (W * .09) + "px," + (-H * .3) + "px) scale(" + small + ") rotate(0deg)", opacity: 1 }], { duration: 1000, easing: "cubic-bezier(.3,0,.6,1)" });
    });
    at(11700, function () {
      var a = TAGS.fly8[0], n = 0;
      ivs.forEach(clearInterval); ivs = []; frame(kb, a, K);
      every(55, function () { n = (n + 1) % 8; frame(kb, a + n, K); });
      anim(kuwa, [{ transform: "translate(" + (W * .09) + "px," + (-H * .3) + "px) scale(" + small + ")" }, { transform: "translate(" + (-W * .03) + "px," + (-H * .12) + "px) scale(" + (big * .4) + ")", offset: .7 }, { transform: "translate(0px," + (-H * .04) + "px) scale(" + big + ")" }], { duration: 950, easing: "cubic-bezier(.5,0,.9,.5)" });
    });
    at(12650, function () {
      var n = 0;
      ivs.forEach(clearInterval); ivs = [];
      /* hide the small Kuwa for good: his earlier flight animations hold his opacity at 1, so an inline 0 alone would leave a ghost of him over the town */
      anims.forEach(function (a) { if (a.effect && a.effect.target === kuwa) a.cancel(); }); kuwa.style.opacity = 0;
      hd.style.opacity = 1; hd.style.backgroundPosition = "0 0";
      every(45, function () { n = (n + 1) % 8; hd.style.backgroundPosition = (-256 * n) + "px 0"; });
      anim(hd, [{ transform: "translate(0px," + (-H * .04) + "px) scale(1)" }, { transform: "translate(0px," + (H * .12) + "px) scale(" + (Math.max(W, H) / 256 * 2.1) + ")" }], { duration: 520, easing: "cubic-bezier(.6,0,1,.6)" });
    });
    /* 6. impact */
    at(13170, function () {
      hd.style.opacity = 0; ivs.forEach(clearInterval); ivs = [];
      anim(flash, [{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0 }], { duration: 240, easing: "linear" });
      buildCrack(); crack.style.opacity = 1;
      anim(crack, [{ transform: "scale(.25)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }], { duration: 130, easing: "ease-out" });
      crack.style.transformOrigin = "50% 55%";
      shake(26, 620); burst();
    });
    /* 7. the brand comes down */
    at(13550, function () {
      logoWrap.style.opacity = 1;
      /* the brand slams down in the middle of the screen; on a phone the logo then flies up to its corner in the sky */
      var SL = "translateY(20vh)", K = 1;
      if (W <= 600 && H > W) { var lr = logoWrap.getBoundingClientRect(), sr = stage.getBoundingClientRect(); SL = "translate(" + Math.round(W / 2 - (lr.left - sr.left + lr.width / 2)) + "px," + Math.round(H * .3 - (lr.top - sr.top + lr.height / 2)) + "px)"; K = 2.4; }
      logoWrap.dataset.slam = SL + "|" + K;
      anim(logoWrap, [{ transform: SL + " scale(" + 3.4 * K + ")", opacity: 0, filter: "brightness(2.6) saturate(1.6)", easing: "cubic-bezier(.7,0,1,.6)" },
                      { transform: SL + " scale(" + 1.38 * K + ")", opacity: 1, filter: "brightness(2.6) saturate(1.6)", offset: .3, easing: "cubic-bezier(.2,1.6,.4,1)" },
                      { transform: SL + " scale(" + 1.5 * K + ")", opacity: 1, filter: "brightness(1.5) saturate(1.3)", offset: .55 },
                      { transform: SL + " scale(" + 1.5 * K + ")", opacity: 1, filter: "brightness(1) saturate(1)" }], { duration: 900, easing: "linear" });
      at(270, function () { shake(14, 380); });
      anim(night, [{ opacity: 0 }, { opacity: .3 }], { duration: 600 });
    });
    at(14350, function () { anim(glint, [{ backgroundPosition: "140% 0" }, { backgroundPosition: "-40% 0" }], { duration: 800, easing: "ease-in-out", fill: "none" }); });
    /* the glass heals: cracks draw back into the point he hit */
    at(14450, function () { anim(crack, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.03)", opacity: 1, offset: .2, easing: "cubic-bezier(.6,0,.9,.4)" }, { transform: "scale(0)", opacity: .8 }], { duration: 700, easing: "linear" }); });
    /* 8. bars away, dusk falls, the window opens */
    at(15400, function () {
      var sk = (logoWrap.dataset.slam || "translateY(20vh)|1").split("|");
      anim(logoWrap, [{ transform: sk[0] + " scale(" + 1.5 * sk[1] + ")" }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.3,0,.2,1)" });
      anim(barT, [{ transform: "none" }, { transform: "translateY(-101%)" }], { duration: 700, easing: "ease-in-out" });
      anim(barB, [{ transform: "none" }, { transform: "translateY(101%)" }], { duration: 700, easing: "ease-in-out" });
      anim(grain, [{ opacity: .3 }, { opacity: 0 }], { duration: 900 });
      var T = TODS[todName()];                    /* dusk falls, or day breaks: the town by the clock */
      anim(night, [{ opacity: .3 }, { opacity: T.night }], { duration: 1500 });
      anim(l4g, [{ opacity: .5 }, { opacity: T.glow }], { duration: 1500 });
      running = false; applyTod(true); running = true;
      wideOff(900);
    });
    at(14350, lassoIn);   /* the card is lassoed in: the rope is whirled (heard) from here, caught at 15400 and the card is hauled in */
    /* 9. he lands on the window, shakes off the dust, straightens his hat */
    at(16400, function () {
      cHold = true; clearTimeout(cTimer); clerk.style.opacity = 1; frame(clerk, 29, 1);
      anim(clerk, [{ transform: "translateY(-70vh) rotate(-20deg)" }, { transform: "translateY(0) rotate(0deg)" }], { duration: 420, easing: "cubic-bezier(.5,0,1,.7)" });
    });
    at(16820, function () {
      frame(clerk, 16, 1);
      anim(card, [{ transform: "translateY(0)" }, { transform: "translateY(7px)", offset: .3 }, { transform: "translateY(0)" }], { duration: 300, fill: "none" });
      anim(clerk, [{ transform: "rotate(0)" }, { transform: "rotate(-9deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(-7deg)" }, { transform: "rotate(6deg)" }, { transform: "rotate(0)" }], { duration: 520, delay: 180, fill: "none", easing: "linear" });
    });
    at(17000, function () { frame(clerk, 0, 1); });
    at(17600, function () { frame(clerk, 18, 1); }); at(16020, function () { frame(clerk, 19, 1); }); at(16420, function () { frame(clerk, 18, 1); });
    at(18260, function () { finish(true, true); try { localStorage.setItem("calmsIntroDay", new Date().toDateString()); } catch (e) {} });
  }
  skip.addEventListener("click", function () { finish(true); });
  replay.addEventListener("click", function () { gearOpen(false); play(); });
  document.addEventListener("keydown", function (e) { if (running && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); finish(true); } });
  window.addEventListener("resize", function () { layout(); if (!running) CAM.forEach(function (c, k) { $(c[0]).style.transform = camEnd(k); }); });

  /* The intro plays every time this page is opened. It is skipped only when you come back
     by signing out (the link ends in #signin), so you are not made to watch it again. */
  var seen = location.hash === "#signin";
  layout(); frame(clerk, 0, 1);
  $("uiItem").addEventListener("click", function (e) { e.stopPropagation(); setLook("classic"); });
  $("uiSwitch").addEventListener("click", function () { setLook("western"); });
  if (CLASSIC) { card.style.opacity = 1; logoWrap.style.opacity = 1; skip.hidden = true; replay.hidden = true; }
  else if (reduce || seen) finish(false); else play();
})();
