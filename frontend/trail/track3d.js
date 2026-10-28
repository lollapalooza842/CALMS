/* Track my application (DRAFT), track.html. The scene: a boardwalk across the lake at dusk with six lanterns, one for
   each step a loan takes (Received, Papers, Review, Approval, Release, Paying), ending at a little GR8 branch on an
   island. Ask with the reference and the last 4 digits of the mobile number (GET /api/public/track); a line of light
   runs along the boardwalk, the lanterns light up one by one to the step reached, and the camera walks out to it.
   A closed or declined application stops at its step in a cool blue light, not an alarm. */
import { makeWorld, glow } from "./portal3d.js";

const $ = (s) => document.querySelector(s);
const STAGES = ["Received", "Papers", "Review", "Approval", "Release", "Paying"];
const WHAT = ["We have your application and its reference number.", "A loan processor checks your ID and papers, and tells you exactly what's missing.",
  "An underwriter reviews your income and your credit report.", "The decision: approved as asked, or a counter-offer you may take or turn down at no cost.",
  "You read and sign the agreement, then we release the money to GCash or your bank.", "Your schedule starts. Every payment and receipt shows in My GR8."];
const HEAD = { received: "We <em>have</em> it", draft: "Being <em>prepared</em>", called: "We <em>have</em> it", submitted: "Papers <em>check</em>", review: "Under <em>review</em>", approved: "<em>Approved</em>",
  awaiting: "Your <em>answer</em>", accepted: "<em>Accepted</em>", funded: "<em>Released</em>", declined: "Not <em>this time</em>", rejected: "<em>Closed</em>" };
const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ================= the scene ================= */
let scene3 = null;
const W = makeWorld(document.getElementById("gl"), { shift: .2, onTheme: (night) => scene3 && scene3.theme(night) });
if (W) scene3 = build(W);

function build(W) {
  const { THREE, scene } = W;
  const pts = [[-17, 12], [-10, 6.5], [-4, 7.5], [1.5, 2], [6.5, -2.5], [9.5, -10], [15.5, -16.5], [19, -21]].map(([x, z]) => new THREE.Vector3(x, .38, z));
  const path = new THREE.CatmullRomCurve3(pts, false, "centripetal", .5);
  const U_AT = [.035, .205, .375, .545, .715, .885];   // where each lantern stands along the boardwalk

  /* the boardwalk: planks across the path, floating on the water, with a beam along each edge */
  const len = path.getLength(), N = Math.floor(len / .44);
  const wood = new THREE.MeshLambertMaterial({ color: 0x7a5038, flatShading: true }), woodD = new THREE.MeshLambertMaterial({ color: 0x4a2e22, flatShading: true });
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, .16, .36), wood, N), edgeL = [], edgeR = [];
  const o = new THREE.Object3D(), tg = new THREE.Vector3(), side = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0); let si = 0;
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1), p = path.getPointAt(u); path.getTangentAt(u, tg);
    o.position.copy(p); o.rotation.set(0, Math.atan2(tg.x, tg.z), (Math.random() - .5) * .03); o.position.y += (Math.random() - .5) * .02; o.updateMatrix(); planks.setMatrixAt(i, o.matrix);
    if (i % 4 === 0 || i === N - 1) { side.crossVectors(tg, UP).normalize(); edgeL.push(p.clone().addScaledVector(side, -.86)); edgeR.push(p.clone().addScaledVector(side, .86)); }
  }
  scene.add(planks);
  [edgeL, edgeR].forEach((e) => { const beam = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e), 300, .05, 5, false), wood); beam.position.y = -.02; scene.add(beam); });

  /* the line of light along the middle of the boardwalk; it fills up to the step reached */
  const lineU = { prog: { value: 0 }, lit: { value: new THREE.Color(0xffcf8f) }, dim: { value: new THREE.Color(0x3a2620) }, time: { value: 0 }, stop: { value: 0 }, cool: { value: new THREE.Color(0xa9c2db) } };
  const line = new THREE.Mesh(new THREE.TubeGeometry(path, 420, .045, 6, false), new THREE.ShaderMaterial({ uniforms: lineU,
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `uniform float prog, time, stop; uniform vec3 lit, dim, cool; varying vec2 vUv;
      void main(){ float on = 1.0 - smoothstep(prog - .004, prog + .004, vUv.x); float shimmer = .75 + .25 * sin(vUv.x * 160.0 - time * 5.0);
        vec3 c = mix(lit, cool, stop * smoothstep(prog - .06, prog, vUv.x)); gl_FragColor = vec4(mix(dim, c * (1.2 * shimmer), on), 1.0);
        #include <colorspace_fragment>
      }` }));
  line.position.y = .1; scene.add(line);

  /* the lanterns */
  const lan = U_AT.map((u, i) => {
    const p = path.getPointAt(u); path.getTangentAt(u, tg); side.crossVectors(tg, UP).normalize();
    const g = new THREE.Group(); g.position.copy(p).addScaledVector(side, -.62); g.position.y = .46;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.16, .2, .14, 8), woodD); base.position.y = .07; g.add(base);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.045, .06, 1.5, 7), woodD); post.position.y = .82; g.add(post);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(.3, .26, 6), woodD); cap.position.y = 1.98; g.add(cap);
    const globeM = new THREE.MeshBasicMaterial({ color: 0x4a3a3a }); const globe = new THREE.Mesh(new THREE.SphereGeometry(.24, 18, 12), globeM); globe.position.y = 1.74; g.add(globe);
    const gl = glow(0xffcf8f, 3.4); gl.position.y = 1.74; gl.material.opacity = 0; g.add(gl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1.05, 48), new THREE.MeshBasicMaterial({ color: 0xffcf8f, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = -.42; g.add(ring);
    scene.add(g);
    const tag = document.createElement("div"); tag.className = "lab3"; tag.innerHTML = `<i>0${i + 1}</i><b>${STAGES[i]}</b>`; $("#labels").appendChild(tag);
    W.label(tag, g.position.clone().add(new THREE.Vector3(0, 2.55, 0)));
    return { g, globeM, gl, ring, tag, at: u, level: 0, want: 0, kind: "lit", pos: g.position.clone() };
  });

  /* the GR8 branch on its island, at the end of the walk */
  const isl = new THREE.Group(); isl.position.copy(path.getPointAt(1)).add(new THREE.Vector3(3, -.38, -3.2));
  const earth = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5, 1.2, 9), new THREE.MeshLambertMaterial({ color: 0x5f4a3a, flatShading: true })); earth.position.y = -.2; isl.add(earth);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(4.25, 4.25, .18, 9), new THREE.MeshLambertMaterial({ color: 0x6f7a4a, flatShading: true })); grass.position.y = .45; isl.add(grass);
  const wallM = new THREE.MeshLambertMaterial({ color: 0xf2e2cc, flatShading: true }), roofM = new THREE.MeshLambertMaterial({ color: 0xa8482c, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.2, 2.6), wallM); body.position.y = 1.65; isl.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.05, 1.4, 4), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .78); roof.position.y = 3.45; isl.add(roof);
  const winM = new THREE.MeshBasicMaterial({ color: 0xffc879 });
  [[-1, 1.8], [1, 1.8]].forEach(([x, y]) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(.62, .62), winM); w.position.set(x, y, 1.31); isl.add(w); });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.2), new THREE.MeshBasicMaterial({ color: 0x6b3a22 })); door.position.set(0, 1.15, 1.31); isl.add(door);
  [[-2.8, 1.6], [2.9, -1.4]].forEach(([x, z]) => { const t = new THREE.Mesh(new THREE.ConeGeometry(.75, 2.4, 6), new THREE.MeshLambertMaterial({ color: 0x3f5a3a, flatShading: true })); t.position.set(x, 1.75, z); isl.add(t); });
  isl.rotation.y = -.55; scene.add(isl);
  const houseGlow = glow(0xffc879, 7); houseGlow.position.set(0, 1.8, 1.6); houseGlow.material.opacity = .35; isl.add(houseGlow);

  /* resting views */
  const OVER = { pos: new THREE.Vector3(-4, 9.5, 31), look: new THREE.Vector3(2.5, .5, -9) };
  W.place(OVER.pos, OVER.look);
  if (innerWidth <= 760) W.place(new THREE.Vector3(-2, 15, 42), new THREE.Vector3(1.5, 0, -7));
  function viewOf(i) { const s = lan[i].pos, small = innerWidth <= 760; return small ? { pos: s.clone().add(new THREE.Vector3(-6, 9, 19)), look: s.clone().add(new THREE.Vector3(2.5, 1, -4)) } : { pos: s.clone().add(new THREE.Vector3(-5.5, 4.2, 9.5)), look: s.clone().add(new THREE.Vector3(2.2, 1.4, -2.5)) }; }

  /* animation */
  let progTarget = 0, progFrom = 0, progT0 = 0, progDur = 1, focus = -1;
  W.onFrame((dt, t) => {
    lineU.time.value = t;
    if (progT0) { const k = Math.min(1, (performance.now() - progT0) / progDur); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; lineU.prog.value = progFrom + (progTarget - progFrom) * e; if (k >= 1) progT0 = 0; }
    lan.forEach((l, i) => {
      const reached = lineU.prog.value >= l.at - .002 && l.want > 0; const want = reached ? l.want : 0;
      l.level += (want - l.level) * Math.min(1, dt * 3.2);
      const now = l.kind === "now" || l.kind === "stop", pulse = now && l.level > .5 ? (W.still() ? 1 : .82 + .18 * Math.sin(t * 2.6)) : 1;
      const col = l.kind === "stop" ? C_STOP : now ? C_NOW : C_LIT;
      l.globeM.color.copy(dimC).lerp(col, l.level);
      l.gl.material.color.set(l.kind === "stop" ? 0x9fb3c8 : now ? 0xffb46a : 0xffcf8f); l.gl.material.opacity = l.level * (now ? 1 : .75) * pulse; l.gl.scale.setScalar((now ? 4.4 : 3.2) * (now ? pulse : 1) * glowK);
      l.ring.material.color.set(l.kind === "stop" ? 0x9fb3c8 : 0xffcf8f); l.ring.material.opacity = now ? l.level * (.45 + .3 * Math.sin(t * 2.6)) : 0; const rs = now ? 1 + ((t * .5) % 1) * .6 : 1; l.ring.scale.setScalar(rs);
      if (l.level > .5 && !l.rang) { l.rang = true; W.sound.ping(i, l.kind === "stop" ? "stop" : ""); } else if (l.level < .2) l.rang = false;
      l.tag.classList.toggle("lit", l.level > .5); l.tag.classList.toggle("now", now && l.level > .5); l.tag.classList.toggle("hide", focus >= 0 && Math.abs(i - focus) > 1);
    });
  });
  let glowK = 1; const dimC = new THREE.Color(0x4a3a3a), C_STOP = new THREE.Color(0xc8d6e6), C_NOW = new THREE.Color(0xffd08a), C_LIT = new THREE.Color(0xffe2b8);
  function theme(night) { glowK = night ? .75 : 1; dimC.set(night ? 0x2a2633 : 0x4a3a3a); lineU.dim.value.set(night ? 0x1d1a24 : 0x3a2620); winM.color.set(night ? 0xffd27f : 0xffc879); houseGlow.material.opacity = night ? .6 : .35; wood.color.set(night ? 0x3a2c2a : 0x7a5038); wallM.color.set(night ? 0x8d8494 : 0xf2e2cc); }
  theme(W.dark());

  return {
    theme,
    show(stage, kind) {   // kind: ok | stop
      lan.forEach((l, i) => { l.want = i <= stage ? 1 : 0; l.kind = i < stage ? "lit" : i === stage ? (kind === "stop" ? "stop" : "now") : "lit"; });
      lineU.stop.value = kind === "stop" ? 1 : 0;
      progFrom = lineU.prog.value; progTarget = Math.min(1, lan[stage].at + (stage === 5 && kind !== "stop" ? .115 : 0)); progDur = W.still() ? 1 : 900 + 520 * (stage + 1); progT0 = performance.now();
      focus = stage; const v = viewOf(stage); W.fly(v.pos, v.look, 2.4 + stage * .25);
    },
    reset() { lan.forEach((l) => { l.want = 0; l.kind = "lit"; }); progFrom = lineU.prog.value; progTarget = 0; progDur = 900; progT0 = performance.now(); lineU.stop.value = 0;
      W.fly(innerWidth <= 760 ? new THREE.Vector3(-2, 15, 42) : OVER.pos, innerWidth <= 760 ? new THREE.Vector3(1.5, 0, -7) : OVER.look, 2); focus = -1; }
  };
}

/* ================= the card ================= */
const form = $("#tForm"), ref = $("#tRef"), l4 = $("#tL4"), err = $("#tErr"), go = $("#tGo");
ref.addEventListener("input", () => { const p = ref.selectionStart; ref.value = ref.value.toUpperCase().replace(/\s+/g, ""); ref.setSelectionRange(p, p); });
l4.addEventListener("input", () => { l4.value = l4.value.replace(/\D/g, "").slice(0, 4); });
form.addEventListener("submit", (e) => { e.preventDefault(); find(); });
$("#tEx").addEventListener("click", () => { const since = new Date(Date.now() - 2 * 864e5);
  answer({ reference: "APP-2026-0412", product: "Personal loan", amount: 60000, months: 12, stage: 2, stages: STAGES, status: "review", since: since.toISOString(), note: "An underwriter is reviewing your application. You'll get a text when there's a decision, usually within one to two working days." }, true); });
$("#tAgain").addEventListener("click", () => { $("#vRes").hidden = true; $("#vAsk").hidden = false; if (scene3) scene3.reset(); ref.focus({ preventScroll: true }); });

function find() {
  err.textContent = "";
  const r = ref.value.trim().toUpperCase(), d = l4.value.trim();
  if (!/^(APP|W)-\d{4}-\d{4,}$/.test(r)) { err.textContent = "The reference looks like APP-2026-0412 (or W-2026-0001 for online applications)."; ref.focus(); return; }
  if (!/^\d{4}$/.test(d)) { err.textContent = "Type the last 4 digits of the mobile number you applied with."; l4.focus(); return; }
  go.disabled = true; go.firstChild.textContent = "Looking ";
  fetch("/api/public/track?ref=" + encodeURIComponent(r) + "&last4=" + encodeURIComponent(d))
    .then((res) => res.json().catch(() => ({})).then((j) => { if (!res.ok) throw new Error(j.error || "We couldn't check right now. Try again in a moment."); return j; }))
    .then((j) => answer(j, false))
    .catch((e) => { err.textContent = e.message === "Failed to fetch" ? "We couldn't reach GR8 just now. Check your connection and try again." : e.message; })
    .finally(() => { go.disabled = false; go.firstChild.textContent = "Find my loan "; });
}

function answer(j, example) {
  const stages = Array.isArray(j.stages) && j.stages.length === 6 ? j.stages : STAGES, stage = Math.max(0, Math.min(5, j.stage | 0));
  const stop = j.status === "declined" || j.status === "rejected", done = j.status === "funded";
  $("#rRef").textContent = j.reference; $("#rEx").hidden = !example;
  $("#rHead").innerHTML = HEAD[j.status] || "Step <em>" + (stage + 1) + "</em>";
  const tag = $("#rTag"); tag.className = "tag" + (stop ? " cool" : done ? " ok" : " dot"); tag.textContent = stop ? "Closed at step " + (stage + 1) : done ? "All six steps done" : "Step " + (stage + 1) + " of 6";
  $("#rSince").textContent = j.since ? "Since " + new Date(j.since).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "";
  $("#rNote").textContent = j.note || WHAT[stage];
  $("#rFacts").innerHTML = `<div><dt>Loan</dt><dd>${esc(String(j.product || "–").replace(/ loan$/i, ""))}</dd></div><div><dt>Amount</dt><dd>${peso(j.amount)}</dd></div><div><dt>Months</dt><dd>${esc(j.months || "–")}</dd></div>`;
  $("#rSteps").innerHTML = stages.map((s, i) => { const cls = i < stage || (done && i === stage) ? "done" : i === stage ? (stop ? "now stop" : "now") : "";
    const em = cls === "done" ? "Done" : i === stage ? (stop ? "Stopped" : "Now") : "";
    return `<li class="${cls}"><i>0${i + 1}</i><b>${esc(s)}</b><em>${em}</em><small>${esc(WHAT[i])}</small></li>`; }).join("");
  $("#vAsk").hidden = true; $("#vRes").hidden = false; document.querySelector(".sheet-in").scrollTop = 0;
  if (scene3) scene3.show(stage, stop ? "stop" : "ok");
}

/* a link with ?ref=…&last4=… (or the older &m=0917…) fills the form and looks it up */
const qs = new URLSearchParams(location.search);
if (qs.get("ref")) { ref.value = qs.get("ref").toUpperCase(); const m = (qs.get("last4") || qs.get("m") || "").replace(/\D/g, ""); l4.value = m.slice(-4); if (l4.value.length === 4) setTimeout(find, 900); }

if (W) W.intro();   /* rise out of the water as the curtain opens */
