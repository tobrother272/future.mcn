const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
async function run() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  // Add new columns
  await c.query(`ALTER TABLE employee ADD COLUMN IF NOT EXISTS username TEXT;`);
  await c.query(`ALTER TABLE employee ADD COLUMN IF NOT EXISTS password_hash TEXT;`);
  await c.query(`ALTER TABLE employee ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('QC','Cấp Kênh','Kế Toán'));`);
  // Drop old columns
  await c.query(`ALTER TABLE employee DROP COLUMN IF EXISTS department;`);
  await c.query(`ALTER TABLE employee DROP COLUMN IF EXISTS position;`);
  await c.query(`ALTER TABLE employee DROP COLUMN IF EXISTS notes;`);
  // Unique index on username
  await c.query(`CREATE UNIQUE INDEX IF NOT EXISTS employee_username_uidx ON employee (username) WHERE username IS NOT NULL;`);
  console.log("✓ employee table migrated");
  await c.end();
}
run().catch(console.error);
