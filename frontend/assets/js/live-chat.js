/* Live chat (pages/live-chat.html): GR8 staff answer website visitors who asked Kuwa for a person.
   The list (GET /api/live) refreshes every 3 seconds; the open chat (GET /api/live/:id?after=) every 2 seconds.
   A new waiting chat shows in the tab title, so it is noticed from another tab. */
(function () {
  var list = document.getElementById("list"), pane = document.getElementById("pane"), out = document.getElementById("out");
  var me = null, chats = [], cur = null, after = 0, listT = 0, chatT = 0, baseTitle = document.title;
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function ago(t) { var s = Math.max(0, (Date.now() - new Date(t)) / 1000); return s < 60 ? "just now" : s < 3600 ? Math.floor(s / 60) + " min ago" : new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }); }
  function time(t) { return new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }); }
  function api(path, body) {
    return fetch("/api/live" + path, body ? { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || "Something went wrong."); e.status = r.status; throw e; } return d; }); });
  }
  function stop(e) {
    if (e.status === 401) { out.innerHTML = '<div class="msg">Sign in to CALMS first, then open this page again. <a href="../index.html">Sign in</a></div>'; return true; }
    if (e.status === 403) { out.innerHTML = '<div class="msg">Live chat is for the Sales Agent, Loan Processor, Loan Account Officer, Operations Manager and System Administrator.</div>'; return true; }
    return false;
  }

  /* ---- the list ---- */
  function loadList() {
    clearTimeout(listT);
    api("").then(function (d) {
      me = d.me; chats = d.chats || []; drawList();
      var waiting = chats.filter(function (c) { return c.status === "waiting"; }).length;
      document.title = (waiting ? "(" + waiting + ") " : "") + baseTitle;
      listT = setTimeout(loadList, 3000);
    }).catch(function (e) { if (!stop(e)) listT = setTimeout(loadList, 6000); });
  }
  function drawList() {
    var open = chats.filter(function (c) { return c.status !== "closed"; }), done = chats.filter(function (c) { return c.status === "closed"; });
    function row(c) {
      var tag = c.status === "waiting" ? '<em class="tag wait">Waiting</em>' : c.status === "open" ? (c.unanswered && c.agentId === me ? '<em class="tag n">' + c.unanswered + " new</em>" : '<em class="tag open">' + esc(c.agentId === me ? "You" : c.agent) + "</em>") : '<em class="tag">Ended</em>';
      return '<button type="button" class="item" data-id="' + c.id + '"' + (cur === c.id ? ' aria-current="true"' : "") + '><b><i class="dot' + (c.visitorHere ? " on" : "") + '"></i>' + esc(c.name) + "</b>" + tag +
        "<span>" + esc(c.last || "No messages yet") + '</span><small>' + ago(c.createdAt) + "</small></button>";
    }
    list.innerHTML = (open.length ? "<h2>Now</h2>" + open.map(row).join("") : '<p class="sub" style="padding:10px">No one is waiting. New chats appear here by themselves.</p>') + (done.length ? "<h2>Ended today</h2>" + done.map(row).join("") : "");
  }
  list.addEventListener("click", function (e) { var b = e.target.closest(".item"); if (b) openChat(+b.dataset.id); });

  /* ---- one chat ---- */
  var info = null;
  function openChat(id) {
    cur = id; after = 0; info = null; clearTimeout(chatT); drawList();
    pane.innerHTML = '<div class="head"><div><h3></h3><p></p></div><div class="acts"></div></div><div class="msgs"></div><form><textarea placeholder="Type your answer... (Enter to send, Shift+Enter for a new line)" aria-label="Your answer"></textarea><button class="btn" type="submit">Send</button></form>';
    var form = pane.querySelector("form"), ta = form.querySelector("textarea");
    form.addEventListener("submit", function (e) { e.preventDefault(); reply(ta); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); reply(ta); } });
    loadChat(true);
  }
  function loadChat(first) {
    clearTimeout(chatT); var id = cur;
    api("/" + id + "?after=" + after).then(function (c) {
      if (id !== cur) return;
      var box = pane.querySelector(".msgs"), stick = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
      if (first) {
        var t = (c.transcript || []).map(function (m) { return "<p><b>" + (m.role === "kuwa" ? "Kuwa" : esc(c.name)) + ":</b> " + esc(m.text) + "</p>"; }).join("");
        if (t) box.insertAdjacentHTML("beforeend", '<details class="kuwa"><summary>What they asked Kuwa first</summary>' + t + "</details>");
      }
      (c.messages || []).forEach(function (m) {
        after = Math.max(after, m.id);
        if (m.sender === "system") box.insertAdjacentHTML("beforeend", '<div class="sys">' + esc(m.text) + " · " + time(m.at) + "</div>");
        else box.insertAdjacentHTML("beforeend", '<div class="m ' + (m.sender === "agent" ? "a" : "v") + '">' + esc(m.text) + "<small>" + time(m.at) + "</small></div>");
      });
      if (first || stick) box.scrollTop = box.scrollHeight;
      info = c; head();
      if (c.status !== "closed") chatT = setTimeout(loadChat, 2000);
    }).catch(function (e) { if (!stop(e) && id === cur) chatT = setTimeout(loadChat, 5000); });
  }
  function head() {
    var c = info, mine = c.agentId === me, h = pane.querySelector(".head");
    h.querySelector("h3").innerHTML = '<i class="dot' + (c.visitorHere ? " on" : "") + '"></i>' + esc(c.name);
    h.querySelector("p").textContent = c.status === "closed" ? "This chat has ended." : c.status === "waiting" ? "Waiting for someone to join. " + (c.visitorHere ? "They're on the page now." : "They may have stepped away.")
      : (mine ? "You're answering. " : esc(c.agent) + " is answering. ") + (c.visitorHere ? "They're on the page now." : "They may have stepped away.");
    var acts = h.querySelector(".acts");
    acts.innerHTML = c.status === "waiting" ? '<button class="btn" type="button" data-do="take">Join this chat</button>' : c.status === "open" && mine ? '<button class="btn ghost" type="button" data-do="close">End chat</button>' : "";
    var form = pane.querySelector("form"), can = c.status === "open" && mine;
    form.querySelector("textarea").disabled = !can; form.querySelector("button").disabled = !can;
    form.querySelector("textarea").placeholder = can ? "Type your answer... (Enter to send, Shift+Enter for a new line)" : c.status === "waiting" ? "Join the chat to answer." : c.status === "closed" ? "This chat has ended." : "Someone else is answering this chat.";
  }
  pane.addEventListener("click", function (e) {
    var b = e.target.closest("[data-do]"); if (!b || !cur) return; b.disabled = true;
    api("/" + cur + "/" + b.dataset.do, {}).then(function () { loadChat(); loadList(); if (b.dataset.do === "take") setTimeout(function () { var ta = pane.querySelector("textarea"); if (ta) ta.focus(); }, 300); })
      .catch(function (err) { b.disabled = false; alertLine(err.message); });
  });
  function reply(ta) {
    var text = ta.value.trim(); if (!text || ta.disabled) return; ta.value = "";
    api("/" + cur + "/messages", { text: text }).then(function () { loadChat(); }).catch(function (e) { ta.value = text; alertLine(e.message); });
  }
  function alertLine(t) { var box = pane.querySelector(".msgs"); if (box) { box.insertAdjacentHTML("beforeend", '<div class="sys" style="color:var(--a)">' + esc(t) + "</div>"); box.scrollTop = box.scrollHeight; } }

  loadList();
})();
