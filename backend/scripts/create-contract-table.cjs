// Run: node backend/scripts/create-contract-table.cjs
const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_contract (
        id          text        PRIMARY KEY,
        partner_id  text        NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
        title       text        NOT NULL,
        file_name   text        NOT NULL,
        file_path   text        NOT NULL,
        file_size   bigint      NOT NULL DEFAULT 0,
        upload_date date        NOT NULL DEFAULT CURRENT_DATE,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_partner_contract_partner ON partner_contract(partner_id);
    `);
    console.log("✓ partner_contract table created");
  } finally {
    await client.end();
  }
}
run().catch(console.error);
