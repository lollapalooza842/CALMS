/* The music of the lake (DRAFT), for Track and My GR8: played live by the browser (Web Audio), nothing downloaded and
   no one else's music. Meant to sit quietly under the page, like a room with soft music on:
   - a warm, slow pad: pure sine tones only (no buzzy waves), voiced low and close, each chord fading in over five
     seconds and out over seven, so one chord melts into the next with no edges; D major, gently: D - Bm - G - A;
   - now and then, a single soft "glass" note from the same five-note scale, so nothing ever clashes with the pad,
     placed wide in the stereo field with one quiet echo;
   - ping(i) rings one soft note when a lantern or a stone lights up, so a sound always has a reason.
   No noise layers, no beats, nothing sudden. Light enough for phones: a handful of oscillators at a time, one echo
   instead of a reverb, "playback" buffers so it never crackles. The top bar's button turns it on and off (kept per
   computer, gr8-sound); browsers only allow sound after the visitor's first tap or key, so it starts then. */
export function makeSound() {
  let A = null, master = null, on = true, timers = [], lastPing = 0, ready = false, glass = null;
  try { on = localStorage.getItem("gr8-sound") !== "off"; } catch (e) {}
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const btn = document.querySelector(".pn .snd");
  const LEVEL = .42;   /* the whole thing, at its loudest: quiet on purpose */
  function paint() { if (!btn) return; btn.setAttribute("aria-pressed", String(on)); btn.classList.toggle("on", on && !!A && A.state === "running"); }

  function build() {
    const K = window.AudioContext || window.webkitAudioContext;
    try { A = new K({ latencyHint: "playback" }); } catch (e) { A = new K(); }
    master = A.createGain(); master.gain.value = 0;
    const tone = A.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 2400; tone.Q.value = .3;   /* takes the edge off everything */
    const calm = A.createDynamicsCompressor(); calm.threshold.value = -24; calm.knee.value = 18; calm.ratio.value = 3; calm.attack.value = .05; calm.release.value = .6;
    master.connect(tone); tone.connect(calm); calm.connect(A.destination);
    const pan = (v) => { if (!A.createStereoPanner) return null; const p = A.createStereoPanner(); p.pan.value = v; return p; };

    /* one quiet echo for the glass notes (the pad needs none) */
    const echo = A.createDelay(1.2), fb = A.createGain(), eTone = A.createBiquadFilter(), eOut = A.createGain();
    echo.delayTime.value = .48; fb.gain.value = .22; eTone.type = "lowpass"; eTone.frequency.value = 1500; eOut.gain.value = .3;
    echo.connect(eTone); eTone.connect(fb); fb.connect(echo); eTone.connect(eOut); eOut.connect(master);

    /* the pad */
    const padF = A.createBiquadFilter(); padF.type = "lowpass"; padF.frequency.value = 700; padF.Q.value = .2; padF.connect(master);
    const CH = [[38, 50, 54, 57, 61], [35, 50, 54, 57, 62], [31, 50, 55, 59, 62], [33, 49, 52, 57, 61]];   /* Dmaj7, Bm, Gmaj7, A: a low root, then four close notes */
    const SIDE = [-.35, -.15, .1, .3, -.05];
    let ci = 0;
    const pad = () => {
      const t = A.currentTime + .05, ch = CH[ci++ % CH.length];
      ch.forEach((m, k) => {
        const o = A.createOscillator(), g = A.createGain(), p = pan(SIDE[k]);
        o.type = "sine"; o.frequency.value = mtof(m); o.detune.value = (k % 2 ? 3 : -3);   /* a breath of movement, not a wobble */
        const peak = k === 0 ? .055 : .028;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 5); g.gain.setValueAtTime(peak, t + 9); g.gain.linearRampToValueAtTime(0, t + 16);
        o.connect(g); if (p) { g.connect(p); p.connect(padF); } else g.connect(padF);
        o.start(t); o.stop(t + 16.2);
      });
    };
    /* a glass note: a sine with its octave, soft at the start, a long fade */
    glass = (m, v, side) => {
      const t = A.currentTime + .03, g = A.createGain(), p = pan(side == null ? Math.random() * 1.2 - .6 : side);
      [[1, 1], [2, .18]].forEach(([mul, lv]) => { const o = A.createOscillator(), og = A.createGain(); o.type = "sine"; o.frequency.value = mtof(m) * mul; og.gain.value = lv; o.connect(og); og.connect(g); o.start(t); o.stop(t + 4.2); });
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .06); g.gain.exponentialRampToValueAtTime(.0001, t + 4);
      const out = p || g; if (p) g.connect(p); out.connect(master); out.connect(echo);
    };
    const SCALE = [62, 64, 66, 69, 71, 74, 76, 78];   /* D major's five notes, over an octave and a bit */
    let last = 3;
    const drift = () => {   /* now and then a note, stepping gently up or down from the last one */
      if (A.state === "running") { last = Math.max(0, Math.min(SCALE.length - 1, last + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)])); glass(SCALE[last], .022); }
      timers.push(setTimeout(drift, 4500 + Math.random() * 6500));
    };
    pad(); timers.push(setInterval(() => { if (A.state === "running") pad(); }, 11000));
    timers.push(setTimeout(drift, 6000));
    ready = true;
  }
  function start() {
    if (!on) return;
    try { if (!A) build(); if (A.state === "suspended") A.resume(); } catch (e) { return; }
    master.gain.cancelScheduledValues(A.currentTime); master.gain.setValueAtTime(master.gain.value, A.currentTime); master.gain.linearRampToValueAtTime(LEVEL, A.currentTime + 6);   /* fades in slowly */
    setTimeout(paint, 80);
  }
  function stop() { if (!A) return; master.gain.cancelScheduledValues(A.currentTime); master.gain.setValueAtTime(master.gain.value, A.currentTime); master.gain.linearRampToValueAtTime(0, A.currentTime + 1.5);
    setTimeout(() => { if (!on && A) A.suspend(); paint(); }, 1600); }
  const first = () => { removeEventListener("pointerdown", first, true); removeEventListener("keydown", first, true); if (on) start(); };
  addEventListener("pointerdown", first, true); addEventListener("keydown", first, true);
  if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); on = !on; try { localStorage.setItem("gr8-sound", on ? "on" : "off"); } catch (x) {} if (on) start(); else stop(); paint(); });
  document.addEventListener("visibilitychange", () => { if (!A) return; if (document.hidden) A.suspend(); else if (on) A.resume().then(paint); });
  paint();
  return {
    ping(i, kind) {   /* one soft note, rising with i; a lower, quieter one for a step that stopped */
      if (!on || !ready || !glass || A.state !== "running") return; const now = A.currentTime; if (now - lastPing < .12) return; lastPing = now;
      const UP = [62, 66, 69, 74, 76, 78, 81, 86]; glass(kind === "stop" ? 57 : UP[i % UP.length], kind === "stop" ? .02 : .03, 0);
    },
    playing: () => !!(on && A && A.state === "running")
  };
}
