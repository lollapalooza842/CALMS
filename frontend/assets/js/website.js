/* Website (pages/website.html): what customers did on the public website, for the staff who act on it.
   GET /api/website every 20 seconds; each card's buttons do one thing (routes/website.js). No browser pop-ups: a note,
   when one is needed, is typed into the card itself. */
(function () {
  var list = document.getElementById("list"), tabs = document.getElementById("tabs"), tab = "apps", data = null, open = {}, busy = false;
  try { tab = sessionStorage.getItem("calms-website-tab") || "apps"; } catch (e) {}
  function api(m, p, b) { return window.CALMS && CALMS.api ? CALMS.api(m, p, b) : fetch(p, { method: m, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined })
    .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) { var e = new Error(d.error || "Something went wrong."); e.status = r.status; throw e; } return d; }); }); }
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function peso(n) { return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function when(t) { var d = new Date(t), m = (Date.now() - d) / 6e4; return m < 1 ? "just now" : m < 60 ? Math.floor(m) + " min ago" : m < 1440 ? Math.floor(m / 60) + " h ago" : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }); }
  function stamp(s) { var M = { received: ["new", "New"], called: ["wip", "Called"], encoded: ["ok", "In CALMS"], closed: ["off", "Closed"], "new": ["new", "New"], done: ["ok", "Done"], dismissed: ["off", "Not acted on"] }, x = M[s] || ["off", s]; return '<span class="ws-stamp ' + x[0] + '">' + x[1] + "</span>"; }

  function load() {
    return api("GET", "/api/website").then(function (d) { data = d; counts(); draw(); document.getElementById("upd").textContent = "Updated " + new Date().toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) + "."; },
      function (e) { if (e.status === 403) list.innerHTML = '<li class="ws-empty">The Website screen is for the Sales Agent, Loan Processor, Loan Account Officer, Operations Manager and System Administrator.</li>'; else if (e.status !== 401) list.innerHTML = '<li class="ws-empty">' + esc(e.message) + "</li>"; });
  }
  function counts() {
    var s = data.sees, n = { apps: data.applications.filter(function (a) { return a.status === "received"; }).length, calls: data.callbacks.filter(function (c) { return c.status === "new"; }).length,
      reqs: data.requests.filter(function (r) { return r.status === "new"; }).length, chats: (data.chats && data.chats.waiting) || 0 };
    [].forEach.call(tabs.children, function (b) { var t = b.dataset.t; b.hidden = t === "reqs" ? !(s.indexOf("offer") >= 0 || s.indexOf("paper") >= 0 || s.indexOf("payment") >= 0) : s.indexOf(t) < 0; b.querySelector("i").textContent = n[t] ? String(n[t]) : ""; if (b.tagName === "BUTTON") b.setAttribute("aria-selected", String(t === tab)); });
    if (tabs.querySelector('[data-t="' + tab + '"]').hidden) { tab = s.indexOf("apps") >= 0 ? "apps" : s.indexOf("calls") >= 0 ? "calls" : "reqs"; counts(); }
  }
  tabs.addEventListener("click", function (e) { var b = e.target.closest("button[data-t]"); if (!b) return; tab = b.dataset.t; try { sessionStorage.setItem("calms-website-tab", tab); } catch (x) {} counts(); draw(); });

  function draw() {
    if (!data || busy) return;
    var html = "";
    if (tab === "apps") html = data.applications.map(appCard).join("") || '<li class="ws-empty">No online applications yet. They appear here as soon as someone applies on the website.</li>';
    if (tab === "calls") html = data.callbacks.map(callCard).join("") || '<li class="ws-empty">No call-back requests. They come from "Let\'s talk" on the website.</li>';
    if (tab === "reqs") html = data.requests.map(reqCard).join("") || '<li class="ws-empty">Nothing from My GR8 yet. Borrowers can answer an offer, send a missing paper, or tell you about a payment.</li>';
    list.innerHTML = html;
    Object.keys(open).forEach(function (ref) { var c = list.querySelector('[data-ref="' + ref + '"] .ws-detail-slot'); if (c && open[ref]) c.innerHTML = open[ref]; });
  }
  function appCard(a) {
    var live = a.status === "received" || a.status === "called";
    return '<li class="ws-card' + (live ? "" : " old") + '" data-ref="' + esc(a.reference) + '"><div><h3>' + esc(a.name) + "<small>" + esc(a.reference) + "</small></h3><p>" + esc(a.product) + " · " + peso(a.amount) + " · " + a.months + " months · " + a.papers + " paper" + (a.papers === 1 ? "" : "s") + " attached</p></div>" + stamp(a.status) +
      '<div class="ws-meta">Applied ' + when(a.at) + " · " + esc(a.mobile) + (a.handledBy ? " · " + (a.status === "encoded" ? "encoded" : a.status) + " by " + esc(a.handledBy) + " " + when(a.handledAt) : "") + (a.appRef ? ' · now <a href="application-detail.html?ref=' + esc(a.appRef) + '">' + esc(a.appRef) + "</a>" : "") + "</div>" +
      (a.note ? '<div class="ws-msg">' + esc(a.note) + "</div>" : "") + steps(a.stage) + nextBox(a) + '<div class="ws-detail-slot" style="grid-column:1/-1"></div>' +
      '<div class="ws-acts"><button class="ws-btn light" type="button" data-do="view">' + (open[a.reference] ? "Hide details" : "Open the application") + "</button>" +
      (live ? (a.status === "received" ? '<button class="ws-btn light" type="button" data-do="called">I called them</button>' : "") + (data.canEncode ? '<button class="ws-btn" type="button" data-do="encode">Encode in CALMS</button>' : "") +
        '<input class="ws-note" placeholder="A note (needed to close it)" aria-label="Note"><button class="ws-btn light" type="button" data-do="close">Not going ahead</button>' : "") + '</div><p class="ws-err"></p></li>';
  }
  /* where it is on the way from the website to a released loan, and what happens next (routes/website.js stageOf, nextOf) */
  var STEPS = ["Received", "Called", "In CALMS", "Verified", "Decided", "Signed", "Released"];
  function steps(n) {
    if (n == null) return ""; if (n < 0) return '<ol class="ws-steps off" aria-label="Progress"><li class="now">Closed</li></ol>';
    return '<ol class="ws-steps" aria-label="Progress">' + STEPS.map(function (t, i) { return '<li class="' + (i < n ? "done" : i === n ? "now" : "") + '"' + (i === n ? ' aria-current="step"' : "") + ">" + t + "</li>"; }).join("") + "</ol>";
  }
  function nextBox(a) {
    var x = a.next; if (!x) return "";
    var go = x.page ? (x.can ? '<a class="ws-btn" href="' + esc(x.page) + '">' + (a.appRef ? "Continue on " + esc(a.appRef) : "Open") + " →</a>" : '<a class="ws-btn light" href="' + esc(x.page) + '">See it in CALMS</a>') : "";
    return '<div class="ws-next' + (x.can ? " mine" : "") + '"><div><small>Next</small><b>' + esc(x.does) + "</b><span>" + (x.can ? "You can do this." : esc(x.who) + " does this" + (a.appRef ? "." : ". It is waiting in their My Queue.")) + "</span></div>" + go + "</div>";
  }
  function callCard(c) {
    return '<li class="ws-card' + (c.status === "done" ? " old" : "") + '" data-call="' + c.id + '"><div><h3>' + esc(c.name) + "<small>T-" + String(c.id).padStart(5, "0") + "</small></h3><p>" + esc(c.need) + (c.amount ? " · about " + esc(c.amount) : "") + (c.months ? " · " + esc(c.months) : "") + "</p></div>" + stamp(c.status === "new" ? "new" : c.status === "called" ? "called" : "done") +
      '<div class="ws-meta">Asked ' + when(c.at) + (c.mobile ? " · " + esc(c.mobile) : "") + (c.email ? " · " + esc(c.email) : "") + (c.reach ? " · prefers " + esc(c.reach) : "") + (c.handledBy ? " · " + esc(c.handledBy) + " " + when(c.handledAt) : "") + "</div>" +
      (c.message ? '<div class="ws-msg">' + esc(c.message) + "</div>" : "") + (c.note ? '<div class="ws-msg">Note: ' + esc(c.note) + "</div>" : "") +
      (c.status !== "done" ? '<div class="ws-acts"><input class="ws-note" placeholder="What came of it (optional)" aria-label="Note">' + (c.status === "new" ? '<button class="ws-btn light" type="button" data-do="cb-called">Called</button>' : "") + '<button class="ws-btn" type="button" data-do="cb-done">Done</button></div>' : "") + '<p class="ws-err"></p></li>';
  }
  function reqCard(r) {
    var d = r.details || {}, title, what, acts = "";
    if (r.kind === "offer") { title = (d.answer === "accepted" ? "Accepts" : "Declines") + " counter-offer " + (d.n || "") + " on " + (r.appRef || d.reference);
      what = "Record the answer on Record answer (channel: website), then mark this done."; acts = '<a class="ws-btn" href="record-answer.html?ref=' + esc(r.appRef || d.reference) + '">Record the answer</a>'; }
    if (r.kind === "paper") { title = "Sent a paper: " + (d.label || d.slot) + " for " + (r.appRef || d.reference);
      what = esc(d.file_name) + " · " + Math.max(1, Math.round((d.size || 0) / 1024)) + " KB. Check it, then file it on the application (a new version, in the audit log).";
      acts = '<a class="ws-btn light" target="_blank" rel="noopener" href="/api/website/requests/' + r.id + '/file">Open the paper</a>' + (data.canFile ? '<button class="ws-btn" type="button" data-do="file">File it on ' + esc(r.appRef || d.reference) + "</button>" : ""); }
    if (r.kind === "payment") { title = "Paid " + peso(d.amount) + " by " + d.channel + " on " + (r.account || d.account);
      what = "Paid on " + esc(d.paid_on) + (d.reference ? ", reference " + esc(d.reference) : "") + ". Check it arrived, post it on Post payment, then mark this done.";
      acts = '<a class="ws-btn" href="post-payment.html?no=' + esc(r.account || d.account) + '">Post the payment</a>'; }
    var live = r.status === "new";
    return '<li class="ws-card' + (live ? "" : " old") + '" data-req="' + r.id + '"><div><h3>' + esc(r.name) + "<small>" + esc(r.mobile) + "</small></h3><p>" + esc(title) + "</p></div>" + stamp(r.status) +
      '<div class="ws-meta">From My GR8 ' + when(r.at) + (r.handledBy ? " · " + (r.status === "done" ? "handled" : "not acted on") + " by " + esc(r.handledBy) + " " + when(r.handledAt) : "") + "</div>" +
      (live ? '<div class="ws-msg">' + what + "</div>" : "") + (r.note ? '<div class="ws-msg">Note to the borrower: ' + esc(r.note) + "</div>" : "") +
      (live ? '<div class="ws-acts">' + acts + '<input class="ws-note" placeholder="A note the borrower will see" aria-label="Note"><button class="ws-btn light" type="button" data-do="req-done">Mark done</button><button class="ws-btn light" type="button" data-do="req-dismiss">Not acting on it</button></div>' : "") + '<p class="ws-err"></p></li>';
  }

  /* one application in full */
  function details(ref) {
    return api("GET", "/api/website/applications/" + encodeURIComponent(ref)).then(function (w) {
      var det = w.details || {}, rows = [["Name", w.name], ["Birthday", w.birthDate ? String(w.birthDate).slice(0, 10) : ""], ["Mobile", w.mobile], ["Email", w.email || "–"], ["Address", w.address], ["ID", w.idType + " · " + w.idNumber],
        ["Loan", w.product + " · " + peso(w.amount) + " · " + w.months + " months"], ["Purpose", w.purpose]];
      Object.keys(det).forEach(function (k) { if (typeof det[k] !== "object") rows.push([k.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }), det[k]]); });
      return '<div class="ws-detail">' + rows.map(function (r) { return "<div><small>" + esc(r[0]) + "</small><b>" + esc(r[1]) + "</b></div>"; }).join("") +
        '<div class="wide ws-files"><small>Papers</small>' + (w.files.length ? w.files.map(function (f) { return '<a target="_blank" rel="noopener" href="/api/website/applications/' + encodeURIComponent(w.reference) + "/files/" + f.id + '">' + esc(f.slot) + ": " + esc(f.name) + "</a>"; }).join("") : "<b>None attached. Ask for them when you call.</b>") + "</div>" +
        (w.signature ? '<div class="wide"><small>Signed online (consent: credit check, privacy notice, truthfulness)</small><img class="sig" alt="Signature" src="' + esc(w.signature) + '"></div>' : "") + "</div>";
    });
  }

  list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-do]"); if (!b) return;
    var card = b.closest(".ws-card"), err = card.querySelector(".ws-err"), note = card.querySelector(".ws-note"), n = note ? note.value.trim() : "", act = b.dataset.do, ref = card.dataset.ref, req = card.dataset.req, call = card.dataset.call;
    err.textContent = "";
    if (act === "view") { if (open[ref]) { delete open[ref]; draw(); return; } b.disabled = true; details(ref).then(function (h) { open[ref] = h; draw(); }, function (x) { err.textContent = x.message; b.disabled = false; }); return; }
    var go = act === "called" ? ["POST", "/api/website/applications/" + ref + "/called", { note: n }] : act === "encode" ? ["POST", "/api/website/applications/" + ref + "/encode", {}] : act === "close" ? ["POST", "/api/website/applications/" + ref + "/close", { note: n }]
      : act === "cb-called" || act === "cb-done" ? ["POST", "/api/website/callbacks/" + call, { status: act === "cb-called" ? "called" : "done", note: n }]
      : act === "file" ? ["POST", "/api/website/requests/" + req + "/file-it", {}] : act === "req-done" ? ["POST", "/api/website/requests/" + req + "/done", { note: n }] : ["POST", "/api/website/requests/" + req + "/dismiss", { note: n }];
    if ((act === "close" || act === "req-dismiss") && !n) { err.textContent = act === "close" ? "Type why it is not going ahead, then press it again." : "Type a note for the borrower, then press it again."; if (note) note.focus(); return; }
    b.disabled = true; busy = true;
    api(go[0], go[1], go[2]).then(function (d) {
      busy = false; var msg = document.getElementById("note");
      if (act === "encode" && d.reference) { msg.textContent = "Encoded as " + d.reference + ". Opening it..."; setTimeout(function () { location.href = "application-detail.html?ref=" + d.reference; }, 900); return; }
      if (act === "file" && d.reference) msg.textContent = "Filed on " + d.reference + ".";
      load();
    }, function (x) { busy = false; b.disabled = false; err.textContent = x.message; });
  });

  /* from My Queue: website.html?w=W-… opens that application, on its tab, with its details showing */
  var W = (/[?&]w=(W-\d{4}-\d{4,})/.exec(location.search) || [])[1];
  if (W) { tab = "apps"; open[W] = '<div class="ws-detail"><div><small>Loading</small><b>…</b></div></div>'; details(W).then(function (h) { open[W] = h; draw(); var c = list.querySelector('[data-ref="' + W + '"]'); if (c) { c.scrollIntoView({ block: "center" }); c.classList.add("flash"); } }, function () { delete open[W]; draw(); }); }
  load(); setInterval(function () { if (!document.hidden && !busy && !document.activeElement.classList.contains("ws-note")) load(); }, 20000);
})();
