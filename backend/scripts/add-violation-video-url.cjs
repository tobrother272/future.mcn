const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`ALTER TABLE violation ADD COLUMN IF NOT EXISTS video_url TEXT;`);
  console.log("✓ video_url added");
  await c.end();
}
run().catch(console.error);
