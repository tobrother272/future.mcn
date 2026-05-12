const { Pool } = require("pg");
const p = new Pool({ connectionString: "postgresql://meridian:Meridian%402026@localhost:5432/meridian" });
p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='partner' ORDER BY ordinal_position")
  .then(r => { r.rows.forEach(c => console.log(c.column_name, "-", c.data_type)); p.end(); })
  .catch(e => { console.error(e.message); p.end(); process.exit(1); });
