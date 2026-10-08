// The credit rules. One engine, used by the server to record the assessment and mirrored on the
// Credit assessment screen for what-if questions. Thresholds come from the active rule set.
const peso = (n) => "₱ " + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n) => n.toFixed(1) + "%";

// Monthly installment: diminishing balance (amortised) or flat add-on interest.
function installment(amount, term, rate, method) {
  return method === "flat" ? (amount + amount * rate * term) / term : amount * rate / (1 - Math.pow(1 + rate, -term));
}

// I: { amount, term, rate, method, income, debt (monthly, from the report), collateral (or null),
//      years, yearsLabel, report: { score, worst, late12, publicRecords } or null }, P: policy
function assess(I, P) {
  const m = installment(I.amount, I.term, I.rate, I.method), dti = (I.debt + m) / I.income * 100;
  const secured = I.collateral > 0, ltv = secured ? I.amount / I.collateral * 100 : null, has = !!I.report, fs = has ? I.report.score : null, R = [];
  const add = (g, name, ok, val, lim) => R.push({ g, name, ok, val, lim });
  add("d", "FinScore not below " + P.fsDecline, has ? fs >= P.fsDecline : null, has ? String(fs) : "no report", "mandatory");
  add("d", "Debt-to-income not above " + P.dtiDecline + "%", dti <= P.dtiDecline, pct(dti), "mandatory");
  add("d", "No open public record", has ? I.report.publicRecords === 0 : null, has ? (I.report.publicRecords ? I.report.publicRecords + " found" : "none found") : "no report", "mandatory");
  add("t", "FinScore at least " + P.fsMin, has ? fs >= P.fsMin : null, has ? String(fs) : "no report", "below this is High");
  add("t", "Debt-to-income at most " + P.dtiMax + "%", dti <= P.dtiMax, pct(dti), "above this is High");
  if (secured) add("t", "Loan-to-value at most " + P.ltvMax + "%", ltv <= P.ltvMax, pct(ltv), "above this is High");
  add("t", "No payment 90 days late in 24 months", has ? I.report.worst < 3 : null, has ? (I.report.worst ? "worst: " + I.report.worst * 30 + " days" : "none late") : "no report", "any is High");
  add("a", "FinScore at least " + P.fsAuto, has ? fs >= P.fsAuto : null, has ? String(fs) : "no report", "for Low tier");
  add("a", "Debt-to-income at most " + P.dtiAuto + "%", dti <= P.dtiAuto, pct(dti), "for Low tier");
  if (secured) add("a", "Loan-to-value at most " + P.ltvAuto + "%", ltv <= P.ltvAuto, pct(ltv), "for Low tier");
  add("a", "No late payment in 12 months", has ? I.report.late12 === 0 : null, has ? I.report.late12 + " late" : "no report", "for automatic approval");
  add("a", "Amount at most " + peso(P.autoMax), I.amount <= P.autoMax, peso(I.amount), "for automatic approval");
  add("a", (I.yearsLabel || "In business") + " at least " + P.yrs + " years", I.years >= P.yrs, I.years + " years", "for automatic approval");
  const gd = R.filter((r) => r.g === "d"), gt = R.filter((r) => r.g === "t"), ga = R.filter((r) => r.g === "a");
  const decline = gd.some((r) => r.ok === false), high = gt.some((r) => r.ok === false);
  const low = ga.filter((r) => /^(FinScore|Debt-to-income|Loan-to-value)/.test(r.name)).every((r) => r.ok === true), auto = ga.every((r) => r.ok === true);
  const tier = !has ? "None" : high ? "High" : low ? "Low" : "Moderate";
  let out, why;
  if (!has) { out = "Manual review"; why = "The bureau did not answer, so the rules that need the report could not be run. A person must decide, with or without a later report."; }
  else if (decline) { out = "Decline automatically"; why = "It breaks a mandatory rule: " + gd.find((r) => r.ok === false).name.toLowerCase() + "."; }
  else if (auto && !high) { out = "Approve automatically"; why = "Every rule for automatic approval is met."; }
  else if (high) { out = "Manual review: leans decline"; why = "High tier. " + gt.filter((r) => r.ok === false).map((r) => r.name).join("; ") + " failed."; }
  else if (dti > P.dtiSoft) { out = "Manual review: approve a lower amount"; why = "Debt-to-income is between " + P.dtiSoft + "% and " + P.dtiMax + "%. A smaller loan would bring it down."; }
  else { out = "Manual review: leans approve"; why = "Inside every limit, but not every rule for automatic approval is met: " + ga.filter((r) => r.ok !== true).map((r) => r.name.toLowerCase()).join("; ") + "."; }
  return { m, dti, ltv, fs, R, tier, out, why, total: m * I.term };
}

// The largest amount (in steps of 10,000) that keeps debt-to-income at or under the soft limit and LTV inside the ceiling.
function fit(I, P, min, max) {
  let best = min;
  for (let a = min; a <= max; a += 10000) {
    const m = installment(a, I.term, I.rate, I.method);
    if ((I.debt + m) / I.income * 100 <= P.dtiSoft && (!(I.collateral > 0) || a / I.collateral * 100 <= P.ltvMax)) best = a;
  }
  return best;
}

module.exports = { assess, fit, installment, peso, pct };
