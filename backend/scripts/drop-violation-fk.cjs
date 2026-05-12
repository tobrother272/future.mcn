const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Find and drop the foreign key constraint on violation.channel_id
  const { rows } = await c.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'violation'::regclass AND contype = 'f' AND conname ILIKE '%channel%'
  `);
  for (const row of rows) {
    await c.query(`ALTER TABLE violation DROP CONSTRAINT IF EXISTS "${row.conname}"`);
    console.log("Dropped:", row.conname);
  }
  console.log("Done");
  await c.end();
}
run().catch(console.error);
