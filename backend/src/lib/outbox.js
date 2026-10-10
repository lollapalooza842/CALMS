// What CALMS emails, and when. Runs every minute from server.js (only when email is connected).
//   1. Staff: each new notice (see Notifications) is emailed to the people who ticked Email for that kind
//      on My profile. Quiet hours hold it until they end, except the "always sent" kinds.
//   2. Borrowers: the message templates (System > Messages) go out when an application is received, decided
//      or released, three days before a payment is due, and when a payment becomes past due.
//   3. Everything waits in the outbox first; a failed send is tried again every 15 minutes, three times in all.
// Notices and borrower messages never carry amounts or credit details.
const db = require("../db");
const mail = require("./mail");
const loans = require("./loans");
const settings = require("./settings");
const oversight = require("../routes/oversight");

const ALWAYS = [6, 7];
const MANILA = 8 * 3600e3;
const today = () => new Date(Date.now() + MANILA).toISOString().slice(0, 10);
const longDate = (s) => new Date(String(s).slice(0, 10) + "T00:00:00Z").toLocaleDateString("en-PH", { timeZone: "UTC", month: "long", day: "numeric" });

async function queue(m) {
  // m: { to, toUser, toBorrower, template, subject, body, record, dedupe, notBefore }
  await db.query(`insert into outbox (to_address, to_user, to_borrower, template, subject, body, record, dedupe, next_try_at)
      values ($1, $2, $3, $4, $5, $6, $7, $8, coalesce($9, now())) on conflict (dedupe) do nothing`,
    [m.to, m.toUser || null, m.toBorrower || null, m.template || null, m.subject.slice(0, 200), m.body, m.record || null, m.dedupe || null, m.notBefore || null]);
}

// The end of someone's quiet hours, if they are in them now.
function heldUntil(q) {
  if (!q || !q.on || q.from === q.to) return null;
  const n = new Date(Date.now() + MANILA), h = n.getUTCHours(), f = Number(q.from.slice(0, 2)), t = Number(q.to.slice(0, 2));
  const inside = f < t ? h >= f && h < t : h >= f || h < t;
  if (!inside) return null;
  const end = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate(), t) - MANILA);
  return end.getTime() > Date.now() ? end : new Date(end.getTime() + 86400e3);
}

// ---- 1. staff notices ----
async function staff(fromId) {
  const users = (await db.query("select * from users where is_active")).rows.filter((u) => mail.deliverable(u.email));
  for (const u of users) {
    const prefs = Array.isArray(u.notify_prefs) ? u.notify_prefs : oversight.DEFAULT_PREFS;
    for (const n of (await oversight.notices(u)).filter((x) => x.id > fromId)) {
      if (n.k < 0 || !prefs[n.k] || !prefs[n.k][1]) continue;          // they did not ask for email for this kind
      const link = process.env.PUBLIC_URL ? "\n\nOpen it in CALMS: " + process.env.PUBLIC_URL.replace(/\/$/, "") + (n.ref ? "/pages/application-detail.html?ref=" + n.ref : "/pages/notifications.html") : "\n\nOpen CALMS to see it.";
      await queue({ to: u.email, toUser: u.id, subject: "CALMS: " + n.m.replace(/\.$/, "") + (n.r ? " (" + n.r + ")" : ""), record: n.ref || null, dedupe: "notice:" + u.id + ":" + n.id,
        body: `Hello ${u.full_name.split(" ")[0]},\n\n${n.m}${n.r ? "\nRecord: " + n.r : ""}${n.d ? "\n" + n.d : ""}${n.need ? "\n\nThis one needs you." : ""}${link}\n\nYou get this email because of your choices on My profile in CALMS.`,
        notBefore: ALWAYS.includes(n.k) ? null : heldUntil(u.quiet_hours) });
    }
  }
}

// ---- 2. borrower messages ----
async function templates() { return Object.fromEntries((await db.query("select * from message_templates")).rows.map((t) => [t.id, t])); }
async function blanksFor(ref) {
  const a = (await db.query(`select a.reference, a.id, b.id borrower_id, b.full_name, b.email, ag.full_name agent, l.number account,
      (select min(i.due_on) from installments i where i.account_id = l.id and i.paid_principal + i.paid_interest < i.principal + i.interest - 0.004) next_due
      from applications a join borrowers b on b.id = a.borrower_id left join users ag on ag.id = a.agent_id left join loan_accounts l on l.application_id = a.id where a.reference = $1`, [ref])).rows[0];
  if (!a) return null;
  const co = settings.now().company || {};
  return { a, blanks: { first_name: a.full_name.split(" ")[0], application_no: a.reference, account_no: a.account || "", due_date: a.next_due ? longDate(a.next_due) : "",
    agent_name: a.agent || "your sales agent", branch_phone: co.phone || "" } };
}
const fill = (t, b) => t.replace(/\{(\w+)\}/g, (m, k) => (b[k] != null ? b[k] : m));
async function toBorrower(tid, ref, dedupe, T) {
  const t = T[tid]; if (!t || !t.by_email) return;
  const x = await blanksFor(ref); if (!x || !mail.deliverable(x.a.email)) return;
  const co = settings.now().company || {};
  await queue({ to: x.a.email, toBorrower: x.a.borrower_id, template: tid, subject: fill(t.subject, x.blanks), record: ref, dedupe,
    body: fill(t.body, x.blanks) + `\n\n${co.name || "GR8 Lending Company"}${co.address ? "\n" + co.address : ""}${co.phone ? "\n" + co.phone : ""}\nThis is an automatic message. For amounts and details, call us or ask your sales agent.` });
}
const EVENT = [[/^Submitted a new application/, "recv"], [/^Released/, "rel"], [/^(Approved|Declined|Issued counter-offer|Rejected)/, "dec"]];
async function borrowers(fromId, T) {
  const E = (await db.query("select id, action, record, kind from audit_log where id > $1 and record like 'APP-%' order by id", [fromId])).rows;
  for (const e of E) {
    const ev = EVENT.find(([r]) => r.test(e.action)); if (!ev) continue;
    if (ev[1] === "dec" && e.kind !== "decision" && !/counter-offer|Rejected/.test(e.action)) continue;
    await toBorrower(ev[1], e.record.split(" ")[0], ev[1] + ":" + e.id, T);
  }
}
async function daily(T) {
  if (new Date(Date.now() + MANILA).getUTCHours() < 8) return;          // from 08:00 Manila time
  const on = today(), soon = new Date(Date.now() + MANILA + 3 * 86400e3).toISOString().slice(0, 10);
  const L = (await db.query(`select l.id, l.number, l.late_penalty, a.reference from loan_accounts l join applications a on a.id = l.application_id where l.closed_on is null`)).rows;
  for (const l of L) {
    const insts = (await db.query("select * from installments where account_id = $1 order by n", [l.id])).rows, st = loans.standing(insts, on, Number(l.late_penalty));
    if (st.daysPastDue > 0 && st.daysPastDue <= 7) { const i = insts.find((x) => x.due_on < on && Number(x.paid_principal) + Number(x.paid_interest) < Number(x.principal) + Number(x.interest) - 0.004); await toBorrower("late", l.reference, `late:${l.number}:${i ? i.n : 0}`, T); }
    else if (!st.daysPastDue && st.next && st.next.dueOn >= on && st.next.dueOn <= soon) await toBorrower("due", l.reference, `due:${l.number}:${st.next.n}`, T);
  }
}

// ---- 3. sending ----
async function sendWaiting(limit = 25) {
  const rows = (await db.query("select * from outbox where status = 'waiting' and next_try_at <= now() order by id limit $1", [limit])).rows;
  let sent = 0;
  for (const m of rows) {
    try {
      await mail.send(m.to_address, m.subject, m.body);
      await db.query("update outbox set status = 'sent', sent_at = now(), attempts = attempts + 1, last_error = null where id = $1", [m.id]); sent++;
    } catch (e) {
      const n = m.attempts + 1;
      await db.query("update outbox set attempts = $2, last_error = $3, status = $4, next_try_at = now() + interval '15 minutes' where id = $1", [m.id, n, e.message, n >= 3 ? "failed" : "waiting"]);
    }
  }
  return sent;
}

let running = false;
async function tick() {
  if (!mail.configured() || running) return 0;
  running = true;
  try {
    await settings.load();
    const top = Number((await db.query("select coalesce(max(id), 0) m from audit_log")).rows[0].m);
    const cur = settings.now().mail_cursor;
    // The first time email is connected, start from now: old notices are not sent.
    if (cur == null) { await settings.save("mail_cursor", top); return 0; }
    const T = await templates();
    if (top > Number(cur)) { await staff(Number(cur)); await borrowers(Number(cur), T); await settings.save("mail_cursor", top); }
    await daily(T);
    return await sendWaiting();
  } finally { running = false; }
}
async function counts() {
  const r = (await db.query(`select count(*) filter (where status = 'waiting') waiting, count(*) filter (where status = 'sent' and sent_at > now() - interval '1 day') sent,
      count(*) filter (where status = 'failed' and created_at > now() - interval '7 days') failed, max(last_error) filter (where status = 'failed') err from outbox`)).rows[0];
  return { waiting: Number(r.waiting), sent: Number(r.sent), failed: Number(r.failed), err: r.err };
}

module.exports = { tick, queue, sendWaiting, counts, fill };
