(function () {
  var FR = [[0, 0, 1800], [1, 0, 700], [2, 0, 1200], [3, 0, 110], [4, 0, 600], [5, 0, 350], [6, 0, 350], [7, 0, 700], [0, 1, 600], [1, 1, 1500], [2, 1, 1500], [3, 1, 1000], [4, 1, 350], [5, 1, 900], [6, 1, 900], [7, 1, 900], [0, 2, 120], [1, 2, 100], [2, 2, 120], [3, 2, 380], [4, 2, 120], [5, 2, 500], [6, 2, 80], [7, 2, 500], [0, 3, 300], [1, 3, 100], [2, 3, 100], [3, 3, 100], [4, 3, 100], [5, 3, 110], [6, 3, 90], [7, 3, 130], [0, 4, 90], [1, 4, 110], [2, 4, 90], [3, 4, 130], [4, 4, 90], [5, 4, 400], [6, 4, 400], [7, 4, 400], [0, 5, 400], [1, 5, 400], [2, 5, 400], [3, 5, 55], [4, 5, 55], [5, 5, 55], [6, 5, 55], [7, 5, 55], [0, 6, 55], [1, 6, 55], [2, 6, 55], [3, 6, 80], [4, 6, 80], [5, 6, 80], [6, 6, 80], [7, 6, 60], [0, 7, 60], [1, 7, 60], [2, 7, 60], [3, 7, 60], [4, 7, 60], [5, 7, 60], [6, 7, 60]], TAGS = {"idle": [0, 3], "think": [4, 8], "rest": [9, 12], "sleep": [13, 15], "approve": [16, 21], "alert": [22, 24], "look": [25, 28], "fly": [29, 32], "fly-side": [33, 36], "turn": [37, 42], "fly8": [43, 50], "bank": [51, 54], "gust": [55, 62]};
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), scene = $("scene"), kuwa = $("kuwa"), kb = $("kb"), ke = $("ke"), hd = $("kuwahd"), clerk = $("clerk"),
      logoWrap = $("logoWrap"), glint = $("glint"), card = $("card"), night = $("night"), curtL = $("curtL"), curtR = $("curtR"),
      title = $("title"), barT = $("barT"), barB = $("barB"), grain = $("grain"), flash = $("flash"), crack = $("crack"), bits = $("bits"),
      sil = $("sil"), shade = $("shade"), fake = $("fake"), tumble = $("tumble"), l4g = $("l4g"), skip = $("skip"), replay = $("replay");
  var CAM = [["l1", 1.03, 0], ["l2", 1.07, 0], ["l3", 1.12, 0], ["l4", 1.24, 0], ["l4g", 1.24, 0], ["l5", 1.7, 16]];
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var K = 3, timers = [], anims = [], ivs = [], running = false, W = 0, H = 0;
  glint.style.webkitMaskImage = glint.style.maskImage = "url(" + $("logo").src + ")";

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    var sh = Math.max(H, W * 0.375), sw = sh * 480 / 180;
    scene.style.width = sw + "px"; scene.style.height = sh + "px"; scene.style.left = (W - sw) / 2 + "px"; scene.style.top = (H - sh) / 2 + "px";
    scene.style.setProperty("--u", (sh / 180) + "px");
    K = Math.max(2, Math.min(4, Math.round(H / 240)));
    var s = 96 * K;
    kuwa.style.width = kuwa.style.height = s + "px"; kuwa.style.margin = (-s / 2) + "px 0 0 " + (-s / 2) + "px";
    kuwa.style.setProperty("--k", K + "px");
    kb.style.backgroundSize = (768 * K) + "px " + (768 * K) + "px";
    var u = ke.children;
    [[33, 40], [55, 40]].forEach(function (p, i) { u[i].style.left = p[0] * K + "px"; u[i].style.top = p[1] * K + "px"; u[i].style.width = u[i].style.height = 8 * K + "px"; });
  }
  function frame(el, i, k) { el.style.backgroundPosition = (-96 * k * FR[i][0]) + "px " + (-96 * k * FR[i][1]) + "px"; }
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function every(ms, fn) { var id = setInterval(fn, ms); ivs.push(id); return id; }
  function anim(el, kf, opt) { var a = el.animate(kf, Object.assign({ fill: "forwards", easing: "ease" }, opt)); anims.push(a); return a; }
  function clearAll() { timers.forEach(clearTimeout); timers = []; ivs.forEach(clearInterval); ivs = []; anims.forEach(function (a) { a.cancel(); }); anims = []; bits.textContent = ""; }
  function camEnd(k) { return "translateY(" + CAM[k][2] + "%) scale(" + CAM[k][1] + ")"; }

  /* ---- the sign-in desk owl ---- */
  var cTimer = null, cTag = null, cHold = false;
  function clerkPlay(tag, once, then) {
    clearTimeout(cTimer); cTag = tag;
    var a = TAGS[tag][0], b = TAGS[tag][1], i = a;
    (function step() {
      frame(clerk, i, 1);
      if (reduce) return;
      var d = FR[i][2];
      if (i === b) { if (once) { cTimer = setTimeout(function () { cHold = false; (then || function () { clerkPlay("idle"); })(); }, d); return; } i = a; } else i++;
      cTimer = setTimeout(step, d);
    })();
  }
  function clerkStill(i) { clearTimeout(cTimer); cTag = null; frame(clerk, i, 1); }
  var mp = null, fp = { x: 0, y: 0 }, raf = 0, blowing = false, puffT = 0, RAD = 92;
  function owlAt() { var r = clerk.getBoundingClientRect(), s = stage.getBoundingClientRect(); return { x: r.left - s.left + 48, y: r.top - s.top + 54 }; }
  function gustLoop() {
    raf = 0; if (!mp) return;
    var c = owlAt(), dx = mp.x - c.x, dy = mp.y - c.y, dist = Math.hypot(dx, dy) || 1, inside = dist < RAD && !cHold && !running;
    var tx = mp.x, ty = mp.y;
    if (inside) { var push = RAD + 80 - dist; tx += dx / dist * push + (Math.random() - .5) * 12; ty += dy / dist * push + (Math.random() - .5) * 12; }
    if (inside && !blowing) { blowing = true; clerkPlay("gust"); }
    if (!inside && blowing) { blowing = false; if (!cHold) clerkPlay("idle"); }
    fp.x += (tx - fp.x) * .2; fp.y += (ty - fp.y) * .2;
    fake.style.transform = "translate(" + fp.x.toFixed(1) + "px," + fp.y.toFixed(1) + "px)";
    if (inside && Date.now() - puffT > 90) {
      puffT = Date.now();
      var w = document.createElement("div"); w.className = "w"; bits.appendChild(w);
      var ang = Math.atan2(dy, dx) + (Math.random() - .5) * .9, far = 150 + Math.random() * 90;
      w.animate([{ transform: "translate(" + (c.x + Math.cos(ang) * 30) + "px," + (c.y + Math.sin(ang) * 30) + "px) rotate(" + ang + "rad)", opacity: .9 }, { transform: "translate(" + (c.x + Math.cos(ang) * far) + "px," + (c.y + Math.sin(ang) * far) + "px) rotate(" + ang + "rad) scaleX(2)", opacity: 0 }], { duration: 420, easing: "ease-out" }).onfinish = function () { w.remove(); };
    }
    if (!inside && Math.hypot(fp.x - mp.x, fp.y - mp.y) < 2) { fake.hidden = true; stage.classList.remove("nocur"); return; }
    raf = requestAnimationFrame(gustLoop);
  }
  stage.addEventListener("pointermove", function (e) {
    if (running || reduce) return;
    var s = stage.getBoundingClientRect(); mp = { x: e.clientX - s.left, y: e.clientY - s.top };
    var c = owlAt(), dx = mp.x - c.x, dy = mp.y - c.y, near = Math.hypot(dx, dy) < RAD;
    if (e.pointerType === "mouse" && near && !cHold && fake.hidden) { fp.x = mp.x; fp.y = mp.y; fake.hidden = false; stage.classList.add("nocur"); }
    if (!fake.hidden) { if (!raf) raf = requestAnimationFrame(gustLoop); return; }
    if (cHold || document.activeElement === $("pass")) return;
    clerkStill(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 25 : 26) : (dy < 0 ? 27 : 28));
  });
  stage.addEventListener("pointerleave", function () { mp = null; fake.hidden = true; stage.classList.remove("nocur"); blowing = false; if (!cHold && !running) clerkPlay("idle"); });
  $("pass").addEventListener("focus", function () { cHold = true; clerkStill(13); });   /* hat over his eyes: he does not watch you type it */
  $("pass").addEventListener("blur", function () { cHold = false; clerkPlay("idle"); });

  /* ---- the sign-in steps (prototype: nothing leaves the page) ---- */
  function show(n) { ["step1", "step2", "step3"].forEach(function (id, k) { $(id).hidden = k !== n; }); }
  function scold(el, msg) { el.textContent = msg; cHold = true; clerkPlay("alert", true); }
  $("step1").addEventListener("submit", function (e) {
    e.preventDefault();
    var u = $("user").value.trim(), p = $("pass").value;
    if (!u) { scold($("err1"), "Enter your username."); $("user").focus(); return; }
    if (!p) { scold($("err1"), "Enter your password."); $("pass").focus(); return; }
    if (window.CALMS && CALMS.online) {                       /* the real sign-in, through the back end */
      CALMS.api("POST", "/api/auth/login", { username: u, password: p }).then(function (r) {
        $("err1").textContent = ""; if (r.step === "mfa") { show(1); $("code").value = ""; $("code").focus(); cHold = true; clerkPlay("think"); } else admitted(r.user);
      }, function (e) { scold($("err1"), e.message); $("pass").value = ""; $("pass").focus(); });
      return;
    }
    $("err1").textContent = ""; show(1); $("code").value = ""; $("code").focus(); cHold = true; clerkPlay("think");
  });
  function admitted(user) { $("err1").textContent = $("err2").textContent = ""; $("welcome").textContent = "Welcome back, " + user.name.split(" ")[0] + ". Your queue is next."; $("pass").value = ""; show(2); cHold = true; clerkPlay("approve", true); }
  $("step2").addEventListener("submit", function (e) {
    e.preventDefault();
    if (!/^\d{6}$/.test($("code").value.trim())) { scold($("err2"), "The code is 6 digits. Check your authenticator and try again."); $("code").focus(); return; }
    if (window.CALMS && CALMS.online) {
      CALMS.api("POST", "/api/auth/verify", { code: $("code").value.trim() }).then(function (r) { admitted(r.user); }, function (e) { scold($("err2"), e.message); $("code").value = ""; $("code").focus(); });
      return;
    }
    $("err2").textContent = ""; $("welcome").textContent = "Welcome back, " + $("user").value.trim() + ". Your queue is next.";
    $("pass").value = ""; show(2); cHold = true; clerkPlay("approve", true);
  });
  function reset() { $("user").value = $("pass").value = $("code").value = ""; $("err1").textContent = $("err2").textContent = ""; show(0); cHold = false; clerkPlay("idle"); }
  $("back").addEventListener("click", function () { reset(); $("user").focus(); });
  $("again").addEventListener("click", function () { reset(); $("user").focus(); });


  /* ---- impact pieces ---- */
  function buildCrack() {
    var cx = W / 2, cy = H * .55, R = Math.max(W, H), out = "", rays = [];
    for (var i = 0; i < 15; i++) {
      var a = (i / 15) * Math.PI * 2 + (Math.random() - .5) * .3, len = R * (.22 + Math.random() * .5), pts = [[cx, cy]], n = 5;
      for (var j = 1; j <= n; j++) { var r = len * j / n, aa = a + (Math.random() - .5) * .22; pts.push([cx + Math.cos(aa) * r, cy + Math.sin(aa) * r]); }
      rays.push(pts);
      out += '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + "," + p[1].toFixed(1); }).join(" ") + '"/>';
    }
    [1, 2, 3].forEach(function (ring) {
      for (var i = 0; i < 15; i++) { if (Math.random() < .35) continue; var p = rays[i][ring], q = rays[(i + 1) % 15][ring]; out += '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"/>'; }
    });
    crack.setAttribute("viewBox", "0 0 " + W + " " + H);
    crack.innerHTML = '<g fill="none" stroke="#1a0f08" stroke-width="5" opacity=".55" transform="translate(2,2)">' + out + '</g><g fill="none" stroke="#fff6dc" stroke-width="2" stroke-linejoin="bevel">' + out + "</g>";
  }
  function burst() {
    var m = Math.min(W, H);
    for (var i = 0; i < 16; i++) {
      var f = document.createElement("div"); f.className = "f"; bits.appendChild(f);
      var a = Math.random() * Math.PI * 2, d = m * (.18 + Math.random() * .3), x = Math.cos(a) * d, y = Math.sin(a) * d * .7 - m * .08, r = Math.random() * 360;
      anim(f, [{ transform: "translate(0,0) rotate(" + r + "deg) scale(.4)", opacity: 1, easing: "cubic-bezier(.1,.8,.3,1)" },
               { transform: "translate(" + x + "px," + y + "px) rotate(" + (r + 200) + "deg) scale(1)", opacity: 1, offset: .22, easing: "ease-in-out" },
               { transform: "translate(" + (x + 40) + "px," + (y + m * .16) + "px) rotate(" + (r + 150) + "deg) scale(1)", opacity: 1, offset: .6, easing: "ease-in-out" },
               { transform: "translate(" + (x - 30) + "px," + (y + m * .4) + "px) rotate(" + (r + 260) + "deg) scale(1)", opacity: 0 }], { duration: 2400 + Math.random() * 900, easing: "linear" });
    }
    for (var j = 0; j < 9; j++) {
      var p = document.createElement("div"); p.className = "d"; bits.appendChild(p);
      var b = Math.random() * Math.PI * 2, e = m * (.1 + Math.random() * .3);
      anim(p, [{ transform: "translate(0,0) scale(1)", opacity: .8 }, { transform: "translate(" + Math.cos(b) * e + "px," + Math.sin(b) * e * .6 + "px) scale(" + (5 + Math.random() * 7) + ")", opacity: 0 }], { duration: 900 + Math.random() * 500, easing: "ease-out" });
    }
  }
  function shake(px, ms) {
    var k = [{ transform: "translate(0,0)" }];
    for (var i = 0; i < 9; i++) { var f = 1 - i / 9; k.push({ transform: "translate(" + ((Math.random() - .5) * 2 * px * f) + "px," + ((Math.random() - .5) * 2 * px * f) + "px)" }); }
    k.push({ transform: "translate(0,0)" }); anim(stage, k, { duration: ms, fill: "none", easing: "linear" });
  }

  /* ---- the intro ---- */
  function finish(focus) {
    clearAll(); running = false;
    curtL.style.transform = "translateX(-101%)"; curtR.style.transform = "translateX(101%)";
    barT.style.transform = "translateY(-101%)"; barB.style.transform = "translateY(101%)";
    [kuwa, hd, title, flash, crack, grain, sil, tumble, shade].forEach(function (e) { e.style.opacity = 0; });
    fake.hidden = true; stage.classList.remove("nocur"); blowing = false; kuwa.style.transform = "none";
    night.style.opacity = .64; l4g.style.opacity = 1;
    CAM.forEach(function (c, k) { $(c[0]).style.transform = camEnd(k); });
    logoWrap.style.opacity = 1; logoWrap.style.transform = "none"; logoWrap.style.filter = "none";
    card.style.opacity = 1; card.style.transform = "none"; clerk.style.opacity = 1; clerk.style.transform = "none";
    skip.hidden = true; replay.hidden = false; cHold = false; clerkPlay("idle");
    if (focus) $("user").focus({ preventScroll: true });
  }
  function play() {
    clearAll(); running = true; layout();
    var s = 96 * K;
    skip.hidden = false; replay.hidden = true;
    curtL.style.transform = curtR.style.transform = barT.style.transform = barB.style.transform = "none";
    [logoWrap, card, clerk, night, flash, crack, hd, sil, tumble, kuwa, title, shade].forEach(function (e) { e.style.opacity = 0; });
    grain.style.opacity = .5; l4g.style.opacity = .5; kb.style.opacity = 1; kb.style.filter = "none"; ke.style.opacity = 0;
    CAM.forEach(function (c) { $(c[0]).style.transform = "none"; });

    /* 0. title card */
    anim(title, [{ opacity: 0, transform: "scale(.96)" }, { opacity: 1, transform: "scale(1)", offset: .2 }, { opacity: 1, transform: "scale(1.02)", offset: .8 }, { opacity: 0, transform: "scale(1.03)" }], { duration: 2300, easing: "linear" });

    /* 1. first peek: eyes in the dark, then the hat */
    var e1 = W / 2 - s * 0.22, y1 = H * .06, p1 = "translate(" + (-e1) + "px," + y1 + "px) rotate(12deg)";
    at(2500, function () {
      kuwa.style.opacity = 1; kuwa.style.transform = p1; kb.style.opacity = 0; frame(kb, 26, K);
      anim(ke, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
      var u = ke.children, blink = [{ transform: "scaleY(1)" }, { transform: "scaleY(.08)", offset: .5 }, { transform: "scaleY(1)" }];
      at(650, function () { anim(u[0], blink, { duration: 150, fill: "none" }); anim(u[1], blink, { duration: 150, fill: "none" }); });
      at(1000, function () { anim(u[0], blink, { duration: 150, fill: "none" }); anim(u[1], blink, { duration: 150, fill: "none" }); });
    });
    at(3800, function () {
      anim(kb, [{ opacity: 0, filter: "brightness(.15)" }, { opacity: 1, filter: "brightness(1)" }], { duration: 420 });
      anim(ke, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
    });
    at(4550, function () { anim(kuwa, [{ transform: p1 }, { transform: "translate(" + (-e1 - s * 1.2) + "px," + y1 + "px) rotate(12deg)" }], { duration: 260, easing: "ease-in" }); });
    /* 2. second peek: closer, bigger, sizing you up */
    var e2 = W / 2 - s * 0.2, y2 = -H * .04, sc = 1.75;
    at(5000, function () {
      kb.style.opacity = 1; kb.style.filter = "none"; ke.style.opacity = 0; frame(kb, 25, K);
      anim(kuwa, [{ transform: "translate(" + (e2 + s * 2) + "px," + y2 + "px) scale(" + sc + ") rotate(-10deg)", easing: "cubic-bezier(.2,.9,.3,1)" },
                  { transform: "translate(" + e2 + "px," + y2 + "px) scale(" + sc + ") rotate(-10deg)", offset: .22 },
                  { transform: "translate(" + (e2 - s * .08) + "px," + y2 + "px) scale(" + (sc * 1.06) + ") rotate(-7deg)", offset: .8, easing: "ease-in" },
                  { transform: "translate(" + (e2 + s * 2) + "px," + y2 + "px) scale(" + sc + ") rotate(-10deg)" }], { duration: 1500, easing: "linear" });
    });
    at(5450, function () { frame(kb, 3, K); }); at(5560, function () { frame(kb, 25, K); }); at(5800, function () { frame(kb, 24, K); });
    /* 3. the town, and a slow push down the main street */
    at(6600, function () {
      kuwa.style.opacity = 0;
      anim(curtL, [{ transform: "none" }, { transform: "translateX(-101%)" }], { duration: 1100, easing: "cubic-bezier(.7,0,.2,1)" });
      anim(curtR, [{ transform: "none" }, { transform: "translateX(101%)" }], { duration: 1100, easing: "cubic-bezier(.7,0,.2,1)" });
      CAM.forEach(function (c, k) { anim($(c[0]), [{ transform: "translateY(0%) scale(1)" }, { transform: camEnd(k) }], { duration: 6900, easing: "cubic-bezier(.4,0,.5,1)" }); });
      tumble.style.opacity = 1;
      anim(tumble, [{ transform: "translateX(0)" }, { transform: "translateX(" + (scene.clientWidth * 1.15) + "px)" }], { duration: 6500, easing: "linear" });
    });
    /* 4. his shadow crosses the sun */
    at(7900, function () {
      var q = [33, 34, 35, 36], n = 0, U = scene.clientHeight / 180 * 26 / 96;
      sil.style.opacity = 1;
      every(100, function () { n = (n + 1) % 4; sil.style.backgroundPosition = (-FR[q[n]][0] * 96 * U) + "px " + (-FR[q[n]][1] * 96 * U) + "px"; });
      anim(sil, [{ transform: "translate(0,0)", opacity: 0 }, { transform: "translate(" + (scene.clientWidth * .06) + "px," + (-scene.clientHeight * .05) + "px)", opacity: 1, offset: .15 }, { transform: "translate(" + (scene.clientWidth * .3) + "px," + (-scene.clientHeight * .2) + "px)", opacity: 1, offset: .85 }, { transform: "translate(" + (scene.clientWidth * .36) + "px," + (-scene.clientHeight * .26) + "px)", opacity: 0 }], { duration: 1500, easing: "linear" });
    });
    /* 5. his shadow sweeps the rooftops */
    at(9500, function () {
      var sw = scene.clientWidth;
      anim(shade, [{ transform: "translateX(" + (sw * .95) + "px) scale(.8)", opacity: 0 }, { transform: "translateX(" + (sw * .7) + "px) scale(.9)", opacity: .42, offset: .15 }, { transform: "translateX(" + (sw * .2) + "px) scale(1.15)", opacity: .42, offset: .85 }, { transform: "translateX(" + (-sw * .1) + "px) scale(1.25)", opacity: 0 }], { duration: 1150, easing: "cubic-bezier(.3,0,.7,1)" });
    });
    /* 6. he banks round, then dives */
    var big = 256 / s, small = Math.max(.1, 30 / s);
    at(10700, function () {
      var a = TAGS.bank[0], n = 0;
      kb.style.opacity = 1; kb.style.filter = "none"; kuwa.style.opacity = 1; frame(kb, a, K);
      every(80, function () { n = (n + 1) % 4; frame(kb, a + n, K); });
      anim(kuwa, [{ transform: "translate(" + (-W * .34) + "px," + (-H * .2) + "px) scale(" + (small * 1.9) + ") rotate(34deg)", opacity: 0 },
                  { transform: "translate(" + (-W * .2) + "px," + (-H * .32) + "px) scale(" + (small * 1.5) + ") rotate(26deg)", opacity: 1, offset: .25 },
                  { transform: "translate(" + (W * .02) + "px," + (-H * .36) + "px) scale(" + (small * 1.15) + ") rotate(12deg)", opacity: 1, offset: .7 },
                  { transform: "translate(" + (W * .09) + "px," + (-H * .3) + "px) scale(" + small + ") rotate(0deg)", opacity: 1 }], { duration: 1000, easing: "cubic-bezier(.3,0,.6,1)" });
    });
    at(11700, function () {
      var a = TAGS.fly8[0], n = 0;
      ivs.forEach(clearInterval); ivs = []; frame(kb, a, K);
      every(55, function () { n = (n + 1) % 8; frame(kb, a + n, K); });
      anim(kuwa, [{ transform: "translate(" + (W * .09) + "px," + (-H * .3) + "px) scale(" + small + ")" }, { transform: "translate(" + (-W * .03) + "px," + (-H * .12) + "px) scale(" + (big * .4) + ")", offset: .7 }, { transform: "translate(0px," + (-H * .04) + "px) scale(" + big + ")" }], { duration: 950, easing: "cubic-bezier(.5,0,.9,.5)" });
    });
    at(12650, function () {
      var n = 0;
      ivs.forEach(clearInterval); ivs = [];
      kuwa.style.opacity = 0; hd.style.opacity = 1; hd.style.backgroundPosition = "0 0";
      every(45, function () { n = (n + 1) % 8; hd.style.backgroundPosition = (-256 * n) + "px 0"; });
      anim(hd, [{ transform: "translate(0px," + (-H * .04) + "px) scale(1)" }, { transform: "translate(0px," + (H * .12) + "px) scale(" + (Math.max(W, H) / 256 * 2.1) + ")" }], { duration: 520, easing: "cubic-bezier(.6,0,1,.6)" });
    });
    /* 6. impact */
    at(13170, function () {
      hd.style.opacity = 0; ivs.forEach(clearInterval); ivs = [];
      anim(flash, [{ opacity: 1 }, { opacity: 1, offset: .3 }, { opacity: 0 }], { duration: 240, easing: "linear" });
      buildCrack(); crack.style.opacity = 1;
      anim(crack, [{ transform: "scale(.25)", opacity: 1 }, { transform: "scale(1)", opacity: 1 }], { duration: 130, easing: "ease-out" });
      crack.style.transformOrigin = "50% 55%";
      shake(26, 620); burst();
    });
    /* 7. the brand comes down */
    at(13550, function () {
      logoWrap.style.opacity = 1;
      anim(logoWrap, [{ transform: "translateY(20vh) scale(3.4)", opacity: 0, filter: "brightness(2.6) saturate(1.6)", easing: "cubic-bezier(.7,0,1,.6)" },
                      { transform: "translateY(20vh) scale(1.38)", opacity: 1, filter: "brightness(2.6) saturate(1.6)", offset: .3, easing: "cubic-bezier(.2,1.6,.4,1)" },
                      { transform: "translateY(20vh) scale(1.5)", opacity: 1, filter: "brightness(1.5) saturate(1.3)", offset: .55 },
                      { transform: "translateY(20vh) scale(1.5)", opacity: 1, filter: "brightness(1) saturate(1)" }], { duration: 900, easing: "linear" });
      at(270, function () { shake(14, 380); });
      anim(night, [{ opacity: 0 }, { opacity: .3 }], { duration: 600 });
    });
    at(14350, function () { anim(glint, [{ backgroundPosition: "140% 0" }, { backgroundPosition: "-40% 0" }], { duration: 800, easing: "ease-in-out", fill: "none" }); });
    /* the glass heals: cracks draw back into the point he hit */
    at(14450, function () { anim(crack, [{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.03)", opacity: 1, offset: .2, easing: "cubic-bezier(.6,0,.9,.4)" }, { transform: "scale(0)", opacity: .8 }], { duration: 700, easing: "linear" }); });
    /* 8. bars away, dusk falls, the window opens */
    at(15400, function () {
      anim(logoWrap, [{ transform: "translateY(20vh) scale(1.5)" }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.3,0,.2,1)" });
      anim(barT, [{ transform: "none" }, { transform: "translateY(-101%)" }], { duration: 700, easing: "ease-in-out" });
      anim(barB, [{ transform: "none" }, { transform: "translateY(101%)" }], { duration: 700, easing: "ease-in-out" });
      anim(grain, [{ opacity: .5 }, { opacity: 0 }], { duration: 900 });
      anim(night, [{ opacity: .3 }, { opacity: .64 }], { duration: 1500 });
      anim(l4g, [{ opacity: .5 }, { opacity: 1 }], { duration: 1500 });
      card.style.opacity = 1;
      anim(card, [{ transform: "translateY(70px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 700, delay: 150, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
    /* 9. he lands on the window, shakes off the dust, straightens his hat */
    at(16400, function () {
      cHold = true; clearTimeout(cTimer); clerk.style.opacity = 1; frame(clerk, 29, 1);
      anim(clerk, [{ transform: "translateY(-70vh) rotate(-20deg)" }, { transform: "translateY(0) rotate(0deg)" }], { duration: 420, easing: "cubic-bezier(.5,0,1,.7)" });
    });
    at(16820, function () {
      frame(clerk, 16, 1);
      anim(card, [{ transform: "translateY(0)" }, { transform: "translateY(7px)", offset: .3 }, { transform: "translateY(0)" }], { duration: 300, fill: "none" });
      anim(clerk, [{ transform: "rotate(0)" }, { transform: "rotate(-9deg)" }, { transform: "rotate(8deg)" }, { transform: "rotate(-7deg)" }, { transform: "rotate(6deg)" }, { transform: "rotate(0)" }], { duration: 520, delay: 180, fill: "none", easing: "linear" });
    });
    at(17000, function () { frame(clerk, 0, 1); });
    at(17600, function () { frame(clerk, 18, 1); }); at(16020, function () { frame(clerk, 19, 1); }); at(16420, function () { frame(clerk, 18, 1); });
    at(18260, function () { finish(true); try { localStorage.setItem("calmsIntroDay", new Date().toDateString()); } catch (e) {} });
  }
  skip.addEventListener("click", function () { finish(true); });
  replay.addEventListener("click", play);
  document.addEventListener("keydown", function (e) { if (running && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) { e.preventDefault(); finish(true); } });
  window.addEventListener("resize", function () { layout(); if (!running) CAM.forEach(function (c, k) { $(c[0]).style.transform = camEnd(k); }); });

  /* The intro plays every time this page is opened. It is skipped only when you come back
     by signing out (the link ends in #signin), so you are not made to watch it again. */
  var seen = location.hash === "#signin";
  layout(); frame(clerk, 0, 1);
  if (reduce || seen) finish(false); else play();
})();
