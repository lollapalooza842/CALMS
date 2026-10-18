/* Kuwa in 3D (DRAFT): the GR8 owl modelled in three.js shapes (no model file to download), for the Talk to Kuwa screen.
   He breathes, blinks, follows the cursor with his head, opens his beak and flaps a little while he talks, tilts his
   head while he listens, and looks up while he thinks.
   KUWA3D.mount(canvas) starts him; .state("idle"|"thinking"|"talking"|"listening"); .beat() a spoken word (opens the beak
   a bit wider); .stop() pauses drawing. */
import * as THREE from "../assets/vendor/three/three.module.min.js";

let renderer, scene, camera, owl, parts = {}, raf = 0, st = "idle", word = 0, mx = 0, my = 0, canvasEl = null;
const clock = new THREE.Clock();

function mat(c, o = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .62, metalness: 0 }, o)); }
function mesh(g, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0]) { const x = new THREE.Mesh(g, m); x.position.set(...p); x.scale.set(...s); x.rotation.set(...r); return x; }

function build() {
  const BROWN = mat(0x6b4226), DARK = mat(0x3f2414), CREAM = mat(0xf3e2c2), TAN = mat(0xc89a62), FACE = mat(0xe9cfa2),
    WHITE = mat(0xfffaf0, { roughness: .25 }), AMBER = mat(0xf5a623, { roughness: .25, emissive: 0x7a3a00, emissiveIntensity: .25 }), BLACK = mat(0x140a05, { roughness: .2 }),
    BEAK = mat(0xe6a04a, { roughness: .4 }), RED = mat(0xc0392b), HAT = mat(0x6e4628, { roughness: .8 }), BAND = mat(0xd9b27a), GOLD = mat(0xf3c14a, { metalness: .85, roughness: .25, emissive: 0x5a3a00, emissiveIntensity: .3 }), FEET = mat(0xe39a3a);
  const S = (r = 1, w = 32, h = 24) => new THREE.SphereGeometry(r, w, h);
  owl = new THREE.Group();
  /* body and belly */
  const body = new THREE.Group(); owl.add(body); parts.body = body;
  body.add(mesh(S(1), BROWN, [0, 0, 0], [1, 1.12, .92]));
  body.add(mesh(S(1), CREAM, [0, -.12, .42], [.74, .86, .56]));
  for (let i = 0; i < 9; i++) { const row = Math.floor(i / 3), col = i % 3 - 1; body.add(mesh(new THREE.ConeGeometry(.07, .12, 4), TAN, [col * .24 + (row % 2) * .12 - .06, .12 - row * .28, .93 - Math.abs(col) * .06 - row * .02], [1, 1, .5], [Math.PI, 0, 0])); }
  /* wings */
  const wingL = new THREE.Group(), wingR = new THREE.Group(); wingL.position.set(-.86, .25, -.05); wingR.position.set(.86, .25, -.05); body.add(wingL, wingR);
  wingL.add(mesh(S(1), DARK, [0, -.45, 0], [.3, .78, .58], [0, 0, .12])); wingR.add(mesh(S(1), DARK, [0, -.45, 0], [.3, .78, .58], [0, 0, -.12])); parts.wingL = wingL; parts.wingR = wingR;
  /* feet */
  for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) body.add(mesh(new THREE.CapsuleGeometry(.06, .14, 4, 8), FEET, [sx * .32 + k * .09, -1.1, .55], [1, 1, 1], [Math.PI / 2.4, 0, k * .3]));
  /* the bandana, with its knot */
  const tri = new THREE.Shape(); tri.moveTo(-.62, 0); tri.lineTo(.62, 0); tri.quadraticCurveTo(.2, -.3, 0, -.62); tri.quadraticCurveTo(-.2, -.3, -.62, 0);
  body.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: .05, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }), RED, [0, .86, .7], [1, 1, 1], [-.32, 0, 0]));
  body.add(mesh(new THREE.TorusGeometry(.66, .1, 10, 32), RED, [0, .82, 0], [1, 1, .9], [Math.PI / 2, 0, 0]));
  body.add(mesh(S(.13), RED, [-.6, .78, .32])); body.add(mesh(new THREE.ConeGeometry(.1, .32, 8), RED, [-.72, .62, .34], [1, 1, .5], [0, 0, -.6]));
  for (let i = 0; i < 5; i++) body.add(mesh(S(.035, 8, 6), WHITE, [(i - 2) * .16, .66 - Math.abs(i - 2) * .1 - (i === 2 ? .2 : 0), .86 + (i === 2 ? .04 : 0)]));
  /* the head */
  const head = new THREE.Group(); head.position.set(0, 1.28, 0); owl.add(head); parts.head = head;
  head.add(mesh(S(.9), BROWN, [0, 0, 0], [1.12, .95, .95]));
  head.add(mesh(S(.5), FACE, [-.33, -.02, .5], [1, 1, .55])); head.add(mesh(S(.5), FACE, [.33, -.02, .5], [1, 1, .55]));
  for (const sx of [-1, 1]) head.add(mesh(new THREE.ConeGeometry(.16, .5, 6), BROWN, [sx * .7, .62, -.05], [1, 1, .6], [0, 0, -sx * .55]));
  /* eyes: white, amber, pupil, a glint; the lids close for a blink */
  const eyes = new THREE.Group(); head.add(eyes); parts.eyes = [];
  for (const sx of [-1, 1]) {
    const e = new THREE.Group(); e.position.set(sx * .34, .02, .72); eyes.add(e);
    e.add(mesh(S(.27), WHITE)); const look = new THREE.Group(); e.add(look);
    look.add(mesh(S(.22), AMBER, [0, 0, .17], [1, 1, .5])); look.add(mesh(S(.115), BLACK, [0, 0, .25], [1, 1, .4])); look.add(mesh(S(.045, 8, 6), WHITE, [.07, .08, .3]));
    const lid = new THREE.Mesh(new THREE.SphereGeometry(.29, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), BROWN); lid.rotation.x = -.95; e.add(lid);
    /* a stern brow, like the sprite */
    e.add(mesh(new THREE.BoxGeometry(.34, .07, .1), DARK, [0, .27, .12], [1, 1, 1], [0, 0, sx * .28]));
    parts.eyes.push({ g: e, look, lid });
  }
  /* the beak: the lower half opens when he talks */
  const beak = new THREE.Group(); beak.position.set(0, -.2, .86); head.add(beak);
  beak.add(mesh(new THREE.ConeGeometry(.12, .3, 10), BEAK, [0, 0, 0], [1, 1, .8], [Math.PI * .92, 0, 0]));
  const jaw = new THREE.Group(); jaw.position.set(0, -.04, -.04); beak.add(jaw); jaw.add(mesh(new THREE.ConeGeometry(.08, .16, 8), mat(0xc77f30), [0, -.08, .02], [1, 1, .7], [Math.PI * .97, 0, 0])); parts.jaw = jaw;
  /* the hat: a curved brim, a dented crown, a band and the gold star */
  const hat = new THREE.Group(); hat.position.set(0, .72, -.02); hat.rotation.set(.16, 0, .06); head.add(hat); parts.hat = hat;
  const prof = [[.0, .0], [.55, .0], [.95, .02], [1.22, .08], [1.38, .2], [1.42, .26]].map(([x, y]) => new THREE.Vector2(x, y));
  const brim = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), HAT.clone()); brim.material.side = THREE.DoubleSide; brim.scale.set(.9, 1, .78); hat.add(brim);
  /* the brim's sides turn up (cowboy style): bend the lathe on x */
  const bp = brim.geometry.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); bp.setY(i, bp.getY(i) + Math.pow(Math.abs(x) / 1.42, 3) * .32); } brim.geometry.computeVertexNormals();
  const crown = mesh(new THREE.CylinderGeometry(.48, .6, .78, 32), HAT, [0, .4, 0], [1, 1, .86]); hat.add(crown);
  hat.add(mesh(S(.48), HAT, [0, .78, 0], [1, .2, .86])); hat.add(mesh(S(.2), mat(0x5a3820), [0, .84, 0], [1.6, .25, .5]));
    hat.add(mesh(new THREE.CylinderGeometry(.61, .61, .14, 32, 1, true), BAND, [0, .1, 0], [1, 1, .86]));
  const star = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? .07 : .16; i ? star.lineTo(Math.cos(a) * r, Math.sin(a) * r) : star.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  hat.add(mesh(new THREE.ExtrudeGeometry(star, { depth: .04, bevelEnabled: true, bevelSize: .015, bevelThickness: .015, bevelSegments: 2 }), GOLD, [0, .3, .5], [1.3, 1.3, 1], [-.05, 0, 0]));
  owl.position.y = -.55; scene.add(owl);
}

export function mount(canvas) {
  if (renderer) { canvasEl = canvas; resize(); loop(); return; }
  canvasEl = canvas;
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, .1, 50); camera.position.set(0, 1.5, 10.2); camera.lookAt(0, .5, 0);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x40180c, 1.1));
  const key = new THREE.DirectionalLight(0xfff2dc, 2.4); key.position.set(-3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff9a3c, 3); rim.position.set(3, 2, -4); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0xffc070, 1.4); rim2.position.set(-4, 1, -3); scene.add(rim2);
  build(); resize();
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  loop();
}
function resize() { if (!canvasEl) return; const w = canvasEl.clientWidth || 300, h = canvasEl.clientHeight || 300; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener("resize", () => renderer && resize());

let blinkAt = 2, blinkT = 0, open = 0, hx = 0, hy = 0;
function loop() {
  cancelAnimationFrame(raf);
  const f = () => {
    const dt = Math.min(clock.getDelta(), .05), t = clock.elapsedTime;
    /* breathing and a slow sway */
    parts.body.scale.set(1, 1 + Math.sin(t * 2) * .012, 1); owl.position.y = -.55 + Math.sin(t * 1.6) * .04; owl.rotation.y = Math.sin(t * .5) * .08;
    /* the head: toward the cursor; up when thinking; tilted when listening */
    const ty = st === "thinking" ? -.5 : my * .35, tx = st === "thinking" ? .25 : mx * .55, tz = st === "listening" ? .22 + Math.sin(t * 2) * .03 : st === "thinking" ? -.08 : 0;
    hx += (tx - hx) * .08; hy += (ty - hy) * .08;
    parts.head.rotation.y = hx; parts.head.rotation.x = hy * .6; parts.head.rotation.z += (tz - parts.head.rotation.z) * .08;
    parts.eyes.forEach((e) => { e.look.position.x = Math.max(-.05, Math.min(.05, hx * .08)); e.look.position.y = Math.max(-.05, Math.min(.05, -hy * .08)); });
    /* blink */
    blinkAt -= dt; if (blinkAt <= 0) { blinkT = .18; blinkAt = 2 + Math.random() * 4; }
    const lid = blinkT > 0 ? Math.sin((1 - blinkT / .18) * Math.PI) : (st === "thinking" ? .35 : 0); blinkT = Math.max(0, blinkT - dt);
    parts.eyes.forEach((e) => { e.lid.rotation.x = -.95 + lid * 2.45; });
    /* talking: the beak opens with each syllable, the wings lift a little */
    let want = 0;
    if (st === "talking") { want = .28 + .32 * Math.abs(Math.sin(t * 13)) * (.6 + .4 * Math.sin(t * 3.1)) + word * .4; }
    word *= .85; open += (want - open) * .35;
    parts.jaw.rotation.x = open * .9; parts.head.position.y = 1.28 + open * .03;
    const flap = st === "talking" ? Math.sin(t * 6) * .12 * (.4 + open) : st === "listening" ? .05 : 0;
    parts.wingL.rotation.z = -flap - .02; parts.wingR.rotation.z = flap + .02;
    parts.hat.rotation.z = .06 + Math.sin(t * 1.3) * .015 + open * .04;
    renderer.render(scene, camera); raf = requestAnimationFrame(f);
  };
  raf = requestAnimationFrame(f);
}
export function state(s) { st = s; }
export function beat() { word = 1; }
export function stop() { cancelAnimationFrame(raf); }
export function size() { renderer && resize(); }
window.KUWA3D = { mount, state, beat, stop, size };
