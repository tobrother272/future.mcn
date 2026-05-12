const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`
    CREATE TABLE IF NOT EXISTS violation_resolution (
      id              TEXT PRIMARY KEY,
      violation_id    TEXT NOT NULL REFERENCES violation(id) ON DELETE CASCADE,
      resolution      TEXT NOT NULL DEFAULT '',
      handler_info    TEXT NOT NULL DEFAULT '',
      resolved_date   DATE,
      result_date     DATE,
      result          TEXT NOT NULL DEFAULT 'Thành Công',
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_violation_resolution_vid ON violation_resolution(violation_id);
  `);
  console.log("✓ violation_resolution table created");
  await c.end();
}
run().catch(console.error);
