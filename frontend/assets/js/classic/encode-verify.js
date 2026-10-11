/* Encode and verify, classic: a second loan processor compares every encoded entry with the scanned paper, then verifies it or returns the wrong ones to the encoder, who corrects and resubmits. */
(function () {
  var h = CK.h, ref = CK.q("ref"); if (!ref) return;
  function quiet() { var n = 0, t = setInterval(function () { var d = document.getElementById("calmsDown"); if (d) d.remove(); document.body.classList.remove("calms-down"); if (++n > 25) clearInterval(t); }, 200); }
  var money = function (v) { return /^\d{1,3}(,\d{3})*\.\d{2}$/.test(v) ? "" : "Write the amount with commas and two decimals, for example 158,400.00."; };
  var date = function (v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v)) ? "" : "Write the date as year-month-day, for example 1979-03-14."; };
  var FMT = { money: money, date: date, years: function (v) { return /^\d+(\.\d+)?$/.test(v) ? "" : "Enter the number of years, for example 3."; }, id: function (v) { return v.trim() ? "" : "Enter the ID number."; } };
  var REASONS0 = ["Differs from the document", "Cannot be read on the document", "Belongs in a different field", "Missing from the document"];
  var keepDoc = null;
  function load(flash) {
    Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref) + "/verification"), CK.api("GET", "/api/auth/me")]).then(function (r) { start(r[0], r[1].user || {}, flash); },
      function (e) { if (e && e.status === 401) return; quiet(); CK.error(e, "applications.html"); });
  }
  CK.loading(); load();

  function start(V, ME, flash) {
    var DOCS = V.papers.map(function (p) { return { id: p.slot, tab: p.label, file: p.file, fields: p.fields.map(function (f) { return { key: f.key, label: f.label, val: f.value, fmt: FMT[f.format] || null }; }) }; });
    var REASONS = V.reasons && V.reasons.length ? V.reasons : REASONS0;
    var F = {}; V.papers.forEach(function (p) { p.fields.forEach(function (f) { var S = F[f.key] = { val: f.value, wasVal: f.value, check: null, reason: "", note: "", was: f.was || [], edited: false, err: "" };
      if (V.state === "returned" && f.flag) { S.check = "flag"; S.reason = f.flag.reason; S.note = f.flag.note || ""; }
      else if (V.state === "verified") S.check = "ok"; else if (V.state === "waiting" && f.check === "ok") S.check = "ok"; }); });
    var status = ({ waiting: "encoded", returned: "returned", verified: "verified", draft: "encoded" })[V.state] || "encoded";
    var CHK = V.canCheck ? ME.shortName : (V.returnedBy || V.verifiedBy || "the checker"), NPAP = "all " + DOCS.length + " papers", busy = false;
    var cur = keepDoc && DOCS.some(function (d) { return d.id === keepDoc; }) ? keepDoc : DOCS[0] && DOCS[0].id, active = "";
    function canCheck() { return V.canCheck && status === "encoded"; } function canFix() { return V.canFix && status === "returned"; }
    function all() { var L = []; DOCS.forEach(function (d) { d.fields.forEach(function (f) { L.push(f); }); }); return L; }
    function left() { return all().filter(function (f) { return !F[f.key].check; }).length; }
    function flags() { return all().filter(function (f) { return F[f.key].check === "flag"; }); }
    function doc() { return DOCS.filter(function (d) { return d.id === cur; })[0]; }
    var ST = { encoded: ["Encoded", "blue"], returned: ["Returned for correction", "red"], verified: ["Verified", "green"] }[status];

    var statsBox = h("div.ck-stats", { style: { "--cols": 4 } }), tabsBox = h("div.ck-toolbar"), paperBox = h("div.ck-sticky"), entriesBox = h("div"), decideBox = h("div"), recBox = h("div");

    function drawStats() { statsBox.textContent = "";
      [CK.stat("Encoded by", V.encodedBy || "–", { icon: "edit", tone: "blue", sub: V.encodedAt ? CK.dt(V.encodedAt) : "" }),
       CK.stat("Verified by", status === "verified" ? (V.verifiedBy || CHK) : "Not yet", { icon: "shield", tone: status === "verified" ? "green" : "grey", sub: V.verifiedAt ? CK.dt(V.verifiedAt) : "A second user" }),
       CK.stat("Checked", (all().length - left()) + " of " + all().length, { icon: "check", tone: left() ? "amber" : "green", sub: "entries, across " + NPAP }),
       CK.stat("Circled", String(flags().length), { icon: "flag", tone: flags().length ? "red" : "grey", sub: flags().length ? "do not match the paper" : "nothing circled" })].forEach(function (s, i) { if (drawn) s.classList.remove("ck-in"); statsBox.appendChild(s); }); }
    function drawTabs() { tabsBox.textContent = "";
      var opts = DOCS.map(function (d) { var ok = d.fields.filter(function (f) { return F[f.key].check === "ok"; }).length, fl = d.fields.filter(function (f) { return F[f.key].check === "flag"; }).length; return [d.id, d.tab, fl ? fl + " circled" : ok + "/" + d.fields.length, fl ? "bad" : ok === d.fields.length ? "ok" : ""]; });
      var t = CK.tabs(opts.map(function (o) { return [o[0], o[1], o[2]]; }), cur, function (v) { cur = v; keepDoc = v; active = ""; drawPaper(); drawEntries(); });
      t.classList.add("ck-evtabs"); [].forEach.call(t.children, function (b, i) { var em = b.querySelector("em"); if (em && opts[i][3]) em.classList.add(opts[i][3]); }); tabsBox.appendChild(t); }
    /* the scanned paper, shown beside the entries */
    function drawPaper() { var d = doc(); paperBox.textContent = ""; if (!d) return;
      var lamp = h("div.ck-lamp.ck-fade"), src = d.file ? "/api/applications/" + V.reference + "/documents/" + d.file.id : "";
      if (!d.file) lamp.appendChild(h("div.ck-lampmsg", h("span.ck-filetile.miss", CK.ic("alert")), h("b", d.tab), h("span.ck-sm", "Not on file yet. Ask the encoder to file it on the Documents page."), CK.btn("Documents", { kind: "ghost", icon: "doc", href: "documents.html?ref=" + V.reference })));
      else if (/^image\//.test(d.file.type)) lamp.appendChild(h("img", { src: src, alt: d.tab + ", " + d.file.name }));
      else if (matchMedia("(max-width: 600px)").matches) { var a = CK.btn("Open the paper", { kind: "primary", icon: "eye", href: src }); a.target = "_blank"; a.rel = "noopener"; lamp.appendChild(h("div.ck-lampmsg", h("span.ck-filetile", CK.ic("doc")), h("b", d.file.name), h("span.ck-sm", "Phones cannot show a PDF inside the page."), a)); }
      else lamp.appendChild(h("iframe", { src: src, title: d.tab + ", " + d.file.name }));
      var tools = d.file ? CK.btn("Open", { kind: "ghost", icon: "eye", title: "Open in a new tab", on: function () { window.open(src, "_blank", "noopener"); } }) : null;
      paperBox.appendChild(h("section.ck-card.ck-evdoc.ck-viewer" + (drawn ? ".ck-panelin" : ".ck-in"), h("div.ck-cardhead", h("h2", CK.ic("doc"), d.tab), tools),
        h("div.ck-cardbody", lamp, d.file ? h("p.ck-hint", d.file.name + " (v" + d.file.version + "). Opening a paper is written to the audit log.") : null))); }

    /* ---- the entries ---- */
    function hint() { return canCheck() ? "Compare each entry with the paper, one line at a time. There is no “all match” button, on purpose." : canFix() ? "Correct the entries the verifier marked. The rest are locked." : status === "verified" ? "Verified and locked." :
      !V.isEncoder && !V.canCheck ? "Read only. Only a loan processor who did not encode it can check these entries." : V.isEncoder && status === "encoded" ? "Waiting for a second user. You encoded these entries, so you cannot verify them." : "Returned to the encoder. Waiting for corrections."; }
    function drawEntries(focusKey) { var d = doc(); entriesBox.textContent = ""; if (!d) return;
      var ul = h("ul.ck-entries");
      d.fields.forEach(function (f, i) { var k = f.key, S = F[k];
        var li = h("li.ck-entry" + (S.check === "ok" ? ".ok" : S.check === "flag" ? ".flag" : "") + (active === k ? ".on" : "") + (drawnE ? "" : ".ck-rowin"), { style: { "--i": i } });
        li.addEventListener("focusin", function () { active = k; [].forEach.call(ul.children, function (x) { x.classList.toggle("on", x === li); }); });
        var row = h("div.ck-entryrow"), main = h("div.grow", h("span.lbl", f.label));
        if (canFix() && S.check === "flag") {
          var inp = CK.input({ value: S.val }); inp.id = "ev-" + k; var fld = CK.field(f.label, inp, { hint: "Copy it again from the paper." }); fld.setError(S.err);
          inp.addEventListener("input", function () { S.val = inp.value; S.edited = S.val !== S.wasVal; S.err = ""; var e = f.fmt ? f.fmt(S.val.trim()) : ""; fld.setError(S.edited ? e : ""); drawDecide(); });
          main = h("div.grow", fld);
        } else main.appendChild(h("span.val", S.val || "–"));
        row.appendChild(main);
        if (canCheck()) {
          var y = h("button.y", { type: "button", "aria-pressed": String(S.check === "ok") }, CK.ic("check"), "Matches"), n = h("button.n", { type: "button", "aria-pressed": String(S.check === "flag") }, CK.ic("x"), "Does not match");
          y.addEventListener("click", function () { S.check = S.check === "ok" ? null : "ok"; S.reason = ""; active = k; update(); });
          n.addEventListener("click", function () { S.check = S.check === "flag" ? null : "flag"; if (S.check) S.reason = REASONS[0]; active = k; update(k); });
          row.appendChild(h("div.ck-match", { role: "group", "aria-label": f.label }, y, n));
        } else if (S.check === "ok") row.appendChild(CK.pill("Matches", "green"));
        else if (S.check === "flag" && !canFix()) row.appendChild(CK.pill("Circled", "red"));
        li.appendChild(row);
        if (canCheck() && S.check === "flag") {
          var sel = CK.select(REASONS.map(function (r) { return [r, r]; }), S.reason); sel.id = "rs-" + k; sel.addEventListener("change", function () { S.reason = sel.value; });
          var nt = CK.input({ value: S.note, ph: "For example: the paper says 158,400.00", max: 200 }); nt.id = "nt-" + k; nt.addEventListener("input", function () { S.note = nt.value; });
          li.appendChild(h("div.ck-why" + (focusKey === k ? ".ck-open" : ""), CK.field("Reason", sel), CK.field("What the paper says (optional)", nt)));
        }
        if (S.check === "flag" && !canCheck()) li.appendChild(h("div.ck-reason", CK.ic("flag"), h("span", "Marked by " + CHK + ": " + S.reason.toLowerCase() + (S.note ? ". “" + S.note + "”" : "") + ".")));
        S.was.forEach(function (w) { li.appendChild(h("div.ck-was", "Was ", h("b", "“" + w.value + "”"), ", corrected by " + w.by + " " + CK.dt(w.at))); });
        ul.appendChild(li);
      });
      entriesBox.appendChild(h("section.ck-card" + (drawnE ? "" : ".ck-in"), h("div.ck-cardhead", h("h2", CK.ic("list"), "Entries copied from this " + (d.id === "id" ? "ID" : "paper"))),
        h("div.ck-cardbody", h("p.ck-hint", hint()), ul)));
      drawnE = true;
      if (focusKey) setTimeout(function () { var s2 = document.getElementById("rs-" + focusKey); if (s2) s2.focus(); }, 60);
    }
    var drawn = false, drawnE = false;
    function update(focusKey) { drawStats(); drawTabs(); drawEntries(focusKey); drawDecide(); }

    /* ---- the decision ---- */
    function drawDecide() { decideBox.textContent = ""; var fl = flags(), L = left(), body = [];
      if (canCheck()) {
        body.push(h("p.ck-sm", L ? L + " of " + all().length + " entries are still unchecked, across " + NPAP + "." : fl.length ? "All entries checked. " + fl.length + " do not match and go back to the encoder with your reasons." : "All entries checked, and all of them match."));
        if (V.missing && V.missing.length) body.push(CK.note("Papers still missing: " + V.missing.join(", ") + ". It can be checked now, but not verified until they are on file.", "amber"));
        var rb = CK.btn("Return to the encoder", { kind: "danger", icon: "back", on: function () {
          if (!fl.length) { CK.toast("Nothing is circled. Mark at least one entry as not matching before returning it.", "red"); return; }
          CK.modal({ title: "Return to the encoder?", body: [h("p", V.encodedBy + " is notified with the " + fl.length + " circled entr" + (fl.length > 1 ? "ies" : "y") + " and your reasons."),
            h("ul.ck-list", fl.map(function (f) { return h("li", h("span.ck-filetile.miss", CK.ic("flag")), h("div.grow", h("b.ck-strong", f.label), h("small.ck-sm", F[f.key].reason + (F[f.key].note ? " · “" + F[f.key].note + "”" : "")))); }))],
            actions: [["Cancel", "ghost"], ["Return it", "primary", function (close, b, err) { send("return", null, b, close, err); }]] }); } });
        var vb = CK.btn("Verify and send to underwriting", { kind: "green", icon: "check", on: function () {
          if (L || fl.length) { CK.toast(L ? "Not yet. " + L + " entr" + (L > 1 ? "ies are" : "y is") + " still unchecked. There is no shortcut to check them all at once." : "Circled entries must go back to the encoder first.", "red"); return; }
          CK.modal({ title: "Verify and send to underwriting?", body: [h("p", "You compared all " + all().length + " entries with the papers and every one matches. The application moves to Under review and the credit bureau inquiry begins.")],
            actions: [["Cancel", "ghost"], ["Verify", "green", function (close, b, err) { send("verify", null, b, close, err); }]] }); } });
        if (!fl.length) rb.classList.add("ck-dim"); if (L || fl.length) vb.classList.add("ck-dim");
        body.push(h("div.ck-actions", rb, vb));
      } else if (canFix()) {
        var bad = fl.filter(function (f) { var S = F[f.key]; return !S.edited || (f.fmt && f.fmt(S.val.trim())); });
        body.push(h("p.ck-sm", fl.length + " entr" + (fl.length > 1 ? "ies were" : "y was") + " returned. " + (bad.length ? bad.length + " still to correct: " + bad.map(function (f) { return f.label.toLowerCase(); }).join(", ") + "." : "All corrected.")));
        var rs = CK.btn("Resubmit for verification", { kind: "primary", icon: "send", on: function () {
          if (bad.length) { CK.toast("Correct every returned entry first: " + bad.map(function (f) { return f.label.toLowerCase(); }).join(", ") + ".", "red"); var f0 = bad[0], d0 = DOCS.filter(function (d) { return d.fields.indexOf(f0) >= 0; })[0]; if (d0 && d0.id !== cur) { cur = d0.id; drawTabs(); drawPaper(); drawEntries(); } var i0 = document.getElementById("ev-" + f0.key); if (i0) i0.focus(); return; }
          var vals = {}; fl.forEach(function (f) { vals[f.key] = F[f.key].val.trim(); }); send("fix", vals, rs); } });
        if (bad.length) rs.classList.add("ck-dim");
        body.push(h("div.ck-actions", rs));
      } else body.push(CK.note(status === "verified" ? "This record is locked. Any later change needs a new correction cycle." : !V.isEncoder && status === "encoded" ? "Only a loan processor who did not encode this application can check it." :
        V.isEncoder && status === "encoded" ? "You cannot verify entries you encoded (a different user must). Nothing for you to do until it is verified or returned." : "Waiting for the encoder to correct the circled entries.", status === "verified" ? "green" : "blue", status === "verified" ? "lock" : "info"));
      decideBox.appendChild(h("section.ck-card" + (drawn ? "" : ".ck-in"), h("div.ck-cardhead", h("h2", CK.ic("stamp"), canFix() ? "Corrections" : "Decision")), h("div.ck-cardbody.ck-decide", body)));
    }
    function send(kind, vals, btn, close, err) {
      if (busy) return; busy = true; CK.busy(btn, true);
      var checks = {}, flg = {}; all().forEach(function (f) { var S = F[f.key]; checks[f.key] = S.check; if (S.check === "flag") flg[f.key] = { reason: S.reason, note: S.note }; });
      var call = kind === "fix" ? CK.api("POST", "/api/applications/" + V.reference + "/corrections", { values: vals }) : CK.api("POST", "/api/applications/" + V.reference + "/verification", { decision: kind, checks: checks, flags: flg });
      call.then(function () { busy = false; CK.busy(btn, false); if (close) close();
        CK.toast(kind === "verify" ? "Verified. The application moved to Under review and goes to underwriting." : kind === "return" ? "Returned for correction. " + V.encodedBy + " will see the circled entries and your reasons." : "Resubmitted. Only the corrected entries need checking again, by a second user.");
        load(); }, function (e) { busy = false; CK.busy(btn, false); if (e && e.status === 401) return;
        var F2 = e.fields || {}, ks = Object.keys(F2), msg = e.message + (ks.length ? " " + ks.map(function (k) { return F2[k]; }).join(" ") : "");
        if (kind === "fix" && ks.length) { ks.forEach(function (k) { if (F[k]) F[k].err = F2[k]; }); drawEntries(); }
        if (err) err(msg); else CK.toast(msg, "red"); });
    }
    function drawRec() { recBox.textContent = ""; recBox.appendChild(CK.card("Record", h("ul.ck-time", (V.record || []).slice().reverse().map(function (r) { return h("li", h("i"), h("div", h("b", r.text), h("small", CK.dt(r.at)))); })), { icon: "clock" })); }

    var notes = [];
    var fl0 = ""; try { fl0 = sessionStorage.getItem("calms-flash") || ""; sessionStorage.removeItem("calms-flash"); } catch (e) {}
    if (fl0) notes.push(CK.note(fl0, "green", "check"));
    if (!DOCS.length) { CK.render([CK.head({ crumbs: [["Applications", "applications.html"], [V.reference, "application-detail.html?ref=" + V.reference], ["Encode and verify"]], title: "Encode and verify", sub: V.borrower + " · " + V.product + " · " + V.reference }), CK.card(null, CK.empty("Nothing to check", "No entries were encoded for this application.", "list"))]); return; }
    drawStats(); drawTabs(); drawPaper(); drawEntries(); drawDecide(); drawRec();
    CK.render([
      CK.head({ crumbs: [["Applications", "applications.html"], [V.reference, "application-detail.html?ref=" + V.reference], ["Encode and verify"]], title: "Encode and verify", status: CK.pill(ST[0], ST[1]), sub: V.borrower + " · " + V.product + " · " + V.reference,
        actions: [CK.btn("Documents", { kind: "ghost", icon: "doc", href: "documents.html?ref=" + V.reference })] }),
      statsBox, notes.length ? h("div.ck-stack.ck-in", notes) : null, h("div.ck-in", tabsBox),
      h("div.ck-grid.ck-evgrid", paperBox, h("div.ck-stack", entriesBox, decideBox, recBox))
    ]);
    drawn = true;
  }
})();
