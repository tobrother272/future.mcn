const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgresql://meridian:Meridian%402026@localhost:5432/meridian" });
p.query(`
  ALTER TABLE partner
    ADD COLUMN IF NOT EXISTS company_name text,
    ADD COLUMN IF NOT EXISTS contact_name text,
    ADD COLUMN IF NOT EXISTS website      text;
`)
.then(() => { console.log("OK: added company_name, contact_name, website"); p.end(); })
.catch(e => { console.error("ERROR:", e.message); p.end(); process.exit(1); });
