const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS policy (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      content     TEXT NOT NULL DEFAULT '',
      application TEXT NOT NULL DEFAULT '',
      images      JSONB NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log("✓ policy table created");
  await client.end();
}
run().catch(console.error);
