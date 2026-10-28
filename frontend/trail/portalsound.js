/* The sound of the lake (DRAFT), for Track and My GR8: played live by the browser (Web Audio), nothing downloaded and
   no one else's music. Water lapping at the boardwalk, a soft breeze by day and crickets at night, a slow warm pad
   moving through four gentle chords, and now and then a wind chime. ping(i) rings one soft note, for each lantern or
   stone that lights up. The button in the top bar turns it on and off (kept per computer, gr8-sound); browsers only
   allow sound after the visitor's first click or key, so it starts then. */
export function makeSound(isNight) {
  let A = null, master = null, on = true, timers = [], lastPing = 0, ready = false;
  try { on = localStorage.getItem("gr8-sound") !== "off"; } catch (e) {}
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const btn = document.querySelector(".pn .snd");
  function paint() { if (!btn) return; btn.setAttribute("aria-pressed", String(on)); btn.classList.toggle("on", on && !!A && A.state === "running"); }

  function noise(sec, brown) { const b = A.createBuffer(1, A.sampleRate * sec, A.sampleRate), d = b.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + .02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; } return b; }
  function loop(buf) { const s = A.createBufferSource(); s.buffer = buf; s.loop = true; s.start(); return s; }
  function lfo(rate, depth, target, base) { const o = A.createOscillator(), g = A.createGain(); o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(target); if (base != null) target.value = base; o.start(); }

  function build() {
    A = new (window.AudioContext || window.webkitAudioContext)();
    master = A.createGain(); master.gain.value = 0;
    const comp = A.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; master.connect(comp); comp.connect(A.destination);
    /* a wide, soft room */
    const rev = A.createConvolver(), len = A.sampleRate * 4.5, ir = A.createBuffer(2, len, A.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir; const wet = A.createGain(); wet.gain.value = .55; rev.connect(wet); wet.connect(master);
    /* water: deep, slow, breathing */
    const water = loop(noise(4, true)), wf = A.createBiquadFilter(), wg = A.createGain(); wf.type = "lowpass"; wf.frequency.value = 480; wg.gain.value = .09;
    water.connect(wf); wf.connect(wg); wg.connect(master); wg.connect(rev); lfo(.11, .035, wg.gain); lfo(.05, 120, wf.frequency);
    /* the breeze (by day) */
    const air = loop(noise(3, false)), af = A.createBiquadFilter(), ag = A.createGain(); af.type = "bandpass"; af.Q.value = .8; ag.gain.value = 0;
    air.connect(af); af.connect(ag); ag.connect(master); lfo(.04, 350, af.frequency, 800); lfo(.07, .006, ag.gain);
    /* the pad */
    const padF = A.createBiquadFilter(); padF.type = "lowpass"; padF.frequency.value = 1100; padF.connect(master); padF.connect(rev);
    const CH = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]];   /* D, Bm, G, A: gentle and open */
    let ci = 0;
    const pad = () => { const t = A.currentTime + .05, ch = CH[ci++ % CH.length];
      ch.forEach((m, k) => [-5, 5].forEach((det) => { const o = A.createOscillator(), g = A.createGain(); o.type = k ? "sine" : "triangle"; o.frequency.value = mtof(m); o.detune.value = det;
        const p = (k ? .014 : .02); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p, t + 4); g.gain.setValueAtTime(p, t + 9); g.gain.linearRampToValueAtTime(0, t + 15);
        o.connect(g); g.connect(padF); o.start(t); o.stop(t + 15.1); })); };
    /* chimes and pings: a soft bell through a slow echo */
    const dl = A.createDelay(2), fb = A.createGain(); dl.delayTime.value = .46; fb.gain.value = .33; dl.connect(fb); fb.connect(dl); dl.connect(rev);
    const bells = A.createGain(); bells.gain.value = 1; bells.connect(master); bells.connect(rev); bells.connect(dl);
    bell = (m, v, when) => { const t = when || A.currentTime + .02, f = mtof(m), o = A.createOscillator(), o2 = A.createOscillator(), g = A.createGain(), g2 = A.createGain(), pan = A.createStereoPanner ? A.createStereoPanner() : null;
      o.type = o2.type = "sine"; o.frequency.value = f; o2.frequency.value = f * 2.76; g2.gain.value = .18; o2.connect(g2); g2.connect(g); o.connect(g);
      if (pan) { pan.pan.value = Math.random() * 1.2 - .6; g.connect(pan); pan.connect(bells); } else g.connect(bells);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + 3.6); o.start(t); o2.start(t); o.stop(t + 3.7); o2.stop(t + 3.7); };
    const SCALE = [74, 76, 78, 81, 83, 86, 88];   /* D major pentatonic, high */
    const chime = () => { if (Math.random() < .55) { const n = 1 + (Math.random() < .35 ? 2 : 0); for (let i = 0; i < n; i++) bell(SCALE[Math.floor(Math.random() * SCALE.length)], .022, A.currentTime + i * .32); } };
    /* crickets (at night) */
    const cricket = () => { if (!isNight()) return; const t0 = A.currentTime + .05, f = 4300 + Math.random() * 700, pan = A.createStereoPanner ? A.createStereoPanner() : null; if (pan) { pan.pan.value = Math.random() * 1.6 - .8; pan.connect(master); }
      for (let c = 0; c < 3 + Math.floor(Math.random() * 3); c++) { const t = t0 + c * .14, o = A.createOscillator(), g = A.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.004, t + .01); g.gain.linearRampToValueAtTime(0, t + .07);
        o.connect(g); g.connect(pan || master); o.start(t); o.stop(t + .08); } };
    /* the water touching the boardwalk */
    const lap = () => { const t = A.currentTime + .05, s = A.createBufferSource(), f = A.createBiquadFilter(), g = A.createGain(); s.buffer = lapBuf; f.type = "bandpass"; f.frequency.value = 300 + Math.random() * 400; f.Q.value = 1.2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.05, t + .35); g.gain.linearRampToValueAtTime(0, t + 1.4); s.connect(f); f.connect(g); g.connect(master); g.connect(rev); s.start(t); s.stop(t + 1.5); };
    const lapBuf = noise(2, false);
    const day = () => { ag.gain.cancelScheduledValues(A.currentTime); ag.gain.setTargetAtTime(isNight() ? .002 : .012, A.currentTime, 2); };
    pad(); day();
    const every = (fn, a, b) => { const go = () => { fn(); timers.push(setTimeout(go, a + Math.random() * (b - a))); }; timers.push(setTimeout(go, a)); };
    every(pad, 10000, 10000); every(chime, 3500, 8000); every(cricket, 900, 2600); every(lap, 2200, 5200); every(day, 4000, 4000);
    ready = true;
  }
  let bell = null;
  function start() {
    if (!on) return;
    try { if (!A) build(); if (A.state === "suspended") A.resume(); } catch (e) { return; }
    master.gain.cancelScheduledValues(A.currentTime); master.gain.setValueAtTime(master.gain.value, A.currentTime); master.gain.linearRampToValueAtTime(.7, A.currentTime + 3);
    setTimeout(paint, 80);
  }
  function stop() { if (!A) return; master.gain.cancelScheduledValues(A.currentTime); master.gain.setValueAtTime(master.gain.value, A.currentTime); master.gain.linearRampToValueAtTime(0, A.currentTime + 1);
    setTimeout(() => { if (!on && A) A.suspend(); paint(); }, 1100); }
  const first = () => { removeEventListener("pointerdown", first, true); removeEventListener("keydown", first, true); if (on) start(); };
  addEventListener("pointerdown", first, true); addEventListener("keydown", first, true);
  if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); on = !on; try { localStorage.setItem("gr8-sound", on ? "on" : "off"); } catch (x) {} if (on) start(); else stop(); paint(); });
  document.addEventListener("visibilitychange", () => { if (!A) return; if (document.hidden) A.suspend(); else if (on) A.resume().then(paint); });
  paint();
  return {
    ping(i, kind) {   /* one soft note, rising with i; a lower, quieter one for a step that stopped */
      if (!on || !ready || !bell || A.state !== "running") return; const now = A.currentTime; if (now - lastPing < .09) return; lastPing = now;
      const UP = [62, 66, 69, 74, 78, 81, 86, 90]; bell(kind === "stop" ? 57 : UP[i % UP.length] + (i >= UP.length ? 0 : 0), kind === "stop" ? .03 : .045);
    },
    playing: () => !!(on && A && A.state === "running")
  };
}
