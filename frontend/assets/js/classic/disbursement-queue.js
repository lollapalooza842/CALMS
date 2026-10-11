/* Disbursement queue, classic: accepted loans with a locked signed agreement waiting for their money, the channels' cut-offs today, what is held back, and what was paid out today. */
(function () {
  var h = CK.h;
  var CH = {
    pn: { name: "PESONet", nick: "Bank transfer run", rule: "Bank transfer, any amount. All of them go out in one run.", open: 9 * 3600, cut: 15 * 3600, icon: "bank" },
    ip: { name: "InstaPay", nick: "Arrives in minutes", rule: "Bank or e-wallet, up to ₱50,000 each.", always: true, icon: "send" },
    cq: { name: "Cheque", nick: "Counter pickup", rule: "Collected at the branch, with a valid ID.", open: 9 * 3600, cut: 17 * 3600, icon: "file" },
    ca: { name: "Cash", nick: "Cash window", rule: "Paid at the counter, up to ₱50,000.", open: 9 * 3600, cut: 16.5 * 3600, icon: "wallet" }
  }, ORDER = ["pn", "ip", "cq", "ca"], KEY = { PESONet: "pn", InstaPay: "ip", Cheque: "cq", Cash: "ca" };
  function t12(s) { var hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return ((hh + 11) % 12 + 1) + ":" + ("0" + m).slice(-2) + (hh < 12 ? " AM" : " PM"); }
  function now() { var d = new Date(Date.now() + 8 * 3600e3); return { s: d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds(), dow: d.getUTCDay() }; }   /* Manila, UTC+8, no daylight saving */
  function chs(c) { var n = now(); if (c.always) return { open: true, leaves: "Runs all day", sub: "No cut-off", left: null, x: 0 };
    var wk = n.dow >= 1 && n.dow <= 5; if (wk && n.s < c.cut) return { open: true, leaves: "Leaves " + t12(c.cut), sub: "", left: c.cut - n.s, x: Math.max(0, Math.min(1, (n.s - c.open) / (c.cut - c.open))) };
    return { open: false, leaves: "Gone for today", sub: "Next: " + (n.dow === 5 || n.dow === 6 ? "Monday" : "tomorrow") + ", " + t12(c.cut), left: -1, x: 1 }; }
  function cd(s) { var hh = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return hh + ":" + ("0" + m).slice(-2) + ":" + ("0" + x).slice(-2); }
  function hrsTxt(x) { var a = Math.floor(x), m = Math.round((x - a) * 60); return a + " h " + m + " m"; }
  var D, Q, HELD, LED, sel = null, F = { ch: "", q: "", sort: "wait" }, tbl, side, boardBox;

  CK.loading();
  CK.api("GET", "/api/disbursements").then(function (d) { D = d; build(); setInterval(tick, 1000); }, function (e) { CK.error(e, "my-queue.html"); });

  function build() {
    var t0 = Date.now();
    Q = D.shelf.filter(function (x) { return x.ready; }).map(function (x) { return { id: x.reference, nm: x.borrower, prod: x.product, amt: x.amount, net: x.net, term: x.term, agent: x.agent, ch: x.net > 50000 ? "pn" : "ip", wait: (t0 - new Date(x.since).getTime()) / 36e5 }; });
    HELD = D.shelf.filter(function (x) { return !x.ready; });
    LED = D.released.map(function (r) { return { at: r.at, acct: r.account, app: r.reference, nm: r.borrower, net: r.net, ch: r.channel, ref: r.ref, by: r.by, payee: r.payee }; });
    var sum = function (a) { return a.reduce(function (s, b) { return s + b.net; }, 0); }, hot = Q.filter(function (b) { return b.wait >= 36; }), paid = LED.reduce(function (s, r) { return s + r.net; }, 0);

    /* the channels today */
    boardBox = h("div.ck-dq-board", ORDER.map(function (k, i) { var c = CH[k], on = Q.filter(function (x) { return x.ch === k; });
      return h("button.ck-dq-ch", { type: "button", "data-k": k, "aria-pressed": "false", style: { "--i": i }, on: { click: function () { F.ch = F.ch === k ? "" : k; marksCh(); apply(); } } },
        h("div.ck-dq-chtop", h("span.ck-dq-chic", CK.ic(c.icon)), h("div.grow", h("b", c.name), h("small", c.nick)), h("span.ck-dq-left")),
        h("div.ck-dq-trail", h("i")), h("div.ck-dq-chfoot", h("span.ck-dq-leaves"), h("span", on.length + (on.length === 1 ? " loan" : " loans") + (on.length ? " · " + CK.peso(sum(on)) : ""))), h("small.ck-dq-rule", c.rule)); }));

    /* the shelf */
    tbl = CK.table([
      { k: "nm", label: "Borrower", sort: true, render: function (b) { return h("div.ck-rq-bor", h("b", b.nm), h("small", b.id)); } },
      { k: "net", label: "Net to release", sort: true, desc: true, render: function (b) { return h("div", h("span.ck-strong", CK.peso(b.net, true)), h("small.ck-sm", b.prod + " · " + b.term + " months")); } },
      { k: "ch", label: "By", render: function (b) { return h("span.ck-dq-by", CK.ic(CH[b.ch].icon), CH[b.ch].name); } },
      { k: "wait", label: "Waiting", sort: true, desc: true, render: function (b) { var hot = b.wait >= 36; return h("div.ck-prog", h("span.ck-strong" + (hot ? ".ck-late" : ""), hrsTxt(b.wait)), CK.meter(Math.min(b.wait, 48), 48, hot ? "red" : b.wait >= 24 ? "amber" : "green")); } },
      { k: "go", label: "", align: "right", render: function (b) { return CK.btn("Release", { kind: "soft", href: "release-loan.html?ref=" + b.id }); } }
    ], Q, { sort: "wait", dir: -1, onRow: function (b) { sel = sel === b.id ? null : b.id; marks(); manifest(true); if (sel && window.matchMedia("(max-width: 1180px)").matches) side.scrollIntoView({ behavior: "smooth", block: "start" }); },
      empty: Q.length ? "Nothing matches. Clear the search or the channel." : "The shelf is empty. Nothing is waiting for release." });
    var sortSel = CK.select([["wait", "Longest waiting"], ["amt", "Largest amount"], ["dep", "Leaving soonest"]], "wait"); sortSel.addEventListener("change", function () { F.sort = sortSel.value; apply(); });
    side = h("div.ck-stack.ck-sticky.ck-dq-side");

    /* held back */
    var held = HELD.length ? h("ul.ck-list", HELD.map(function (x) { return h("li", h("span.ck-filetile.miss", CK.ic("lock")), h("div.grow", h("b.ck-strong", x.borrower), h("small.ck-sm", x.reference + " · " + CK.peso(x.amount) + " · " + x.product),
        h("small.ck-sm", x.blocker + " With the loan processor, for the signed agreement.")), CK.btn("Agreement", { kind: "ghost", icon: "doc", href: "loan-agreement.html?ref=" + x.reference })); }))
      : CK.empty("Nothing held back", "Every accepted loan has its signed agreement locked.", "check");

    /* paid out today */
    var ledger = CK.table([
      { k: "at", label: "Time", sort: true, desc: true, render: function (r) { return h("span.ck-strong", new Date(r.at).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })); } },
      { k: "nm", label: "Borrower", sort: true, render: function (r) { return h("div.ck-rq-bor", h("b", r.nm), h("small", r.app)); } },
      { k: "acct", label: "Loan account", render: function (r) { return r.acct ? h("a.ck-dq-link", { href: "loan-account.html?no=" + r.acct }, r.acct) : h("span.ck-sm", "opens on funding"); } },
      { k: "net", label: "Net proceeds", align: "right", sort: true, desc: true, render: function (r) { return h("span.ck-strong", CK.peso(r.net, true)); } },
      { k: "ch", label: "Channel", render: function (r) { var k = KEY[r.ch]; return h("span.ck-dq-by", k ? CK.ic(CH[k].icon) : null, r.ch || "–"); } },
      { k: "by", label: "Released by", render: function (r) { return h("span.ck-sm", r.by); } },
      { k: "f", label: "Funding", align: "right", render: function (r) { return r.acct ? CK.pill("Funded", "green") : CK.pill("Awaiting bank", "amber"); } }
    ], LED, { sort: "at", dir: -1, empty: "Nothing released yet today." });

    CK.render([
      CK.head({ crumbs: [["My Queue", "my-queue.html"], ["Disbursement queue"]], title: "Disbursement queue", sub: "Signed, locked and waiting for their money. This window releases money; it cannot change a credit decision or the approved terms.",
        actions: [CK.btn("Loan accounts", { kind: "ghost", icon: "wallet", href: "loan-accounts.html" })] }),
      h("div.ck-stats.ck-in", { style: { "--cols": 4 } },
        CK.stat("On the shelf", String(Q.length), { icon: "list", tone: "brand", sub: CK.peso(sum(Q)) + " waiting" }),
        CK.stat("Not at this window", String(HELD.length), { icon: "lock", tone: HELD.length ? "amber" : "green", sub: HELD.length ? "something is still missing" : "nothing held back" }),
        CK.stat("Close to escalating", String(hot.length), { icon: "alert", tone: hot.length ? "red" : "green", sub: "waiting 36 hours or more; a notice goes out at 48" }),
        CK.stat("Paid out today", CK.peso(paid), { icon: "peso", tone: "green", sub: LED.length + (LED.length === 1 ? " release" : " releases") })),
      CK.card("Channels today", boardBox, { icon: "clock", tools: h("span.ck-sm.ck-dq-clock") }),
      h("div.ck-split.ck-dq",
        CK.card("On the shelf", [h("div.ck-toolbar", CK.search("Name or application number", function (v) { F.q = v; apply(); }), sortSel), h("div.ck-dq-count.ck-sm"), tbl], { icon: "wallet" }),
        side),
      h("div.ck-grid.ck-dq", { style: { "--cols": 1 } },
        CK.card("Not at this window", [h("p.ck-pf-p", "Approved, but something is still missing. They do not reach the shelf until it is done."), held], { icon: "lock" }),
        CK.card("Paid out today", [h("p.ck-pf-p", "Every release, with its reference. The loan account opens when the bank confirms."), ledger, LED.length ? h("div.ck-dq-total", h("span", "Total, " + LED.length + (LED.length === 1 ? " release" : " releases")), h("b", CK.peso(paid, true))) : null], { icon: "check" }))
    ]);
    apply(); manifest(false); tick();
  }

  function dep(b) { var s = chs(CH[b.ch]); return s.left == null ? 9e8 : s.left === -1 ? 9e9 : s.left; }
  function apply() { var q = F.q;
    var list = Q.filter(function (b) { return (!F.ch || b.ch === F.ch) && (!q || (b.nm + " " + b.id).toLowerCase().indexOf(q) > -1); });
    list.sort(function (x, y) { return F.sort === "amt" ? y.amt - x.amt : F.sort === "dep" ? dep(x) - dep(y) || y.wait - x.wait : y.wait - x.wait; });
    tbl.set(list); marks();
    var c = document.querySelector(".ck-dq-count"); if (c) c.textContent = list.length + " of " + Q.length + " shown" + (F.ch ? ", " + CH[F.ch].name + " only" : ""); }
  function marks() { [].forEach.call(tbl.querySelectorAll("tbody tr"), function (tr) { var r = tr.querySelector(".ck-rq-bor small"); tr.classList.toggle("is-sel", !!(r && r.textContent === sel)); }); }
  function marksCh() { [].forEach.call(boardBox.children, function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-k") === F.ch)); }); }

  function manifest(anim) { side.textContent = ""; var b = Q.filter(function (x) { return x.id === sel; })[0];
    if (!b) { side.appendChild(h("section.ck-card.ck-dq-idle" + (anim ? ".ck-panelin" : ""), h("div.ck-cardbody", CK.empty(Q.length ? "Pick a loan" : "The shelf is empty", Q.length ? "Pick one on the shelf to read what is inside: the net proceeds, where the money goes, and the three checks it needs before it can leave." : "Nothing is waiting for release.", "wallet")))); return; }
    var c = CH[b.ch], cs = chs(c);
    var gates = h("div.ck-tasks", [["done", "Signed agreement locked", "Record copy locked and on file"], ["done", "Approved and accepted", "Decision signed; the borrower accepted the terms"], ["open", "Payout details verified against ID", "Not yet. Done on the release page, with her ID in hand."]].map(function (g, i) {
      return h("div.ck-task." + g[0], h("span.n", g[0] === "done" ? CK.ic("check") : String(i + 1)), h("div.grow", h("b", g[1]), h("small", g[2]))); }));
    side.appendChild(h("section.ck-card" + (anim ? ".ck-panelin" : ""), h("div.ck-cardhead", h("h2", CK.ic("doc"), "Manifest"), CK.btn("", { kind: "icon", icon: "x", aria: "Close", on: function () { sel = null; marks(); manifest(true); } })),
      h("div.ck-cardbody",
        h("div.ck-who.big", CK.av(b.nm, 46), h("div", h("b", b.nm), h("small", b.id + " · " + b.prod + " · " + b.term + " months"))),
        h("div", CK.pill("Ready: payout checked at release", "teal")),
        CK.dl([["Approved amount", CK.peso(b.amt, true)], ["Less: processing charge", "− " + CK.peso(b.amt - b.net, true)]], "rows"),
        CK.dl([["Sent by", c.name + (cs.left == null ? ", any time" : cs.left === -1 ? ", closed for today" : ", leaves in " + cd(cs.left))], ["To", "Entered from her passbook at release"], ["Account name", b.nm], ["Number", "Typed twice at release"], ["Sales agent", b.agent || "Walk-in"]], "one"),
        b.wait >= 36 ? CK.note(h("span", h("b", "Close to escalating. "), "Waiting " + hrsTxt(b.wait) + ". At 48 hours without movement a notice goes to the supervisor."), "red") : null,
        gates,
        h("div.ck-actions", CK.btn("Verify and release", { kind: "primary", icon: "next", href: "release-loan.html?ref=" + b.id }), CK.btn("Application", { kind: "ghost", icon: "doc", href: "application-detail.html?ref=" + b.id })))));
    var dl = side.querySelector(".ck-dl.rows"); if (dl) dl.appendChild(h("div.tot", h("dt", "Net proceeds to release"), h("dd", CK.peso(b.net, true)))); }

  function tick() { var n = now(), clk = document.querySelector(".ck-dq-clock"); if (clk) clk.textContent = "Malolos time " + t12(n.s).replace(" ", ":" + ("0" + n.s % 60).slice(-2) + " ");
    if (!boardBox) return;
    [].forEach.call(boardBox.children, function (el) { var k = el.getAttribute("data-k"), s = chs(CH[k]), L = el.querySelector(".ck-dq-left");
      el.querySelector(".ck-dq-leaves").textContent = s.leaves + (s.sub && s.left === -1 ? " · " + s.sub : "");
      el.querySelector(".ck-dq-trail i").style.width = (s.x * 100).toFixed(1) + "%"; el.classList.toggle("is-gone", s.left === -1); el.classList.toggle("is-hurry", s.left > 0 && s.left < 1800);
      L.textContent = s.left == null ? "any time" : s.left === -1 ? "closed" : cd(s.left); }); }
})();
