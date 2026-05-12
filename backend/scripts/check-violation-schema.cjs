const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const r = await c.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='violation' ORDER BY ordinal_position");
  r.rows.forEach(x => console.log(x.column_name, "-", x.data_type));
  await c.end();
}
run().catch(console.error);
