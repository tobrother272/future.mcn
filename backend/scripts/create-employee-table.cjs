const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS employee (
        id          text        PRIMARY KEY,
        name        text        NOT NULL,
        email       text,
        phone       text,
        department  text,
        position    text,
        status      text        NOT NULL DEFAULT 'Active',
        notes       text,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);

      ALTER TABLE partner_contract
        ADD COLUMN IF NOT EXISTS employee_id text REFERENCES employee(id) ON DELETE SET NULL;
    `);
    console.log("✓ employee table + partner_contract.employee_id created");
  } finally {
    await client.end();
  }
}
run().catch(console.error);
