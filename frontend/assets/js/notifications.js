/* Online, the notices come from GET /api/notifications: what other people did on the applications you work on,
   and what is waiting for your role. Read and unread are saved per person; new notices are fetched every 30 seconds.
   Opened from the folder, the sample notices are used. */
(function () {
  if (!window.CALMS || !CALMS.online) { start(null); return; }
  CALMS.api("GET", "/api/notifications").then(start, function (err) { if (err.status === 401) return; start(null); var n = document.getElementById("note"); if (n) n.textContent = (err.message || "The server could not be reached.") + " Showing sample notices instead."; });
})();
function start(LIVE) {
  var $ = function (id) { return document.getElementById(id); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function nowT() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false }); }
  var N, F = "all", nid = 100, extra;
  function whenOf(at) { var m = new Date(new Date(at).getTime() + 8 * 3600e3), n = new Date(Date.now() + 8 * 3600e3), days = Math.round((Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()) - Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate())) / 86400e3), hm = ("0" + m.getUTCHours()).slice(-2) + ":" + ("0" + m.getUTCMinutes()).slice(-2);
    return (days === 0 ? "Today" : days === 1 ? "Yesterday" : m.toLocaleDateString("en-PH", { timeZone: "UTC", month: "short", day: "numeric" })) + " " + hm; }
  function fromLive(x) { return { id: x.id, w: whenOf(x.at), need: x.need, m: x.m, r: x.r, d: x.d, a: x.ref ? "Open the application" : x.user ? "Open Users and roles" : "", un: x.un, ref: x.ref, user: x.user, waitedH: x.waitedH }; }
  function save(ids, read) { if (LIVE) CALMS.api("POST", "/api/notifications/read", { ids: ids, read: read }).catch(function (e) { $("note").textContent = "Not saved: " + e.message; }); }
  function fresh() { if (LIVE) { N = LIVE.notices.map(fromLive); extra = []; F = "all"; return; } N = [
      { w: "Today 12:03", need: 1, m: "The signed agreement for Marvin Aquino is still not uploaded.", r: "APP-2026-0407", d: "Waiting 40 hours. Your supervisor is told at 48.", a: "Open the agreement", un: 1 },
      { w: "Today 11:58", need: 1, m: "Danilo Pangilinan's loan was sent back from disbursement.", r: "APP-2026-0405", d: "Corazon Ilagan: the payout account is not in the borrower's name.", a: "Open the application", un: 1 },
      { w: "Today 11:47", need: 0, m: "Norma Estrella's loan was released.", r: "APP-2026-0409", d: "Loan account LN-2026-0163 is open. Nothing more for you to do.", a: "", un: 1 },
      { w: "Today 10:40", need: 1, m: "A new application was assigned to you.", r: "APP-2026-0414", d: "Started by Jun Espiritu for Felisa Navarro. Papers are being collected.", a: "Open the application", un: 1 },
      { w: "Today 09:20", need: 0, m: "Norma Estrella accepted the counter-offer.", r: "APP-2026-0409", d: "Recorded by Jun Espiritu. The agreement could then be generated.", a: "", un: 0 },
      { w: "Yesterday 16:44", need: 0, m: "A decision was made on Norma Estrella's application.", r: "APP-2026-0409", d: "By Antonio Reyes. Open the application to read it.", a: "", un: 0 },
      { w: "Yesterday 14:05", need: 0, m: "Aurelio Soriano checked your encoding and corrected one figure.", r: "APP-2026-0409", d: "Open the application to see what changed.", a: "", un: 0 },
      { w: "Yesterday 09:10", need: 0, m: "All papers for Teresita Manalo have been received.", r: "APP-2026-0402", d: "", a: "", un: 0 }
    ].map(function (x) { x.id = nid++; return x; });
    extra = [{ need: 1, m: "A new application was assigned to you.", r: "APP-2026-0415", d: "Started by Katrina Yap for Renato Sison.", a: "Open the application" }, { need: 0, m: "Marvin Aquino came in and signed his agreement.", r: "APP-2026-0407", d: "Jun Espiritu has the signed copy and is bringing it to you.", a: "" }]; F = "all"; }
  /* ---- Kuwa on the perch ---- */
  var kuwa = $("kuwa"), kT = null, mood = "";
  function kFrame(f) { kuwa.style.backgroundPosition = (-96 * (f % 8)) + "px " + (-96 * Math.floor(f / 8)) + "px"; }
  function loop(seq, then) { clearTimeout(kT); var i = 0; (function step() { kFrame(seq[i][0]); if (reduce) return; var d = seq[i][1]; i++; if (i >= seq.length) { if (then) { kT = setTimeout(then, d); return; } i = 0; } kT = setTimeout(step, d); })(); }
  var IDLE = [[0, 2400], [3, 110], [0, 1800], [28, 1200]], WAKE = [[22, 80], [23, 700], [24, 900], [0, 1600], [3, 110], [0, 1200]], SLEEP = [[9, 900], [12, 500], [13, 1400], [14, 1400], [15, 1400], [14, 1400]], FLY = [[29, 90], [30, 90], [31, 90], [32, 90]], NOD = [[16, 120], [17, 120], [18, 140], [19, 500], [20, 140], [21, 300]];
  function perch(force) { var un = N.filter(function (x) { return x.un; }), need = un.filter(function (x) { return x.need; }), m = !un.length ? "sleep" : need.length ? "wake" : "idle";
    $("ph").textContent = !un.length ? "Nothing new" : un.length + (un.length === 1 ? " new notice" : " new notices"); $("pp").textContent = !un.length ? "You have read everything. " + (N.some(function (x) { return x.need; }) ? N.filter(function (x) { return x.need; }).length + " still need you." : "Nothing is waiting on you.") + " Kuwa is resting." : need.length ? need.length + (need.length === 1 ? " of them needs" : " of them need") + " you." + (LIVE ? (function () { var h = Math.max.apply(null, need.map(function (x) { return x.waitedH || 0; })); return h ? " The oldest has waited " + (h >= 48 ? Math.round(h / 24) + " days." : h + (h === 1 ? " hour." : " hours.")) : ""; })() : " The oldest has waited 40 hours.") : "None of them needs you. They are just for your information.";
    var b = $("allread"); if (un.length) b.removeAttribute("aria-disabled"); else b.setAttribute("aria-disabled", "true"); b.style.opacity = un.length ? "" : ".6";
    if (m !== mood || force) { mood = m; loop(m === "sleep" ? SLEEP : m === "wake" ? WAKE : IDLE); } }
  /* ---- the list ---- */
  function shown() { return N.filter(function (x) { return F === "all" || (F === "need" ? x.need : x.un); }); }
  function chips() { var C = $("chips"); C.textContent = ""; [["all", "All", N.length], ["need", "Needs you", N.filter(function (x) { return x.need; }).length], ["un", "New", N.filter(function (x) { return x.un; }).length]].forEach(function (c, i) { var b = el("button", "chip", c[1]); b.type = "button"; b.appendChild(el("i", "", String(c[2]))); b.setAttribute("aria-pressed", String(F === c[0])); b.addEventListener("click", function () { F = c[0]; chips(); list(); C.querySelectorAll("button")[i].focus(); }); C.appendChild(b); }); }
  function list(focus) { var L = $("list"), a = shown(); L.textContent = ""; a.forEach(function (x) { var li = el("li", (x.un ? "un" : "") + (x.isNew ? " new" : "")); x.isNew = false; li.appendChild(el("span", x.un ? "nw" : "rd", x.un ? "New" : "Read")); var t = el("div", "tx"); if (x.need) t.appendChild(el("span", "tag", "Needs you")); t.appendChild(el("span", "m", x.m + " ")); t.appendChild(el("b", "", x.r)); t.appendChild(el("small", "", x.w + (x.d ? " · " + x.d : ""))); li.appendChild(t);
      var d = el("div", "do"); if (x.a) { var o = el("button", "btn sm grn", x.a); o.type = "button"; o.addEventListener("click", function () { if (LIVE) { var go = function () { location.href = x.ref ? "application-detail.html?ref=" + encodeURIComponent(x.ref) : "users-roles.html"; }; if (x.un) CALMS.api("POST", "/api/notifications/read", { ids: [x.id], read: true }).then(go, go); else go(); return; } x.un = 0; all("o" + x.id); $("note").textContent = "Prototype: " + x.r + " would open here. The notice is marked as read."; }); o.id = "o" + x.id; d.appendChild(o); }
      var r = el("button", "btn sm quiet", x.un ? "Mark as read" : "Mark as new"); r.type = "button"; r.id = "r" + x.id; r.setAttribute("aria-label", (x.un ? "Mark as read: " : "Mark as new: ") + x.m); r.addEventListener("click", function () { x.un = x.un ? 0 : 1; save([x.id], !x.un); all("r" + x.id); }); d.appendChild(r); li.appendChild(d); L.appendChild(li); });
    var e = $("empty"); e.hidden = a.length > 0; L.hidden = !a.length; if (!a.length) e.textContent = F === "need" ? "Nothing needs you right now." : F === "un" ? "No new notices. You have read them all." : "No notices yet."; if (focus && $(focus)) $(focus).focus(); }
  function all(focus) { perch(); chips(); list(focus); }
  $("allread").addEventListener("click", function () { var n = N.filter(function (x) { return x.un; }).length; if (!n) { $("note").textContent = "There is nothing new to mark."; return; } N.forEach(function (x) { x.un = 0; }); if (LIVE) CALMS.api("POST", "/api/notifications/read", { all: true }).catch(function (e) { $("note").textContent = "Not saved: " + e.message; }); all(); $("note").textContent = n + " marked as read. The ones that need you still carry their mark."; });
  $("arrive").addEventListener("click", function () { var x = extra.shift(); if (!x) { $("note").textContent = "That is all the prototype has to deliver."; return; } x.id = nid++; x.w = "Today " + nowT(); x.un = 1; x.isNew = true; kuwa.classList.remove("fly"); void kuwa.offsetWidth; mood = "fly"; if (!reduce) { kuwa.classList.add("fly"); loop(FLY); }
    setTimeout(function () { N.unshift(x); F = "all"; all(); perch(true); $("note").textContent = "New notice: " + x.m + " " + x.r; }, reduce ? 0 : 1300); });
  $("prefs").addEventListener("click", function () { $("note").textContent = "Prototype: your notification settings are on the My profile page, which is not built yet."; });
  var NAV = [["My Queue", 0], ["Applications", 0], ["New application", 0], ["Notifications", 1, "4"]], nav = $("nav");
  NAV.forEach(function (n) { var li = el("li"), x = el("a"), p = el("span", "plate", n[0]); x.href = "#"; x.appendChild(p); if (n[1]) x.setAttribute("aria-current", "page"); else { x.setAttribute("aria-disabled", "true"); x.title = "Another prototype page"; } x.addEventListener("click", function (e) { e.preventDefault(); if (!n[1]) $("note").textContent = "Prototype: " + n[0] + " is another page."; }); li.appendChild(x); nav.appendChild(li); });
  fresh(); all();
  if (LIVE) { $("arrive").hidden = true; $("arrive").style.display = "none"; var ft = document.querySelectorAll(".foot span"); if (ft[1]) ft[1].textContent = "Live notices from the last 14 days. When email is connected, the kinds you tick under Email on My profile are also emailed to you.";
    /* Every 30 seconds: anything new flies in. */
    setInterval(function () { if (document.hidden) return; CALMS.api("GET", "/api/notifications").then(function (d) { var have = {}; N.forEach(function (x) { have[x.id] = x; }); var fresh2 = d.notices.filter(function (x) { return !have[x.id]; }).map(fromLive);
      d.notices.forEach(function (x) { if (have[x.id]) have[x.id].need = x.need; }); if (!fresh2.length) { all(); return; }
      kuwa.classList.remove("fly"); void kuwa.offsetWidth; mood = "fly"; if (!reduce) { kuwa.classList.add("fly"); loop(FLY); }
      setTimeout(function () { fresh2.forEach(function (x) { x.isNew = true; }); N = fresh2.concat(N); F = "all"; all(); perch(true); $("note").textContent = "New notice: " + fresh2[0].m + " " + fresh2[0].r; }, reduce ? 0 : 1300); }, function () {}); }, 30000); }
}
