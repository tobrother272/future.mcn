const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`
    ALTER TABLE violation
      ADD COLUMN IF NOT EXISTS video_title   TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS video_thumb   TEXT,
      ADD COLUMN IF NOT EXISTS channel_name  TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS channel_url   TEXT;
  `);
  console.log("✓ video/channel fields added to violation");
  await c.end();
}
run().catch(console.error);
