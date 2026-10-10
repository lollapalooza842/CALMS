// A stand-in for the FinScore credit bureau. The real bureau is not available to this project,
// so the report is made up, but always the same for the same borrower (seeded by name and ID),
// and its monthly payments add up to the debts the borrower declared.
const crypto = require("crypto");

const CREDITORS = [["BDO Unibank", "Credit card"], ["Metrobank", "Credit card"], ["Toyota Financial Services", "Auto loan"], ["Malolos Credit Cooperative", "Personal loan"],
  ["Home Credit", "Appliance loan"], ["Globe Telecom", "Postpaid plan"], ["Pag-IBIG Fund", "Housing loan"], ["SSS", "Salary loan"], ["BPI", "Personal loan"]];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function report(borrower, declaredDebts) {
  const seed = crypto.createHash("sha256").update((borrower.name + "|" + (borrower.idNumber || "")).toLowerCase()).digest();
  let k = 0; const r = () => seed[k++ % seed.length] / 255;
  const score = 540 + Math.round(r() * 220);                              // 540 to 760
  const n = 2 + Math.min(3, Math.floor(r() * 4)), lines = [], used = new Set();
  const lateChance = score < 600 ? 0.12 : score < 670 ? 0.04 : 0.01;
  let left = Math.max(0, Math.round(declaredDebts || 0));
  for (let i = 0; i < n; i++) {
    let c; do { c = CREDITORS[Math.min(CREDITORS.length - 1, Math.floor(r() * CREDITORS.length))]; } while (used.has(c[0]) && used.size < CREDITORS.length); used.add(c[0]);
    const closed = i === n - 1 && n > 2 && r() < 0.5;
    const monthly = closed ? 0 : i === n - 2 || (i === n - 1) ? left : Math.round(left * (0.3 + r() * 0.4) / 10) * 10;
    if (!closed) left -= monthly;
    const original = monthly ? Math.round(monthly * (12 + r() * 30) / 1000) * 1000 : Math.round(10000 + r() * 40000);
    const year = 2017 + Math.min(7, Math.floor(r() * 8)), month = MONTHS[Math.min(11, Math.floor(r() * 12))];
    let hist = ""; for (let m = 0; m < 24; m++) { if (closed) { hist += "n"; continue; } const x = r(); hist += x < lateChance * 0.15 && score < 600 ? "3" : x < lateChance * 0.4 ? "2" : x < lateChance ? "1" : "0"; }
    lines.push([c[0], c[1], `${month} ${year}`, original, closed ? 0 : Math.round(original * (0.2 + r() * 0.6) / 100) * 100, monthly, closed ? `Closed, paid ${MONTHS[Math.min(11, Math.floor(r() * 12))]} ${year + 2}` : "Current", hist]);
  }
  const reportNo = "FS-" + seed.readUInt32BE(4).toString().slice(0, 5) + "-PH";
  return { reportNo, score, tradelines: lines, publicRecords: score < 560 && r() < 0.4 ? 1 : 0 };
}

// What the rules need from a report.
function summary(rep) {
  let late12 = 0, late24 = 0, worst = 0, debt = 0;
  rep.tradelines.forEach((t) => { debt += t[5]; t[7].split("").forEach((c, i) => { if (c > "0" && c <= "3") { late24++; if (i >= 12) late12++; worst = Math.max(worst, +c); } }); });
  return { score: rep.score, worst, late12, late24, debt, publicRecords: rep.publicRecords };
}

module.exports = { report, summary };
