/* Kuwa, the rendered owl, brought to life (DRAFT): the finished Kuwa picture (assets/img/kuwa-hd) cut into layers —
   the whole owl, his head and hat, and the lower half of his beak — and moved like a puppet: he breathes, blinks, turns
   toward the cursor (the whole picture leans in 3D), opens his beak with each word while he talks, tilts his head while
   he listens and narrows his eyes while he thinks. Same calls as before: mount(canvas), state(s), beat(), stop(), size(). */
const IMG = "../assets/img/kuwa-hd/";
const W0 = 868, H0 = 925;
const PIVOT = [440, 505];                       /* the neck: the head turns about here */
const EYES = [[358, 401, 66, 59], [565, 401, 63, 59]];   /* centre x, y, radius x, y of each eye */
const BEAK = { x: 420, y: 476 };                /* where the lower beak piece sits */

const pics = {};
function load(n) { return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = IMG + n; pics[n] = i; }); }
const ready = Promise.all(["kuwa-full.webp", "kuwa-head.webp", "beak-low.png"].map(load));

let cv = null, cx = null, raf = 0, st = "idle", word = 0, open = 0, blinkAt = 2.2, blinkT = 0, lidNow = 0, mx = 0, my = 0, ex = 0, ey = 0, tilt = 0, t0 = performance.now();
addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

function fit() { if (!cv) return; const d = Math.min(devicePixelRatio || 1, 2), w = cv.clientWidth || 300, h = cv.clientHeight || 300; if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); } cx.setTransform(1, 0, 0, 1, 0, 0); }

function frame(now) {
  const t = (now - t0) / 1000, dt = 1 / 60;
  fit(); const w = cv.width, h = cv.height, s = Math.min(w / W0, h / H0) * .98, ox = (w - W0 * s) / 2, oy = (h - H0 * s) / 2;
  cx.clearRect(0, 0, w, h);
  /* the picture leans toward the cursor, so he feels solid */
  ex += (mx - ex) * .06; ey += (my - ey) * .06;
  cv.style.transform = `perspective(1100px) rotateY(${ex * 9}deg) rotateX(${-ey * 5}deg)`;
  /* a soft shadow at his feet */
  const g = cx.createRadialGradient(ox + 434 * s, oy + 880 * s, 0, ox + 434 * s, oy + 880 * s, 240 * s); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(1, "rgba(0,0,0,0)");
  cx.save(); cx.translate(ox + 434 * s, oy + 880 * s); cx.scale(1, .16); cx.translate(-(ox + 434 * s), -(oy + 880 * s)); cx.fillStyle = g; cx.fillRect(ox, oy + 600 * s, W0 * s, 560 * s); cx.restore();
  if (!pics["kuwa-full.webp"] || !pics["kuwa-full.webp"].complete) { raf = requestAnimationFrame(frame); return; }
  /* breathing, from the feet up; a little hop of the shoulders while he talks */
  const talking = st === "talking";
  const breath = 1 + Math.sin(t * 2.1) * .01 + (talking ? Math.abs(Math.sin(t * 6.5)) * .006 : 0);
  cx.save(); cx.translate(ox, oy); cx.scale(s, s);
  cx.translate(434, 880); cx.scale(1 + (breath - 1) * .4, breath); cx.translate(-434, -880);
  cx.drawImage(pics["kuwa-full.webp"], 0, 0);
  /* the head: toward the cursor, tilted while listening, a nod while talking */
  const want = st === "listening" ? .07 + Math.sin(t * 2.2) * .015 : st === "thinking" ? -.02 : 0;
  tilt += (want - tilt) * .07;
  const ang = tilt + ex * .035 + (talking ? Math.sin(t * 5.2) * .012 : 0) + Math.sin(t * .9) * .006;
  const lift = (talking ? -Math.abs(Math.sin(t * 6.5)) * 3 : 0) + (st === "thinking" ? -2 : 0);
  cx.translate(PIVOT[0] + ex * 6, PIVOT[1] + lift + ey * 3); cx.rotate(ang); cx.translate(-PIVOT[0], -PIVOT[1]);
  if (pics["kuwa-head.webp"].complete) cx.drawImage(pics["kuwa-head.webp"], 0, 0);
  /* the beak: a dark gap opens and the lower half drops with each syllable */
  let aim = 0; if (talking) aim = .3 + .55 * Math.abs(Math.sin(t * 12.5)) * (.55 + .45 * Math.sin(t * 2.7)) + word * .5;
  word *= .86; open += (Math.min(1, aim) - open) * .4;
  const drop = open * 32;
  if (drop > .6) {
    cx.fillStyle = "#3a0d06"; cx.beginPath(); cx.moveTo(431, BEAK.y - 1); cx.quadraticCurveTo(466, BEAK.y + 4 + drop * .4, 501, BEAK.y - 1); cx.lineTo(493, BEAK.y + drop + 10); cx.quadraticCurveTo(466, BEAK.y + drop + 30, 440, BEAK.y + drop + 10); cx.closePath(); cx.fill();
    cx.fillStyle = "#b8473a"; cx.beginPath(); cx.ellipse(466, BEAK.y + drop * .75 + 6, 13, Math.max(1, drop * .35), 0, 0, Math.PI * 2); cx.fill();   /* his tongue */
    if (pics["beak-low.png"].complete) cx.drawImage(pics["beak-low.png"], BEAK.x, BEAK.y + drop);
  }
  /* the eyelids: a blink every few seconds; half-closed while thinking */
  blinkAt -= dt; if (blinkAt <= 0) { blinkT = .17; blinkAt = 2.2 + Math.random() * 3.8; }
  const blink = blinkT > 0 ? Math.sin((1 - blinkT / .17) * Math.PI) : 0; blinkT = Math.max(0, blinkT - dt);
  lidNow += ((st === "thinking" ? .38 : 0) - lidNow) * .1;
  const lid = Math.max(blink, lidNow);
  if (lid > .01) for (const [ecx, ecy, rx, ry] of EYES) {
    cx.save(); cx.beginPath(); cx.ellipse(ecx, ecy, rx + 2, ry + 2, 0, 0, Math.PI * 2); cx.clip();
    /* the lid comes down as a curved fold of feathers, darker at the top like the brow */
    const top = ecy - ry - 4, edge = top + (ry * 2 + 8) * lid, sag = 14 * (1 - lid * .6);
    const lg = cx.createLinearGradient(0, top, 0, edge + sag); lg.addColorStop(0, "#5a3820"); lg.addColorStop(.6, "#8c5c35"); lg.addColorStop(1, "#c9a27a");
    cx.fillStyle = lg; cx.beginPath(); cx.moveTo(ecx - rx - 6, top); cx.lineTo(ecx + rx + 6, top); cx.lineTo(ecx + rx + 6, edge); cx.quadraticCurveTo(ecx, edge + sag * 2, ecx - rx - 6, edge); cx.closePath(); cx.fill();
    /* a soft shadow just under the lid, and the lash line */
    cx.strokeStyle = "rgba(20,8,3,.9)"; cx.lineWidth = 5; cx.beginPath(); cx.moveTo(ecx - rx - 6, edge); cx.quadraticCurveTo(ecx, edge + sag * 2, ecx + rx + 6, edge); cx.stroke();
    cx.strokeStyle = "rgba(20,8,3,.25)"; cx.lineWidth = 12; cx.beginPath(); cx.moveTo(ecx - rx - 6, edge + 7); cx.quadraticCurveTo(ecx, edge + sag * 2 + 7, ecx + rx + 6, edge + 7); cx.stroke();
    cx.restore();
  }
  cx.restore();
  raf = requestAnimationFrame(frame);
}

export function mount(canvas) { cv = canvas; cx = cv.getContext("2d"); cv.style.transformOrigin = "50% 70%"; cancelAnimationFrame(raf); ready.then(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }); }
export function state(s) { st = s; }
export function beat() { word = 1; }
export function stop() { cancelAnimationFrame(raf); }
export function size() { fit(); }
window.KUWA3D = { mount, state, beat, stop, size };
