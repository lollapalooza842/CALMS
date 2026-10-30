/* The music of the lake (DRAFT), for Track and My GR8: a soft wooden flute, played live by the browser (Web Audio);
   nothing downloaded and no one else's music.
   - The flute: a pure tone with a little of its octave, a gentle breath at the start of a phrase, and a slow, light
     vibrato that comes in only on long notes, like a player who is in no hurry.
   - What it plays: short, original phrases in D major's five notes (so no note ever clashes), at a slow walking pace,
     with long rests between them (a few seconds of quiet is part of the music). The phrases come in a shuffled order.
   - One soft echo gives it a little room. No pad, no drums, no noise layers.
   - ping(i) plays one short, quiet flute note when a lantern or a stone lights up, so a sound always has a reason.
   Light enough for phones: three oscillators per note, one echo, "playback" buffers so it never crackles.
   The top bar's button turns it on and off (kept per computer, gr8-sound); browsers only allow sound after the
   visitor's first tap or key, so it starts then, fading in. */
export function makeSound() {
  let A = null, master = null, on = true, lastPing = 0, ready = false, flute = null, timer = 0;
  try { on = localStorage.getItem("gr8-sound") !== "off"; } catch (e) {}
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const btn = document.querySelector(".pn .snd");
  const LEVEL = .5;
  function paint() { if (!btn) return; btn.setAttribute("aria-pressed", String(on)); btn.classList.toggle("on", on && !!A && A.state === "running"); }

  /* D4 E4 F#4 A4 B4 D5 E5 F#5 A5: [note, beats]; 0 is a breath of rest */
  const D4 = 62, E4 = 64, F4 = 66, A4 = 69, B4 = 71, D5 = 74, E5 = 76, F5 = 78;
  const PHRASES = [
    [[A4, 1], [B4, 1], [D5, 2], [B4, 1], [A4, 3]],
    [[F4, 1], [A4, 1], [B4, 1.5], [A4, .5], [F4, 1], [E4, 3]],
    [[D5, 1.5], [E5, .5], [D5, 1], [B4, 1], [A4, 2], [0, .5], [F4, 2.5]],
    [[E4, 1], [F4, 1], [A4, 2], [B4, 1], [A4, 1], [F4, 3]],
    [[A4, 1], [D5, 1], [E5, 2], [F5, 1], [E5, 1], [D5, 3]],
    [[B4, 1], [A4, 1], [F4, 1], [E4, 1], [D4, 4]],
    [[F4, 1.5], [E4, .5], [D4, 1], [E4, 1], [F4, 2], [A4, 3]],
    [[D5, 2], [B4, 1], [A4, 1], [B4, 1.5], [A4, .5], [F4, 3]]
  ];
  const BEAT = 60 / 66;   /* 66 beats a minute: unhurried */

  function build() {
    const K = window.AudioContext || window.webkitAudioContext;
    try { A = new K({ latencyHint: "playback" }); } catch (e) { A = new K(); }
    master = A.createGain(); master.gain.value = 0;
    const warm = A.createBiquadFilter(); warm.type = "lowpass"; warm.frequency.value = 3000; warm.Q.value = .4;
    master.connect(warm); warm.connect(A.destination);
    /* a little room: one soft echo */
    const echo = A.createDelay(1), fb = A.createGain(), eTone = A.createBiquadFilter(), wet = A.createGain();
    echo.delayTime.value = .36; fb.gain.value = .28; eTone.type = "lowpass"; eTone.frequency.value = 1800; wet.gain.value = .32;
    echo.connect(eTone); eTone.connect(fb); fb.connect(echo); eTone.connect(wet); wet.connect(master);
    /* the breath at the start of a phrase: a few milliseconds of soft, filtered air */
    const air = A.createBuffer(1, Math.round(A.sampleRate * .25), A.sampleRate), d = air.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);

    /* one flute note: m (midi), at t, for dur seconds, at level v; breath on the first note of a phrase */
    flute = (m, t, dur, v, breath) => {
      const f = mtof(m), g = A.createGain(), out = A.createGain(); out.gain.value = v;
      [[1, 1, "sine"], [2, .1, "sine"], [3, .035, "sine"]].forEach(([mul, lv, type]) => {
        const o = A.createOscillator(), og = A.createGain(); o.type = type; o.frequency.value = f * mul; og.gain.value = lv;
        if (dur > .8) {   /* vibrato on long notes only, easing in */
          const lfo = A.createOscillator(), depth = A.createGain(); lfo.frequency.value = 4.8; depth.gain.setValueAtTime(0, t); depth.gain.linearRampToValueAtTime(0, t + .35); depth.gain.linearRampToValueAtTime(f * mul * .0035, t + .9);
          lfo.connect(depth); depth.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + .5);
        }
        o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + .5);
      });
      const at = breath ? .16 : .07, end = t + dur;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + at); g.gain.linearRampToValueAtTime(.86, t + Math.min(dur * .6, at + .5));
      g.gain.setValueAtTime(.86, Math.max(t + at + .01, end - .12)); g.gain.linearRampToValueAtTime(0, end + .32);
      g.connect(out); out.connect(master); out.connect(echo);
      if (breath) { const n = A.createBufferSource(), bp = A.createBiquadFilter(), ng = A.createGain(); n.buffer = air; bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = 1.4; ng.gain.value = .05;
        n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t); }
    };
    ready = true;
  }
  /* play a phrase, rest a while, play another (never the same one twice in a row) */
  let lastP = -1;
  function phrase() {
    clearTimeout(timer); if (!A || !on) return;
    if (A.state !== "running") { timer = setTimeout(phrase, 2000); return; }
    let p; do { p = Math.floor(Math.random() * PHRASES.length); } while (p === lastP); lastP = p;
    let t = A.currentTime + .1, first = true;
    PHRASES[p].forEach(([m, b]) => { const dur = b * BEAT; if (m) { flute(m, t, dur * .97, .14, first); first = false; } else first = true; t += dur; });
    const len = t - A.currentTime;
    timer = setTimeout(phrase, (len + 3.5 + Math.random() * 4.5) * 1000);   /* then a few seconds of quiet */
  }
  function start() {
    if (!on) return;
    try { if (!A) build(); if (A.state === "suspended") A.resume(); } catch (e) { return; }
    master.gain.cancelScheduledValues(A.currentTime); master.gain.setValueAtTime(master.gain.value, A.currentTime); master.gain.linearRampToValueAtTime(LEVEL, A.currentTime + 3);
    if (!timer) timer = setTimeout(phrase, 1200);
    setTimeout(paint, 80);
  }
  function stop() { if (!A) return; clearTimeout(timer); timer = 0; master.gain.cancelScheduledValues(A.currentTime); master.gain.setValueAtTime(master.gain.value, A.currentTime); master.gain.linearRampToValueAtTime(0, A.currentTime + 1.2);
    setTimeout(() => { if (!on && A) A.suspend(); paint(); }, 1300); }
  const first = () => { removeEventListener("pointerdown", first, true); removeEventListener("keydown", first, true); if (on) start(); };
  addEventListener("pointerdown", first, true); addEventListener("keydown", first, true);
  if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); on = !on; try { localStorage.setItem("gr8-sound", on ? "on" : "off"); } catch (x) {} if (on) start(); else stop(); paint(); });
  document.addEventListener("visibilitychange", () => { if (!A) return; if (document.hidden) { A.suspend(); } else if (on) A.resume().then(paint); });
  paint();
  return {
    ping(i, kind) {   /* one short, quiet flute note, rising with i; a lower one for a step that stopped */
      if (!on || !ready || !flute || A.state !== "running") return; const now = A.currentTime; if (now - lastPing < .15) return; lastPing = now;
      const UP = [D5, E5, F5, 81, 83, 86]; flute(kind === "stop" ? A4 - 12 + 12 : UP[i % UP.length], now + .02, .5, kind === "stop" ? .06 : .08, false);
    },
    playing: () => !!(on && A && A.state === "running")
  };
}
