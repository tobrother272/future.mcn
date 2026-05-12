const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.query(`
    ALTER TABLE violation ALTER COLUMN type     SET DEFAULT 'Other';
    ALTER TABLE violation ALTER COLUMN severity SET DEFAULT 'Medium';
    ALTER TABLE violation ALTER COLUMN status   SET DEFAULT 'Active';
  `);
  console.log("✓ defaults set");
  await c.end();
}
run().catch(console.error);
