// One shared connection pool to the Supabase (PostgreSQL) database.
const { Pool, types } = require("pg");

// Dates (no time of day) stay as "2026-10-08" text. Turning them into JavaScript dates would shift
// them by the computer's time zone (in Manila, a date would become 4 p.m. of the day before).
types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const local = /localhost|127\.0\.0\.1|\/var\/run|host=\//.test(process.env.DATABASE_URL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: local ? false : { rejectUnauthorized: false }, // Supabase requires TLS
  max: 5,
  connectionTimeoutMillis: 8000,   // the network is down: give up after 8 seconds (the computer then works offline) instead of waiting forever
});
// A connection that drops while idle (the internet goes down, Supabase restarts) is reported here. Without this the
// whole back end would stop; with it, the pool simply opens a fresh connection on the next request.
pool.on("error", (e) => console.error("database connection lost:", e.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Runs fn inside one transaction; rolls back if it throws.
  async transaction(fn) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  },
  end: () => pool.end(),
};
