/* The home page's controls (DRAFT): the way in (with or without sound), the settings card, the phone menu, Kuwa in the
   corner, and the soundtrack. The 3D scene itself is scene.js; the two talk through window events:
     gr8:progress {p} / gr8:ready  from the scene while it loads;   gr8:enter  when the visitor comes in;
     gr8:still {on}                when motion is switched off or on.
   The soundtrack is played live by the browser (Web Audio), nothing to download and no one else's music: warm pads moving
   through four chords, a soft bass, bell notes picked at random from a pentatonic scale, all through a long reverb.
   Moving the cursor opens the filter a little, so the music answers the hand like the picture does. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var root = document.documentElement, body = document.body;
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try { if (localStorage.getItem("gr8-motion") === "off") still = true; } catch (e) {}
  window.GR8_STILL = still;

  /* ================= the soundtrack ================= */
  var music = null, AC = null;
  /* phones: "playback" asks the browser for bigger audio buffers (no crackle when the page is busy), the reverbs are
     shorter and the pads use one oscillator a note instead of two, so the sound never stutters the picture */
  var PHONE = matchMedia("(pointer: coarse)").matches || innerWidth < 760, IRK = PHONE ? .35 : 1;
  function ctx() { if (!AC) { var K = window.AudioContext || window.webkitAudioContext; try { AC = new K({ latencyHint: "playback" }); } catch (e) { AC = new K(); } } if (AC.state === "suspended") AC.resume(); return AC; }
  function Music() {
    var A = ctx();
    var master = A.createGain(); master.gain.value = 0;
    var comp = A.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.knee.value = 12;
    master.connect(comp); comp.connect(A.destination);
    /* a long, soft room */
    var rev = A.createConvolver(), len = Math.round(A.sampleRate * 5 * IRK), ir = A.createBuffer(2, len, A.sampleRate);
    for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    rev.buffer = ir; var wet = A.createGain(); wet.gain.value = .55; rev.connect(wet); wet.connect(master);
    var dry = A.createGain(); dry.gain.value = .85; dry.connect(master);
    /* the pads' filter, opened by the cursor */
    var lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = .6; lp.connect(dry); lp.connect(rev);
    /* a slow echo for the bells */
    var dl = A.createDelay(2), fb = A.createGain(); dl.delayTime.value = .48; fb.gain.value = .38; dl.connect(fb); fb.connect(dl);
    var bellBus = A.createGain(); bellBus.gain.value = .5; bellBus.connect(dry); bellBus.connect(rev); bellBus.connect(dl); dl.connect(rev);
    var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
    /* D major, warm: Dmaj9, Bm11, Gmaj7#11, A6sus */
    var CH = [[50, 57, 61, 64, 66, 69], [47, 54, 57, 61, 64, 66], [43, 50, 54, 57, 61, 62], [45, 52, 54, 57, 59, 64]];
    var SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83];
    var BAR = 8, ci = 0, nextBar = 0, nextBell = 0, timer = 0, on = false;
    function pad(notes, t) {
      notes.forEach(function (m, k) {
        (PHONE ? [0] : [-6, 6]).forEach(function (det) {
          var o = A.createOscillator(), g = A.createGain(); o.type = k < 2 ? "triangle" : "sawtooth"; o.frequency.value = mtof(m); o.detune.value = det + (Math.random() * 4 - 2);
          var peak = (k < 2 ? .05 : .018) * (PHONE ? 1.5 : 1);   /* one oscillator instead of two on phones: a little louder each */
          g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 3); g.gain.setValueAtTime(peak, t + BAR - 1); g.gain.linearRampToValueAtTime(0, t + BAR + 3);
          o.connect(g); g.connect(lp); o.start(t); o.stop(t + BAR + 3.2);
        });
      });
      var b = A.createOscillator(), bg = A.createGain(); b.type = "sine"; b.frequency.value = mtof(notes[0] - 12);
      bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.2, t + 1.5); bg.gain.linearRampToValueAtTime(0, t + BAR + 1); b.connect(bg); bg.connect(dry); b.start(t); b.stop(t + BAR + 1.2);
    }
    function bell(t) {
      var m = SCALE[Math.floor(Math.random() * SCALE.length)], f = mtof(m), o = A.createOscillator(), o2 = A.createOscillator(), g = A.createGain();
      o.type = "sine"; o.frequency.value = f; o2.type = "sine"; o2.frequency.value = f * 2.01;
      var g2 = A.createGain(); g2.gain.value = .25; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(bellBus);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + 2.6);
      o.start(t); o2.start(t); o.stop(t + 2.7); o2.stop(t + 2.7);
    }
    function tick() {
      var now = A.currentTime;
      while (nextBar < now + 1) { pad(CH[ci % CH.length], nextBar); ci++; nextBar += BAR; }
      while (nextBell < now + 1) { if (Math.random() < .7) bell(nextBell); nextBell += [.5, 1, 1, 1.5, 2][Math.floor(Math.random() * 5)]; }
      timer = setTimeout(tick, 400);
    }
    return {
      start: function () { if (A.state === "suspended") A.resume(); if (on) return; on = true; var t = A.currentTime + .1; nextBar = t; nextBell = t + 2;
        master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(.42, t + 3); tick(); },   /* the music sits under every sound effect */
      stop: function () { if (!on) return; on = false; clearTimeout(timer); var t = A.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.2); },
      hand: function (x, y, speed) { lp.frequency.setTargetAtTime(700 + (1 - y) * 900 + Math.min(1400, speed * 9000), A.currentTime, .25); },
      isOn: function () { return on; }
    };
  }
  /* ---- the Loans hall's music: upbeat and forward-moving (an original groove, built here): 116 bpm, a soft four-on-the-
     floor kick, a clap on two and four, swung offbeat hats, a bouncing bass, bright offbeat chord stabs and a plucked
     arpeggio through a dotted echo, over D major - G - Bm - A. It sits under the sound effects like the other music. ---- */
  function Groove() {
    var A = ctx(), master = A.createGain(); master.gain.value = 0;
    var comp = A.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; master.connect(comp); comp.connect(A.destination);
    var nz = A.createBuffer(1, A.sampleRate, A.sampleRate), nd = nz.getChannelData(0); for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    var rev = A.createConvolver(), rl = Math.round(A.sampleRate * 2 * IRK), ir = A.createBuffer(2, rl, A.sampleRate); for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var k = 0; k < rl; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / rl, 3); }
    rev.buffer = ir; var wet = A.createGain(); wet.gain.value = .25; rev.connect(wet); wet.connect(master);
    var dl = A.createDelay(1), fb = A.createGain(), dwet = A.createGain(); dl.delayTime.value = 60 / 116 * .75; fb.gain.value = .32; dwet.gain.value = .35; dl.connect(fb); fb.connect(dl); dl.connect(dwet); dwet.connect(master);
    var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); }, BEAT = 60 / 116, S16 = BEAT / 4;
    var PROG = [[50, 54, 57, 61], [43, 47, 50, 54], [47, 50, 54, 57], [45, 49, 52, 57]];   /* Dmaj7, Gmaj7, Bm7, A */
    var step = 0, next = 0, timer = 0, on = false;
    function kick(t) { var o = A.createOscillator(), g = A.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + .12); g.gain.setValueAtTime(.55, t); g.gain.exponentialRampToValueAtTime(.001, t + .28); o.connect(g); g.connect(master); o.start(t); o.stop(t + .3); }
    function noise(t, f, q, v, len, type, send) { var s = A.createBufferSource(), fl = A.createBiquadFilter(), g = A.createGain(); s.buffer = nz; fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + len); s.connect(fl); fl.connect(g); g.connect(master); if (send) g.connect(rev); s.start(t, Math.random() * .5, len + .02); }
    function note(t, m, type, v, len, cut, send) { var o = A.createOscillator(), f = A.createBiquadFilter(), g = A.createGain(); o.type = type; o.frequency.value = mtof(m); f.type = "lowpass"; f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(Math.max(200, cut * .3), t + len);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(.001, t + len); o.connect(f); f.connect(g); g.connect(master); if (send === "rev") g.connect(rev); if (send === "dl") g.connect(dl); o.start(t); o.stop(t + len + .05); }
    function tick() {
      var now = A.currentTime;
      while (next < now + .25) {
        var t = next, s16 = step % 16, bar = Math.floor(step / 16), ch = PROG[bar % 4], swing = (s16 % 2) ? S16 * .12 : 0;
        if (s16 % 4 === 0) kick(t);
        if (s16 === 4 || s16 === 12) noise(t, 1800, .9, .22, .14, "bandpass", true);
        if (s16 % 4 === 2) noise(t + swing, 9000, .7, .09, .05, "highpass");
        if (s16 % 2 === 1 && Math.random() < .5) noise(t + swing, 11000, .7, .035, .03, "highpass");
        var bp = [0, 0, 12, 0, 0, 7, 0, 12]; if (s16 % 2 === 0) note(t, ch[0] - 12 + bp[(s16 / 2) % 8], "triangle", .2, S16 * 1.6, 900);
        if (s16 === 2 || s16 === 6 || s16 === 10 || s16 === 14) ch.forEach(function (m) { note(t + swing, m + 12, "sawtooth", .028, .16, 2600, "rev"); });
        var arp = [0, 1, 2, 3, 2, 1, 3, 2]; if (bar % 2 === 1 || s16 >= 8) note(t + swing, ch[arp[s16 % 8]] + 24, "triangle", .045, .18, 5000, "dl");
        step++; next += S16;
      }
      timer = setTimeout(tick, 60);
    }
    return {
      start: function () { if (on) return; on = true; var t = A.currentTime + .05; if (!next || next < t) { next = t; } master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(.4, t + 2); clearTimeout(timer); tick(); },
      stop: function () { if (!on) return; on = false; var t = A.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 1.4); setTimeout(function () { if (!on) clearTimeout(timer); }, 1500); },
      isOn: function () { return on; }
    };
  }
  /* ---- the memory lane's music (end of About): mellow and nostalgic, like an old cassette. A soft electric piano rolls
     slow chords (Fmaj9, Em7, Dm9, Cadd9) at 64 bpm with a round bass, a few quiet melody notes through a long echo, a
     gentle "tape wow" bending every note a hair, and a faint crackle. Original, built here. ---- */
  function Memory() {
    var A = ctx(), master = A.createGain(); master.gain.value = 0;
    var lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1900; lp.Q.value = .3;
    var comp = A.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    /* tape wow: everything passes through a short delay whose length drifts slowly, bending the pitch a hair */
    var wd = A.createDelay(.1); wd.delayTime.value = .014; master.connect(wd); wd.connect(lp); lp.connect(comp); comp.connect(A.destination);
    var rev = A.createConvolver(), rl = Math.round(A.sampleRate * 3.5 * IRK), ir = A.createBuffer(2, rl, A.sampleRate); for (var c = 0; c < 2; c++) { var d = ir.getChannelData(c); for (var k = 0; k < rl; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / rl, 2.8); }
    rev.buffer = ir; var wet = A.createGain(); wet.gain.value = .5; rev.connect(wet); wet.connect(master);
    var dl = A.createDelay(2), fb = A.createGain(); dl.delayTime.value = .7; fb.gain.value = .35; dl.connect(fb); fb.connect(dl); dl.connect(rev); dl.connect(master);
    var wow = A.createOscillator(), wowG = A.createGain(); wow.frequency.value = .5; wowG.gain.value = .0018; wow.connect(wowG); wowG.connect(wd.delayTime); wow.start();
    /* the crackle: a few random tiny ticks in a loop of near-silence */
    var cb = A.createBuffer(1, A.sampleRate * 3, A.sampleRate), cd = cb.getChannelData(0); for (var i = 0; i < 70; i++) { var at = Math.random() * cd.length | 0, v = Math.random() * .6; for (var j = 0; j < 30 && at + j < cd.length; j++) cd[at + j] = (Math.random() * 2 - 1) * v * Math.exp(-j / 6); }
    var crk = null, crkG = A.createGain(), crkF = A.createBiquadFilter(); crkF.type = "highpass"; crkF.frequency.value = 1800; crkG.gain.value = .05; crkF.connect(crkG); crkG.connect(master);
    var mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); }, BEAT = 60 / 64, BAR = BEAT * 4;
    var CH = [[53, 57, 60, 64, 67], [52, 55, 59, 62], [50, 53, 57, 60, 64], [48, 55, 59, 62, 64]], MEL = [72, 74, 76, 77, 79, 81, 84];
    var ci = 0, next = 0, timer = 0, on = false;
    function ep(t, m, v, len, send) {   /* one electric-piano note: a sine with a soft second and third harmonic, a quick knock and a long fade */
      var g = A.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .012); g.gain.exponentialRampToValueAtTime(v * .35, t + .5); g.gain.exponentialRampToValueAtTime(.0001, t + len);
      [[1, 1], [2, .22], [3, .06]].forEach(function (h) { var o = A.createOscillator(), hg = A.createGain(); o.type = "sine"; o.frequency.value = mtof(m) * h[0]; hg.gain.value = h[1]; o.connect(hg); hg.connect(g); o.start(t); o.stop(t + len + .05); });
      g.connect(master); g.connect(rev); if (send) g.connect(dl);
    }
    function tick() {
      var now = A.currentTime;
      while (next < now + 1) {
        var ch = CH[ci % CH.length], t = next;
        ch.forEach(function (m, k) { ep(t + k * .035, m, .045, BAR + 1.5); });
        var b = A.createOscillator(), bg = A.createGain(); b.type = "sine"; b.frequency.value = mtof(ch[0] - 12);
        bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.16, t + .06); bg.gain.exponentialRampToValueAtTime(.0001, t + BAR); b.connect(bg); bg.connect(master); b.start(t); b.stop(t + BAR + .05);
        var n = 1 + (Math.random() * 3 | 0); for (var q = 0; q < n; q++) ep(t + BEAT * (1 + (Math.random() * 3 | 0)) + Math.random() * .05, MEL[Math.random() * MEL.length | 0], .03, 3, true);
        ci++; next += BAR;
      }
      timer = setTimeout(tick, 500);
    }
    return {
      start: function () { if (on) return; on = true; var t = A.currentTime + .05; if (next < t) next = t + .3; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(.5, t + 3);
        if (!crk) { crk = A.createBufferSource(); crk.buffer = cb; crk.loop = true; crk.connect(crkF); crk.start(); } clearTimeout(timer); tick(); },
      stop: function () { if (!on) return; on = false; var t = A.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 2.2); setTimeout(function () { if (!on) clearTimeout(timer); }, 2300); },
      isOn: function () { return on; }
    };
  }
  /* which music plays where: the Loans hall has its own upbeat track, the memory lane its nostalgic one; everywhere
     else, the calm one. They crossfade. */
  var groove = null, memory = null, here = "home", memOn = false;
  function syncBgm() {
    var want = soundOn() && !document.hidden;
    if (!want) { if (music) music.stop(); if (groove) groove.stop(); if (memory) memory.stop(); return; }
    var which = memOn && here === "about" ? "memory" : here === "loans" ? "groove" : "music";
    if (which === "memory") { if (!memory) memory = Memory(); memory.start(); } else if (memory) memory.stop();
    if (which === "groove") { if (!groove) groove = Groove(); groove.start(); } else if (groove) groove.stop();
    if (which === "music") { if (!music) music = Music(); music.start(); } else if (music) music.stop();
  }
  addEventListener("gr8:place", function (e) { here = e.detail; syncBgm(); });
  /* ---- sound effects (only while sound is on) ---- */
  var sfxOut = null, noise = null, lastRustle = 0, lastHover = 0, hoverEl = null;
  function out() { if (!sfxOut) { var A = ctx(); sfxOut = A.createGain(); sfxOut.gain.value = 2.4; var lim = A.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 2; lim.ratio.value = 16; lim.attack.value = .002; lim.release.value = .12; sfxOut.connect(lim); lim.connect(A.destination);   /* every sound effect is louder than the music */
      noise = A.createBuffer(1, A.sampleRate * 2, A.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } return sfxOut; }
  function soundOn() { return sndBtn.getAttribute("aria-pressed") === "true"; }
  /* the beads under the hand: like running your fingers through a jar of tiny beads (or a pile of tiny dry leaves) —
     thousands of tiny pieces brushing, shifting and clicking against each other. Made from grains: a few dozen
     tiny pre-made "ticks" (2-6 ms of resonant noise, each a slightly different size and pitch), scattered in time and
     across the stereo field; how many fall each moment follows how hard the beads are being stirred, and the
     cascade trails off on its own after the hand stops. No wind, no whoosh: only dry, delicate grains. */
  var grains = null, stir = 0, stirTimer = 0, lastRustle2 = 0;
  function makeGrains() {
    var A = ctx(), sr = A.sampleRate; grains = [];
    for (var n = 0; n < 40; n++) {
      var len = Math.round(sr * (.005 + Math.random() * .009)), buf = A.createBuffer(1, len, sr), d = buf.getChannelData(0);
      var f = 900 + Math.pow(Math.random(), 1.6) * 2600, r = .72 + Math.random() * .12, y1 = 0, y2 = 0, w = 2 * Math.cos(2 * Math.PI * f / sr), dec = 1 / (len * (.18 + Math.random() * .25));
      for (var i = 0; i < len; i++) { var x = (Math.random() * 2 - 1) * Math.exp(-i * dec * 3); var y = x + r * w * y1 - r * r * y2; y2 = y1; y1 = y; d[i] = y * (i < 40 ? i / 40 : 1); }   /* a soft onset: no sharp tick */
      var pk = 0; for (i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i])); for (i = 0; i < len; i++) d[i] *= .6 / (pk || 1);   /* every grain the same peak */
      grains.push(buf);
    }
  }
  var gBus = null;
  function grainBus() {   /* all grains go through one gentle low-pass, so the whole texture stays soft and muffled */
    if (gBus) return gBus; var A = ctx(), lp = A.createBiquadFilter(), g = A.createGain(); lp.type = "lowpass"; lp.frequency.value = 2600; lp.Q.value = .4; g.gain.value = .55;
    lp.connect(g); g.connect(out()); gBus = lp; return gBus;
  }
  function grain(t, v) {
    var A = ctx(), o = grainBus(), s = A.createBufferSource(), g = A.createGain(), p = A.createStereoPanner ? A.createStereoPanner() : null;
    s.buffer = grains[Math.random() * grains.length | 0]; s.playbackRate.value = .8 + Math.random() * .5; g.gain.value = v;
    s.connect(g); if (p) { p.pan.value = Math.random() * 1.6 - .8; g.connect(p); p.connect(o); } else g.connect(o); s.start(t);
  }
  function cascade() {   /* every 40 ms: scatter this moment's grains, then let the stirring settle */
    stirTimer = 0; if (!soundOn() || stir < .02) { stir = 0; return; }
    var A = ctx(), t = A.currentTime + .01, n = Math.round(stir * 12 + Math.random() * 1.5);
    for (var i = 0; i < n; i++) { var at = t + Math.pow(Math.random(), .8) * .04; grain(at, (.03 + Math.random() * .05) * (.35 + stir * .6)); }
    if (Math.random() < stir * .25) for (var k = 0, m = 3 + Math.random() * 4 | 0, at2 = t + Math.random() * .03; k < m; k++) grain(at2 + k * (.008 + Math.random() * .01), .04 + Math.random() * .03);   /* a little run of beads sliding together */
    stir *= .84; stirTimer = setTimeout(cascade, 40);
  }
  function rustle(k) {
    if (!soundOn()) return; if (!grains) makeGrains();
    stir = Math.min(.8, stir + .15 + k * .4); lastRustle2 = performance.now();
    if (!stirTimer) cascade();
  }
  /* the heartbeat: a soft low "lub-dub" with each beat of the 8 (scene.js, gr8:beat): a sine that drops in pitch, with a
     muffled knock of filtered noise on top, the second beat a little softer and higher */
  var warm = null;
  function thump(t, f, v) {   /* deep and round: a sub-bass sine falling in pitch, a body an octave up, gently saturated so it
                                  is felt even on small speakers, and a soft low "push" of air instead of a sharp click */
    var A = ctx(), o = out();
    if (!warm) { warm = A.createWaveShaper(); var c = new Float32Array(1024); for (var i = 0; i < 1024; i++) { var x = i / 511.5 - 1; c[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); } warm.curve = c;
      var lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 220; lp.Q.value = .5; warm.connect(lp); lp.connect(o); }
    var sub = A.createOscillator(), g = A.createGain(); sub.type = "sine";
    sub.frequency.setValueAtTime(f * 2.2, t); sub.frequency.exponentialRampToValueAtTime(f, t + .09); sub.frequency.exponentialRampToValueAtTime(f * .85, t + .6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .025); g.gain.setTargetAtTime(0, t + .1, .16);
    sub.connect(g); g.connect(warm); sub.start(t); sub.stop(t + .9);
    var bdy = A.createOscillator(), bg = A.createGain(); bdy.type = "triangle"; bdy.frequency.setValueAtTime(f * 3, t); bdy.frequency.exponentialRampToValueAtTime(f * 1.9, t + .08);
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(v * .35, t + .02); bg.gain.setTargetAtTime(0, t + .05, .07);
    bdy.connect(bg); bg.connect(warm); bdy.start(t); bdy.stop(t + .5);
    var s = A.createBufferSource(), nl = A.createBiquadFilter(), ng = A.createGain(); s.buffer = noise; nl.type = "lowpass"; nl.frequency.value = 140;
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(v * .8, t + .02); ng.gain.setTargetAtTime(0, t + .04, .06); s.connect(nl); nl.connect(ng); ng.connect(o); s.start(t, Math.random(), .4);
  }
  /* the orb in the corner beats with the 8: a quick swell of its glow */
  /* (only the orb's own small layers animate, with transform and opacity: no page-wide class, no forced layout) */
  function orbBeat() { var o = document.getElementById("orb"); if (!o) return; o.classList.remove("beat"); requestAnimationFrame(function () { requestAnimationFrame(function () { if (page === "home") o.classList.add("beat"); }); }); }
  addEventListener("gr8:beat", function () {
    if (page !== "home") return;
    orbBeat();
    if (!soundOn() || still || document.hidden || document.documentElement.classList.contains("kc-open")) return;
    var t = ctx().currentTime + .01; thump(t, 40, .6); thump(t + .3, 45, .14);   /* one deep beat with only a ghost of a second */
  });
  /* (the beads make no sound when touched: it was more distracting than pleasant) */
  /* the hand through the milk: one soft, low swish of filtered noise that swells with the cursor's speed and dies
     away when it stops; a slow wobble on the filter gives it the sound of liquid, never crackles */
  var swish = null, lastX = 0, lastY = 0, lastT = 0;
  function swishOn() {
    if (swish) return swish; var A = ctx(), o = out();
    var s = A.createBufferSource(); s.buffer = noise; s.loop = true;
    var lp = A.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 420; lp.Q.value = 1.4;
    var bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 260; bp.Q.value = .9;
    var g = A.createGain(); g.gain.value = 0;
    var lfo = A.createOscillator(), lg = A.createGain(); lfo.frequency.value = 3.1; lg.gain.value = 90; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    s.connect(lp); lp.connect(bp); bp.connect(g); g.connect(o); s.start();
    swish = { g: g, lp: lp }; return swish;
  }
  addEventListener("pointermove", function (e) {
    var now = performance.now(), dt = Math.max(8, now - lastT), sp = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;   /* px per ms */
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    if (!soundOn() || still || page !== "home" || dt > 200 || document.documentElement.classList.contains("kc-open")) return;
    var w = swishOn(), A = ctx(), t = A.currentTime, k = Math.min(1, sp / 3);
    w.g.gain.cancelScheduledValues(t); w.g.gain.setTargetAtTime(.02 + k * .07, t, .08); w.g.gain.setTargetAtTime(0, t + .12, .35);
    w.lp.frequency.setTargetAtTime(320 + k * 700, t, .12);
  }, { passive: true });
  /* hovering a word or a link (like emotion's site): its letters scramble into random glyphs and type themselves back
     in, left to right, each with a tiny synthetic typewriter click */
  /* which page is live: "home" or "talk". Only the live page's elements react to the pointer or make sound */
  var page = "home";
  function activeHere(el) { if (page === "talk") return false; if (page !== "home") return !el.closest("#talk, .scopy, .kw-say"); return !el.closest("#talk, .lo-ui, .ab-ui"); }
  /* the typing sound (assets/audio/typing.mp3, an electronic typing recording): a piece of it plays for exactly as long
     as an interactive word is typing itself in, and stops with it */
  var typeBuf = null, typeLoading = false;
  function loadTyping() { if (typeBuf || typeLoading) return; typeLoading = true;
    fetch("../assets/audio/typing.mp3").then(function (r) { return r.arrayBuffer(); }).then(function (b) { return new Promise(function (ok, no) { ctx().decodeAudioData(b, ok, no); }); })
      .then(function (b) { typeBuf = b; }).catch(function () { typeLoading = false; }); }
  function typeSound(dur) {
    if (!soundOn()) return null; loadTyping(); if (!typeBuf) return null;
    var A = ctx(), t = A.currentTime, s = A.createBufferSource(), g = A.createGain(), len = Math.min(dur, typeBuf.duration - .1), at = Math.random() * Math.max(0, typeBuf.duration - len - .05);
    s.buffer = typeBuf; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .015); g.gain.setValueAtTime(.55, t + Math.max(.02, len - .06)); g.gain.linearRampToValueAtTime(0, t + len);
    s.connect(g); g.connect(out()); s.start(t, at, len + .02);
    return { stop: function () { var n = A.currentTime; g.gain.cancelScheduledValues(n); g.gain.setTargetAtTime(0, n, .02); try { s.stop(n + .1); } catch (e) {} } };
  }
  function key(i) {   /* a soft digital tick: a short, rounded sine blip that slides up a little, with a faint glassy overtone.
                          No noise, no square wave, no hard attack: it should feel like touching a screen, not a typewriter */
    if (!soundOn()) return; var now = performance.now(); if (now - lastHover < 34) return; lastHover = now;
    var A = ctx(), o = out(), t = A.currentTime, f = [1318, 1480, 1568, 1760, 1976][Math.random() * 5 | 0] * (.98 + Math.random() * .04);
    var b = A.createOscillator(), g = A.createGain(); b.type = "sine";
    b.frequency.setValueAtTime(f * .82, t); b.frequency.exponentialRampToValueAtTime(f, t + .018);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.075, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + .07);
    b.connect(g); g.connect(o); b.start(t); b.stop(t + .08);
    var h = A.createOscillator(), g2 = A.createGain(); h.type = "sine"; h.frequency.value = f * 3.01;
    g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(.018, t + .003); g2.gain.exponentialRampToValueAtTime(.0001, t + .035);
    h.connect(g2); g2.connect(o); h.start(t); h.stop(t + .045);
  }
  /* opening and closing a menu: a soft synth "bloop" that glides up to open and down to close, with a breath of air */
  function menuSnd(open) {
    if (!soundOn()) return; var A = ctx(), o = out(), t = A.currentTime;
    var osc = A.createOscillator(), g = A.createGain(); osc.type = "sine";
    osc.frequency.setValueAtTime(open ? 520 : 880, t); osc.frequency.exponentialRampToValueAtTime(open ? 880 : 480, t + .12);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
    osc.connect(g); g.connect(o); osc.start(t); osc.stop(t + .25);
    var s = A.createBufferSource(), bp = A.createBiquadFilter(), ng = A.createGain(); s.buffer = noise; bp.type = "bandpass"; bp.Q.value = .8;
    bp.frequency.setValueAtTime(open ? 900 : 2400, t); bp.frequency.exponentialRampToValueAtTime(open ? 2400 : 900, t + .2);
    ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(.12, t + .05); ng.gain.exponentialRampToValueAtTime(.0001, t + .24);
    s.connect(bp); bp.connect(ng); ng.connect(o); s.start(t, Math.random(), .3);
  }
  /* moving between places (About, Loans, Let's talk, home): a soft digital ripple. A glassy sine drop gliding down, then
     three quieter, higher echoes spreading out like rings on water, each with a faint FM shimmer, over a low round body.
     Short and quiet; the big smoke "whoosh" belongs only to the first way in. */
  var lastRipple = 0;
  function navRipple() {
    if (!soundOn()) return; var now = performance.now(); if (now - lastRipple < 250) return; lastRipple = now;
    var A = ctx(), o = out(), t = A.currentTime + .01;
    [[0, 880, .1], [.12, 1320, .045], [.26, 1760, .026], [.42, 2350, .015]].forEach(function (r) {
      var at = t + r[0], osc = A.createOscillator(), mod = A.createOscillator(), mg = A.createGain(), g = A.createGain(), p = A.createStereoPanner ? A.createStereoPanner() : null;
      osc.type = "sine"; osc.frequency.setValueAtTime(r[1], at); osc.frequency.exponentialRampToValueAtTime(r[1] * .62, at + .2);
      mod.type = "sine"; mod.frequency.value = r[1] * 1.5; mg.gain.setValueAtTime(r[1] * .3, at); mg.gain.exponentialRampToValueAtTime(1, at + .14); mod.connect(mg); mg.connect(osc.frequency);
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(r[2], at + .008); g.gain.exponentialRampToValueAtTime(.0001, at + .45);
      osc.connect(g); if (p) { p.pan.value = (Math.random() * 2 - 1) * .5; g.connect(p); p.connect(o); } else g.connect(o);
      osc.start(at); mod.start(at); osc.stop(at + .5); mod.stop(at + .5);
    });
    var b = A.createOscillator(), bg = A.createGain(); b.type = "sine"; b.frequency.setValueAtTime(230, t); b.frequency.exponentialRampToValueAtTime(140, t + .3);
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.07, t + .02); bg.gain.exponentialRampToValueAtTime(.0001, t + .5); b.connect(bg); bg.connect(o); b.start(t); b.stop(t + .55);
  }
  /* choosing something (a switch, a setting, the orb): two quick bright notes, up for on, down for off */
  function pick(on) {
    if (!soundOn()) return; var A = ctx(), o = out(), t = A.currentTime;
    (on ? [784, 1175] : [1175, 784]).forEach(function (f, k) { var osc = A.createOscillator(), g = A.createGain(), at = t + k * .07; osc.type = "triangle"; osc.frequency.value = f;
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.2, at + .006); g.gain.exponentialRampToValueAtTime(.0001, at + .16); osc.connect(g); g.connect(o); osc.start(at); osc.stop(at + .18); });
  }
  var GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789#%&*+=/<>", busy = new WeakSet(), typing = new Set();
  function typeIn(el, silent) {
    if (busy.has(el) || still) return; busy.add(el);
    var walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), texts = [], n;
    while ((n = walk.nextNode())) if (n.nodeValue.trim() && !n.parentNode.closest("svg, .sw")) texts.push(n);
    var cells = [], wraps = [];
    texts.forEach(function (tn) {
      var w = document.createElement("span"); w.className = "ty"; w.setAttribute("aria-hidden", "true");
      Array.from(tn.nodeValue).forEach(function (ch) { if (/\s/.test(ch)) { w.appendChild(document.createTextNode(ch)); return; } var c = document.createElement("span"); c.className = "ty-c"; c.textContent = ch; w.appendChild(c); cells.push(c); });
      tn.parentNode.replaceChild(w, tn); wraps.push([w, tn]);
    });
    cells.forEach(function (c) { c.style.width = c.getBoundingClientRect().width + "px"; c.dataset.ch = c.textContent; c.textContent = GLYPHS[Math.random() * GLYPHS.length | 0]; c.classList.add("on"); });
    var i = 0, step = Math.max(14, Math.min(34, 520 / (cells.length || 1))), stopped = false, run = { el: el, stop: function () { stopped = true; clearInterval(shuffle); cells.forEach(function (c) { c.textContent = c.dataset.ch; }); wraps.forEach(function (p) { if (p[0].parentNode) p[0].parentNode.replaceChild(p[1], p[0]); }); busy.delete(el); typing.delete(run); } };
    typing.add(run); var snd = silent ? null : typeSound(cells.length * step / 1000 + .05); var stop0 = run.stop; run.stop = function () { if (snd) snd.stop(); stop0(); };
    var shuffle = setInterval(function () { for (var j = i; j < cells.length; j++) cells[j].textContent = GLYPHS[Math.random() * GLYPHS.length | 0]; }, 45);
    (function next() {
      if (stopped) return;
      if (i >= cells.length) { clearInterval(shuffle); setTimeout(function () { snd = null; run.stop(); }, 380); return; }
      var c = cells[i++]; c.textContent = c.dataset.ch; c.classList.remove("on"); c.classList.add("in"); 
      setTimeout(next, step);
    })();
  }
  document.addEventListener("pointerover", function (e) {
    if (e.pointerType && e.pointerType !== "mouse") return;
    var el = e.target.closest && e.target.closest(".snav .links a, .talk, .menu-btn, .mob a, .tk-opt .t, .tk-btn > span, .tk-go .t, .tk-back, .tk-link, .lo-link, .kw-say .acts a, .g-snd, .g-mute, .kc-chips button");   /* only things you can click */
    if (!el || el === hoverEl || !activeHere(el)) return; hoverEl = el; typeIn(el);
  }, true);
  document.addEventListener("pointerout", function (e) { if (hoverEl && !hoverEl.contains(e.relatedTarget)) hoverEl = null; }, true);

  var sndBtn = $("#soundBtn"), sndSw = $("#sndSw");
  function setSound(v) {
    sndBtn.setAttribute("aria-pressed", String(v)); try { syncBgm(); } catch (e) { return; }
    if (v) { out(); loadTyping(); }
    sndBtn.setAttribute("aria-pressed", String(v)); sndSw.setAttribute("aria-checked", String(v));
    try { sessionStorage.setItem("gr8-sound", v ? "on" : "off"); } catch (e) {}
  }
  sndBtn.addEventListener("click", function () { setSound(sndBtn.getAttribute("aria-pressed") !== "true"); });
  sndSw.addEventListener("click", function () { setSound(sndSw.getAttribute("aria-checked") !== "true"); });
  var lx = 0, ly = 0, lt = 0;
  addEventListener("pointermove", function (e) { if (!music || !music.isOn()) return; var t = performance.now(), x = e.clientX / innerWidth, y = e.clientY / innerHeight;
    var sp = Math.hypot(x - lx, y - ly) / Math.max(16, t - lt) * 16; lx = x; ly = y; lt = t; if (music && music.isOn()) music.hand(x, y, sp); }, { passive: true });
  document.addEventListener("visibilitychange", function () { syncBgm(); });

  /* ================= settings, menu ================= */
  var pop = $(".pop"), setBtn = $(".set", pop), nav = $(".snav"), popT = 0;
  /* Settings rolls down by itself while the pointer is over it, and rolls back up when it leaves; a click (or a tap) still works */
  function popOpen(o) { if (pop.classList.contains("open") === o) return; pop.classList.toggle("open", o); setBtn.setAttribute("aria-expanded", String(o)); }   /* silent: no sound on hover, open or close */
  pop.addEventListener("pointerenter", function (e) { if (e.pointerType !== "mouse") return; clearTimeout(popT); popOpen(true); });
  pop.addEventListener("pointerleave", function (e) { if (e.pointerType !== "mouse") return; clearTimeout(popT); popT = setTimeout(function () { popOpen(false); }, 220); });
  setBtn.addEventListener("click", function (e) { e.stopPropagation(); popOpen(!pop.classList.contains("open")); });
  document.addEventListener("click", function (e) { if (!e.target.closest(".pop")) popOpen(false); if (!e.target.closest(".snav")) nav.classList.remove("open"); });
  var mb = $(".menu-btn"); mb.addEventListener("click", function (e) { e.stopPropagation(); var o = nav.classList.toggle("open"); mb.setAttribute("aria-expanded", String(o)); mb.textContent = o ? "Close" : "Menu"; menuSnd(o); });
  function sw(id, on, fn) { var b = $(id); b.setAttribute("aria-checked", String(on)); b.addEventListener("click", function () { var v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", String(v)); fn(v); pick(v); }); }
  /* a whole settings row is clickable, not just its switch (so its label really is something you can press) */
  Array.prototype.forEach.call(document.querySelectorAll(".card div.set-row"), function (r) { r.addEventListener("click", function (e) { if (e.target.closest(".sw")) return; var b = r.querySelector(".sw"); if (b) b.click(); }); });
  /* Quality: High, Balanced or Low, for slower computers (scene.js listens for gr8:quality) */
  var QS = ["high", "balanced", "low"], QN = { high: "High", balanced: "Balanced", low: "Low" }, qBtn = $("#qBtn"), q = "high";
  try { q = localStorage.getItem("gr8-quality") || "high"; } catch (e) {} if (QS.indexOf(q) < 0) q = "high";
  $(".v", qBtn).textContent = QN[q];
  qBtn.addEventListener("click", function () { q = QS[(QS.indexOf(q) + 1) % 3]; $(".v", qBtn).textContent = QN[q]; try { localStorage.setItem("gr8-quality", q); } catch (e) {} window.dispatchEvent(new CustomEvent("gr8:quality", { detail: q })); pick(q !== "low"); });
  var tips = true; try { tips = localStorage.getItem("gr8-tips") !== "off"; } catch (e) {}
  sw("#darkSw", root.classList.contains("dark"), function (v) { root.classList.toggle("dark", v); try { localStorage.setItem("gr8-theme", v ? "dark" : "light"); } catch (e) {} });
  sw("#tipSw", tips, function (v) { tips = v; try { localStorage.setItem("gr8-tips", v ? "on" : "off"); } catch (e) {} if (!v) say.classList.add("hide"); });
  sw("#motionSw", !still, function (v) { try { localStorage.setItem("gr8-motion", v ? "on" : "off"); } catch (e) {} window.GR8_STILL = !v; window.dispatchEvent(new CustomEvent("gr8:still", { detail: { on: !v } })); });

  /* ================= Kuwa in the corner ================= */
  var say = $("#say"), orb = $("#orb"), sayTx = $("#sayTx"), hideT;
  if (matchMedia("(pointer: coarse)").matches) sayTx.textContent = "Touch and drag through the scene. Tap me to talk, by typing or out loud.";
  function show(help) { say.classList.toggle("help", !!help); say.classList.remove("hide"); clearTimeout(hideT); if (!help) hideT = setTimeout(function () { say.classList.add("hide"); }, 9000); }
  orb.addEventListener("click", function () { pick(true);
    if (window.KUWA_CHAT) { say.classList.add("hide"); window.KUWA_CHAT.open(); return; }
    if (!say.classList.contains("hide") && say.classList.contains("help")) { say.classList.add("hide"); return; }
    $("b", say).textContent = "Where to, partner?"; sayTx.textContent = "Pick one and I'll take you there."; show(true); });

  /* ================= the way in ================= */
  var gate = $("#gate0"), bar = $("#gLoad"), pct = $("#gPct"), entered = false, want = 0, shown = 0, loaded = false, t0 = performance.now();
  /* the counter climbs toward how far the scene has loaded, never faster than ~1.8 s for the whole way, then the doors open */
  function count(now) {
    if (!gate.isConnected) return;
    var cap = Math.min(1, (now - t0) / 1800), aim = Math.min(want, cap);
    var cdt = Math.min(.5, (now - (count.p || now)) / 1000); count.p = now;
    shown += (aim - shown) * (1 - Math.exp(-cdt * 7)); if (aim >= 1 && shown > .985) shown = 1;
    bar.style.width = (shown * 100).toFixed(2) + "%"; pct.textContent = ("00" + Math.floor(shown * 100)).slice(-3) + "%";
    if (shown >= 1 && !loaded) { loaded = true; openDoors(); }
    requestAnimationFrame(count);
  }
  count(t0);
  function openDoors() { $("#enterSnd").disabled = false; $("#enterMute").disabled = false; gate.classList.add("ok"); if (window.GR8_GATE) window.GR8_GATE.smoke(true); }
  /* the sound of the smoke opening: a soft rising breath of air and a low swell (only with sound) */
  function whoosh() {
    var A = ctx(), o = out(), t = A.currentTime;
    var s = A.createBufferSource(); s.buffer = noise; s.loop = true;
    var bp = A.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = .8; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2200, t + 2.6); bp.frequency.exponentialRampToValueAtTime(420, t + 5.6);
    var g = A.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2, t + 2.2); g.gain.exponentialRampToValueAtTime(.0001, t + 5.8);
    s.connect(bp); bp.connect(g); g.connect(o); s.start(t); s.stop(t + 6);
    var b = A.createOscillator(), bg = A.createGain(); b.type = "sine"; b.frequency.setValueAtTime(55, t); b.frequency.exponentialRampToValueAtTime(82, t + 4);
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.18, t + 2.4); bg.gain.exponentialRampToValueAtTime(.0001, t + 6); b.connect(bg); bg.connect(o); b.start(t); b.stop(t + 6.2);
  }
  function enter(withSound, quick) {
    if (entered) return; entered = true;
    if (withSound) { setSound(true); out(); whoosh(); }
    gate.classList.add("go");
    window.dispatchEvent(new Event("gr8:enter"));
    var done = function () { gate.classList.add("gone"); setTimeout(function () { gate.remove(); }, 100); };
    if (window.GR8_GATE && !still) setTimeout(function () { window.GR8_GATE.open(done, quick); }, quick ? 0 : 700);
    else { gate.style.transition = "opacity 1s ease"; gate.style.opacity = "0"; setTimeout(done, 1000); }
    setTimeout(function () { body.classList.add("ready"); }, quick ? 300 : 3600);
    if (tips && innerWidth >= 600) setTimeout(function () { if (page === "home") show(false); }, 6000);
  }
  function readyGate() { want = 1; }
  addEventListener("gr8:progress", function (e) { want = Math.max(want, e.detail || 0); });
  addEventListener("gr8:ready", readyGate);
  setTimeout(readyGate, 7000);   /* the scene is slow or missing: let them in anyway */
  $("#enterSnd").addEventListener("click", function () { enter(true); });
  $("#enterMute").addEventListener("click", function () { enter(false); });
  /* already came in during this visit: no gate the second time (a browser will not start sound without a click) */
  var been = null; try { been = sessionStorage.getItem("gr8-sound"); } catch (e) {}
  if (been) { gate.querySelector(".g-mid").style.opacity = "0"; gate.querySelector(".g-bar").style.opacity = "0"; addEventListener("gr8:ready", function () { enter(false, true); }); setTimeout(function () { enter(false, true); }, 3000); }

  /* ================= "Let's talk" ================= */
  var tk = $("#talk"), talkBtn = $(".talk"), talkOpen = false, talkLabel = talkBtn.innerHTML; tk.inert = true;
  function setTalk(open, quiet) {
    if (open === talkOpen) return; talkOpen = open; page = open ? "talk" : "home";
    if (open && room) { room = null; root.classList.remove("room-on"); }
    /* leaving a page: finish its typing animations at once, take its elements out of play (inert: no hover, focus or clicks) */
    typing.forEach(function (r) { if (!activeHere(r.el)) r.stop(); }); hoverEl = null;
    $(".scopy").inert = open; say.inert = open; tk.inert = !open; clearTimeout(hideT); if (open) say.classList.add("hide");
    if (open && swish) swish.g.gain.cancelScheduledValues(0), swish.g.gain.setTargetAtTime(0, ctx().currentTime, .05);
    var o = document.getElementById("orb"); if (o) o.classList.remove("beat"); body.classList.remove("beat");
    root.classList.toggle("talk-open", open); tk.hidden = false; tk.setAttribute("aria-hidden", String(!open));
    talkBtn.innerHTML = open ? 'Close <span>↵</span>' : talkLabel;
    window.dispatchEvent(new CustomEvent("gr8:talk", { detail: { open: open, spot: spotFor(view) } }));
    if (open) show2(view === "staffok" ? "staffok" : "who", true);
    if (!quiet) { navRipple(); ripple(); }
    if (open) { say.classList.add("hide"); if (location.hash !== "#talk") history.pushState(null, "", "#talk"); setTimeout(function () { var f = $("input, button", tk); if (f && innerWidth > 900) f.focus({ preventScroll: true }); }, 2000); }
    else if (location.hash === "#talk") history.pushState(null, "", location.pathname + location.search);
  }
  /* the steps inside "Let's talk": who's asking, then the loan seeker, the borrower or the staff path. Staff steps fly the
     camera from the grove to the office on the other shore. */
  var view = "who";
  /* the first time a step appears, its clickable words type themselves in, one after another, with one typing sound;
     after that they simply stay (no replay on hover, focus or coming back) */
  var typedViews = {};
  function typeOnce(v, delay) {
    if (typedViews[v]) return; typedViews[v] = true;
    var box = tk.querySelector('[data-v="' + v + '"]'); if (!box) return;
    var els = Array.prototype.slice.call(box.querySelectorAll(".tk-go .t, .tk-back, .tk-btn > span, .tk-link"));
    setTimeout(function () {
      if (!talkOpen || view !== v || !els.length) return;
      var total = 0; els.forEach(function (el, k) { var n = el.textContent.length, d = Math.max(14, Math.min(34, 520 / (n || 1))) * n; setTimeout(function () { typeIn(el, true); }, k * 140); total = Math.max(total, k * 140 + d); });
      var snd = typeSound(total / 1000 + .05);
    }, delay);
  }
  function spotFor(v) { return v === "staff" || v === "staffok" ? "office" : "grove"; }
  function show2(v, quiet) {
    var was = view; view = v;
    Array.prototype.forEach.call(tk.querySelectorAll(".tk-v"), function (el) { var on = el.dataset.v === v; el.hidden = !on; el.classList.toggle("in", on && !quiet); });
    if (spotFor(v) !== spotFor(was) || quiet) window.dispatchEvent(new CustomEvent("gr8:talk", { detail: { open: talkOpen, spot: spotFor(v) } }));
    if (!quiet) { tk.scrollTo({ top: 0, behavior: "smooth" }); pick(true); }
    typeOnce(v, quiet ? 1500 : 350);
    if (v === "staff") setTimeout(function () { var u = $("#stForm [name=username]"); if (u && innerWidth > 900) u.focus({ preventScroll: true }); }, 900);
  }
  tk.addEventListener("click", function (e) {
    var b = e.target.closest("[data-to]"); if (!b) return; e.preventDefault();
    if (b.dataset.to === "staff") { staffCheck(); return; }
    if (b.dataset.ask) { var m = $("#tkForm [name=message]"); if (m && !m.value) m.value = "About my loan (reference): "; }
    show2(b.dataset.to);
  });
  /* staff: already signed in to CALMS on this browser? go straight to the app; otherwise ask */
  function staffWelcome(u) {
    $("#stName").textContent = ((u && (u.shortName || u.name || u.username)) || "friend").split(" ")[0].toUpperCase();
    $("#stRole").textContent = (u && u.roleName) || "GR8 staff";
    var dl = $("#stDl"), href = dl.dataset.href; if (href) { dl.href = href; dl.classList.remove("soon"); } else { dl.classList.add("soon"); $("span", dl).textContent = "Coming soon"; }
    show2("staffok");
  }
  function staffCheck() {
    fetch("/api/auth/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.user) staffWelcome(j.user); else show2("staff"); }).catch(function () { show2("staff"); });
  }
  var stForm = $("#stForm"), stNote = $("#stNote"), stNoteTx = stNote.textContent, stStep = "pw";
  function stSay(t, bad) { stNote.textContent = t; stNote.classList.toggle("err", !!bad); }
  function stPost(url, body) { return fetch(url, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "network"); return j; }); }); }
  stForm.addEventListener("submit", function (e) {
    e.preventDefault(); var f = stForm.elements, btn = $(".tk-btn", stForm);
    if (stStep === "pw" && (!f.username.value.trim() || !f.password.value)) { stSay("Enter your username and password.", true); pick(false); return; }
    if (stStep === "code" && !/^\d{6}$/.test(f.code.value.trim())) { stSay("Enter the 6-digit code from your authenticator.", true); pick(false); return; }
    btn.disabled = true; $("span", btn).textContent = "Checking...";
    (stStep === "pw" ? stPost("/api/auth/login", { username: f.username.value.trim(), password: f.password.value }) : stPost("/api/auth/verify", { code: f.code.value.trim() }))
      .then(function (j) {
        if (j.step === "done") { f.password.value = ""; f.code.value = ""; stStep = "pw"; $("#stCodeRow").hidden = true; stSay(stNoteTx); pick(true); staffWelcome(j.user); return; }
        if (j.step === "mfa") { stStep = "code"; $("#stCodeRow").hidden = false; stSay("One more step: the code from your authenticator app."); f.code.focus(); return; }
        if (j.step === "enrol") { stSay("Your account needs its authenticator set up first. Open CALMS in the browser once to do that, then come back.", true); return; }
        throw new Error("network");
      })
      .catch(function (err) { var net = /network|fetch/i.test(err.message); stSay(net ? "We couldn't reach CALMS just now. Try again in a moment." : err.message, true); pick(false); if (!net) window.dispatchEvent(new Event("gr8:alarm")); })
      .then(function () { btn.disabled = false; $("span", btn).textContent = stStep === "code" ? "Verify" : "Sign in"; });
  });
  $("#stOut").addEventListener("click", function () { fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(function () {}).then(function () { stStep = "pw"; $("#stCodeRow").hidden = true; show2("staff"); }); });
  $("#stDl").addEventListener("click", function (e) { if (!this.dataset.href) e.preventDefault(); });
  /* ================= one way to move between places =================
     Every link, button, the back button and the other scripts go through go(). It first closes whatever lies on top
     (the Apply page, a card's page, the menus) without touching the history, then moves. A move can start while another
     is still running: the smoke simply turns round (scene.js), nothing waits for anything, so nothing can get stuck. */
  var px = innerWidth / 2, py = innerHeight / 2;
  addEventListener("pointerdown", function (e) { px = e.clientX; py = e.clientY; }, true);
  function ripple() { window.dispatchEvent(new CustomEvent("gr8:ripple", { detail: { x: px / innerWidth, y: 1 - py / innerHeight } })); }
  function closeOverlays() {
    if (window.GR8_APPLY && window.GR8_APPLY.isOpen()) window.GR8_APPLY.close({ nav: true });
    if (lpI != null || lpBusy) lpReset();
    popOpen(false); nav.classList.remove("open"); mb.setAttribute("aria-expanded", "false"); mb.textContent = "Menu";
    if (!loMenu.hidden) { loMenu.hidden = true; loF.setAttribute("aria-expanded", "false"); }
  }
  function go(where) {
    if (!entered) return; closeOverlays();
    if (where === "talk") setTalk(true);
    else if (where === "loans" || where === "about") setRoom(where);
    else { if (talkOpen) setTalk(false); if (room) setRoom(null); }
    var h = where === "home" ? "" : "#" + where;   /* already there (e.g. under the Apply page): just make the address match */
    if (location.hash !== h) history.replaceState(null, "", h || location.pathname + location.search);
  }
  Array.prototype.forEach.call(document.querySelectorAll("[data-talk]"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); go("talk"); }); });
  talkBtn.addEventListener("click", function (e) { e.preventDefault(); if (!entered) return; var covered = window.GR8_APPLY && window.GR8_APPLY.isOpen(); go(talkOpen && !covered ? "home" : "talk"); });
  addEventListener("popstate", function () {
    var h = location.hash; if (h === "#apply") { if (window.GR8_APPLY) window.GR8_APPLY.open({}); return; }
    go(h === "#talk" ? "talk" : h === "#loans" || h === "#about" ? h.slice(1) : "home");
  });
  addEventListener("keydown", function (e) { if (e.key === "Escape" && talkOpen && !root.classList.contains("kc-open") && !(window.GR8_APPLY && window.GR8_APPLY.isOpen())) go("home"); });
  addEventListener("gr8:enter", function () { var h = location.hash; if (h === "#talk") setTimeout(function () { if (!talkOpen && !room) setTalk(true, true); }, 3200); else if (h === "#loans" || h === "#about") setTimeout(function () { if (!talkOpen && !room) setRoom(h.slice(1)); }, 2400); });
  /* the choices: radio rows, built from the lists in the page (and the live loan products for the first one) */
  function opts(box, list) {
    var name = box.dataset.name; box.innerHTML = "";
    list.forEach(function (t, i) { var l = document.createElement("label"); l.className = "tk-opt";
      l.innerHTML = '<input type="radio" name="' + name + '"><span class="dot"></span><span class="t"></span>'; $("input", l).value = t; $(".t", l).textContent = t;
      $("input", l).addEventListener("change", function () { pick(true); box.closest(".tk-q").classList.remove("bad"); }); box.appendChild(l); });
  }
  Array.prototype.forEach.call(tk.querySelectorAll(".tk-opts[data-opts]"), function (b) { opts(b, b.dataset.opts.split("|")); });
  var needBox = $("#tkNeed"), needs = ["A salary loan", "A personal loan", "My business", "Not sure, let's talk"];
  opts(needBox, needs);
  fetch("/api/public/talk").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.products || !j.products.length) return;
    opts(needBox, j.products.map(function (p) { return "A " + p.name.toLowerCase().replace(/^a /, "") + (/loan$/i.test(p.name) ? "" : " loan"); }).concat(["Not sure, let's talk"]));
  }).catch(function () {});
  /* sending */
  var form = $("#tkForm"), note = $("#tkNote"), noteTx = note.textContent;
  function val(n) { var c = form.querySelector('input[name="' + n + '"]:checked'); return c ? c.value : ""; }
  form.addEventListener("submit", function (e) {
    e.preventDefault(); note.classList.remove("err"); note.textContent = noteTx;
    var d = { need: val("need"), amount: val("amount"), months: val("months"), reach: val("reach"), name: form.elements.name.value.trim(), mobile: form.elements.mobile.value.trim(), email: form.elements.email.value.trim(), message: form.elements.message.value.trim(), website: form.elements.website.value };
    var miss = null; [["need", "Tell us what the loan is for."], ["amount", "Pick about how much you need."], ["reach", "Tell us how to reach you."]].forEach(function (m) { if (!d[m[0]]) { form.querySelector('[data-name="' + m[0] + '"]').closest(".tk-q").classList.add("bad"); miss = miss || m[1]; } });
    if (!miss && !d.name) miss = "Tell us your name.";
    if (!miss && !d.mobile && !d.email) miss = "Give us a mobile number or an email.";
    if (!miss && d.reach === "Email" && !d.email) miss = "Add your email so we can write to you.";
    if (!miss && d.reach !== "Email" && !d.mobile) miss = "Add your mobile number so we can call or text you.";
    if (miss) { note.textContent = miss; note.classList.add("err"); pick(false); tk.classList.remove("warn"); void tk.offsetWidth; tk.classList.add("warn"); window.dispatchEvent(new Event("gr8:alarm")); return; }
    var btn = $(".tk-btn", form); btn.disabled = true; $("span", btn).textContent = "Sending...";
    fetch("/api/public/talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "network"); return j; }); })
      .then(function (j) { $("#tkName").textContent = d.name.split(" ")[0]; $("#tkRef").textContent = j.ref || "received"; form.hidden = true; $("#tkDone").hidden = false; pick(true); tk.scrollTo({ top: 0, behavior: "smooth" }); })
      .catch(function (err) { note.textContent = /fetch|network/i.test(err.message) ? "We couldn't reach GR8 just now. Check your connection and try again." : err.message; note.classList.add("err"); pick(false); })
      .then(function () { btn.disabled = false; $("span", btn).textContent = "Send it"; });
  });
  $("#tkAgain").addEventListener("click", function () { form.reset(); form.hidden = false; $("#tkDone").hidden = true; });

  /* ================= the rooms: Loans and About (rooms.js draws them; scene.js carries us there in smoke) ================= */
  var room = null, loUI = $("#loansUI"), abUI = $("#aboutUI");
  loUI.inert = true; abUI.inert = true;
  function setRoom(name, via) {   /* via "beads": the scroll journey's way in, through the 8's light (homescroll.js) */
    name = name || null; if (!entered || name === room) return;
    if (talkOpen) setTalk(false, true);
    room = name; page = name || "home";
    typing.forEach(function (r) { if (!activeHere(r.el)) r.stop(); }); hoverEl = null;
    root.classList.toggle("room-on", !!name); $(".scopy").inert = !!name; say.inert = !!name; clearTimeout(hideT); if (name) say.classList.add("hide");
    if (swish && name) swish.g.gain.setTargetAtTime(0, ctx().currentTime, .05);
    var o = document.getElementById("orb"); if (o) o.classList.remove("beat"); body.classList.remove("beat");
    var want = name ? "#" + name : ""; if (location.hash !== want) history.pushState(null, "", want || location.pathname + location.search);
    window.dispatchEvent(new CustomEvent("gr8:room", { detail: { room: name, via: via } }));
    if (via !== "beads") { navRipple(); ripple(); }
  }
  window.GR8_GO = setRoom;
  /* the smoke has covered the screen and the place has changed: show that place's writing */
  addEventListener("gr8:place", function (e) {
    var at = e.detail; root.classList.toggle("at-loans", at === "loans"); root.classList.toggle("at-about", at === "about");
    loUI.inert = at !== "loans"; abUI.inert = at !== "about";
    if (at === "loans") loansReady(); if (at === "about") abReset();
    if (at !== "loans") $("#loSheet").hidden = true;
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-room]"), function (a) { a.addEventListener("click", function (e) { e.preventDefault(); go(a.dataset.room); }); });
  $(".brand").addEventListener("click", function (e) { var covered = window.GR8_APPLY && window.GR8_APPLY.isOpen(); if (!room && !talkOpen && !covered) return; e.preventDefault(); go("home"); });
  /* LOANS: pager ticks, the filter, the card you're looking at, the sheet for the card you clicked */
  var loBuilt = false, loCat = "All";
  function cards() { return (window.GR8_ROOMS && window.GR8_ROOMS.cards) || []; }
  function pad(n) { return ("0" + n).slice(-2); }
  function loansReady() {
    if (loBuilt || !cards().length) return; loBuilt = true; var t = $("#loTicks");
    cards().forEach(function (c, i) { var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-label", c.title); b.addEventListener("click", function () { window.dispatchEvent(new CustomEvent("gr8:cardgo", { detail: i })); }); t.appendChild(b); });
    $("#loN").textContent = pad(cards().length); loFocus(window.GR8_ROOMS.focusI || 0);
  }
  function loFocus(i) { var c = cards()[i]; if (!c) return; $("#loI").textContent = pad(i + 1); $("#loNow").textContent = "_" + pad(i + 1) + " · " + c.title.replace(/^\d+\s+/, "").toUpperCase();
    Array.prototype.forEach.call($("#loTicks").children, function (b, k) { b.classList.toggle("on", k === i); b.classList.toggle("off", loCat !== "All" && cards()[k].cat !== loCat); }); }
  addEventListener("gr8:cardfocus", function (e) { loFocus(e.detail); if (room === "loans" && !lpI) gear(); });
  addEventListener("gr8:card", function (e) { lpOpen(e.detail); });
  addEventListener("gr8:card_old", function (e) { var c = cards()[e.detail]; if (!c) return;
    $("#loCat").textContent = c.cat; $("#loHead").textContent = c.title; $("#loLines").innerHTML = (c.lines || []).map(function (l) { return l.replace(/[&<>]/g, function (x) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[x]; }); }).join("<br>"); $("#loBody").textContent = c.body || "";
    var sh = $("#loSheet"); sh.hidden = true; void sh.offsetWidth; sh.hidden = false; pick(true); });
  $("#loX").addEventListener("click", function () { $("#loSheet").hidden = true; pick(false); });
  var loF = $("#loF"), loMenu = $("#loMenu"), LO_LABEL = { "All": "Filter", "Loans": "The loans", "How it works": "How it works", "What to bring": "What to bring", "Fair rules": "Fair rules" };
  loF.addEventListener("click", function (e) { e.stopPropagation(); var o = loMenu.hidden; loMenu.hidden = !o; loF.setAttribute("aria-expanded", String(o)); menuSnd(o); });
  document.addEventListener("click", function (e) { if (!loMenu.hidden && !e.target.closest(".lo-filter")) { loMenu.hidden = true; loF.setAttribute("aria-expanded", "false"); } });
  Array.prototype.forEach.call(loMenu.querySelectorAll("button"), function (b) { b.addEventListener("click", function () {
    loCat = b.dataset.cat; Array.prototype.forEach.call(loMenu.children, function (x) { x.classList.toggle("on", x === b); }); loMenu.hidden = true; $("span", loF).textContent = LO_LABEL[loCat] || "Filter";   /* labels come from this list, never from the screen (which may be mid-animation) */
    window.dispatchEvent(new CustomEvent("gr8:loansfilter", { detail: loCat })); pick(true); }); });
  addEventListener("keydown", function (e) { if (room !== "loans" || /input|textarea/i.test(document.activeElement.tagName)) return; var i = (window.GR8_ROOMS && window.GR8_ROOMS.focusI) || 0;
    if (e.key === "ArrowRight") window.dispatchEvent(new CustomEvent("gr8:cardgo", { detail: i + 1 })); if (e.key === "ArrowLeft") window.dispatchEvent(new CustomEvent("gr8:cardgo", { detail: i - 1 })); if (e.key === "Escape") $("#loSheet").hidden = true; });
  /* ABOUT: five scenes, driven by the scroll (scene.js follows it with a soft lag). p runs 0..1 over the tall track:
       1 and 2 (0 - .44): the original walk to the table, its two texts at the same moments as before;
       3 (lounge: purpose, identity, values), 4 (turning to the window), 5 (at the window: history, leadership, team);
       then (.92 - 1) the pull into the window, and past the track the memory lane scrolls up out of the dark.
     Each text shows only while the camera holds still for it. */
  var abState = 1, AB_T = [[0, .065], [.31, .45], [.53, .645], [.735, .8], [.865, .93]], memCover = false;
  function abSet(p) {
    var st = 0; AB_T.forEach(function (r, k) { if (p >= r[0] && p < r[1]) st = k + 1; }); if (p <= 0) st = 1; if (st === abState) return; abState = st;
    for (var k = 1; k <= 5; k++) $("#abT" + k).classList.toggle("on", st === k); $("#abHint").classList.toggle("gone", st !== 1);
  }
  function abScroll() {
    var track = $(".ab-track", abUI), m = track.offsetHeight - abUI.clientHeight, p = m > 0 ? Math.min(1, abUI.scrollTop / m) : 0;
    abSet(p); window.dispatchEvent(new CustomEvent("gr8:aboutscroll", { detail: p }));
    var past = abUI.scrollTop - m, mem = p > .97;   /* the nostalgic music fades in as the pull ends */
    if (mem !== memOn) { memOn = mem; syncBgm(); }
    var cover = past > abUI.clientHeight * 1.45;   /* the memory lane fills the screen: the 3D world can rest */
    if (cover !== memCover) { memCover = cover; window.dispatchEvent(new CustomEvent("gr8:pause3d", { detail: cover })); }
    root.classList.toggle("ab-mem", past > 0);
  }
  abUI.addEventListener("scroll", abScroll, { passive: true });
  /* leaving About (or coming back) always starts it fresh: top of the walk, calm music, the world drawing again */
  function abReset() { abUI.scrollTop = 0; abState = -1; abSet(0); if (memOn) { memOn = false; syncBgm(); } if (memCover) { memCover = false; window.dispatchEvent(new CustomEvent("gr8:pause3d", { detail: false })); } root.classList.remove("ab-mem"); window.dispatchEvent(new CustomEvent("gr8:aboutscroll", { detail: 0 })); }
  addEventListener("gr8:place", function (e) { if (e.detail !== "about") abReset(); });
  abUI.addEventListener("click", function (e) {
    if (e.target.closest("[data-top]")) { e.preventDefault(); abUI.scrollTo({ top: 0, behavior: "smooth" }); }
    if (e.target.closest("[data-talk-ml]")) { e.preventDefault(); go("talk"); }
  });

  /* ================= the Loans hall: a small gear tick each time the ring clicks round to the next card ================= */
  var lastGear = 0;
  function gear() {   /* a tiny refined mechanism: two quick bright clicks (the teeth) over a short soft tock, quiet */
    if (!soundOn()) return; var now = performance.now(); if (now - lastGear < 85) return; lastGear = now;
    var A = ctx(), o = out(), t = A.currentTime, r = .94 + Math.random() * .12;
    [[0, 4200, .09], [.022, 3300, .05]].forEach(function (c) { var s = A.createBufferSource(), bp = A.createBiquadFilter(), g = A.createGain(); s.buffer = noise; bp.type = "bandpass"; bp.frequency.value = c[1] * r; bp.Q.value = 6;
      g.gain.setValueAtTime(c[2], t + c[0]); g.gain.exponentialRampToValueAtTime(.0001, t + c[0] + .012); s.connect(bp); bp.connect(g); g.connect(o); s.start(t + c[0], Math.random() * 1.5, .02); });
    var k = A.createOscillator(), kg = A.createGain(); k.type = "sine"; k.frequency.setValueAtTime(1050 * r, t); k.frequency.exponentialRampToValueAtTime(620 * r, t + .03);
    kg.gain.setValueAtTime(0, t); kg.gain.linearRampToValueAtTime(.045, t + .002); kg.gain.exponentialRampToValueAtTime(.0001, t + .045); k.connect(kg); kg.connect(o); k.start(t); k.stop(t + .06);
  }

  /* ================= each card's own page =================
     The words for every card. Labels follow the reference (Type / Year / Scope / Challenge), retold for a lender. */
  var PAGES = [
    { l1: "Type", v1: "Loan", l2: "Amount", l3: "Made for", chips: ["Employed", "Regular payslip", "Fixed monthly"], l4: "The idea", p: "To give working Filipinos a loan that fits their payday: one fixed amount each month, shown in full before they sign anything.", name: "salary loan.", tag: "Steady work, steady payments, no surprises" },
    { l1: "Type", v1: "Loan", l2: "Amount", l3: "Made for", chips: ["School fees", "Home repair", "Hospital bills"], l4: "The idea", p: "To help with life's big moments without the fine print. Tell us what it's for and we find a term you can carry.", name: "personal loan.", tag: "For the moments that matter most" },
    { l1: "Type", v1: "Loan", l2: "Amount", l3: "Made for", chips: ["Stock", "Equipment", "Working capital"], l4: "The idea", p: "To fund small businesses by looking at how the business really earns, not only at payslips, so the shop can grow at its own pace.", name: "sme loan.", tag: "Grow the shop, keep the peace" },
    { l1: "Type", v1: "Step 01 of 06", l2: "Who", v2: "You, the applicant", l3: "In CALMS", chips: ["Online form", "Live cost", "Reference number"], l4: "What happens", p: "You pick a loan, an amount and a term. CALMS shows the monthly payment, the fee and what you receive before you send anything.", name: "apply.", tag: "About ten minutes, online or at the branch" },
    { l1: "Type", v1: "Step 02 of 06", l2: "Who", v2: "Loan processor", l3: "In CALMS", chips: ["ID check", "Income proof", "Same day"], l4: "What happens", p: "A loan processor checks every paper in CALMS and tells you right away if anything is missing, so nothing waits in a drawer.", name: "papers.", tag: "Checked the same day you send them" },
    { l1: "Type", v1: "Step 03 of 06", l2: "Who", v2: "Underwriter", l3: "In CALMS", chips: ["Credit check", "Capacity", "Risk score"], l4: "What happens", p: "An underwriter weighs what you earn against what you already owe, so the loan never becomes heavier than you can carry.", name: "review.", tag: "A real person looks at your case" },
    { l1: "Type", v1: "Step 04 of 06", l2: "Who", v2: "Approver", l3: "In CALMS", chips: ["Sign-off", "Two sets of eyes", "Audit trail"], l4: "What happens", p: "An approver signs off. If the amount or term changes, you see the new numbers before you sign anything at all.", name: "approval.", tag: "Approved, adjusted or declined, in writing" },
    { l1: "Type", v1: "Step 05 of 06", l2: "Who", v2: "Disbursement officer", l3: "In CALMS", chips: ["Cash or bank", "Schedule set", "SMS reminders"], l4: "What happens", p: "Once you sign, the money is released and your schedule is set. CALMS sends every due date to your phone ahead of time.", name: "release.", tag: "The same day, once you've signed" },
    { l1: "Type", v1: "Step 06 of 06", l2: "Who", v2: "You, and our cashier", l3: "In CALMS", chips: ["Posted instantly", "My GR8", "Receipts"], l4: "What happens", p: "Every payment is posted to your account the moment it is made, and your balance is always there to see in My GR8.", name: "pay.", tag: "Every peso counted, every peso shown" },
    { l1: "Type", v1: "What to bring", l2: "How many", v2: "One is enough", l3: "We accept", chips: ["PhilSys", "SSS / UMID", "Driver's license", "Passport"], l4: "Why we ask", p: "So we know it's really you. Bring the original; we take a copy and give it straight back.", name: "a valid id.", tag: "Any one government ID with your photo" },
    { l1: "Type", v1: "What to bring", l2: "How many", v2: "The last three months", l3: "We accept", chips: ["Payslips", "Certificate of employment", "ITR", "Sales records"], l4: "Why we ask", p: "So the loan fits what you really earn. Running a business? Your ITR or sales records tell us the same thing.", name: "proof of income.", tag: "So the loan fits what you earn" },
    { l1: "Type", v1: "What to bring", l2: "How many", v2: "One, from the last three months", l3: "We accept", chips: ["Electric bill", "Water bill", "Internet bill"], l4: "Why we ask", p: "So we can reach you and your papers match. Any recent bill with your name and address will do.", name: "proof of address.", tag: "A recent bill with your name on it" },
    { l1: "Type", v1: "Fair rule", l2: "Since", v2: "Day one", l3: "In practice", chips: ["Fee shown first", "Nothing added later", "In writing"], l4: "Our promise", p: "The processing fee is taken from the release and shown before you sign. Nothing is ever added afterwards.", name: "no hidden fees.", tag: "See it all before you sign" },
    { l1: "Type", v1: "Fair rule", l2: "Since", v2: "Day one", l3: "In practice", chips: ["Any time", "No penalty", "Less interest"], l4: "Our promise", p: "You can pay off your loan early whenever you like, and you only pay interest for the time you actually used.", name: "pay early, pay less.", tag: "Finish early, keep the difference" },
    { l1: "Type", v1: "Fair rule", l2: "Since", v2: "Day one", l3: "In practice", chips: ["We call first", "Rate shown up front", "In your agreement"], l4: "Our promise", p: "If you miss a due date we reach out first and talk it through. The late penalty is in your agreement from day one.", name: "late? we'll talk.", tag: "A call before any penalty" },
    { l1: "Type", v1: "Fair rule", l2: "Since", v2: "Day one", l3: "In practice", chips: ["CALMS only", "Need to know", "Every view logged"], l4: "Our promise", p: "What you give us stays in CALMS, seen only by the people working on your loan, and every look is written down.", name: "your data, kept.", tag: "Used only for your loan" }
  ];
  var lpI = null, lpBusy = false, lpTok = 0;
  function lpFill(i) {
    var c = cards()[i], d = PAGES[i] || {}; if (!c) return;
    $("#lpL1").textContent = d.l1 || "Type"; $("#lpV1").textContent = d.v1 || c.cat;
    $("#lpL2").textContent = d.l2 || "Detail"; $("#lpV2").textContent = d.v2 || (c.lines && c.lines[0]) || "";
    $("#lpL3").textContent = d.l3 || "For"; $("#lpChips").innerHTML = ""; (d.chips || []).forEach(function (t) { var li = document.createElement("li"); li.textContent = t; $("#lpChips").appendChild(li); });
    $("#lpL4").textContent = d.l4 || "The idea"; $("#lpP").textContent = d.p || c.body || "";
    $("#lpName").textContent = d.name || (c.title.toLowerCase() + "."); $("#lpTag").textContent = d.tag || c.tag || "";
    $("#lpImg").src = window.GR8_ROOMS.hero(i); $("#lpImg").alt = c.title;
    $("#lpToolT").textContent = window.GR8_TOOLS ? window.GR8_TOOLS.render(i, $("#lpTools")) : ""; $("#loanPage").scrollTop = 0;
  }
  /* click a card -> the camera glides into it -> the card's picture fills the screen -> it settles to the right as the page */
  function lpOpen(i) {
    if (lpBusy || lpI != null || room !== "loans") return; lpBusy = true; lpI = i; lpFill(i); var tok = ++lpTok;
    window.dispatchEvent(new CustomEvent("gr8:cardzoom", { detail: i })); pick(true);
    var pg = $("#loanPage"); pg.hidden = false; pg.inert = false; loUI.inert = true;
    setTimeout(function () { if (tok === lpTok) root.classList.add("lp-open"); }, 900);
    setTimeout(function () { if (tok === lpTok) { root.classList.add("lp-set"); lpBusy = false; } }, 1500);
  }
  /* drop a card's page at once (when moving somewhere else) */
  function lpReset() { lpTok++; root.classList.remove("lp-set", "lp-open"); $("#loanPage").inert = true; loUI.inert = room !== "loans"; lpI = null; lpBusy = false; window.dispatchEvent(new CustomEvent("gr8:cardzoom", { detail: null })); }
  function lpClose() {
    if (lpI == null || lpBusy) return; lpBusy = true; root.classList.remove("lp-set"); var tok = ++lpTok;
    setTimeout(function () { if (tok !== lpTok) return; root.classList.remove("lp-open"); window.dispatchEvent(new CustomEvent("gr8:cardzoom", { detail: null })); }, 700);
    setTimeout(function () { if (tok !== lpTok) return; $("#loanPage").inert = true; loUI.inert = room !== "loans"; lpI = null; lpBusy = false; }, 1400); menuSnd(false);
  }
  $("#loanPage").inert = true;
  $("#lpBack").addEventListener("click", lpClose);
  addEventListener("keydown", function (e) { if (e.key === "Escape" && lpI != null) lpClose(); });
  addEventListener("gr8:place", function (e) { if (e.detail !== "loans" && (lpI != null || lpBusy)) lpReset(); });

  /* the page's working parts sit below the first screen of a card page; the hint scrolls down to them */
  $("#lpMore").addEventListener("click", function () { var t = $("#lpTools"); $("#loanPage").scrollTo({ top: t.offsetTop - 90, behavior: "smooth" }); });
  /* "Apply now" anywhere opens the Apply page */
  Array.prototype.forEach.call(document.querySelectorAll("[data-apply]"), function (b) { b.addEventListener("click", function (e) { e.preventDefault(); if (window.GR8_APPLY) window.GR8_APPLY.open({}); }); });
  addEventListener("gr8:enter", function () { if (location.hash === "#apply") setTimeout(function () { if (window.GR8_APPLY) window.GR8_APPLY.open({}); }, 2600); });
  /* ================= counting visits (no names) =================
     One small note to CALMS when the page opens, and one the first time each part (About, Loans, Let's talk, Apply) is
     opened in a visit. Only the part, the referring site's name and phone/computer are sent; the server keeps a one-way
     daily code to count a person once a day, never the address. Browsers that ask not to be tracked send nothing. */
  var noTrack = navigator.doNotTrack === "1" || window.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  var sentParts = {};
  function beacon(kind, part) {
    if (noTrack || location.protocol === "file:") return;
    var body = JSON.stringify({ kind: kind, part: part, ref: kind === "open" ? document.referrer : "" });
    try { if (navigator.sendBeacon && navigator.sendBeacon("/api/public/visit", new Blob([body], { type: "application/json" }))) return; } catch (e) {}
    fetch("/api/public/visit", { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
  }
  function partSeen(part) { if (sentParts[part]) return; sentParts[part] = true; beacon("part", part); }
  beacon("open", "home");
  addEventListener("gr8:place", function (e) { if (e.detail === "about" || e.detail === "loans" || e.detail === "talk") partSeen(e.detail); });
  addEventListener("gr8:talk", function (e) { if (e.detail && e.detail.open) partSeen("talk"); });
  addEventListener("gr8:applyopen", function () { partSeen("apply"); });
  /* what the other scripts (tools.js, apply.js) may use */
  window.GR8_STAGE = {
    pick: function (on) { pick(on); }, menuSnd: function (on) { menuSnd(on); }, alarm: function () { window.dispatchEvent(new Event("gr8:alarm")); },
    go: go,
    talk: function (message) { go("talk"); setTimeout(function () { show2("loan"); var m = $("#tkForm [name=message]"); if (m && message) m.value = message; }, 600); }
  };
})();
