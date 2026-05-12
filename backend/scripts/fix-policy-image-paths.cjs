const { Client } = require("pg");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const { rows } = await client.query("SELECT id, images FROM policy WHERE images != '[]'");
  for (const row of rows) {
    const fixed = row.images.map((p) => {
      const n = p.replace(/\\/g, "/");
      const idx = n.indexOf("/uploads/");
      return idx >= 0 ? n.slice(idx + 1) : p; // strip leading drive letter portion
    });
    await client.query("UPDATE policy SET images=$1 WHERE id=$2", [JSON.stringify(fixed), row.id]);
    console.log("Fixed", row.id, "=>", fixed);
  }
  console.log("Done");
  await client.end();
}
run().catch(console.error);
