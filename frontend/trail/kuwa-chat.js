/* Talk to Kuwa (DRAFT): GR8's assistant, full screen, laid out after emotion-agency.com's EMI. Kuwa is now simply an
   orange orb: no face, no character. The orb lives on the right (it swirls faster and its edge ripples while Kuwa
   speaks or listens); the conversation sits on the left above a box to type in, with a microphone and a send button;
   answers end in little chips you can tap. Light and dark mode share one layout. Answers come from /api/public/kuwa
   (or the common questions answered here when the server can't be reached); Kuwa reads them aloud in a natural
   female voice from the browser. Open with KUWA_CHAT.open() or any [data-kuwa-chat]. The chat is kept for this visit. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var onIndex = !!document.getElementById("gl");
  var hashTo = function (h) { return onIndex ? "#" + h : "index.html#" + h; };
  var GO = { apply: ["Apply now", hashTo("apply")], loans: ["See the loans", hashTo("loans")], calc: ["Work out a loan", hashTo("loans")], track: ["Track my application", hashTo("loans")],
             signin: ["Open My GR8", "signin.html"], downloads: ["Get the staff app", hashTo("talk")], faq: ["Questions", "loans.html#faq"], talk: ["Talk to a person", hashTo("talk")] };
  var CHIPS = ["What loans do you have?", "How much is ₱50,000 for 12 months?", "What papers do I need?", "Where's my application?"];
  var HELLO = "Hey, I'm Kuwa! Ask me anything about GR8 loans, or tap a chip below.";
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, TTS = window.speechSynthesis;
  var log = [], voiceOn = true;
  try { log = JSON.parse(sessionStorage.getItem("kuwa-log") || "[]"); voiceOn = localStorage.getItem("kuwa-voice") !== "off"; } catch (e) {}
  function keep() { try { sessionStorage.setItem("kuwa-log", JSON.stringify(log.slice(-20))); } catch (e) {} }
  var I = {
    voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path class="w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="w2" d="M18 7a7 7 0 0 1 0 10"/><path class="x" d="M16 10l4 4M20 10l-4 4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>'
  };

  /* ---- the page ---- */
  var box = document.createElement("div"); box.className = "kc"; box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Talk to Kuwa");
  box.innerHTML = '<canvas class="kc-orb" aria-hidden="true"></canvas>' +
    '<div class="kc-top"><button type="button" class="kc-ic kc-voice" aria-pressed="true" aria-label="Kuwa\'s voice">' + I.voice + '</button><button type="button" class="kc-ic kc-x" aria-label="Close">' + I.close + "</button></div>" +
    '<div class="kc-left"><div class="kc-log" aria-live="polite"></div>' +
    '<form class="kc-in" autocomplete="off"><button type="button" class="kc-mic" aria-label="Speak to Kuwa">' + I.mic + '</button><input type="text" maxlength="400" placeholder="Ask me anything..." aria-label="Ask Kuwa">' +
    '<button type="submit" class="kc-send" aria-label="Send">' + I.send + "</button></form>" +
    '<p class="kc-note">Kuwa can make mistakes. Loan decisions come only from GR8 staff.</p></div>';
  function mount() { document.body.appendChild(box); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  var logEl = $(".kc-log", box), form = $(".kc-in", box), input = $("input", form), mic = $(".kc-mic", box), send = $(".kc-send", box), vBtn = $(".kc-voice", box), canvas = $(".kc-orb", box);
  if (!SR) mic.hidden = true;
  function setVoice(v) { voiceOn = v; vBtn.setAttribute("aria-pressed", String(v)); try { localStorage.setItem("kuwa-voice", v ? "on" : "off"); } catch (e) {} if (!v) hush(); }
  setVoice(voiceOn);
  vBtn.addEventListener("click", function () { setVoice(!voiceOn); });
  $(".kc-x", box).addEventListener("click", close);
  box.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  /* ---- the words: Kuwa's on the left, yours on the right; chips under Kuwa's last answer ---- */
  function chips(list) {
    var g = document.createElement("div"); g.className = "kc-chips";
    list.forEach(function (c) {
      var isGo = typeof c === "string" && GO[c], el = document.createElement(isGo ? "a" : "button");
      if (isGo) { el.href = GO[c][1]; el.textContent = GO[c][0]; el.addEventListener("click", function () { close(); }); } else { el.type = "button"; el.textContent = c; el.addEventListener("click", function () { ask(c); }); }
      el.className = "kc-chip"; el.insertAdjacentHTML("afterbegin", '<i aria-hidden="true">↳</i>'); g.appendChild(el);
    });
    return g;
  }
  function bubble(m, fresh) {
    var b = document.createElement("div"); b.className = "kc-b " + (m.role === "kuwa" ? "k" : "u") + (fresh ? " new" : "");
    var p = document.createElement("p"); p.textContent = m.text; b.appendChild(p); logEl.appendChild(b);
    while (logEl.children.length > 7) logEl.removeChild(logEl.firstChild); logEl.scrollTop = logEl.scrollHeight; return b;
  }
  function addChips(list) { Array.prototype.forEach.call(logEl.querySelectorAll(".kc-chips"), function (c) { c.remove(); }); if (list && list.length) { logEl.appendChild(chips(list)); logEl.scrollTop = logEl.scrollHeight; } }
  function render() { logEl.textContent = ""; if (!log.length) { bubble({ role: "kuwa", text: HELLO }); addChips(CHIPS); return; } log.slice(-6).forEach(function (m) { bubble(m); }); var last = log[log.length - 1]; addChips(last.role === "kuwa" && last.go && last.go.length ? last.go : CHIPS); }

  /* ---- when the server can't be reached: the common questions, here ---- */
  var LOCAL = [
    [/paper|requirement|document|kailangan|need/i, "Every loan needs a government ID and the signed consent form. A salary loan also asks for pay stubs and a certificate of employment; an SME loan asks for your business registration and permit.", ["apply", "loans"]],
    [/how much|magkano|compute|monthly|calculat|interest|rate|50,?000|50k/i, "A ₱50,000 salary loan over 12 months comes to about ₱4,967 a month, and you receive ₱48,750 after the 2.5% fee. Open any loan in the Loans hall to work out your own numbers.", ["calc", "apply"]],
    [/track|status|where('|’)?s my|nasaan/i, "Open the Loans hall, pick card 04, Approval, and enter your reference with the last four digits of your mobile number. You'll see the step your loan is at.", ["track"]],
    [/pay|bayad|gcash|bank/i, "You can pay at the branch, by bank transfer or through salary deduction. Every payment is posted right away and shows in My GR8.", ["signin"]],
    [/late|penalt|delay/i, "A late payment adds 3% of the late amount for every month or part of a month it stays unpaid. We call you before any penalty.", ["talk"]],
    [/loan|apply|utang|borrow|have/i, "We have salary, personal and SME loans. Applying online takes about ten minutes, you see the whole cost first, and a real person checks every step.", ["apply", "loans"]],
    [/hour|open|branch|address/i, "The Malolos branch is open Monday to Saturday, 8 to 5.", ["talk"]]];
  function local(q) { for (var i = 0; i < LOCAL.length; i++) if (LOCAL[i][0].test(q)) return { reply: LOCAL[i][1], go: LOCAL[i][2] }; return { reply: "I can tell you about our loans, the papers you need, what a loan costs, or how to apply, track and pay. What would you like to know?", go: [] }; }

  /* ---- asking ---- */
  var busy = false, state = "idle";   /* idle | thinking | talking | listening */
  form.addEventListener("submit", function (e) { e.preventDefault(); if (state === "talking" || state === "thinking") { hush(); return; } ask(input.value); });
  function ask(q) {
    q = String(q || "").trim(); if (!q || busy) return; hush(); input.value = ""; busy = true; addChips([]);
    log.push({ role: "user", text: q }); bubble(log[log.length - 1], true); keep();
    var dots = bubble({ role: "kuwa", text: "Let me check..." }, true); dots.classList.add("dots"); setState("thinking");
    fetch("/api/public/kuwa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: log.slice(-10).map(function (m) { return { role: m.role, text: m.text }; }) }) })
      .then(function (r) { return r.json().then(function (d) { if (r.status === 429) { var e = new Error(d.error); e.say = true; throw e; } if (!r.ok || !d.reply) throw new Error("bad"); return d; }); })
      .catch(function (err) { if (err.say) return { reply: err.message, go: [] }; return local(q); })
      .then(function (d) { dots.remove(); var m = { role: "kuwa", text: d.reply, go: d.go || [] }; log.push(m); keep(); bubble(m, true); addChips(m.go.length ? m.go : CHIPS.filter(function (c) { return c !== q; }).slice(0, 3)); speak(d.reply); })
      .then(function () { busy = false; });
  }

  /* ---- her voice: a natural female voice from the browser, calm and clear (the "natural"/neural voices first) ---- */
  var voice = null;
  function pickVoice() { if (!TTS) return; var vs = TTS.getVoices(); if (!vs.length) return; voice = null;
    var want = [/Microsoft (Aria|Jenny|Ava|Emma|Michelle|Sonia|Libby|Natasha|Clara|Rosa|Blessica).*(Online|Natural)/i, /Google UK English Female/i, /Microsoft (Aria|Jenny|Zira|Hazel|Susan|Catherine|Linda|Heera)/i,
      /Samantha|Karen|Moira|Tessa|Serena|Victoria|Fiona|Ava|Allison|Susan/i, /Google US English/i, /female|woman/i];
    for (var i = 0; i < want.length && !voice; i++) voice = vs.filter(function (v) { return want[i].test(v.name) && /^en/i.test(v.lang); })[0] || null;
    if (!voice) voice = vs.filter(function (v) { return /^en/i.test(v.lang) && !/male|david|mark|guy|ryan|james|daniel|fred|alex/i.test(v.name); })[0] || null; }
  if (TTS) { pickVoice(); TTS.onvoiceschanged = pickVoice; }
  var pulse = 0, keepAlive = 0;
  function speak(text) {
    if (!voiceOn || !TTS) { setState("idle"); return; }
    var u = new SpeechSynthesisUtterance(text); if (voice) { u.voice = voice; u.lang = voice.lang; } u.rate = 1; u.pitch = 1.04; u.volume = 1;
    u.onstart = function () { setState("talking"); }; u.onboundary = function () { pulse = 1; };
    u.onend = u.onerror = function () { setState("idle"); };
    TTS.cancel(); setState("talking"); clearInterval(keepAlive);
    setTimeout(function () { TTS.speak(u); if (TTS.paused) TTS.resume(); }, 80);       /* Chrome drops a speak() right after cancel() */
    keepAlive = setInterval(function () { if (!TTS.speaking) { clearInterval(keepAlive); return; } TTS.pause(); TTS.resume(); }, 9000);
    setTimeout(function () { if (state === "talking" && !TTS.speaking) setTimeout(function () { if (state === "talking" && !TTS.speaking) setState("idle"); }, Math.min(6000, text.length * 55)); }, 1200);
  }
  function hush() { if (TTS) TTS.cancel(); if (state === "talking") setState("idle"); }

  /* ---- listening: the browser's speech recognition (Chrome, Edge, Safari) ---- */
  var rec = null;
  mic.addEventListener("click", function () {
    if (rec) { rec.stop(); return; } hush();
    rec = new SR(); rec.lang = "en-PH"; rec.interimResults = true; rec.maxAlternatives = 1;
    var final = "";
    rec.onresult = function (e) { var t = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript; else t += e.results[i][0].transcript; } input.value = final + t; pulse = .7; };
    rec.onend = function () { rec = null; mic.classList.remove("on"); setState("idle"); if (final.trim()) ask(final); };
    rec.onerror = function (e) { if (e.error === "not-allowed") input.placeholder = "Allow the microphone to talk to Kuwa"; };
    try { rec.start(); mic.classList.add("on"); setState("listening"); input.value = ""; input.placeholder = "Listening..."; } catch (e) { rec = null; }
  });
  function setState(s) { state = s; box.dataset.state = s; var stop = s === "talking" || s === "thinking"; send.classList.toggle("stop", stop); send.setAttribute("aria-label", stop ? "Stop" : "Send"); if (s !== "listening") input.placeholder = "Ask me anything..."; }

  /* ---- the orb: a glassy orange sphere with warm light swirling inside, a soft aura, and a bright rim. Faceless. ---- */
  var cx = canvas.getContext("2d"), raf = 0, energy = .2, spin = 0, dark = false;
  function size() { var d = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * d; canvas.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  function blob(x, y, r, amp, t, k, col, blur) {
    cx.save(); cx.filter = "blur(" + blur + "px)"; cx.beginPath();
    for (var i = 0; i <= 72; i++) { var a = i / 72 * Math.PI * 2, w = 1 + amp * (Math.sin(a * 3 + t * 1.3 + k) * .5 + Math.sin(a * 5 - t * 1.7 + k * 2) * .3 + Math.sin(a * 2 + t * .7) * .2), px = x + Math.cos(a) * r * w, py = y + Math.sin(a) * r * w; if (i) cx.lineTo(px, py); else cx.moveTo(px, py); }
    cx.fillStyle = col; cx.fill(); cx.restore();
  }
  function draw(t) {
    t /= 1000; dark = document.documentElement.classList.contains("dark");
    var W = innerWidth, H = innerHeight, small = W < 760, x = small ? W / 2 : W * .773, y = small ? H * .25 : H * .5, R = small ? Math.min(W * .3, H * .16) : Math.min(W * .17, H * .34);
    var target = state === "talking" ? .55 + pulse * .45 : state === "listening" ? .45 + pulse * .4 : state === "thinking" ? .4 : .16;
    energy += (target - energy) * .08; pulse *= .9; spin += (state === "thinking" ? .03 : state === "talking" ? .016 : .006);
    cx.clearRect(0, 0, W, H);
    /* the aura: soft, uneven, wobbling more with energy */
    cx.globalCompositeOperation = dark ? "lighter" : "source-over";
    blob(x, y, R * 1.2, .05 + energy * .12, t, 0, dark ? "rgba(200,70,20,.55)" : "rgba(240,140,70,.45)", R * .16);
    blob(x - R * .08, y, R * 1.12, .05 + energy * .1, t * 1.15, 2, dark ? "rgba(255,150,60,.45)" : "rgba(255,180,110,.45)", R * .1);
    blob(x + R * .1, y - R * .06, R * 1.08, .04 + energy * .08, -t * .9, 4, dark ? "rgba(255,210,150,.35)" : "rgba(255,215,170,.5)", R * .07);
    cx.globalCompositeOperation = "source-over";
    /* the sphere: a warm gradient with light swirling inside it */
    cx.save(); cx.beginPath(); cx.arc(x, y, R, 0, 6.283); cx.clip();
    var base = cx.createRadialGradient(x - R * .3, y - R * .35, R * .05, x, y, R * 1.05); base.addColorStop(0, "#ffeede"); base.addColorStop(.35, "#ffc495"); base.addColorStop(.7, "#f58f52"); base.addColorStop(1, "#cf5d30"); cx.fillStyle = base; cx.fillRect(x - R, y - R, R * 2, R * 2);
    cx.globalCompositeOperation = "lighter"; cx.filter = "blur(" + R * .14 + "px)";
    var COLS = ["rgba(255,240,228,.32)", "rgba(255,120,70,.38)", "rgba(255,110,140,.26)", "rgba(255,200,150,.3)", "rgba(255,255,255,.18)"];
    for (var s = 0; s < 5; s++) { var a = spin * (s % 2 ? -1.3 : 1) + s * 1.26 + Math.sin(t * .5 + s) * .6, rr = R * (.35 + (s % 3) * .12), sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr * .85;
      cx.fillStyle = COLS[s]; cx.beginPath(); cx.ellipse(sx, sy, R * (.42 + energy * .12), R * (.24 + energy * .08), a + t * .2, 0, 6.283); cx.fill(); }
    cx.filter = "none";
    /* a curling band of light through the middle, like the reference's swirl */
    cx.filter = "blur(" + R * .05 + "px)"; cx.strokeStyle = "rgba(255,236,222," + (.22 + energy * .25) + ")"; cx.lineWidth = R * .1; cx.beginPath();
    for (var k = 0; k <= 40; k++) { var u = k / 40, ax = x - R * .9 + u * R * 1.8, ay = y + Math.sin(u * 3.2 + t * .8 + spin) * R * .28 * (1 - Math.abs(u - .5)); if (k) cx.lineTo(ax, ay); else cx.moveTo(ax, ay); } cx.stroke(); cx.filter = "none";
    /* glass: a shadow at the bottom, a highlight at the top */
    cx.globalCompositeOperation = "source-over";
    var sh = cx.createRadialGradient(x, y + R * .2, R * .5, x, y, R * 1.02); sh.addColorStop(0, "rgba(120,30,10,0)"); sh.addColorStop(1, "rgba(120,30,10,.35)"); cx.fillStyle = sh; cx.fillRect(x - R, y - R, R * 2, R * 2);
    var hl = cx.createRadialGradient(x + R * .05, y - R * .42, 0, x + R * .05, y - R * .42, R * .32); hl.addColorStop(0, "rgba(255,255,255,.9)"); hl.addColorStop(1, "rgba(255,255,255,0)"); cx.fillStyle = hl; cx.fillRect(x - R, y - R, R * 2, R * 2);
    cx.restore();
    /* the bright rim, breathing with her voice */
    cx.save(); cx.globalCompositeOperation = dark ? "lighter" : "source-over"; cx.filter = "blur(2px)"; cx.lineWidth = R * .035; cx.strokeStyle = "rgba(255,236,215," + (.6 + energy * .35) + ")"; cx.beginPath(); cx.arc(x, y, R * .985, 0, 6.283); cx.stroke(); cx.restore();
    raf = requestAnimationFrame(draw);
  }

  /* ---- open and close ---- */
  var lastFocus = null, greeted = false;
  function open() {
    if (!box.isConnected) mount();
    if (!greeted && !log.length) { greeted = true; setTimeout(function () { speak(HELLO); }, 450); }
    lastFocus = document.activeElement; box.hidden = false; size(); render();
    requestAnimationFrame(function () { box.classList.add("on"); document.documentElement.classList.add("kc-open"); input.focus({ preventScroll: true }); });
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
  }
  function close() { hush(); if (rec) rec.abort(); box.classList.remove("on"); document.documentElement.classList.remove("kc-open"); setTimeout(function () { box.hidden = true; cancelAnimationFrame(raf); }, 400); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  addEventListener("resize", function () { if (!box.hidden) size(); });
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-kuwa-chat]"); if (t) { e.preventDefault(); e.stopImmediatePropagation(); open(); } }, true);
  window.KUWA_CHAT = { open: open, close: close, ask: function (q) { open(); ask(q); } };
})();

/* The orb on every page: hovering it dims the surroundings toward the edges (a vignette centred on the orb). */
(function () {
  var vig = document.createElement("div"); vig.className = "orb-vig"; vig.setAttribute("aria-hidden", "true");
  function add() { if (!vig.isConnected) document.body.appendChild(vig); }
  document.addEventListener("pointerover", function (e) {
    var o = e.target.closest && e.target.closest(".orbx"); if (!o || (e.relatedTarget && o.contains(e.relatedTarget))) return;
    add(); var r = o.getBoundingClientRect(); vig.style.setProperty("--ox", (r.left + r.width / 2) + "px"); vig.style.setProperty("--oy", (r.top + r.height / 2) + "px");
    requestAnimationFrame(function () { requestAnimationFrame(function () { vig.classList.add("on"); }); });   /* two frames, so the fade always runs */
  });
  document.addEventListener("pointerout", function (e) { var o = e.target.closest && e.target.closest(".orbx"); if (o && !(e.relatedTarget && o.contains(e.relatedTarget))) vig.classList.remove("on"); });
})();
