/* Users and roles, classic: everyone with an account, what each role can open, and every change to a person's access. */
(function () {
  var h = CK.h;
  var KEYS = {
    sales_agent: ["Start applications", "Record a borrower's answer", "Deliver statements"],
    loan_processor: ["Applications", "Documents", "Encode and verify", "Loan agreements"],
    underwriter: ["Read applications", "Credit assessment", "Approve up to their limit"],
    lead_underwriter: ["Read applications", "Credit assessment", "Approve up to their limit", "Assign the review queue"],
    disbursement_officer: ["Disbursement queue", "Release loans"],
    loan_account_officer: ["Loan accounts", "Post and reverse payments", "Statements and clearances"],
    operations_manager: ["Reports", "Read applications", "Read loan accounts"],
    compliance_auditor: ["Audit log", "Reports"],
    system_administrator: ["Users and roles", "Products and rules", "Templates and system health"]
  };
  var LIMIT = ["underwriter", "lead_underwriter"], ST = { on: ["Active", "green"], lock: ["Locked", "amber"], off: ["Deactivated", "grey"] };
  var REASONS = ["Left the company", "Moved to a job without CALMS access", "On extended leave", "Security concern"];
  function pesoSp(n) { return "₱ " + Number(n).toLocaleString("en-PH"); }
  function first(u) { return u.name.split(" ")[0]; }
  function pwCheck(p) { if (p.length < 12) return "Use at least 12 characters."; if ([/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(function (r) { return r.test(p); }).length < 3) return "Use at least three of: small letters, capital letters, numbers, symbols."; return ""; }
  function limErr(role, v) { if (LIMIT.indexOf(role) < 0) return ""; var t = String(v || "").replace(/[,₱\s]/g, ""); if (!t) return "Enter the largest loan this person may approve."; if (!/^\d+$/.test(t)) return "Use digits only, like 300000."; if (+t < 10000 || +t > 1000000) return "The limit must be between ₱ 10,000 and ₱ 1,000,000."; return ""; }

  CK.loading();
  CK.api("GET", "/api/users").then(function (d) {
    var U = d.users, ME = d.me, ROLE = d.roles, MFA = d.mfaRoles || [], sel = null, q = "", st = "all", roleF = "";
    var needMfa = function (r) { return MFA.indexOf(r) >= 0; };
    var roleOpts = Object.keys(ROLE).map(function (k) { return [k, ROLE[k]]; });
    function put(x) { var i = -1; U.forEach(function (v, j) { if (v.username === x.username) i = j; }); if (i < 0) U.unshift(x); else U[i] = x; return x; }
    function get(id) { return U.filter(function (u) { return u.username === id; })[0]; }

    /* ---- pieces ---- */
    function mfaPill(u) { if (!u.mfa) return CK.pill("Off", "grey"); return u.mfaReady ? CK.pill("On", "green") : CK.pill("Not set up yet", "amber"); }
    function stPill(u) { var s = ST[u.status] || [u.status, "grey"]; return CK.pill(s[0], s[1]); }
    function keyList(now, was, limit) { var ul = h("ul.ck-urkeys");
      now.forEach(function (k, i) { var add = was && was.indexOf(k) < 0; ul.appendChild(h("li" + (add ? ".add" : ""), { style: { "--i": i } }, CK.ic(add ? "plus" : "key"), h("span", k === "Approve up to their limit" && limit ? "Approve up to " + pesoSp(limit) : k))); });
      if (was) was.forEach(function (k) { if (now.indexOf(k) < 0) ul.appendChild(h("li.gone", CK.ic("x"), h("span", k))); });
      return ul; }
    function ringNote(role) { return role === "system_administrator" ? "Administrators manage access and settings. They hold no key to approve a loan or release money." : role === "compliance_auditor" ? "Auditors can read and export. They cannot change anything." : "Everything not on this ring stays locked to them."; }
    function pwBlock(label) { var i = CK.input({ type: "password", ac: "new-password" }), f = CK.field(label, i, { hint: "Leave it empty and CALMS makes a one-time password for you to hand over. If you type one: at least 12 characters and three of small letters, capitals, numbers, symbols." });
      var show = CK.check("Show what I type", false), must = CK.check("Ask them to choose their own at first sign-in", true);
      show.querySelector("input").addEventListener("change", function (e) { i.type = e.target.checked ? "text" : "password"; });
      i.addEventListener("input", function () { f.setError(""); });
      return { el: h("div.ck-stack.ck-atight", f, h("div.ck-achecks", show, must)), input: i, field: f, must: function () { return must.querySelector("input").checked; } }; }

    /* the sign-in details, shown once after an account is made or a password reset */
    function creds(u, d, typed) { var pw = d.passwordSet ? typed : d.tempPassword, must = d.mustChange !== false, shown = false;
      var pwEl = h("code.ck-urcred", pw.replace(/./g, "•")), notes = ["Shown only now: CALMS keeps no copy it can show again. Give these to " + first(u) + " in person."];
      if (must) notes.push("After signing in, they will be asked to choose their own password.");
      if (u.mfa) notes.push("Their role also asks for a 6-digit code at sign-in (246810 while CALMS is in test mode).");
      var showB = CK.btn("Show the password", { kind: "ghost", icon: "eye" });
      showB.addEventListener("click", function () { shown = !shown; pwEl.textContent = shown ? pw : pw.replace(/./g, "•"); showB.querySelector("span").textContent = shown ? "Hide the password" : "Show the password"; });
      var copyB = CK.btn("Copy both", { kind: "soft", icon: "doc" });
      copyB.addEventListener("click", function () { var t = "Username: " + u.username + "\nPassword: " + pw; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { CK.toast("Copied. Paste it somewhere only " + first(u) + " will see.", "blue"); },
        function () { shown = true; pwEl.textContent = pw; showB.querySelector("span").textContent = "Hide the password"; CK.toast("Copying is blocked here; the password is shown so you can write it down.", "blue"); }); });
      CK.modal({ title: "Sign-in details for " + u.name, body: [h("div.ck-urcredbox", h("span", "Username"), h("code.ck-urcred", u.username), h("span", "Password"), pwEl), CK.note(notes.join(" "), "green", "key"), h("div.ck-actions", showB, copyB)],
        actions: [["Done, hide these", "primary"]] }); }

    /* ---- the people table ---- */
    var counts = h("span.ck-sm");
    var tbl = CK.table([
      { k: "name", label: "Person", sort: true, render: function (u) { return h("div.ck-who", { "data-u": u.username }, CK.av(u.name, 36), h("div", h("b", u.name + (u.username === ME ? " (you)" : "")), h("small", u.username))); } },
      { k: "roleName", label: "Role", sort: true, render: function (u) { return h("span", u.roleName); } },
      { k: "limit", label: "Approval limit", sort: true, desc: true, align: "right", render: function (u) { return LIMIT.indexOf(u.role) >= 0 ? h("span.ck-strong", CK.peso(u.limit)) : h("span.ck-sm", "–"); } },
      { k: "mfa", label: "Second factor", sort: function (u) { return u.mfa ? (u.mfaReady ? 2 : 1) : 0; }, render: mfaPill },
      { k: "status", label: "Status", sort: function (u) { return { on: 0, lock: 1, off: 2 }[u.status]; }, render: function (u) {
        var quick = u.status === "lock" ? actBtn(u, "unlock", "Unlock", "lock") : u.status === "off" ? actBtn(u, "reactivate", "Reactivate", "refresh") : null; return h("span.ck-row-end", stPill(u), quick); } }
    ], U, { sort: "status", onRow: function (u) { pick(u.username, true); }, empty: "Nobody matches. Clear the search or choose All." });
    tbl.querySelector("thead").addEventListener("click", function () { setTimeout(markSel, 0); });
    function actBtn(u, act, label, icon) { var b = CK.btn(label, { kind: "soft", icon: icon }); b.classList.add("ck-sm"); b.addEventListener("click", function () { simple(u, act, b); }); return b; }
    function match(u) { if (st === "on" && u.status === "off") return false; if (st === "off" && u.status !== "off") return false; if (roleF && u.role !== roleF) return false;
      return !q || (u.name + " " + u.roleName + " " + u.username).toLowerCase().indexOf(q) >= 0; }
    function apply() { tbl.filter(match); var n = U.filter(match).length; counts.textContent = n + " of " + U.length + " people"; markSel(); }
    function markSel() { [].forEach.call(tbl.querySelectorAll("tbody tr"), function (tr) { var w = tr.querySelector("[data-u]"); tr.classList.toggle("is-sel", !!(w && w.getAttribute("data-u") === sel)); }); }
    var seg = h("span");
    function drawSeg() { seg.textContent = ""; seg.appendChild(CK.seg([["all", "All", U.length], ["on", "Active", U.filter(function (u) { return u.status !== "off"; }).length], ["off", "Deactivated", U.filter(function (u) { return u.status === "off"; }).length]], st, function (v) { st = v; apply(); })); }
    var roleSel = CK.select([["", "Every role"]].concat(roleOpts), ""); roleSel.addEventListener("change", function () { roleF = roleSel.value; apply(); drawSide(); });

    /* ---- stats ---- */
    var stats = h("div.ck-stats.ck-in", { style: { "--cols": 4 } });
    function drawStats() { stats.textContent = "";
      var on = U.filter(function (u) { return u.status === "on"; }).length, lock = U.filter(function (u) { return u.status === "lock"; }).length, off = U.filter(function (u) { return u.status === "off"; }).length, wait = U.filter(function (u) { return u.status !== "off" && u.mfa && !u.mfaReady; }).length;
      stats.appendChild(CK.stat("Active", String(on), { icon: "users", tone: "green", sub: "can sign in now", on: function () { st = "on"; drawSeg(); apply(); } }));
      stats.appendChild(CK.stat("Locked", String(lock), { icon: "lock", tone: lock ? "amber" : "grey", sub: lock ? "waiting for you to unlock" : "nobody is locked out", on: function () { st = "on"; drawSeg(); apply(); } }));
      stats.appendChild(CK.stat("Deactivated", String(off), { icon: "x", tone: "grey", sub: "kept on record, never deleted", on: function () { st = "off"; drawSeg(); apply(); } }));
      stats.appendChild(CK.stat("Authenticator to set up", String(wait), { icon: "shield", tone: wait ? "blue" : "green", sub: wait ? "at their next sign-in" : "everyone who needs one has one" }));
      CK.stagger(stats); [].forEach.call(stats.children, function (c) { c.classList.add("ck-in"); }); }

    /* ---- the side panel: roles at a glance, or the person picked ---- */
    var side = h("div.ck-stack.ck-sticky");
    function drawSide() { side.textContent = ""; var u = sel && get(sel); side.appendChild(u ? personCard(u) : rolesCard()); }
    function rolesCard() {
      var list = h("div.ck-picklist.ck-urroles", roleOpts.map(function (r) { var n = U.filter(function (u) { return u.role === r[0] && u.status !== "off"; }).length;
        var b = h("button.ck-pick" + (roleF === r[0] ? ".is-sel" : ""), { type: "button", on: { click: function () { roleF = roleF === r[0] ? "" : r[0]; roleSel.value = roleF; apply(); drawSide(); } } },
          h("span.ck-urrolenum", String(n)), h("div.grow", h("b", r[1]), h("small", KEYS[r[0]].join(" · "))), needMfa(r[0]) ? h("span.ck-urshield", { title: "Second factor required" }, CK.ic("shield")) : null); return b; }));
      return CK.card("Roles and their keys", [null, list,
        h("div.ck-legend", h("span", CK.ic("shield"), "Second factor at sign-in is required"))], { icon: "key", cls: "ck-panelin" }); }
    function personCard(u) {
      var self = u.username === ME, off = u.status === "off", body = [];
      body.push(h("div.ck-who.big", CK.av(u.name, 48), h("div", h("b", u.name + (self ? " (you)" : "")), h("small", u.email || u.username))));
      body.push(h("div.ck-actions", stPill(u)));
      if (off) { body.push(CK.note("This account is deactivated" + (u.deactivated && u.deactivated.reason ? " (" + u.deactivated.reason.toLowerCase() + ")" : "") + ". " + u.name + " cannot sign in, but everything they did stays on record under their name. Accounts are never deleted.", "grey", "info"));
        var rb = CK.btn("Reactivate this account", { kind: "primary", icon: "refresh" }); rb.addEventListener("click", function () { simple(u, "reactivate", rb); }); body.push(h("div.ck-actions", rb));
        return CK.card(null, body, { cls: "ck-panelin", tools: null }); }
      if (u.status === "lock") { var ub = CK.btn("Unlock the account", { kind: "primary", icon: "lock" }); ub.addEventListener("click", function () { simple(u, "unlock", ub); });
        body.push(h("div.ck-note.t-amber", CK.ic("lock"), h("div.ck-stack.ck-atight", h("div", u.lockNote || "Locked after five wrong passwords in a row. A locked account stays locked until an administrator unlocks it."), h("div", ub)))); }
      body.push(CK.dl([["Role", u.roleName], ["Approval limit", LIMIT.indexOf(u.role) >= 0 ? pesoSp(u.limit) : "None"], ["Second factor", u.mfa ? (u.mfaReady ? "On, authenticator set up" : "On, not set up yet") : "Off"], ["Username", u.username]]));
      body.push(h("div.ck-urring", h("b.ck-urringhead", "Keys " + first(u) + " holds: " + KEYS[u.role].length), keyList(KEYS[u.role], null, u.limit), h("p.ck-sm", ringNote(u.role))));
      var acts = h("div.ck-tasks");
      function task(icon, title, sub, label, kind, fn) { var b = CK.btn(label, { kind: kind || "soft" }); b.classList.add("ck-sm"); b.addEventListener("click", function () { fn(b); }); acts.appendChild(h("div.ck-task", h("span.n", CK.ic(icon)), h("div.grow", h("b", title), h("small", sub)), b)); }
      task("edit", "Role and access", "Role, approval limit, second factor and work email.", "Edit", "soft", function () { edit(u); });
      if (u.mfa && !u.mfaReady) acts.appendChild(h("div.ck-task.lock", h("span.n", CK.ic("shield")), h("div.grow", h("b", "Authenticator: not set up yet"), h("small", "At " + first(u) + "'s next sign-in, CALMS shows a setup key for their authenticator app."))));
      if (!self) {
        task("key", "Password", "Sign them out everywhere and give them a new password.", "Reset", "soft", function () { resetPw(u); });
        if (u.mfa && u.mfaReady) task("shield", "Authenticator", "If " + first(u) + " lost or changed their phone, reset it.", "Reset", "soft", function () { resetMfa(u); });
        task("x", "Deactivate", "They cannot sign in; their past work stays on record.", "Deactivate", "danger", function () { deactivate(u); });
      } else acts.appendChild(h("div.ck-task.lock", h("span.n", CK.ic("user")), h("div.grow", h("b", "This is you"), h("small", "Change your own password on My profile. Another administrator has to change your role or deactivate you."))));
      body.push(acts);
      return CK.card(null, body, { cls: "ck-panelin" }); }
    function pick(id, scroll) { sel = sel === id ? null : id; drawSide(); markSel(); if (scroll && sel && matchMedia("(max-width: 1180px)").matches) side.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }
    function refresh(u) { if (u) put(u); drawStats(); drawSeg(); tbl.set(U); apply(); drawSide(); }

    /* ---- actions ---- */
    function simple(u, act, b) { CK.busy(b, true); CK.api("POST", "/api/users/" + u.username + "/" + act, null).then(function (r) { CK.busy(b, false); sel = u.username; refresh(r.user);
      CK.toast(act === "unlock" ? u.name + " is unlocked. Recorded in the audit log." : u.name + " can sign in again. Recorded in the audit log."); }, function (e) { CK.busy(b, false); CK.fail(e); }); }
    function resetMfa(u) { CK.modal({ title: "Reset " + first(u) + "'s authenticator?", body: [h("p.ck-ap", "Their old codes stop working, they are signed out, and they set up a new one at their next sign-in. Do this when " + first(u) + " lost or changed their phone.")],
      actions: [["Cancel", "ghost"], ["Yes, reset " + first(u) + "'s authenticator", "primary", function (close, b, err) { CK.busy(b, true); CK.api("POST", "/api/users/" + u.username + "/reset-mfa", null).then(function (r) { close(); refresh(r.user); CK.toast(first(u) + "'s authenticator was reset. They set up a new one at their next sign-in. Recorded in the audit log."); }, function (e) { CK.busy(b, false); err(e.message); }); }]] }); }
    function deactivate(u) { var w = CK.select([["", "Choose a reason"]].concat(REASONS.map(function (x) { return [x, x]; })), ""), f = CK.field("Reason", w, { req: true, hint: "It goes in the audit log." });
      w.addEventListener("change", function () { f.setError(""); });
      CK.modal({ title: "Deactivate " + u.name, body: [CK.note(u.name + " will be signed out and cannot sign in again. Nothing is deleted: their past work stays on record, and you can reactivate the account later.", "amber"), f],
        actions: [["Cancel", "ghost"], ["Deactivate " + u.name, "danger", function (close, b, err) { if (!w.value) { f.setError("Choose a reason. It goes in the audit log."); w.focus(); return; }
          CK.busy(b, true); CK.api("POST", "/api/users/" + u.username + "/deactivate", { reason: w.value }).then(function (r) { close(); refresh(r.user); CK.toast(u.name + " is deactivated (" + w.value.toLowerCase() + "). Recorded in the audit log."); },
            function (e) { CK.busy(b, false); if (e.fields && e.fields.why) f.setError(e.fields.why); else err(e.message); }); }]] }); }
    function resetPw(u) { var P = pwBlock("New password (optional)");
      CK.modal({ title: "Reset " + first(u) + "'s password", body: [CK.note("Every place " + first(u) + " is signed in will be signed out, and a locked account is unlocked.", "blue"), P.el],
        actions: [["Cancel", "ghost"], ["Reset " + first(u) + "'s password", "primary", function (close, b, err) { var pw = P.input.value, m = pw ? pwCheck(pw) : ""; if (m) { P.field.setError(m); P.input.focus(); return; }
          CK.busy(b, true); CK.api("POST", "/api/users/" + u.username + "/reset-password", pw ? { password: pw, mustChange: P.must() } : {}).then(function (r) { close(); refresh(r.user); CK.toast(u.name + "'s password was reset and every session they had was ended."); setTimeout(function () { creds(get(u.username), r, pw); }, 240); },
            function (e) { CK.busy(b, false); if (e.fields && e.fields.pw) P.field.setError(e.fields.pw); else err(e.message); }); }]] }); }

    /* the form shared by "Add a person" and "Edit": role, limit, second factor, keys preview */
    function accessForm(D, u) {
      var self = u && u.username === ME, roleI = CK.select(roleOpts, D.role); roleI.disabled = !!self;
      var fRole = CK.field("Role", roleI, { hint: self ? "You cannot change your own role. Another administrator has to." : "One role each. The role decides which keys they hold." });
      var limI = CK.input({ mode: "numeric", value: D.limit, ph: "300000" }), fLim = CK.field("Largest loan they may approve, in pesos", limI, { req: true });
      var mfaC = CK.check("", D.mfa), mfaI = mfaC.querySelector("input"), mfaT = mfaC.querySelector("span");
      var keys = h("div.ck-urring"), out = { fRole: fRole, fLim: fLim, el: null };
      function sync() { var r = roleI.value, need = needMfa(r); D.role = r; fLim.hidden = LIMIT.indexOf(r) < 0; if (fLim.hidden) { D.limit = ""; limI.value = ""; fLim.setError(""); }
        mfaI.disabled = need; mfaI.checked = need || D.mfa; mfaT.textContent = need ? "Second factor at sign-in: on. This role requires it, so it cannot be switched off." : "Ask for a second factor at sign-in. Optional for this role.";
        var lim = !limErr(r, D.limit) ? D.limit.replace(/[^\d]/g, "") : null, was = u && u.role !== r ? KEYS[u.role] : null;
        keys.textContent = ""; keys.appendChild(h("b.ck-urringhead", (u ? "Keys " + first(u) + (u.role !== r ? " will hold" : " holds") : "Keys this person will hold") + ": " + KEYS[r].length)); keys.appendChild(keyList(KEYS[r], was, lim)); keys.appendChild(h("p.ck-sm", ringNote(r)));
        if (out.onChange) out.onChange(); }
      roleI.addEventListener("change", sync); limI.addEventListener("input", function () { D.limit = limI.value; fLim.setError(""); sync(); }); mfaI.addEventListener("change", function () { D.mfa = mfaI.checked; sync(); });
      out.el = [h("div.ck-form", fRole, fLim), mfaC, keys]; out.sync = sync; return out; }

    function edit(u) {
      var D = { role: u.role, limit: u.limit ? String(u.limit) : "", mfa: u.mfa, email: u.email || "" };
      var emI = CK.input({ type: "email", value: D.email }), fEm = CK.field("Work email", emI, { hint: /\.example$/i.test(u.email || "") ? "This is a sample address that cannot receive mail. Put in their real one so they get notices by email." : "Notices they choose to get by email go here." });
      var chg = h("div.ck-urchg"), F = accessForm(D, u);
      emI.addEventListener("input", function () { D.email = emI.value; fEm.setError(""); changes(); });
      function list() { var c = []; if (D.role !== u.role) c.push(["Role", u.roleName, ROLE[D.role]]);
        var nl = LIMIT.indexOf(D.role) >= 0 ? Number(String(D.limit).replace(/[^\d]/g, "")) || 0 : 0, ol = LIMIT.indexOf(u.role) >= 0 ? u.limit : 0; if (nl !== ol) c.push(["Approval limit", ol ? pesoSp(ol) : "none", nl ? pesoSp(nl) : "none"]);
        var nm = needMfa(D.role) || D.mfa; if (nm !== u.mfa) c.push(["Second factor at sign-in", u.mfa ? "on" : "off", nm ? "on" : "off"]);
        if (D.email.trim().toLowerCase() !== (u.email || "")) c.push(["Work email", u.email || "none", D.email.trim().toLowerCase()]); return c; }
      function changes() { var c = list(); chg.textContent = ""; if (!c.length) { chg.appendChild(h("p.ck-sm", "No changes to save.")); return; }
        chg.appendChild(h("div.ck-note.t-amber", CK.ic("edit"), h("div", h("b", "What will change"), h("ul.ck-urchglist", c.map(function (x) { return h("li", x[0] + ": ", h("s", x[1]), " becomes ", h("b", x[2])); }))))); }
      F.onChange = changes; F.sync();
      CK.modal({ title: "Edit " + u.name, wide: true, body: [h("div.ck-who", CK.av(u.name, 40), h("div", h("b", u.name), h("small", u.username + " · " + (ST[u.status] || [""])[0]))), F.el[0], F.el[1], fEm, F.el[2], chg],
        actions: [["Cancel", "ghost"], ["Save changes", "primary", function (close, b, err) { var c = list(); if (!c.length) { err("No changes to save."); return; }
          var le = limErr(D.role, D.limit); if (le) { F.fLim.setError(le); return; }
          var said = "Saved for " + u.name + ": " + c.map(function (x) { return x[0].toLowerCase() + " is now " + x[2]; }).join("; ") + ". Recorded in the audit log.";
          CK.busy(b, true); CK.api("PATCH", "/api/users/" + u.username, { role: D.role, limit: LIMIT.indexOf(D.role) >= 0 ? D.limit.replace(/[^\d]/g, "") : null, mfa: !!D.mfa, email: D.email.trim() }).then(function (r) { close(); sel = u.username; refresh(r.user);
            CK.toast(said + (D.role !== u.role ? " " + first(u) + " has to sign in again to get the new keys." : "")); },
            function (e) { CK.busy(b, false); if (e.fields && e.fields.limit) F.fLim.setError(e.fields.limit); else if (e.fields && e.fields.email) fEm.setError(e.fields.email); else err(e.message); }); }]] }); }

    function add() {
      var D = { role: "loan_processor", limit: "", mfa: false };
      var nmI = CK.input({ ph: "First and last name" }), emI = CK.input({ type: "email", ph: "name@gr8lending.example" });
      var fNm = CK.field("Full name", nmI, { req: true }), fEm = CK.field("Work email", emI, { req: true, hint: "The part before @ becomes their username." });
      nmI.addEventListener("input", function () { fNm.setError(""); }); emI.addEventListener("input", function () { fEm.setError(""); });
      var F = accessForm(D, null), P = pwBlock("Password (optional)"); F.sync();
      CK.modal({ title: "Add a person", wide: true, body: [h("p.ck-ap", "Type a password for them below, or leave it empty and CALMS makes a one-time one."), h("div.ck-form", fNm, fEm), F.el[0], F.el[1], P.el, F.el[2]],
        actions: [["Cancel", "ghost"], ["Create the account", "primary", function (close, b, err) { var ok = true, foc = null, name = nmI.value.trim(), email = emI.value.trim();
          function bad(f, i, m) { f.setError(m); ok = false; foc = foc || i; }
          if (name.length < 3) bad(fNm, nmI, "Enter their full name.");
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) bad(fEm, emI, email ? "That does not look like an email address. Example: name@gr8lending.example" : "Enter their work email.");
          else if (U.some(function (x) { return x.username === email.split("@")[0].toLowerCase(); })) bad(fEm, emI, "Someone already has that email.");
          var le = limErr(D.role, D.limit); if (le) bad(F.fLim, F.fLim.querySelector("input"), le);
          var pw = P.input.value; if (pw && pwCheck(pw)) bad(P.field, P.input, pwCheck(pw));
          if (!ok) { if (foc) foc.focus(); return; }
          CK.busy(b, true); CK.api("POST", "/api/users", { name: name, email: email, role: D.role, limit: LIMIT.indexOf(D.role) >= 0 ? D.limit.replace(/[^\d]/g, "") : null, mfa: !!D.mfa, password: pw || undefined, mustChange: P.must() }).then(function (r) {
            close(); sel = r.user.username; q = ""; st = "all"; roleF = ""; roleSel.value = ""; refresh(r.user); CK.toast(r.user.name + " was added as " + r.user.roleName + ". Recorded in the audit log.");
            setTimeout(function () { creds(r.user, r, pw); }, 240); },
            function (e) { CK.busy(b, false); var map = { nm: fNm, email: fEm, limit: F.fLim, pw: P.field, role: F.fRole }, hit = false;
              if (e.fields) Object.keys(e.fields).forEach(function (k) { if (map[k]) { map[k].setError(e.fields[k]); hit = true; } }); if (!hit) err(e.message); }); }]] }); }

    var search = CK.search("Find a person by name or role", function (v) { q = v; apply(); });
    drawStats(); drawSeg(); drawSide();
    CK.render([
      CK.head({ title: "Users and roles", sub: "Who can get into CALMS, and what each person can open. Pick someone to see or change their access.", actions: [CK.btn("Add a person", { kind: "primary", icon: "plus", on: add })] }),
      stats,
      h("div.ck-split.ck-urs",
        CK.card("People", [h("div.ck-toolbar", search, roleSel), h("div.ck-toolbar.between", seg, counts), tbl], { icon: "users" }),
        side),
      h("div.ck-in", CK.note("For everyone: a session ends after 15 minutes without activity, and anyone who can approve loans, release money or change settings must sign in with a second factor. These rules are set on the Products and rules page, not here. Every change on this page is written to the audit log with your name.", "grey", "info"))
    ]);
    apply();
    var asked = CK.q("u"); if (asked && get(asked)) pick(asked, true);   /* opened from quick search: that person, already picked */
  }, function (e) { CK.error(e); });
})();
