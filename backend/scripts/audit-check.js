// Checks the audit log's seals and explains any break.
//   npm run audit:check                       show whether the chain is unbroken, and if not, where and why
//   npm run audit:check -- --acknowledge      accept breaks that are only "out of order" (see below), on the record
//
// "changed":       an entry no longer matches its own seal. Its contents were edited outside CALMS. This is
//                  never accepted; tell the Compliance Auditor.
// "out of order":  the entry is intact, but two entries were written at the same moment and both were sealed
//                  against the same earlier entry. Versions of CALMS before October 2026 could do this. Nothing
//                  was altered, so these can be acknowledged; the acknowledgment is itself an audit entry.
require("dotenv").config();
const db = require("../src/db");
const audit = require("../src/lib/audit");

(async () => {
  const all = await audit.breaks(), ack = await audit.acknowledged();
  const n = Number((await db.query("select count(*) n from audit_log")).rows[0].n);
  const open = all.filter((b) => !(b.kind === "out of order" && ack.includes(b.id)));
  if (!all.length) { console.log(`Unbroken. All ${n} entries match the one before them.`); return db.end(); }
  if (!open.length && !process.argv.includes("--acknowledge")) { console.log(`Unbroken. All ${n} entries check out; ${all.length} earlier entries sealed out of order are acknowledged on the record.`); return db.end(); }
  const changed = all.filter((b) => b.kind === "changed"), ooo = all.filter((b) => b.kind === "out of order");
  console.log(`${n} entries. Breaks found: ${all.length} (${changed.length} changed, ${ooo.length} out of order; ${all.length - open.length} already acknowledged).\n`);
  for (const b of all.slice(0, 40)) console.log(`  entry ${b.id}  ${b.kind.padEnd(12)}  ${new Date(b.at).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}  ${b.action}${b.sealedAgainst ? `  (sealed against entry ${b.sealedAgainst})` : ""}`);
  if (all.length > 40) console.log(`  … and ${all.length - 40} more`);
  if (changed.length) console.log("\nSome entries were CHANGED after they were written. That cannot be acknowledged. Tell the Compliance Auditor.");
  if (!process.argv.includes("--acknowledge")) {
    if (open.some((b) => b.kind === "out of order")) console.log("\nThe out-of-order breaks are intact entries. To accept them on the record, run:\n  npm run audit:check -- --acknowledge");
    return db.end();
  }
  const add = ooo.map((b) => b.id).filter((id) => !ack.includes(id));
  if (!add.length) { console.log("\nNothing new to acknowledge."); return db.end(); }
  const ids = [...ack, ...add].sort((a, b) => a - b);
  await db.transaction(async (tx) => {
    await tx.query(`insert into settings (key, value, updated_at) values ('audit_acknowledged', $1, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`, [JSON.stringify(ids)]);
    await audit.write({ actor: "CALMS", kind: "audit", action: `Acknowledged ${add.length} audit entries sealed out of order`, record: "Audit log",
      after: { entries: add.join(", "), reason: "Intact entries written at the same moment, before the fix of October 2026. None was changed." } }, tx);
  });
  console.log(`\nAcknowledged ${add.length} out-of-order entries. The acknowledgment is in the audit log.`);
  console.log((await audit.verify()) === null ? "The seal check now reads: unbroken." : "Other breaks remain (see above).");
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
