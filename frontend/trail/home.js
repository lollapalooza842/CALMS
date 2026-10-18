/* My trail (DRAFT): the sample borrower's loan, drawn with the same arithmetic as CALMS (lib/loans.js schedule). */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var peso = function (n) { return "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var R = function (n) { return Math.round(n * 100) / 100; };
  var LOAN = { amount: 60000, term: 12, rate: 0.018, released: "2026-06-05", paid: [["2026-07-04", "GCash"], ["2026-08-05", "Cash at the branch"], ["2026-09-12", "GCash"], ["2026-10-03", "Bank deposit"]] };
  var m = LOAN.amount * LOAN.rate / (1 - Math.pow(1 + LOAN.rate, -LOAN.term)), bal = LOAN.amount, rows = [], d0 = new Date(LOAN.released + "T00:00:00");
  for (var n = 1; n <= LOAN.term; n++) {
    var due = new Date(d0.getFullYear(), d0.getMonth() + n, Math.min(d0.getDate(), 28)), interest = R(bal * LOAN.rate), principal = n === LOAN.term ? R(bal) : R(m - interest);
    bal = R(bal - principal); rows.push({ n: n, due: due, principal: principal, interest: interest, amt: R(principal + interest), bal: bal });
  }
  var paidN = LOAN.paid.length, next = rows[paidN], fmt = function (d) { return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }); };
  var days = Math.ceil((next.due - new Date(new Date().toDateString())) / 864e5);
  $("#hNext").textContent = peso(next.amt); $("#hDue").textContent = fmt(next.due); $("#hIn").textContent = days > 1 ? "in " + days + " days" : days === 1 ? "tomorrow" : days === 0 ? "today" : Math.abs(days) + " days late";
  var fence = $("#hFence"); rows.forEach(function (r, i) { var f = document.createElement("i"); f.className = i < paidN ? "paid" : i === paidN ? "next" : ""; fence.appendChild(f); });
  $("#hPaid").textContent = paidN + " of " + LOAN.term + " payments made · " + (LOAN.term - paidN) + " to go";
  $("#hBal").textContent = peso(rows[paidN - 1].bal); $("#hSoFar").textContent = peso(rows.slice(0, paidN).reduce(function (s, r) { return s + r.amt; }, 0));
  var tb = $("#hSched");
  rows.forEach(function (r, i) {
    var tr = document.createElement("tr"), late = i < paidN && new Date(LOAN.paid[i][0] + "T00:00:00") > r.due;
    tr.className = i === paidN ? "next" : "";
    var st = i < paidN ? (late ? '<span class="stamp amber">Paid late</span>' : '<span class="stamp green">Paid</span>') : i === paidN ? '<span class="stamp">Next</span>' : '<span style="color:var(--ink-3);font-family:var(--body)">Coming</span>';
    tr.innerHTML = "<td>" + r.n + "</td><td>" + fmt(r.due) + '</td><td class="r hide-sm">' + peso(r.principal) + '</td><td class="r hide-sm">' + peso(r.interest) + '</td><td class="r"><b>' + peso(r.amt) + "</b></td><td>" + st + "</td>";
    tb.appendChild(tr);
  });
  var ul = $("#hRcpt");
  LOAN.paid.slice().reverse().forEach(function (p, j) { var i = paidN - 1 - j, li = document.createElement("li");
    li.innerHTML = '<span><b>OR-2026-' + (5120 + i * 37) + "</b><small>" + fmt(new Date(p[0] + "T00:00:00")) + " · " + p[1] + " · payment " + (i + 1) + ' of 12</small></span><span class="r">' + peso(rows[i].amt + (i === 2 ? R(rows[i].amt * 0.03) : 0)) + (i === 2 ? '<small style="font-family:var(--body);font-weight:400">incl. ₱' + R(rows[i].amt * 0.03).toFixed(2) + " late penalty</small>" : "") + '</span><a class="btn sm paper" href="#" style="margin-left:14px">PDF</a>';
    ul.appendChild(li); });
})();
