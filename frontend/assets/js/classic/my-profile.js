/* My profile, classic: your own account — how to reach you, which notices you get, and how you sign in. Each part saves on its own. */
(function () {
  var h = CK.h;
  var EV = [["A new application is assigned to me", "", 0], ["Papers for my application arrive", "", 0], ["A paper is found missing or unreadable", "", 0], ["A decision is made on my application", "", 0],
    ["The borrower answers a counter-offer", "", 0], ["A loan I processed is released", "For your information only.", 0], ["Something is sent back to me to fix", "", 1],
    ["My application has waited too long", "Sent at 40 hours, before your supervisor is told at 48.", 1]];
  var CH = ["Inside CALMS", "Email", "Text"];
  function spaced(d) { return d ? d.replace(/(\d{4})(\d{3})(\d{4})/, "$1 $2 $3") : ""; }
  function load() { return CK.api("GET", "/api/me"); }
  CK.loading();
  load().then(draw, function (e) { CK.error(e, "my-queue.html"); });

  function draw(M) {
    var U = M.user, mobile = spaced(U.mobile);

    /* ---- the account ---- */
    var account = CK.card(null, [
      h("div.ck-pf-badge", CK.av(U.name, 64), h("div", h("span.ck-pf-co", "GR8 Lending Company"), h("b", U.name), CK.pill(U.roleName, "brand"))),
      CK.dl([["Username", U.username], ["Branch", U.branch], ["Work email", U.email], ["Signed in", M.signedIn || "Just now"], ["Password last changed", M.passwordChanged || "–"]]),
      h("p.ck-hint", "To change your name, role or branch, ask the System Administrator.")], { cls: "ck-pf-acct" });

    /* ---- how to reach you ---- */
    var mob = CK.input({ type: "tel", mode: "tel", value: mobile, ph: "Not set yet" }), fMob = CK.field("Mobile number for texts", mob, { hint: "Eleven digits starting with 09, for example 0917 555 0188." });
    mob.addEventListener("input", function () { fMob.setError(""); });
    var mSave = CK.btn("Save my number", { kind: "primary", icon: "check", on: function () {
      var d = mob.value.replace(/\D/g, ""); fMob.setError("");
      if (!/^09\d{9}$/.test(d)) { fMob.setError(d ? "That is not a mobile number. It needs 11 digits starting with 09." : "Enter your mobile number, or untick Text for every notice."); mob.focus(); return; }
      CK.busy(mSave, true); CK.api("PUT", "/api/me/mobile", { mobile: d }).then(function () { CK.busy(mSave, false); mobile = spaced(d); mob.value = mobile; CK.toast("Texts will go to " + mobile + " from now on."); },
        function (e) { CK.busy(mSave, false); fMob.setError(e.message); mob.focus(); }); } });
    var reach = CK.card("How to reach you", [fMob, CK.dl([["Work email", h("span", U.email, h("small.ck-sm", "Set by the administrator."))]], "one"), h("div.ck-actions", mSave)], { icon: "phone" });

    /* ---- signing in ---- */
    var mfaBox = h("div.ck-stack.ck-pf-tight"), sessBox = h("ul.ck-list.ck-pf-sess");
    function drawMfa() { mfaBox.textContent = ""; var on = M.mfa.on;
      var row = h("div.ck-pf-row", h("span.ck-pf-tile" + (on ? ".on" : ""), CK.ic("shield")), h("div.grow", h("b", "Second factor at sign-in"),
        h("small", M.mfa.required ? "Your role requires it, so it cannot be switched off." : on ? "CALMS asks for the code from your authenticator when you sign in." : "Optional for your role, and safer.")),
        CK.pill(on ? "On" : "Off", on ? "green" : "grey"));
      mfaBox.appendChild(row);
      if (!M.mfa.required) mfaBox.appendChild(h("div.ck-actions", on ? CK.btn("Switch it off", { kind: "danger", icon: "x", on: mfaOff }) : CK.btn("Set up my authenticator", { kind: "soft", icon: "key", on: mfaStart }))); }
    function drawSess() { sessBox.textContent = "";
      sessBox.appendChild(h("li", h("span.ck-filetile", CK.ic("server")), h("div.grow", h("b.ck-strong", "This window"), h("small.ck-sm", M.signedIn ? "Signed in " + M.signedIn : "Signed in")), CK.pill("You are here", "green")));
      if (M.othersOut) return;
      var b = CK.btn("Sign them all out", { kind: "ghost", icon: "x", on: function () { CK.busy(b, true); CK.api("POST", "/api/me/sign-out-others").then(function () { M.othersOut = true; drawSess();
          CK.toast("Every other place you were signed in has been signed out. You stay signed in here. Recorded in the audit log."); }, function (e) { CK.busy(b, false); CK.fail(e); }); } });
      b.classList.add("ck-sm");
      sessBox.appendChild(h("li", h("span.ck-filetile", CK.ic("users")), h("div.grow", h("b.ck-strong", "Anywhere else you are signed in"), h("small.ck-sm", M.before ? "Your sign-in before this one: " + M.before : "CALMS does not list them one by one")), b)); }
    var pwBtn = CK.btn("Change my password", { kind: "ghost", icon: "lock", on: password });
    var signing = CK.card("Signing in", [mfaBox, h("div.ck-divider"),
      h("div.ck-pf-row", h("span.ck-pf-tile", CK.ic("lock")), h("div.grow", h("b", "Password"), h("small", M.passwordChanged ? "Last changed " + M.passwordChanged + "." : "Your own password.")), pwBtn),
      h("div.ck-divider"), h("div", h("b.ck-pf-sub", "Where I am signed in"), sessBox),
      h("p.ck-hint", "Changes to your sign-in settings are written to the audit log.")], { icon: "shield" });
    drawMfa(); drawSess();

    function mfaStart(ev) { var b = ev.currentTarget; CK.busy(b, true);
      CK.api("POST", "/api/me/mfa/start").then(function (d) { CK.busy(b, false);
        var c = CK.input({ mode: "numeric", max: 6, ph: "6-digit code", ac: "one-time-code" }); c.classList.add("ck-code");
        var fc = CK.field("Then type the 6-digit code it shows", c); c.addEventListener("input", function () { fc.setError(""); });
        CK.modal({ title: "Set up your authenticator", body: [
          h("p.ck-pf-p", "Open your authenticator app (Google Authenticator, Microsoft Authenticator or similar), choose “Enter a setup key”, and type this key, with CALMS as the account name:"),
          h("div.ck-pf-key", d.secret.replace(/(.{4})/g, "$1 ").trim()), fc],
          actions: [["Cancel", "ghost"], ["Turn it on", "primary", function (close, btn) { var code = c.value.replace(/\D/g, ""); if (!/^\d{6}$/.test(code)) { fc.setError("Type the 6 digits your authenticator shows now."); c.focus(); return; }
            CK.busy(btn, true); CK.api("POST", "/api/me/mfa/confirm", { token: d.token, code: code }).then(function () { close(); M.mfa.on = true; drawMfa();
              CK.toast("Second factor is on. From your next sign-in, CALMS asks for the code from your authenticator. Recorded in the audit log."); }, function (e) { CK.busy(btn, false); fc.setError(e.message); c.focus(); }); }]] });
      }, function (e) { CK.busy(b, false); CK.fail(e); }); }
    function mfaOff() { var p = CK.input({ type: "password", ac: "current-password" }), fp = CK.field("Type your password to switch the second factor off", p); p.addEventListener("input", function () { fp.setError(""); });
      CK.modal({ title: "Switch the second factor off", body: [CK.note("You will sign in with your password only. This is written to the audit log.", "amber"), fp],
        actions: [["Cancel", "ghost"], ["Switch it off", "danger", function (close, btn) { if (!p.value) { fp.setError("Type your password to switch it off."); p.focus(); return; }
          CK.busy(btn, true); CK.api("POST", "/api/me/mfa/off", { password: p.value }).then(function () { close(); M.mfa.on = false; drawMfa();
            CK.toast("Second factor is off. You sign in with your password only. Recorded in the audit log.", "blue"); }, function (e) { CK.busy(btn, false); fp.setError(e.message); p.focus(); }); }]] }); }

    function password() {
      var cur = CK.input({ type: "password", ac: "current-password" }), nw = CK.input({ type: "password", ac: "new-password" }), cf = CK.input({ type: "password", ac: "new-password" });
      var fCur = CK.field("Current password", cur), fNw = CK.field("New password", nw), fCf = CK.field("New password again", cf), rules = h("ul.ck-pf-rules", { "aria-live": "polite" });
      var show = CK.check("Show what I am typing", false); show.querySelector("input").addEventListener("change", function (e) { [cur, nw, cf].forEach(function (i) { i.type = e.target.checked ? "text" : "password"; }); });
      function tests() { var p = nw.value, kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(p); }).length;
        return [["At least 12 characters", p.length >= 12], ["At least three of: small letters, capital letters, numbers, symbols", kinds >= 3], ["Different from your current password", p.length > 0 && p !== cur.value]]; }
      function drawRules() { rules.textContent = ""; tests().forEach(function (t) { rules.appendChild(h("li" + (t[1] ? ".ok" : ""), CK.ic(t[1] ? "check" : "dots"), h("span", t[0]))); });
        rules.appendChild(h("li.later", CK.ic("clock"), h("span", "Not one of your last five passwords (checked when you save)"))); }
      [[cur, fCur], [nw, fNw], [cf, fCf]].forEach(function (x) { x[0].addEventListener("input", function () { x[1].setError(""); drawRules(); }); });
      drawRules();
      CK.modal({ title: "Change my password", body: [fCur, fNw, rules, fCf, show],
        actions: [["Cancel", "ghost"], ["Change my password", "primary", function (close, btn) { var first = null; [fCur, fNw, fCf].forEach(function (f) { f.setError(""); });
          function bad(f, i, m) { f.setError(m); first = first || i; }
          var t = tests(); if (!cur.value) bad(fCur, cur, "Enter your current password.");
          if (!nw.value) bad(fNw, nw, "Enter a new password."); else if (!t[0][1] || !t[1][1]) bad(fNw, nw, "The new password does not meet the rules below yet."); else if (!t[2][1]) bad(fNw, nw, "The new password must be different from the current one.");
          if (nw.value && cf.value !== nw.value) bad(fCf, cf, cf.value ? "The two new passwords are not the same." : "Type the new password again.");
          if (first) { first.focus(); return; }
          CK.busy(btn, true); CK.api("POST", "/api/me/password", { current: cur.value, next: nw.value }).then(function () { close(); M.othersOut = true; M.mustChangePassword = false; drawSess(); if (mustBox) mustBox.remove();
            CK.toast("Password changed. You stay signed in here; every other place you were signed in has been signed out. Recorded in the audit log."); },
            function (e) { CK.busy(btn, false); if (/current/i.test(e.message)) { fCur.setError(e.message); cur.focus(); } else { fNw.setError(e.message); nw.focus(); } }); }]] });
    }

    /* ---- which notices I get ---- */
    var P, B, Q, QB, count = h("span.ck-sm", { role: "status" });
    function fresh() { P = M.prefs.map(function (r) { return r.slice(); }); B = JSON.stringify(P); Q = { on: !!M.quiet.on, from: M.quiet.from, to: M.quiet.to }; QB = JSON.stringify(Q); }
    fresh();
    var rows = EV.map(function (e, i) { return { i: i, e: e }; });
    var prefT = CK.table([{ k: "e", label: "When this happens", render: function (r) { return h("div.ck-pf-ev", h("span", r.e[0]), r.e[2] ? CK.pill("Always sent", "brand") : null, r.e[1] ? h("small.ck-sm", r.e[1]) : null); } }]
      .concat(CH.map(function (c, j) { return { k: "c" + j, label: c, align: "center", w: "110px", render: function (r) { var locked = r.e[2] && j === 0, cb = h("input", { type: "checkbox", "aria-label": c + ": " + r.e[0] + (locked ? " (always sent)" : "") });
        cb.checked = !!P[r.i][j]; cb.disabled = !!locked;
        cb.addEventListener("change", function () { P[r.i][j] = cb.checked ? 1 : 0; if (!P[r.i][0] && !P[r.i][1] && !P[r.i][2]) CK.toast("You will not be told when: " + r.e[0].toLowerCase() + ". You can still find it in your queue.", "blue"); changed(); });
        return h("label.ck-pf-cb", cb, h("span", c)); } }; })), rows, { page: 20 });
    prefT.classList.add("ck-pf-prefs");
    var hours = []; for (var x = 0; x < 24; x++) { var t = ("0" + x).slice(-2) + ":00"; hours.push([t, t]); }
    var qOn = CK.check("Hold emails and texts outside working hours. They still show inside CALMS, and are sent when the hours start.", Q.on), qBox = qOn.querySelector("input");
    var q1 = CK.select(hours, Q.from), q2 = CK.select(hours, Q.to), qRow = h("div.ck-pf-quiet", h("label", { "for": "ckq1" }, "From"), q1, h("label", { "for": "ckq2" }, "until"), q2, h("span.ck-hint", "“Always sent” notices are never held."));
    q1.id = "ckq1"; q2.id = "ckq2";
    function quiet() { qBox.checked = Q.on; q1.value = Q.from; q2.value = Q.to; qRow.hidden = !Q.on; }
    qBox.addEventListener("change", function () { Q.on = qBox.checked; quiet(); changed(); });
    q1.addEventListener("change", function () { Q.from = q1.value; changed(); }); q2.addEventListener("change", function () { Q.to = q2.value; changed(); });
    var pSave = CK.btn("Save my choices", { kind: "primary", icon: "check" }), pUndo = CK.btn("Undo", { kind: "ghost", icon: "refresh" });
    function changed() { var a = JSON.parse(B), n = 0; P.forEach(function (r, i) { r.forEach(function (v, j) { if (v !== a[i][j]) n++; }); }); if (JSON.stringify(Q) !== QB) n++;
      count.textContent = n ? n + (n === 1 ? " change" : " changes") + " not saved yet" : "Nothing to save."; pUndo.hidden = !n; count.classList.toggle("ck-pf-dirty", !!n); return n; }
    pUndo.addEventListener("click", function () { P = JSON.parse(B); Q = JSON.parse(QB); prefT.set(rows); quiet(); changed(); CK.toast("Your unsaved choices were undone.", "blue"); pSave.focus(); });
    pSave.addEventListener("click", function () { var n = changed(); if (!n) { CK.toast("Nothing has changed.", "blue"); return; }
      if (Q.on && Q.from === Q.to) { CK.toast("Not saved. The quiet hours start and end at the same time; choose two different times.", "red"); q1.focus(); return; }
      var needSms = P.some(function (r) { return r[2]; }), email = P.some(function (r) { return r[1]; });
      CK.busy(pSave, true); CK.api("PUT", "/api/me/notifications", { prefs: P, quiet: Q }).then(function (r) { CK.busy(pSave, false); if (r && r.prefs) { P = r.prefs; prefT.set(rows); } B = JSON.stringify(P); QB = JSON.stringify(Q); changed();
        CK.toast("Saved. " + n + (n === 1 ? " choice" : " choices") + " changed." + (needSms && mobile ? " Texts go to " + mobile + "." : "") + (email ? (!M.mail.on ? " (Email is not connected yet; your choices are kept for when it is.)" : !M.mail.deliverable ? " (Your work email is a sample address that cannot receive mail. Ask the System Administrator to put in your real one.)" : " Emails go to " + U.email + ".") : "") + (needSms ? " (Texts are not connected; that choice is kept for when they are.)" : "")); },
        function (e) { CK.busy(pSave, false); CK.toast("Not saved. " + e.message, "red"); }); });
    var mailNote = M.mail.on ? "Notices you tick under Email are emailed to " + U.email + (M.mail.deliverable ? "." : ", which is a sample address: ask the administrator for your real one.") + " Texts are not connected." : "Email and text are not connected, so notices show inside CALMS only.";
    var notices = CK.card("Which notices I get", [
      h("p.ck-pf-p", "Tick how you want to hear about each thing. The ones marked “Always sent” cannot be switched off, because the work stops without them."),
      prefT, h("div.ck-divider"), h("div.ck-stack.ck-pf-tight", qOn, qRow), CK.note(mailNote, "blue"),
      h("div.ck-toolbar.between", count, h("div.ck-actions", pUndo, pSave))], { icon: "bell", cls: "ck-pf-notices" });
    quiet(); changed();

    var mustBox = M.mustChangePassword ? h("div.ck-in", CK.note(h("span", h("b", "Choose your own password now. "), "You signed in with a one-time password."), "amber", "lock")) : null;
    CK.render([
      CK.head({ title: "My profile", sub: "Your own account: how to reach you, which notices you get, and how you sign in. Your role is set by an administrator." }),
      mustBox,
      h("div.ck-grid.ck-pf-grid", h("div.ck-stack", account, reach, signing), h("div.ck-stack", notices)) ]);
    if (M.mustChangePassword) setTimeout(password, 500);
  }
})();
