const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query('SELECT id, email, full_name, role, status, created_at FROM "user" ORDER BY created_at ASC');
  console.table(r.rows);
  await c.end();
}
run().catch(console.error);
