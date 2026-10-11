/* Decision, classic: what the rules recommend, your limit and the checks, then approve as asked, approve other terms (a counter-offer), decline or endorse upward, signed with your authenticator code. */
(function () {
  var h = CK.h, ref = CK.q("ref");
  if (!ref) { CK.render([CK.head({ crumbs: [["Review queue", "review-queue.html"], ["Decision"]], title: "Decision" }),
    CK.card(null, [CK.empty("Open an application first", "A decision belongs to one application. Pick one from the review queue.", "search"), h("div.ck-actions", CK.btn("Review queue", { kind: "primary", icon: "next", href: "review-queue.html" }))])]); return; }
  function pesoC(n) { return CK.peso(n, true); }
  function pct(n) { return n == null ? "–" : n.toFixed(1) + "%"; }
  var KIND = { asis: ["Approve as asked", "green", "Approved", "check", "Grant exactly what she asked for."], other: ["Approve other terms", "amber", "Approved, changed terms", "swap", "Grant a different amount or term. This raises a counter-offer."],
    no: ["Decline", "red", "Declined", "x", "Reject the application, with a reason she can be told."], up: ["Endorse upward", "blue", "Endorsed upward", "up", "Over your limit: pass it up with the credit memo."] };
  var REASONS = ["Capacity: cash flow does not support the installment", "Credit history: bureau record", "Documents: figures not supported", "Policy: outside product rules"];
  function load(justSigned) { CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/decision").then(function (d) { draw(d, justSigned); }, function (e) { CK.error(e, "review-queue.html"); }); }
  CK.loading(); load();

  function draw(L, justSigned) {
    var ASK = { amt: L.ask.amount, term: L.ask.term }, INCOME = L.income, DEBT = L.debt, COLL = L.collateral || 0, RATE = L.rate, METHOD = L.method, FEE = L.fee, FIT = L.fit, MIN = L.min, MAX = L.max,
      TERMS = L.terms || [12, 18, 24, 30, 36, 42, 48, 54, 60], POL = L.policy, ME = L.me, AGENT = L.agent || "no sales agent (walk-in)", PROD = L.product.replace(/ loan$/, " loans"), UP = ME.upstairs || "a higher authority";
    var S = { kind: "", amt: ASK.amt, term: ASK.term }, tried = false, D = L.decision;
    var qa = +CK.q("amt"), qt = +CK.q("term"); if (qa && ME.canDecide && !D) { S.kind = "other"; S.amt = qa; S.term = qt || ASK.term; }
    if (D) { S.kind = D.kind; if (D.amount) { S.amt = D.amount; S.term = D.term; } }
    function inst(a, n) { return METHOD === "flat" ? (a + a * RATE * n) / n : a * RATE / (1 - Math.pow(1 + RATE, -n)); }
    function T(a, n) { var m = inst(a, n); return { m: m, dti: (DEBT + m) / INCOME * 100, ltv: COLL ? a / COLL * 100 : null, fee: a * FEE, net: a - a * FEE, total: m * n }; }
    function terms() { return S.kind === "other" || (D && D.amount) ? { amt: S.amt, term: S.term } : ASK; }
    function over() { return terms().amt > ME.limit; }
    function isOverride() { var t = terms(); if (!L.assessment) return false; var rec = L.assessment.outcome, ok = /Approve automatically|leans approve/.test(rec);
      return S.kind === "asis" ? !ok : S.kind === "no" ? ok || /lower amount/.test(rec) : S.kind === "other" ? (t.amt > FIT || T(t.amt, t.term).dti > POL.dtiSoft) : false; }
    function amtErr() { if (S.kind !== "other") return ""; if (isNaN(S.amt) || S.amt % 1000) return "Enter the amount in whole thousands, for example 250,000."; if (S.amt < MIN || S.amt > MAX) return PROD + " run from " + pesoC(MIN) + " to " + pesoC(MAX) + ".";
      if (S.amt === ASK.amt && S.term === ASK.term) return "Those are the terms she asked for. Use “Approve as asked” instead."; return ""; }
    function blocked() { if (!ME.canDecide) return D ? "Already decided." : L.status !== "review" ? "Only an application Under Review can be decided." : L.encodedByMe ? "You encoded this application, so you cannot decide it." : ME.desk || "Only an underwriter can decide.";
      if (!L.assessment) return "No credit assessment yet. Ask FinScore on the Credit assessment screen first."; return ""; }

    /* ---- the terms, side by side ---- */
    var cmpHead = h("th", "You are granting"), cmpBody = h("tbody"), cmp = h("table.ck-cmp", h("thead", h("tr", h("th", "Terms"), h("th", "She asked for"), cmpHead)), cmpBody);
    var amtIn = CK.input({ mode: "numeric", value: S.amt.toLocaleString("en-PH") }), termIn = CK.select(TERMS.map(function (n) { return [n, n + " months"]; }), S.term);
    var fAmt = CK.field("Amount to grant (₱)", amtIn, { req: true, hint: PROD + " run from " + CK.peso(MIN) + " to " + CK.peso(MAX) + ", in whole thousands." }), fTerm = CK.field("Term", termIn, { req: true });
    var edit = h("div.ck-form.ck-reveal", fAmt, fTerm), editWrap = h("div"), banners = h("div.ck-banners");
    amtIn.addEventListener("input", function () { S.amt = parseFloat(amtIn.value.replace(/[^0-9.]/g, "")); paint(); }); amtIn.addEventListener("blur", function () { if (!isNaN(S.amt)) amtIn.value = S.amt.toLocaleString("en-PH"); });
    termIn.addEventListener("change", function () { S.term = +termIn.value; paint(); });

    /* ---- authority ---- */
    var limBar = h("div.ck-limit", { role: "img" }), limFill = h("i"), checks = h("ul.ck-checks");
    limBar.appendChild(limFill); limBar.appendChild(h("u", { style: { left: (100 / 1.4) + "%" } })); limBar.appendChild(h("span", { style: { left: (100 / 1.4) + "%" } }, "your limit " + CK.peso(ME.limit)));

    /* ---- the decision form ---- */
    var choiceBox = h("div.ck-choices", { role: "group", "aria-label": "Decision" }), choiceBtns = {};
    Object.keys(KIND).forEach(function (k) { var K = KIND[k], b = h("button.ck-choice.t-" + K[1], { type: "button", "aria-pressed": "false" }, h("span.ck-tile", CK.ic(K[3])), h("div", h("b", K[0]), h("small", k === "up" ? "Over your limit: pass it to " + UP + " with the credit memo." : K[4])));
      b.addEventListener("click", function () { var off = offWhy(k); if (off) { CK.toast(off, "blue"); return; } S.kind = S.kind === k ? "" : k; tried = false; paint(); }); choiceBtns[k] = b; choiceBox.appendChild(b); });
    function offWhy(k) { if (k === "up") return !ME.upstairs ? "There is no one above you to endorse it to. Approve it, grant other terms, or decline." : !(ASK.amt > ME.limit || over()) ? "Endorsing upward is for amounts over your own limit. This one is inside it." : "";
      if (k === "asis" && ASK.amt > ME.limit) return "The requested " + pesoC(ASK.amt) + " is over your limit. Endorse it upward, or grant a smaller amount."; return ""; }
    var why = CK.select([["", "Choose a reason"]].concat(REASONS.map(function (r) { return [r, r]; })), ""), fWhy = CK.field("Reason for declining", why, { req: true });
    var rm = CK.textarea("", "What you weighed, in plain words"), fRm = CK.field("Remarks", rm), rmLab = fRm.querySelector("label"), ovPill = h("div"), whyWrap = h("div");
    why.addEventListener("change", function () { fWhy.setError(""); paint(); }); rm.addEventListener("input", function () { if (tried) paint(); });
    var signErr = h("p.ck-err", { role: "alert" }), signBtn = CK.btn("Sign the decision", { kind: "primary", icon: "stamp" });
    signBtn.addEventListener("click", sign);

    function ready() { var b = blocked(); if (b) return b; if (!S.kind) return "Choose a decision first."; if (S.kind !== "up" && over()) return "This amount is over your limit. You can only endorse it upward.";
      if (amtErr()) return amtErr(); if (S.kind === "no" && !why.value) return "Choose a reason for declining.";
      if ((isOverride() || S.kind === "up") && rm.value.trim().length < 20) return "Write your " + (S.kind === "up" ? "endorsement" : "justification") + " in the remarks (at least 20 characters)."; return ""; }

    function paint() {
      var t = terms(), a = T(ASK.amt, ASK.term), b = T(t.amt, t.term), diff = S.kind === "other", no = S.kind === "no";
      cmpHead.textContent = no ? "Declined" : S.kind === "up" ? "You are endorsing" : D ? "Granted" : "You are granting";
      cmpBody.textContent = ""; var rt = Math.round(RATE * 10000) / 100 + "% a month, " + METHOD;
      [["Amount", pesoC(ASK.amt), pesoC(t.amt)], ["Term", ASK.term + " months", t.term + " months"], ["Interest", rt, rt], ["Processing charge (" + Math.round(FEE * 1000) / 10 + "%)", pesoC(a.fee), pesoC(b.fee)], ["Net proceeds", pesoC(a.net), pesoC(b.net)],
        ["Each month", pesoC(a.m), pesoC(b.m)], ["Total to repay", pesoC(a.total), pesoC(b.total)], ["Debt to income", pct(a.dti), pct(b.dti)]].concat(COLL ? [["Loan to value", pct(a.ltv), pct(b.ltv)]] : []).forEach(function (r, i, all) {
        cmpBody.appendChild(h("tr" + (i === all.length - 1 ? ".tot" : ""), h("td", r[0]), h("td", { "data-label": "She asked for" }, r[1]), h("td" + (no ? ".off" : diff && r[1] !== r[2] ? ".now.diff" : ".now"), { "data-label": cmpHead.textContent }, no ? "–" : r[2]))); });
      if (S.kind === "other" && !D) { if (!editWrap.firstChild) editWrap.appendChild(edit); } else editWrap.textContent = "";
      if (document.activeElement !== amtIn) amtIn.value = isNaN(S.amt) ? "" : S.amt.toLocaleString("en-PH"); termIn.value = S.term;
      fAmt.setError(S.kind === "other" ? amtErr() : "");
      banners.textContent = "";
      if (!D && S.kind === "other" && !amtErr()) banners.appendChild(CK.note(h("span", h("b", "This raises counter-offer 1. "), "The terms differ from what was asked for, so the system will issue a counter-offer, handled by " + AGENT + ". Nothing moves to the loan agreement until the borrower's answer is recorded."), "violet", "swap"));
      if (!D && S.kind && !no && S.kind !== "up" && b.dti > POL.dtiMax) banners.appendChild(CK.note(h("span", h("b", "Over the " + POL.dtiMax + "% limit. "), "At these terms debt-to-income is " + pct(b.dti) + ". You may still grant it inside your limit, but it is an override and needs a written justification."), "amber"));
      /* authority */
      limFill.style.width = Math.min(100, t.amt / (ME.limit * 1.4) * 100) + "%"; limBar.classList.toggle("over", over()); limBar.setAttribute("aria-label", pesoC(t.amt) + " against your limit of " + pesoC(ME.limit));
      checks.textContent = ""; [[!over(), over() ? pesoC(t.amt) + " is over your limit. You cannot approve it; you can endorse it to " + UP + "." : pesoC(t.amt) + " is inside your limit."],
        [!L.encodedByMe, L.encodedByMe ? "You encoded this application, so you cannot decide it." : "You did not encode or submit this application (" + L.encodedBy + " did)."],
        [!!L.verifiedBy, L.verifiedBy ? "Encoded data verified by a second user (" + L.verifiedBy + ")." : "Not verified by a second user on record."],
        [!!(L.assessment && L.reportOnFile), L.assessment && L.reportOnFile ? "Credit assessment complete, with the FinScore report on file." : "No credit assessment yet."]].forEach(function (r) {
        checks.appendChild(h("li" + (r[0] ? ".ok" : ".no"), h("span.ck-rmark", CK.ic(r[0] ? "check" : "x")), h("span", r[1]))); });
      /* the form */
      Object.keys(choiceBtns).forEach(function (k) { choiceBtns[k].setAttribute("aria-pressed", String(S.kind === k)); choiceBtns[k].classList.toggle("is-off", !!offWhy(k)); });
      var ov = isOverride() && S.kind !== "up", need = ov || S.kind === "up";
      ovPill.textContent = ""; if (ov) ovPill.appendChild(CK.pill("Override of the system's recommendation", "amber"));
      if (no) { if (!whyWrap.firstChild) whyWrap.appendChild(fWhy); } else whyWrap.textContent = "";
      rmLab.textContent = ""; rmLab.appendChild(document.createTextNode(S.kind === "up" ? "Endorsement to " + UP : ov ? "Justification for the override" : "Remarks")); rmLab.appendChild(need ? h("b", " *") : h("span.ck-sm", { style: { display: "inline", marginLeft: "6px" } }, "optional"));
      fRm.setError(tried && need && rm.value.trim().length < 20 ? "Write at least 20 characters. It is recorded with your name." : "");
      signBtn.querySelector("span").textContent = S.kind ? "Sign: " + KIND[S.kind][2] : "Sign the decision"; signBtn.classList.toggle("ck-danger", no); signBtn.classList.toggle("ck-primary", !no);
      if (!tried) signErr.textContent = "";
    }

    function sign() {
      tried = true; paint(); var r = ready(); signErr.textContent = r;
      signErr.textContent = "";
      if (r) { if (/reason/.test(r)) fWhy.setError(r); else if (/remarks/.test(r)) rm.focus(); else if (amtErr()) amtIn.focus(); else signErr.textContent = r; return; }
      var t = terms(), b = T(t.amt, t.term), ov = isOverride() && S.kind !== "up", code = CK.codeField(), ci = code.querySelector("input");
      ci.addEventListener("input", function () { ci.value = ci.value.replace(/\D/g, "").slice(0, 6); code.setError(""); });
      CK.modal({ title: "Sign: " + KIND[S.kind][2], body: [
        CK.dl([["Decision", KIND[S.kind][2] + (ov ? " (override)" : "")], ["Terms", S.kind === "no" ? "none granted" : pesoC(t.amt) + " over " + t.term + " months"], ["Each month", S.kind === "no" ? "–" : pesoC(b.m)], ["Signed by", ME.name + ", " + ME.roleName]].concat(S.kind === "no" ? [["Reason", why.value]] : [])),
        rm.value.trim() ? CK.note(rm.value.trim(), "blue", "edit") : null,
        S.kind === "other" ? CK.note("Counter-offer 1 goes to " + AGENT + " to convey. The loan agreement stays locked until her answer is recorded.", "violet", "swap") : null,
        code, h("p.ck-hint", "Signing locks the decision under your name. It goes into the audit log and cannot be changed.")],
        actions: [["Cancel", "ghost"], ["Sign the decision", S.kind === "no" ? "danger" : "primary", function (close, btn, err) {
          if (!/^\d{6}$/.test(ci.value)) { code.setError("Enter all six digits."); ci.focus(); return; }
          CK.busy(btn, true);
          CK.api("POST", "/api/applications/" + encodeURIComponent(L.reference) + "/decision", { kind: S.kind, amount: String(S.amt), termMonths: S.term, reason: why.value, remarks: rm.value, code: ci.value }).then(function (res) {
            close(); CK.toast("Signed and locked under " + res.signature + ". It is in the audit log."); load({ kind: S.kind, override: res.override });
          }, function (e) { CK.busy(btn, false); var m = e.message || "";
            if (/code/i.test(m)) { ci.value = ""; code.setError(m); ci.focus(); return; }
            err(m + (/Nothing was signed/.test(m) ? "" : " Nothing was signed."));
            if (/thousands|run from|asked for|over your approval limit/i.test(m)) fAmt.setError(m); else if (/terms are/.test(m)) fTerm.setError(m); else if (/reason/i.test(m)) fWhy.setError(m); else if (/remarks/i.test(m)) fRm.setError(m); });
        }]] });
    }

    /* ---- what happens after ---- */
    function thenSteps(k) { return k === "other" ? ["Status became Approved, then Awaiting borrower acceptance.", "Counter-offer 1: " + pesoC(S.amt) + " over " + S.term + " months against the " + pesoC(ASK.amt) + " asked for.", "It is handled by " + AGENT + ".", "The loan agreement and disbursement stay locked until the borrower's answer is recorded with proof."]
      : k === "asis" ? ["Status became Approved.", "No counter-offer: the terms are exactly what was asked for.", "The loan agreement and disclosure statement can now be generated."]
      : k === "no" ? ["Status became Rejected.", "The application returns to the loan processor, " + L.encodedBy + ", with your reason."]
      : ["Status stays Under review.", "It goes to " + (D && D.endorsedTo || UP) + " with the credit memo and the endorsement."]; }
    function nextBtn(k) { return k === "other" ? CK.btn("Open counter-offers", { kind: "primary", icon: "next", href: "counter-offers.html?ref=" + encodeURIComponent(L.reference) })
      : k === "asis" ? CK.btn("Open loan agreement", { kind: "primary", icon: "next", href: "loan-agreement.html?ref=" + encodeURIComponent(L.reference) }) : CK.btn("Back to the review queue", { kind: "primary", icon: "next", href: "review-queue.html" }); }

    /* ---- the page ---- */
    var A = L.assessment, recCard = CK.card("The rules recommend", A ? [h("div.ck-verdict", h("div.ck-seal2.t-" + ({ Low: "green", Moderate: "amber", High: "red" }[A.tier] || "grey"), A.tier.charAt(0)), h("div", h("b.ck-tiername", A.tier + " risk"), h("small.ck-sm", "Rule set version " + (A.version || L.ruleVersion)))),
        h("div.ck-rec", h("b", A.outcome.replace(/^Manual review: /, "").replace(/^./, function (c) { return c.toUpperCase(); })), h("p", A.why), FIT && FIT < ASK.amt ? h("p", "Up to " + pesoC(FIT) + " over " + ASK.term + " months, debt-to-income stays at or under " + POL.dtiSoft + "%.") : null,
          h("p.ck-sm", "This is a recommendation; the decision is yours, within your limit."))]
      : [CK.note("No credit assessment yet. Ask FinScore on the Credit assessment screen first.", "amber"), h("div.ck-actions", CK.btn("Credit assessment", { kind: "primary", icon: "next", href: "credit-assessment.html?ref=" + encodeURIComponent(L.reference) }))],
      { icon: "shield", tools: CK.btn("Assessment", { kind: "ghost", icon: "chart", href: "credit-assessment.html?ref=" + encodeURIComponent(L.reference) }) });
    var termsCard = CK.card("Terms", [h("div.ck-tablewrap", cmp), editWrap, banners], { icon: "peso" });
    var authCard = CK.card("Your authority", [h("div.ck-who", CK.av(ME.name, 40), h("div", h("b", ME.name), h("small", ME.roleName + " · limit " + CK.peso(ME.limit)))), limBar, checks], { icon: "shield" });
    var right = D ? [] : [authCard], top = [];
    if (L.endorsement && !D) top.push(CK.card(null, CK.note(h("span", h("b", "Endorsed upward by " + L.endorsement.by + " on " + CK.dt(L.endorsement.at) + ". "), "“" + (L.endorsement.remarks || "no remarks") + "”" + (ME.canDecide ? " It is yours to decide." : "")), "blue", "up")));
    if (D) {
      var k = D.kind, tone = KIND[k] ? KIND[k][1] : "grey";
      right.unshift(CK.card("On the record", [h("div.ck-signed.t-" + tone, h("span.ck-seal2.t-" + tone, CK.ic(k === "no" ? "x" : k === "up" ? "up" : "check")), h("div", h("b", D.label + (D.override ? " (override)" : "")), h("small", "Signed electronically by " + D.by + " · " + CK.dt(D.at)))),
        CK.dl([["Terms", k === "no" ? "none granted" : pesoC(D.amount) + " over " + D.term + " months"], ["Signature", h("span.ck-seal", D.signature)], ["Rule set", "Version " + D.version + ". System recommended: " + (D.recommended || "").replace(/^Manual review: /, "").toLowerCase()],
          D.reason ? ["Reason", D.reason] : null, ["Remarks", D.remarks || "none"]], "one"),
        h("div.ck-divider"), h("b.ck-strong", "What happens now"), h("ol.ck-then", thenSteps(k).map(function (s) { return h("li", s); })),
        h("div.ck-actions", nextBtn(k), CK.btn("Open the application", { kind: "ghost", href: "application-detail.html?ref=" + encodeURIComponent(L.reference) }))], { icon: "lock", tools: CK.pill("Locked", "grey") }));
    } else if (!ME.canDecide) {
      top.push(CK.card(null, CK.note(blocked(), "amber", "lock")));
    } else {
      right.push(CK.card("Your decision", [
        h("div.ck-field", h("label", h("span.ck-stepno", "1"), " Choose the decision"), choiceBox),
        h("div.ck-field", h("label", h("span.ck-stepno", "2"), " Say why"), ovPill, whyWrap, fRm),
        L.assessment ? null : CK.note("No credit assessment yet. Ask FinScore on the Credit assessment screen first.", "amber"),
        h("div.ck-actions", signBtn), signErr,
        h("p.ck-hint", "You sign with your authenticator code in the next step. The server checks your limit, the override rules and the code again before it signs.")], { icon: "stamp" }));
    }
    CK.render([
      CK.head({ crumbs: [["Review queue", "review-queue.html"], [L.reference, "application-detail.html?ref=" + encodeURIComponent(L.reference)], ["Credit assessment", "credit-assessment.html?ref=" + encodeURIComponent(L.reference)], ["Decision"]],
        title: "Decision", status: CK.status(L.status), sub: L.borrower + " · " + L.product + " · asked for " + CK.peso(ASK.amt) + " over " + ASK.term + " months" + (A ? " · " + A.tier + " risk" : " · not yet assessed") + " · rule set version " + L.ruleVersion }),
      top.length ? top : null,
      h("div.ck-grid.side2", h("div.ck-stack", recCard, termsCard), h("div.ck-stack", right))
    ].reduce(function (a, x) { return a.concat(x); }, []));
    paint();
  }
})();
