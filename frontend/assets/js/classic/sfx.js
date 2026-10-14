/* The classic look's sounds: soft and short, like pressing a smooth wooden block. Drawn live by the browser's own sound
   engine (no sound files), so they cost nothing to load and work offline.
   - hover: a faint tick when the pointer reaches something you can press (mouse and trackpad only, never on touch)
   - press: a low, rounded "thock" when a button goes down, and a lighter click as it comes back up
   - switch: two quick ticks when a tab, filter or checkbox changes
   - alerts: a rising two-note chime for done, a low falling pair for a problem, one muted note for a warning;
     a soft drop when the connection goes, and a lift when it comes back
   A speaker chip in the top bar turns them off and on (kept per computer, calms-sfx). Nothing plays before the first
   click or key on a page (browsers do not allow it), and nothing plays while the page is in the background. */
(function () {
  if (document.documentElement.getAttribute("data-ui") !== "classic" || !(window.AudioContext || window.webkitAudioContext)) return;
  var ctx = null, master = null, on = true;
  try { on = localStorage.getItem("calms-sfx") !== "off"; } catch (e) {}

  function start() { if (ctx) { if (ctx.state === "suspended") ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9;
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 6; master.connect(comp); comp.connect(ctx.destination); } catch (e) { ctx = null; } }
  function ready() { return on && ctx && ctx.state === "running" && !document.hidden; }

  /* one rounded tone: a sine with a soft attack, a pitch that settles, and a quick fall */
  function tone(f0, f1, dur, vol, type, at) {
    var t = ctx.currentTime + (at || 0), o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = type || "sine"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur * 0.6);
    lp.type = "lowpass"; lp.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  /* the "wood" in the block: a very short burst of filtered noise */
  var noiseBuf = null;
  function knock(freq, dur, vol, at) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var t = ctx.currentTime + (at || 0), s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 1.4;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.01);
  }
  /* a soft bell note (sine plus a quiet octave), for alerts */
  function bell(f, at, vol, dur) { tone(f, f, dur || 0.42, vol || 0.09, "sine", at); tone(f * 2, f * 2, (dur || 0.42) * 0.6, (vol || 0.09) * 0.25, "sine", at); }

  var S = {
    hover: function () { tone(2400, 2100, 0.03, 0.012); },
    press: function () { tone(190, 105, 0.11, 0.16); knock(1100, 0.018, 0.05); },
    release: function () { tone(520, 460, 0.04, 0.035); },
    toggle: function () { tone(880, 860, 0.035, 0.04); tone(1320, 1300, 0.04, 0.035, "sine", 0.045); },
    ok: function () { bell(784, 0, 0.08); bell(1175, 0.09, 0.08, 0.5); },
    bad: function () { bell(392, 0, 0.09, 0.32); bell(294, 0.11, 0.09, 0.45); },
    warn: function () { bell(587, 0, 0.07, 0.38); },
    pop: function () { tone(330, 520, 0.09, 0.06); knock(1600, 0.012, 0.025); },
    down: function () { bell(523, 0, 0.06, 0.3); bell(392, 0.12, 0.06, 0.4); },
    up: function () { bell(392, 0, 0.06, 0.3); bell(659, 0.12, 0.07, 0.45); }
  };
  function play(name) { if (!ready() || !S[name]) return; try { S[name](); } catch (e) {} }
  window.CALMS_SFX = { play: play, alert: function (tone) { play(tone === "red" ? "bad" : tone === "amber" ? "warn" : "ok"); }, isOn: function () { return on; } };

  /* ---- what makes a sound ---- */
  var PRESS = "button, a[href], [role=button], .ck-pick, .ck-choice, .ck-offer, .ck-stat.is-click, tr.is-click, label.ck-check, .c-chip, summary";
  var SWITCH = ".ck-seg button, .ck-tabs button, .c-filters button, input[type=checkbox], input[type=radio], .ck-opts > label";
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches, lastHover = null, lastT = 0;
  document.addEventListener("pointerdown", function (e) { start();
    var t = e.target.closest && e.target.closest(SWITCH + ", " + PRESS); if (!t || t.disabled || t.getAttribute("aria-disabled") === "true") return;
    play(t.matches(SWITCH) ? "toggle" : "press"); }, true);
  document.addEventListener("pointerup", function (e) { var t = e.target.closest && e.target.closest(".ck-btn, .c-go, .c-cta, .c-fab"); if (t && !t.disabled) play("release"); }, true);
  document.addEventListener("keydown", function (e) { start(); if ((e.key === "Enter" || e.key === " ") && e.target.closest && e.target.closest(PRESS)) play("press"); }, true);
  if (fine) document.addEventListener("pointerover", function (e) {
    var t = e.target.closest && e.target.closest(PRESS + ", " + SWITCH); if (!t || t === lastHover || t.disabled) return; lastHover = t;
    var now = performance.now(); if (now - lastT < 70) return; lastT = now; play("hover"); }, true);
  /* the connection (offline.js) */
  var wasDown = document.documentElement.classList.contains("calms-offline");
  new MutationObserver(function () { var d = document.documentElement.classList.contains("calms-offline"); if (d !== wasDown) { wasDown = d; play(d ? "down" : "up"); } })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  /* ---- the speaker chip in the top bar ---- */
  var SVG_ON = '<path class="ic-f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/><circle class="ic-a" cx="15.5" cy="12" r="1.2"/>',
      SVG_OFF = '<path class="ic-f" d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4zM16 9.5l5 5M21 9.5l-5 5"/>';
  function chip() { var right = document.querySelector(".c-top .c-right"); if (!right) return false; if (right.querySelector(".c-sfx")) return true;
    var b = document.createElement("button"); b.type = "button"; b.className = "c-chip c-sfx";
    function paint() { b.innerHTML = '<svg class="c-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (on ? SVG_ON : SVG_OFF) + "</svg>";
      b.setAttribute("aria-label", on ? "Sounds on. Turn off" : "Sounds off. Turn on"); b.title = on ? "Sounds on" : "Sounds off"; b.setAttribute("aria-pressed", String(on)); }
    b.addEventListener("click", function () { on = !on; try { localStorage.setItem("calms-sfx", on ? "on" : "off"); } catch (e) {} paint(); if (on) { start(); setTimeout(function () { play("ok"); }, 30); } });
    paint(); var bell = right.querySelector(".c-bell"); right.insertBefore(b, bell || null); return true; }
  if (!chip()) { var mo = new MutationObserver(function () { if (chip()) mo.disconnect(); }); mo.observe(document.documentElement, { childList: true, subtree: true }); }
})();
