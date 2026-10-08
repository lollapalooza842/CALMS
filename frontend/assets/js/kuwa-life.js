/* KUWA's idle life, shared by every page that has him (all but the sign-in screen).
   Loaded after the page's own script. It does not replace the page's reactions (the nod, the
   alarm, the thinking pose): while the page plays one of those, this script steps aside, and
   takes over again once the page has gone back to its plain standing pose.

   What he does, in order of priority:
     1. answers you      startles awake, perks up when you return to the tab, reacts to being
                         poked, squints at form errors, stamps or nods at an approval
     2. watches you      leans in while you type, looks where you clicked, follows the cursor
     3. keeps himself    one fidget every 8 to 20 seconds; on pages with overdue items, deadlines
        busy             or money he may also tap a foot, check his watch or count on his feathers
     4. simply lives     breathes, blinks unevenly, glances about, shifts his weight, and changes
                         his expression every few seconds (stern, soft, curious, smug, focused, pleased)
     5. is left alone    peeks at you from behind the side rail after about 16 seconds, is
                         drowsy after 30 and asleep after 60
   He also has props (a mug, a ledger, spectacles), turns to face whatever just changed on the
   page (eyes first, then head, then a lean), ducks when a stamp lands near him, flinches at
   the chain, watches the train, and hops or flies to perch above the card you are working in.

   Frames come from assets/img/kuwa-idle.png, drawn by design/kuwa/kuwa_idle.py. */
(function () {
  var kuwa = document.getElementById("kuwa"); if (!kuwa) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var N = {base: 0, breathe1: 1, breathe2: 2, half: 3, closed: 4, lookL: 5, lookR: 6, lookU: 7, lookD: 8, lookUL: 9, lookUR: 10, lookDL: 11, lookDR: 12, leanL: 13, leanR: 14, hat1: 15, hat2: 16, hat3: 17, tug1: 18, tug2: 19, ruffle1: 20, ruffle2: 21, ruffle3: 22, preen1: 23, preen2: 24, tiltL: 25, tiltR: 26, turnR: 27, turnL: 28, turnBack: 29, scratch1: 30, scratch2: 31, wing1: 32, wing2: 33, wing3: 34, yawn1: 35, yawn2: 36, polish1: 37, polish2: 38, leanIn: 39, perk: 40, wave: 41, glare: 42, hop: 43, peck: 44, drowsy1: 45, drowsy2: 46, drowsy3: 47, sleep1: 48, sleep2: 49, startle: 50, hatBack: 51, innocent: 52, tap: 53, tapBase: 54, watch1: 55, watch2: 56, count1: 57, count2: 58, stampUp: 59, stampDown: 60, squint: 61, shakeL: 62, shakeR: 63, soft0: 64, soft1: 65, soft2: 66, softBlink: 67, curious0: 68, curious1: 69, curious2: 70, curiousBlink: 71, smug0: 72, smug1: 73, smug2: 74, smugBlink: 75, focused0: 76, focused1: 77, focused2: 78, focusedBlink: 79, pleased0: 80, pleased1: 81, pleased2: 82, pleasedBlink: 83, surprised: 84, worried: 85, seeL: 86, seeR: 87, seeU: 88, seeD: 89, seeUL: 90, seeUR: 91, seeDL: 92, seeDR: 93, softT1: 94, softT2: 95, curiousT1: 96, curiousT2: 97, smugT1: 98, smugT2: 99, focusedT1: 100, focusedT2: 101, pleasedT1: 102, pleasedT2: 103, headR: 104, headL: 105, headRlean: 106, headLlean: 107, mugHold: 108, mugSip: 109, ledger1: 110, ledger2: 111, ledgerTurn: 112, specs: 113, specsPeer: 114, duck: 115, duckPeek: 116, flinch: 117, fly0: 118, fly1: 119, fly2: 120, fly3: 121, fly4: 122, fly5: 123, flare: 124, land: 125};
  var layer = document.createElement("span"); layer.className = "klife"; layer.setAttribute("aria-hidden", "true"); kuwa.appendChild(layer);
  function show(f) { layer.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function now() { return Date.now(); }
  function rect() { return kuwa.getBoundingClientRect(); }
  function onScreen() { var r = rect(); return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight; }

  /* ---- stepping aside for the page ---- */
  var PLAIN = { 0: 1, 1: 1, 2: 1, 3: 1, 24: 1, 25: 1, 26: 1, 27: 1, 28: 1 };        /* the page's own standing, blinking, frowning and looking frames (in kuwa.png) */
  var pageBusyUntil = 0, mine = false;
  function pageFrame() { var m = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(kuwa.style.backgroundPosition || ""); return m ? Math.round(-m[1] / 96) + Math.round(-m[2] / 96) * 8 : 0; }
  function pageBusy() { for (var i = 0; i < kuwa.classList.length; i++) if (kuwa.classList[i] !== "alive" && kuwa.classList[i] !== "kuwa-out") return true; return !PLAIN[pageFrame()]; }
  function watchPage() { if (pageBusy()) { pageBusyUntil = now() + 1300; if (mine) release(); } }
  if (window.MutationObserver) new MutationObserver(watchPage).observe(kuwa, { attributes: true, attributeFilter: ["style", "class"] });
  function take() { if (mine) return; mine = true; kuwa.classList.add("alive"); }
  function release() { mine = false; kuwa.classList.remove("alive"); clearTimeout(actT); acting = false; }

  /* ---- playing a sequence of [frame, milliseconds] ---- */
  var actT = null, acting = false, actRank = 0;
  function act(seq, rank, then) { if (!mine && now() < pageBusyUntil) return false; if (acting && rank <= actRank) return false; take(); clearTimeout(actT); acting = true; actRank = rank; var k = 0;
    (function step() { if (!mine) return; show(seq[k][0]); if (seq[k][2]) seq[k][2](); var ms = seq[k][1]; k++; actT = setTimeout(k < seq.length ? step : function () { acting = false; actRank = 0; if (then) then(); }, ms); })(); return true; }

  /* ---- particles ---- */
  function feather() { if (reduce || !onScreen() || !document.body.animate) return; var r = rect(), f = document.createElement("div"), dx = rnd(-50, 50), r0 = rnd(0, 360); f.className = "kfeather"; f.style.left = (r.left + r.width * rnd(.3, .7)) + "px"; f.style.top = (r.top + r.height * .55) + "px"; document.body.appendChild(f);
    f.animate([{ transform: "translate(0,0) rotate(" + r0 + "deg) scale(2)", opacity: 1 }, { transform: "translate(" + dx * .7 + "px,30px) rotate(" + (r0 + 120) + "deg) scale(2)", opacity: 1, offset: .5 }, { transform: "translate(" + dx + "px,80px) rotate(" + (r0 + 260) + "deg) scale(2)", opacity: 0 }], { duration: rnd(1400, 2000), easing: "ease-out" }).onfinish = function () { f.remove(); }; }
  function zed() { if (reduce || !onScreen() || !document.body.animate) return; var r = rect(), z = document.createElement("div"); z.className = "kzed"; z.textContent = "z"; z.style.left = (r.left + r.width * .72) + "px"; z.style.top = (r.top + r.height * .12) + "px"; document.body.appendChild(z);
    z.animate([{ transform: "translate(0,0) scale(.7)", opacity: 0 }, { transform: "translate(6px,-12px) scale(1)", opacity: 1, offset: .3 }, { transform: "translate(16px,-40px) scale(1.5)", opacity: 0 }], { duration: 2200, easing: "ease-out" }).onfinish = function () { z.remove(); }; }

  /* ---- 4. simply lives ---- */
  var bi = 0, gaze = null, gazeUntil = 0;
  /* His face. "stern" is the frown he was drawn with; the others relax, lift or narrow his brows and eyes.
     He drifts between them every few seconds, and things that happen on the page can set one for a while. */
  var FACES = { stern: [N.base, N.breathe1, N.breathe2, N.closed], soft: [N.soft0, N.soft1, N.soft2, N.softBlink], curious: [N.curious0, N.curious1, N.curious2, N.curiousBlink], smug: [N.smug0, N.smug1, N.smug2, N.smugBlink], focused: [N.focused0, N.focused1, N.focused2, N.focusedBlink], pleased: [N.pleased0, N.pleased1, N.pleased2, N.pleasedBlink] };
  var face = "stern", faceUntil = 0, nextFace = now() + rnd(3000, 6000);
  var TRAVEL = { soft: [N.softT1, N.softT2], curious: [N.curiousT1, N.curiousT2], smug: [N.smugT1, N.smugT2], focused: [N.focusedT1, N.focusedT2], pleased: [N.pleasedT1, N.pleasedT2] };
  /* changing face passes through two in-between drawings on the way out of the old one and two on the way into the new one */
  function setFace(name, ms) { var old = face, seq = []; if (old !== name && !reduce) { if (TRAVEL[old]) seq.push([TRAVEL[old][1], 55], [TRAVEL[old][0], 55]); if (TRAVEL[name]) seq.push([TRAVEL[name][0], 55], [TRAVEL[name][1], 55]); }
    face = name; faceUntil = now() + ms; nextFace = faceUntil + rnd(2500, 6000); if (seq.length && mine && !acting) act(seq, 1); }
  function driftFace() { var pool = mood.overdue ? ["stern", "stern", "focused", "smug", "curious", "soft"] : ["stern", "soft", "soft", "curious", "curious", "smug", "focused", "pleased"], n; do { n = pick(pool); } while (n === face); setFace(n, rnd(3500, 8000)); }
  function breath() { var F = FACES[face]; return [F[0], F[1], F[2], F[1]]; }
  var nextBlink = now() + rnd(1500, 4000), nextGlance = now() + rnd(4000, 8000), nextShift = now() + rnd(9000, 16000), nextFidget = now() + rnd(8000, 14000);
  function blink() { var kind = Math.random(); nextBlink = now() + rnd(2200, 6500);
    var c = FACES[face][3], o = FACES[face][0]; if (kind < .6) act([[c, 110]], 1); else if (kind < .82) act([[c, 80], [o, 110], [c, 80]], 1); else act([[N.half, 120], [c, 340], [N.half, 140]], 1); }
  function glance() { nextGlance = now() + rnd(4500, 10000); gaze = pick([N.lookL, N.lookR, N.lookU, N.lookUL, N.lookUR, N.lookL, N.lookR]); gazeUntil = now() + rnd(700, 1500); }
  function shiftWeight() { nextShift = now() + rnd(10000, 19000); var a = Math.random() < .5 ? N.leanL : N.leanR, b = a === N.leanL ? N.leanR : N.leanL; act([[a, 620], [N.base, 160], [b, 520], [N.base, 120]], 2); }

  /* ---- 3. keeps himself busy ---- */
  var FIDGETS = {
    hat: [[N.hat1, 140], [N.hat2, 420], [N.hat1, 120], [N.hat3, 260], [N.base, 120]],
    tug: [[N.tug1, 260], [N.tug2, 170], [N.tug1, 170], [N.tug2, 170], [N.tug1, 240], [N.base, 120]],
    ruffle: [[N.ruffle1, 200], [N.ruffle2, 70], [N.ruffle3, 70], [N.ruffle2, 70], [N.ruffle3, 70, feather], [N.ruffle2, 70], [N.ruffle1, 220], [N.breathe1, 200]],
    preen: [[N.turnL, 220], [N.preen1, 260], [N.preen2, 180], [N.preen1, 150], [N.preen2, 180], [N.preen1, 150], [N.preen2, 180], [N.turnL, 200], [N.base, 120]],
    tilt: [[Math.random() < .5 ? N.tiltL : N.tiltR, 1300], [N.base, 150]],
    swivel: [[N.turnR, 420], [N.base, 140], [N.turnL, 380], [N.turnBack, 900], [N.turnL, 200], [N.base, 150]],
    scratch: [[N.scratch1, 180], [N.scratch2, 110], [N.scratch1, 110], [N.scratch2, 110], [N.scratch1, 110], [N.scratch2, 110], [N.scratch1, 160], [N.base, 120]],
    stretch: [[N.wing1, 160], [N.wing2, 200], [N.wing3, 620], [N.wing2, 180], [N.wing1, 150], [N.base, 120]],
    yawn: [[N.half, 200], [N.yawn1, 240], [N.yawn2, 900], [N.yawn1, 200], [N.half, 300], [N.base, 120]],
    polish: [[N.polish1, 220], [N.polish2, 150], [N.polish1, 150], [N.polish2, 150], [N.polish1, 150], [N.polish2, 150], [N.lookU, 400], [N.base, 120]],
    mug: [[N.mugHold, 500], [N.mugSip, 800], [N.mugHold, 450], [N.mugSip, 700], [N.mugHold, 300], [N.pleased0, 500]],
    ledger: [[N.ledger1, 800], [N.ledger2, 800], [N.ledgerTurn, 260], [N.ledger1, 700], [N.ledger2, 800], [N.focused0, 300]],
    specs: [[N.specs, 500], [N.specsPeer, 1300], [N.specs, 300], [N.specsPeer, 900], [N.specs, 250], [N.base, 120]],
    /* in character */
    tap: [[N.tapBase, 260], [N.tap, 130], [N.tapBase, 130], [N.tap, 130], [N.tapBase, 130], [N.tap, 130], [N.tapBase, 130], [N.tap, 130], [N.tapBase, 420], [N.base, 120]],
    watch: [[N.tug1, 180], [N.watch1, 900], [N.watch2, 700], [N.watch1, 300], [N.base, 120]],
    count: [[N.count1, 320], [N.count2, 220], [N.count1, 220], [N.count2, 220], [N.count1, 220], [N.count2, 220], [N.count1, 300], [N.base, 120]]
  };
  var ALWAYS = ["hat", "tug", "ruffle", "preen", "tilt", "swivel", "scratch", "stretch", "yawn", "polish", "mug", "mug", "ledger", "ledger", "specs", "specs"], lastFidget = "", mood = { overdue: false, deadline: false, money: false };
  function readPage() { var m = document.querySelector("main"), t = m ? m.textContent : ""; mood.overdue = /past due|overdue|escalat|over 48 hours|waited too long/i.test(t); mood.deadline = /cut-off|leaves in|due today|days left|expires|next try in/i.test(t); mood.money = /₱/.test(t); }
  readPage(); setInterval(readPage, 12000);
  function fidget() { nextFidget = now() + rnd(8000, 20000); var pool = ALWAYS.slice(); if (mood.overdue) pool.push("tap", "tap", "tap"); if (mood.deadline) pool.push("watch", "watch"); if (mood.money) pool.push("count", "count");
    var name; do { name = pick(pool); } while (name === lastFidget && pool.length > 1); lastFidget = name; if (name === "tilt") FIDGETS.tilt[0][0] = Math.random() < .5 ? N.tiltL : N.tiltR; act(FIDGETS[name], 2); }

  /* ---- 2. watches you ---- */
  var mx = -9999, my = -9999, lastSeen = now(), typingUntil = 0, lookAt = null, lookUntil = 0, hoverSince = 0, awayAt = 0;
  function toward(x, y) { var r = rect(), dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height * .45), a = Math.atan2(dy, dx) * 180 / Math.PI;
    return a > -22.5 && a <= 22.5 ? N.seeR : a > 22.5 && a <= 67.5 ? N.seeDR : a > 67.5 && a <= 112.5 ? N.seeD : a > 112.5 && a <= 157.5 ? N.seeDL : a > 157.5 || a <= -157.5 ? N.seeL : a > -157.5 && a <= -112.5 ? N.seeUL : a > -112.5 && a <= -67.5 ? N.seeU : N.seeUR; }
  function near(x, y, d) { var r = rect(); return Math.hypot(x - (r.left + r.width / 2), y - (r.top + r.height / 2)) < d; }
  function inside(x, y) { var r = rect(); return x > r.left + 12 && x < r.right - 12 && y > r.top + 8 && y < r.bottom; }

  /* ---- 5 and 1. left alone, and waking ---- */
  var state = "awake", sleepT = null;
  function seen() { var was = state; lastSeen = now(); if (was === "asleep") { state = "awake"; clearInterval(sleepT); act([[N.startle, 380], [N.surprised, 260], [N.hatBack, 320], [N.innocent, 900], [N.smug0, 300]], 9); setFace("smug", 3000); } else if (was === "drowsy") { state = "awake"; act([[N.surprised, 320], [N.soft0, 160]], 8); setFace("soft", 3000); } }
  function doze() { if (state === "awake" && now() - lastSeen > 30000) { state = "drowsy"; }
    if (state === "drowsy" && now() - lastSeen > 60000) { state = "asleep"; act([[N.drowsy3, 500], [N.sleep1, 400]], 7); sleepT = setInterval(function () { if (mine && state === "asleep") zed(); }, 1900); } }
  var SLEEP = [N.sleep1, N.sleep1, N.sleep2, N.sleep2], DROWSY = [N.drowsy1, N.drowsy1, N.drowsy2, N.drowsy3, N.drowsy3, N.drowsy2];

  document.addEventListener("mousemove", function (e) { mx = e.clientX; my = e.clientY; seen(); }, { passive: true });
  document.addEventListener("scroll", seen, { passive: true, capture: true });
  document.addEventListener("keydown", function (e) { seen(); lastTouch = now(); var t = e.target; if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && !/^(checkbox|radio|file|range)$/.test(t.type || "")) typingUntil = now() + 1600; }, true);
  document.addEventListener("pointerdown", function (e) { seen(); if (reduce) return;
    if (inside(e.clientX, e.clientY)) { var k = Math.random(); if (k < .4) act([[N.glare, 900], [N.base, 150]], 6); else if (k < .7) act([[N.hop, 150], [N.base, 90], [N.hop, 130], [N.glare, 500], [N.base, 150]], 6); else act([[N.peck, 130], [N.glare, 110], [N.peck, 130], [N.glare, 420], [N.base, 150]], 6); }
    else if (state === "awake") { face = "curious"; faceUntil = now() + 2500; turnTo(e.clientX, e.clientY, 700); perchNear(e.target); } }, true);
  document.addEventListener("visibilitychange", function () { if (document.hidden) awayAt = now(); else if (awayAt && now() - awayAt > 3000) { lastSeen = now(); state = "awake"; clearInterval(sleepT); setTimeout(function () { act([[N.surprised, 360], [N.wave, 180], [N.hat2, 380], [N.wave, 160], [N.pleased0, 300]], 8); setFace("pleased", 3500); }, 350); } });

  /* answers the page: errors and approvals. The page's own reaction wins if it has one. */
  var note = document.getElementById("note"), lastErrors = 0;
  function errorCount() { return document.querySelectorAll('main [aria-invalid="true"]').length; }
  function later(fn) { setTimeout(function () { if (now() >= pageBusyUntil) fn(); }, 220); }
  if (window.MutationObserver && !reduce) {
    if (note) new MutationObserver(function () { var t = note.textContent || ""; if (/^(Not saved|Not yet|Fix |Some numbers)|cannot|is not right|too early/i.test(t)) later(function () { act([[N.worried, 350], [N.squint, 400], [N.shakeL, 110], [N.shakeR, 110], [N.shakeL, 110], [N.shakeR, 110], [N.squint, 400]], 5); setFace("stern", 4000); });
      else if (/\b(saved|posted|approved|locked|released|confirmed|issued|published|delivered|verified|added|unlocked|is in force)\b/i.test(t) && !/^Prototype/.test(t)) later(function () { act([[N.stampUp, 260], [N.stampDown, 420], [N.pleased0, 500]], 5); setFace("pleased", 4000); }); }).observe(note, { childList: true, characterData: true, subtree: true });
    var main = document.querySelector("main"); if (main) new MutationObserver(function () { var n = errorCount(); if (n > lastErrors) later(function () { act([[N.worried, 350], [N.squint, 500], [N.shakeL, 110], [N.shakeR, 110], [N.shakeL, 110], [N.squint, 300]], 5); setFace("stern", 4000); }); lastErrors = n; }).observe(main, { attributes: true, attributeFilter: ["aria-invalid"], subtree: true }); }

  /* ---- the head leads, the body follows ---- */
  function turnTo(x, y, hold) { if (reduce) return; var r = rect(), dx = x - (r.left + r.width / 2), eyes = toward(x, y);
    if (Math.abs(dx) < 150) { lookAt = eyes; lookUntil = now() + hold + 400; return; }
    var L = dx < 0; act([[eyes, 110], [L ? N.headL : N.headR, 150], [L ? N.headLlean : N.headRlean, hold], [L ? N.headL : N.headR, 120], [eyes, 100]], 3); }

  /* ---- answering what the page does ---- */
  var loadedAt = now(), lastTurn = 0, mainEl = document.querySelector("main"), train = null, trainX = null, lastTrain = 0;
  function ours(n) { return n === kuwa || kuwa.contains(n) || /kfeather|kzed|kpeek/.test(n.className || "") || n.id === "note"; }
  function pageChanged(n) { if (reduce || now() - loadedAt < 1800 || ours(n) || state !== "awake") return; var r = n.getBoundingClientRect(); if (r.width * r.height < 1500 || r.bottom < 0 || r.top > window.innerHeight) return; var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (n.matches(".chain, .waxs") || n.querySelector(".chain")) { act([[N.flinch, 320], [N.surprised, 420], [N.worried, 600]], 6); return; }
    var st = n.matches(".stamp.slam") ? n : n.querySelector(".stamp.slam"); if (st) { var s = st.getBoundingClientRect(); if (near(s.left + s.width / 2, s.top + s.height / 2, 460)) { act([[N.duck, 460], [N.duckPeek, 520], [N.surprised, 200]], 6); return; } }
    if (now() < typingUntil || now() - lastTurn < 3500) return; lastTurn = now(); turnTo(cx, cy, 800); }
  if (mainEl && window.MutationObserver) new MutationObserver(function (list) { for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) { var n = list[i].addedNodes[j]; if (n.nodeType === 1) { pageChanged(n); return; } } }).observe(mainEl, { childList: true, subtree: true });
  function watchTrain() { train = train || document.getElementById("train"); if (!train || reduce) return; var r = train.getBoundingClientRect(); if (!r.width || r.bottom < 0 || r.top > window.innerHeight || getComputedStyle(train).opacity === "0") { trainX = null; return; }
    if (trainX != null && Math.abs(r.left - trainX) > 4 && now() - lastTrain > 1000 && state === "awake") { lastTrain = now(); turnTo(r.left + r.width / 2, r.top + r.height / 2, 700); } trainX = r.left; }

  /* ---- getting about: he can leave his spot, by hopping or flying, and stand on the top edge of whatever you are working on ---- */
  var off = { x: 0, y: 0 }, lastMove = 0, lastTouch = now(), moving = false, peeking = false, lastPeek = now() - 120000;
  var roamOK = (function () { if (reduce || kuwa.style.left || !kuwa.animate || (/top|left|right|all/.test(getComputedStyle(kuwa).transitionProperty) && /[1-9]/.test(getComputedStyle(kuwa).transitionDuration))) return false;   /* not on pages that move him themselves */ for (var p = kuwa.parentElement; p && p !== document.body; p = p.parentElement) { var o = getComputedStyle(p); if (/hidden|clip|auto|scroll/.test(o.overflowX + o.overflowY)) return false; } return true; })();
  function travel(nx, ny, then) { var r = rect(), dx = nx - off.x, dy = ny - off.y, dist = Math.hypot(dx, dy); if (dist < 50 || moving) return false; moving = true; lastMove = now(); var from = off.x + "px " + off.y + "px", to = nx + "px " + ny + "px"; off = { x: nx, y: ny }; kuwa.style.translate = to; kuwa.style.zIndex = nx || ny ? "60" : ""; kuwa.style.pointerEvents = nx || ny ? "none" : "";   /* away from home he never blocks a click */
    function done() { moving = false; layer.style.transform = ""; if (then) then(); }
    if (Math.abs(dy) < 30 && dist < 360) { /* a few hops along the edge */
      var hops = Math.max(2, Math.round(dist / 70)), kf = [], seq = [], i; for (i = 0; i <= hops * 2; i++) { var u = i / (hops * 2); kf.push({ translate: (nx - dx * (1 - u)) + "px " + (ny - dy * (1 - u) - (i % 2 ? 14 : 0)) + "px" }); } for (i = 0; i < hops; i++) seq.push([N.hop, 150], [N.land, 90]);
      kuwa.animate(kf, { duration: hops * 240, easing: "linear" }); act(seq, 7, done); if (!acting) done(); return true; }
    /* a short flight: up, across, a flare, and down */
    var T = Math.max(650, Math.min(1400, dist * 2.2)), seq2 = [], t = 0, k = 0; while (t < T * .78) { seq2.push([N.fly0 + (k++ % 6), 60]); t += 60; } seq2.push([N.flare, T * .22], [N.land, 130, function () { feather(); }], [N.base, 120]);
    layer.style.transform = dx < 0 ? "scaleX(-1)" : ""; var sh = setInterval(feather, 170); setTimeout(function () { clearInterval(sh); }, T * .8);
    kuwa.animate([{ translate: from }, { translate: (nx - dx * .5) + "px " + (Math.min(ny, ny - dy) - 54) + "px", offset: .5 }, { translate: (nx - dx * .08) + "px " + (ny - 16) + "px", offset: .88 }, { translate: to }], { duration: T, easing: "cubic-bezier(.3,.2,.4,1)" });
    if (!act(seq2, 7, done)) { clearInterval(sh); done(); } return true; }
  function goHome(then) { if (off.x || off.y) travel(0, 0, then); else if (then) then(); }
  function perchNear(el) { lastTouch = now(); if (!roamOK || moving || peeking || !mine || state !== "awake" || now() - lastMove < 9000 || !el || !el.closest || window.innerWidth < 900) return; if (el.closest(".rail, nav") || ours(el)) return;
    var box = el.closest(".card, .pub, .book, .board, .badge, .roster, .list, section"); if (!box || box.contains(kuwa)) { if (box && (off.x || off.y)) goHome(); return; }
    var b = box.getBoundingClientRect(), e = el.getBoundingClientRect(), r = rect(); if (b.top < 110 || b.top > window.innerHeight - 40 || b.width < 200) return;
    var px = b.right - 70, py = b.top + 7;   /* the right-hand end of the card's top edge, where he covers least */ travel(off.x + (px - (r.left + r.width / 2)), off.y + (py - r.bottom)); }
  document.addEventListener("focusin", function (e) { if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) perchNear(e.target); });

  /* ---- ignored for a while, he slips away and peeks at you from behind the side rail ---- */
  function peek() { var m = mainEl && mainEl.getBoundingClientRect(); if (!m || m.left < 120 || reduce || !document.body.animate) return; peeking = true; lastPeek = now(); feather(); kuwa.classList.add("kuwa-out");
    var w = document.createElement("div"), k = document.createElement("span"), y = Math.max(90, Math.min(window.innerHeight - 150, (my > 0 ? my : window.innerHeight / 2) - 48)); w.className = "kpeek"; w.style.left = m.left + "px"; w.style.top = y + "px"; w.appendChild(k); document.body.appendChild(w);
    function f(n) { k.style.backgroundPosition = (-96 * (n % 8)) + "px " + (-96 * Math.floor(n / 8)) + "px"; } f(N.seeR);
    var gone = false, timers = [], slide = k.animate([{ transform: "translateX(-96px)" }, { transform: "translateX(-38px)" }], { duration: 700, easing: "cubic-bezier(.2,.8,.3,1)", fill: "forwards" });
    function back() { if (gone) return; gone = true; timers.forEach(clearTimeout); document.removeEventListener("mousemove", spot); f(N.surprised); k.animate([{ transform: "translateX(-38px)" }, { transform: "translateX(-96px)" }], { duration: 220, easing: "ease-in", fill: "forwards" }).onfinish = function () { w.remove(); kuwa.classList.remove("kuwa-out"); peeking = false; act([[N.hop, 140], [N.innocent, 900], [N.smug0, 300]], 6); face = "smug"; faceUntil = now() + 3000; }; }
    function spot(e) { var r = w.getBoundingClientRect(); if (Math.hypot(e.clientX - r.left, e.clientY - (r.top + 48)) < 170) back(); else f(e.clientY < r.top ? N.seeUR : e.clientY > r.bottom ? N.seeDR : N.seeR); }
    timers.push(setTimeout(function () { document.addEventListener("mousemove", spot); }, 800), setTimeout(function () { f(N.softBlink); }, 1700), setTimeout(function () { f(N.seeR); }, 1820), setTimeout(back, 4200)); }

  /* ---- the heartbeat: one beat every 720 ms ---- */
  function beat() { var t = now(); if (document.hidden) return; if (t < pageBusyUntil || pageBusy()) { if (pageBusy()) pageBusyUntil = t + 1300; return; } take(); if (peeking) return; watchTrain(); if (acting || moving) return;
    if (!reduce && state === "awake") { var idle = t - lastSeen; if ((off.x || off.y) && t - lastTouch > 20000) { goHome(); return; } if (idle > 16000 && idle < 26000 && t - lastPeek > 120000 && !(off.x || off.y)) { peek(); return; } }
    if (t > nextFace && t > faceUntil) driftFace();
    if (reduce) { bi = (bi + 1) % 4; show(breath()[bi]); if (t > nextBlink) blink(); return; }
    doze();
    if (state === "asleep") { bi = (bi + 1) % SLEEP.length; show(SLEEP[bi]); return; }
    if (state === "drowsy") { bi = (bi + 1) % DROWSY.length; show(DROWSY[bi]); return; }
    if (t < typingUntil) { show(N.leanIn); face = "focused"; faceUntil = t + 2500; return; }
    if (inside(mx, my) && (off.x || off.y) && !moving) { goHome(); return; }   /* in your way: he leaves */
    if (inside(mx, my)) { if (!hoverSince) hoverSince = t; if (t - hoverSince > 700) { show(N.glare); return; } } else hoverSince = 0;
    if (t < lookUntil && lookAt != null) { show(lookAt); return; }
    if (near(mx, my, 260)) { show(toward(mx, my)); if (t > nextBlink) blink(); return; }
    if (t > nextFidget) { fidget(); return; }
    if (t > nextShift) { shiftWeight(); return; }
    if (t > nextBlink) { blink(); return; }
    if (t > nextGlance) glance();
    if (t < gazeUntil && gaze != null) { show(gaze); return; }
    bi = (bi + 1) % 4; show(breath()[bi]); }
  show(N.base); setInterval(beat, 720); setTimeout(beat, 60);
  /* the cursor is followed between beats too, so his eyes keep up */
  document.addEventListener("mousemove", function () { if (mine && !acting && !reduce && state === "awake" && now() >= typingUntil && now() >= lookUntil && !inside(mx, my) && near(mx, my, 260)) show(toward(mx, my)); }, { passive: true });
  window.CALMS_KUWA = { names: N, play: function (name) { return !!FIDGETS[name] && act(FIDGETS[name], 4); }, state: function () { return { mine: mine, acting: acting, state: state, mood: mood, face: face }; }, face: setFace };
})();
