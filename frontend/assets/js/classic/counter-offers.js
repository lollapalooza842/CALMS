/* Counter-offers, classic: every offer and answer in order, the offer next to what she asked for with a live repayment preview, and the underwriter's next move (a new offer or a rejection). */
(function () {
  var h = CK.h, ref = CK.q("ref");
  if (!ref) { CK.render([CK.head({ crumbs: [["Applications", "applications.html"], ["Counter-offers"]], title: "Counter-offers" }),
    CK.card(null, [CK.empty("Open an application first", "Counter-offers belong to one application. Open it from the applications list.", "swap"), h("div.ck-actions", CK.btn("Applications", { kind: "primary", icon: "next", href: "applications.html" }))])]); return; }
  function pesoC(n) { return CK.peso(n, true); }
  function pct(n) { return n == null ? "–" : n.toFixed(1) + "%"; }
  function dur(ms) { var hr = Math.floor(ms / 3600e3), d = Math.floor(hr / 24); return d ? d + "d " + (hr % 24) + "h" : hr ? hr + "h " + Math.floor(ms / 60000 % 60) + "m" : Math.max(1, Math.floor(ms / 60000)) + "m"; }
  var C1 = "#7a6b5e", C2 = "#9a2f24";
  CK.loading();
  Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/offers"), CK.api("GET", "/api/auth/me")])
    .then(function (r) { draw(r[0], r[1].user || {}); }, function (e) { CK.error(e, "applications.html"); });

  function draw(L, ME) {
    var ASK = { amt: L.ask.amount, term: L.ask.term }, INCOME = L.income, DEBT = L.debt, COLL = L.collateral || 0, RATE = L.rate, FEE = L.fee, METHOD = L.method,
      LIMIT = Math.min(L.limit || L.max, L.max), MIN = L.min, TERMS = L.terms || [12, 18, 24, 30, 36, 42, 48, 54, 60], AGENT = L.agent || "no agent (walk-in)", REF = L.reference;
    var O = L.offers, uw = /underwriter/.test(ME.role || ""), state = L.status === "funded" ? "accepted" : L.status, cur = O[O.length - 1];
    var pick = cur ? cur.n : 0, draft = { amt: cur ? cur.amount : ASK.amt, term: cur ? cur.term : ASK.term, rm: "" };
    if (draft.amt > LIMIT) draft.amt = LIMIT;
    function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
    function T(a, n) { var m = inst(a, n); return { amt: a, term: n, m: m, dti: (DEBT + m) / INCOME * 100, ltv: COLL ? a / COLL * 100 : null, fee: a * FEE, net: a - a * FEE, total: m * n, int: m * n - a }; }
    function sched(a, n) { var m = inst(a, n), bal = a, R = [[0, 0, 0, a]]; for (var i = 1; i <= n; i++) { var it = METHOD === "flat" ? a * RATE : bal * RATE, pr = Math.min(bal, m - it); bal = Math.max(0, bal - pr); R.push([i, pr, it, bal]); } return R; }
    var showDraft = state === "declined" && L.canCounter;

    /* ---- where it stands ---- */
    var ST = { awaiting: ["Awaiting her answer", "violet"], declined: ["Declined by borrower", "red"], accepted: ["Accepted", "teal"], approved: ["Approved", "green"], rejected: ["Rejected", "red"] }[state] || [state, "grey"];
    var lastAt = O.reduce(function (m, o) { var t = Math.max(new Date(o.at).getTime(), o.answer ? new Date(o.answer.at).getTime() : 0); return Math.max(m, t); }, 0);
    var open = state === "accepted" || state === "approved";
    var waitStat = CK.stat(state === "awaiting" ? "Waiting for her answer" : "Last change", state === "awaiting" && cur ? dur(Date.now() - new Date(cur.at).getTime()) : lastAt ? CK.ago(lastAt) : "–", { icon: "clock", tone: state === "awaiting" ? "violet" : "grey", sub: lastAt ? CK.dt(lastAt) : "" });
    function wordy(x) { x.classList.add("ck-wordy"); return x; }
    var stats = h("div.ck-stats.ck-in", { style: { "--cols": 4 } },
      wordy(CK.stat("With", state === "awaiting" ? AGENT : state === "declined" ? "Underwriting" : state === "rejected" ? "Loan processor" : "Loan processor", { icon: "user", tone: "blue", sub: state === "awaiting" ? "sales agent, to convey the offer" : state === "declined" ? "to revise the terms or reject" : state === "rejected" ? "returned with the reason" : "for the loan agreement" })),
      CK.stat("Offers made", String(O.length), { icon: "swap", tone: "brand", sub: O.length ? "latest: " + CK.peso(cur.amount) + " over " + cur.term + " months" : "no counter-offer was needed" }),
      waitStat,
      CK.stat(open ? "Now open" : "Held until she accepts", open ? "Agreement" : "2 locked", { icon: open ? "check" : "lock", tone: open ? "green" : "amber", sub: open ? "disbursement opens after the signed copy" : "loan agreement and disbursement" }));

    /* ---- on the table ---- */
    var table = h("div.ck-offers", { role: "group", "aria-label": "Offers" });
    function drawTable() { table.textContent = "";
      table.appendChild(h("div.ck-offer.is-ask", h("span.top", "Her request", CK.ic("user")), h("span.amt", CK.peso(ASK.amt)), h("span.m", ASK.term + " months · " + pesoC(inst(ASK.amt, ASK.term)) + " a month")));
      O.forEach(function (o) { var st = { awaiting: ["Awaiting her answer", "violet"], declined: ["Declined", "red"], accepted: ["Accepted", "green"] }[o.status] || [o.status, "grey"];
        var b = h("button.ck-offer.t-" + st[1] + (o.status === "declined" && o !== cur ? ".is-old" : ""), { type: "button", "aria-pressed": String(pick === o.n) },
          h("span.top", "Offer " + o.n, h("span", CK.date(o.at))), h("span.amt", CK.peso(o.amount)), h("span.m", o.term + " months · " + pesoC(inst(o.amount, o.term)) + " a month"), h("span.m", "Issued by " + o.by + ", e-signed"), CK.pill(st[0], st[1]),
          o.answer ? h("span.q", "“" + (o.answer.note || (o.answer.answer === "accepted" ? "Accepts the offer as written." : "Declined.")) + "” Recorded by " + o.answer.by + ", told by " + String(o.answer.channel).toLowerCase() + " on " + CK.dt(o.answer.toldAt || o.answer.at) + ". ",
            o.answer.proof ? h("a", { href: "/api/applications/" + encodeURIComponent(REF) + "/documents/" + o.answer.proof, target: "_blank", rel: "noopener" }, "Proof") : null) : o.remarks ? h("span.q", o.remarks) : null);
        b.addEventListener("click", function () { pick = o.n; drawTable(); compare(); }); table.appendChild(b); });
      table.appendChild(h("div.ck-offer.is-plus", CK.ic(state === "declined" ? "plus" : state === "awaiting" ? "clock" : "lock"),
        state === "awaiting" ? "Waiting for her answer. Nothing more can be laid down until the agent records it." : state === "declined" ? (L.canCounter ? "Your move: lay down a new offer, or reject the application." : "Back with underwriting, to revise or reject.") : state === "accepted" ? "Agreed. The table is closed." : state === "approved" ? "Granted as she asked. The table is closed." : "Rejected. The table is closed."));
    }

    /* ---- compare and the paydown chart ---- */
    var shA = h("div"), shB = h("div"), chartBox = h("div.ck-chart"), legend = h("div.ck-legend"), schedWrap = h("div.ck-collapse"), schedInner = h("div"), titleB = h("h2"), subB = h("span.ck-sm");
    schedWrap.appendChild(schedInner);
    function rowsOf(t, other) { var R = [["Amount", pesoC(t.amt), "amt"], ["Term", t.term + " months", "term"], ["Interest", Math.round(RATE * 10000) / 100 + "% a month, " + METHOD, ""], ["Processing charge (" + Math.round(FEE * 1000) / 10 + "%)", pesoC(t.fee), "fee"],
        ["She receives", pesoC(t.net), "net"], ["Each month", pesoC(t.m), "m"], ["Total to repay", pesoC(t.total), "total"], ["Of which interest", pesoC(t.int), "int"], ["Debt to income", pct(t.dti), "dti"]].concat(COLL ? [["Loan to value", pct(t.ltv), "ltv"]] : []);
      return h("dl.ck-diffs", R.map(function (r) { var d = other && r[2] ? t[r[2]] - other[r[2]] : 0, isD = Math.abs(d) > .004;
        return h("div" + (isD ? ".is-diff" : ""), h("dt", r[0]), h("dd", r[1], isD && r[2] !== "term" ? h("small", (d > 0 ? "+" : "−") + (r[2] === "dti" || r[2] === "ltv" ? Math.abs(d).toFixed(1) + " pts" : CK.peso(Math.abs(d), true).replace("₱", ""))) : null)); })); }
    function chosen() { if (showDraft) return [T(draft.amt, draft.term), "Draft offer " + (O.length + 1)]; var o = O.filter(function (x) { return x.n === pick; })[0] || cur; return o ? [T(o.amount, o.term), "Offer " + o.n] : [T(ASK.amt, ASK.term), "As granted"]; }
    function compare() { var A = T(ASK.amt, ASK.term), c = chosen(), B = c[0]; shA.textContent = ""; shA.appendChild(rowsOf(A, null)); shB.textContent = ""; shB.appendChild(rowsOf(B, A));
      titleB.textContent = showDraft ? "You would offer" : "We offer"; subB.textContent = showDraft ? "draft, not issued" : c[1].toLowerCase(); chart(A, B, c[1]); }
    function chart(A, B, nameB) {
      var NS = "http://www.w3.org/2000/svg", W = Math.max(300, Math.round(chartBox.clientWidth || 760)), H = W < 500 ? 220 : 280, Lm = 52, Rm = 34, Tp = 14, Bt = 30, svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "0 0 " + W + " " + H); svg.setAttribute("role", "img");
      var sa = sched(A.amt, A.term), sb = sched(B.amt, B.term), mx = Math.max(A.term, B.term), top = Math.max(A.amt, B.amt), stepY = top > 400000 ? 100000 : top > 100000 ? 50000 : top > 40000 ? 10000 : 5000, my = Math.ceil(top / stepY) * stepY;
      var X = function (m) { return Lm + (W - Lm - Rm) * m / mx; }, Y = function (v) { return Tp + (H - Tp - Bt) * (1 - v / my); };
      svg.setAttribute("aria-label", "Outstanding balance by month. Her request starts at " + pesoC(A.amt) + " and ends at month " + A.term + ". " + nameB + " starts at " + pesoC(B.amt) + " and ends at month " + B.term + ".");
      function S(n, at, txt) { var e = document.createElementNS(NS, n); Object.keys(at).forEach(function (k) { e.setAttribute(k, at[k]); }); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; }
      for (var g = 0; g <= my; g += stepY) { S("line", { x1: Lm, x2: W - Rm, y1: Y(g), y2: Y(g), "class": "grid" }); S("text", { x: Lm - 8, y: Y(g) + 4, "text-anchor": "end", "class": "ax" }, g ? (g >= 1000 ? g / 1000 + "k" : g) : "0"); }
      var every = Math.ceil(mx / Math.max(2, Math.floor((W - Lm - Rm) / 80))); every = every > 6 ? Math.ceil(every / 6) * 6 : every > 3 ? 6 : every > 2 ? 3 : every; for (var m = 0; m <= mx; m += every) S("text", { x: X(m), y: H - 8, "text-anchor": m === 0 ? "start" : m + every > mx ? "end" : "middle", "class": "ax" }, m ? (W < 500 ? "m" : "month ") + m : "release");
      function path(s) { return s.map(function (r, i) { return (i ? "L" : "M") + X(r[0]).toFixed(1) + " " + Y(r[3]).toFixed(1); }).join(" "); }
      S("path", { d: path(sb) + " L" + X(B.term).toFixed(1) + " " + Y(0) + " L" + X(0) + " " + Y(0) + "Z", fill: C2, "fill-opacity": .08, "class": "ar" });
      [[sa, C1], [sb, C2]].forEach(function (p) { var pe = S("path", { d: path(p[0]), stroke: p[1], "class": "ln" }); var len = 2000; try { len = Math.ceil(pe.getTotalLength()) || 2000; } catch (e) {} pe.style.setProperty("--len", len || 2000); });
      var cross = S("line", { y1: Tp, y2: H - Bt, stroke: "#1f1712", "stroke-dasharray": "3 3", opacity: 0 }), d1 = S("circle", { r: 5, fill: C1, stroke: "#fff", "stroke-width": 2, opacity: 0 }), d2 = S("circle", { r: 5, fill: C2, stroke: "#fff", "stroke-width": 2, opacity: 0 });
      var hit = S("rect", { x: Lm, y: Tp, width: W - Lm - Rm, height: H - Tp - Bt, fill: "transparent" }), tip = h("div.ck-tip", { hidden: true });
      function at(ev) { var r = svg.getBoundingClientRect(), mo = Math.max(0, Math.min(mx, Math.round(((ev.clientX - r.left) / r.width * W - Lm) / (W - Lm - Rm) * mx))), va = mo > A.term ? 0 : sa[mo][3], vb = mo > B.term ? 0 : sb[mo][3];
        cross.setAttribute("x1", X(mo)); cross.setAttribute("x2", X(mo)); cross.setAttribute("opacity", .5); d1.setAttribute("cx", X(mo)); d1.setAttribute("cy", Y(va)); d1.setAttribute("opacity", 1); d2.setAttribute("cx", X(mo)); d2.setAttribute("cy", Y(vb)); d2.setAttribute("opacity", 1);
        tip.hidden = false; tip.textContent = ""; tip.appendChild(h("b", mo ? "After month " + mo : "At release")); [[C1, "She asked", va, mo > A.term], [C2, nameB, vb, mo > B.term]].forEach(function (x) { tip.appendChild(h("div", h("i", { style: { background: x[0] } }), x[1] + ": " + (x[3] ? "paid off" : pesoC(x[2])))); });
        tip.style.left = (X(mo) / W * 100) + "%"; tip.style.top = (Math.min(Y(va), Y(vb)) / H * 100) + "%"; }
      hit.addEventListener("pointermove", at); hit.addEventListener("pointerdown", at); hit.addEventListener("pointerleave", function () { tip.hidden = true; cross.setAttribute("opacity", 0); d1.setAttribute("opacity", 0); d2.setAttribute("opacity", 0); });
      chartBox.classList.toggle("ck-still", !!chartBox.firstChild); chartBox.textContent = ""; chartBox.appendChild(svg); chartBox.appendChild(tip);
      legend.textContent = ""; [[C1, "She asked: " + CK.peso(A.amt) + " over " + A.term + " months"], [C2, nameB + ": " + CK.peso(B.amt) + " over " + B.term + " months"]].forEach(function (x) { legend.appendChild(h("span", h("i", { style: { background: x[0] } }), x[1])); });
      var rows = []; for (var i = 1; i <= mx; i++) rows.push({ n: i, a: sa[i], b: sb[i] });
      schedInner.textContent = ""; schedInner.appendChild(CK.table([{ k: "n", label: "Month", w: "70px" },
        { k: "ap", label: "Asked: payment", align: "right", render: function (r) { return r.a ? pesoC(r.a[1] + r.a[2]) : "–"; } }, { k: "ab", label: "Asked: balance", align: "right", render: function (r) { return r.a ? pesoC(r.a[3]) : "paid off"; } },
        { k: "bp", label: nameB + ": payment", align: "right", render: function (r) { return r.b ? h("span.ck-strong", pesoC(r.b[1] + r.b[2])) : "–"; } }, { k: "bb", label: nameB + ": balance", align: "right", render: function (r) { return r.b ? pesoC(r.b[3]) : "paid off"; } }], rows, { page: 60 }));
    }
    var tglB = CK.btn("Show the schedule as a table", { kind: "ghost", icon: "list" });
    tglB.addEventListener("click", function () { var on = !schedWrap.classList.contains("open"); schedWrap.classList.toggle("open", on); tglB.setAttribute("aria-expanded", String(on)); tglB.querySelector("span").textContent = on ? "Hide the table" : "Show the schedule as a table"; });

    /* ---- the next move ---- */
    var move = h("div.ck-move");
    function mini(label, v, lim, soft, max) { return h("div.ck-mini", h("div.lab", h("span", label), h("b", pct(v) + (v > lim ? ", over the " + lim + "% limit" : v > soft ? ", close to the limit" : ", inside policy"))),
      h("div.tr", h("i" + (v > lim ? ".x" : v > soft ? ".w" : ""), { style: { width: Math.min(100, v / max * 100) + "%" } }), h("u", { style: { left: (lim / max * 100) + "%" } }))); }
    var amtR, amtOut, termS, rmT, fRm, codeF, meters, msgBox, goBtn, err;
    function drawMove() { move.textContent = "";
      if (state === "awaiting") { var c = cur; move.appendChild(CK.note(L.canAnswer ? "Offer " + c.n + " is yours to carry. Explain it to her, then record her answer with proof. You cannot change the terms." : "Offer " + c.n + " is with " + AGENT + " to convey. You cannot change it or lay down another until her answer is recorded.", "violet", "clock"));
        move.appendChild(h("div.ck-actions", L.canAnswer ? CK.btn("Record her answer", { kind: "primary", icon: "edit", href: "record-answer.html?ref=" + encodeURIComponent(REF) })
          : CK.btn("Remind the agent", { kind: "soft", icon: "bell", on: function () { CK.toast("Reminders are sent by the Notifications module, which comes in Phase 5. For now, call " + AGENT + ".", "blue"); } }))); return; }
      if (state !== "declined") { move.appendChild(CK.note(state === "accepted" ? "She accepted offer " + (cur ? cur.n : "") + ". The loan agreement and disclosure statement can now be generated; disbursement opens once the signed copy is uploaded." : state === "approved" ? "Granted exactly as she asked, so no counter-offer was needed. The loan agreement can now be generated." : "The application was rejected and returned to the loan processor with the reason. She and her agent have been told the outcome.", state === "rejected" ? "red" : "green", state === "rejected" ? "x" : "check"));
        if (state !== "rejected") move.appendChild(h("div.ck-actions", CK.btn("Open loan agreement", { kind: "primary", icon: "next", href: "loan-agreement.html?ref=" + encodeURIComponent(REF) }))); return; }
      if (!L.canCounter) { move.appendChild(CK.note("She declined offer " + cur.n + ". It is back with underwriting, who will revise the terms or reject the application. You will be notified when a new offer is issued.", "amber")); return; }
      amtR = h("input.ck-range", { type: "range", min: MIN, max: LIMIT, step: 1000, value: draft.amt, "aria-label": "Amount" }); amtOut = h("b.ck-rangeval");
      termS = CK.select(TERMS.map(function (n) { return [n, n + " months"]; }), draft.term); rmT = CK.textarea(draft.rm, "Why this offer is different"); fRm = CK.field("Remarks", rmT, { req: true });
      codeF = CK.codeField(); var ci = codeF.querySelector("input"); ci.addEventListener("input", function () { ci.value = ci.value.replace(/\D/g, "").slice(0, 6); codeF.setError(""); });
      meters = h("div.ck-stack", { style: { gap: "12px" } }); msgBox = h("div"); err = h("p.ck-err", { role: "alert" });
      goBtn = CK.btn("Sign and issue offer " + (O.length + 1), { kind: "green", icon: "send" }); var rjBtn = CK.btn("Reject the application", { kind: "danger", icon: "x" });
      amtR.addEventListener("input", function () { draft.amt = +amtR.value; live(); }); termS.addEventListener("change", function () { draft.term = +termS.value; live(); }); rmT.addEventListener("input", function () { draft.rm = rmT.value; fRm.setError(""); });
      goBtn.addEventListener("click", issue); rjBtn.addEventListener("click", reject);
      move.appendChild(h("div.ck-field", h("label", "Amount ", amtOut), amtR, h("div.ck-rangeends", h("span", CK.peso(MIN)), h("span", CK.peso(LIMIT) + (LIMIT < L.max ? " (your limit)" : ""))))); move.appendChild(CK.field("Term", termS));
      move.appendChild(meters); move.appendChild(msgBox); move.appendChild(fRm); move.appendChild(codeF); move.appendChild(h("div.ck-actions", goBtn, rjBtn)); move.appendChild(err);
      live(); }
    function flags() { var t = T(draft.amt, draft.term), same = O.filter(function (o) { return o.amount === draft.amt && o.term === draft.term; })[0], asAsked = draft.amt === ASK.amt && draft.term === ASK.term, over = t.dti > 45 || (COLL && t.ltv > 80); return { t: t, same: same, asAsked: asAsked, over: over }; }
    function live() { var f = flags(), t = f.t; amtOut.textContent = CK.peso(draft.amt); amtR.style.setProperty("--p", ((draft.amt - MIN) / Math.max(1, LIMIT - MIN) * 100) + "%");
      meters.textContent = ""; meters.appendChild(h("p.ck-sm", "Each month " + pesoC(t.m) + ". She receives " + pesoC(t.net) + ". Total to repay " + pesoC(t.total) + "."));
      meters.appendChild(mini("Debt to income", t.dti, 45, 40, 70)); if (COLL) meters.appendChild(mini("Loan to value", t.ltv, 80, 60, 120));
      msgBox.textContent = ""; var msg = f.same ? "Those are the terms of offer " + f.same.n + ", which she already " + (f.same.status === "declined" ? "declined" : "has") + ". Change the amount or the term." : f.asAsked ? "These are exactly the terms she asked for. Issuing them is a plain approval: no counter-offer, no waiting for an answer." : f.over ? "Outside policy. You may still offer it within your limit, but it is an override and needs a written justification below." : "";
      if (msg) msgBox.appendChild(CK.note(msg, f.same ? "red" : f.over ? "amber" : "blue"));
      var lab = fRm.querySelector("label"); lab.textContent = ""; lab.appendChild(document.createTextNode(f.over ? "Justification for the override" : "Remarks")); lab.appendChild(h("b", " *"));
      goBtn.disabled = !!f.same; goBtn.querySelector("span").textContent = f.asAsked ? "Sign and approve as asked" : "Sign and issue offer " + (O.length + 1); err.textContent = "";
      compare(); }
    function fieldErr(e) { var m = e.message || "", fl = e.fields || (/code/i.test(m) ? "mfa" : /remarks|reason/i.test(m) ? "rm" : ""); if (fl === "mfa") { codeF.querySelector("input").value = ""; codeF.setError(m); } else if (fl === "rm" || fl === "why") fRm.setError(m); else err.textContent = m; }
    function issue() { var f = flags(), ci = codeF.querySelector("input"); err.textContent = ""; fRm.setError(""); codeF.setError("");
      if (f.same) { err.textContent = "Change the amount or the term first."; return; }
      if (f.over && draft.rm.trim().length < 20) { fRm.setError("Write a justification of at least 20 characters. It is recorded with your name."); rmT.focus(); return; }
      if (!/^\d{6}$/.test(ci.value)) { codeF.setError("Enter your six-digit authenticator code."); ci.focus(); return; }
      if (draft.rm.trim().length < 10) { fRm.setError("Say in the remarks why this offer is different (at least 10 characters)."); rmT.focus(); return; }
      CK.busy(goBtn, true); CK.api("POST", "/api/applications/" + encodeURIComponent(REF) + "/offers", { amount: String(draft.amt), termMonths: draft.term, remarks: draft.rm, code: ci.value }).then(function (r) {
        CK.toast("Offer " + (r.n || O.length + 1) + " is on the table and with " + AGENT + "."); reload(); }, function (e) { CK.busy(goBtn, false); fieldErr(e); }); }
    function reject() { var why = CK.textarea(draft.rm, "Why the application is rejected. It is sent back with it."), fW = CK.field("Reason", why, { req: true, hint: "At least 10 characters. She will be told the outcome." }), code = CK.codeField(), ci = code.querySelector("input");
      ci.addEventListener("input", function () { ci.value = ci.value.replace(/\D/g, "").slice(0, 6); code.setError(""); }); why.addEventListener("input", function () { fW.setError(""); });
      CK.modal({ title: "Reject " + REF, body: [CK.note("She declined offer " + cur.n + ". Rejecting closes the table: the application goes back to the loan processor with your reason.", "red"), fW, code],
        actions: [["Cancel", "ghost"], ["Reject the application", "danger", function (close, btn, mErr) {
          if (why.value.trim().length < 10) { fW.setError("To reject, write the reason in the remarks (at least 10 characters)."); why.focus(); return; }
          if (!/^\d{6}$/.test(ci.value)) { code.setError("Enter your six-digit authenticator code."); ci.focus(); return; }
          CK.busy(btn, true); CK.api("POST", "/api/applications/" + encodeURIComponent(REF) + "/reject", { reason: why.value.trim(), code: ci.value }).then(function () { close(); CK.toast("Rejected and returned to the loan processor with your reason."); reload(); },
            function (e) { CK.busy(btn, false); if (/code/i.test(e.message)) { ci.value = ""; code.setError(e.message); } else if (/reason/i.test(e.message)) fW.setError(e.message); else mErr(e.message); }); }]] }); }
    function reload() { Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/offers"), CK.api("GET", "/api/auth/me")]).then(function (r) { draw(r[0], r[1].user || {}); }, function (e) { CK.error(e, "applications.html"); }); }

    /* ---- who was told ---- */
    var LOG = []; O.forEach(function (o) { LOG.push([new Date(o.at).getTime(), "Counter-offer " + o.n + " issued by " + o.by, CK.peso(o.amount) + " over " + o.term + " months."]);
      if (o.answer) LOG.push([new Date(o.answer.at).getTime(), o.answer.by + " recorded the answer to offer " + o.n + ": " + o.answer.answer, "Told by " + String(o.answer.channel).toLowerCase() + ". Proof on file."]); });
    LOG.sort(function (a, b) { return b[0] - a[0]; });
    var logCard = CK.card("Who was told", LOG.length ? h("ul.ck-time", LOG.map(function (l) { return h("li", h("i"), h("div", h("b", l[1]), h("small", l[2] + " · " + CK.dt(l[0])))); })) : CK.empty("No counter-offer was needed", "Every offer and every answer is listed here.", "check"), { icon: "bell", tools: h("span.ck-sm", "every offer, every answer") });

    /* ---- the offer sheet ---- */
    var sheetWrap = h("div.ck-collapse"), sheetInner = h("div"); sheetWrap.appendChild(sheetInner);
    var RTXT = Math.round(RATE * 10000) / 100 + "% each month" + (METHOD === "flat" ? " on the amount borrowed" : " on the remaining balance");
    function drawSheet() { var o = O.filter(function (x) { return x.n === pick; })[0] || cur; sheetInner.textContent = ""; if (!o) return; var a = T(ASK.amt, ASK.term), b = T(o.amount, o.term);
      sheetInner.appendChild(h("div.ck-sheet", h("h3", "GR8 Lending Company"), h("div.c", "Offer of loan terms · Application " + REF + " · Offer " + o.n + " · " + CK.dt(o.at)), h("p", "Dear " + L.borrower + ","),
        h("p", "You applied for a loan of " + pesoC(ASK.amt) + " to be paid over " + ASK.term + " months. After reviewing your application, we can offer you a loan of " + pesoC(o.amount) + " to be paid over " + o.term + " months. The table below shows what you asked for and what we are offering."),
        h("div.ck-tablewrap", h("table", h("tr", h("th", ""), h("th", "You asked for"), h("th", "We offer")), [["Loan amount", pesoC(a.amt), pesoC(b.amt)], ["Number of monthly payments", String(a.term), String(b.term)], ["Interest", RTXT, RTXT], ["One-time processing charge", pesoC(a.fee), pesoC(b.fee)],
          ["Amount you will receive", pesoC(a.net), pesoC(b.net)], ["Payment each month", pesoC(a.m), pesoC(b.m)], ["Total you will pay back", pesoC(a.total), pesoC(b.total)]].map(function (r) { return h("tr", r.map(function (c) { return h("td", c); })); }))),
        h("p", "Your first payment would be due one month after the money is released. If a payment is late, a penalty is added under the rules of this loan product. This offer does not change unless we send you a new one in writing."),
        h("div.boxes", ["I ACCEPT this offer.", "I DO NOT ACCEPT this offer."].map(function (s) { return h("span", h("i"), s); })), h("div.sg", ["Signature of borrower over printed name", "Date signed", "Explained by (sales agent)"].map(function (s) { return h("div", s); })))); }
    var prtB = CK.btn("Show the sheet", { kind: "soft", icon: "eye" });
    prtB.addEventListener("click", function () { var on = !sheetWrap.classList.contains("open"); if (on) drawSheet(); sheetWrap.classList.toggle("open", on); prtB.setAttribute("aria-expanded", String(on)); prtB.querySelector("span").textContent = on ? "Hide the sheet" : "Show the sheet"; });

    CK.render([
      CK.head({ crumbs: [["Applications", "applications.html"], [REF, "application-detail.html?ref=" + encodeURIComponent(REF)], ["Counter-offers"]], title: "Counter-offers", status: CK.pill(ST[0], ST[1]),
        sub: L.borrower + " · " + L.product + " · asked for " + CK.peso(ASK.amt) + " over " + ASK.term + " months", actions: [CK.btn("Application", { kind: "ghost", icon: "doc", href: "application-detail.html?ref=" + encodeURIComponent(REF) })] }),
      stats,
      CK.card("On the table", [null, table], { icon: "swap" }),
      h("div.ck-grid", { style: { "--cols": 2 } }, CK.card("She asked for", shA, { icon: "user", tools: h("span.ck-sm", "her request") }),
        h("section.ck-card.ck-in", h("div.ck-cardhead", h("h2", CK.ic("peso"), titleB), subB), h("div.ck-cardbody", shB))),
      CK.card("How each is paid down", [legend, chartBox, h("div.ck-actions", tglB), schedWrap], { icon: "chart", tools: h("span.ck-sm", "outstanding balance, month by month") }),
      h("div.ck-grid.side2", CK.card(showDraft ? "Your move: offer " + (O.length + 1) : "Next move", move, { icon: showDraft ? "edit" : "next" }), logCard),
      O.length ? CK.card("Offer sheet for the borrower", [null, h("div.ck-actions", prtB), sheetWrap], { icon: "file" }) : null,
      h("p.ck-foot.ck-in", "An offer with an answer recorded against it is sealed. It cannot be changed; a revision goes out as a new offer.")
    ]);
    drawTable(); drawMove(); compare();
    var tick = setInterval(function () { if (!document.body.contains(waitStat)) { clearInterval(tick); return; } if (state === "awaiting" && cur) waitStat.querySelector("b").textContent = dur(Date.now() - new Date(cur.at).getTime()); }, 30000);
  }
})();
