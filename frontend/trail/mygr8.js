/* My GR8 (DRAFT), signin.html. The scene: the GR8 branch on its island in the lake at dusk. Signing in lights the
   door and the camera walks up to it; then the borrower's loan rises out of the water as a ring of stones round the
   island, one per monthly payment: gold when paid, a glowing orange one for the next payment, plain stone for the rest.
   Pointing at a stone (or a row of the schedule) picks out that payment in both places.
   Borrower sign-in is not on the server yet: any 6 digits open the SAMPLE account below, worked out with the same
   arithmetic as CALMS (lib/loans.js, diminishing balance), and nothing is sent anywhere. */
import { makeWorld, glow } from "./portal3d.js";

const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const R = (n) => Math.round(n * 100) / 100;
const fmt = (d) => d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });

/* ---- the sample loan ---- */
const LOAN = { ref: "LN-2026-0187", product: "Personal loan", amount: 60000, term: 12, rate: .018, released: "2026-06-05", paid: [["2026-07-04", "GCash"], ["2026-08-05", "Cash at the branch"], ["2026-09-12", "GCash"], ["2026-10-03", "Bank deposit"]] };
const rows = []; { const m = LOAN.amount * LOAN.rate / (1 - Math.pow(1 + LOAN.rate, -LOAN.term)), d0 = new Date(LOAN.released + "T00:00:00"); let bal = LOAN.amount;
  for (let n = 1; n <= LOAN.term; n++) { const due = new Date(d0.getFullYear(), d0.getMonth() + n, Math.min(d0.getDate(), 28)), interest = R(bal * LOAN.rate), principal = n === LOAN.term ? R(bal) : R(m - interest);
    bal = R(bal - principal); rows.push({ n, due, principal, interest, amt: R(principal + interest), bal }); } }
const paidN = LOAN.paid.length, late = rows.map((r, i) => i < paidN && new Date(LOAN.paid[i][0] + "T00:00:00") > r.due), penalty = rows.reduce((s, r, i) => s + (late[i] ? R(r.amt * .03) : 0), 0);

/* ================= the scene ================= */
let S = null;
const W = makeWorld(document.getElementById("gl"), { shift: .2, onTheme: (n) => S && S.theme(n) });
if (W) S = build(W);

function build(W) {
  const { THREE, scene, camera } = W;
  const isl = new THREE.Group(); scene.add(isl);
  const earthM = new THREE.MeshLambertMaterial({ color: 0x5f4a3a, flatShading: true }), grassM = new THREE.MeshLambertMaterial({ color: 0x75804c, flatShading: true });
  const earth = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.4, 1.6, 11), earthM); earth.position.y = -.4; isl.add(earth);
  const grass = new THREE.Mesh(new THREE.CylinderGeometry(6.25, 6.25, .24, 11), grassM); grass.position.y = .5; isl.add(grass);
  /* the branch */
  const wallM = new THREE.MeshLambertMaterial({ color: 0xf2e2cc, flatShading: true }), roofM = new THREE.MeshLambertMaterial({ color: 0xa8482c, flatShading: true }), trimM = new THREE.MeshLambertMaterial({ color: 0x5a3424, flatShading: true });
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3, 3.8), wallM); body.position.y = 2.1; isl.add(body);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.4, 2, 4), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .8); roof.position.y = 4.6; isl.add(roof);
  const step = new THREE.Mesh(new THREE.BoxGeometry(1.8, .2, .8), trimM); step.position.set(0, .7, 2.2); isl.add(step);
  const winM = new THREE.MeshBasicMaterial({ color: 0xffc879 });
  [-1.65, 1.65].forEach((x) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(.95, .95), winM); w.position.set(x, 2.45, 1.91); isl.add(w); const f = new THREE.Mesh(new THREE.BoxGeometry(1.1, .1, .12), trimM); f.position.set(x, 1.92, 1.95); isl.add(f); });
  const doorM = new THREE.MeshBasicMaterial({ color: 0x6b3a22 }); const door = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.75), doorM); door.position.set(0, 1.5, 1.915); isl.add(door);
  /* the sign over the door, drawn on a small canvas */
  const sc = document.createElement("canvas"); sc.width = 512; sc.height = 128; const g = sc.getContext("2d");
  g.fillStyle = "#3b2116"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#ffe6c4"; g.font = "64px 'Instrument Serif', Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("GR8 Lending", 256, 68);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, .65), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc) })); sign.position.set(0, 3.25, 1.93); isl.add(sign);
  document.fonts && document.fonts.ready.then(() => { g.fillStyle = "#3b2116"; g.fillRect(0, 0, 512, 128); g.fillStyle = "#ffe6c4"; g.fillText("GR8 Lending", 256, 68); sign.material.map.needsUpdate = true; });
  const doorGlow = glow(0xffc879, 4); doorGlow.position.set(0, 1.5, 2.3); doorGlow.material.opacity = 0; isl.add(doorGlow);
  const winGlow = glow(0xffc879, 9); winGlow.position.set(0, 2.4, 2.4); winGlow.material.opacity = .28; isl.add(winGlow);
  const treeM = new THREE.MeshLambertMaterial({ color: 0x3f5a3a, flatShading: true });
  [[-4.2, -.5, 1.2], [4.4, -1.4, 1], [-3, -3.4, .8], [3.2, 3.2, .7]].forEach(([x, z, s]) => { const t = new THREE.Mesh(new THREE.ConeGeometry(.95 * s, 3.2 * s, 6), treeM); t.position.set(x, .6 + 1.6 * s, z); isl.add(t); });
  /* lamps by the path */
  [-1.3, 1.3].forEach((x) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, 1.3, 6), trimM); p.position.set(x, 1.25, 3.4); isl.add(p); const l = glow(0xffd59a, 1.3); l.position.set(x, 1.95, 3.4); isl.add(l); });

  /* the ring of payments */
  const stones = rows.map((r, i) => {
    const a = Math.PI * .5 + (i / rows.length) * Math.PI * 2, x = Math.cos(a) * 10, z = Math.sin(a) * 10;
    const m = new THREE.MeshStandardMaterial({ color: 0x7a6a66, roughness: .45, metalness: .25, flatShading: true, emissive: 0x000000 });
    const s = new THREE.Mesh(new THREE.OctahedronGeometry(.62, 0), m); s.position.set(x, -3, z); s.scale.set(1, 1.25, 1); scene.add(s);
    const gl = glow(0xffc879, 2.6); gl.material.opacity = 0; s.add(gl);
    return { s, m, gl, i, base: new THREE.Vector3(x, 1.6, z), rise: 0, want: 0, hl: 0 };
  });
  const tip = document.createElement("div"); tip.className = "lab3 now hide"; $("#labels").appendChild(tip); const tipAt = new THREE.Vector3(); W.label(tip, tipAt);
  let hover = -1, pinned = -1;

  /* resting views */
  const V = { gate: [new THREE.Vector3(0, 4.6, 25), new THREE.Vector3(0, 2.8, 0)], door: [new THREE.Vector3(0, 2.3, 8.2), new THREE.Vector3(0, 1.9, 0)], home: [new THREE.Vector3(9, 12.5, 21), new THREE.Vector3(0, 1.2, 0)] };
  const small = () => innerWidth <= 760;
  const view = (k) => small() ? [V[k][0].clone().multiplyScalar(k === "door" ? 1 : 1.45), V[k][1]] : V[k];
  W.place(...view("gate"));

  const C = { gold: new THREE.Color(0xf0b45a), next: new THREE.Color(0xff9a4a), stone: new THREE.Color(0x7a6a66), eGold: new THREE.Color(0x8a4a10), eNext: new THREE.Color(0xc04a10), black: new THREE.Color(0) };
  let signedIn = false, doorK = 0;
  W.onFrame((dt, t) => {
    doorK += ((signedIn ? 1 : 0) - doorK) * Math.min(1, dt * 2.2);
    doorM.color.setRGB(.42 + doorK * .58, .23 + doorK * .62, .13 + doorK * .4); doorGlow.material.opacity = doorK * .9;
    stones.forEach((st) => {
      st.rise += (st.want - st.rise) * Math.min(1, dt * 2.4);
      const bob = W.still() ? 0 : Math.sin(t * 1.1 + st.i) * .14;
      st.s.position.set(st.base.x, -3 + (st.base.y + 3) * st.rise + bob * st.rise, st.base.z);
      if (!W.still()) st.s.rotation.y += dt * (.25 + st.i * .01);
      const on = st.i === hover || st.i === pinned; st.hl += ((on ? 1 : 0) - st.hl) * Math.min(1, dt * 8);
      st.s.scale.set(1 + st.hl * .35, (1 + st.hl * .35) * 1.25, 1 + st.hl * .35);
      const isPaid = st.i < paidN, isNext = st.i === paidN, pulse = W.still() ? 1 : .75 + .25 * Math.sin(t * 2.8);
      st.m.color.copy(isPaid ? C.gold : isNext ? C.next : C.stone); st.m.emissive.copy(isPaid ? C.eGold : isNext ? C.eNext : C.black).multiplyScalar(isNext ? pulse : 1);
      st.gl.material.opacity = st.rise * (isPaid ? .55 : isNext ? .95 * pulse : st.hl * .4); st.gl.scale.setScalar(isNext ? 3.4 : 2.4);
    });
    const k = hover >= 0 ? hover : pinned; if (k >= 0 && stones[k].rise > .5) { tipAt.copy(stones[k].s.position).y += 1.25; tip.classList.remove("hide"); } else tip.classList.add("hide");
  });
  function setTip(i) { const r = rows[i]; tip.innerHTML = `<i>${String(i + 1).padStart(2, "0")}</i><b>${fmt(r.due)} · ${peso(r.amt)}${i < paidN ? " · paid" : i === paidN ? " · next" : ""}</b>`; }

  /* pointing at stones */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(e) { if (!signedIn) return -1; ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(stones.map((s) => s.s), false)[0]; return hit ? stones.findIndex((s) => s.s === hit.object) : -1; }
  addEventListener("pointermove", (e) => { if (e.target.closest && e.target.closest(".sheet, .pn, .kw, .kc")) { if (hover >= 0) { hover = -1; mark(-1); } return; } const i = pick(e); if (i !== hover) { hover = i; if (i >= 0) setTip(i); mark(i); document.body.style.cursor = i >= 0 ? "pointer" : ""; } }, { passive: true });
  addEventListener("click", (e) => { if (e.target.closest && e.target.closest(".sheet, .pn, .kw, .kc")) return; const i = pick(e); if (i >= 0) { pinned = i; setTip(i); showRow(i); } });

  function theme(night) { winM.color.set(night ? 0xffd27f : 0xffc879); winGlow.material.opacity = night ? .55 : .28; wallM.color.set(night ? 0x9a90a0 : 0xf2e2cc); grassM.color.set(night ? 0x2e3a2e : 0x75804c); treeM.color.set(night ? 0x1f2d24 : 0x3f5a3a); C.stone.set(night ? 0x3d3a4c : 0x7a6a66); }
  theme(W.dark());

  return {
    theme,
    enter(quick) {
      signedIn = true;
      const rise = () => stones.forEach((st, i) => setTimeout(() => { st.want = 1; }, quick || W.still() ? 0 : 120 * i));
      if (quick || W.still()) { W.place(...view("home")); rise(); return; }
      W.fly(...view("door"), 1.7, () => setTimeout(() => { W.fly(...view("home"), 2.4); setTimeout(rise, 500); }, 250));
    },
    leave() { signedIn = false; pinned = hover = -1; stones.forEach((st) => { st.want = 0; }); W.fly(...view("gate"), 2.2); },
    pick(i) { pinned = i; if (i >= 0) setTip(i); }
  };
}

/* ================= the card ================= */
const vOne = $("#vOne"), vTwo = $("#vTwo"), vHome = $("#vHome"), boxes = $$(".code input");
function show(v) { [vOne, vTwo, vHome].forEach((x) => { x.hidden = x !== v; }); $(".sheet-in").scrollTop = 0; }
$("#fOne").addEventListener("submit", (e) => {
  e.preventDefault(); const m = $("#gMob"), d = m.value.replace(/[\s-]/g, "");
  if (!/^(\+?63|0)?9\d{9}$/.test(d)) { $("#eOne").textContent = "That doesn't look like a mobile number. Try 0917 000 0000."; m.focus(); return; }
  $("#eOne").textContent = ""; $("#sentTo").textContent = d.replace(/^(\+?63|0)?(9\d{2})(\d{3})(\d{4})$/, "0$2 ••• $4"); show(vTwo); setTimeout(() => boxes[0].focus(), 300);
});
$("#back").addEventListener("click", () => { boxes.forEach((b) => { b.value = ""; }); show(vOne); $("#gMob").focus(); });
boxes.forEach((b, i) => {
  b.addEventListener("input", () => { b.value = b.value.replace(/\D/g, "").slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); if (boxes.every((x) => x.value)) setTimeout(signIn, 250); });
  b.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
  b.addEventListener("paste", (e) => { const t = (e.clipboardData.getData("text") || "").replace(/\D/g, ""); if (t.length >= 6) { e.preventDefault(); boxes.forEach((x, j) => { x.value = t[j]; }); setTimeout(signIn, 250); } });
});
function signIn(quick) {
  try { sessionStorage.setItem("gr8-me", "sample"); } catch (e) {}
  fill(); show(vHome); if (S) S.enter(quick === true);
}
$("#out").addEventListener("click", () => { try { sessionStorage.removeItem("gr8-me"); } catch (e) {} boxes.forEach((b) => { b.value = ""; }); show(vOne); if (S) S.leave(); });

/* ---- the numbers ---- */
let filled = false;
function fill() {
  if (filled) return; filled = true;
  const next = rows[paidN], days = Math.ceil((next.due - new Date(new Date().toDateString())) / 864e5);
  $("#mLoan").textContent = `${LOAN.product} · ${peso(LOAN.amount).replace(".00", "")} · ${LOAN.term} months · ${LOAN.ref}`;
  $("#mNext").textContent = peso(next.amt); $("#mDue").textContent = fmt(next.due); $("#mIn").textContent = days > 1 ? "in " + days + " days" : days === 1 ? "tomorrow" : days === 0 ? "today" : Math.abs(days) + " days late";
  $("#mBar").innerHTML = rows.map((r, i) => `<i class="${i < paidN ? "paid" : i === paidN ? "next" : ""}" data-i="${i}"></i>`).join("");
  $("#mPaid").textContent = `${paidN} of ${LOAN.term} payments made · ${LOAN.term - paidN} to go`;
  $("#mBal").textContent = peso(rows[paidN - 1].bal); $("#mSoFar").textContent = peso(rows.slice(0, paidN).reduce((s, r) => s + r.amt, 0) + penalty); $("#mPen").textContent = peso(penalty);
  $("#mSched").innerHTML = rows.map((r, i) => `<tr data-i="${i}" class="${i === paidN ? "next" : ""}"><td>${String(r.n).padStart(2, "0")}</td><td>${fmt(r.due)}</td><td class="r">${peso(r.amt)}</td><td>${i < paidN ? (late[i] ? '<span class="tag">Paid late</span>' : '<span class="tag ok">Paid</span>') : i === paidN ? '<span class="tag dot">Next</span>' : '<span class="later">Coming</span>'}</td></tr>`).join("");
  $("#mRcpt").innerHTML = LOAN.paid.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => `<li><span><b>OR-2026-${5120 + i * 37}</b><small>${fmt(new Date(p[0] + "T00:00:00"))} · ${p[1]} · payment ${i + 1} of ${LOAN.term}${late[i] ? " · incl. " + peso(R(rows[i].amt * .03)) + " late penalty" : ""}</small></span><span class="r">${peso(rows[i].amt + (late[i] ? R(rows[i].amt * .03) : 0))}</span></li>`).join("");
  $$("#mSched tr").forEach((tr) => { tr.addEventListener("pointerenter", () => { if (S) S.pick(+tr.dataset.i); mark(+tr.dataset.i); }); tr.addEventListener("pointerleave", () => { if (S) S.pick(-1); mark(-1); }); });
}
function mark(i) { $$("#mSched tr").forEach((tr) => tr.classList.toggle("hl", +tr.dataset.i === i)); $$("#mBar i").forEach((b) => b.classList.toggle("hl", +b.dataset.i === i)); }
function showRow(i) { $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === "sched"))); $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== "sched"; });
  const tr = $(`#mSched tr[data-i="${i}"]`); if (tr) { mark(i); tr.scrollIntoView({ block: "center", behavior: "smooth" }); } }

$$(".tabs button").forEach((t) => t.addEventListener("click", () => { $$(".tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === t))); $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; }); }));
$$("[data-pay]").forEach((b) => b.addEventListener("click", () => { const n = $("#payNote"); n.hidden = false; n.textContent = "This is a sample account, so nothing is paid or sent. When My GR8 goes live, this opens the real payment."; }));
$$("[data-answer]").forEach((b) => b.addEventListener("click", () => { const yes = b.dataset.answer === "yes";
  $("#mOffer").innerHTML = `<span class="lbl">${yes ? "Offer taken (sample)" : "Offer turned down (sample)"}</span><p>${yes ? "We'd prepare your agreement and text you when it's ready to sign." : "No cost to you. This application would be closed, and you can apply again anytime."}</p>`; }));

/* already signed in during this visit: straight to the loan */
try { if (sessionStorage.getItem("gr8-me") === "sample") signIn(true); } catch (e) {}
