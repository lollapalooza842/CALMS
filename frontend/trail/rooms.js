/* The two indoor rooms of the GR8 world (DRAFT), reached from the top links with a smoke transition (scene.js):
   - LOANS: a dark round hall. A ring of glowing cards stands on a reflective floor under a ceiling of light bars:
     each card is one thing to know about borrowing from GR8 (the loans themselves, read live from CALMS; how a loan
     moves through CALMS; what to bring; the fair rules). Drag or scroll to turn the ring; click a card to read it.
   - ABOUT: the GR8 branch after hours. A long counter-table with CALMS open on laptops, chairs, curved shelves of
     ledgers and plants, a big glowing "8" ring on the wall and the letters G R 8 lying on the floor. The camera is
     driven by scrolling: it travels a smooth path from a wide view of the hall to a close angle at the table.
   makeRooms(ctx) -> { show(name|null), update(dt, time, mx, my), cards, focus(i), ... } */
export function makeRooms({ THREE, scene, camera, renderer, Reflector, small, rnd, DPR }) {
  const C = (h) => new THREE.Color(h);
  const roomFog = new THREE.Fog(0x120a0a, 18, 70);

  /* ======================= LOANS ======================= */
  const LO = new THREE.Vector3(0, 0, -1600), loans = new THREE.Group(); loans.position.copy(LO); loans.visible = false; scene.add(loans);
  loans.add(new THREE.HemisphereLight(0x8a5a6a, 0x120808, .55));
  const loLight = new THREE.PointLight(0xffa860, 40, 40, 1.4); loLight.position.set(0, 9, 0); loans.add(loLight);
  /* floor: a dark mirror, so the cards are reflected like the reference */
  const loFloor = new Reflector(new THREE.CircleGeometry(60, 48), { textureWidth: innerWidth * DPR * .5, textureHeight: innerHeight * DPR * .5, color: 0x3a2a2c, clipBias: .003 });
  loFloor.rotation.x = -Math.PI / 2; loans.add(loFloor);
  const dim = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshBasicMaterial({ color: 0x0c0606, transparent: true, opacity: .55, depthWrite: false })); dim.rotation.x = -Math.PI / 2; dim.position.y = .01; loans.add(dim);
  /* walls and a ceiling grid of light bars */
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 30, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0x0a0505, side: THREE.BackSide })); wall.position.y = 14; loans.add(wall);
  const barM = new THREE.MeshBasicMaterial({ color: 0x4a2a22 });
  for (let i = -6; i <= 6; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, 80), barM); b.position.set(i * 5, 16, 0); loans.add(b); const c = b.clone(); c.rotation.y = Math.PI / 2; c.position.set(0, 16, i * 5); loans.add(c); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(.25, .25, 80), new THREE.MeshBasicMaterial({ color: 0xff9a50 })); beam.position.set(0, 15.9, 0); loans.add(beam);
  /* stars of dust in the dark */
  { const n = 500, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = rnd(-38, 38); p[i * 3 + 1] = rnd(1, 15); p[i * 3 + 2] = rnd(-38, 38); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); loans.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd0a0, size: .06, transparent: true, opacity: .6, depthWrite: false }))); }
  /* the ring: a glowing rim on the floor, and the cards standing on it */
  const R = 13, rim = new THREE.Mesh(new THREE.TorusGeometry(R, .06, 8, 160), new THREE.MeshBasicMaterial({ color: 0xff8a40 })); rim.rotation.x = Math.PI / 2; rim.position.y = .05; loans.add(rim);
  const rimGlow = new THREE.Mesh(new THREE.RingGeometry(R - .7, R + .7, 160), new THREE.MeshBasicMaterial({ color: 0xff7a30, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false })); rimGlow.rotation.x = -Math.PI / 2; rimGlow.position.y = .03; loans.add(rimGlow);
  const ring = new THREE.Group(); loans.add(ring);

  const peso = (n) => "₱" + Math.round(n).toLocaleString("en-PH");
  const CARDS = [
    { cat: "Loans", kind: "loan", title: "Salary loan", tag: "FOR THE EMPLOYED", lines: ["₱10,000 – ₱200,000", "6 to 24 months"], body: "For people with a steady job. You pay the same amount every month, straight from what you earn.", icon: "coin" },
    { cat: "Loans", kind: "loan", title: "Personal loan", tag: "FOR LIFE'S BIG MOMENTS", lines: ["₱10,000 – ₱150,000", "6 to 18 months"], body: "School fees, a home repair, a hospital bill. Tell us what it's for and we'll find a term you can carry.", icon: "house" },
    { cat: "Loans", kind: "loan", title: "SME loan", tag: "FOR YOUR BUSINESS", lines: ["₱50,000 – ₱1,000,000", "12 to 36 months"], body: "Stock, equipment or working capital for a small business. We look at how your business earns, not only at payslips.", icon: "shop" },
    { cat: "How it works", title: "01  Apply", tag: "ABOUT TEN MINUTES", lines: ["Online, or at the branch"], body: "Pick a loan, an amount and a term. You see the whole cost before you send anything.", icon: "pen" },
    { cat: "How it works", title: "02  Papers", tag: "WE CHECK THEM", lines: ["ID, income, address"], body: "A loan processor checks your papers in CALMS and tells you right away if something is missing.", icon: "doc" },
    { cat: "How it works", title: "03  Review", tag: "A REAL PERSON", lines: ["Credit and capacity"], body: "An underwriter looks at what you earn and what you already owe, so the loan never weighs too much.", icon: "eye" },
    { cat: "How it works", title: "04  Approval", tag: "TWO SETS OF EYES", lines: ["Approved, adjusted or declined"], body: "An approver signs off. If the amount changes, you see the new numbers before you sign anything.", icon: "check" },
    { cat: "How it works", title: "05  Release", tag: "CASH OR BANK", lines: ["Same day once signed"], body: "The money is released and your schedule is set. CALMS sends you each due date ahead of time.", icon: "coin" },
    { cat: "How it works", title: "06  Pay", tag: "EVERY PESO COUNTED", lines: ["At the branch or online"], body: "Every payment is posted to your account right away. You can see your balance in My GR8.", icon: "chart" },
    { cat: "What to bring", title: "A valid ID", tag: "ONE IS ENOUGH", lines: ["PhilSys, SSS, UMID, driver's"], body: "Any one government ID with your photo. Bring the original; we take a copy.", icon: "id" },
    { cat: "What to bring", title: "Proof of income", tag: "PAYSLIPS OR ITR", lines: ["Last 3 months"], body: "Payslips or a certificate of employment. Running a business? Your ITR or sales records.", icon: "doc" },
    { cat: "What to bring", title: "Proof of address", tag: "A RECENT BILL", lines: ["Electric, water or internet"], body: "A bill from the last three months with your name and address on it.", icon: "house" },
    { cat: "Fair rules", title: "No hidden fees", tag: "SEE IT ALL FIRST", lines: ["Fee shown before you sign"], body: "The processing fee is taken from the release and shown up front. Nothing gets added later.", icon: "eye" },
    { cat: "Fair rules", title: "Pay early, pay less", tag: "NO PENALTY", lines: ["Settle any time"], body: "Paying off your loan early is always allowed, and you only pay interest for the time you used.", icon: "chart" },
    { cat: "Fair rules", title: "Late? We'll talk", tag: "BEFORE ANY PENALTY", lines: ["Penalty rate shown up front"], body: "If you miss a due date we reach out first. The late penalty is written in your agreement from day one.", icon: "check" },
    { cat: "Fair rules", title: "Your data, kept", tag: "PRIVACY", lines: ["Used only for your loan"], body: "What you give us stays in CALMS, seen only by the people working on your loan.", icon: "id" }
  ];
  /* draw one card: dark glass, a warm glow from inside, a big serif title, a mono tag and a simple line icon */
  function drawCard(cd, hot) {
    const W = 512, H = 720, c = cd.canvas || (cd.canvas = document.createElement("canvas")); c.width = W; c.height = H; const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, hot ? "#3a1c12" : "#22110c"); bg.addColorStop(1, hot ? "#1a0b07" : "#100806"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W * .5, H * .42, 10, W * .5, H * .42, 300); rg.addColorStop(0, hot ? "rgba(255,150,70,.45)" : "rgba(255,140,60,.22)"); rg.addColorStop(1, "rgba(255,120,40,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y += 4) { g.fillStyle = "rgba(255,200,150,.025)"; g.fillRect(0, y, W, 1); }   /* faint scan lines, like a screen */
    g.strokeStyle = "rgba(255,220,180,.9)"; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round"; const cx = W / 2, cy = 300; g.beginPath();
    ({ coin: () => { for (let k = 0; k < 4; k++) { g.ellipse(cx, cy + 40 - k * 26, 80, 24, 0, 0, 6.3); } g.moveTo(cx - 80, cy - 38); },
       house: () => { g.moveTo(cx - 90, cy); g.lineTo(cx, cy - 80); g.lineTo(cx + 90, cy); g.moveTo(cx - 66, cy - 18); g.lineTo(cx - 66, cy + 70); g.lineTo(cx + 66, cy + 70); g.lineTo(cx + 66, cy - 18); g.moveTo(cx - 18, cy + 70); g.lineTo(cx - 18, cy + 20); g.lineTo(cx + 18, cy + 20); g.lineTo(cx + 18, cy + 70); },
       shop: () => { g.rect(cx - 90, cy - 20, 180, 90); g.moveTo(cx - 100, cy - 20); g.lineTo(cx - 80, cy - 70); g.lineTo(cx + 80, cy - 70); g.lineTo(cx + 100, cy - 20); g.rect(cx - 25, cy + 20, 50, 50); },
       pen: () => { g.moveTo(cx - 70, cy + 70); g.lineTo(cx + 60, cy - 60); g.lineTo(cx + 80, cy - 40); g.lineTo(cx - 50, cy + 90); g.closePath(); g.moveTo(cx - 90, cy + 90); g.lineTo(cx + 90, cy + 90); },
       doc: () => { g.rect(cx - 65, cy - 85, 130, 170); for (let k = 0; k < 4; k++) { g.moveTo(cx - 40, cy - 45 + k * 32); g.lineTo(cx + 40, cy - 45 + k * 32); } },
       eye: () => { g.moveTo(cx - 100, cy); g.quadraticCurveTo(cx, cy - 90, cx + 100, cy); g.quadraticCurveTo(cx, cy + 90, cx - 100, cy); g.moveTo(cx + 30, cy); g.arc(cx, cy, 30, 0, 6.3); },
       check: () => { g.arc(cx, cy, 85, 0, 6.3); g.moveTo(cx - 40, cy); g.lineTo(cx - 8, cy + 32); g.lineTo(cx + 45, cy - 30); },
       chart: () => { g.moveTo(cx - 90, cy + 80); g.lineTo(cx + 90, cy + 80); [[-60, 40], [-20, 80], [20, 60], [60, 120]].forEach(([x, h]) => g.rect(cx + x - 14, cy + 80 - h, 28, h)); },
       id: () => { g.rect(cx - 100, cy - 65, 200, 130); g.moveTo(cx - 25, cy - 20); g.arc(cx - 50, cy - 20, 25, 0, 6.3); g.moveTo(cx + 5, cy - 25); g.lineTo(cx + 75, cy - 25); g.moveTo(cx + 5, cy + 10); g.lineTo(cx + 60, cy + 10); g.moveTo(cx - 80, cy + 40); g.lineTo(cx - 20, cy + 40); }
    }[cd.icon] || (() => {}))(); g.stroke();
    g.fillStyle = "rgba(255,210,170,.7)"; g.font = "500 22px 'IBM Plex Mono', monospace"; g.fillText(cd.tag || "", 40, 470);
    g.fillStyle = "#fff4ea"; g.font = "400 62px 'Instrument Serif', Georgia, serif"; const words = cd.title.split(" "); let line = "", y = 540;
    words.forEach((w) => { const t = line ? line + " " + w : w; if (g.measureText(t).width > W - 80) { g.fillText(line, 40, y); line = w; y += 62; } else line = t; }); g.fillText(line, 40, y);
    g.fillStyle = "rgba(255,230,205,.75)"; g.font = "400 26px 'Instrument Sans', system-ui, sans-serif"; (cd.lines || []).forEach((l, k) => g.fillText(l, 40, y + 50 + k * 34));
    if (cd.tex) cd.tex.needsUpdate = true;
  }
  const cardGeo = new THREE.PlaneGeometry(3.4, 4.8), frameGeo = new THREE.PlaneGeometry(3.7, 5.1);
  CARDS.forEach((cd, i) => {
    drawCard(cd, false); cd.tex = new THREE.CanvasTexture(cd.canvas); cd.tex.colorSpace = THREE.SRGBColorSpace; cd.tex.anisotropy = 4;
    const grp = new THREE.Group(), a = (i / CARDS.length) * Math.PI * 2;
    grp.position.set(Math.sin(a) * R, 2.75, -Math.cos(a) * R); grp.lookAt(0, 2.75, 0);
    const glowM = new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: .35, blending: THREE.AdditiveBlending, depthWrite: false });
    const frame = new THREE.Mesh(frameGeo, glowM); frame.position.z = -.02; grp.add(frame);
    const face = new THREE.Mesh(cardGeo, new THREE.MeshBasicMaterial({ map: cd.tex, toneMapped: false })); face.userData.card = i; grp.add(face);
    cd.grp = grp; cd.face = face; cd.glow = glowM; cd.a = a; ring.add(grp);
  });
  /* the loan cards take their real numbers from CALMS when it answers */
  fetch("/api/public/talk").then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j || !j.products || !j.products.length) return; const loanCards = CARDS.filter((c) => c.kind === "loan");
    j.products.forEach((p) => { const kind = String(p.name).split(" ")[0].toLowerCase(), cd = loanCards.filter((c) => c.title.split(" ")[0].toLowerCase() === kind)[0]; if (!cd) return; cd.title = p.name; const m = (p.months || []).slice().sort((x, y) => x - y);
      cd.lines = [peso(p.min) + " – " + peso(p.max), m.length ? m[0] + " to " + m[m.length - 1] + " months" : "", p.rate ? (p.rate * 100).toFixed(1) + "% a month" : ""].filter(Boolean); drawCard(cd, cd.hot); });
  }).catch(() => {});
  let turn = 0, turnT = 0, focusI = 0, filterCat = "All", idle = 0;
  const step = (Math.PI * 2) / CARDS.length;
  function focus(i) { idle = 0; focusI = ((i % CARDS.length) + CARDS.length) % CARDS.length; turnT = CARDS[focusI].a; while (turnT - turn > Math.PI) turnT -= Math.PI * 2; while (turn - turnT > Math.PI) turnT += Math.PI * 2; }
  function nudge(d) { if (zoomI >= 0) return; turnT += d; idle = 0; }
  /* entering a card: the camera glides up to it until it fills the screen (stage.js then opens that card's page) */
  let zoomI = -1, zoomK = 0, zoomV = 0; const zPos = new THREE.Vector3(), zLook = new THREE.Vector3(), zDir = new THREE.Vector3(), basePos = new THREE.Vector3(), baseLook = new THREE.Vector3();
  function zoom(i) { if (i >= 0) { focus(i); zoomI = i; zoomK = 1; } else zoomK = 0; }
  /* the art for a card's own page: the card standing on a dark plinth in raking window light, like a product shot */
  function hero(i) {
    const cd = CARDS[i], W = 1000, H = 1320, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#2a160e"); bg.addColorStop(.55, "#140a07"); bg.addColorStop(1, "#0a0504"); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.save(); g.translate(W * .1, -H * .1); g.rotate(-.5); for (let k = 0; k < 4; k++) { const lg = g.createLinearGradient(0, 0, 220, 0); lg.addColorStop(0, "rgba(255,190,130,0)"); lg.addColorStop(.5, "rgba(255,190,130,.09)"); lg.addColorStop(1, "rgba(255,190,130,0)"); g.fillStyle = lg; g.fillRect(k * 330, -200, 220, 1900); } g.restore();
    /* the plinth */
    const px = W * .2, pw = W * .6, py = H * .74; const pg = g.createLinearGradient(0, py, 0, H); pg.addColorStop(0, "#2c1a14"); pg.addColorStop(1, "#0c0605"); g.fillStyle = pg; g.fillRect(px, py, pw, H - py);
    g.fillStyle = "#3a2419"; g.beginPath(); g.moveTo(px, py); g.lineTo(px + pw, py); g.lineTo(px + pw - 40, py - 46); g.lineTo(px + 40, py - 46); g.closePath(); g.fill();
    for (let k = 0; k < 7; k++) { g.fillStyle = "rgba(255,200,150," + (.03 + (k % 2) * .02) + ")"; g.fillRect(0, py + 60 + k * 70, W, 2); }
    /* the card, glowing */
    const cw = W * .5, ch = cw * 720 / 512, cx = (W - cw) / 2, cy = py - 46 - ch - 10;
    g.save(); g.shadowColor = "rgba(255,140,60,.75)"; g.shadowBlur = 90; g.fillStyle = "#ff8a3c"; g.fillRect(cx - 8, cy - 8, cw + 16, ch + 16); g.restore();
    drawCard(cd, true); g.drawImage(cd.canvas, cx, cy, cw, ch);
    const rg = g.createRadialGradient(W / 2, py, 10, W / 2, py, W * .55); rg.addColorStop(0, "rgba(255,150,70,.25)"); rg.addColorStop(1, "rgba(255,150,70,0)"); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    return c.toDataURL("image/jpeg", .9);
  }
  function filter(cat) { filterCat = cat; const first = CARDS.findIndex((c) => cat === "All" || c.cat === cat); if (first >= 0) focus(first); }
  const ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
  function pick(nx, ny) { v2.set(nx, ny); ray.setFromCamera(v2, camera); const hit = ray.intersectObjects(CARDS.map((c) => c.face))[0]; return hit ? hit.object.userData.card : -1; }

  /* ======================= ABOUT ======================= */
  const AO = new THREE.Vector3(1600, 0, 0), about = new THREE.Group(); about.position.copy(AO); about.visible = false; scene.add(about);
  about.add(new THREE.HemisphereLight(0x6a4a5a, 0x140a0a, .65));
  const warm = new THREE.PointLight(0xffa860, 30, 30, 1.5); warm.position.set(1, 6, 1); about.add(warm);
  const signLight = new THREE.PointLight(0xff8a40, 18, 22, 1.6); signLight.position.set(Math.sin(Math.PI * .86) * 17, 6, Math.cos(Math.PI * .86) * 17); about.add(signLight);
  const M = (c, extra) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .85, metalness: 0 }, extra || {}));
  const floorM = M(0x1e1214, { roughness: .6 }), wallM = M(0x1a0f12), woodM = M(0x4a2a1e, { roughness: .7 }), chairM = M(0x2a1814, { roughness: .6 }), ivory = M(0xe8d6c4), metalM = M(0x8a8a90, { metalness: .6, roughness: .35 });
  /* the hall: a closed round room (floor, wall all the way round, ceiling), so there are no open edges to see */
  const HR = 22;
  const aFloor = new THREE.Mesh(new THREE.CircleGeometry(HR, 64), floorM); aFloor.rotation.x = -Math.PI / 2; about.add(aFloor);
  const aWall = new THREE.Mesh(new THREE.CylinderGeometry(HR, HR, 14, 96, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c1013, side: THREE.BackSide, roughness: .95 })); aWall.position.y = 7; about.add(aWall);
  const aCeil = new THREE.Mesh(new THREE.CircleGeometry(HR, 64), new THREE.MeshStandardMaterial({ color: 0x120a0c, roughness: 1 })); aCeil.rotation.x = Math.PI / 2; aCeil.position.y = 14; about.add(aCeil);
  /* a soft line of light where the wall meets the floor, all the way round */
  const cove = new THREE.Mesh(new THREE.TorusGeometry(HR - .15, .05, 6, 160), new THREE.MeshBasicMaterial({ color: 0x8a4a2a })); cove.rotation.x = Math.PI / 2; cove.position.y = .06; about.add(cove);
  /* curved shelves along the back-left wall (thin horizontal bands with a front lip), holding ledgers, vases and stones */
  const shelfM = M(0x2a1a1c), A0 = Math.PI * 1.06, AL = Math.PI * .36;
  for (let k = 0; k < 3; k++) { const y = 2.6 + k * 2.2;
    const board = new THREE.Mesh(new THREE.RingGeometry(HR - 1.4, HR - .05, 64, 1, A0 - Math.PI / 2, AL), new THREE.MeshStandardMaterial({ color: 0x2a1a1c, side: THREE.DoubleSide, roughness: .8 })); board.rotation.x = -Math.PI / 2; board.position.y = y; about.add(board);
    const lip = new THREE.Mesh(new THREE.CylinderGeometry(HR - 1.4, HR - 1.4, .14, 64, 1, true, A0, AL), new THREE.MeshStandardMaterial({ color: 0x3a2224, side: THREE.DoubleSide })); lip.position.y = y; about.add(lip);
    for (let j = 0; j < 8; j++) { const a = A0 + (j + .5) * (AL / 8) + rnd(-.02, .02), r = HR - .8, x = Math.sin(a) * r, z = Math.cos(a) * r, t = (j + k) % 4;
      let o; if (t === 0) { o = new THREE.Group(); for (let b = 0; b < 4; b++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(.18, rnd(.7, .95), .6), M([0x8f2a22, 0xc0562f, 0xe8892a, 0x5a3a2a][b])); bk.position.set(b * .2 - .3, .42, 0); o.add(bk); } }
      else if (t === 1) { o = new THREE.Mesh(new THREE.CylinderGeometry(.18, .26, .9, 10), ivory); o.position.y = .47; }
      else if (t === 2) { o = new THREE.Mesh(new THREE.SphereGeometry(.38, 12, 10), M(0x2a1814)); o.position.y = .4; }
      else { o = new THREE.Mesh(new THREE.DodecahedronGeometry(.35, 0), ivory); o.position.y = .33; }
      const holder = new THREE.Group(); holder.position.set(x, y + .07, z); holder.rotation.y = a + Math.PI; holder.add(o); about.add(holder); } }
  const eightRing = new THREE.Group(), ER = Math.PI * .86; eightRing.position.set(Math.sin(ER) * (HR - .4), 6.4, Math.cos(ER) * (HR - .4)); eightRing.lookAt(0, 6.4, 0); about.add(eightRing);   /* on the back-right wall */
  const ringM = new THREE.MeshStandardMaterial({ color: 0x2a1410, emissive: 0xff7a30, emissiveIntensity: .7, roughness: .5 });
  [[0, 1.45, 1.25], [0, -1.35, 1.5]].forEach(([x, y, r]) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, .14, 12, 60), ringM); t.position.set(x, y, 0); eightRing.add(t); });
  const bigRing = new THREE.Mesh(new THREE.TorusGeometry(3.8, .1, 10, 80), new THREE.MeshStandardMaterial({ color: 0x1a0c0a, emissive: 0x7a3010, emissiveIntensity: .5 })); eightRing.add(bigRing);
  /* the long table: CALMS open on laptops, folders, a plant, a bowl, chairs all round */
  const table = new THREE.Group(); table.position.set(.5, 0, -2); table.rotation.y = -.18; about.add(table);
  const top = new THREE.Mesh(new THREE.BoxGeometry(9, .22, 3.2), woodM); top.position.y = 1.55; table.add(top);
  [-3.4, 0, 3.4].forEach((x) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.45, 2.2), woodM); leg.position.set(x, .72, 0); table.add(leg); });
  const screenTex = (() => { const c = document.createElement("canvas"); c.width = 512; c.height = 320; const g = c.getContext("2d"); const bg = g.createLinearGradient(0, 0, 512, 320); bg.addColorStop(0, "#3a1a0e"); bg.addColorStop(1, "#8f2a22"); g.fillStyle = bg; g.fillRect(0, 0, 512, 320);
    g.fillStyle = "#f3cf7a"; g.font = "italic 44px Georgia, serif"; g.fillText("CALMS", 30, 70); g.fillStyle = "rgba(255,230,200,.7)"; g.font = "16px monospace"; g.fillText("APPROVED · RELEASE TODAY", 32, 104);
    for (let i = 0; i < 5; i++) { g.fillStyle = "rgba(255,230,200," + (i === 0 ? .9 : .2) + ")"; g.fillRect(32, 130 + i * 34, 260 - i * 20, 18); } g.fillStyle = "#e8892a"; for (let i = 0; i < 6; i++) g.fillRect(340 + i * 24, 290 - (40 + i * 25), 16, 40 + i * 25); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  function laptop(x, z, ry, open) { const l = new THREE.Group(); l.position.set(x, 1.67, z); l.rotation.y = ry; table.add(l);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, .05, .9), metalM); l.add(base);
    const lid = new THREE.Group(); lid.position.set(0, .03, -.45); lid.rotation.x = -open; l.add(lid);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.3, .9, .04), metalM); back.position.y = .45; lid.add(back);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .8), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })); sc.position.set(0, .45, .025); lid.add(sc); return l; }
  laptop(-1.6, .2, .25, 1.75); laptop(1.2, -.4, -.1, 1.9);
  const lightA = new THREE.PointLight(0xff9a50, 4, 4, 2); lightA.position.set(-1.4, 2.4, .7); table.add(lightA);
  { const balls = new THREE.Group(); for (let i = 0; i < 12; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 8), ivory); b.position.set((i % 3) * .22, Math.floor(i / 6) * .2 + .11, (Math.floor(i / 3) % 2) * .22); balls.add(b); } balls.position.set(2.6, 1.66, .3); table.add(balls); }
  { const vase = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, .7, 10), M(0x2a2024)); vase.position.set(3.4, 2.0, -.6); table.add(vase);
    for (let i = 0; i < 6; i++) { const st = new THREE.Mesh(new THREE.ConeGeometry(.05, .9, 4), M(0x5a6a3a)); st.position.set(3.4 + rnd(-.15, .15), 2.7, -.6 + rnd(-.15, .15)); st.rotation.set(rnd(-.4, .4), 0, rnd(-.4, .4)); table.add(st); } }
  { const bowl = new THREE.Mesh(new THREE.SphereGeometry(.5, 16, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), M(0x2a2024)); bowl.position.set(-3.2, 2.12, -.5); bowl.rotation.x = Math.PI; table.add(bowl); }
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(.9, .04, .65), M([0xe8892a, 0xf6ead8, 0xc0562f][i])); f.position.set(.2, 1.69 + i * .045, .8); f.rotation.y = rnd(-.2, .2); table.add(f); }
  function chair(x, z, ry) { const c = new THREE.Group(); c.position.set(x, 0, z); c.rotation.y = ry; table.add(c);
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(.5, .45, .14, 20), chairM); seat.position.y = 1.0; c.add(seat);
    const back = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, .9, 20, 1, true, Math.PI * .2, Math.PI * .6), new THREE.MeshStandardMaterial({ color: 0x2a1814, side: THREE.DoubleSide, roughness: .6 })); back.position.y = 1.5; back.rotation.y = Math.PI; c.add(back);
    for (let k = 0; k < 4; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.03, .025, 1, 6), chairM); const a = k * Math.PI / 2 + .78; leg.position.set(Math.cos(a) * .3, .5, Math.sin(a) * .3); leg.rotation.set(Math.sin(a) * .12, 0, -Math.cos(a) * .12); c.add(leg); } }
  [-3, -1, 1, 3].forEach((x) => { chair(x, 2.1, 0); chair(x, -2.1, Math.PI); }); chair(-5.1, 0, Math.PI / 2);
  /* soft sculptures on the floor to the right (an arch and a sphere) and a long low sofa, like the reference */
  const letterM = M(0x2a1a1e, { roughness: .5 });
  { const arc = new THREE.Mesh(new THREE.TorusGeometry(1.6, .55, 14, 40, Math.PI * 1.5), letterM); arc.position.set(13.5, 1.7, -9); arc.rotation.set(0, -.6, .8); about.add(arc);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(1.4, 24, 18), letterM); ball.position.set(16.5, 1.4, -7); about.add(ball);

    for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.6), letterM); s.position.set(15.5 + i * 1.3, .55, 2.5 + i * 1.1); s.rotation.y = -.9; about.add(s); } }
  /* dust in the light */
  { const n = 260, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = rnd(-18, 18); p[i * 3 + 1] = rnd(.5, 12); p[i * 3 + 2] = rnd(-18, 12); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(p, 3)); about.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffd8b0, size: .05, transparent: true, opacity: .7, depthWrite: false }))); }
  /* the camera path for scrolling: wide hall -> along the shelves -> down to the table (the reference's last angle) */
  const P = (x, y, z) => new THREE.Vector3(x, y, z).add(AO);
  const camPath = new THREE.CatmullRomCurve3([P(-2, 7.5, 19), P(-7, 6.2, 13), P(-9, 4.6, 7), P(-6.5, 3.6, 4.2), P(-4.2, 3.0, 3.4)], false, "centripetal", .4);
  const lookPath = new THREE.CatmullRomCurve3([P(2, 3.2, -4), P(4, 3.4, -6), P(2, 2.8, -4), P(0, 2.2, -2.2), P(1.4, 2.0, -2.6)], false, "centripetal", .4);
  let scrollP = 0, scrollV = 0;
  const tmp = new THREE.Vector3(), tmpL = new THREE.Vector3();

  /* ======================= shared ======================= */
  let current = null, savedFog = null;
  function show(name) {
    current = name; loans.visible = name === "loans"; about.visible = name === "about";
    if (name) { if (!savedFog) savedFog = scene.fog; scene.fog = roomFog; renderer.setClearColor(0x0a0606, 1); }
    else if (savedFog) { scene.fog = savedFog; savedFog = null; }
    if (name === "loans") { turn = turnT = CARDS[focusI].a; }
    if (name === "about") scrollV = scrollP;
  }
  function setScroll(p) { scrollP = Math.max(0, Math.min(1, p)); }
  function update(dt, time, mx, my) {
    if (current === "loans") {
      idle += dt; if (idle > 2.5 && zoomI < 0) turnT += dt * .018 * Math.min(1, (idle - 2.5) / 3);   /* left alone, the ring keeps turning, very slowly */
      turn += (turnT - turn) * Math.min(1, dt * 1.1); ring.rotation.y = turn;
      /* which card faces the viewer now */
      const near = Math.round(turn / step); const fi = ((near % CARDS.length) + CARDS.length) % CARDS.length; if (fi !== focusI) { focusI = fi; dispatchEvent(new CustomEvent("gr8:cardfocus", { detail: fi })); }
      CARDS.forEach((cd, i) => { const on = filterCat === "All" || cd.cat === filterCat, isF = i === focusI;
        cd.glow.opacity += ((on ? (isF ? .85 : .32) : .06) - cd.glow.opacity) * Math.min(1, dt * 5);
        const s = isF ? 1.06 : 1; cd.grp.scale.x += (s - cd.grp.scale.x) * Math.min(1, dt * 5); cd.grp.scale.y = cd.grp.scale.x;
        cd.face.material.color.setScalar(on ? 1 : .25);
        cd.grp.position.y = 2.75 + Math.sin(time * .8 + i) * .05; if (cd.hot !== isF) { cd.hot = isF; drawCard(cd, isF); } });
      rim.material.color.setHSL(.07, 1, .55 + Math.sin(time * 1.5) * .05);
      const sw = Math.sin(time * .13), sw2 = Math.sin(time * .09 + 1.3);   /* a slow cinematic sway, never still */
      basePos.set(LO.x + mx * 1.2 + sw * .9, LO.y + 3.4 + my * .4 + sw2 * .25, LO.z + 2.5 + Math.sin(time * .07) * .8); baseLook.set(LO.x + mx * .4 + sw * .3, LO.y + 2.9 + sw2 * .1, LO.z - R);
      zoomV += ((zoomK) - zoomV) * Math.min(1, dt * 2.4); if (zoomK === 0 && zoomV < .002) { zoomV = 0; zoomI = -1; }
      if (zoomI >= 0 && zoomV > 0) { const cd = CARDS[zoomI]; cd.face.getWorldPosition(zLook); cd.face.getWorldDirection(zDir); zPos.copy(zLook).addScaledVector(zDir, 5.4);
        const e = zoomV * zoomV * (3 - 2 * zoomV); camera.position.copy(basePos).lerp(zPos, e); camera.lookAt(baseLook.lerp(zLook, e)); }
      else { camera.position.copy(basePos); camera.lookAt(baseLook); }
    } else if (current === "about") {
      scrollV += (scrollP - scrollV) * Math.min(1, dt * 2.2);   /* the camera follows the scroll with a soft, cinematic lag */
      const t = scrollV * scrollV * (3 - 2 * scrollV) * .2 + scrollV * .8;
      camPath.getPoint(t, tmp); lookPath.getPoint(t, tmpL);
      camera.position.set(tmp.x + mx * .6, tmp.y + my * .3, tmp.z); camera.lookAt(tmpL);
      warm.intensity = 28 + Math.sin(time * .9) * 2; ringM.emissiveIntensity = .6 + Math.sin(time * 1.2) * .15;
    }
  }
  return { show, update, setScroll, focus, nudge, filter, pick, zoom, hero, cards: CARDS, get focusI() { return focusI; }, get current() { return current; } };
}
