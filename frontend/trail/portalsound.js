/* The music of the lake (DRAFT), for Track and My GR8: played live by the browser (Web Audio), nothing downloaded and
   no one else's music. Only one thing plays: a slow, warm pad moving through four gentle chords, with a soft echo.
   No noise layers (no water, wind or crickets) and no random chimes. ping(i) rings one soft note when a lantern or a
   stone lights up, so a sound always has a reason. Built light for phones: few oscillators, no reverb convolution,
   and "playback" buffers so it never crackles. The top bar's button turns it on and off (kept per computer,
   gr8-sound); browsers only allow sound after the visitor's first tap or key, so it starts then. */
export function makeSound() {
  let A = null, master = null, on = true, timers = [], lastPing = 0, ready = false;
  try { on = localStorage.getItem("gr8-sound") !== "off"; } catch (e) {}
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const btn = document.querySelector(".pn .snd");
  function paint() { if (!btn) return; btn.setAttribute("aria-pressed", String(on)); btn.classList.toggle("on", on && !!A && A.state === "running"); }

  function build() {
    const K = window.AudioContext || window.webkitAudioContext;
    try { A = new K({ latencyHint: "playback" }); } catch (e) { A = new K(); }
    master = A.createGain(); master.gain.value = 0; master.connect(A.destination);
    /* space: two soft echoes instead of a reverb (a fraction of the work for the phone) */
    const space = A.createGain(); space.gain.value = .35; space.connect(master);
    const d1 = A.createDelay(1.5), d2 = A.createDelay(1.5), f1 = A.createGain(), lpE = A.createBiquadFilter();
    d1.delayTime.value = .37; d2.delayTime.value = .61; f1.gain.value = .38; lpE.type = "lowpass"; lpE.frequency.value = 1400;
    space.connect(d1); space.connect(d2); d1.connect(lpE); d2.connect(lpE); lpE.connect(f1); f1.connect(d1); lpE.connect(master);
    /* the pad: four notes a chord, one sine each, long slow swells overlapping */
    const padF = A.createBiquadFilter(); padF.type = "lowpass"; padF.frequency.value = 1000; padF.connect(master); padF.connect(space);
    const CH = [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 55, 59], [45, 52, 57, 61]];   /* D, Bm, G, A */
    let ci = 0;
    const pad = () => { const t = A.currentTime + .05, ch = CH[ci++ % CH.length];
      ch.forEach((m, k) => { const o = A.createOscillator(), g = A.createGain(); o.type = k ? "sine" : "triangle"; o.frequency.value = mtof(m);
        const p = k ? .03 : .04; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p, t + 4); g.gain.setValueAtTime(p, t + 9); g.gain.linearRampToValueAtTime(0, t + 14);
        o.connect(g); g.connect(padF); o.start(t); o.stop(t + 14.1); }); };
    bell = (m, v) => { const t = A.currentTime + .02, o = A.createOscillator(), g = A.createGain(); o.type = "sine"; o.frequency.value = mtof(m);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 2.4); o.connect(g); g.connect(master); g.connect(space); o.start(t); o.stop(t + 2.5); };
    pad(); timers.push(setInterval(() => { if (A.state === "running") pad(); }, 10000));
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
