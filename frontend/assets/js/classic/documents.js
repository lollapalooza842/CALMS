/* Documents and checklist, classic: every paper the product needs, what is on file (with every version kept), filing and replacing papers, and reading them. */
(function () {
  var h = CK.h, ref = CK.q("ref"); if (!ref) return;
  function quiet() { var n = 0, t = setInterval(function () { var d = document.getElementById("calmsDown"); if (d) d.remove(); document.body.classList.remove("calms-down"); if (++n > 25) clearInterval(t); }, 200); }
  var DESC = { consent: "Credit investigation and data processing", id: "Front and back, readable", reg: "Certificate in the business name", fs: "Latest full year", addr: "Utility bill, last 3 months", permit: "Current year, mayor's permit",
    bank: "Latest 3 months", pay: "Latest 2 pay periods", coe: "Dated within 30 days", income: "Pay stub or proof of business income" };
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB"; }
  function lc(t) { return t.replace(/^(\w)(?=[a-z])/, function (m) { return m.toLowerCase(); }); }
  function phone() { return matchMedia("(max-width: 600px)").matches; }
  CK.loading();
  Promise.all([CK.api("GET", "/api/applications/" + encodeURIComponent(ref)), CK.api("GET", "/api/auth/me")]).then(function (r) { start(r[0].application, r[1].user || {}); }, function (e) { if (e && e.status === 401) return; quiet(); CK.error(e, "applications.html"); });

  function start(A, ME) {
    var CAN = (ME.role === "loan_processor" || ME.role === "sales_agent") && (A.status === "draft" || A.status === "submitted");
    var slots = A.checklist.map(function (c) { return { id: c.slot, label: c.label, desc: DESC[c.slot] || "", v: A.documents.filter(function (d) { return d.slot === c.slot; }).sort(function (x, y) { return x.version - y.version; }) }; });
    var drawn = false, open = null, openV = 0, errs = {}, busy = {}, fresh = null, looked = [], kept = {};
    var list = h("ul.ck-slots"), tally = h("div"), viewer = h("div.ck-stack"), goBtn = null;
    function slot(id) { return slots.filter(function (s) { return s.id === id; })[0]; }
    function missing() { return slots.filter(function (s) { return !s.v.length; }); }

    /* ---- filing a paper (the same checks as the western page; the server checks again) ---- */
    function file(s, f) {
      delete errs[s.id]; if (!CAN) return;
      if (!/\.(pdf|jpe?g|png)$/i.test(f.name)) { errs[s.id] = "Not filed. “" + f.name + "” is not a PDF, JPG or PNG."; drawList(); return; }
      if (f.size > 10 * 1048576) { errs[s.id] = "Not filed. " + size(f.size) + " is over the 10 MB limit. Rescan it smaller."; drawList(); return; }
      var had = s.v.length; busy[s.id] = f.name; drawList();
      var rd = new FileReader();
      rd.onerror = function () { delete busy[s.id]; errs[s.id] = "Not filed. The file could not be read."; drawList(); };
      rd.onload = function () {
        CK.api("POST", "/api/applications/" + A.reference + "/documents", { slot: s.id, file: { name: f.name, data: String(rd.result).split(",")[1] || "" } },
          { offline: { kind: "doc", label: s.label + " · " + A.borrower.name, sub: A.reference + " · " + f.name } }).then(function (r) {
          delete busy[s.id];
          if (r.queued) { kept[s.id] = f.name; CK.toast(s.label + ": saved on this computer. It is filed when the connection is back.", "amber"); drawList(); return; }   /* offline (offline.js) */
          delete kept[s.id]; s.v.push(r.document); fresh = s.id;
          CK.toast(s.label + (had ? ": version " + s.v.length + " filed. Version " + had + " is kept as superseded." : ": filed and linked to " + A.reference + "."));
          drawAll(); view(s.id, s.v.length - 1);
        }, function (e) { delete busy[s.id]; if (e && e.status === 401) return; errs[s.id] = "Not filed. " + e.message; drawList(); });
      };
      rd.readAsDataURL(f);
    }

    /* ---- the checklist ---- */
    function drawList() {
      list.textContent = "";
      slots.forEach(function (s, i) {
        var cur = s.v[s.v.length - 1], inp = h("input.ck-hidefile", { type: "file", accept: ".pdf,.jpg,.jpeg,.png", "aria-label": "Add file for " + s.label });
        inp.addEventListener("change", function () { if (inp.files[0]) file(s, inp.files[0]); inp.value = ""; });
        var tools = h("div.ck-row-end");
        if (cur) tools.appendChild(CK.btn("View", { kind: "ghost", icon: "eye", on: function () { view(s.id, s.v.length - 1); if (phone()) viewer.scrollIntoView({ behavior: "smooth", block: "start" }); } }));
        if (CAN) tools.appendChild(CK.btn(cur ? "Replace" : "Choose file", { kind: cur ? "ghost" : "soft", icon: "upload", on: function () { inp.click(); } }));
        else if (!cur) tools.appendChild(CK.pill("Missing", "red"));
        var meta = busy[s.id] ? "Filing " + busy[s.id] + "…" : cur ? cur.name + " · " + size(cur.size) + " · " + cur.by + " · " + CK.dt(cur.at) : CAN ? s.desc + ". Choose the file or drop it here." : s.desc + ". Not yet on file.";
        var li = h("li.ck-slot" + (drawn ? "" : ".ck-rowin") + (cur ? ".is-click" : ".is-miss") + (open === s.id ? ".is-sel" : "") + (busy[s.id] ? ".is-busy" : "") + (fresh === s.id ? ".is-new" : ""), { style: { "--i": i } },
          h("span.ck-filetile" + (cur ? ".ok" : ".miss"), CK.ic(cur ? "doc" : busy[s.id] ? "upload" : "alert")),
          h("div.grow", h("b", s.label, cur ? h("span.ck-vtag", "v" + s.v.length) : null), h("small", meta)), tools, inp,
          errs[s.id] ? h("p.ck-err", { role: "alert" }, errs[s.id]) : kept[s.id] ? h("p.ck-hint", "Saved on this computer: " + kept[s.id] + ". Filed when the connection is back.") : null);
        if (cur) li.addEventListener("click", function (e) { if (e.target.closest("button, a, input")) return; view(s.id, s.v.length - 1); if (phone()) viewer.scrollIntoView({ behavior: "smooth", block: "start" }); });
        if (CAN) { li.addEventListener("dragover", function (e) { e.preventDefault(); li.classList.add("is-over"); }); li.addEventListener("dragleave", function () { li.classList.remove("is-over"); });
          li.addEventListener("drop", function (e) { e.preventDefault(); li.classList.remove("is-over"); var f = e.dataTransfer.files[0]; if (f) file(s, f); }); }
        list.appendChild(li);
      });
      fresh = null; drawn = true;
    }
    function drawTally() {
      var have = slots.length - missing().length, miss = missing().map(function (s) { return lc(s.label); }), all = !miss.length;
      tally.textContent = "";
      tally.appendChild(h("div.ck-docbar", h("span.ck-count", have, h("small", "of " + slots.length + " on file")),
        h("div.grow", CK.meter(have, slots.length || 1, all ? "green" : "amber"), h("span.ck-sm", all ? "Checklist complete. Every required paper is on file." : "Still needed: " + miss.join(", ") + ". The application cannot go on to encoding and verification until every required paper is on file."))));
      if (goBtn) goBtn.classList.toggle("ck-dim", !all);
    }
    function drawAll() { drawList(); drawTally(); }

    /* ---- reading a paper ---- */
    function view(id, vi) {
      var s = slot(id); if (!s || !s.v.length) return; open = id; openV = vi; var d = s.v[vi], last = vi === s.v.length - 1, src = "/api/applications/" + A.reference + "/documents/" + d.id;
      [].forEach.call(list.children, function (li, i) { li.classList.toggle("is-sel", slots[i].id === id); });
      var lamp = h("div.ck-lamp.ck-fade");
      if (/^image\//.test(d.type)) lamp.appendChild(h("img", { src: src, alt: s.label + ", " + d.name }));
      else if (phone()) lamp.appendChild(h("div.ck-lampmsg", h("span.ck-filetile", CK.ic("doc")), h("b", d.name), h("span.ck-sm", "Phones cannot show a PDF inside the page."), CK.btn("Open the paper", { kind: "primary", icon: "eye", href: src })));
      else lamp.appendChild(h("iframe", { src: src, title: s.label + ", " + d.name }));
      var a = lamp.querySelector("a"); if (a) { a.target = "_blank"; a.rel = "noopener"; }
      log("viewed", s, d, vi);
      var vers = s.v.length > 1 ? h("div.ck-stack.ck-tight", h("b.ck-strong", "Versions"), h("ul.ck-vers", s.v.map(function (x, i) { var lastI = i === s.v.length - 1;
        return h("li", h("button", { type: "button", "aria-pressed": String(i === vi), on: { click: function () { view(id, i); } } }, h("span.ck-vtag", "v" + (i + 1)), h("span.grow", lastI ? x.name : h("s", x.name)), h("span.ck-sm", lastI ? "current" : CK.dt(x.at)))); })),
        h("p.ck-hint", "Superseded versions stay on file and can still be read.")) : h("p.ck-hint", "One version on file.");
      var openBtn; openBtn = CK.btn("Open", { kind: "ghost", icon: "eye", title: "Open in a new tab", on: function () { window.open(src, "_blank", "noopener"); log("opened", s, d, vi); } });
      viewer.textContent = "";
      viewer.appendChild(h("section.ck-card.ck-viewer.ck-panelin", h("div.ck-cardhead", h("h2", CK.ic("doc"), s.label), openBtn),
        h("div.ck-cardbody", lamp,
          CK.dl([["File", d.name], ["Version", "v" + (vi + 1) + (last ? ", current" : ", superseded")], ["Size", size(d.size)], ["Filed", CK.dt(d.at) + " by " + d.by],
            ["Storage", "In the CALMS database, encrypted at rest. Linked to " + A.reference], ["Link", "Every opening is written to the audit log"]], "rows"),
          vers, looked.length ? h("div.ck-stack.ck-tight", h("b.ck-strong", "Looked at, this session"), h("ul.ck-looked", looked.slice(0, 6).map(function (t) { return h("li", t); }))) : null)));
    }
    function log(what, s, d, vi) { looked.unshift(new Date().toLocaleTimeString("en-PH", { hour12: false }) + " · " + (ME.shortName || "You") + " " + what + " " + d.name + " (v" + (vi + 1) + ") · logged"); }
    function empty() { viewer.textContent = ""; viewer.appendChild(CK.card(null, CK.empty("Nothing open yet", "Pick a paper from the list to read it here.", "doc"), { cls: "ck-viewer" })); }

    /* ---- on to encoding: only when every hole is full ---- */
    goBtn = CAN ? CK.btn("Send to Encode and verify", { kind: "primary", icon: "next", on: function () { var m = missing();
      if (m.length) { CK.toast("Not yet. " + m.length + " required paper" + (m.length > 1 ? "s are" : " is") + " still missing: " + m.map(function (s) { return lc(s.label); }).join(", ") + ".", "red"); return; }
      CK.go("encode-verify.html?ref=" + A.reference); } }) : null;
    var note = !CAN ? CK.note(ME.role === "loan_processor" || ME.role === "sales_agent" ? "Papers can only be filed before the application goes to review. You may still read them." : "You may read. Only the loan processor files papers.", "blue", "lock") : null;
    CK.render([
      CK.head({ crumbs: [["Applications", "applications.html"], [A.reference, "application-detail.html?ref=" + A.reference], ["Documents"]], title: "Documents and checklist", status: CK.status(A.status),
        sub: A.borrower.name + " · " + A.product + " · " + A.reference, actions: [goBtn] }),
      CK.card(null, tally, { cls: "ck-tallycard" }),
      note,
      h("div.ck-split", CK.card("Required papers", [list, CAN ? h("p.ck-hint", "Accepted: PDF, JPG, PNG, up to 10 MB each. Replacing a paper keeps the old version; nothing is ever deleted.") : null], { icon: "list" }), h("div.ck-sticky", viewer))
    ]);
    drawAll();
    var first = slots.filter(function (s) { return s.v.length; })[0]; if (first && !phone()) view(first.id, first.v.length - 1); else empty();
  }
})();
