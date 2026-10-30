/* Live-chat alerts on every CALMS staff page. When a website visitor asks Kuwa for a person, or writes again in a chat
   you are answering, this says so wherever you are: a soft chime, a card in the corner with "Answer", the count on the
   side rail's Live chat drawer, the count in the tab title, and (if you allow it) a desktop notification while CALMS is
   in another tab. Asks GET /api/live/pulse every 5 seconds (every 15 while the tab is hidden).
   Each chat alerts once (remembered for this browser tab, so changing pages doesn't alert again); a chat still waiting
   after a minute gets one gentle reminder a minute, three at most. The chime can be muted from the card. */
(function () {
  "use strict";
  if (!/^https?:$/.test(location.protocol) || window.CALMS_CHAT_ALERT) return; window.CALMS_CHAT_ALERT = true;
  var ON_CHAT = /\/live-chat(\.html)?$/.test(location.pathname), PAGE = /\/pages\//.test(location.pathname) ? "live-chat.html" : "pages/live-chat.html";
  var KEY = "calms-chat-alerted", seen = {}, timer = 0, stopped = false, baseTitle = document.title, box = null, ac = null;
  try { seen = JSON.parse(sessionStorage.getItem(KEY) || "{}") || {}; } catch (e) {}
  var muted = false; try { muted = localStorage.getItem("calms-chat-sound") === "off"; } catch (e) {}
  function keep() { try { sessionStorage.setItem(KEY, JSON.stringify(seen)); } catch (e) {} }

  /* ---- the chime: two soft bell notes, made by the browser (allowed once you have clicked anywhere) ---- */
  function unlock() { if (ac) return; var K = window.AudioContext || window.webkitAudioContext; if (!K) return; try { ac = new K({ latencyHint: "interactive" }); } catch (e) { try { ac = new K(); } catch (x) { ac = null; } } }
  addEventListener("pointerdown", unlock, { once: true, capture: true }); addEventListener("keydown", unlock, { once: true, capture: true });
  function chime(soft) {
    if (muted || !ac) return; if (ac.state === "suspended") ac.resume();
    var t = ac.currentTime + .02, out = ac.createGain(); out.gain.value = soft ? .5 : .9; out.connect(ac.destination);
    [[987.77, 0], [1318.5, .16]].forEach(function (n) { var o = ac.createOscillator(), o2 = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = n[0]; o2.type = "sine"; o2.frequency.value = n[0] * 2.01;
      var g2 = ac.createGain(); g2.gain.value = .12; o2.connect(g2); g2.connect(g); o.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t + n[1]); g.gain.linearRampToValueAtTime(.16, t + n[1] + .012); g.gain.exponentialRampToValueAtTime(.0001, t + n[1] + 1.3);
      o.start(t + n[1]); o2.start(t + n[1]); o.stop(t + n[1] + 1.35); o2.stop(t + n[1] + 1.35); });
  }

  /* ---- the cards ---- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function stack() { if (box && box.isConnected) return box; box = el("div", "ca-stack"); box.setAttribute("role", "region"); box.setAttribute("aria-label", "Live chat alerts"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); return box; }
  function card(id, title, sub, href) {
    var s = stack(), old = s.querySelector('[data-k="' + id + '"]'); if (old) old.remove();
    var c = el("div", "ca-card"); c.dataset.k = id;
    var av = el("i", "ca-av", (title.trim()[0] || "?").toUpperCase()); av.setAttribute("aria-hidden", "true"); c.appendChild(av);
    var tx = el("div", "ca-tx"); tx.appendChild(el("b", "", title)); tx.appendChild(el("span", "", sub)); c.appendChild(tx);
    var acts = el("div", "ca-acts"), go = el("a", "ca-go", "Answer"); go.href = href; acts.appendChild(go);
    var later = el("button", "ca-x", "Later"); later.type = "button"; later.addEventListener("click", function () { c.classList.add("out"); setTimeout(function () { c.remove(); }, 260); }); acts.appendChild(later);
    c.appendChild(acts);
    var foot = el("div", "ca-foot"), mute = el("button", "ca-link", muted ? "Chime: off" : "Chime: on"); mute.type = "button";
    mute.addEventListener("click", function () { muted = !muted; try { localStorage.setItem("calms-chat-sound", muted ? "off" : "on"); } catch (e) {} [].forEach.call(document.querySelectorAll(".ca-card .ca-link.m"), function (b) { b.textContent = muted ? "Chime: off" : "Chime: on"; }); if (!muted) { unlock(); chime(true); } });
    mute.classList.add("m"); foot.appendChild(mute);
    if (window.Notification && Notification.permission === "default") { var dn = el("button", "ca-link", "Alert me in other tabs too"); dn.type = "button";
      dn.addEventListener("click", function () { Notification.requestPermission().then(function () { dn.remove(); }); }); foot.appendChild(dn); }
    c.appendChild(foot);
    while (s.children.length >= 3) s.firstChild.remove();
    s.appendChild(c); requestAnimationFrame(function () { c.classList.add("in"); });
  }
  function system(title, body, href) {
    if (!document.hidden || !window.Notification || Notification.permission !== "granted") return;
    try { var n = new Notification(title, { body: body, tag: "calms-chat", renotify: true, icon: (/\/pages\//.test(location.pathname) ? "../" : "") + "assets/img/app/icon-192.png" }); n.onclick = function () { focus(); location.href = href; n.close(); }; } catch (e) {}
  }

  /* ---- asking ---- */
  function poll() {
    clearTimeout(timer); if (stopped) return;
    fetch("/api/live/pulse", { credentials: "same-origin", cache: "no-store" }).then(function (r) {
      if (r.status === 401 || r.status === 403 || r.status === 404) { stopped = true; return null; } return r.ok ? r.json() : null;
    }).then(function (d) {
      if (!d) return;
      var now = Date.now(), loud = false, soft = false, alive = {};
      d.waiting.forEach(function (c) { var k = "w" + c.id, s = seen[k]; alive[k] = 1;
        if (!s) { seen[k] = { at: now, n: 0 }; loud = true; if (!ON_CHAT) card(k, c.name + " wants to talk to a person", "Asked Kuwa for a live agent on the website", PAGE + "?chat=" + c.id); system(c.name + " wants to talk to a person", "Asked Kuwa for a live agent. Open CALMS to answer.", PAGE + "?chat=" + c.id); }
        else if (s.n < 3 && now - s.at > 60000) { s.at = now; s.n++; soft = true; if (!ON_CHAT) card(k, c.name + " is still waiting", "Waiting " + Math.round((now - new Date(c.at)) / 60000) + " min for someone from GR8", PAGE + "?chat=" + c.id); } });
      d.mine.forEach(function (c) { var k = "m" + c.id; alive[k] = 1; if ((seen[k] || 0) >= c.last) return; seen[k] = c.last;
        if (ON_CHAT && !document.hidden) return; loud = true; if (!ON_CHAT) card(k, c.name + " wrote again", c.unanswered + (c.unanswered === 1 ? " message" : " messages") + " waiting for your answer", PAGE + "?chat=" + c.id); system(c.name + " wrote again", "Open CALMS to answer.", PAGE + "?chat=" + c.id); });
      Object.keys(seen).forEach(function (k) { if (!alive[k] && k[0] === "w") { delete seen[k]; var c = box && box.querySelector('[data-k="' + k + '"]'); if (c) c.remove(); } });   /* someone answered it */
      keep(); if (loud) chime(false); else if (soft) chime(true);
      var n = d.waiting.length + d.mine.length;
      if (window.CALMS_RAIL_COUNT) window.CALMS_RAIL_COUNT("Live chat", d.waiting.length);
      if (!ON_CHAT) document.title = (n ? "(" + n + ") " : "") + baseTitle.replace(/^\(\d+\)\s*/, "");
    }).catch(function () {}).then(function () { if (!stopped) timer = setTimeout(poll, document.hidden ? 15000 : 5000); });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) poll(); });
  setTimeout(poll, 1200);
})();
