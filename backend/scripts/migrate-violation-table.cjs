const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`
    ALTER TABLE violation
      ADD COLUMN IF NOT EXISTS name        TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS video_id    TEXT,
      ADD COLUMN IF NOT EXISTS content     TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS policy_id   TEXT REFERENCES policy(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS images      JSONB NOT NULL DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS resolution  TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS result      TEXT NOT NULL DEFAULT 'Không thực hiện',
      ADD COLUMN IF NOT EXISTS updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);
  console.log("✓ violation table migrated");
  await c.end();
}
run().catch(console.error);
