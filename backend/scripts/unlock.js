// Unlocks an account that was locked after 5 wrong passwords, until the Users and roles page can do it.
//   npm run unlock -- liza.mendoza
// The unlock is written to the audit log like any other change.
require("dotenv").config();
const db = require("../src/db");
const audit = require("../src/lib/audit");

(async () => {
  const username = String(process.argv[2] || "").trim().toLowerCase();
  if (!username) { console.log("Say which account: npm run unlock -- liza.mendoza"); return db.end(); }
  const { rows } = await db.query("update users set failed_attempts = 0, locked_at = null where username = $1 returning full_name, username", [username]);
  if (!rows[0]) { console.log(`No account is called ${username}.`); return db.end(); }
  await audit.write({ actor: "CALMS (command line)", kind: "config", action: "Unlocked an account", record: "User: " + rows[0].username });
  console.log(`${rows[0].full_name} (${rows[0].username}) is unlocked and can sign in again.`);
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
