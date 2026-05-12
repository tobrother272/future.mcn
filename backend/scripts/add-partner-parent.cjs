const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgresql://meridian:Meridian%402026@localhost:5432/meridian" });
p.query(`
  ALTER TABLE partner
    ADD COLUMN IF NOT EXISTS parent_id text REFERENCES partner(id) ON DELETE SET NULL;
  CREATE INDEX IF NOT EXISTS idx_partner_parent ON partner(parent_id);
`)
.then(() => { console.log("OK: parent_id added"); p.end(); })
.catch(e => { console.error("ERROR:", e.message); p.end(); process.exit(1); });
