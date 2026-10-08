// Loan arithmetic: the schedule, the balance, and how a payment is split.
const round = (n) => Math.round(n * 100) / 100;

function installment(amount, term, rate, method) {
  return method === "flat" ? (amount + amount * rate * term) / term : amount * rate / (1 - Math.pow(1 + rate, -term));
}

// The schedule: due one month apart from the release date. Rounded to centavos; the last payment takes up the difference.
function schedule(amount, term, rate, method, releasedOn) {
  const d0 = new Date(releasedOn + "T00:00:00Z"), m = installment(amount, term, rate, method), rows = [];
  let bal = amount;
  for (let n = 1; n <= term; n++) {
    const due = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth() + n, Math.min(d0.getUTCDate(), 28)));
    let interest = method === "flat" ? round(amount * rate) : round(bal * rate);
    let principal = method === "flat" ? round(amount / term) : round(m - interest);
    if (n === term) principal = round(bal);
    bal = round(bal - principal);
    rows.push({ n, dueOn: due.toISOString().slice(0, 10), principal, interest, balance: bal });
  }
  return rows;
}

const daysBetween = (a, b) => Math.floor((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / 86400000);

// Penalty owed on one installment at a date: the unpaid amount times the monthly penalty rate, for every month or part late.
function penaltyDue(inst, onDate, penaltyRate) {
  const late = daysBetween(inst.due_on, onDate);
  const unpaid = Number(inst.principal) + Number(inst.interest) - Number(inst.paid_principal) - Number(inst.paid_interest);
  if (late <= 0 || unpaid <= 0.004) return 0;
  return Math.max(0, round(unpaid * penaltyRate * Math.ceil(late / 30)) - Number(inst.paid_penalty));
}

// Split a payment over the installments, oldest first: penalty, then interest, then principal (BR: allocation order).
// insts: rows ordered by n. Returns { allocation, left } where left is any amount that could not be applied.
function allocate(amount, insts, onDate, penaltyRate) {
  let left = round(amount); const allocation = [];
  for (const i of insts) {
    if (left <= 0) break;
    const pen = penaltyDue(i, onDate, penaltyRate), intLeft = round(Number(i.interest) - Number(i.paid_interest)), prLeft = round(Number(i.principal) - Number(i.paid_principal));
    if (pen + intLeft + prLeft <= 0.004) continue;
    const a = { n: i.n, penalty: 0, interest: 0, principal: 0 };
    a.penalty = round(Math.min(left, pen)); left = round(left - a.penalty);
    a.interest = round(Math.min(left, intLeft)); left = round(left - a.interest);
    a.principal = round(Math.min(left, prLeft)); left = round(left - a.principal);
    if (a.penalty || a.interest || a.principal) allocation.push(a);
  }
  return { allocation, left };
}

// Where an account stands on a date.
function standing(insts, onDate, penaltyRate) {
  let principalLeft = 0, overdue = 0, penalty = 0, oldestLate = null, next = null, paidAll = true;
  for (const i of insts) {
    const unpaid = round(Number(i.principal) + Number(i.interest) - Number(i.paid_principal) - Number(i.paid_interest));
    principalLeft += Number(i.principal) - Number(i.paid_principal);
    if (unpaid > 0.004) {
      paidAll = false;
      if (i.due_on < onDate) { overdue += unpaid; penalty += penaltyDue(i, onDate, penaltyRate); if (!oldestLate) oldestLate = i.due_on; }
      else if (!next) next = { n: i.n, dueOn: i.due_on, amount: unpaid };
    }
  }
  const dpd = oldestLate ? daysBetween(oldestLate, onDate) : 0;
  return { principalLeft: round(principalLeft), overdue: round(overdue), penalty: round(penalty), daysPastDue: dpd, next, closed: paidAll,
    bucket: paidAll ? "closed" : dpd === 0 ? "current" : dpd <= 30 ? "1-30" : dpd <= 60 ? "31-60" : dpd <= 90 ? "61-90" : "90+" };
}

module.exports = { schedule, installment, allocate, standing, penaltyDue, round, daysBetween };
