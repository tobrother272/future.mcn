const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`ALTER TABLE partner_contract ADD COLUMN IF NOT EXISTS contract_number text;`);
  console.log("✓ contract_number column added");
  await client.end();
}
run().catch(console.error);
