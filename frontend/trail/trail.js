/* The GR8 Trail (DRAFT): the moving parts of every public page. Sample data only for now; the real version will read
   /api/public/... (products, tracking, the borrower's own loan) from the same server as CALMS. */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var peso = function (n, c) { return "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: c ? 2 : 0, maximumFractionDigits: c ? 2 : 0 }); };

  /* the products, as CALMS holds them (Products and rules) */
  var PRODUCTS = [
    { key: "salary", name: "Salary loan", who: "For the employed. Paid by salary deduction or any channel.", rate: 0.016, method: "flat", fee: 0.025, min: 10000, max: 200000, terms: [6, 12, 18, 24], tag: "Lowest fee",
      papers: ["Government ID", "Pay stubs", "Certificate of employment", "Proof of billing", "Bank statement"] },
    { key: "personal", name: "Personal loan", who: "For anyone with a steady income, for whatever life brings.", rate: 0.018, method: "diminishing", fee: 0.033, min: 10000, max: 150000, terms: [6, 12, 18], tag: "Fewest papers",
      papers: ["Government ID", "Proof of income", "Proof of billing"] },
    { key: "sme", name: "SME loan", who: "For registered businesses ready to grow.", rate: 0.015, method: "diminishing", fee: 0.033, min: 50000, max: 1000000, terms: [12, 18, 24, 36], tag: "Up to ₱1M",
      papers: ["Government ID", "DTI or SEC registration", "Financial statements", "Business permit", "Bank statements"] }
  ];
  /* the same arithmetic as CALMS (backend lib/loans.js) */
  function monthly(p, amt, term) { return p.method === "flat" ? (amt + amt * p.rate * term) / term : amt * p.rate / (1 - Math.pow(1 + p.rate, -term)); }
  function weigh(p, amt, term) { var m = Math.round(monthly(p, amt, term) * 100) / 100, tot = m * term; return { m: m, total: tot, interest: tot - amt, fee: amt * p.fee, net: amt - amt * p.fee }; }

  /* ---- the masthead: dropdowns (hover on a computer, tap anywhere), the phone menu, and the slim bar after scrolling ---- */
  var gov = $("#top");
  if (gov) {
    var dds = $$(".dd", gov);
    dds.forEach(function (d) { var b = $("button", d); b.addEventListener("click", function (e) { e.stopPropagation(); var o = !d.classList.contains("open"); dds.forEach(function (x) { x.classList.remove("open"); $("button", x).setAttribute("aria-expanded", "false"); }); d.classList.toggle("open", o); b.setAttribute("aria-expanded", String(o)); }); });
    document.addEventListener("click", function (e) { if (!e.target.closest(".dd")) dds.forEach(function (x) { x.classList.remove("open"); $("button", x).setAttribute("aria-expanded", "false"); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { dds.forEach(function (x) { x.classList.remove("open"); }); gov.classList.remove("open"); } });
    var burger = $(".burger", gov); if (burger) burger.addEventListener("click", function () { var o = gov.classList.toggle("open"); burger.setAttribute("aria-expanded", String(o)); });
    $$(".menu a", gov).forEach(function (a) { a.addEventListener("click", function () { gov.classList.remove("open"); dds.forEach(function (x) { x.classList.remove("open"); }); }); });
    var stick = function () { gov.classList.toggle("stuck", scrollY > gov.offsetHeight + 40); }; stick(); addEventListener("scroll", stick, { passive: true });
  }

  /* ---- reveals: things slide, swing, drop or slam in as they reach the screen ---- */
  var rvs = $$(".rv, .lines");
  if (calm || !("IntersectionObserver" in window)) rvs.forEach(function (e) { e.classList.add("in"); });
  else { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -10% 0px", threshold: .12 });
    rvs.forEach(function (e) { io.observe(e); }); }

  /* ---- the street: the layers part as you scroll (near ones fast, far ones slow) and morning turns to noon ---- */
  var scenes = $$(".scene"), trainBox = $(".trail"), train = $(".train"), stops = $$(".stop");
  var ticking = false;
  function frame() {
    ticking = false; var vh = innerHeight;
    scenes.forEach(function (sc) { var r = sc.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return; var y = -r.top;
      $$("[data-depth]", sc).forEach(function (l) { var d = +l.dataset.depth; l.style.transform = (l.classList.contains("sun") ? "" : "translateX(-50%) ") + "translateY(" + (y * d).toFixed(1) + "px)"; });
      var noon = $(".sky.noon", sc); if (noon) noon.style.opacity = Math.min(1, Math.max(0, y / (r.height * .8))).toFixed(2); });
    if (trainBox && train) { var b = trainBox.getBoundingClientRect(), p = Math.min(1, Math.max(0, (vh * .75 - b.top) / (b.height + vh * .2)));
      train.parentNode.style.setProperty("--p", p.toFixed(3)); train.style.setProperty("--p", p.toFixed(3));
      stops.forEach(function (s, i) { s.classList.toggle("lit", p >= i / (stops.length - 1) - .02); }); }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  if (!calm) { addEventListener("scroll", onScroll, { passive: true }); addEventListener("resize", onScroll); frame(); }

  /* ---- Kuwa, the guide: says something about the part of the page you're on ---- */
  var guide = $("#guide"), say = $("#say"), kuwa = $("#kuwa"), quiet = false, lastKey = "";
  try { quiet = sessionStorage.getItem("trail-quiet") === "1"; } catch (e) {}
  function speak(sec) {
    if (!say || !sec || !sec.dataset.kuwa) return; var key = sec.dataset.kuwa; if (key === lastKey) return; lastKey = key;
    var parts = key.split("|"); $("b", say).textContent = parts[0]; $("span", say).textContent = parts[1] || "";
    kuwa.classList.toggle("sleep", !!sec.dataset.sleep);
    if (quiet) return; say.hidden = false; say.style.animation = "none"; void say.offsetWidth; say.style.animation = "";
    /* on a phone the note covers the page, so it tucks itself away after a few seconds (Kuwa stays; tap him to hear it again) */
    clearTimeout(speak.t); speak.t = setTimeout(function () { say.hidden = true; }, matchMedia("(max-width: 640px)").matches ? 5500 : 8000);
  }
  if (guide) {
    var secs = $$("[data-kuwa]");
    if ("IntersectionObserver" in window) { var gio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) speak(e.target); }); }, { rootMargin: "-45% 0px -45% 0px" }); secs.forEach(function (s) { gio.observe(s); }); }
    if (secs[0]) setTimeout(function () { speak(secs[0]); }, 900);
    $("button", say).addEventListener("click", function () { say.hidden = true; quiet = true; try { sessionStorage.setItem("trail-quiet", "1"); } catch (e) {} });
    function poke() { quiet = false; try { sessionStorage.removeItem("trail-quiet"); } catch (e) {} kuwa.classList.remove("sleep", "wave"); void kuwa.offsetWidth; kuwa.classList.add("wave");
      if (say.hidden) { say.hidden = false; } else { $("b", say).textContent = "Need a hand?"; $("span", say).textContent = "Ask at the branch, or wire us from the Track page. I'm only an owl, but I'm a good listener."; } }
    kuwa.addEventListener("click", poke); kuwa.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); poke(); } });
    kuwa.addEventListener("animationend", function () { kuwa.classList.remove("wave"); });
  }

  /* ---- the live clock in the strip (Philippine Standard Time) ---- */
  var pst = $("#pst"); if (pst) { var tick = function () { var d = new Date(), o = { timeZone: "Asia/Manila" }; pst.textContent = d.toLocaleDateString("en-US", Object.assign({ weekday: "long", month: "long", day: "numeric", year: "numeric" }, o)) + " at " + d.toLocaleTimeString("en-GB", Object.assign({ hour12: false }, o)); }; tick(); setInterval(tick, 1000); }

  /* ---- GR8 today: the news rail's arrows ---- */
  $$(".rail .arrows button").forEach(function (b) { b.addEventListener("click", function () { var t = $(".track2", b.closest(".rail")), card = $(".news", t); t.scrollBy({ left: +b.dataset.dir * (card.offsetWidth + 26), behavior: calm ? "auto" : "smooth" }); }); });

  /* ---- the statement: its words light up one by one as you scroll through it ---- */
  var words = $("#words");
  if (words) { (function wrapWords(node) { [].slice.call(node.childNodes).forEach(function (c) {
      if (c.nodeType === 3) { var frag = document.createDocumentFragment(); c.nodeValue.split(/(\s+)/).forEach(function (w) { if (!w) return; if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w)); else { var sp = document.createElement("span"); sp.className = "w"; sp.textContent = w; frag.appendChild(sp); } }); node.replaceChild(frag, c); }
      else if (c.nodeType === 1 && c.classList.contains("grad")) { c.classList.add("w"); } else if (c.nodeType === 1) wrapWords(c); }); })(words);
    var ws = $$(".w", words); var lightWords = function () { var r = words.getBoundingClientRect(), p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (r.height + innerHeight * .35))); ws.forEach(function (w, i) { w.classList.toggle("on", i < Math.ceil(p * ws.length * 1.15)); }); };
    if (calm) ws.forEach(function (w) { w.classList.add("on"); }); else { addEventListener("scroll", lightWords, { passive: true }); lightWords(); } }

  /* ---- numbers count up when they come into view ---- */
  function countUp(el) { var to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.pre || "", suf = el.dataset.suf || "", t0 = null;
    function step(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - k, 3); el.textContent = pre + (to * e).toLocaleString("en-PH", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; if (k < 1) requestAnimationFrame(step); }
    if (calm) el.textContent = pre + to.toLocaleString("en-PH", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf; else requestAnimationFrame(step); }
  var nums = $$("[data-count]"); if ("IntersectionObserver" in window) { var nio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { countUp(e.target); nio.unobserve(e.target); } }); }, { threshold: .6 }); nums.forEach(function (n) { nio.observe(n); }); } else nums.forEach(countUp);

  /* ---- loan programs: one loan at a time, picked from the list at the side ---- */
  var prog = $("#prog"), side = $("#side");
  if (prog && side) {
    var showProg = function (p, anim) {
      $$("button", side).forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.k === p.key)); });
      var ex = weigh(p, Math.max(p.min, 50000), p.terms[1] || p.terms[0]);
      prog.innerHTML = '<span class="tag">Loan program</span><h2></h2><p class="who"></p>' +
        '<dl><div><dt>Rate</dt><dd>' + (p.rate * 100).toFixed(1) + '%<small style="font-size:13px;color:var(--dim)"> /mo</small></dd></div><div><dt>Borrow</dt><dd>' + peso(p.min / 1000) .replace("₱", "₱") + 'K–' + (p.max >= 1e6 ? "1M" : p.max / 1000 + "K") + '</dd></div><div><dt>Months</dt><dd>' + p.terms[0] + "–" + p.terms[p.terms.length - 1] + '</dd></div><div><dt>Fee</dt><dd>' + (p.fee * 100).toFixed(1) + '%</dd></div></dl>' +
        '<ul class="papers">' + p.papers.map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul>' +
        '<div class="ctas"><a class="btn" href="apply.html?loan=' + p.key + '">Apply for this <span class="arr">→</span></a><a class="btn wood" href="#calc" data-calc="' + p.key + '">Example: ' + peso(ex.m, true) + ' a month</a></div>';
      $("h2", prog).innerHTML = p.name.replace(/(\S+) loan/, '<span class="grad">$1</span><br>loan'); $(".who", prog).textContent = p.who + " " + (p.method === "flat" ? "Flat rate on the amount borrowed." : "Interest only on what you still owe.");
      if (anim) { prog.classList.remove("swap"); void prog.offsetWidth; prog.classList.add("swap"); }
    };
    PRODUCTS.forEach(function (p) { var b = document.createElement("button"); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.k = p.key; b.textContent = p.name; b.addEventListener("click", function () { showProg(p, true); }); side.appendChild(b); });
    var all = document.createElement("button"); all.type = "button"; all.textContent = "Compare all"; all.addEventListener("click", function () { $("#calc").scrollIntoView({ behavior: calm ? "auto" : "smooth" }); }); side.appendChild(all);
    var askLoan = new URLSearchParams(location.search).get("loan"); showProg(PRODUCTS.filter(function (p) { return p.key === askLoan; })[0] || PRODUCTS[0], false);
  }

  /* ---- the assay office (calculator): also used by Stake a claim ---- */
  function calculator(root, onChange) {
    var prodBox = $("#cProd", root), termBox = $("#cTerm", root), amt = $("#cAmt", root), rng = $("#cRange", root); if (!prodBox || !amt) return null;
    var st = { p: PRODUCTS[0], amt: 50000, term: 12 };
    var qs = new URLSearchParams(location.search), want = qs.get("loan") || ""; PRODUCTS.forEach(function (p) { if (p.key === want) st.p = p; });
    if (+qs.get("amt")) st.amt = +qs.get("amt"); if (+qs.get("term")) st.term = +qs.get("term");
    function seg(box, items, cur, label, pick) { box.textContent = ""; items.forEach(function (it) { var b = document.createElement("button"); b.type = "button"; b.textContent = label(it); b.setAttribute("aria-pressed", String(it === cur)); b.addEventListener("click", function () { pick(it); }); box.appendChild(b); }); }
    function draw() {
      var p = st.p; st.amt = Math.min(p.max, Math.max(p.min, st.amt)); if (p.terms.indexOf(st.term) < 0) st.term = p.terms[Math.min(1, p.terms.length - 1)];
      seg(prodBox, PRODUCTS, p, function (x) { return { salary: "a salary loan", personal: "a personal loan", sme: "an SME loan" }[x.key] || x.name; }, function (x) { st.p = x; draw(); });
      seg(termBox, p.terms, st.term, String, function (t) { st.term = t; draw(); });
      rng.min = p.min; rng.max = p.max; rng.step = p.max > 300000 ? 5000 : 1000; rng.value = st.amt; rng.style.setProperty("--fill", ((st.amt - p.min) / (p.max - p.min) * 100) + "%");
      if (document.activeElement !== amt) amt.value = st.amt.toLocaleString("en-PH");
      var mn = $("#cMin", root), mx = $("#cMax", root); if (mn) mn.textContent = peso(p.min); if (mx) mx.textContent = peso(p.max);
      var w = weigh(p, st.amt, st.term); onChange(st, w);
    }
    rng.addEventListener("input", function () { st.amt = +rng.value; draw(); });
    amt.addEventListener("input", function () { var v = +amt.value.replace(/[^0-9]/g, ""); if (v) { st.amt = v; draw(); } });
    amt.addEventListener("blur", function () { amt.value = st.amt.toLocaleString("en-PH"); });
    st.pick = function (key) { PRODUCTS.forEach(function (p) { if (p.key === key) st.p = p; }); draw(); };
    draw(); return st;
  }
  var slip = $(".slip");
  var CALC = slip && calculator(document, function (st, w) {
    $("#cPay").textContent = peso(w.m, true); $("#cPer").textContent = "every month for " + st.term + " months";
    $("#cNet").textContent = peso(w.net, true); $("#cFee").textContent = peso(w.fee, true); $("#cInt").textContent = peso(w.interest, true); $("#cTot").textContent = peso(w.total, true);
    $("#cBarP").style.width = (st.amt / w.total * 100) + "%"; $("#cBarI").style.width = (w.interest / w.total * 100) + "%";
    $("#cFine").textContent = (st.p.method === "flat" ? "Flat rate: interest is " + (st.p.rate * 100).toFixed(1) + "% of the amount borrowed, every month." : "Diminishing rate: " + (st.p.rate * 100).toFixed(1) + "% a month on what you still owe, so interest shrinks as you pay.") + " An estimate until your loan is approved.";
    $("#cGo").href = "apply.html?loan=" + st.p.key + "&amt=" + st.amt + "&term=" + st.term;
    $$("#cProd button").forEach(function (b, i) { var x = PRODUCTS[i]; if (x && !b.querySelector("small")) { var sm = document.createElement("small"); sm.textContent = (x.rate * 100).toFixed(1) + "% / mo"; b.appendChild(sm); } });
    var cmp = $("#cCmp"); if (cmp) { cmp.textContent = ""; PRODUCTS.forEach(function (p) { var tr = document.createElement("tr"), ok = st.amt >= p.min && st.amt <= p.max, t = p.terms.indexOf(st.term) >= 0 ? st.term : p.terms[p.terms.length - 1];
      tr.className = p === st.p ? "on" : ""; tr.innerHTML = "<td></td><td></td>"; tr.cells[0].textContent = p.name + (t !== st.term ? " (" + t + " mo)" : "");
      tr.cells[1].innerHTML = ok ? peso(weigh(p, st.amt, t).m, true) + "<small> /mo</small>" : "<small>" + (st.amt < p.min ? "from " + peso(p.min) : "up to " + peso(p.max)) + "</small>"; cmp.appendChild(tr); }); }
  });

  /* ---- the loans, as rows: a click sets the calculator to that loan ---- */
  var rowsBox = $("#loanRows");
  if (rowsBox) PRODUCTS.forEach(function (p, i) {
    var li = document.createElement("li"); li.className = "loan rv"; li.style.setProperty("--d", i); li.tabIndex = 0; li.setAttribute("role", "link");
    li.innerHTML = '<span class="n">[0' + (i + 1) + ']</span><div><h3></h3><p></p></div><dl><dt>Rate</dt><dd>' + (p.rate * 100).toFixed(1) + '% a month</dd></dl><dl><dt>Borrow</dt><dd>' + peso(p.min) + '–' + (p.max >= 1e6 ? "₱1M" : peso(p.max)) + '</dd></dl><dl><dt>Months</dt><dd>' + p.terms[0] + '–' + p.terms[p.terms.length - 1] + '</dd></dl><span class="go" aria-hidden="true">↗</span>';
    $("h3", li).textContent = p.name; $("p", li).textContent = p.who;
    var go = function () { if (CALC) CALC.pick(p.key); var w = $("#weigh"); if (w) w.scrollIntoView({ behavior: calm ? "auto" : "smooth" }); };
    li.addEventListener("click", go); li.addEventListener("keydown", function (e) { if (e.key === "Enter") go(); });
    rowsBox.appendChild(li); if (!calm && "IntersectionObserver" in window) io.observe(li); else li.classList.add("in");
  });

  /* ---- the pill: menu, settings (dark mode, Kuwa's tips) and Kuwa's notes ---- */
  var pill = $("#pill");
  if (pill) {
    var tog = $(".tog", pill), scrim = $("#scrim"), sayBox = $("#say", pill), kw = $("#kuwa", pill), tips = true;
    try { tips = localStorage.getItem("gr8-tips") !== "off"; } catch (e) {}
    var setOpen = function (o) { pill.classList.toggle("open", o); tog.setAttribute("aria-expanded", String(o)); };
    tog.addEventListener("click", function () { setOpen(!pill.classList.contains("open")); });
    if (scrim) scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    $$(".card a", pill).forEach(function (a) { if (a.getAttribute("href").split("#")[0] === (location.pathname.split("/").pop() || "index.html") && !/#/.test(a.getAttribute("href"))) a.setAttribute("aria-current", "page"); a.addEventListener("click", function () { setOpen(false); }); });
    var sw = function (id, on, fn) { var b = $(id, pill); if (!b) return; b.setAttribute("aria-checked", String(on)); b.addEventListener("click", function () { var v = b.getAttribute("aria-checked") !== "true"; b.setAttribute("aria-checked", String(v)); fn(v); }); };
    sw("#darkSw", document.documentElement.classList.contains("dark"), function (v) { document.documentElement.classList.toggle("dark", v); try { localStorage.setItem("gr8-theme", v ? "dark" : "light"); } catch (e) {} });
    sw("#tipSw", tips, function (v) { tips = v; try { localStorage.setItem("gr8-tips", v ? "on" : "off"); } catch (e) {} if (!v) sayBox.hidden = true; });
    var said = "", hideT = 0;
    var tell = function (key, force) { if (!key || (!tips && !force)) return; if (key === said && !force) return; said = key; sayBox.classList.toggle("help", !!force); var parts = key.split("|"); $("b", sayBox).textContent = parts[0]; $("span", sayBox).textContent = parts[1] || "";
      sayBox.hidden = false; sayBox.style.animation = "none"; void sayBox.offsetWidth; sayBox.style.animation = ""; clearTimeout(hideT); hideT = setTimeout(function () { sayBox.hidden = true; }, 7000); };
    $("button", sayBox).addEventListener("click", function () { sayBox.hidden = true; });
    $("#kuwaBtn", pill).addEventListener("click", function () { kw.classList.remove("wave"); void kw.offsetWidth; kw.classList.add("wave"); if (window.KUWA_CHAT) { sayBox.hidden = true; window.KUWA_CHAT.open(); return; } if (!sayBox.hidden) { sayBox.hidden = true; return; } said = ""; tell("Need a hand?|Here's where most folks start:", true); });
    kw.addEventListener("animationend", function () { kw.classList.remove("wave"); });
    var ks = $$("[data-kuwa]");
    if ("IntersectionObserver" in window) { var kio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) tell(e.target.dataset.kuwa); }); }, { rootMargin: "-45% 0px -45% 0px" }); ks.forEach(function (k) { kio.observe(k); }); }
    if (ks[0]) setTimeout(function () { tell(ks[0].dataset.kuwa); }, 1800);
  }

  /* ---- the intro: the name for a moment, once per visit ---- */
  var intro = $("#intro");
  if (intro) { var seen = false; try { seen = sessionStorage.getItem("gr8-intro") === "1"; sessionStorage.setItem("gr8-intro", "1"); } catch (e) {}
    var go2 = function () { intro.classList.add("gone"); setTimeout(function () { intro.remove(); }, 800); };
    if (seen || calm) intro.remove(); else { setTimeout(go2, 1300); intro.addEventListener("click", go2); } }

  /* plain choice rows (no script of their own): one pressed at a time */
  $$(".seg:not([id])").forEach(function (g) { $$("button", g).forEach(function (b) { b.addEventListener("click", function () { $$("button", g).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); }); }); });

  /* ================= Stake a claim (apply) ================= */
  if (document.body.dataset.page === "apply") (function () {
    var q = new URLSearchParams(location.search), panes = $$(".pane"), dots = $$(".steps li"), at = 0, st = null;
    var tk = { prod: $("#tProd"), amt: $("#tAmt"), term: $("#tTerm"), m: $("#tM"), fee: $("#tFee"), net: $("#tNet") };
    st = calculator(document, function (s, w) { tk.prod.textContent = s.p.name; tk.amt.textContent = peso(s.amt); tk.term.textContent = s.term + " months"; tk.fee.textContent = peso(w.fee, true); tk.net.textContent = peso(w.net, true); tk.m.textContent = peso(w.m, true);
      var list = $("#papers"); if (list && list.dataset.k !== s.p.key) { list.dataset.k = s.p.key; list.textContent = ""; ["Signed consent form"].concat(s.p.papers).forEach(function (x, i) {
        var li = document.createElement("div"); li.className = "slot"; li.innerHTML = '<span><b></b><small>' + (i === 0 ? "You sign it in the last step" : "Photo or PDF, up to 10 MB") + '</small></span>' + (i === 0 ? "" : '<button class="btn sm paper" type="button">Add</button>'); $("b", li).textContent = x;
        var b = $("button", li); if (b) b.addEventListener("click", function () { li.classList.add("got"); b.textContent = "Added ✓"; $("small", li).textContent = "photo_" + (i + 1) + ".jpg · 1.2 MB"; }); list.appendChild(li); }); } });
    function go(i) { at = Math.max(0, Math.min(panes.length - 1, i)); panes.forEach(function (p, j) { p.hidden = j !== at; }); dots.forEach(function (d, j) { d.className = j < at ? "done" : j === at ? "now" : ""; });
      var h = $(".steps"); if (h) scrollTo({ top: h.getBoundingClientRect().top + scrollY - 100, behavior: calm ? "auto" : "smooth" }); }
    $$("[data-next]").forEach(function (b) { b.addEventListener("click", function () { var pane = b.closest(".pane"), bad = $$("[required]", pane).filter(function (x) { return !x.checkValidity(); })[0]; if (bad) { bad.reportValidity(); return; } go(at + 1); }); });
    $$("[data-back]").forEach(function (b) { b.addEventListener("click", function () { go(at - 1); }); });
    var file = $("#file"); if (file) file.addEventListener("click", function () { var pane = file.closest(".pane"), bad = $$("[required]", pane).filter(function (x) { return !x.checkValidity(); })[0]; if (bad) { bad.reportValidity(); return; }
      $("#claimForm").hidden = true; $(".ticket").hidden = true; $("#filed").hidden = false; dots.forEach(function (d) { d.className = "done"; }); $(".claim").style.gridTemplateColumns = "1fr"; scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" }); });
    /* the signature pad */
    var pad = $(".sigpad canvas"); if (pad) { var c = pad.getContext("2d"), down = false;
      function fit() { var r = pad.getBoundingClientRect(); if (!r.width) return; pad.width = r.width * devicePixelRatio; pad.height = r.height * devicePixelRatio; c.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); c.lineWidth = 2.4; c.lineCap = "round"; c.strokeStyle = "#24130a"; }
      setTimeout(fit, 50); addEventListener("resize", fit);
      function pt(e) { var r = pad.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
      pad.addEventListener("pointerdown", function (e) { if (pad.width !== Math.round(pad.getBoundingClientRect().width * devicePixelRatio)) fit(); down = true; pad.setPointerCapture(e.pointerId); var p = pt(e); c.beginPath(); c.moveTo(p[0], p[1]); });
      pad.addEventListener("pointermove", function (e) { if (!down) return; var p = pt(e); c.lineTo(p[0], p[1]); c.stroke(); });
      pad.addEventListener("pointerup", function () { down = false; });
      var clr = $("#sigClear"); if (clr) clr.addEventListener("click", function () { c.clearRect(0, 0, pad.width, pad.height); }); }
    go(0);
  })();

  /* ================= Downloads: the staff app's link lives in one place (downloads.html, data-href) ================= */
  $$("[data-download]").forEach(function (b) { var href = b.getAttribute("data-href") || "";
    if (href) { b.href = href; return; }
    b.removeAttribute("href"); b.setAttribute("aria-disabled", "true"); b.classList.add("off"); b.querySelector("span").textContent = "Installer link coming soon"; });

  /* ================= Trail map (track) ================= */
  if (document.body.dataset.page === "track") (function () {
    var q = new URLSearchParams(location.search), form = $("#trackForm"), out = $("#trackOut");
    var SAMPLE = { ref: "APP-2026-0412", name: "Maria Santos", loan: "Personal loan · ₱60,000 · 12 months", at: 2,
      wires: [["Oct 16, 2:14 PM", "<b>With the underwriter.</b> Your papers are complete and your credit report has been requested. Expect word in 1 to 2 working days."],
               ["Oct 15, 10:02 AM", "<b>Papers checked.</b> ID and proof of income verified by L. Mendoza."],
               ["Oct 14, 4:40 PM", "<b>Papers received.</b> 4 of 4 papers on file."],
               ["Oct 14, 4:31 PM", "<b>Application received.</b> APP-2026-0412, filed online."]] };
    function show(ref) {
      $("#rRef").textContent = (ref || SAMPLE.ref).toUpperCase(); $("#rName").textContent = SAMPLE.name; $("#rLoan").textContent = SAMPLE.loan;
      var stations = $$(".station", out); stations.forEach(function (s, i) { s.className = "station" + (i < SAMPLE.at ? " done" : i === SAMPLE.at ? " now" : ""); });
      var ul = $("#wires"); ul.textContent = ""; SAMPLE.wires.forEach(function (w) { var li = document.createElement("li"); li.innerHTML = "<time>" + w[0] + "</time><span>" + w[1] + "</span>"; ul.appendChild(li); });
      out.hidden = false; var line = $(".line", out); line.style.setProperty("--p", 0); setTimeout(function () { line.style.setProperty("--p", SAMPLE.at / (stations.length - 1)); }, 120);
      out.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); show($("#ref").value); });
    if (q.get("ref")) { $("#ref").value = q.get("ref"); $("#mob").value = q.get("m") || ""; setTimeout(function () { show(q.get("ref")); }, 300); }
  })();

  /* ================= Homestead gate (sign in) ================= */
  if (document.body.dataset.page === "signin") (function () {
    var one = $("#gateOne"), two = $("#gateTwo"), boxes = $$(".code input");
    $("#sendCode").addEventListener("click", function () { var m = $("#gMob"); if (!m.checkValidity()) { m.reportValidity(); return; } $("#sentTo").textContent = m.value; one.hidden = true; two.hidden = false; boxes[0].focus(); });
    boxes.forEach(function (b, i) { b.addEventListener("input", function () { b.value = b.value.replace(/\D/g, "").slice(-1); if (b.value && boxes[i + 1]) boxes[i + 1].focus(); if (boxes.every(function (x) { return x.value; })) setTimeout(function () { location.href = "home.html"; }, 350); });
      b.addEventListener("keydown", function (e) { if (e.key === "Backspace" && !b.value && boxes[i - 1]) boxes[i - 1].focus(); });
      b.addEventListener("paste", function (e) { var t = (e.clipboardData.getData("text") || "").replace(/\D/g, ""); if (t.length >= boxes.length) { e.preventDefault(); boxes.forEach(function (x, j) { x.value = t[j]; }); setTimeout(function () { location.href = "home.html"; }, 350); } }); });
    $("#back").addEventListener("click", function () { two.hidden = true; one.hidden = false; });
  })();

  /* ================= My trail (home) ================= */
  if (document.body.dataset.page === "home") (function () {
    var tabs = $$(".tabs button"), panels = $$("[data-panel]");
    tabs.forEach(function (t) { t.addEventListener("click", function () { tabs.forEach(function (x) { x.setAttribute("aria-selected", String(x === t)); }); panels.forEach(function (p) { p.hidden = p.dataset.panel !== t.dataset.tab; }); }); });
    var tg = $("#offer"); $$("[data-answer]", tg || document).forEach(function (b) { b.addEventListener("click", function () { var yes = b.dataset.answer === "yes";
      tg.innerHTML = '<p><b>' + (yes ? "Offer taken." : "Offer turned down.") + '</b> ' + (yes ? "We're preparing your agreement and will text you when it's ready to sign." : "No cost to you. This application is closed, and you can apply again anytime.") + '</p><span class="stamp ' + (yes ? "green" : "grey") + ' rv slam in">' + (yes ? "Accepted" : "Declined") + "</span>"; }); });
  })();
})();
