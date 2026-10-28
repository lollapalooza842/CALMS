/* My GR8 (DRAFT), signin.html, joined to CALMS. The scene: the GR8 branch on its island in the lake. Signing in lights
   the door and the camera walks up to it; then the borrower's loan rises out of the water as a ring of stones round the
   island, one per monthly payment (gold when paid, glowing orange for the next one, red for one that is late). Before
   a loan is released, the ring has six stones instead: the six steps of the application, lit up to where it is.
   Data: /api/public/me (backend/src/routes/borrower.js): sign in with a code texted to the mobile number; then the
   borrower can answer a counter-offer, send a missing paper, or tell GR8 about a payment. Each lands on the staff's
   Website screen in CALMS, where staff check it and make the real record.
   "See a sample account" shows the made-up account below, with nothing sent anywhere. */
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


  /* the ring: one stone per item (a monthly payment, or a step of the application) */
  let stones = [];
  const C = { gold: new THREE.Color(0xf0b45a), next: new THREE.Color(0xff9a4a), late: new THREE.Color(0xe0574a), stone: new THREE.Color(0xa58c84), cool: new THREE.Color(0x9fb3c8),
    eGold: new THREE.Color(0x8a4a10), eNext: new THREE.Color(0xc04a10), eLate: new THREE.Color(0x8a1a10), black: new THREE.Color(0) };
  const stoneGeo = new THREE.OctahedronGeometry(.62, 0);
  function ring(items) {
    stones.forEach((st) => { scene.remove(st.s); st.m.dispose(); }); stones = [];
    const R = items.length > 14 ? 11.5 : 10;
    stones = items.map((it, i) => {
      const a = Math.PI * .5 + (i / items.length) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      const m = new THREE.MeshStandardMaterial({ color: 0x7a6a66, roughness: .45, metalness: .25, flatShading: true, emissive: 0x000000 });
      const s = new THREE.Mesh(stoneGeo, m); s.position.set(x, -3, z); s.scale.set(1, 1.25, 1); scene.add(s);
      const gl = glow(0xffc879, 2.6); gl.material.opacity = 0; s.add(gl);
      return { s, m, gl, i, it, base: new THREE.Vector3(x, 1.6, z), rise: 0, want: 0, hl: 0 };
    });
  }
  const tip = document.createElement("div"); tip.className = "lab3 now hide"; $("#labels").appendChild(tip); const tipAt = new THREE.Vector3(); W.label(tip, tipAt);
  let hover = -1, pinned = -1;

  /* resting views */
  const V = { gate: [new THREE.Vector3(0, 4.6, 25), new THREE.Vector3(0, 2.8, 0)], door: [new THREE.Vector3(0, 2.3, 8.2), new THREE.Vector3(0, 1.9, 0)], home: [new THREE.Vector3(9, 12.5, 21), new THREE.Vector3(0, 1.2, 0)] };
  const small = () => innerWidth <= 760;
  const view = (k) => small() ? [V[k][0].clone().multiplyScalar(k === "door" ? 1 : 1.45), V[k][1]] : V[k];
  W.place(...view("gate"));
  /* before signing in, plain stones already float round the island; signing in lights them up as payments */
  const IDLE = () => Array.from({ length: 12 }, () => ({ state: "", tip: "" }));
  function idle(delay) { ring(IDLE()); stones.forEach((st, i) => setTimeout(() => { st.want = 1; }, delay + (W.still() ? 0 : 140 * i))); }
  idle(900);

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
      const k = st.it.state, pulse = W.still() ? 1 : .75 + .25 * Math.sin(t * 2.8);
      const lit = k === "paid" || k === "done", nxt = k === "next" || k === "now", late = k === "late", stop = k === "stop";
      st.m.color.copy(lit ? C.gold : nxt ? C.next : late ? C.late : stop ? C.cool : C.stone);
      st.m.emissive.copy(lit ? C.eGold : nxt ? C.eNext : late ? C.eLate : C.black).multiplyScalar(nxt || late ? pulse : 1);
      st.gl.material.color.set(late ? 0xff6a50 : stop ? 0x9fb3c8 : 0xffc879);
      st.gl.material.opacity = st.rise * (lit ? .55 : nxt || late ? .95 * pulse : stop ? .5 : st.hl * .4); st.gl.scale.setScalar(nxt || late ? 3.4 : 2.4);
    });
    const k = hover >= 0 ? hover : pinned; if (k >= 0 && stones[k] && stones[k].rise > .5) { tipAt.copy(stones[k].s.position).y += 1.25; tip.classList.remove("hide"); } else tip.classList.add("hide");
  });
  function setTip(i) { if (!stones[i]) return; tip.innerHTML = `<i>${String(i + 1).padStart(2, "0")}</i><b>${stones[i].it.tip}</b>`; }

  /* pointing at stones */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  function pick(e) { if (!signedIn || !stones.length) return -1; ptr.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ptr, camera); const hit = ray.intersectObjects(stones.map((s) => s.s), false)[0]; return hit ? stones.findIndex((s) => s.s === hit.object) : -1; }
  addEventListener("pointermove", (e) => { if (e.target.closest && e.target.closest(".sheet, .pn, .kw, .kc")) { if (hover >= 0) { hover = -1; mark(-1); } return; } const i = pick(e); if (i !== hover) { hover = i; if (i >= 0) setTip(i); mark(i); document.body.style.cursor = i >= 0 ? "pointer" : ""; } }, { passive: true });
  addEventListener("click", (e) => { if (e.target.closest && e.target.closest(".sheet, .pn, .kw, .kc")) return; const i = pick(e); if (i >= 0) { pinned = i; setTip(i); showRow(i); } });

  function theme(night) { winM.color.set(night ? 0xffd27f : 0xffc879); winGlow.material.opacity = night ? .55 : .28; wallM.color.set(night ? 0xb3aac0 : 0xf2e2cc); grassM.color.set(night ? 0x3a4a3e : 0x75804c); treeM.color.set(night ? 0x2a3d33 : 0x3f5a3a); C.stone.set(night ? 0x7c7aa0 : 0xa58c84); }
  theme(W.dark());

  return {
    theme,
    enter(items, quick) {
      signedIn = true; stones.forEach((st) => { st.want = 0; });   /* the plain stones sink, and the borrower's rise */
      const rise = () => { ring(items); stones.forEach((st, i) => setTimeout(() => { st.want = 1; if (S && S.onRise) S.onRise(i, st.it.state); }, quick || W.still() ? 0 : 110 * i)); };
      if (quick || W.still()) { W.place(...view("home")); rise(); return; }
      W.fly(...view("door"), 1.7, () => setTimeout(() => { W.fly(...view("home"), 2.4); setTimeout(rise, 500); }, 250));
    },
    leave() { signedIn = false; pinned = hover = -1; stones.forEach((st) => { st.want = 0; }); W.fly(...view("gate"), 2.2); setTimeout(() => { if (!signedIn) idle(0); }, 1400); },
    pick(i) { pinned = i; if (i >= 0) setTip(i); }
  };
}

/* ================= the card ================= */
const vOne = $("#vOne"), vTwo = $("#vTwo"), vHome = $("#vHome"), boxes = $$(".code input");
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const day = (d) => fmt(new Date(String(d).slice(0, 10) + "T00:00:00"));
function show(v) { [vOne, vTwo, vHome].forEach((x) => { x.hidden = x !== v; }); $(".sheet-in").scrollTop = 0; }
function api(method, path, body) {
  return fetch(path, { method, credentials: "same-origin", headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
    .then((r) => r.json().catch(() => ({})).then((d) => { if (!r.ok) { const e = new Error(d.error || "Something went wrong. Try again."); e.status = r.status; throw e; } return d; }))
    .catch((e) => { if (e.message === "Failed to fetch") e.message = "We couldn't reach GR8 just now. Check your connection and try again."; throw e; });
}
let mobile = "", mode = "live";   // live (signed in for real) | sample

$("#fOne").addEventListener("submit", (e) => {
  e.preventDefault(); const m = $("#gMob"), d = m.value.replace(/[\s-]/g, ""), btn = $("#fOne button[type=submit]");
  if (!/^(\+?63|0)?9\d{9}$/.test(d)) { $("#eOne").textContent = "That doesn't look like a mobile number. Try 0917 000 0000."; m.focus(); return; }
  $("#eOne").textContent = ""; btn.disabled = true; mobile = d;
  api("POST", "/api/public/me/code", { mobile: d }).then((r) => {
    $("#sentTo").textContent = d.replace(/^(\+?63|0)?(9\d{2})(\d{3})(\d{4})$/, "0$2 ••• $4"); $("#pHint").hidden = !r.practice; $("#eTwo").textContent = "";
    show(vTwo); setTimeout(() => boxes[0].focus(), 300);
  }, (x) => { $("#eOne").textContent = x.message; }).finally(() => { btn.disabled = false; });
});
$("#back").addEventListener("click", () => { boxes.forEach((b) => { b.value = ""; }); show(vOne); $("#gMob").focus(); });
$("#sample").addEventListener("click", () => { mode = "sample"; try { sessionStorage.setItem("gr8-me", "sample"); } catch (e) {} paintSample(); });
boxes.forEach((b, i) => {
  b.addEventListener("input", () => { b.value = b.value.replace(/\D/g, "").slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); if (boxes.every((x) => x.value)) setTimeout(verify, 200); });
  b.addEventListener("keydown", (e) => { if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
  b.addEventListener("paste", (e) => { const t = (e.clipboardData.getData("text") || "").replace(/\D/g, ""); if (t.length >= 6) { e.preventDefault(); boxes.forEach((x, j) => { x.value = t[j]; }); setTimeout(verify, 200); } });
});
let verifying = false;
function verify() {
  if (verifying) return; verifying = true;
  api("POST", "/api/public/me/verify", { mobile, code: boxes.map((b) => b.value).join("") })
    .then(() => { mode = "live"; try { sessionStorage.removeItem("gr8-me"); } catch (e) {} return loadMe(false); })
    .catch((x) => { $("#eTwo").textContent = x.message; boxes.forEach((b) => { b.value = ""; }); boxes[0].focus(); })
    .finally(() => { verifying = false; });
}
$("#out").addEventListener("click", () => {
  const done = () => { boxes.forEach((b) => { b.value = ""; }); show(vOne); if (S) S.leave(); };
  try { sessionStorage.removeItem("gr8-me"); } catch (e) {}
  if (mode === "sample") { done(); return; } api("POST", "/api/public/me/out", {}).finally(done);
});

/* ---- signed in: draw what CALMS holds ---- */
let ME = null, sched = [];
function loadMe(quick) { return api("GET", "/api/public/me").then((d) => { ME = d; paint(d, quick); return d; }); }
const STEPS = ["Received", "Papers", "Review", "Approval", "Release", "Paying"];
function paint(d, quick) {
  mode = "live"; $("#mSample").hidden = true;
  $("#mHello").innerHTML = "Hello, <em>" + esc(d.name) + "</em>";
  const acct = d.accounts.find((a) => !a.closed) || d.accounts[0], apps = d.applications.filter((a) => a.status !== "funded");
  $("#mLoan").textContent = acct ? `${acct.product} · ${peso(acct.principal).replace(".00", "")} · ${acct.months} months · ${acct.number}` : apps.length ? "Your application" + (apps.length > 1 ? "s" : "") + " so far" : "Nothing here yet";
  $("#mApps").innerHTML = apps.map(appCard).join("") + (!acct && !apps.length ? '<p class="fine">We couldn\'t find a loan or an application for this number. <a href="apply.html">Apply for a loan</a>, or call the branch if you applied with another number.</p>' : "");
  wireApps();
  $("#mAcct").hidden = !acct;
  let items;
  if (acct) {
    const next = acct.next, rows = acct.rows; sched = rows.map((r) => ({ n: r.n, due: r.due, amt: r.amount, state: r.state }));
    $("#mNext").textContent = next ? peso(next.amount) : acct.overdue ? peso(acct.overdue) : "All paid";
    const days = next ? Math.ceil((new Date(next.dueOn + "T00:00:00") - new Date(new Date().toDateString())) / 864e5) : 0;
    $("#mDue").textContent = next ? day(next.dueOn) : "–"; $("#mIn").textContent = acct.overdue ? peso(acct.overdue) + " is late · " + acct.daysLate + " days" : next ? (days > 1 ? "in " + days + " days" : days === 1 ? "tomorrow" : "today") : "nothing due";
    const paid = rows.filter((r) => r.state === "paid" || r.state === "paid late").length;
    $("#mBar").innerHTML = rows.map((r, i) => `<i class="${r.state === "paid" || r.state === "paid late" ? "paid" : r.state === "next" ? "next" : r.state === "late" ? "next" : ""}" data-i="${i}"></i>`).join("");
    $("#mPaid").textContent = `${paid} of ${acct.months} payments made · ${acct.months - paid} to go`;
    $("#mBal").textContent = peso(acct.balance); $("#mSoFar").textContent = peso(acct.paidSoFar); $("#mPen").textContent = peso(acct.penalty);
    $("#mSched").innerHTML = rows.map((r, i) => `<tr data-i="${i}" class="${r.state === "next" ? "next" : ""}"><td>${String(r.n).padStart(2, "0")}</td><td>${day(r.due)}</td><td class="r">${peso(r.amount)}</td><td>${tag(r.state)}</td></tr>`).join("");
    $("#mRcpt").innerHTML = acct.receipts.map((p) => `<li><span><b>${esc(p.receipt)}</b><small>${day(p.paidOn)} · ${esc(p.channel)}</small></span><span class="r">${peso(p.amount)}</span></li>`).join("") || '<li><span><small>No payments yet.</small></span></li>';
    $("#mTold").innerHTML = acct.told.map((t) => `<p class="note">You told us about ${peso(t.amount)} by ${esc(t.channel)} on ${day(t.paidOn)}. GR8 staff will post it and your receipt will show here.</p>`).join("");
    $("#pAcct").value = acct.number; $("#pAmt").value = next ? next.amount.toFixed(2) : ""; $("#pDay").value = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); $("#pDay").max = $("#pDay").value;
    items = rows.map((r) => ({ state: r.state === "paid late" ? "paid" : r.state === "coming" ? "" : r.state, tip: `${day(r.due)} · ${peso(r.amount)} · ${r.state}` }));
  } else {
    const a = apps[0]; sched = [];
    items = STEPS.map((s, i) => ({ state: !a ? "" : i < a.stage ? "done" : i === a.stage ? (a.status === "declined" || a.status === "rejected" ? "stop" : "now") : "", tip: s + (a && i === a.stage ? " · now" : a && i < a.stage ? " · done" : "") }));
  }
  $("#mPapersTab").hidden = true; $("#mMe").innerHTML = `<li><span><b>Mobile number</b><small>${esc(d.mobile)}</small></span></li><li><span><b>Email</b><small>${esc(d.email || "–")}</small></span></li><li><span><b>Address</b><small>${esc(d.address || "–")}. To change your name, address or ID, visit the branch with your ID.</small></span></li>` +
    (d.requests.length ? `<li><span><b>What you've sent from My GR8</b><small>${d.requests.slice(0, 6).map((r) => esc(r.kind === "paper" ? "A paper: " + r.details.label : r.kind === "payment" ? "A payment of " + peso(r.details.amount) : "Your answer to an offer") + " · " + (r.status === "new" ? "being checked" : r.status === "done" ? "done" : "not acted on") + (r.note ? " · " + r.note : "")).join("<br>")}</small></span></li>` : "");
  show(vHome); wireRows();
  if (S) S.enter(items, quick);
}
function tag(s) { return s === "paid" ? '<span class="tag ok">Paid</span>' : s === "paid late" ? '<span class="tag">Paid late</span>' : s === "next" ? '<span class="tag dot">Next</span>' : s === "late" ? '<span class="tag dot">Late</span>' : '<span class="later">Coming</span>'; }
function appCard(a) {
  const stop = a.status === "declined" || a.status === "rejected", o = a.offer, missing = a.papers.filter((p) => p.state !== "on file");
  return `<section class="app-card" data-ref="${esc(a.reference)}"><span class="lbl">${esc(a.reference)} · ${esc(a.product)}</span>
    <p class="app-h">${peso(a.amount).replace(".00", "")} over ${a.months} months <span class="tag ${stop ? "cool" : "dot"}">${stop ? "Closed" : "Step " + (a.stage + 1) + " of 6 · " + STEPS[a.stage]}</span></p>
    <p class="app-n">${esc(a.note)}</p>
    ${o && o.status === "awaiting" && !o.answer ? `<div class="offer"><span class="lbl">A counter-offer for you</span><p>We can offer <b>${peso(o.amount).replace(".00", "")} over ${o.months} months</b> at ${peso(o.monthly)} a month. You'd receive ${peso(o.receive)} after the ${peso(o.fee)} fee.${o.remarks ? " " + esc(o.remarks) : ""}</p>
      ${o.sent ? `<p class="fine" style="margin-top:10px">You answered: <b>${o.sent === "accepted" ? "I'll take it" : "No, thank you"}</b>. GR8 staff will confirm it with you. <button class="plink" type="button" data-offer="${o.id}" data-ans="${o.sent === "accepted" ? "declined" : "accepted"}">Change my answer</button></p>`
        : `<div class="acts" style="margin-top:16px"><button class="pbtn sm" type="button" data-offer="${o.id}" data-ans="accepted">Take the offer</button><button class="pbtn sm ghost" type="button" data-offer="${o.id}" data-ans="declined">No, thank you</button><a class="plink" href="index.html#loans">Weigh it first</a></div>`}</div>` : ""}
    ${missing.length ? `<ul class="rows">${missing.map((p) => `<li><span><b>${esc(p.label)}</b><small>${p.state === "sent" ? "Sent. GR8 staff are checking it." : "Still needed for this application."}</small></span>${p.state === "sent" ? '<span class="tag ok">Sent</span>' : `<label class="pbtn sm">Send it<input type="file" accept=".pdf,.jpg,.jpeg,.png" data-slot="${esc(p.slot)}" hidden></label>`}</li>`).join("")}</ul>` : ""}
    <p class="err"></p></section>`;
}
function wireApps() {
  $$("#mApps [data-offer]").forEach((b) => b.addEventListener("click", () => { const card = b.closest(".app-card"); b.disabled = true;
    api("POST", "/api/public/me/offer", { offerId: +b.dataset.offer, answer: b.dataset.ans }).then(() => loadMe(true)).catch((x) => { $(".err", card).textContent = x.message; b.disabled = false; }); }));
  $$("#mApps input[type=file]").forEach((inp) => inp.addEventListener("change", () => {
    const f = inp.files[0], card = inp.closest(".app-card"), err = $(".err", card); err.textContent = ""; if (!f) return;
    if (f.size > 5 * 1024 * 1024) { err.textContent = "That file is over 5 MB. Take a smaller photo, or bring it to the branch."; return; }
    const lab = inp.parentElement; lab.firstChild.textContent = "Sending ";
    const rd = new FileReader(); rd.onload = () => { const data = String(rd.result).split(",")[1];
      api("POST", "/api/public/me/paper", { ref: card.dataset.ref, slot: inp.dataset.slot, file: { name: f.name, data } }).then(() => loadMe(true)).catch((x) => { err.textContent = x.message; lab.firstChild.textContent = "Send it"; }); };
    rd.readAsDataURL(f); }));
}
$("#fPay").addEventListener("submit", (e) => {
  e.preventDefault(); const err = $("#ePay"), btn = $("#fPay button[type=submit]"); err.textContent = "";
  if (mode === "sample") { err.textContent = "This is the sample account, so nothing is sent."; return; }
  btn.disabled = true;
  api("POST", "/api/public/me/payment", { account: $("#pAcct").value, amount: $("#pAmt").value, channel: $("#pHow").value, reference: $("#pRef").value, paidOn: $("#pDay").value })
    .then(() => { $("#fPay").hidden = true; $("#payNote").hidden = false; $("#payNote").textContent = "Thank you. GR8 staff will check it and post it; your receipt will show here."; return loadMe(true); })
    .catch((x) => { err.textContent = x.message; }).finally(() => { btn.disabled = false; });
});
$("#iPaid").addEventListener("click", () => { const f = $("#fPay"); f.hidden = !f.hidden; $("#payNote").hidden = true; if (!f.hidden) $("#pAmt").focus(); });
$$("[data-way]").forEach((b) => b.addEventListener("click", () => { const n = $("#payNote"); n.hidden = false;
  n.textContent = b.dataset.way === "gcash" ? "Pay with GCash to GR8 Lending, then press \"I've paid\" and type the GCash reference number." : b.dataset.way === "bank" ? "Deposit to GR8 Lending's bank account (the branch gives you the details), then press \"I've paid\"." : "Pay at the Malolos branch, Monday to Saturday, 8:00 to 5:00. You get a receipt there and here."; }));

/* ---- the sample account (made up, nothing sent) ---- */
function paintSample() {
  $("#mSample").hidden = false; $("#mHello").innerHTML = "Hello, <em>Maria</em>";
  $("#mLoan").textContent = `${LOAN.product} · ${peso(LOAN.amount).replace(".00", "")} · ${LOAN.term} months · ${LOAN.ref}`;
  const next = rows[paidN], days = Math.ceil((next.due - new Date(new Date().toDateString())) / 864e5);
  $("#mAcct").hidden = false; $("#mNext").textContent = peso(next.amt); $("#mDue").textContent = fmt(next.due); $("#mIn").textContent = days > 1 ? "in " + days + " days" : days === 1 ? "tomorrow" : "today";
  $("#mBar").innerHTML = rows.map((r, i) => `<i class="${i < paidN ? "paid" : i === paidN ? "next" : ""}" data-i="${i}"></i>`).join("");
  $("#mPaid").textContent = `${paidN} of ${LOAN.term} payments made · ${LOAN.term - paidN} to go`;
  $("#mBal").textContent = peso(rows[paidN - 1].bal); $("#mSoFar").textContent = peso(rows.slice(0, paidN).reduce((s, r) => s + r.amt, 0) + penalty); $("#mPen").textContent = peso(penalty);
  $("#mSched").innerHTML = rows.map((r, i) => `<tr data-i="${i}" class="${i === paidN ? "next" : ""}"><td>${String(r.n).padStart(2, "0")}</td><td>${fmt(r.due)}</td><td class="r">${peso(r.amt)}</td><td>${tag(i < paidN ? (late[i] ? "paid late" : "paid") : i === paidN ? "next" : "coming")}</td></tr>`).join("");
  $("#mRcpt").innerHTML = LOAN.paid.map((p, i) => ({ p, i })).reverse().map(({ p, i }) => `<li><span><b>OR-2026-${5120 + i * 37}</b><small>${fmt(new Date(p[0] + "T00:00:00"))} · ${p[1]}</small></span><span class="r">${peso(rows[i].amt + (late[i] ? R(rows[i].amt * .03) : 0))}</span></li>`).join("");
  $("#mTold").innerHTML = ""; $("#mApps").innerHTML = ""; $("#mPapersTab").hidden = true;
  $("#mMe").innerHTML = '<li><span><b>Mobile number</b><small>0917 ••• 4567</small></span></li><li><span><b>Email</b><small>maria.s••••@gmail.com</small></span></li>';
  show(vHome); wireRows();
  if (S) S.enter(rows.map((r, i) => ({ state: i < paidN ? "paid" : i === paidN ? "next" : "", tip: `${fmt(r.due)} · ${peso(r.amt)}` })), false);
}

function wireRows() { $$("#mSched tr").forEach((tr) => { tr.addEventListener("pointerenter", () => { if (S) S.pick(+tr.dataset.i); mark(+tr.dataset.i); }); tr.addEventListener("pointerleave", () => { if (S) S.pick(-1); mark(-1); }); }); }
function mark(i) { $$("#mSched tr").forEach((tr) => tr.classList.toggle("hl", +tr.dataset.i === i)); $$("#mBar i").forEach((b) => b.classList.toggle("hl", +b.dataset.i === i)); }
function showRow(i) { $$(".tabs button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === "sched"))); $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== "sched"; });
  const tr = $(`#mSched tr[data-i="${i}"]`); if (tr) { mark(i); tr.scrollIntoView({ block: "center", behavior: "smooth" }); } }
$$(".tabs button").forEach((t) => t.addEventListener("click", () => { $$(".tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === t))); $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; }); }));

/* opening the page: still signed in from earlier in this visit? */
let wasSample = false; try { wasSample = sessionStorage.getItem("gr8-me") === "sample"; } catch (e) {}
if (wasSample) { mode = "sample"; paintSample(); }
else api("GET", "/api/public/me").then((d) => { ME = d; paint(d, true); }, () => {});
if (W) W.intro();   /* rise out of the water as the curtain opens */
if (S && W) S.onRise = (i, state) => { if (state) W.sound.ping(i, state === "stop" ? "stop" : ""); };   /* a soft note for each payment or step that lights up */
