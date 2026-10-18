/* The home page's 3D scene (DRAFT), three.js, after emotion-agency.com's home:
   - a still lake at dusk ringed with low-poly rocks, a soft sun, fog, leaves drifting down;
   - a GR8 "8" made of about seven thousand glossy beads hovering over the water (it is reflected in it); the beads
     drift in the flow and settle back, and a click bursts them;
   - moving the cursor is like moving a hand through coffee with milk: a real 2D fluid (stable fluids on the GPU) is
     stirred along the cursor's path, swirls and settles, and its "milk" clouds the picture; the beads ride the same flow.
   Dark mode turns it to night. The settings' Motion switch (stage.js, gr8:still) stills everything. */
import * as THREE from "../assets/vendor/three/three.module.min.js";
import { Reflector } from "../assets/vendor/three/Reflector.js";
import { makeRooms } from "./rooms.js";

const prog = (p) => dispatchEvent(new CustomEvent("gr8:progress", { detail: p }));
const canvas = document.getElementById("gl");
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" }); }
catch (e) { document.body.classList.add("nogl"); dispatchEvent(new Event("gr8:ready")); }
if (renderer) main();

async function main() {
  prog(.1);
  const QK = { high: 1, balanced: .75, low: .55 }; let quality = "high"; try { quality = localStorage.getItem("gr8-quality") || "high"; } catch (e) {} if (!QK[quality]) quality = "high";
  let DPR = Math.min(devicePixelRatio || 1, 1.75) * QK[quality];
  renderer.setPixelRatio(DPR); renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const small = innerWidth < 700;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(small ? 62 : 46, innerWidth / innerHeight, .1, 600);
  const camBase = new THREE.Vector3(0, 4.2, small ? 30 : 24), look = new THREE.Vector3(0, small ? 7.5 : 6.4, 0);
  camera.position.copy(camBase);

  /* ---- day and night ---- */
  const DAY = { top: 0xe39a72, mid: 0xf4c49a, hor: 0xffe4c2, sun: 0xfff2d8, fog: 0xf0c7a0, rock: 0x8a5b55, rock2: 0x6e4547, water: 0xb48a86, hemiS: 0xffd7b0, hemiG: 0x5a3434, dir: 0xffe0b8, dirI: 2.0, hemiI: 1.15, leaf: [0xe8892a, 0xc0562f, 0x8f2a22, 0xf3cf7a] };
  const NIGHT = { top: 0x120c22, mid: 0x2c1a3a, hor: 0x6a3a44, sun: 0xffd6a0, fog: 0x3a2434, rock: 0x3a2a36, rock2: 0x2a1e2a, water: 0x5a4458, hemiS: 0x7a6aa0, hemiG: 0x1a1018, dir: 0xffc890, dirI: .9, hemiI: .55, leaf: [0xe8892a, 0xa0402a, 0x6a2020, 0xf3cf7a] };
  let mood = document.documentElement.classList.contains("dark") ? 1 : 0, moodT = mood;
  const C = (a, b) => new THREE.Color(a).lerp(new THREE.Color(b), mood);

  /* ---- sky ---- */
  const skyU = { top: { value: new THREE.Color() }, mid: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunC: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, .16, -1).normalize() }, time: { value: 0 }, night: { value: 0 } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
    fragmentShader: `uniform vec3 top, mid, hor, sunC, sunDir; uniform float time, night; varying vec3 vP;
      float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      void main(){ float y = vP.y; vec3 c = mix(hor, mid, smoothstep(0.0, .18, y)); c = mix(c, top, smoothstep(.18, .7, y)); c = mix(hor*.92, c, smoothstep(-.05, .0, y));
        float s = max(dot(vP, sunDir), 0.0); c += sunC * (pow(s, 600.0)*1.2 + pow(s, 24.0)*.35 + pow(s, 4.0)*.12) * (1.0 - night*.5);
        /* clouds, soft bands */ float cl = sin(vP.x*9.0 + time*.02)*sin(vP.z*7.0 - time*.015)*.5+.5; c = mix(c, c*1.06 + .03, smoothstep(.55,.9,cl)*smoothstep(.05,.3,y)*(1.0-smoothstep(.35,.6,y)));
        /* stars at night */ vec2 g = floor(vec2(atan(vP.z, vP.x)*260.0, y*260.0)); float st = step(.9965, h21(g)) * smoothstep(.12,.5,y) * night; c += st * (.6 + .4*sin(time*3.0 + h21(g+3.0)*30.0));
        gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n
      }`
  }));
  scene.add(sky);
  scene.fog = new THREE.Fog(0xf0c7a0, 30, 170); const worldFog = scene.fog;

  /* ---- light ---- */
  const hemi = new THREE.HemisphereLight(0xffd7b0, 0x5a3434, 1.1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b8, 2); sun.position.set(-10, 14, -40); scene.add(sun);
  const rim = new THREE.DirectionalLight(0xffb070, .7); rim.position.set(20, 6, 30); scene.add(rim);
  prog(.25);

  /* ---- rocks: two rings of low-poly stones standing in the water ---- */
  const rockMatA = new THREE.MeshStandardMaterial({ color: 0x8a5b55, flatShading: true, roughness: .95, metalness: 0 });
  const rockMatB = new THREE.MeshStandardMaterial({ color: 0x6e4547, flatShading: true, roughness: .95, metalness: 0 });
  const rnd = (a, b) => a + Math.random() * (b - a);
  function rockGeo() {
    const g = new THREE.DodecahedronGeometry(1, 0), p = g.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) { const k = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if (!seen.has(k)) seen.set(k, [rnd(.8, 1.2), rnd(.85, 1.15), rnd(.8, 1.2)]); const j = seen.get(k); p.setXYZ(i, p.getX(i) * j[0], p.getY(i) * j[1], p.getZ(i) * j[2]); }
    g.computeVertexNormals(); return g;
  }
  const rocks = new THREE.Group(); scene.add(rocks);
  const placeRock = (x, z, s) => { const h = rnd(2.2, 6) * s, m = new THREE.Mesh(rockGeo(), Math.random() < .5 ? rockMatA : rockMatB); m.scale.set(rnd(1.6, 3.6) * s, h, rnd(1.4, 3) * s); m.position.set(x, h * rnd(.25, .45), z); m.rotation.set(rnd(-.12, .12), rnd(0, 6.28), rnd(-.1, .1)); rocks.add(m); };
  for (let i = 0; i < 46; i++) { const x = rnd(-110, 110); placeRock(x, rnd(-62, -34) - Math.abs(x) * .05, rnd(1.4, 2.6)); }
  for (let i = 0; i < 22; i++) { const side = Math.random() < .5 ? -1 : 1; placeRock(side * rnd(30, 64), rnd(-34, -6), rnd(1, 1.8)); }
  for (let i = 0; i < 6; i++) placeRock(rnd(-90, 90), rnd(-110, -80), rnd(3, 4.5));
  prog(.4);

  /* ---- the lake: a mirror with a slow ripple, fading into the fog ---- */
  const waterShader = {
    uniforms: { color: { value: new THREE.Color(0xb48a86) }, tDiffuse: { value: null }, textureMatrix: { value: null }, time: { value: 0 }, fogC: { value: new THREE.Color() }, ripA: { value: new THREE.Vector4(99, 99, 99, 99) }, ripS: { value: new THREE.Vector4() } },
    vertexShader: "uniform mat4 textureMatrix; varying vec4 vUv; varying float vD; varying vec2 vW; void main(){ vUv = textureMatrix*vec4(position,1.0); vW = (modelMatrix*vec4(position,1.0)).xz; vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix*mv; }",
    fragmentShader: `uniform vec3 color, fogC; uniform sampler2D tDiffuse; uniform float time; uniform vec4 ripA, ripS; varying vec4 vUv; varying float vD; varying vec2 vW;
      float blendOverlay(float b, float s){ return (b < .5) ? (2.0*b*s) : (1.0 - 2.0*(1.0-b)*(1.0-s)); }
      vec3 bo(vec3 b, vec3 s){ return vec3(blendOverlay(b.r,s.r), blendOverlay(b.g,s.g), blendOverlay(b.b,s.b)); }
      void main(){ vec4 uv = vUv; vec2 w = vec2(sin(vW.x*.9 + time*.9) + sin(vW.y*1.7 - time*1.1), cos(vW.y*1.3 + time*.7) + sin(vW.x*2.3 + time*.5)) * .0035;
        /* the heartbeat's rings, spreading out from under the 8 */
        float dist = length(vW), crest = 0.0; vec2 dir = vW / max(dist, .001);
        for (int i = 0; i < 4; i++) { float age = ripA[i]; float R = age*4.2; float x = dist - R;
          float k = exp(-x*x/3.5) * sin(x*1.9) * ripS[i] * exp(-age*.32) * smoothstep(0.0, .35, age); crest += k; }
        w += dir * crest * .045;
        uv.xy += w * uv.w; vec4 base = texture2DProj(tDiffuse, uv); vec3 c = bo(base.rgb, color);
        c += vec3(1.0, .9, .78) * max(crest, 0.0) * .32 * (1.0 - smoothstep(35.0, 90.0, vD)); c -= min(crest, 0.0) * -.08;
        c = mix(c, fogC, smoothstep(40.0, 190.0, vD)); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n
\n#include <colorspace_fragment>\n
      }`
  };
  const water = new Reflector(new THREE.PlaneGeometry(900, 900), { textureWidth: innerWidth * DPR * .5, textureHeight: innerHeight * DPR * .5, color: 0xb48a86, shader: waterShader, clipBias: .003 });
  water.rotation.x = -Math.PI / 2; scene.add(water);
  prog(.5);

  /* ---- the "8", in beads ---- */
  try { await document.fonts.load('400 300px "Instrument Serif"'); } catch (e) {}
  const N = small ? 4200 : 7200, H8 = small ? 9 : 8.6;
  /* two shapes the beads flow between, like emotion's heart and logo: GR8's "8" and the peso sign */
  function shape(draw) {
    const S = 360, cv = document.createElement("canvas"); cv.width = S; cv.height = S; const g = cv.getContext("2d");
    g.fillStyle = "#fff"; g.strokeStyle = "#fff"; draw(g, S);
    const d = g.getImageData(0, 0, S, S).data, inside = [];
    let minY = S, maxY = 0; for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (d[(y * S + x) * 4 + 3] > 128) { inside.push(x, y); if (y < minY) minY = y; if (y > maxY) maxY = y; }
    const sc = H8 / (maxY - minY), cy = (minY + maxY) / 2, list = [];
    for (let i = 0; i < N; i++) { const k = (Math.random() * inside.length / 2 | 0) * 2; list.push([(inside[k] + Math.random() - S / 2) * sc, -(inside[k + 1] + Math.random() - cy) * sc, (Math.random() - .5) * 1.6 * Math.sqrt(Math.random())]); }
    /* order by angle around the middle, so each bead travels a short, sweeping way to its place in the other shape */
    list.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    const out = new Float32Array(N * 3); list.forEach((p, i) => { out[i * 3] = p[0]; out[i * 3 + 1] = p[1]; out[i * 3 + 2] = p[2]; }); return out;
  }
  const font = (px) => `400 ${px}px "Instrument Serif", Georgia, serif`;
  const shapeA = shape((g, S) => { g.textAlign = "center"; g.textBaseline = "middle"; g.font = font(400); g.lineWidth = 16; g.fillText("8", S / 2, S / 2 + 30); g.strokeText("8", S / 2, S / 2 + 30); });
  const shapeB = shape((g, S) => { g.textAlign = "center"; g.textBaseline = "middle"; g.font = font(400); g.lineWidth = 16; g.fillText("P", S / 2 + 12, S / 2 + 30); g.strokeText("P", S / 2 + 12, S / 2 + 30);
    g.fillRect(S / 2 - 118, S / 2 - 70, 236, 20); g.fillRect(S / 2 - 118, S / 2 - 26, 236, 20); });
  const pts = new Float32Array(shapeA);   /* where each bead belongs right now */
  prog(.7);
  const pos = new Float32Array(N * 3), vel = new Float32Array(N * 3), off = new Float32Array(N * 3), ov = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  const PAL = [new THREE.Color(0xfff3dc), new THREE.Color(0xf3cf7a), new THREE.Color(0xe8892a), new THREE.Color(0xd05a3a), new THREE.Color(0x8f2a22)];
  for (let i = 0; i < N; i++) {
    /* start far out, swirling; they gather when the visitor comes in */
    const a = Math.random() * 6.28, r = rnd(10, 26); pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = rnd(-4, 16); pos[i * 3 + 2] = Math.sin(a) * r - 16;
    /* colour by height: warm gold at the top, deeper red at the bottom, a few bright beads */
    const t = 1 - (pts[i * 3 + 1] / H8 + .5); let c = PAL[Math.min(4, Math.max(1, Math.round(1 + t * 3 + rnd(-.7, .7))))].clone(); if (Math.random() < .08) c = PAL[0].clone();
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; size[i] = rnd(.13, .26) * (small ? 1.1 : 1); seed[i] = Math.random() * 100;
  }
  const bg = new THREE.BufferGeometry();
  bg.setAttribute("position", new THREE.BufferAttribute(pos, 3)); bg.setAttribute("color", new THREE.BufferAttribute(col, 3)); bg.setAttribute("size", new THREE.BufferAttribute(size, 1));
  const beadU = { scale: { value: innerHeight * DPR * .5 }, night: { value: 0 } };
  const beads = new THREE.Points(bg, new THREE.ShaderMaterial({
    uniforms: beadU, vertexColors: true,
    vertexShader: `attribute float size; uniform float scale; varying vec3 vC; varying float vZ; void main(){ vC = color; vec4 mv = modelViewMatrix*vec4(position,1.0); vZ = -mv.z; gl_PointSize = size*scale/vZ*1.9; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float night; varying vec3 vC; varying float vZ;
      void main(){ vec2 p = gl_PointCoord*2.0-1.0; float r = dot(p,p); if (r > 1.0) discard; vec3 n = vec3(p.x, -p.y, sqrt(1.0-r));
        vec3 L = normalize(vec3(-.4,.6,.7)); float dif = max(dot(n,L),0.0); float spec = pow(max(dot(reflect(-L,n), vec3(0,0,1)),0.0), 24.0);
        vec3 c = vC*(.45 + .75*dif) + spec*.7 + vC*night*.35; c += vec3(1.0,.8,.6)*(1.0-n.z)*.15; gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n
      }`
  }));
  const eight = new THREE.Group(); eight.position.set(0, small ? 8.6 : 7.4, 0); eight.add(beads); scene.add(eight);
  /* a warm glow behind it */
  const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(255,230,190,.9)"); gr.addColorStop(.4, "rgba(255,180,110,.35)"); gr.addColorStop(1, "rgba(255,160,90,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, opacity: .55, fog: false })); glow.scale.set(22, 22, 1); glow.position.set(0, 0, -3); eight.add(glow);
  /* tiny leaflets the heart lets go of with each beat: small leaves that scatter out of the 8, flutter, tumble and
     drift down, fading away (one InstancedMesh, a pool reused round and round) */
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, -.5); leafShape.quadraticCurveTo(.42, -.1, 0, .5); leafShape.quadraticCurveTo(-.42, -.1, 0, -.5);
  const leafletGeo = new THREE.ShapeGeometry(leafShape, 4);
  const EP = 260, lfl = [], ldm = new THREE.Object3D();
  const leaflets = new THREE.InstancedMesh(leafletGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x6a3410, emissiveIntensity: .8 }), EP);
  leaflets.instanceMatrix.setUsage(THREE.DynamicDrawUsage); leaflets.frustumCulled = false;
  const LCOL = [0xe8892a, 0xc0562f, 0xf3cf7a, 0x9a8a3a, 0x6f8a3a, 0xd9a441];
  for (let i = 0; i < EP; i++) { lfl.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, sx: 0, sy: 0, sz: 0, s: .2, ph: 0 }); leaflets.setColorAt(i, new THREE.Color(LCOL[i % LCOL.length])); ldm.scale.set(0, 0, 0); ldm.updateMatrix(); leaflets.setMatrixAt(i, ldm.matrix); }
  eight.add(leaflets);
  let eNext = 0;
  function kick() {   /* the force of a beat: beads bulge out and spring back, flying leaflets get pushed outward again */
    for (let i = 0; i < N; i++) { const q = i * 3, x = pos[q], y = pos[q + 1], d = Math.hypot(x, y) || 1; ov[q] += x / d * 1.6; ov[q + 1] += y / d * 1.6; ov[q + 2] += ((i & 1) ? 1 : -1) * .5; }
    for (const L0 of lfl) if (L0.life > 0) { const d = Math.hypot(L0.x, L0.y) || 1; L0.vx += L0.x / d * 1.8; L0.vy += L0.y / d * 1.2; L0.sx *= 1.5; L0.sz *= 1.5; }
  }
  function emit(n) {
    for (let k = 0; k < n; k++) { const L0 = lfl[eNext]; eNext = (eNext + 1) % EP; const j = (Math.random() * N | 0) * 3;
      const x = pos[j], y = pos[j + 1], z = pos[j + 2], d = Math.hypot(x, y * .8) || 1, sp = rnd(1.2, 3.4);
      Object.assign(L0, { x, y, z, vx: x / d * sp + rnd(-.4, .4), vy: y / d * sp * .7 + rnd(.6, 1.8), vz: rnd(-1.4, 1.4), rx: rnd(0, 6.3), ry: rnd(0, 6.3), rz: rnd(0, 6.3),
        sx: rnd(-4, 4), sy: rnd(-3, 3), sz: rnd(-5, 5), s: rnd(.3, .5) * (small ? 1.2 : 1), ph: rnd(0, 6.3) });
      L0.life = L0.max = rnd(2.6, 4.2); }
  }
  prog(.82);

  /* ================= "Let's talk": a quiet spot on the far shore =================
     A grassy island with a big autumn tree glowing over two armchairs, rocks behind. The camera flies here when the
     visitor opens "Let's talk" (stage.js, gr8:talk) and frames it in the left half, leaving the right for the form. */
  const GC = new THREE.Vector3(78, 0, 26), grove = new THREE.Group(); grove.position.copy(GC); scene.add(grove);
  { /* the island: a low, uneven disc of earth just above the water */
    const ig = new THREE.CylinderGeometry(15, 17, 1.2, 28, 2), ip = ig.attributes.position;
    for (let i = 0; i < ip.count; i++) { const y = ip.getY(i); if (y > 0) ip.setY(i, y + rnd(-.12, .2)); const a = Math.atan2(ip.getZ(i), ip.getX(i)), r = 1 + Math.sin(a * 3) * .06 + Math.sin(a * 7) * .03; ip.setX(i, ip.getX(i) * r); ip.setZ(i, ip.getZ(i) * r); }
    ig.computeVertexNormals(); const island = new THREE.Mesh(ig, new THREE.MeshLambertMaterial({ color: 0x5a3020, flatShading: true })); island.position.y = .05; grove.add(island); }
  /* grass: thousands of thin blades, swaying */
  const grassU = { time: { value: 0 } };
  { const GN = small ? 3500 : 9000, bladeGeo = new THREE.BufferGeometry();
    bladeGeo.setAttribute("position", new THREE.Float32BufferAttribute([-.05, 0, 0, .05, 0, 0, 0, 1, 0], 3)); bladeGeo.computeVertexNormals();
    const gm = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
    gm.onBeforeCompile = (sh) => { sh.uniforms.time = grassU.time; sh.vertexShader = "uniform float time;\n" + sh.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\n vec4 wp = instanceMatrix * vec4(0.,0.,0.,1.); float sway = sin(time*1.6 + wp.x*.6 + wp.z*.4)*.18 + sin(time*2.7 + wp.z*1.3)*.06; transformed.x += sway * position.y * position.y; transformed.z += sway * .5 * position.y;"); };
    const grass = new THREE.InstancedMesh(bladeGeo, gm, GN), d = new THREE.Object3D(), GCOL = [0x8a3a22, 0xb5562e, 0xc8743a, 0x9c4a2a, 0xd9924a, 0x6e2c1c];
    for (let i = 0; i < GN; i++) { const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 14.2; d.position.set(Math.cos(a) * r, .62, Math.sin(a) * r); d.rotation.set(rnd(-.15, .15), rnd(0, 6.283), rnd(-.15, .15));
      const h = rnd(.35, .9) * (1 - r / 30); d.scale.set(rnd(.8, 1.4), h, 1); d.updateMatrix(); grass.setMatrixAt(i, d.matrix); grass.setColorAt(i, new THREE.Color(GCOL[i % GCOL.length]).multiplyScalar(rnd(.75, 1.15))); }
    grove.add(grass); }
  /* the tree: a leaning trunk that forks into branches, and a crown of glowing autumn leaves */
  const tree = new THREE.Group(); tree.position.set(.6, .6, -3.2); grove.add(tree);
  const bark = new THREE.MeshLambertMaterial({ color: 0x3a2018, flatShading: true });
  function limb(from, to, r0, r1) { const dir = new THREE.Vector3().subVectors(to, from), len = dir.length(), m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 7, 1), bark);
    m.position.copy(from).addScaledVector(dir, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); tree.add(m); return to; }
  const tips = [];
  { const top = limb(new THREE.Vector3(0, 0, 0), new THREE.Vector3(.3, 5.2, 0), .75, .5);
    [[-3.6, 8.4, .6], [3.8, 8.8, -.4], [.4, 9.6, -1.2], [-1.6, 7.2, 2], [2.4, 7, 2.2]].forEach(([x, y, z]) => { const end = limb(top, new THREE.Vector3(x, y, z), .45, .16); tips.push(end);
      tips.push(limb(end, new THREE.Vector3(x * 1.45, y + rnd(.6, 1.6), z + rnd(-1, 1)), .16, .06)); }); }
  const crownN = small ? 2600 : 5200, crown = new THREE.InstancedMesh(leafletGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide, emissive: 0x6a2a0c, emissiveIntensity: .55 }), crownN);
  { const d = new THREE.Object3D(), CC = [0xff9a3c, 0xe8892a, 0xf3b25a, 0xd05a3a, 0xffc878, 0xb8402a, 0xffe0a0];
    for (let i = 0; i < crownN; i++) { const t = tips[i % tips.length], u = new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random()) * rnd(1.8, 3)); u.y *= .62;
      d.position.copy(t).add(u); d.rotation.set(rnd(0, 6.3), rnd(0, 6.3), rnd(0, 6.3)); const sc = rnd(.42, .72); d.scale.set(sc, sc, sc); d.updateMatrix(); crown.setMatrixAt(i, d.matrix);
      const c = new THREE.Color(CC[i % CC.length]); if (u.y > 1) c.lerp(new THREE.Color(0xfff0c8), .35); crown.setColorAt(i, c); } }
  tree.add(crown);
  const glowLight = new THREE.PointLight(0xffb060, 30, 26, 1.6); glowLight.position.set(0, 6.5, 1); tree.add(glowLight);
  /* two armchairs facing each other a little, under the tree */
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a3e22 }), cushion = new THREE.MeshLambertMaterial({ color: 0xf6e6d4 });
  function chair() { const g = new THREE.Group(), box = (w, h, d2, m, x, y, z, rx = 0) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d2), m); b.position.set(x, y, z); b.rotation.x = rx; g.add(b); return b; };
    [-1, 1].forEach((sx) => { box(.12, 1.25, .12, wood, sx * .82, .62, .55, -.12); box(.12, 1.6, .12, wood, sx * .82, .8, -.55, .25); box(.14, .1, 1.5, wood, sx * .86, 1.05, .05); });   /* legs and arms */
    box(1.6, .1, 1.2, wood, 0, .6, 0); box(1.5, .26, 1.15, cushion, 0, .78, .05); box(1.5, 1.05, .24, cushion, 0, 1.42, -.6, -.22); box(1.62, .1, .1, wood, 0, .62, .62);
    g.scale.setScalar(1.25); return g; }
  const chA = chair(), chB = chair(); chA.position.set(-3.3, .62, 2.2); chA.rotation.y = .42; chB.position.set(3.2, .62, 2.6); chB.rotation.y = -.5; grove.add(chA, chB);
  /* rocks standing behind it, and a few loose leaves always drifting down from the crown */
  for (let i = 0; i < 11; i++) placeRock(GC.x + rnd(-30, 30), GC.z - rnd(22, 34), rnd(.8, 1.5));
  const fallN = 70, fall = new THREE.InstancedMesh(leafletGeo, crown.material, fallN), FL = [];
  for (let i = 0; i < fallN; i++) { FL.push({ x: rnd(-6, 6), y: rnd(1, 11), z: rnd(-6, 5), r: rnd(0, 6), sp: rnd(.4, .9), ph: rnd(0, 6) }); fall.setColorAt(i, new THREE.Color([0xff9a3c, 0xe8892a, 0xd05a3a, 0xffc878][i % 4])); }
  fall.instanceMatrix.setUsage(THREE.DynamicDrawUsage); tree.add(fall);

  /* ================= "I work at GR8": the branch office after hours, on a dock on the other shore =================
     A wooden deck on posts over the water: a desk with a glowing CALMS screen, a desk lamp, an office chair, a filing
     cabinet, a stack of folders and a plant, with loan papers drifting in the air around it. Staff sign in here. */
  const OC = new THREE.Vector3(-82, 0, 22), office = new THREE.Group(); office.position.copy(OC); scene.add(office);
  const plank = new THREE.MeshLambertMaterial({ color: 0x6e3c22 }), plankB = new THREE.MeshLambertMaterial({ color: 0x5a2e1a }), metal = new THREE.MeshLambertMaterial({ color: 0x2a201c }), paperM = new THREE.MeshLambertMaterial({ color: 0xf6ead8, emissive: 0x6a5040, side: THREE.DoubleSide });
  const obox = (w, h, d, m, x, y, z, parent = office) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); parent.add(b); return b; };
  for (let i = 0; i < 12; i++) obox(14, .16, .62, i % 2 ? plank : plankB, rnd(-.1, .1), .62, -4.4 + i * .8);   /* the deck */
  [[-6.6, -4.6], [6.6, -4.6], [-6.6, 4.6], [6.6, 4.6], [0, -4.6], [0, 4.6]].forEach(([x, z]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.18, .2, 2.4, 6), plankB); p.position.set(x, -.4, z); office.add(p); });
  const desk = new THREE.Group(); desk.position.set(.4, .7, -1.4); office.add(desk);
  obox(3.6, .12, 1.6, plank, 0, 1.45, 0, desk); [[-1.65, -.65], [1.65, -.65], [-1.65, .65], [1.65, .65]].forEach(([x, z]) => obox(.1, 1.45, .1, metal, x, .72, z, desk));
  obox(.9, 1.1, 1.4, plankB, 1.2, .85, 0, desk);   /* drawers */
  /* the screen: a soft CALMS page drawn on a canvas, glowing */
  const scr = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 300; const g = c.getContext("2d");
    const bgG = g.createLinearGradient(0, 0, 0, 300); bgG.addColorStop(0, "#2a1609"); bgG.addColorStop(1, "#3a1d0e"); g.fillStyle = bgG; g.fillRect(0, 0, 512, 300);
    g.fillStyle = "#f3cf7a"; g.font = "italic 34px Georgia, serif"; g.fillText("CALMS", 28, 52); g.fillStyle = "rgba(255,230,200,.5)"; g.font = "15px monospace"; g.fillText("MY QUEUE · 6 WAITING", 30, 82);
    for (let i = 0; i < 6; i++) { g.fillStyle = i === 1 ? "rgba(232,137,42,.85)" : "rgba(255,230,200,.13)"; g.fillRect(28, 100 + i * 30, 300, 20); g.fillStyle = "rgba(255,230,200,.25)"; g.fillRect(346, 100 + i * 30, 70 + (i * 37) % 60, 20); }
    g.fillStyle = "#e8892a"; g.beginPath(); g.arc(468, 240, 26, 0, 6.3); g.fill(); return new THREE.CanvasTexture(c); })();
  scr.colorSpace = THREE.SRGBColorSpace;
  const mon = new THREE.Group(); mon.position.set(-.35, 1.51, -.35); mon.rotation.y = .12; desk.add(mon);
  obox(1.95, 1.18, .08, metal, 0, .82, 0, mon); obox(.12, .5, .12, metal, 0, .25, -.02, mon); obox(.6, .04, .4, metal, 0, .02, 0, mon);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.82, 1.06), new THREE.MeshBasicMaterial({ map: scr, toneMapped: false })); screen.position.set(0, .82, .045); mon.add(screen);
  obox(1.2, .04, .38, metal, -.3, 1.53, .45, desk);   /* keyboard */
  /* the desk lamp, really lighting the desk */
  const lamp = new THREE.Group(); lamp.position.set(1.35, 1.51, -.35); desk.add(lamp);
  obox(.36, .05, .36, metal, 0, .02, 0, lamp); const arm = obox(.05, 1, .05, metal, 0, .5, 0, lamp); arm.rotation.z = -.25;
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.28, .34, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xc0562f, side: THREE.DoubleSide })); shade.position.set(-.26, 1, .05); shade.rotation.z = .9; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c8 })); bulb.position.set(-.33, .92, .05); lamp.add(bulb);
  const lampLight = new THREE.PointLight(0xffb870, 14, 9, 1.6); lampLight.position.set(-.5, .8, .3); lamp.add(lampLight);
  const screenLight = new THREE.PointLight(0xff9a50, 4, 5, 2); screenLight.position.set(-.35, 2.4, .6); desk.add(screenLight);
  /* papers and folders on the desk */
  for (let i = 0; i < 7; i++) { const f = obox(.62, .03, .46, i % 3 ? paperM : new THREE.MeshLambertMaterial({ color: [0xe8892a, 0xc0562f, 0xf3cf7a][i % 3] }), -1.35, 1.55 + i * .035, .3, desk); f.rotation.y = rnd(-.15, .15); }
  /* the chair */
  const chairO = new THREE.Group(); chairO.position.set(-.2, .7, .55); chairO.rotation.y = .5; office.add(chairO);
  obox(.95, .14, .9, cushion, 0, 1.0, 0, chairO); const back = obox(.95, 1.05, .12, cushion, 0, 1.6, -.45, chairO); back.rotation.x = -.12;
  obox(.08, .85, .08, metal, 0, .5, 0, chairO); for (let k = 0; k < 5; k++) { const leg = obox(.55, .06, .07, metal, Math.cos(k * 1.257) * .27, .08, Math.sin(k * 1.257) * .27, chairO); leg.rotation.y = -k * 1.257; }
  /* filing cabinet and a plant */
  obox(.9, 2.1, .9, new THREE.MeshLambertMaterial({ color: 0x8a5a3a }), 3.4, 1.75, -1.6); for (let k = 0; k < 3; k++) obox(.5, .06, .05, metal, 3.4, 1.15 + k * .62, -1.13);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.34, .26, .6, 10), new THREE.MeshLambertMaterial({ color: 0xc0562f })); pot.position.set(-3.6, 1, -1.8); office.add(pot);
  const leafy = new THREE.InstancedMesh(leafletGeo, new THREE.MeshLambertMaterial({ color: 0x6f8a3a, side: THREE.DoubleSide, emissive: 0x1a2a08 }), 70);
  { const d = new THREE.Object3D(); for (let i = 0; i < 70; i++) { const a = rnd(0, 6.3), h = rnd(.2, 1.6); d.position.set(-3.6 + Math.cos(a) * h * .35, 1.3 + h, -1.8 + Math.sin(a) * h * .35); d.rotation.set(rnd(-1, 1), a, rnd(-.6, .6)); d.scale.setScalar(rnd(.35, .6)); d.updateMatrix(); leafy.setMatrixAt(i, d.matrix); } office.add(leafy); }
  /* a lamp post at the end of the dock */
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, 4.2, 8), metal); post.position.set(5.6, 2.8, 3.6); office.add(post);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffe2b0 })); globe.position.set(5.6, 5, 3.6); office.add(globe);
  const postLight = new THREE.PointLight(0xffc888, 10, 14, 1.5); postLight.position.copy(globe.position); office.add(postLight);
  /* loan papers drifting in the air, slowly turning */
  const PN = 18, papers = new THREE.InstancedMesh(new THREE.PlaneGeometry(.34, .44), paperM, PN), PP = [];
  for (let i = 0; i < PN; i++) PP.push({ x: rnd(-6.5, 6.5), y: rnd(3.4, 7.5), z: rnd(-6, -1), ph: rnd(0, 6.3), sp: rnd(.2, .5) });
  papers.instanceMatrix.setUsage(THREE.DynamicDrawUsage); office.add(papers);
  for (let i = 0; i < 7; i++) placeRock(OC.x + rnd(-24, 24), OC.z - rnd(18, 30), rnd(.8, 1.5));
  const SPOTS = {
    grove: { pos: new THREE.Vector3(GC.x - .5, 3.6, GC.z + 19.5), look: new THREE.Vector3(GC.x + .3, 4.9, GC.z - 2) },
    office: { pos: new THREE.Vector3(OC.x + .6, 3.4, OC.z + 11.5), look: new THREE.Vector3(OC.x + .2, 2.6, OC.z - 1) }
  };
  const TALK = { pos: SPOTS.grove.pos.clone(), look: SPOTS.grove.look.clone() }; let spot = "grove", hop = 0;
  let talkOn = 0, talkT = 0;
  addEventListener("gr8:talk", (e) => { const d = e.detail || {}; talkOn = d.open ? 1 : 0; if (talkOn && inRoom) goPlace(null); const sp = SPOTS[d.spot] ? d.spot : "grove"; if (sp !== spot) { spot = sp; if (talkT > .05) hop = 1; else { TALK.pos.copy(SPOTS[sp].pos); TALK.look.copy(SPOTS[sp].look); } } });

  /* ---- leaves drifting down ---- */
  const LN = small ? 90 : 170, leafGeo = new THREE.PlaneGeometry(.22, .13);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ side: THREE.DoubleSide }), LN);
  const L = [], dummy = new THREE.Object3D();
  for (let i = 0; i < LN; i++) { L.push({ x: rnd(-40, 40), y: rnd(0, 30), z: rnd(-40, 16), r: rnd(0, 6.28), sp: rnd(.6, 1.4), sw: rnd(.5, 1.5), ph: rnd(0, 6.28) }); leaves.setColorAt(i, new THREE.Color(DAY.leaf[i % 4])); }
  scene.add(leaves);
  /* specks in the air */
  const DN = 400, dpos = new Float32Array(DN * 3); for (let i = 0; i < DN; i++) { dpos[i * 3] = rnd(-50, 50); dpos[i * 3 + 1] = rnd(0, 30); dpos[i * 3 + 2] = rnd(-50, 18); }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const specks = new THREE.Points(dgeo, new THREE.PointsMaterial({ size: .09, color: 0xfff1d8, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(specks);

  /* ================= the cursor through milk: a real little fluid (stable fluids, on the GPU) =================
     Velocity and "milk" live in textures. Each frame the cursor stirs both, the flow curls on itself (vorticity),
     is made incompressible (divergence -> pressure -> subtract), and carries the milk along. The milk is then laid
     over the picture like cream poured into coffee: it never bends the picture, it only clouds it, softly lit. */
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), postScene = new THREE.Scene(), postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); postScene.add(quad);
  const canFloat = renderer.capabilities.isWebGL2;
  const rtScene = new THREE.WebGLRenderTarget(innerWidth * DPR, innerHeight * DPR, { type: canFloat ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: canFloat ? 4 : 0 });
  const V = "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }";
  const SIM = small ? 96 : 128, DYE = small ? 384 : 640;
  const gridOf = (r) => { const a = innerWidth / innerHeight; return a >= 1 ? [Math.round(r * a), r] : [r, Math.round(r / a)]; };
  const fOpt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
  function pair(r) { const [w, h] = gridOf(r); let a = new THREE.WebGLRenderTarget(w, h, fOpt), b = new THREE.WebGLRenderTarget(w, h, fOpt);
    return { tx: new THREE.Vector2(1 / w, 1 / h), w, h, get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; },
      size() { const [w2, h2] = gridOf(r); this.w = w2; this.h = h2; a.setSize(w2, h2); b.setSize(w2, h2); this.tx.set(1 / w2, 1 / h2); } }; }
  const velo = pair(SIM), dye = pair(DYE), pres = pair(SIM), one = pair(SIM);   /* one: curl, then divergence */
  const NB = `uniform vec2 tx; varying vec2 vUv; vec2 vL(){ return vUv - vec2(tx.x,0.); } vec2 vR(){ return vUv + vec2(tx.x,0.); } vec2 vT(){ return vUv + vec2(0.,tx.y); } vec2 vB(){ return vUv - vec2(0.,tx.y); }`;
  const mat = (u, f) => new THREE.ShaderMaterial({ uniforms: u, vertexShader: V, fragmentShader: f, depthTest: false, depthWrite: false });
  const U = (v) => ({ value: v });
  const splatM = mat({ uTarget: U(null), aspect: U(1), point: U(new THREE.Vector2()), color: U(new THREE.Vector3()), radius: U(.003) },
    `uniform sampler2D uTarget; uniform float aspect, radius; uniform vec2 point; uniform vec3 color; varying vec2 vUv;
     void main(){ vec2 p = vUv - point; p.x *= aspect; vec3 s = exp(-dot(p,p)/radius)*color; gl_FragColor = vec4(texture2D(uTarget, vUv).xyz + s, 1.0); }`);
  const advectM = mat({ uVelocity: U(null), uSource: U(null), tx: U(new THREE.Vector2()), dt: U(.016), dissipation: U(.2) },
    `uniform sampler2D uVelocity, uSource; uniform vec2 tx; uniform float dt, dissipation; varying vec2 vUv;
     void main(){ vec2 c = vUv - dt*texture2D(uVelocity, vUv).xy*tx; gl_FragColor = vec4(texture2D(uSource, c).xyz/(1.0 + dissipation*dt), 1.0); }`);
  const curlM = mat({ uVelocity: U(null), tx: U(new THREE.Vector2()) },
    `uniform sampler2D uVelocity; ${NB}
     void main(){ float L = texture2D(uVelocity, vL()).y, R = texture2D(uVelocity, vR()).y, T = texture2D(uVelocity, vT()).x, B = texture2D(uVelocity, vB()).x;
       gl_FragColor = vec4(.5*(R - L - T + B), 0., 0., 1.); }`);
  const vortM = mat({ uVelocity: U(null), uCurl: U(null), tx: U(new THREE.Vector2()), curl: U(22), dt: U(.016) },
    `uniform sampler2D uVelocity, uCurl; uniform float curl, dt; ${NB}
     void main(){ float L = texture2D(uCurl, vL()).x, R = texture2D(uCurl, vR()).x, T = texture2D(uCurl, vT()).x, B = texture2D(uCurl, vB()).x, C = texture2D(uCurl, vUv).x;
       vec2 f = .5*vec2(abs(T) - abs(B), abs(R) - abs(L)); f /= length(f) + .0001; f *= curl*C; f.y *= -1.0;
       vec2 v = texture2D(uVelocity, vUv).xy + f*dt; gl_FragColor = vec4(clamp(v, -1000., 1000.), 0., 1.); }`);
  const divM = mat({ uVelocity: U(null), tx: U(new THREE.Vector2()) },
    `uniform sampler2D uVelocity; ${NB}
     void main(){ vec2 C = texture2D(uVelocity, vUv).xy; float L = texture2D(uVelocity, vL()).x, R = texture2D(uVelocity, vR()).x, T = texture2D(uVelocity, vT()).y, B = texture2D(uVelocity, vB()).y;
       if (vL().x < 0.) L = -C.x; if (vR().x > 1.) R = -C.x; if (vT().y > 1.) T = -C.y; if (vB().y < 0.) B = -C.y;
       gl_FragColor = vec4(.5*(R - L + T - B), 0., 0., 1.); }`);
  const fadeM = mat({ uTexture: U(null), value: U(.8) }, `uniform sampler2D uTexture; uniform float value; varying vec2 vUv; void main(){ gl_FragColor = value*texture2D(uTexture, vUv); }`);
  const presM = mat({ uPressure: U(null), uDivergence: U(null), tx: U(new THREE.Vector2()) },
    `uniform sampler2D uPressure, uDivergence; ${NB}
     void main(){ float L = texture2D(uPressure, vL()).x, R = texture2D(uPressure, vR()).x, T = texture2D(uPressure, vT()).x, B = texture2D(uPressure, vB()).x;
       gl_FragColor = vec4((L + R + B + T - texture2D(uDivergence, vUv).x)*.25, 0., 0., 1.); }`);
  const gradM = mat({ uPressure: U(null), uVelocity: U(null), tx: U(new THREE.Vector2()) },
    `uniform sampler2D uPressure, uVelocity; ${NB}
     void main(){ float L = texture2D(uPressure, vL()).x, R = texture2D(uPressure, vR()).x, T = texture2D(uPressure, vT()).x, B = texture2D(uPressure, vB()).x;
       gl_FragColor = vec4(texture2D(uVelocity, vUv).xy - vec2(R - L, T - B), 0., 1.); }`);
  /* a small copy of the flow the beads can read: they ride the same current as the milk */
  const RW = 48, RH = 28, VMAX = 900, rtRead = new THREE.WebGLRenderTarget(RW, RH, { type: THREE.UnsignedByteType, depthBuffer: false }), readBuf = new Uint8Array(RW * RH * 4);
  const readM = mat({ uVelocity: U(null) }, `uniform sampler2D uVelocity; varying vec2 vUv; void main(){ vec2 v = texture2D(uVelocity, vUv).xy/${VMAX}.0; gl_FragColor = vec4(clamp(v*.5 + .5, 0., 1.), 0., 1.); }`);
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(postScene, postCam); };
  function splat(x, y, dx, dy, milk, rad) {
    const a = innerWidth / innerHeight;
    splatM.uniforms.aspect.value = a; splatM.uniforms.point.value.set(x, y); splatM.uniforms.radius.value = rad;
    splatM.uniforms.uTarget.value = velo.read.texture; splatM.uniforms.color.value.set(dx, dy, 0); pass(splatM, velo.write); velo.swap();
    if (milk > 0) { splatM.uniforms.uTarget.value = dye.read.texture; splatM.uniforms.color.value.set(milk, milk, milk); splatM.uniforms.radius.value = rad * .8; pass(splatM, dye.write); dye.swap(); }
  }
  function step(dt) {
    curlM.uniforms.uVelocity.value = velo.read.texture; curlM.uniforms.tx.value = velo.tx; pass(curlM, one.write); one.swap();
    vortM.uniforms.uVelocity.value = velo.read.texture; vortM.uniforms.uCurl.value = one.read.texture; vortM.uniforms.tx.value = velo.tx; vortM.uniforms.dt.value = dt; pass(vortM, velo.write); velo.swap();
    divM.uniforms.uVelocity.value = velo.read.texture; divM.uniforms.tx.value = velo.tx; pass(divM, one.write); one.swap();
    fadeM.uniforms.uTexture.value = pres.read.texture; pass(fadeM, pres.write); pres.swap();
    presM.uniforms.uDivergence.value = one.read.texture; presM.uniforms.tx.value = velo.tx;
    for (let i = 0; i < 18; i++) { presM.uniforms.uPressure.value = pres.read.texture; pass(presM, pres.write); pres.swap(); }
    gradM.uniforms.uPressure.value = pres.read.texture; gradM.uniforms.uVelocity.value = velo.read.texture; gradM.uniforms.tx.value = velo.tx; pass(gradM, velo.write); velo.swap();
    advectM.uniforms.uVelocity.value = velo.read.texture; advectM.uniforms.uSource.value = velo.read.texture; advectM.uniforms.tx.value = velo.tx; advectM.uniforms.dt.value = dt; advectM.uniforms.dissipation.value = .35; pass(advectM, velo.write); velo.swap();
    advectM.uniforms.uVelocity.value = velo.read.texture; advectM.uniforms.uSource.value = dye.read.texture; advectM.uniforms.dissipation.value = 1.1; pass(advectM, dye.write); dye.swap();
  }
  const outMat = mat({ tScene: U(rtScene.texture), tDye: U(null), dtx: U(dye.tx), time: U(0), on: U(canFloat ? 1 : 0), milk: U(new THREE.Color(1, .96, .9)), deep: U(new THREE.Color(.55, .32, .2)), beat: U(0), alarm: U(0), wipe: U(0) },
    `uniform sampler2D tScene, tDye; uniform vec2 dtx; uniform float time, on; uniform vec3 milk, deep; uniform float beat, alarm, wipe; varying vec2 vUv;
     float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
     float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
     float fb(vec2 p){ float v = 0.0, a = .5; for (int i = 0; i < 5; i++){ v += a*vn(p); p = p*2.02 + 3.1; a *= .5; } return v; }
     void main(){ vec3 c = texture2D(tScene, vUv).rgb;
       if (on > .5) {
         float d = texture2D(tDye, vUv).r;
         vec2 o = dtx*2.5; float gx = texture2D(tDye, vUv + vec2(o.x,0.)).r - texture2D(tDye, vUv - vec2(o.x,0.)).r, gy = texture2D(tDye, vUv + vec2(0.,o.y)).r - texture2D(tDye, vUv - vec2(0.,o.y)).r;
         float a = 1.0 - exp(-d*.9);                               /* how thick the milk is here */
         float lit = clamp(.5 + (-gx*.7 + gy*.9)*1.4, 0., 1.);        /* soft light on the folds, from the upper left */
         vec3 m = milk*(.94 + .14*lit);
         float edge = clamp(a*(1.0 - a)*4.0, 0., 1.);                  /* where milk meets coffee: a warm, darker fringe */
         c = mix(c, c*mix(vec3(1.), deep*1.4, .5), edge*.05);
         c = mix(c, m, a*.3) + m*a*.05;
       }
       vec2 q = vUv - .5; c *= 1.0 - dot(q,q)*(.55 + .5*beat);       /* soft vignette, pressing in a little on each heartbeat */
       c *= 1.0 + .045*beat;
       /* a wrong sign-in: a soft red glow spreads through the scene and fades (stage.js, gr8:alarm) */
       if (alarm > .001) { float rg = alarm * (.45 + .55*smoothstep(1.0, .1, length(q*vec2(1.6,1.0)))); vec3 warn = c*vec3(1.18,.52,.5) + vec3(.2,.015,.03); c = mix(c, warn, clamp(rg*.8, 0., .8)); }
       c += (h(vUv*vec2(1920.0,1080.0) + fract(time)*10.0) - .5)*.025; /* film grain */
       /* moving between places: a rolling wall of cream smoke sweeps in from the edges, covers everything, then thins away */
       if (wipe > .001) { vec2 w = vUv*vec2(2.6, 1.8); float e = fb(w + vec2(time*.18, -time*.12) + fb(w*1.7 - time*.2)*1.4);
         float rad = length((vUv - .5)*vec2(1.6, 1.0));
         float cover = smoothstep(e - .16, e + .16, wipe*1.45 - .25 + rad*.35*(1.0 - wipe));
         vec3 smoke = mix(vec3(1.0, .965, .925), vec3(.93, .8, .7), fb(w*2.0 + time*.1)); c = mix(c, smoke, cover); }
       gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n
     }`);

  /* ================= input ================= */
  let lastPulse = 0, windKick = 0, homeLive = true, alarmT = 0, alarmV = 0;
  addEventListener("gr8:alarm", () => { alarmT = 1; }); const tmpLook = new THREE.Vector3();
  const ripA = [99, 99, 99, 99], ripS = [0, 0, 0, 0]; let ripI = 0, beatT = 99, beats = 0, nextBeat = rnd(4, 6), sinceBeat = 0;
  let fr = 0, morph = 0, plx = 0, ply = 0, mx = .5, my = .5, pmx = .5, pmy = .5, moved = false, emx = 0, emy = 0, still = !!window.GR8_STILL, gather = 0, gathering = false, t0 = performance.now();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3(), plane = new THREE.Plane(), local = new THREE.Vector3(9e9, 9e9, 0);
  let hitOn = false; const clicks = [];
  const onMove = (x, y) => { mx = x / innerWidth; my = 1 - y / innerHeight; moved = true; hitOn = true; };
  addEventListener("pointermove", (e) => onMove(e.clientX, e.clientY), { passive: true });
  addEventListener("touchmove", (e) => { const t = e.touches[0]; if (t) onMove(t.clientX, t.clientY); }, { passive: true });
  document.addEventListener("pointerleave", () => { hitOn = false; });
  addEventListener("pointerdown", (e) => { if (still || talkOn || inRoom || e.target.closest("a, button, .card, .kw, .snav")) return; burst(1); if (canFloat) { const a = Math.random() * 6.28; for (let k = 0; k < 6; k++) { const b = a + k * 1.047; clicks.push([mx + Math.cos(b) * .02, my + Math.sin(b) * .03, -Math.sin(b) * 1400, Math.cos(b) * 1400]); } } });
  function burst(k) { for (let i = 0; i < N; i++) { const q = i * 3, x = pos[q], y = pos[q + 1], d = Math.hypot(x, y) || 1, sp = rnd(4, 9) * k; ov[q] += (x / d * .8 - y / d * .6) * sp; ov[q + 1] += (y / d * .8 + x / d * .6) * sp; ov[q + 2] += rnd(-1, 1) * sp * .6; } }
  addEventListener("gr8:enter", () => { gathering = true; t0 = performance.now(); });
  addEventListener("gr8:still", (e) => { still = e.detail.on; });

  /* ================= resize ================= */
  function resize() {
    const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    rtScene.setSize(w * DPR, h * DPR); water.getRenderTarget().setSize(w * DPR * .5, h * DPR * .5); beadU.scale.value = h * DPR * .5; velo.size(); dye.size(); pres.size(); one.size();
  }
  addEventListener("resize", resize);
  addEventListener("gr8:quality", (e) => { const q = e.detail; if (!QK[q]) return; DPR = Math.min(devicePixelRatio || 1, 1.75) * QK[q]; renderer.setPixelRatio(DPR); resize(); });

  /* ================= every frame ================= */
  /* ---- the rooms (rooms.js) and moving between places ---- */
  const worldList = scene.children.slice(), rooms = makeRooms({ THREE, scene, camera, renderer, Reflector, small, rnd, DPR });
  let inRoom = null, nextRoom = null, wipe = 0, wipeDir = 0; const baseFov = camera.fov, tmpDir = new THREE.Vector3();
  function applyPlace() {
    inRoom = nextRoom; worldList.forEach((o) => { o.visible = !inRoom; }); rooms.show(inRoom);
    if (!inRoom) { renderer.setClearColor(0x000000, 1); talkT = talkOn ? 1 : 0; if (talkOn) { TALK.pos.copy(SPOTS[spot].pos); TALK.look.copy(SPOTS[spot].look); hop = 0; } }
    if (inRoom && camera.view && camera.view.enabled) camera.clearViewOffset();
    dispatchEvent(new CustomEvent("gr8:place", { detail: inRoom || (talkOn ? "talk" : "home") }));
  }
  function goPlace(name) { name = name || null; if (name === inRoom && !wipeDir) return; nextRoom = name; if (wipeDir <= 0) wipeDir = 1; }
  addEventListener("gr8:room", (e) => goPlace(e.detail && e.detail.room));
  addEventListener("gr8:aboutscroll", (e) => rooms.setScroll(e.detail || 0));
  addEventListener("gr8:loansfilter", (e) => rooms.filter(e.detail || "All"));
  addEventListener("gr8:cardgo", (e) => rooms.focus(e.detail | 0));
  addEventListener("gr8:cardzoom", (e) => rooms.zoom(e.detail == null ? -1 : e.detail));
  /* the loans ring: drag or scroll to turn it, click a card to read it */
  let dragX = null, dragMoved = 0;
  addEventListener("wheel", (e) => { if (inRoom !== "loans" || e.target.closest(".lo-ui .lo-sheet, .snav, .kc, .lp")) return; rooms.nudge(Math.max(-.12, Math.min(.12, (e.deltaY + e.deltaX) * .0005))); }, { passive: true });   /* slow: a whole notch turns the ring only a little */
  addEventListener("pointerdown", (e) => { if (inRoom !== "loans" || e.target.closest("a, button, .snav, .lo-sheet, .kw, .kc, .lp")) return; dragX = e.clientX; dragMoved = 0; });
  addEventListener("pointermove", (e) => { if (dragX == null) return; const d = e.clientX - dragX; dragX = e.clientX; dragMoved += Math.abs(d); rooms.nudge(-d * .0025); });
  addEventListener("pointerup", (e) => { if (dragX == null) return; dragX = null; if (dragMoved < 6) { const i = rooms.pick(e.clientX / innerWidth * 2 - 1, 1 - e.clientY / innerHeight * 2); if (i >= 0) { rooms.focus(i); dispatchEvent(new CustomEvent("gr8:card", { detail: i })); } } });
  window.GR8_ROOMS = rooms;
  const clock = new THREE.Clock(); let time = 0;
  function frame() {
    const dt = Math.min(clock.getDelta(), .05); if (!still) time += dt;
    /* day and night, eased */
    moodT = document.documentElement.classList.contains("dark") ? 1 : 0; mood += (moodT - mood) * Math.min(1, .04 * dt * 60);
    skyU.top.value.copy(C(DAY.top, NIGHT.top)); skyU.mid.value.copy(C(DAY.mid, NIGHT.mid)); skyU.hor.value.copy(C(DAY.hor, NIGHT.hor)); skyU.sunC.value.copy(C(DAY.sun, NIGHT.sun)); skyU.night.value = mood; skyU.time.value = time;
    worldFog.color.copy(C(DAY.fog, NIGHT.fog));   /* the lake's own fog only; the rooms keep theirs */ waterShader.uniforms; water.material.uniforms.fogC.value.copy(worldFog.color); water.material.uniforms.color.value.copy(C(DAY.water, NIGHT.water)); water.material.uniforms.time.value = time;
    rockMatA.color.copy(C(DAY.rock, NIGHT.rock)); rockMatB.color.copy(C(DAY.rock2, NIGHT.rock2));
    hemi.color.copy(C(DAY.hemiS, NIGHT.hemiS)); hemi.groundColor.copy(C(DAY.hemiG, NIGHT.hemiG)); hemi.intensity = DAY.hemiI + (NIGHT.hemiI - DAY.hemiI) * mood; sun.color.copy(C(DAY.dir, NIGHT.dir)); sun.intensity = DAY.dirI + (NIGHT.dirI - DAY.dirI) * mood;
    beadU.night.value = mood; glow.material.opacity = .45 + mood * .35; specks.material.color.copy(C(0xfff1d8, 0xffd27a)); specks.material.opacity = .55 + mood * .4;
    outMat.uniforms.milk.value.copy(C(0xfff6ea, 0xffdcaa)); outMat.uniforms.deep.value.copy(C(0x8a5236, 0x3a1c10));

    /* the camera leans with the cursor */
    emx += ((mx - .5) - emx) * .05; emy += ((my - .5) - emy) * .05;
    talkT += (talkOn ? 1 : -1) * dt / 2.6; talkT = Math.min(1, Math.max(0, talkT));
    const te = talkT < .5 ? 4 * talkT * talkT * talkT : 1 - Math.pow(-2 * talkT + 2, 3) / 2, home = 1 - te, lift = Math.sin(te * Math.PI) * 6;
    camera.position.set((camBase.x + emx * 4) * home + (TALK.pos.x + emx * 2) * te, (camBase.y + emy * 1.6 - lastPulse * .06) * home + (TALK.pos.y + emy * .8 + Math.sin(hop * Math.PI) * 5) * te + lift, (camBase.z - lastPulse * .32) * home + TALK.pos.z * te);
    homeLive = talkT < 1; eight.visible = homeLive;
    tmpLook.copy(look).lerp(TALK.look, te); camera.lookAt(tmpLook);   /* the heartbeat nudges the camera in; "Let's talk" flies it to the far shore */
    const offW = innerWidth > 900 && !inRoom ? innerWidth * .25 * te : 0; if (offW > .5) camera.setViewOffset(innerWidth, innerHeight, offW, 0, innerWidth, innerHeight); else if (camera.view && camera.view.enabled) camera.clearViewOffset();
    if (inRoom) { homeLive = false; eight.visible = false; rooms.update(dt, time, emx, emy); }
    /* the transition: push the camera forward into the smoke as it rolls in; at full cover, swap places; then let it thin */
    if (wipeDir) {
      wipe = Math.min(1, Math.max(0, wipe + wipeDir * dt / (wipeDir > 0 ? .95 : 1.25)));
      if (wipeDir > 0) { const k = wipe * wipe; camera.getWorldDirection(tmpDir); camera.position.addScaledVector(tmpDir, k * 6); camera.fov = baseFov - k * 14; camera.updateProjectionMatrix(); }
      else { const k = wipe * wipe; camera.getWorldDirection(tmpDir); camera.position.addScaledVector(tmpDir, -k * 4); camera.fov = baseFov + k * 8; camera.updateProjectionMatrix(); }
      if (wipeDir > 0 && wipe >= 1) { applyPlace(); wipeDir = -1; }
      else if (wipeDir < 0 && wipe <= 0) { wipeDir = 0; camera.fov = baseFov; camera.updateProjectionMatrix(); }
    }
    outMat.uniforms.wipe.value = wipe;
    { const k = 1 - Math.exp(-dt * 1.5); TALK.pos.lerp(SPOTS[spot].pos, k); TALK.look.lerp(SPOTS[spot].look, k); hop *= Math.exp(-dt * 1.2); }
    for (let i = 0; i < PN; i++) { const q = PP[i]; dummy.position.set(q.x + Math.sin(time * q.sp + q.ph) * .6, q.y + Math.sin(time * .7 + q.ph) * .35, q.z); dummy.rotation.set(Math.sin(time * .4 + q.ph) * .8, time * q.sp + q.ph, Math.cos(time * .3 + q.ph) * .5); dummy.scale.setScalar(1); dummy.updateMatrix(); papers.setMatrixAt(i, dummy.matrix); }
    papers.instanceMatrix.needsUpdate = true; lampLight.intensity = 13 + Math.sin(time * 3.1) * .4;
    grassU.time.value = time; glowLight.intensity = 22 + 10 * Math.sin(time * .8) + Math.max(0, lastPulse) * 10;
    for (let i = 0; i < fallN; i++) { const f = FL[i]; f.y -= dt * f.sp * .7; f.x += Math.sin(time * 1.3 + f.ph) * dt * .5; f.r += dt * 2; if (f.y < .7) { f.y = rnd(7, 11); f.x = rnd(-6, 6); f.z = rnd(-6, 5); }
      dummy.position.set(f.x, f.y, f.z); dummy.rotation.set(f.r, f.r * .7, f.r * .4); dummy.scale.setScalar(.38); dummy.updateMatrix(); fall.setMatrixAt(i, dummy.matrix); }
    fall.instanceMatrix.needsUpdate = true;

    /* the 8: turns a little toward the cursor, breathes, and its beads flee the cursor */
    eight.rotation.y = Math.sin(time * .25) * .25 + emx * .7; eight.rotation.x = -emy * .15; eight.position.y = (small ? 8.6 : 7.4) + Math.sin(time * .8) * .25;
    eight.updateMatrixWorld();
    if (hitOn) { ndc.set(mx * 2 - 1, my * 2 - 1); ray.setFromCamera(ndc, camera); plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(hit).negate(), eight.getWorldPosition(new THREE.Vector3()));
      if (ray.ray.intersectPlane(plane, hit)) local.copy(eight.worldToLocal(hit.clone())); } else local.set(9e9, 9e9, 0);
    if (gathering) gather = Math.min(1, (performance.now() - t0) / 5200);
    /* the shape: an "8", and every few seconds it flows into the peso sign and back */
    const cyc = (time % 16) / 16;
    const want = cyc < .44 ? 0 : cyc < .5 ? (cyc - .44) / .06 : cyc < .94 ? 1 : 1 - (cyc - .94) / .06;
    const wantM = window.GR8_MORPH != null ? window.GR8_MORPH : want;   /* GR8_MORPH: set 0 or 1 in the console to hold a shape */
    morph = still ? 0 : morph + (wantM - morph) * Math.min(1, dt * 1.6);
    /* the beads ride the milk's current: read the flow (a small copy, every other frame) */
    if (homeLive && canFloat && (fr++ & 1) === 0) { readM.uniforms.uVelocity.value = velo.read.texture; pass(readM, rtRead); renderer.readRenderTargetPixels(rtRead, 0, 0, RW, RH, readBuf); }
    const mvp = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(eight.matrixWorld).elements;
    const dist = camera.position.distanceTo(eight.position), viewH = 2 * dist * Math.tan(camera.fov * Math.PI / 360), viewW = viewH * camera.aspect;
    const kx = viewW / velo.w * VMAX / 127.5, ky = viewH / velo.h * VMAX / 127.5;   /* flow (grid cells a second) -> world units a second */
    /* the heartbeat: once the beads have gathered, the 8 beats (lub-dub) and after a few beats every beat rings the water */
    /* the heart beats now and then, not like a clock: one deep, single pulse every 7 to 12 seconds, with silence between */
    beatT += dt;
    if (gather >= 1 && !still && !talkOn && !inRoom) { sinceBeat += dt; if (sinceBeat >= nextBeat) { sinceBeat = 0; nextBeat = rnd(7, 12); beatT = 0; beats++; dispatchEvent(new CustomEvent("gr8:beat", { detail: beats })); emit(small ? 30 : 48); kick(); windKick = 1;   /* stage.js plays the thump */
       { ripA[ripI] = 0; ripS[ripI] = 1; ripI = (ripI + 1) % 4; } } }
    /* one heavy, smooth swell and a slow settle a touch below rest, then stillness until the next */
    const pkT = (x, T) => x > 0 ? x / T * Math.exp(1 - x / T) : 0, ph = beatT;
    const pulse = gather >= 1 && !still && !talkOn && !inRoom ? pkT(ph, .16) - .2 * pkT(ph - .45, .4) : 0;
    const hb = 1 + .09 * pulse; lastPulse = Math.max(0, pulse);
    glow.material.opacity += Math.max(0, pulse) * .4; glow.scale.setScalar(22 * (1 + .3 * Math.max(0, pulse)));
    outMat.uniforms.beat.value = Math.max(0, pulse); alarmT *= Math.exp(-dt * .75); alarmV += (alarmT - alarmV) * Math.min(1, dt * 7); outMat.uniforms.alarm.value = alarmV; windKick *= Math.exp(-2.5 * dt);
    for (let i = 0; i < 4; i++) ripA[i] += dt;
    { const dr = Math.exp(-1.6 * dt);
      for (let i = 0; i < EP; i++) { const L0 = lfl[i]; if (L0.life <= 0) continue; L0.life -= dt;
        /* outward burst that slows, then a gentle fall with a side-to-side sway, tumbling all the while */
        L0.vx *= dr; L0.vz *= dr; L0.vy = L0.vy * dr - .9 * dt;
        L0.x += (L0.vx + Math.sin(time * 2.2 + L0.ph) * .45) * dt; L0.y += Math.max(L0.vy, -1.1) * dt; L0.z += L0.vz * dt;
        L0.rx += L0.sx * dt; L0.ry += L0.sy * dt; L0.rz += L0.sz * dt;
        const f = Math.max(0, L0.life / L0.max), sc = L0.s * Math.min(1, (L0.max - L0.life) * 6) * Math.min(1, f * 3);
        ldm.position.set(L0.x, L0.y, L0.z); ldm.rotation.set(L0.rx, L0.ry, L0.rz); ldm.scale.set(sc, sc, sc); ldm.updateMatrix(); leaflets.setMatrixAt(i, ldm.matrix); }
      leaflets.instanceMatrix.needsUpdate = true; }
    if (window.GR8_RING) { window.GR8_RING = 0; ripA[ripI] = 0; ripS[ripI] = 1; ripI = (ripI + 1) % 4; }   /* GR8_RING = 1 in the console rings the water once */
    water.material.uniforms.ripA.value.set(ripA[0], ripA[1], ripA[2], ripA[3]); water.material.uniforms.ripS.value.set(ripS[0], ripS[1], ripS[2], ripS[3]);
    let knocked = 0; const relax = Math.exp(-2.0 * dt), drag = Math.exp(-2.8 * dt), K = 1.8 * dt;
    if (homeLive && (!still || gather < 1)) for (let i = 0; i < N; i++) {
      const q = i * 3, sd = seed[i];
      /* home: between the two shapes, each bead leaving at its own moment and arcing on the way */
      const lag = Math.min(1, Math.max(0, morph * 1.6 - (sd % 1) * .6)), e = lag * lag * (3 - 2 * lag), arc = Math.sin(e * Math.PI);
      let hx = shapeA[q] + (shapeB[q] - shapeA[q]) * e, hy = shapeA[q + 1] + (shapeB[q + 1] - shapeA[q + 1]) * e, hz = shapeA[q + 2] + (shapeB[q + 2] - shapeA[q + 2]) * e;
      hz += arc * (2.4 + (sd % 1) * 2) * ((i & 1) ? 1 : -1); hx += arc * Math.sin(sd) * 1.2;
      /* a slow living flow through the whole shape */
      hx += Math.sin(time * .7 + hy * .55 + sd) * .07; hy += Math.cos(time * .6 + hx * .5 + sd * 1.7) * .07; hz += Math.sin(time * .5 + sd * 2.3) * .1;
      hx *= hb; hy *= hb; hz *= hb;
      if (gather < 1) { const a = time * .25 + sd, gi = gather * gather * (3 - 2 * gather); hx = hx * gi + Math.cos(a) * 13 * (1 - gi); hy = hy * gi + (Math.sin(a * .7) * 5 + 3) * (1 - gi); hz = hz * gi + (Math.sin(a) * 9 - 6) * (1 - gi); }
      /* the milk's current at this bead, on screen: it pushes the bead along, and lifts it a little in depth */
      if (canFloat && gather >= .6) { const px = hx + off[q], py = hy + off[q + 1], pz = hz + off[q + 2];
        const cw = mvp[3] * px + mvp[7] * py + mvp[11] * pz + mvp[15], sx = (mvp[0] * px + mvp[4] * py + mvp[8] * pz + mvp[12]) / cw, sy = (mvp[1] * px + mvp[5] * py + mvp[9] * pz + mvp[13]) / cw;
        const gx = (sx * .5 + .5) * (RW - 1), gy = (sy * .5 + .5) * (RH - 1);
        if (gx >= 0 && gy >= 0 && gx <= RW - 1 && gy <= RH - 1) { const ix = Math.min(RW - 2, gx | 0), iy = Math.min(RH - 2, gy | 0), fx = gx - ix, fy = gy - iy, b = (iy * RW + ix) * 4, b2 = b + RW * 4;
          const vx = ((readBuf[b] * (1 - fx) + readBuf[b + 4] * fx) * (1 - fy) + (readBuf[b2] * (1 - fx) + readBuf[b2 + 4] * fx) * fy - 127.5) * kx;
          const vy = ((readBuf[b + 1] * (1 - fx) + readBuf[b + 5] * fx) * (1 - fy) + (readBuf[b2 + 1] * (1 - fx) + readBuf[b2 + 5] * fx) * fy - 127.5) * ky;
          if (vx * vx + vy * vy > .02) { if (vx * vx + vy * vy > 4 && off[q] * off[q] + off[q + 1] * off[q + 1] < .03) knocked++; ov[q] += vx * K; ov[q + 1] += vy * K; ov[q + 2] += Math.sin(sd * 7.1) * Math.hypot(vx, vy) * K * .8; } } }
      ov[q] *= drag; ov[q + 1] *= drag; ov[q + 2] *= drag;
      off[q] = (off[q] + ov[q] * dt) * relax; off[q + 1] = (off[q + 1] + ov[q + 1] * dt) * relax; off[q + 2] = (off[q + 2] + ov[q + 2] * dt) * relax;
      pos[q] = hx + off[q]; pos[q + 1] = hy + off[q + 1]; pos[q + 2] = hz + off[q + 2];
    }
    bg.attributes.position.needsUpdate = true;
    if (knocked > 8 && gather >= 1) dispatchEvent(new CustomEvent("gr8:rustle", { detail: Math.min(1, knocked / 260) }));   /* stage.js: tiny beads brushing and clicking */

    /* leaves and specks */
    if (!still) {
      for (let i = 0; i < LN; i++) { const l = L[i]; l.y -= dt * .9 * l.sp; l.x += Math.sin(time * l.sw + l.ph) * dt * .8 + emx * dt * 2 + Math.sign(l.x) * windKick * dt * 3; l.z += Math.sign(l.z - 0) * windKick * dt * 1.5; l.r += dt * l.sp * 1.6;
        if (l.y < .05) { l.y = rnd(22, 32); l.x = rnd(-40, 40); l.z = rnd(-40, 16); }
        dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.r, l.r * .7, l.r * .3); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix); }
      leaves.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < DN; i++) { dpos[i * 3 + 1] += Math.sin(time + i) * .004; dpos[i * 3] += .006; if (dpos[i * 3] > 50) dpos[i * 3] = -50; }
      dgeo.attributes.position.needsUpdate = true;
    }

    /* the hand through the milk: stir along the cursor's whole path since the last frame */
    const ddx = (mx - pmx) * (moved ? 1 : 0), ddy = (my - pmy) * (moved ? 1 : 0);
    if (canFloat) {
      const asp = innerWidth / innerHeight, len = Math.hypot(ddx * asp, ddy);
      if (len > .0004 && len < .4 && !still && !talkOn && !wipeDir) {
        /* the cursor's speed (screen heights a second, capped), so it feels the same at any frame rate */
        const rate = Math.min(2.4, len / Math.max(dt, 1 / 120)), ux = ddx * asp / len * rate, uy = ddy / len * rate, sp = Math.min(1, rate / 1.6);
        const n = Math.min(12, Math.ceil(len / .01)), rad = .0022 + sp * .0018, over = Math.max(1, Math.min(n, Math.sqrt(rad) / (len / n) * .5));
        for (let k = 1; k <= n; k++) { const f = k / n; splat(pmx + ddx * f, pmy + ddy * f, ux * velo.h * 1.6 / over, uy * velo.h * 1.6 / over, (.012 + .05 * sp) / over * Math.min(1, dt * 60) * (inRoom === "loans" ? .12 : 1), rad); } }   /* barely any smoke in the Loans hall */
      while (clicks.length) { const c = clicks.pop(); splat(c[0], c[1], c[2], c[3], .35, .006); }
      step(dt);
    }
    pmx = mx; pmy = my; moved = false;

    /* the picture, then the milk over it */
    renderer.setRenderTarget(rtScene); renderer.render(scene, camera);
    outMat.uniforms.tDye.value = dye.read.texture; outMat.uniforms.dtx.value = dye.tx; outMat.uniforms.time.value = time; quad.material = outMat;
    renderer.setRenderTarget(null); renderer.render(postScene, postCam);
    requestAnimationFrame(frame);
  }
  /* first leaves placed, then go */
  for (let i = 0; i < LN; i++) { const l = L[i]; dummy.position.set(l.x, l.y, l.z); dummy.rotation.set(l.r, l.r, 0); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix); }
  if (still) { gather = .999; gathering = true; }
  prog(.95); renderer.compile(scene, camera);
  requestAnimationFrame(frame);
  setTimeout(() => { prog(1); dispatchEvent(new Event("gr8:ready")); }, 200);
}
