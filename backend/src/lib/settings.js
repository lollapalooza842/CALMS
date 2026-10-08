// Office-wide settings kept in the database (the settings table), read often, so held for 30 seconds.
const db = require("../db");

const DEFAULTS_COMPANY = { name: "GR8 Lending Company", address: "Malolos, Bulacan", secNo: "", caNo: "", phone: "(044) 555 0142", email: "" };
const DEFAULTS = { escalation_hours: 48, idle_minutes: Number(process.env.SESSION_IDLE_MINUTES || 15), company: DEFAULTS_COMPANY };
let cache = { ...DEFAULTS }, loadedAt = 0;

async function load(force = false) {
  if (!force && Date.now() - loadedAt < 30000) return cache;
  try {
    const { rows } = await db.query("select key, value from settings");
    const next = { ...DEFAULTS }; rows.forEach((r) => { next[r.key] = r.value; });
    cache = next; loadedAt = Date.now();
  } catch (e) { /* the table may not exist yet (before npm run db:setup): keep the defaults */ }
  return cache;
}
const now = () => cache;

async function save(key, value, user, client = db) {
  await client.query(`insert into settings (key, value, updated_by, updated_at) values ($1, $2, $3, now())
    on conflict (key) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`, [key, JSON.stringify(value), user ? user.id : null]);
  loadedAt = 0;
}

module.exports = { load, now, save, DEFAULTS, DEFAULTS_COMPANY };
