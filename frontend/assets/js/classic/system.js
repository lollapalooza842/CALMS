/* System, classic: whether the services CALMS depends on are answering, the jobs that run by themselves, the wording of the messages it sends, and the company letterhead. */
(function () {
  var h = CK.h, SW = { ok: ["Working", "green"], slow: ["Slow", "amber"], down: ["Down", "red"], off: ["Not connected", "grey"] };
  var SAMPLE = { first_name: "Norma", application_no: "APP-2026-0409", account_no: "LN-2026-0163", due_date: "November 7", agent_name: "Jun Espiritu", branch_phone: "(044) 555 0142" }, BLOCK = ["{amount}", "{balance}", "{finscore}", "{income}"];
  var IC = { db: "server", seal: "shield", bureau: "chart", files: "doc", email: "mail", sms: "phone" };
  function nowT() { return new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }) + " PST"; }
  function fillT(t) { return t.replace(/\{(\w+)\}/g, function (m, k) { return SAMPLE[k] || m; }); }
  function tErr(t) { var low = t.sms_t.toLowerCase(), hit = BLOCK.filter(function (b) { return low.indexOf(b) > -1; }); if (hit.length || /₱|php\s*\d/i.test(t.sms_t)) return "Amounts, balances and credit details cannot go in a text or email. Tell them to call or ask their agent instead.";
    if (t.sms_t.trim().length < 20) return "Write the message, at least 20 characters."; var un = (t.sms_t.match(/\{\w+\}/g) || []).filter(function (m) { return !SAMPLE[m.slice(1, -1)]; });
    if (un.length) return un[0] + " is not a blank CALMS can fill in. Use the buttons above the box."; if (fillT(t.sms_t).length > 320) return "Too long: over two texts. Keep it under 320 characters."; return ""; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function tab0() { try { return sessionStorage.getItem("ck-system-tab") || "health"; } catch (e) { return "health"; } }

  CK.loading();
  Promise.all([CK.api("GET", "/api/system/health"), CK.api("GET", "/api/templates")]).then(function (r) {
    var H = r[0], TP = r[1].templates, saved = clone(TP), tab = tab0(), checked = nowT(), sel = null, tsel = TP[0] && TP[0].id, busy = false;
    var SV = H.services; sel = (SV.filter(function (s) { return s.st === "down" || s.st === "slow"; })[0] || SV[0]).id;
    function mailOn() { var m = SV.filter(function (s) { return s.id === "email"; })[0]; return !!(m && m.st !== "off"); }
    var pane = h("div.ck-stack"), SUB = { health: "Whether the outside services CALMS depends on are answering, and whether the jobs that run by themselves ran.", msg: "The wording of the messages CALMS sends to borrowers and staff. Pick one to edit it.", company: "The company details printed at the top of every statement, clearance, credit memo and report for the regulator." };
    var sub = h("p.ck-sub", "");   /* no guide text */
    var chk = CK.btn("Check all again", { kind: "ghost", icon: "refresh", on: function () { ring(null, chk); } });

    /* ---- health ---- */
    function ms(s) { return s.st === "off" ? "" : s.ms ? (s.ms >= 1000 ? (s.ms / 1000).toFixed(1) + " s" : s.ms + " ms") : "at once"; }
    function strip(s, big) { var w = h("div.ck-svstrip" + (big ? ".big" : ""), { role: "img" }), c = { ok: 0, slow: 0, down: 0, none: 0 };
      s.strip.forEach(function (x, i) { var k = x === "off" ? "off" : x || "none"; c[k === "off" ? "ok" : k]++; w.appendChild(h("i." + k, { style: { "--i": i }, title: (23 - i) + " h ago: " + (k === "none" ? "not checked" : (SW[k] || [k])[0].toLowerCase()) })); });
      w.setAttribute("aria-label", "Last 24 hours: working for " + c.ok + ", slow for " + c.slow + ", down for " + c.down + ", not checked for " + c.none + "."); return w; }
    function summary() { var bad = SV.filter(function (s) { return s.st === "down" || s.st === "slow"; }), off = SV.filter(function (s) { return s.st === "off"; });
      if (busy) return CK.note("Ringing each one…", "blue", "refresh");
      if (!bad.length) return CK.note(h("span", h("b", (SV.length - off.length) + " of " + SV.length + " lines are answering. Nothing needs you. "), off.length ? off.map(function (s) { return s.nm; }).join(" and ") + (off.length === 1 ? " is" : " are") + " not connected in this project." : ""), "green", "check");
      return CK.note(h("span", h("b", bad.map(function (s) { return s.nm + " is " + SW[s.st][0].toLowerCase(); }).join(", ") + ". "), "Everything else is answering."), bad.some(function (s) { return s.st === "down"; }) ? "red" : "amber"); }
    function lines() { return h("div.ck-svlines", SV.map(function (s, i) { var on = s.id === sel;
      return h("button.ck-svline" + (on ? ".is-sel" : ""), { type: "button", "aria-pressed": String(on), on: { click: function () { sel = s.id; upHealth(); if (matchMedia("(max-width: 1180px)").matches) { var d = document.querySelector(".ck-sysdet"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" }); } } } },
        h("span.ck-svlamp.t-" + SW[s.st][1], CK.ic(IC[s.id] || "server")), h("div.grow", h("b", s.nm), h("small", busy ? "Checking…" : SW[s.st][0] + (ms(s) ? " · answers " + (s.ms ? "in " : "") + ms(s) : ""))), strip(s), CK.pill(busy ? "…" : SW[s.st][0], busy ? "grey" : SW[s.st][1])); })); }
    function detail() { var s = SV.filter(function (x) { return x.id === sel; })[0];
      var dl = CK.dl([["What it does", s.does], ["If it fails", s.fall], s.st === "off" ? ["Status", "Not connected in this project"] : ["Answers in", s.ms ? s.ms + " milliseconds" : "at once (it runs inside CALMS)"], s.detail && s.st === "ok" ? ["Now", s.detail] : null, ["Last problem", s.err || (s.detail && s.st !== "ok" && s.st !== "off" ? s.detail : "") || "None in the last 7 days"]], "one");
      var t = s.st === "off" ? null : CK.btn("Test this line", { kind: "soft", icon: "refresh" }); if (t) t.addEventListener("click", function () { ring(s.id, t); });
      return CK.card(s.nm, [h("div.ck-toolbar", CK.pill(SW[s.st][0], SW[s.st][1])), strip(s, true), h("p.ck-sm", s.st === "off" ? "Not connected, so there is nothing to ring." : "Last 24 hours, oldest on the left. Green is working, amber is slow, red is down, pale means nobody checked that hour (a check runs whenever this page opens)."), dl, t ? h("div.ck-actions", t) : null],
        { icon: IC[s.id] || "server", cls: "ck-panelin.ck-sysdet" }); }
    function ring(id, btn) { if (busy) return; busy = true; CK.busy(btn, true); upHealth(); var t0 = Date.now();
      CK.api("GET", "/api/system/health?save=1").then(function (x) { setTimeout(function () { busy = false; CK.busy(btn, false); H = x; SV = x.services; checked = nowT(); upHealth(true);
        if (id) { var s = SV.filter(function (v) { return v.id === id; })[0]; CK.toast(s.nm + (s.st === "ok" ? " answered" + (s.ms ? " in " + s.ms + " milliseconds." : " at once.") : s.st === "down" ? " is not answering. " + (s.err || "") : " answered, slowly."), s.st === "ok" ? "green" : "red"); }
        else { var b2 = SV.filter(function (s) { return s.st === "down" || s.st === "slow"; }); CK.toast(b2.length ? "Checked them all. " + b2.map(function (s) { return s.nm + " is " + SW[s.st][0].toLowerCase(); }).join(", ") + "." : "Checked them all. Every connected line answered.", b2.length ? "red" : "green"); } }, Math.max(0, 600 - (Date.now() - t0))); },
        function (e) { busy = false; CK.busy(btn, false); upHealth(); CK.toast("The check could not run: " + e.message, "red"); }); }
    function jobs() { return h("div.ck-tasks", H.jobs.map(function (j) { var b = CK.btn("Run now", { kind: "soft", icon: "next", aria: "Run now: " + j.nm }); b.classList.add("ck-sm");
      b.addEventListener("click", function () { CK.busy(b, true); CK.api("POST", "/api/system/jobs/" + j.id).then(function (d) { CK.busy(b, false); H.jobs = d.jobs; upHealth(true); CK.toast("“" + j.nm + "” ran: " + d.result + ". Recorded in the audit log."); }, function (e) { CK.busy(b, false); CK.fail(e); }); });
      return h("div.ck-task", h("span.n", CK.ic("clock")), h("div.grow", h("b", j.nm), h("small", j.when + " · " + j.last)), b); })); }
    var HB = {};
    function slot(el, kid) { el.textContent = ""; el.appendChild(kid); }
    function upHealth(all) { if (!HB.board) return; slot(HB.sum, summary()); slot(HB.lines, lines()); HB.when.textContent = "Last checked " + checked; slot(HB.det, detail()); if (all) { slot(HB.jobs, jobs()); slot(HB.stats, stats()); } }
    function stats() { var c = H.counts || {}; return h("div.ck-stats", { style: { "--cols": 4 } }, CK.stat("Active users", CK.num(c.users), { icon: "users", tone: "brand" }), CK.stat("Applications", CK.num(c.apps), { icon: "file", tone: "blue" }), CK.stat("Loan accounts", CK.num(c.accounts), { icon: "wallet", tone: "green" }), CK.stat("Audit entries", CK.num(c.audit), { icon: "shield", tone: "violet", sub: "each sealed to the one before" })); }
    function health() { HB = { sum: h("div"), lines: h("div"), when: h("span.ck-sm"), det: h("div.ck-sticky"), jobs: h("div"), stats: h("div.ck-in") };
      slot(HB.stats, stats()); slot(HB.sum, summary()); slot(HB.lines, lines()); HB.when.textContent = "Last checked " + checked; slot(HB.det, detail()); slot(HB.jobs, jobs());
      return [HB.stats, h("div.ck-split",
          h("div.ck-stack", CK.card("Signal board", [HB.sum, HB.lines, h("div.ck-toolbar.between", HB.when, chk)], { icon: "server" }),
            CK.card("Jobs that run by themselves", HB.jobs, { icon: "clock" })),
          HB.det)]; }

    /* ---- messages ---- */
    var MB = {};
    function messages() { MB = { list: h("div"), edit: h("div.ck-tpedit") }; upMsg(); return [h("div.ck-grid.ck-tpwrap.ck-in", CK.card("Messages CALMS sends", MB.list, { icon: "mail" }), MB.edit)]; }
    function upMsg() { var r = msgParts(); slot(MB.list, r[0]); slot(MB.edit, r[1]); }
    function msgParts() { var t = TP.filter(function (x) { return x.id === tsel; })[0], base = saved.filter(function (x) { return x.id === tsel; })[0];
      var list = h("div.ck-picklist.ck-tplist", TP.map(function (x) { var dirty = JSON.stringify(x) !== JSON.stringify(saved.filter(function (y) { return y.id === x.id; })[0]);
        return h("button.ck-pick" + (x.id === tsel ? ".is-sel" : ""), { type: "button", on: { click: function () { tsel = x.id; upMsg(); if (matchMedia("(max-width: 1180px)").matches) { var e = document.querySelector(".ck-tpedit"); if (e) e.scrollIntoView({ behavior: "smooth", block: "start" }); } } } },
          h("span.ck-filetile", CK.ic(x.to === "Staff" ? "users" : "mail")), h("div.grow", h("b", x.nm), h("small", "To the " + x.to.toLowerCase() + (x.mand ? " · always sent" : " · can be switched off"))), dirty ? CK.pill("Edited", "amber") : null); }));
      /* the editor */
      var by = h("div.ck-achecks", [["email", "Email"], ["sms", "Text message"], ["app", "Inside CALMS"]].map(function (x) { var no = x[0] === "app" && t.to === "Borrower", c = CK.check(x[1] + (no ? " (borrowers have no CALMS account)" : ""), !!t[x[0]], { disabled: no });
        if (no) c.classList.add("is-off"); c.querySelector("input").addEventListener("change", function (e) { t[x[0]] = e.target.checked ? 1 : 0; foot(); }); return c; }));
      var subI = CK.input({ value: t.sub }), fSub = CK.field("Email subject", subI); subI.addEventListener("input", function () { t.sub = subI.value; fSub.setError(""); foot(); });
      var ta = CK.textarea(t.sms_t); ta.rows = 5; var fBody = CK.field("The message", ta, { hint: "The same words go out by text and as the body of the email. Never put an amount, a balance or a score here." });
      var toks = h("div.ck-tptoks", h("span.ck-sm", "Add a blank:"), Object.keys(SAMPLE).map(function (k) { return h("button.ck-tptok", { type: "button", "aria-label": "Add the blank " + k.replace("_", " "), on: { click: function () { var s = ta.selectionStart, e = ta.selectionEnd; ta.value = ta.value.slice(0, s) + "{" + k + "}" + ta.value.slice(e); t.sms_t = ta.value; ta.focus(); ta.selectionStart = ta.selectionEnd = s + k.length + 2; prev(); } } }, "{" + k + "}"); }));
      fBody.insertBefore(toks, ta);
      var bub = h("div.ck-tpbubble"), ct = h("small.ck-sm"), F = h("div.ck-tpfoot");
      var phone = h("div.ck-tpphone", h("div.ck-tpphonehd", CK.ic("phone"), "What " + (t.to === "Borrower" ? "Norma" : "the officer") + " sees"), h("div.ck-tpphonebody", bub), ct);
      function prev() { var e = tErr(t), tx = fillT(t.sms_t); bub.textContent = tx || " "; ct.textContent = tx.length + " characters · " + (tx.length <= 160 ? "1 text" : "2 texts"); fBody.setError(e); foot(); }
      ta.addEventListener("input", function () { t.sms_t = ta.value; prev(); });
      var toI = null;
      function foot() { var dirty = JSON.stringify(t) !== JSON.stringify(base); F.textContent = "";
        var sv = CK.btn("Save this message", { kind: "primary", icon: "check", disabled: !dirty }), ts = CK.btn(mailOn() ? "Send a test" : "Send a test to myself", { kind: "soft", icon: "send" }), un = dirty ? CK.btn("Undo my edits", { kind: "ghost", icon: "refresh" }) : null;
        sv.addEventListener("click", function () { var e = tErr(t); if (e) { fBody.setError(e); ta.focus(); CK.toast("Not saved. " + e, "red"); return; } if (!t.email && !t.sms && !t.app) { CK.toast("Not saved. Choose at least one way to send it.", "red"); return; }
          CK.busy(sv, true); CK.api("PUT", "/api/templates/" + t.id, t).then(function (d) { var i = TP.indexOf(t); TP[i] = d.template; saved[i] = clone(d.template); upMsg(); CK.toast("“" + t.nm + "” saved. It is used from the next message on. Recorded in the audit log."); },
            function (e) { CK.busy(sv, false); if (/subject/i.test(e.message)) fSub.setError(e.message); CK.toast("Not saved. " + e.message, "red"); }); });
        ts.addEventListener("click", function () { var e = tErr(t); if (e) { fBody.setError(e); CK.toast("Fix the message first. " + e, "red"); return; }
          if (!mailOn()) { CK.modal({ title: "A test of “" + t.nm + "”", body: [CK.note("Email and text are not connected, so nothing was sent. With sample details filled in, the test would read:", "blue"), h("div.ck-tpphone.flat", h("div.ck-tpphonebody", h("div.ck-tpbubble", fillT(t.sms_t))))], actions: [["Close", "primary"]] }); return; }
          CK.busy(ts, true); CK.api("POST", "/api/templates/" + t.id + "/test", { sub: t.sub, sms_t: t.sms_t, to: toI ? toI.value.trim() : "" }).then(function (d) { CK.busy(ts, false); CK.toast("A test of “" + t.nm + "” was emailed to " + d.to + ", with sample details filled in. Texts are not connected, so no SMS was sent."); }, function (er) { CK.busy(ts, false); CK.fail(er); }); });
        if (un) un.addEventListener("click", function () { var i = TP.indexOf(t); TP[i] = clone(saved[i]); upMsg(); CK.toast("Edits undone.", "blue"); });
        if (mailOn()) { if (!toI) { toI = CK.input({ type: "email", ph: "Leave empty for the CALMS mailbox", ac: "email" }); try { toI.value = localStorage.getItem("calms-test-to") || ""; } catch (x) {} toI.addEventListener("input", function () { try { localStorage.setItem("calms-test-to", toI.value.trim()); } catch (x) {} }); }
          F.appendChild(CK.field("Send the test to", toI)); }
        F.appendChild(h("div.ck-actions", sv, ts, un)); }
      var editor = CK.card(t.nm, [h("p.ck-ap", "Sent to the " + t.to.toLowerCase() + (t.mand ? ". This one is always sent; nobody can switch it off." : ". People can switch this one off in their own settings.") + (t.to === "Borrower" ? " The sales agent is told too, in case the borrower has no phone or email." : "")),
        h("div.ck-field", h("label", "Sent by"), by), h("div.ck-tpgrid", h("div.ck-stack.ck-atight", fSub, fBody), phone), F], { icon: "edit", cls: "ck-panelin" });
      prev();
      editor.classList.remove("ck-in"); return [list, editor]; }

    /* ---- company ---- */
    var CO = null, CF = [["name", "Registered name"], ["address", "Address"], ["secNo", "SEC registration number"], ["caNo", "Certificate of Authority number"], ["phone", "Phone"], ["email", "Email"]];
    function company() { var body = h("div.ck-stack"), prevBox = h("div.ck-coletter", h("p.ck-sm", "Loading…"));
      function fill() { body.textContent = ""; var ins = {}, fs = {};
        function preview() { var v = function (k) { return ins[k].value.trim(); }; prevBox.textContent = "";
          prevBox.appendChild(h("b", v("name") || "Registered name")); prevBox.appendChild(h("p.ck-sm", v("address") || "Address"));
          prevBox.appendChild(h("p.ck-sm", ["SEC Reg. No. " + (v("secNo") || "–"), "C.A. No. " + (v("caNo") || "–")].join(" · ")));
          var c = [v("phone"), v("email")].filter(Boolean).join(" · "); if (c) prevBox.appendChild(h("p.ck-sm", c)); }
        var form = h("div.ck-form", CF.map(function (x) { var i = CK.input({ value: CO.company[x[0]] || "", type: x[0] === "email" ? "email" : "text" }); ins[x[0]] = i; fs[x[0]] = CK.field(x[1], i, { req: x[0] === "name", wide: x[0] === "address" || x[0] === "name" }); i.addEventListener("input", function () { fs[x[0]].setError(""); preview(); }); if (!CO.canEdit) i.disabled = true; return fs[x[0]]; }));
        var sv = CK.btn("Save the company details", { kind: "primary", icon: "check" });
        sv.addEventListener("click", function () { var b = {}; CF.forEach(function (x) { b[x[0]] = ins[x[0]].value; }); if (b.name.trim().length < 3) { fs.name.setError("Enter the company's registered name."); ins.name.focus(); return; }
          CK.busy(sv, true); CK.api("PUT", "/api/settings/company", b).then(function (d) { CK.busy(sv, false); CO.company = d.company; CK.toast("Company details saved. Every paper printed from now on carries them. Recorded in the audit log."); }, function (e) { CK.busy(sv, false); if (e.status === 400) fs.name.setError(e.message); else CK.fail(e); }); });
        preview(); body.appendChild(form); if (CO.canEdit) body.appendChild(h("div.ck-actions", sv)); }
      if (CO) fill(); else { body.appendChild(CK.skel(5)); CK.api("GET", "/api/settings/company").then(function (d) { CO = d; fill(); }, function (e) { body.textContent = ""; body.appendChild(CK.note(e.message, "red")); }); }
      var c = CO || { company: {} };
      return [h("div.ck-grid.side.ck-in", CK.card("Company details", [h("p.ck-ap", "Fill in the registration numbers exactly as they appear on your SEC certificates. Changes apply to papers printed from now on; papers already issued keep what they were printed with."), body], { icon: "bank" }),
        CK.card("On every paper", [h("p.ck-ap", "This prints at the top of statements, clearances, credit memos and regulatory reports."), prevBox], { icon: "file" }))]; }

    /* ---- tabs ---- */
    function draw() { pane.textContent = ""; sub.textContent = "";
      (tab === "health" ? health() : tab === "msg" ? messages() : company()).forEach(function (k) { pane.appendChild(k); });
      CK.stagger(pane); }
    var tabs = CK.tabs([["health", "Health"], ["msg", "Messages"], ["company", "Company"]], tab, function (v) { tab = v; try { sessionStorage.setItem("ck-system-tab", v); } catch (e) {} pane.classList.remove("ck-afade"); void pane.offsetWidth; pane.classList.add("ck-afade"); draw(); });
    var head = CK.head({ title: "System", sub: "", actions: [tabs] }); head.querySelector(".ck-sub") ? null : head.querySelector(".ck-headrow > div").appendChild(sub);
    draw();
    CK.render([head, pane, h("div.ck-in", CK.note("Changes here are written to the audit log with your name. " + (mailOn() ? "Email is connected; SMS is not." : "Email and SMS are not connected (see the Email line for how to connect email).") + " Backups are made by Supabase every night.", "grey", "info"))]);
  }, function (e) { CK.error(e); });
})();
