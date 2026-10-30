/* Talk to Kuwa (DRAFT): GR8's assistant, full screen, laid out after emotion-agency.com's EMI chat (an original build).
   Kuwa is an orange orb on the right (it swirls faster and its edge ripples while Kuwa speaks or listens); the
   conversation sits on the left above a long glowing input with a microphone and a send button. Kuwa's answers type
   themselves out in step with her voice (no typing sounds); with the voice off they type at a reading pace.
   Answers come from /api/public/kuwa (Gemini on the server; the common questions are answered here when the server
   can't be reached). When a question needs a person, Kuwa offers a live agent: after a first name, the screen turns
   into a live chat with GR8 staff (/api/public/live, answered from pages/live-chat.html), and the orb gives way to the
   agent's card. Open with KUWA_CHAT.open() or any [data-kuwa-chat]. The chat is kept for this visit. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var onIndex = !!document.getElementById("gl");
  var hashTo = function (h) { return onIndex ? "#" + h : "index.html#" + h; };
  var GO = { apply: ["Apply now", hashTo("apply")], loans: ["See the loans", hashTo("loans")], calc: ["Work out a loan", hashTo("loans")], track: ["Track my application", hashTo("loans")],
             signin: ["Open My GR8", "signin.html"], downloads: ["Get the staff app", hashTo("talk")], faq: ["Questions", "loans.html#faq"], talk: ["Leave my number instead", hashTo("talk")] };
  var START = [["Our loans", "What loans do you have?"], ["Requirements", "What papers do I need?"], ["Pricing", "How much does a loan cost?"], ["Contact team", "live"]];   /* [label, what it asks] */
  var FOLLOW = ["What loans do you have?", "How much is ₱50,000 for 12 months?", "What papers do I need?"];
  var HELLO = "Hey, I'm Kuwa! Ask me anything or tap a chip below.";
  var LIVE_CHIP = "Talk to a live agent";
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, TTS = window.speechSynthesis;
  var log = [], voiceOn = true, live = null, mode = "kuwa";   /* mode: kuwa | name (asking a first name) | live */
  try { log = JSON.parse(sessionStorage.getItem("kuwa-log") || "[]"); voiceOn = localStorage.getItem("kuwa-voice") !== "off"; live = JSON.parse(sessionStorage.getItem("kuwa-live") || "null"); } catch (e) {}
  if (live && live.id && live.token) mode = "live"; else live = null;
  function keep() { try { sessionStorage.setItem("kuwa-log", JSON.stringify(log.slice(-20))); sessionStorage.setItem("kuwa-live", JSON.stringify(live)); } catch (e) {} }
  var I = {
    voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path class="w1" d="M15.5 9.2a4 4 0 0 1 0 5.6"/><path class="w2" d="M18 7a7 7 0 0 1 0 10"/><path class="x" d="M16 10l4 4M20 10l-4 4"/></svg>',
    small: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4v6h6M10 20v-6H4M14 10l6-6M10 14l-6 6"/></svg>',
    big: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4h5v5M9 20H4v-5M20 4l-6 6M4 20l6-6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    person: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6"/><path d="M4.8 20c.9-3.6 3.8-5.6 7.2-5.6s6.3 2 7.2 5.6"/></svg>'
  };

  /* ---- the page ---- */
  var box = document.createElement("div"); box.className = "kc"; box.hidden = true; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true"); box.setAttribute("aria-label", "Talk to Kuwa");
  box.innerHTML = '<canvas class="kc-orb" aria-hidden="true"></canvas>' +
    '<div class="kc-agent" aria-live="polite"><div class="kc-ring"></div><div class="kc-face"><div class="kc-av">' + I.person + '</div><div class="kc-an">GR8 Lending</div><div class="kc-as">Finding someone for you</div></div></div>' +
    '<button type="button" class="kc-title" aria-label="Make the chat big again"><i class="kc-dot" aria-hidden="true"></i><b>Kuwa</b><span>GR8\'s guide</span></button>' +
    '<div class="kc-top"><button type="button" class="kc-end">End chat</button><button type="button" class="kc-ic kc-min" aria-label="Make the chat small" title="Keep chatting in a small window">' + I.small + '</button><button type="button" class="kc-ic kc-voice" aria-pressed="true" aria-label="Kuwa\'s voice">' + I.voice + '</button><button type="button" class="kc-ic kc-x" aria-label="Close">' + I.close + "</button></div>" +
    '<div class="kc-left"><div class="kc-log" aria-live="polite"></div><div class="kc-start" hidden></div>' +
    '<form class="kc-in" autocomplete="off"><button type="button" class="kc-mic" aria-label="Speak to Kuwa">' + I.mic + '</button><input type="text" maxlength="400" placeholder="Ask me anything..." aria-label="Ask Kuwa">' +
    '<button type="submit" class="kc-send idle" aria-label="Send">' + I.send + "</button></form></div>";
  function mount() { document.body.appendChild(box); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);
  var logEl = $(".kc-log", box), startEl = $(".kc-start", box), form = $(".kc-in", box), input = $("input", form), mic = $(".kc-mic", box), send = $(".kc-send", box), vBtn = $(".kc-voice", box), canvas = $(".kc-orb", box);
  var agentEl = $(".kc-agent", box), agentName = $(".kc-an", box), agentStatus = $(".kc-as", box), agentAv = $(".kc-av", box);
  if (!SR) mic.hidden = true;
  function setVoice(v) { voiceOn = v; vBtn.setAttribute("aria-pressed", String(v)); try { localStorage.setItem("kuwa-voice", v ? "on" : "off"); } catch (e) {} if (!v) hush(); }
  setVoice(voiceOn);
  vBtn.addEventListener("click", function () { setVoice(!voiceOn); });
  $(".kc-x", box).addEventListener("click", close);
  /* small: the chat keeps going in a window in the corner (a sheet at the bottom on a phone), so the page stays in view
     and can be scrolled and used; it stays small from page to page during the visit, until made big or closed */
  var mini = false, minBtn = $(".kc-min", box), titleEl = $(".kc-title", box);
  try { mini = sessionStorage.getItem("kuwa-win") === "mini"; } catch (e) {}
  function setMini(v) {
    mini = !!v; box.classList.toggle("mini", mini); box.setAttribute("aria-modal", String(!mini));
    minBtn.innerHTML = mini ? I.big : I.small; minBtn.setAttribute("aria-label", mini ? "Make the chat big again" : "Make the chat small"); minBtn.title = mini ? "Full screen" : "Keep chatting in a small window";
    if (box.classList.contains("on")) document.documentElement.classList.toggle("kc-open", !mini);
    document.documentElement.classList.toggle("kc-mini", mini && !box.hidden);
    cancelAnimationFrame(raf); if (!mini && !box.hidden) raf = requestAnimationFrame(draw);   /* the big orb only draws when it shows */
    try { if (mini) sessionStorage.setItem("kuwa-win", "mini"); else sessionStorage.removeItem("kuwa-win"); } catch (e) {}
    scrollDown();
  }
  minBtn.addEventListener("click", function () { setMini(!mini); if (!mini) input.focus({ preventScroll: true }); });
  titleEl.addEventListener("click", function () { if (mini) { setMini(false); input.focus({ preventScroll: true }); } });
  new MutationObserver(function () { $("b", titleEl).textContent = mode === "live" ? agentName.textContent : "Kuwa"; $("span", titleEl).textContent = mode === "live" ? agentStatus.textContent : "GR8's guide"; })
    .observe(agentEl, { childList: true, subtree: true, characterData: true });
  $(".kc-end", box).addEventListener("click", endLive);
  box.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (mini) close(); else setMini(true); } });   /* Esc: big to small, small to closed */
  input.addEventListener("input", function () { if (state === "idle") send.classList.toggle("idle", !input.value.trim()); });

  /* ---- the words: Kuwa's on the left, yours on the right ---- */
  function chipEl(c) {
    var isGo = typeof c === "string" && GO[c], el = document.createElement(isGo ? "a" : "button");
    if (c === "live") { el.type = "button"; el.textContent = LIVE_CHIP; el.className = "kc-chip live"; el.addEventListener("click", askName); }
    else if (c === "back") { el.type = "button"; el.textContent = "Back to Kuwa"; el.className = "kc-chip"; el.addEventListener("click", leaveLive); }
    else if (isGo) { el.href = GO[c][1]; el.textContent = GO[c][0]; el.className = "kc-chip"; el.addEventListener("click", function () { close(); }); }
    else { el.type = "button"; el.textContent = c; el.className = "kc-chip"; el.addEventListener("click", function () { ask(c); }); }
    return el;
  }
  function chips(list) { var g = document.createElement("div"); g.className = "kc-chips"; list.forEach(function (c) { var el = chipEl(c); el.insertAdjacentHTML("afterbegin", '<i aria-hidden="true">↳</i>'); g.appendChild(el); }); return g; }
  function startChips(on) { startEl.textContent = ""; startEl.hidden = !on; if (on) START.forEach(function (c) { var el = chipEl(c[1]); el.textContent = c[0]; startEl.appendChild(el); }); }
  function scrollDown() { logEl.scrollTop = logEl.scrollHeight; }
  function bubble(m, fresh) {
    var b = document.createElement("div"); b.className = "kc-b " + (m.role === "user" || m.role === "visitor" ? "u" : "k") + (m.role === "agent" ? " agent" : "") + (fresh ? " new" : "");
    if (m.who) { var w = document.createElement("span"); w.className = "kc-who"; w.textContent = m.who; b.appendChild(w); }
    var p = document.createElement("p"); p.textContent = m.text; b.appendChild(p); logEl.appendChild(b);
    while (logEl.children.length > 40) logEl.removeChild(logEl.firstChild); scrollDown(); return b;
  }
  function sysLine(text, fresh) { var s = document.createElement("div"); s.className = "kc-sys" + (fresh ? " new" : ""); s.textContent = text; logEl.appendChild(s); scrollDown(); }
  function addChips(list) { Array.prototype.forEach.call(logEl.querySelectorAll(".kc-chips"), function (c) { c.remove(); }); if (list && list.length) { logEl.appendChild(chips(list)); scrollDown(); } }
  function chipsFor(m) { return (m.human ? ["live"] : []).concat(m.go || []).slice(0, 3); }
  function render() {
    finishTyping(); logEl.textContent = "";
    if (mode === "live") { renderLive(); return; }
    if (!log.length) { bubble({ role: "kuwa", text: HELLO }); startChips(true); return; }
    startChips(false); log.slice(-8).forEach(function (m) { bubble(m); });
    var last = log[log.length - 1]; addChips(last.role === "kuwa" ? (chipsFor(last).length ? chipsFor(last) : FOLLOW) : []);
  }

  /* ---- the typewriter: Kuwa's words appear as she says them. The whole answer is laid out at once (each word hidden),
     so the bubble has its final size from the start and nothing re-wraps or jumps; then each word fades in. With her
     voice on, a word shows when the browser says she is speaking it (or, for voices that don't say, at her speaking
     pace); with the voice off, at a quick reading pace. Only a class changes per word, so it stays smooth. ---- */
  var typing = null;
  function typeOut(p, text, done) {
    finishTyping();
    var t = { p: p, text: text, shown: 0, target: 0, mode: "timer", cps: 60, last: performance.now(), done: done, words: [], next: 0 }; typing = t;
    p.textContent = ""; p.classList.add("tw");
    var re = /\S+\s*/g, m; while ((m = re.exec(text))) { var w = document.createElement("span"); w.className = "w"; w.textContent = m[0]; p.appendChild(w); t.words.push({ el: w, at: m.index }); }
    scrollDown();
    function frame(now) {
      if (typing !== t) return;
      var dt = Math.min(.1, (now - t.last) / 1000); t.last = now;
      if (t.mode === "timer" || t.mode === "end") t.target = Math.min(text.length, t.target + dt * (t.mode === "end" ? 90 : t.cps));
      t.shown = t.target;
      while (t.next < t.words.length && t.words[t.next].at <= t.shown) { t.words[t.next].el.classList.add("on"); t.next++; pulse = Math.max(pulse, .6); }
      if (t.next >= t.words.length) { setTimeout(function () { if (typing === t) finishTyping(); }, 260); return; }   /* let the last word finish fading in */
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame); return t;
  }
  function finishTyping() { var t = typing; if (!t) return; typing = null; t.words.forEach(function (w) { w.el.classList.add("on"); }); if (t.done) t.done(); }
  function wordEnd(text, i) { var m = /\s/.exec(text.slice(i)); return m ? i + m.index : text.length; }
  /* Kuwa says something: a bubble that types itself out with her voice, then its chips */
  function kuwaSay(text, after, opts) {
    var b = bubble({ role: "kuwa", text: "" }, true), t = typeOut($("p", b), text, after);
    if (voiceOn && TTS && !(opts && opts.quiet)) { t.mode = "wait"; speak(text, t); } else { t.cps = 60; setState("idle"); }
    return b;
  }

  /* ---- when the server can't be reached: the common questions, here ---- */
  var LOCAL = [
    [/\b(agent|human|person|tao|representative|someone|complain|reklamo|problem|dispute|refund|my (loan|account|balance|payment|application))\b/i, "Someone from the GR8 team can help you with that.", [], true],
    [/paper|requirement|document|kailangan|need/i, "Every loan needs a government ID and the signed consent form. A salary loan also asks for pay stubs and a certificate of employment; an SME loan asks for your business registration and permit.", ["apply", "loans"]],
    [/how much|magkano|compute|monthly|calculat|interest|rate|50,?000|50k/i, "A ₱50,000 salary loan over 12 months comes to about ₱4,967 a month, and you receive ₱48,750 after the 2.5% fee. Open any loan in the Loans hall to work out your own numbers.", ["calc", "apply"]],
    [/track|status|where('|’)?s my|nasaan/i, "Open the Loans hall, pick card 04, Approval, and enter your reference with the last four digits of your mobile number. You'll see the step your loan is at.", ["track"]],
    [/pay|bayad|gcash|bank/i, "You can pay at the branch, by bank transfer or through salary deduction. Every payment is posted right away and shows in My GR8.", ["signin"]],
    [/late|penalt|delay/i, "A late payment adds 3% of the late amount for every month or part of a month it stays unpaid. We call you before any penalty.", []],
    [/loan|apply|utang|borrow|have/i, "We have salary, personal and SME loans. Applying online takes about ten minutes, you see the whole cost first, and a real person checks every step.", ["apply", "loans"]],
    [/hour|open|branch|address/i, "The Malolos branch is open Monday to Saturday, 8 to 5.", []]];
  function local(q) { for (var i = 0; i < LOCAL.length; i++) if (LOCAL[i][0].test(q)) return { reply: LOCAL[i][1], go: LOCAL[i][2], human: !!LOCAL[i][3] }; return { reply: "I can tell you about our loans, the papers you need, what a loan costs, or how to apply, track and pay. What would you like to know?", go: [] }; }

  /* ---- asking ---- */
  var busy = false, state = "idle";   /* idle | thinking | talking | listening */
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (mode !== "live" && !input.value.trim() && (state === "talking" || state === "thinking" || typing)) { hush(); finishTyping(); return; }   /* the button is a stop button while Kuwa talks */
    if (mode === "name") { gotName(input.value); return; }
    if (mode === "live") { liveSend(input.value); return; }
    ask(input.value);
  });
  function userSays(q) { input.value = ""; send.classList.add("idle"); startChips(false); addChips([]); log.push({ role: "user", text: q }); bubble(log[log.length - 1], true); keep(); }
  function ask(q) {
    q = String(q || "").trim(); if (!q || busy) return; hush(); finishTyping(); busy = true; userSays(q);
    var dots = bubble({ role: "kuwa", text: "Thinking" }, true); dots.classList.add("dots"); setState("thinking");
    fetch("/api/public/kuwa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: log.slice(-10).map(function (m) { return { role: m.role, text: m.text }; }) }) })
      .then(function (r) { return r.json().then(function (d) { if (r.status === 429) { var e = new Error(d.error); e.say = true; throw e; } if (!r.ok || !d.reply) throw new Error("bad"); return d; }); })
      .catch(function (err) { if (err.say) return { reply: err.message, go: [] }; return local(q); })
      .then(function (d) {
        dots.remove(); var m = { role: "kuwa", text: d.reply, go: d.go || [], human: !!d.human }; log.push(m); keep(); busy = false;
        kuwaSay(m.text, function () { var c = chipsFor(m); addChips(c.length ? c : FOLLOW.filter(function (x) { return x !== q; }).slice(0, 3)); });
      });
  }

  /* ---- handing over to a person: a first name, then a live chat with GR8 staff ---- */
  function askName() {
    if (busy) return; hush(); finishTyping(); startChips(false); addChips([]); mode = "name";
    var text = "Sure! I'll bring in someone from the GR8 team. What's your first name, so they know who they're talking to?";
    log.push({ role: "kuwa", text: text }); keep(); kuwaSay(text, function () { input.placeholder = "Your first name..."; input.focus({ preventScroll: true }); });
    input.placeholder = "Your first name...";
  }
  function gotName(v) {
    var name = String(v || "").replace(/[<>]/g, "").trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 40); if (!name || busy) return;
    busy = true; userSays(name); input.placeholder = "Ask me anything...";
    fetch("/api/public/live", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name, transcript: log.slice(-12).map(function (m) { return { role: m.role, text: m.text }; }) }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok || !d.id) { var e = new Error(d.error || "bad"); e.say = !!d.error; throw e; } return d; }); })
      .then(function (d) {
        busy = false; live = { id: d.id, token: d.token, name: name, after: 0, msgs: [], status: "waiting", agent: null, since: Date.now(), offered: false };
        var bye = "Thanks, " + name + "! Connecting you now.";
        log.push({ role: "kuwa", text: bye }); keep();
        kuwaSay(bye, function () { setTimeout(function () { mode = "live"; keep(); enterLive(true); }, 700); });
      })
      .catch(function (err) {
        busy = false; mode = "kuwa";
        var text = err.say ? err.message : "I can't reach the team right now. Leave your number and someone from GR8 will call you back.";
        log.push({ role: "kuwa", text: text, go: ["talk"] }); keep(); kuwaSay(text, function () { addChips(["talk"]); });
      });
  }
  function enterLive(fresh) {
    hush(); finishTyping(); liveAt = performance.now(); box.classList.add("live"); box.setAttribute("aria-label", "Live chat with GR8 Lending");
    input.placeholder = "Message GR8..."; mic.hidden = true;
    if (fresh) { logEl.style.transition = "opacity .35s"; logEl.style.opacity = "0"; setTimeout(function () { render(); logEl.style.opacity = "1"; }, 380); } else render();
    agentCard(); poll();
  }
  function renderLive() {
    shownAgent = null; startChips(false); sysLine("Live chat with GR8 Lending");
    live.msgs.forEach(function (m) { showLive(m, false); });
    if (live.status === "closed") addChips(["back"]);
  }
  var shownAgent = null;
  function showLive(m, fresh) {
    if (m.sender === "system") { sysLine(m.text, fresh); return; }
    var mineMsg = m.sender === "visitor", who = !mineMsg && live.agent && shownAgent !== live.agent ? live.agent + " · GR8 Lending" : null;
    if (!mineMsg) shownAgent = live.agent; else shownAgent = null;
    bubble({ role: mineMsg ? "visitor" : "agent", text: m.text, who: who }, fresh);
  }
  function initials(n) { return String(n || "").replace(/[^A-Za-z\s.]/g, "").split(/[\s.]+/).filter(Boolean).map(function (w) { return w[0]; }).join("").slice(0, 2).toUpperCase(); }
  function agentCard() {
    if (!live) return; agentEl.dataset.s = live.status;
    if (live.agent) { agentName.textContent = live.agent; agentAv.textContent = initials(live.agent) || "GR8"; } else { agentName.textContent = "GR8 Lending"; agentAv.innerHTML = I.person; }
    agentStatus.textContent = live.status === "waiting" ? "Finding someone for you" : live.status === "closed" ? "Chat ended" : live.agentHere === false ? "Away for a moment" : "Online now";
  }
  var pollT = 0, pending = [], liveAt = 0;
  function poll() {
    clearTimeout(pollT); if (!live || mode !== "live") return;
    fetch("/api/public/live/" + live.id + "?token=" + encodeURIComponent(live.token) + "&after=" + (live.after || 0))
      .then(function (r) { return r.json().then(function (d) { if (r.status === 404) { var e = new Error("gone"); e.gone = true; throw e; } if (!r.ok) throw new Error("bad"); return d; }); })
      .then(function (d) {
        var wasClosed = live.status === "closed"; live.status = d.status; live.agent = d.agent; live.agentHere = d.agentHere;
        (d.messages || []).forEach(function (m) {
          live.after = Math.max(live.after, m.id);
          if (m.sender === "visitor") { var k = pending.indexOf(m.text); if (k >= 0) { pending.splice(k, 1); live.msgs.push(m); return; } }
          live.msgs.push(m); if (!box.hidden) showLive(m, true);
        });
        if (live.msgs.length > 200) live.msgs = live.msgs.slice(-200);
        if (live.status === "waiting" && !live.offered && Date.now() - live.since > 120000) { live.offered = true; if (!box.hidden) { sysLine("Everyone is busy right now. You can keep waiting, or leave your number and we'll call you back.", true); addChips(["talk"]); } }
        if (live.status === "closed" && !wasClosed && !box.hidden) addChips(["back"]);
        keep(); agentCard();
        if (live.status !== "closed") pollT = setTimeout(poll, box.hidden ? 6000 : 2000);
      })
      .catch(function (e) { if (e.gone) { live.status = "closed"; keep(); agentCard(); if (!box.hidden) { sysLine("This chat has ended.", true); addChips(["back"]); } return; } pollT = setTimeout(poll, 5000); });
  }
  function liveSend(v) {
    var text = String(v || "").trim(); if (!text || !live) return;
    if (live.status === "closed") { addChips(["back"]); return; }
    input.value = ""; send.classList.add("idle"); addChips([]); pending.push(text); bubble({ role: "visitor", text: text }, true); shownAgent = null;
    fetch("/api/public/live/" + live.id + "/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: live.token, text: text }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || "Your message didn't go through. Try again."); }); })
      .then(function () { clearTimeout(pollT); pollT = setTimeout(poll, 400); })
      .catch(function (e) { var k = pending.indexOf(text); if (k >= 0) pending.splice(k, 1); sysLine(e.message, true); });
  }
  function endLive() {
    if (!live) { leaveLive(); return; }
    if (live.status === "closed") { leaveLive(); return; }
    fetch("/api/public/live/" + live.id + "/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: live.token }) }).catch(function () {})
      .then(function () { clearTimeout(pollT); poll(); });
  }
  function leaveLive() {
    clearTimeout(pollT); live = null; mode = "kuwa"; pending = []; shownAgent = null; keep();
    box.classList.remove("live"); box.setAttribute("aria-label", "Talk to Kuwa"); if (SR) mic.hidden = false; input.placeholder = "Ask me anything...";
    var text = "Welcome back! Anything else I can help with?";
    logEl.style.opacity = "0"; setTimeout(function () { render(); addChips([]); startChips(false); log.push({ role: "kuwa", text: text }); keep(); logEl.style.opacity = "1"; kuwaSay(text, function () { addChips(FOLLOW); }); }, 380);
  }

  /* ---- her voice: a natural female voice from the browser, calm and clear (the "natural"/neural voices first).
     t is the typewriter showing these words: it is told when she starts, each word she reaches, and when she ends. ---- */
  var voice = null;
  function pickVoice() { if (!TTS) return; var vs = TTS.getVoices(); if (!vs.length) return; voice = null;
    var want = [/Microsoft (Aria|Jenny|Ava|Emma|Michelle|Sonia|Libby|Natasha|Clara|Rosa|Blessica).*(Online|Natural)/i, /Google UK English Female/i, /Microsoft (Aria|Jenny|Zira|Hazel|Susan|Catherine|Linda|Heera)/i,
      /Samantha|Karen|Moira|Tessa|Serena|Victoria|Fiona|Ava|Allison|Susan/i, /Google US English/i, /female|woman/i];
    for (var i = 0; i < want.length && !voice; i++) voice = vs.filter(function (v) { return want[i].test(v.name) && /^en/i.test(v.lang); })[0] || null;
    if (!voice) voice = vs.filter(function (v) { return /^en/i.test(v.lang) && !/male|david|mark|guy|ryan|james|daniel|fred|alex/i.test(v.name); })[0] || null; }
  if (TTS) { pickVoice(); TTS.onvoiceschanged = pickVoice; }
  var pulse = 0, keepAlive = 0, utter = null;
  function speak(text, t) {
    if (!voiceOn || !TTS) { if (t) { t.mode = "timer"; t.cps = 46; } setState("idle"); return; }
    var u = new SpeechSynthesisUtterance(text), heard = false, started = false; utter = u; if (voice) { u.voice = voice; u.lang = voice.lang; } u.rate = 1; u.pitch = 1.04; u.volume = 1;
    var toTimer = function (cps) { if (t && typing === t && t.mode !== "speech" && t.mode !== "end") { t.mode = "timer"; t.cps = cps; t.target = Math.max(t.target, t.shown); } };
    u.onstart = function () { if (utter !== u) return; started = true; setState("talking"); setTimeout(function () { if (!heard) toTimer(14.5); }, 900); };   /* no word timings from this voice: type at her speaking pace */
    u.onboundary = function (e) { if (utter !== u) return; pulse = 1; if (e.name && e.name !== "word") return; heard = true;
      if (t && typing === t) { t.mode = "speech"; t.target = Math.max(t.target, Math.min(text.length, e.charLength ? e.charIndex + e.charLength : wordEnd(text, e.charIndex))); } };
    u.onend = u.onerror = function () { if (utter !== u) return; if (t && typing === t) { t.mode = "end"; } setState("idle"); };
    TTS.cancel(); setState("talking"); clearInterval(keepAlive);
    setTimeout(function () { TTS.speak(u); if (TTS.paused) TTS.resume(); }, 80);       /* Chrome drops a speak() right after cancel() */
    keepAlive = setInterval(function () { if (!TTS.speaking) { clearInterval(keepAlive); return; } TTS.pause(); TTS.resume(); }, 9000);
    setTimeout(function () { if (!started && utter === u) { toTimer(30); setTimeout(function () { if (state === "talking" && !TTS.speaking) setState("idle"); }, Math.min(6000, text.length * 40)); } }, 1500);   /* the voice never started */
  }
  function hush() { utter = null; if (TTS) TTS.cancel(); if (typing && typing.mode !== "timer") { typing.mode = "timer"; typing.cps = 60; typing.target = Math.max(typing.target, typing.shown); } if (state === "talking") setState("idle"); }

  /* ---- listening: the browser's speech recognition (Chrome, Edge, Safari) ---- */
  var rec = null;
  mic.addEventListener("click", function () {
    if (rec) { rec.stop(); return; } hush(); finishTyping();
    rec = new SR(); rec.lang = "en-PH"; rec.interimResults = true; rec.maxAlternatives = 1;
    var final = "";
    rec.onresult = function (e) { var t = ""; for (var i = e.resultIndex; i < e.results.length; i++) { if (e.results[i].isFinal) final += e.results[i][0].transcript; else t += e.results[i][0].transcript; } input.value = final + t; pulse = .7; };
    rec.onend = function () { rec = null; mic.classList.remove("on"); setState("idle"); if (final.trim()) { if (mode === "name") gotName(final); else ask(final); } };
    rec.onerror = function (e) { if (e.error === "not-allowed") input.placeholder = "Allow the microphone to talk to Kuwa"; };
    try { rec.start(); mic.classList.add("on"); setState("listening"); input.value = ""; input.placeholder = "Listening..."; } catch (e) { rec = null; }
  });
  function setState(s) { state = s; box.dataset.state = s; var stop = s === "talking" || s === "thinking"; send.classList.toggle("stop", stop); send.classList.toggle("idle", !stop && !input.value.trim()); send.setAttribute("aria-label", stop ? "Stop" : "Send");
    if (s !== "listening") input.placeholder = mode === "live" ? "Message GR8..." : mode === "name" ? "Your first name..." : "Ask me anything..."; }

  /* ---- the orb: a glassy orange sphere with warm light swirling inside, a soft aura, and a bright rim. Faceless. ---- */
  var cx = canvas.getContext("2d"), raf = 0, energy = .2, spin = 0, dark = false;
  function size() { var d = Math.min(devicePixelRatio || 1, 1);   /* the orb is soft and blurred: full resolution only costs frames */ canvas.width = innerWidth * d; canvas.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  function blob(x, y, r, amp, t, k, col, blur) {
    cx.save(); cx.filter = "blur(" + blur + "px)"; cx.beginPath();
    for (var i = 0; i <= 72; i++) { var a = i / 72 * Math.PI * 2, w = 1 + amp * (Math.sin(a * 3 + t * 1.3 + k) * .5 + Math.sin(a * 5 - t * 1.7 + k * 2) * .3 + Math.sin(a * 2 + t * .7) * .2), px = x + Math.cos(a) * r * w, py = y + Math.sin(a) * r * w; if (i) cx.lineTo(px, py); else cx.moveTo(px, py); }
    cx.fillStyle = col; cx.fill(); cx.restore();
  }
  function draw(t) {
    if (mode === "live" && performance.now() - liveAt > 1400) { raf = requestAnimationFrame(draw); return; }   /* the orb has faded out for the live chat: nothing to draw */
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
    lastFocus = document.activeElement; box.hidden = false; size(); box.classList.toggle("live", mode === "live");
    if (mode === "live") { input.placeholder = "Message GR8..."; mic.hidden = true; render(); agentCard(); poll(); }
    else if (!greeted && !log.length) { greeted = true; render(); var p = $(".kc-b.k p", logEl); p.textContent = ""; startEl.hidden = true;
      setTimeout(function () { var t = typeOut(p, HELLO, function () { startChips(true); }); if (voiceOn && TTS) { t.mode = "wait"; speak(HELLO, t); } }, 450); }
    else render();
    var stay = arguments[0] === "mini";   /* reopening the small window on the next page */
    requestAnimationFrame(function () { box.classList.add("on"); setMini(stay); if (!stay) input.focus({ preventScroll: true }); });
  }
  function close() { hush(); finishTyping(); if (rec) rec.abort(); box.classList.remove("on"); document.documentElement.classList.remove("kc-open", "kc-mini"); try { sessionStorage.removeItem("kuwa-win"); } catch (e) {} setTimeout(function () { box.hidden = true; cancelAnimationFrame(raf); }, 400); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  addEventListener("resize", function () { if (!box.hidden) size(); });
  document.addEventListener("click", function (e) { var t = e.target.closest && e.target.closest("[data-kuwa-chat]"); if (t) { e.preventDefault(); e.stopImmediatePropagation(); open(); } }, true);
  if (mode === "live") poll();   /* a live chat carries on from page to page during the visit */
  if (mini) { var reopen = function () { open("mini"); }; if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reopen); else setTimeout(reopen, 0); }   /* and so does the small window */
  window.KUWA_CHAT = { open: open, close: close, ask: function (q) { open(); if (mode === "kuwa") ask(q); } };
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
