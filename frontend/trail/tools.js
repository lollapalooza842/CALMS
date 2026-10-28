/* The working parts of each loan card's page (DRAFT). The page's top half is the reference layout; scroll down and
   each card has something you can actually use, priced with the real numbers from CALMS (/api/public/apply/products):
   loans -> a calculator and Apply; Apply -> start an application; Papers / what to bring -> a checklist that remembers;
   Review -> "can I carry it?"; Approval -> track an application; Release -> a payment schedule; Pay -> where to pay and
   My GR8; fair rules -> the fee, paying early, and late penalty worked out; your data -> what we keep and asking about it.
   window.GR8_TOOLS = { render(cardIndex, box), products() }  window.GR8_DATA = the loan products */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  /* the products: from CALMS, or the published defaults when CALMS can't be reached */
  var FALLBACK = [
    { name: "Salary loan", kind: "salary", min: 10000, max: 200000, months: [6, 12, 18, 24], rate: .016, method: "flat", fee: .025, penalty: .03, papers: [{ slot: "id", label: "Government ID" }, { slot: "pay", label: "Pay stubs" }, { slot: "coe", label: "Certificate of employment" }, { slot: "addr", label: "Proof of billing" }, { slot: "bank", label: "Bank statement" }] },
    { name: "Personal loan", kind: "personal", min: 10000, max: 150000, months: [6, 12, 18], rate: .018, method: "diminishing", fee: .033, penalty: .03, papers: [{ slot: "id", label: "Government ID" }, { slot: "income", label: "Proof of income" }, { slot: "addr", label: "Proof of billing" }] },
    { name: "SME loan", kind: "sme", min: 50000, max: 1000000, months: [12, 18, 24, 36], rate: .015, method: "diminishing", fee: .033, penalty: .03, papers: [{ slot: "id", label: "Government ID" }, { slot: "reg", label: "DTI or SEC registration" }, { slot: "fs", label: "Financial statements" }, { slot: "addr", label: "Proof of address" }, { slot: "permit", label: "Business permit" }, { slot: "bank", label: "Bank statements" }] }
  ];
  var DATA = { products: FALLBACK, idTypes: [{ name: "PhilSys ID", looks: "0000-0000-0000-0000" }, { name: "TIN", looks: "000-000-000-000" }, { name: "SSS", looks: "00-0000000-0" }, { name: "Driver's license", looks: "A00-00-000000" }, { name: "Passport", looks: "P0000000A" }], live: false };
  var ready = fetch("/api/public/apply/products").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (j && j.products && j.products.length) { DATA.products = j.products; DATA.idTypes = j.idTypes || DATA.idTypes; DATA.live = true; } return DATA;
  }).catch(function () { return DATA; });
  window.GR8_DATA = DATA; window.GR8_DATA_READY = ready;
  var byKind = function (k) { return DATA.products.filter(function (p) { return p.kind === k; })[0] || DATA.products[0]; };

  /* loan arithmetic, the same as CALMS's lib/loans.js */
  var round = function (n) { return Math.round(n * 100) / 100; };
  function installment(a, t, r, m) { return m === "flat" ? (a + a * r * t) / t : a * r / (1 - Math.pow(1 + r, -t)); }
  function schedule(a, t, r, m, start) {
    var mo = installment(a, t, r, m), bal = a, rows = [], d0 = start ? new Date(start + "T00:00:00") : new Date();
    for (var n = 1; n <= t; n++) { var due = new Date(d0.getFullYear(), d0.getMonth() + n, Math.min(d0.getDate(), 28)), it = m === "flat" ? round(a * r) : round(bal * r), pr = m === "flat" ? round(a / t) : round(mo - it); if (n === t) pr = round(bal); bal = round(bal - pr); rows.push({ n: n, due: due, principal: pr, interest: it, balance: bal }); }
    return rows;
  }
  var peso = function (n) { return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var peso0 = function (n) { return "₱" + Math.round(n).toLocaleString("en-PH"); };
  var pct = function (r) { return (r * 100).toFixed(r * 100 % 1 ? 1 : 0) + "%"; };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var date = function (d) { return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }); };
  var sound = function (on) { if (window.GR8_STAGE && window.GR8_STAGE.pick) window.GR8_STAGE.pick(on); };

  /* small building blocks, all in the page's type: a soft label with a hooked arrow, then the thing itself */
  function lab(t) { return '<h4 class="tl-l">' + esc(t) + ' <i>↴</i></h4>'; }
  function chips(name, list, on) { return '<div class="tl-chips" data-name="' + name + '">' + list.map(function (v) { return '<button type="button" class="tl-chip' + (String(v.v) === String(on) ? " on" : "") + '" data-v="' + esc(v.v) + '">' + esc(v.t) + "</button>"; }).join("") + "</div>"; }
  function productChips(on) { return chips("product", DATA.products.map(function (p) { return { v: p.kind, t: p.name }; }), on); }
  function amountRow(p, val) { return '<div class="tl-amt"><input class="tl-big" name="amount" inputmode="numeric" value="' + peso0(val).slice(1) + '"><span class="tl-cur">₱</span><input type="range" name="amountR" min="' + p.min + '" max="' + p.max + '" step="' + (p.max > 300000 ? 5000 : 1000) + '" value="' + val + '"><div class="tl-ends"><span>' + peso0(p.min) + "</span><span>" + peso0(p.max) + "</span></div></div>"; }
  function rows(list) { return '<dl class="tl-rows">' + list.map(function (r) { return "<div" + (r[2] ? ' class="hl"' : "") + "><dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd></div>"; }).join("") + "</dl>"; }
  function btn(t, act, extra) { return '<button type="button" class="tk-btn tl-btn" data-act="' + act + '"' + (extra || "") + "><span>" + esc(t) + "</span> <b>↳</b></button>"; }
  function note(t) { return '<p class="tl-note">' + t + "</p>"; }

  /* a calculator over a product: amount + months -> each month, fee, you receive, total to repay */
  function calc(box, kind, opts) {
    opts = opts || {}; var st = { kind: kind, amount: 0, months: 0 };
    function draw() {
      var p = byKind(st.kind); st.amount = Math.min(p.max, Math.max(p.min, st.amount || Math.round((p.min + p.max) / 4 / 1000) * 1000)); if (p.months.indexOf(st.months) < 0) st.months = p.months[Math.min(1, p.months.length - 1)];
      var m = installment(st.amount, st.months, p.rate, p.method), fee = st.amount * p.fee, tot = m * st.months;
      box.innerHTML = (opts.pickProduct ? '<div class="tl-b">' + lab("Loan") + productChips(st.kind) + "</div>" : "") +
        '<div class="tl-b">' + lab("How much") + amountRow(p, st.amount) + "</div>" +
        '<div class="tl-b">' + lab("For how long") + chips("months", p.months.map(function (n) { return { v: n, t: n + " months" }; }), st.months) + "</div>" +
        '<div class="tl-b">' + lab("What it costs") + rows([["Each month", peso(m), 1], ["Processing fee (" + pct(p.fee) + ", taken from the release)", peso(fee)], ["You receive", peso(st.amount - fee)], ["Total you repay", peso(tot)], ["Interest", pct(p.rate) + " a month, " + (p.method === "flat" ? "flat on the amount borrowed" : "on the balance left")]]) + "</div>" +
        (opts.extra ? opts.extra(st, p) : "") +
        '<div class="tl-acts">' + btn("Apply for this loan", "apply") + '<button type="button" class="tl-link" data-act="talk">Or talk it over first</button></div>' +
        note(DATA.live ? "Worked out with CALMS's own rates. The underwriter may approve a different amount or term; you'll see it before you sign." : "Sample rates while CALMS is offline. The real numbers appear when it answers.");
      wire();
    }
    function wire() {
      var big = $('[name="amount"]', box), rng = $('[name="amountR"]', box);
      rng.addEventListener("input", function () { st.amount = +rng.value; big.value = peso0(st.amount).slice(1); quick(); });
      rng.addEventListener("change", draw);
      big.addEventListener("change", function () { var v = +String(big.value).replace(/[^0-9.]/g, ""); if (v) st.amount = v; draw(); });
      box.querySelectorAll(".tl-chips").forEach(function (c) { c.addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (!b) return; if (c.dataset.name === "product") { st.kind = b.dataset.v; st.amount = 0; } else st.months = +b.dataset.v; sound(true); draw(); }); });
      box.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () { act(b.dataset.act, { kind: st.kind, amount: st.amount, months: st.months }); }); });
    }
    function quick() { var p = byKind(st.kind), m = installment(st.amount, st.months, p.rate, p.method), dd = box.querySelectorAll(".tl-rows dd"); if (dd.length >= 4) { dd[0].textContent = peso(m); dd[1].textContent = peso(st.amount * p.fee); dd[2].textContent = peso(st.amount - st.amount * p.fee); dd[3].textContent = peso(m * st.months); } }
    ready.then(draw);
  }

  /* actions every tool shares */
  function act(what, pre) {
    if (what === "apply" && window.GR8_APPLY) window.GR8_APPLY.open(pre || {});
    if (what === "talk" && window.GR8_STAGE) window.GR8_STAGE.talk(pre && pre.message);
    if (what === "mygr8") location.href = "signin.html";
  }

  /* the papers checklist: tick what you have; it remembers on this device */
  function checklist(box, kind, highlight) {
    var st = { kind: kind || "salary" }, KEY = "gr8-have";
    var have = {}; try { have = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    function draw() {
      var p = byKind(st.kind), list = p.papers.concat([{ slot: "consent", label: "Signed consent form (we give it to you)" }]), got = list.filter(function (d) { return have[st.kind + ":" + d.slot]; }).length;
      box.innerHTML = '<div class="tl-b">' + lab("For which loan") + productChips(st.kind) + "</div>" +
        '<div class="tl-b">' + lab("Tick what you already have") + '<ul class="tl-check">' + list.map(function (d) { var k = st.kind + ":" + d.slot, hl = highlight && highlight.indexOf(d.slot) >= 0;
          return '<li><label class="' + (hl ? "hl" : "") + '"><input type="checkbox" data-k="' + k + '"' + (have[k] ? " checked" : "") + '><span class="bx"></span><span class="t">' + esc(d.label) + "</span></label></li>"; }).join("") + "</ul></div>" +
        '<div class="tl-b">' + lab("You're ready") + '<div class="tl-meter"><i style="width:' + Math.round(got / list.length * 100) + '%"></i></div><p class="tl-v">' + got + " of " + list.length + " papers" + (got === list.length ? " · all set, you can apply" : "") + "</p></div>" +
        '<div class="tl-acts">' + btn(got === list.length ? "Apply now" : "Apply anyway, bring the rest later", "apply") + "</div>" + note("Saved on this device only. You can also send papers later from My GR8, or bring them to the branch.");
      box.querySelectorAll('input[type="checkbox"]').forEach(function (c) { c.addEventListener("change", function () { have[c.dataset.k] = c.checked; try { localStorage.setItem(KEY, JSON.stringify(have)); } catch (e) {} sound(c.checked); draw(); }); });
      $(".tl-chips", box).addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (b) { st.kind = b.dataset.v; sound(true); draw(); } });
      $('[data-act="apply"]', box).addEventListener("click", function () { act("apply", { kind: st.kind }); });
    }
    ready.then(draw);
  }

  /* can I carry it? the share of income a loan payment may take (40%, less what you already pay) -> the most you can borrow */
  function capacity(box) {
    var st = { kind: "salary", income: 25000, debts: 0, months: 12 };
    function draw() {
      var p = byKind(st.kind); if (p.months.indexOf(st.months) < 0) st.months = p.months[p.months.length - 1];
      var room = Math.max(0, st.income * .4 - st.debts), unit = installment(1, st.months, p.rate, p.method), most = Math.min(p.max, Math.floor(room / unit / 1000) * 1000), ok = most >= p.min;
      box.innerHTML = '<div class="tl-b">' + lab("Loan") + productChips(st.kind) + "</div>" +
        '<div class="tl-b tl-two"><label class="tl-f"><span>Monthly income</span><input name="income" inputmode="numeric" value="' + peso0(st.income).slice(1) + '"></label><label class="tl-f"><span>Other loan payments a month</span><input name="debts" inputmode="numeric" value="' + peso0(st.debts).slice(1) + '"></label></div>' +
        '<div class="tl-b">' + lab("Over") + chips("months", p.months.map(function (n) { return { v: n, t: n + " months" }; }), st.months) + "</div>" +
        '<div class="tl-b">' + lab("What our underwriter would see") + rows([["Room for a loan payment", peso(room) + " a month", 1], ["Most you could borrow", ok ? peso(most) : "Below the " + peso0(p.min) + " minimum"], ["That loan's monthly payment", ok ? peso(installment(most, st.months, p.rate, p.method)) : "–"]]) +
        '<p class="tl-v tl-say">' + (ok ? "A " + p.name.toLowerCase() + " up to about " + peso0(most) + " should sit comfortably." : "Right now a loan would weigh too much. Talk to us; a longer term or a smaller amount may work.") + "</p></div>" +
        '<div class="tl-acts">' + (ok ? btn("Apply for " + peso0(most), "apply") : "") + '<button type="button" class="tl-link" data-act="talk">Talk it over</button></div>' + note("A guide only: we keep loan payments under 40% of what you earn. The underwriter also looks at your papers and credit.");
      ["income", "debts"].forEach(function (n) { $('[name="' + n + '"]', box).addEventListener("change", function () { st[n] = +String(this.value).replace(/[^0-9.]/g, "") || 0; draw(); }); });
      box.querySelectorAll(".tl-chips").forEach(function (c) { c.addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (!b) return; if (c.dataset.name === "product") st.kind = b.dataset.v; else st.months = +b.dataset.v; sound(true); draw(); }); });
      box.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () { act(b.dataset.act, { kind: st.kind, amount: most, months: st.months }); }); });
    }
    ready.then(draw);
  }

  /* track an application: the reference and the last four digits of the mobile number */
  function track(box) {
    box.innerHTML = '<div class="tl-b tl-two"><label class="tl-f"><span>Reference</span><input name="ref" placeholder="APP-2026-0412" autocapitalize="characters" spellcheck="false"></label><label class="tl-f"><span>Last 4 digits of your mobile</span><input name="l4" inputmode="numeric" maxlength="4" placeholder="1234"></label></div>' +
      '<div class="tl-acts">' + btn("Track it", "go") + '</div><div class="tl-out"></div>' + note("Your reference is on the text we sent you, or on the screen after you applied online (it starts with W-).");
    var out = $(".tl-out", box);
    $('[data-act="go"]', box).addEventListener("click", function () {
      var ref = $('[name="ref"]', box).value.trim().toUpperCase(), l4 = $('[name="l4"]', box).value.trim();
      out.innerHTML = '<p class="tl-v">Looking...</p>';
      fetch("/api/public/track?ref=" + encodeURIComponent(ref) + "&last4=" + encodeURIComponent(l4)).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || "We couldn't reach CALMS just now."); return j; }); })
        .then(function (j) { sound(true);
          out.innerHTML = '<p class="tl-ref">' + esc(j.reference) + " · " + esc(j.product) + " · " + peso0(j.amount) + " over " + j.months + " months</p>" +
            '<ol class="tl-stages">' + j.stages.map(function (s, k) { return '<li class="' + (k < j.stage ? "done" : k === j.stage ? "now" : "") + '"><b>' + esc(s) + "</b></li>"; }).join("") + "</ol>" +
            '<p class="tl-v tl-say">' + esc(j.note) + "</p>"; })
        .catch(function (e) { sound(false); out.innerHTML = '<p class="tl-v tl-err">' + esc(e.message) + "</p>"; if (window.GR8_STAGE) window.GR8_STAGE.alarm(); });
    });
  }

  /* release: the payment schedule for an amount, a term and a release date */
  function scheduleTool(box) {
    var st = { kind: "salary", amount: 50000, months: 12, start: new Date().toISOString().slice(0, 10) };
    function draw() {
      var p = byKind(st.kind); st.amount = Math.min(p.max, Math.max(p.min, st.amount)); if (p.months.indexOf(st.months) < 0) st.months = p.months[0];
      var rs = schedule(st.amount, st.months, p.rate, p.method, st.start);
      box.innerHTML = '<div class="tl-b">' + lab("Loan") + productChips(st.kind) + "</div>" +
        '<div class="tl-b tl-two"><label class="tl-f"><span>Amount</span><input name="amount" inputmode="numeric" value="' + peso0(st.amount).slice(1) + '"></label><label class="tl-f"><span>Released on</span><input name="start" type="date" value="' + st.start + '"></label></div>' +
        '<div class="tl-b">' + lab("Months") + chips("months", p.months.map(function (n) { return { v: n, t: String(n) }; }), st.months) + "</div>" +
        '<div class="tl-b">' + lab("Your schedule") + '<table class="tl-table"><thead><tr><th>#</th><th>Due</th><th>Principal</th><th>Interest</th><th>Pay</th></tr></thead><tbody>' +
        rs.map(function (r) { return "<tr><td>" + r.n + "</td><td>" + date(r.due) + "</td><td>" + peso(r.principal) + "</td><td>" + peso(r.interest) + "</td><td>" + peso(r.principal + r.interest) + "</td></tr>"; }).join("") + "</tbody></table></div>" +
        '<div class="tl-acts">' + btn("Apply with these numbers", "apply") + "</div>" + note("Due dates fall on the same day each month (the 28th at the latest). CALMS texts you a few days before each one.");
      $('[name="amount"]', box).addEventListener("change", function () { st.amount = +String(this.value).replace(/[^0-9.]/g, "") || st.amount; draw(); });
      $('[name="start"]', box).addEventListener("change", function () { st.start = this.value || st.start; draw(); });
      box.querySelectorAll(".tl-chips").forEach(function (c) { c.addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (!b) return; if (c.dataset.name === "product") st.kind = b.dataset.v; else st.months = +b.dataset.v; sound(true); draw(); }); });
      $('[data-act="apply"]', box).addEventListener("click", function () { act("apply", { kind: st.kind, amount: st.amount, months: st.months }); });
    }
    ready.then(draw);
  }

  /* fair rules worked out: the fee; paying early; a late payment */
  function feeTool(box) { calc(box, "salary", { pickProduct: true }); }
  function earlyTool(box) {
    var st = { kind: "personal", amount: 60000, months: 12, paid: 4 };
    function draw() {
      var p = byKind(st.kind); st.amount = Math.min(p.max, Math.max(p.min, st.amount)); if (p.months.indexOf(st.months) < 0) st.months = p.months[p.months.length - 1]; st.paid = Math.min(st.months - 1, Math.max(0, st.paid));
      var rs = schedule(st.amount, st.months, p.rate, p.method), left = st.paid ? rs[st.paid - 1].balance : st.amount, skip = rs.slice(st.paid).reduce(function (s, r) { return s + r.interest; }, 0);
      box.innerHTML = '<div class="tl-b">' + lab("Loan") + productChips(st.kind) + "</div>" +
        '<div class="tl-b tl-two"><label class="tl-f"><span>Amount borrowed</span><input name="amount" inputmode="numeric" value="' + peso0(st.amount).slice(1) + '"></label><label class="tl-f"><span>Months already paid</span><input name="paid" inputmode="numeric" value="' + st.paid + '"></label></div>' +
        '<div class="tl-b">' + lab("Term") + chips("months", p.months.map(function (n) { return { v: n, t: n + " months" }; }), st.months) + "</div>" +
        '<div class="tl-b">' + lab("If you finish today") + rows([["To pay it all off", peso(left), 1], ["Interest you don't pay", peso(skip)], ["Penalty for paying early", peso(0)]]) + "</div>" + note("You only pay interest for the months you used. Ask the cashier for the exact figure on the day.");
      ["amount", "paid"].forEach(function (n) { $('[name="' + n + '"]', box).addEventListener("change", function () { st[n] = +String(this.value).replace(/[^0-9.]/g, "") || 0; draw(); }); });
      box.querySelectorAll(".tl-chips").forEach(function (c) { c.addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (!b) return; if (c.dataset.name === "product") st.kind = b.dataset.v; else st.months = +b.dataset.v; sound(true); draw(); }); });
    }
    ready.then(draw);
  }
  function lateTool(box) {
    var st = { kind: "salary", due: 5000, days: 10 };
    function draw() {
      var p = byKind(st.kind), months = Math.ceil(Math.max(0, st.days) / 30), pen = round(st.due * p.penalty * months);
      box.innerHTML = '<div class="tl-b">' + lab("Loan") + productChips(st.kind) + "</div>" +
        '<div class="tl-b tl-two"><label class="tl-f"><span>Amount that was due</span><input name="due" inputmode="numeric" value="' + peso0(st.due).slice(1) + '"></label><label class="tl-f"><span>Days late</span><input name="days" inputmode="numeric" value="' + st.days + '"></label></div>' +
        '<div class="tl-b">' + lab("What it would add") + rows([["Penalty", peso(pen), 1], ["Rate", pct(p.penalty) + " of the late amount, per month or part of one"], ["Months counted", String(months)]]) + "</div>" +
        '<div class="tl-acts"><button type="button" class="tl-link" data-act="talk">Can\'t pay this month? Talk to us first</button></div>' + note("We call before any penalty. Paying is applied to penalty first, then interest, then principal.");
      ["due", "days"].forEach(function (n) { $('[name="' + n + '"]', box).addEventListener("change", function () { st[n] = +String(this.value).replace(/[^0-9.]/g, "") || 0; draw(); }); });
      $(".tl-chips", box).addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (b) { st.kind = b.dataset.v; sound(true); draw(); } });
      $('[data-act="talk"]', box).addEventListener("click", function () { act("talk", { message: "I may miss a payment this month. Reference: " }); });
    }
    ready.then(draw);
  }
  function startTool(box) {
    box.innerHTML = '<div class="tl-b">' + lab("You'll need about ten minutes and") + '<ul class="tl-list"><li>A valid government ID and its number</li><li>Your work or business details and monthly income</li><li>Photos of your papers (or bring them later)</li><li>Your mobile number, for our call and texts</li></ul></div>' +
      '<div class="tl-b">' + lab("Pick a loan to start") + productChips("") + "</div>" + '<div class="tl-acts">' + btn("Start my application", "apply") + "</div>" + note("You'll see the full cost before you send anything. Nothing is approved or charged online.");
    var kind = "";
    ready.then(function () { $(".tl-chips", box).outerHTML = productChips(""); $(".tl-chips", box).addEventListener("click", function (e) { var b = e.target.closest(".tl-chip"); if (!b) return; kind = b.dataset.v; box.querySelectorAll(".tl-chip").forEach(function (x) { x.classList.toggle("on", x === b); }); sound(true); }); });
    $('[data-act="apply"]', box).addEventListener("click", function () { act("apply", kind ? { kind: kind } : {}); });
  }
  function payTool(box) {
    box.innerHTML = '<div class="tl-b">' + lab("Where to pay") + rows([["At the branch", "Cash, Mon to Sat, 8 to 5"], ["Salary deduction", "For salary loans, through your employer"], ["Bank transfer", "Send the reference with your payment"]]) + "</div>" +
      '<div class="tl-b">' + lab("Your balance and receipts") + '<p class="tl-v">Every payment is posted to your account the moment it\'s made. Sign in to My GR8 to see your schedule, balance and receipts.</p></div>' +
      '<div class="tl-acts">' + btn("Open My GR8", "mygr8") + '<button type="button" class="tl-link" data-act="talk">Ask about a payment</button></div>';
    box.querySelectorAll("[data-act]").forEach(function (b) { b.addEventListener("click", function () { act(b.dataset.act, { message: "About a payment. Reference: " }); }); });
  }
  function dataTool(box) {
    box.innerHTML = '<div class="tl-b">' + lab("What we keep") + rows([["Who you are", "Name, birthday, ID, contact details"], ["Your loan", "Application, papers, schedule, payments"], ["Who looked", "Every view and change, logged in CALMS"], ["How long", "As long as the law asks us to"]]) + "</div>" +
      '<div class="tl-b">' + lab("Your rights") + '<p class="tl-v">You can ask to see what we hold about you, fix what\'s wrong, and ask how it was used.</p></div>' +
      '<div class="tl-acts">' + btn("Ask about my data", "talk") + "</div>";
    $('[data-act="talk"]', box).addEventListener("click", function () { act("talk", { message: "I'd like to know what data GR8 keeps about me. Reference (if any): " }); });
  }

  /* which tool goes with which card (the order of the cards in rooms.js) */
  var TOOL = [
    function (b) { calc(b, "salary"); }, function (b) { calc(b, "personal"); }, function (b) { calc(b, "sme"); },
    startTool, function (b) { checklist(b, "salary"); }, capacity, track, scheduleTool, payTool,
    function (b) { checklist(b, "salary", ["id"]); }, function (b) { checklist(b, "salary", ["pay", "coe", "income", "fs"]); }, function (b) { checklist(b, "salary", ["addr"]); },
    feeTool, earlyTool, lateTool, dataTool
  ];
  var TITLE = ["Work it out", "Work it out", "Work it out", "Start here", "Get your papers ready", "Can I carry it?", "Track an application", "See your schedule", "Paying", "Get your papers ready", "Get your papers ready", "Get your papers ready", "See the fee", "Pay early, see the saving", "If you're late", "Your data"];
  window.GR8_TOOLS = { render: function (i, box) { box.innerHTML = ""; var t = document.createElement("div"); t.className = "tl"; box.appendChild(t); (TOOL[i] || startTool)(t); return TITLE[i] || "Try it"; }, installment: installment, peso: peso, byKind: byKind };
})();

/* Home page, "I'm looking for a loan": the "Borrow up to" pills show each loan's live maximum once the products load
   (the amounts written in index.html are the same figures, shown until then). Here, not in index.html, because the
   site's security policy blocks scripts written inside a page. */
(function () {
  var pills = document.getElementById("tkBorrowPills");
  if (!pills || !window.GR8_DATA_READY) return;
  window.GR8_DATA_READY.then(function (d) {
    var prods = (d && d.products) || []; if (!prods.length) return;
    var fmt = function (n) { return "\u20b1" + Number(n).toLocaleString("en-PH"); };
    pills.textContent = "";
    prods.forEach(function (p) { var s = document.createElement("span"); s.className = "tk-borrow-pill"; s.textContent = p.name + " " + fmt(p.max); pills.appendChild(s); });
  });
})();
