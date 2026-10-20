/* Website visitors (pages/visitors.html): counts from GET /api/visits?days=N, drawn as tiles, a daily bar chart and short lists. */
(function () {
  var out = document.getElementById("out"), days = 30;
  var PART = { about: "About", loans: "Loans", talk: "Let's talk", apply: "Apply", home: "Home" }, DEV = { phone: "Phone", tablet: "Tablet", computer: "Computer" };
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function n(x) { return Number(x || 0).toLocaleString("en-PH"); }
  function rows(list, key, val, names) { var max = Math.max(1, ...list.map(function (r) { return r[val]; }));
    return list.length ? '<ul class="rows">' + list.map(function (r) { return '<li><span>' + esc((names && names[r[key]]) || r[key]) + '</span><b>' + n(r[val]) + '</b><i style="--w:' + (r[val] / max * 100).toFixed(1) + '%"></i></li>'; }).join("") + '</ul>' : '<p class="sub">Nothing yet.</p>'; }
  function fill(list) {   /* every day in the period, including the quiet ones */
    var map = {}; list.forEach(function (r) { map[r.d] = r; }); var outL = [], t = new Date(Date.now() + 8 * 3600e3);
    for (var i = days - 1; i >= 0; i--) { var d = new Date(t - i * 864e5).toISOString().slice(0, 10); outL.push(map[d] || { d: d, opens: 0, visitors: 0 }); } return outL; }
  function chart(list) {
    var W = 1000, H = 200, max = Math.max(1, ...list.map(function (r) { return r.visitors; })), bw = W / list.length, gap = Math.min(4, bw * .25);
    var bars = list.map(function (r, i) { var h = r.visitors / max * (H - 10), x = i * bw + gap / 2, w = Math.max(1, bw - gap);
      return '<rect x="' + x.toFixed(1) + '" y="' + (H - h).toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="' + Math.min(4, w / 2) + '" fill="var(--bar)"></rect>' +
        '<rect class="hit" data-i="' + i + '" x="' + (i * bw).toFixed(1) + '" y="0" width="' + bw.toFixed(1) + '" height="' + H + '" fill="transparent"></rect>'; }).join("");
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + (H + 22) + '" preserveAspectRatio="none" role="img" aria-label="Visitors each day"><line x1="0" x2="' + W + '" y1="' + H + '" y2="' + H + '" stroke="var(--line)"></line>' + bars +
      '<text x="0" y="' + (H + 18) + '" fill="var(--mute)" font-size="12">' + list[0].d + '</text><text x="' + W + '" y="' + (H + 18) + '" fill="var(--mute)" font-size="12" text-anchor="end">' + list[list.length - 1].d + '</text></svg><div class="tip"></div></div>';
  }
  function draw(j) {
    var list = fill(j.byDay || []), sumPart = (j.parts || []).reduce(function (a, r) { return a + r.visitors; }, 0);
    out.innerHTML = '<div class="tiles"><div class="tile"><b>' + n(j.visitors) + '</b><span>visitors in ' + j.days + ' days</span></div><div class="tile"><b>' + n(j.opens) + '</b><span>times the site was opened</span></div>' +
      '<div class="tile"><b>' + n(Math.round(j.visitors / j.days * 10) / 10) + '</b><span>visitors a day, on average</span></div><div class="tile"><b>' + n(sumPart) + '</b><span>parts opened (About, Loans, ...)</span></div></div>' +
      '<section class="card"><h2>Visitors each day</h2>' + chart(list) + '<details><summary>Show as a table</summary><table><thead><tr><th>Day</th><th class="n">Visitors</th><th class="n">Opens</th></tr></thead><tbody>' +
      list.slice().reverse().map(function (r) { return '<tr><td>' + r.d + '</td><td class="n">' + n(r.visitors) + '</td><td class="n">' + n(r.opens) + '</td></tr>'; }).join("") + '</tbody></table></details></section>' +
      '<div class="grid2"><section class="card"><h2>What they opened</h2>' + rows(j.parts || [], "part", "visitors", PART) + '</section><section class="card"><h2>Where they came from</h2>' + rows(j.referrers || [], "site", "opens") + '</section>' +
      '<section class="card"><h2>On what device</h2>' + rows(j.devices || [], "device", "visitors", DEV) + '</section></div>';
    var box = out.querySelector(".chart"), tip = box.querySelector(".tip");
    box.addEventListener("pointermove", function (e) { var h = e.target.closest(".hit"); if (!h) { tip.style.opacity = 0; return; } var r = list[+h.dataset.i], b = box.getBoundingClientRect();
      tip.innerHTML = esc(r.d) + ' · <b>' + n(r.visitors) + '</b> visitors, ' + n(r.opens) + ' opens'; tip.style.left = Math.min(b.width - 80, Math.max(80, e.clientX - b.left)) + "px"; tip.style.top = (e.clientY - b.top) + "px"; tip.style.opacity = 1; });
    box.addEventListener("pointerleave", function () { tip.style.opacity = 0; });
  }
  function load() {
    out.innerHTML = '<p class="sub" style="margin-top:24px">Loading...</p>';
    fetch("/api/visits?days=" + days, { credentials: "same-origin" }).then(function (r) {
      if (r.status === 401) { out.innerHTML = '<div class="msg">Sign in to CALMS first, then open this page again. <a href="../index.html">Sign in</a></div>'; return; }
      if (r.status === 403) { out.innerHTML = '<div class="msg">This page is for the System Administrator, the Operations Manager and the Compliance Auditor.</div>'; return; }
      return r.json().then(draw);
    }).catch(function () { out.innerHTML = '<div class="msg">We couldn\'t reach CALMS just now. Try again in a moment.</div>'; });
  }
  Array.prototype.forEach.call(document.querySelectorAll(".range button"), function (b) { b.addEventListener("click", function () { days = +b.dataset.d; document.querySelectorAll(".range button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); load(); }); });
  load();
})();
