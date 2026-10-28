/* The world the borrower pages stand in (DRAFT): the home page's lake at dusk, made light enough for a page you use,
   not just look at. A sky with a low sun, still water with the sun's glint on it, a ring of dark hills, specks of
   light in the air. Dark mode turns it to night (a moon, stars, deep blue water). Everything is built here; no images.
   makeWorld() also runs the top bar (dark mode, menu), the camera's flights, the 3D labels, and the frame loop, which
   pauses when the tab is hidden. The Motion setting (gr8-motion) or the system's "reduce motion" keeps it still. */
import * as THREE from "../assets/vendor/three/three.module.min.js";
import { makeSound } from "./portalsound.js";

const DUSK = { top: 0x9a6a78, mid: 0xd98f74, hor: 0xffcf9e, sun: 0xfff1d6, fog: 0xe3a888, water: 0x84575a, deep: 0x4f3341, hill: 0x6b4448, glint: 0xffe2b8, amb: 0xffd9b8, ground: 0x6a4a4c, key: 0xffe0c0 };
const NIGHT = { top: 0x0a1030, mid: 0x1f2c5c, hor: 0x52578a, sun: 0xf2f5ff, fog: 0x2e3760, water: 0x2f3d68, deep: 0x1c2648, hill: 0x1e2442, glint: 0xe6edff, amb: 0xaebdf0, ground: 0x2a2c48, key: 0xc9d8ff };

export function makeWorld(canvas, opt = {}) {
  topBar();
  const sound = makeSound(() => document.documentElement.classList.contains("dark"));
  const html = document.documentElement;
  let still = matchMedia("(prefers-reduced-motion: reduce)").matches; try { if (localStorage.getItem("gr8-motion") === "off") still = true; } catch (e) {}
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" }); }
  catch (e) { document.body.classList.add("nogl"); requestAnimationFrame(() => { document.body.classList.add("ready"); horizon(); }); return null; }
  const QK = { high: 1, balanced: .8, low: .6 }; let q = "high"; try { q = localStorage.getItem("gr8-quality") || "high"; } catch (e) {}
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5) * (QK[q] || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 900);
  const P = () => (html.classList.contains("dark") ? NIGHT : DUSK);
  const sunDir = new THREE.Vector3(.55, .16, -1).normalize();
  const U = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sun: { value: new THREE.Color() }, fog: { value: new THREE.Color() },
    water: { value: new THREE.Color() }, deep: { value: new THREE.Color() }, glint: { value: new THREE.Color() }, sunDir: { value: sunDir }, time: { value: 0 }, night: { value: 0 } };

  /* the sky: a gradient with the sun's glow (or the moon's) and, at night, stars */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: U,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform vec3 top, mid, hor, sun, sunDir; uniform float night, time; varying vec3 vD;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164)))*43758.5453); }
      void main(){ float y = max(vD.y, 0.0); vec3 c = mix(hor, mid, smoothstep(0.0, .18, y)); c = mix(c, top, smoothstep(.15, .7, y));
        float s = max(dot(vD, sunDir), 0.0); c += sun * (pow(s, 900.0) * 2.2 + pow(s, 24.0) * (.32 - night*.12) + pow(s, 5.0) * (.12 - night*.04));
        if (night > .5) c = mix(c, vec3(.96,.97,1.0), smoothstep(.99955, .99975, s));   /* the moon's disc */
        if (night > .5) { vec3 g = floor(vD * 260.0); float st = step(.9965, h(g)) * smoothstep(.04, .3, vD.y); c += vec3(st) * (.55 + .45*sin(time*1.5 + h(g+1.0)*30.0)); }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }` }));
  scene.add(sky);

  /* the water: still, darker toward you, with the sun's glint broken by small slow waves */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
    fragmentShader: `uniform vec3 water, deep, glint, fog, sunDir; uniform float time, night; varying vec3 vW;
      void main(){ vec3 V = normalize(vW - cameraPosition); float d = length(vW.xz - cameraPosition.xz);
        vec2 p = vW.xz * .35; vec3 n = normalize(vec3(sin(p.x*1.7 + time*.6)*.05 + sin(p.y*2.3 - time*.4)*.04, 1.0, cos(p.y*1.3 + time*.5)*.05 + sin(p.x*2.9 + time*.3)*.03));
        vec3 R = reflect(V, n); float s = max(dot(R, sunDir), 0.0);
        vec3 c = mix(deep, water, smoothstep(0.0, 160.0, d)); c += glint * (pow(s, 180.0) * (1.6 - night*.9) + pow(s, 40.0) * night * .35 + pow(s, 14.0) * (.18 - night*.08));   /* at night: a silver path of moonlight */
        float fr = pow(1.0 - max(dot(-V, vec3(0,1,0)), 0.0), 4.0); c = mix(c, fog, fr * .55);
        c = mix(c, fog, smoothstep(120.0, 520.0, d)); gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }` }));
  water.rotation.x = -Math.PI / 2; scene.add(water);

  /* hills all round the far shore, low-poly, in silhouette */
  const hillMat = new THREE.MeshLambertMaterial({ color: P().hill, flatShading: true });
  const hills = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), hillMat, 46), dm = new THREE.Object3D();
  for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2 + Math.random() * .1, r = 230 + Math.random() * 70;
    dm.position.set(Math.cos(a) * r, -6, Math.sin(a) * r); dm.scale.set(30 + Math.random() * 40, 12 + Math.random() * 34, 30 + Math.random() * 30); dm.rotation.set(0, Math.random() * 6, 0); dm.updateMatrix(); hills.setMatrixAt(i, dm.matrix); }
  scene.add(hills);
  scene.fog = new THREE.Fog(P().fog, 70, 420);

  /* light */
  const hemi = new THREE.HemisphereLight(P().amb, P().ground, 1.25); scene.add(hemi);
  const sunL = new THREE.DirectionalLight(P().sun, 1.6); sunL.position.copy(sunDir).multiplyScalar(80); scene.add(sunL);

  /* specks of light drifting in the air */
  const SN = 260, sp = new Float32Array(SN * 3); for (let i = 0; i < SN; i++) { sp[i * 3] = (Math.random() - .5) * 90; sp[i * 3 + 1] = Math.random() * 22; sp[i * 3 + 2] = (Math.random() - .5) * 70; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const specks = new THREE.Points(sg, new THREE.PointsMaterial({ size: .09, color: 0xfff1d8, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(specks);

  function theme() {
    const p = P(), night = html.classList.contains("dark");
    ["top", "mid", "hor", "sun", "fog", "water", "deep", "glint"].forEach((k) => U[k].value.set(p[k])); U.night.value = night ? 1 : 0;
    sunDir.set(night ? -.42 : .55, night ? .3 : .16, -1).normalize();
    scene.fog.color.set(p.fog); hillMat.color.set(p.hill); hemi.color.set(p.amb); hemi.groundColor.set(p.ground); hemi.intensity = night ? 1.55 : 1.25;
    sunL.color.set(p.key); sunL.intensity = night ? 1.5 : 1.6; sunL.position.copy(sunDir).multiplyScalar(80); specks.material.opacity = night ? .5 : .7;
    if (opt.onTheme) opt.onTheme(night);
  }
  theme(); new MutationObserver(theme).observe(html, { attributes: true, attributeFilter: ["class"] });

  /* the camera: where it rests, flights between rests, a slow breath while resting, and a nudge toward the cursor */
  const cam = { pos: new THREE.Vector3(0, 6, 24), look: new THREE.Vector3(0, 2, 0), from: null, to: null, t0: 0, dur: 1, done: null };
  const curLook = new THREE.Vector3(), mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { mouse.x = e.clientX / innerWidth - .5; mouse.y = e.clientY / innerHeight - .5; }, { passive: true });
  const ease = (k) => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  function fly(pos, look, dur = 2.2, done) {
    const T = { pos: pos.clone(), look: look.clone() };
    if (still || dur <= 0) { cam.pos.copy(T.pos); cam.look.copy(T.look); cam.from = null; if (done) done(); return; }
    cam.from = { pos: cam.pos.clone(), look: cam.look.clone() }; cam.to = T; cam.t0 = performance.now(); cam.dur = dur * 1000; cam.done = done || null;
  }
  function place(pos, look) { cam.pos.copy(pos); cam.look.copy(look); cam.from = null; }
  /* the way in: the camera rises out of the water to where it rests, as the curtain on the horizon opens */
  function intro() { if (still) return; const T = { pos: cam.pos.clone(), look: cam.look.clone() }; const s0 = T.pos.clone().lerp(T.look, .3); s0.y = .9;
    cam.pos.copy(s0); cam.look.copy(T.look).y += 2.5; camera.position.copy(s0); fly(T.pos, T.look, 3.6); }

  /* the picture's centre sits to the right of the card on wide screens */
  let shift = 0;
  function size() { const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false); camera.aspect = W / H;
    shift = W > 760 ? (opt.shift == null ? .2 : opt.shift) : 0;
    if (shift) camera.setViewOffset(W, H, -W * shift, 0, W, H); else camera.setViewOffset(W, H, 0, H * .3, W, H);   /* on a phone the card covers the bottom: the picture's centre moves up */
    camera.fov = W > 760 ? 42 : 52; camera.updateProjectionMatrix(); if (opt.onSize) opt.onSize(W, H); }
  size(); addEventListener("resize", size);

  /* labels: HTML over the picture, placed at points in the world each frame */
  const labels = [], v = new THREE.Vector3();
  function label(el, at) { labels.push({ el, at }); return el; }
  function placeLabels() { const W = innerWidth, H = innerHeight;
    labels.forEach((l) => { v.copy(l.at).project(camera); const behind = v.z > 1; l.el.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v.y) / 2 * H).toFixed(1)}px) translate(-50%, -100%)`; l.el.style.visibility = behind ? "hidden" : ""; }); }

  /* the frame loop */
  const updates = []; let last = performance.now(), time = 0, raf = 0, running = true;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now; if (!still) time += dt; U.time.value = time;
    if (cam.from) { const k = Math.min(1, (now - cam.t0) / cam.dur), e = ease(k); camera.position.lerpVectors(cam.from.pos, cam.to.pos, e); curLook.lerpVectors(cam.from.look, cam.to.look, e);
      if (k >= 1) { cam.pos.copy(cam.to.pos); cam.look.copy(cam.to.look); cam.from = null; const d = cam.done; cam.done = null; if (d) d(); } }
    else { mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 2); mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 2);
      const b = still ? 0 : 1; camera.position.set(cam.pos.x + (Math.sin(time * .25) * .35 + mouse.sx * 1.6) * b, cam.pos.y + (Math.sin(time * .33) * .2 - mouse.sy * .8) * b, cam.pos.z); curLook.copy(cam.look); }
    camera.lookAt(curLook);
    if (!still) { const a = sg.attributes.position.array; for (let i = 0; i < SN; i++) { a[i * 3 + 1] += dt * .25; if (a[i * 3 + 1] > 22) a[i * 3 + 1] = 0; } sg.attributes.position.needsUpdate = true; }
    for (let i = 0; i < updates.length; i++) updates[i](dt, time);
    renderer.render(scene, camera); placeLabels();
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); running = false; } else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } });
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => { document.body.classList.add("ready"); horizon(); });

  return { THREE, scene, camera, renderer, sound, fly, place, intro, label, still: () => still, onFrame: (fn) => updates.push(fn), dark: () => html.classList.contains("dark") };
}

/* a soft round glow, for lanterns and stones (one small canvas, shared) */
let glowTex = null;
export function glow(color = 0xffcf8f, size = 2) {
  if (!glowTex) { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = r; g.fillRect(0, 0, 128, 128); glowTex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); s.scale.setScalar(size); return s;
}

/* the curtain on the horizon (portal.css .hz): opens when the page is ready, closes before going to another page */
function horizon() {
  const hz = document.querySelector(".hz"); if (!hz || hz.dataset.on) return; hz.dataset.on = "1";
  const quick = matchMedia("(prefers-reduced-motion: reduce)").matches;
  hz.style.animation = "none";
  if (quick) { hz.classList.add("gone"); return; }
  requestAnimationFrame(() => { hz.classList.add("draw"); setTimeout(() => { hz.classList.add("open"); }, 750); setTimeout(() => { hz.classList.add("gone"); }, 2100); });
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest("a[href]"); if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === "_blank" || a.hasAttribute("download")) return;
    const u = new URL(a.href, location.href); if (u.origin !== location.origin || !/\.html$|\/$/.test(u.pathname) || (u.pathname === location.pathname && u.hash)) return;
    e.preventDefault(); hz.classList.remove("gone", "open"); hz.classList.add("closing"); setTimeout(() => { location.href = u.href; }, 900);
  });
  addEventListener("pageshow", (e) => { if (e.persisted) { hz.classList.remove("closing"); hz.classList.add("open", "gone"); } });   /* back to this page from the browser's memory */
}

/* the top bar: dark mode (kept like the home page's switch) and the phone menu */
function topBar() {
  const tools = document.querySelector(".pn .tools"), m0 = document.querySelector(".pn .mode");
  if (tools && m0 && !tools.querySelector(".snd")) { const b = document.createElement("button"); b.type = "button"; b.className = "snd"; b.setAttribute("aria-label", "Sound"); b.setAttribute("aria-pressed", "false"); b.innerHTML = "<i></i><i></i><i></i><i></i><i></i>"; tools.insertBefore(b, m0); }
  const html = document.documentElement, mode = document.querySelector(".pn .mode"), menu = document.querySelector(".pn .menu-btn"), mob = document.querySelector(".pn .mob");
  if (mode) mode.addEventListener("click", () => { const d = !html.classList.contains("dark"); html.classList.toggle("dark", d); try { localStorage.setItem("gr8-theme", d ? "dark" : "light"); } catch (e) {} mode.setAttribute("aria-pressed", String(d)); });
  if (menu && mob) { menu.addEventListener("click", () => { const o = !mob.classList.contains("open"); mob.classList.toggle("open", o); menu.setAttribute("aria-expanded", String(o)); });
    document.addEventListener("click", (e) => { if (!e.target.closest(".pn .menu-btn, .pn .mob")) { mob.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); } }); }
}
