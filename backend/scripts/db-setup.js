// Creates the tables by running every file in ../sql in name order. Safe to run again.
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../src/db");

(async () => {
  const dir = path.join(__dirname, "..", "sql");
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(fs.readFileSync(path.join(dir, file), "utf8"));
    console.log("ran", file);
  }
  await db.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
