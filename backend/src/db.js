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
});

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
