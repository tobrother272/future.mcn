// ═══════════════════════════════════════════════════════════
// MERIDIAN MCN — Backend API v1.0  (Node.js + Express + PostgreSQL)
// Endpoints: /api/health  /api/store  /api/import-history  /api/audit
// ═══════════════════════════════════════════════════════════
import express from "express";
import pg      from "pg";
import cors    from "cors";
import os      from "os";

const { Pool } = pg;
const app  = express();
const PORT = Number(process.env.PORT || 4000);

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type","X-Meridian-Token"] }));
app.use(express.json({ limit: "50mb" }));

// ─── Auth: shared secret token (optional) ────────────────────
// Set MERIDIAN_API_TOKEN env var to enable. Empty = no auth (backward compat).
// Only mutations are protected; GETs remain public for read scenarios.
const API_TOKEN = process.env.MERIDIAN_API_TOKEN || "";
console.log(`[auth] API token: ${API_TOKEN ? "ENABLED (mutations require X-Meridian-Token header)" : "DISABLED (development mode)"}`);

const requireToken = (req, res, next) => {
  if (!API_TOKEN) return next(); // auth disabled
  const provided = req.headers["x-meridian-token"];
  if (!provided || provided !== API_TOKEN) {
    return res.status(401).json({ error: "Unauthorized — missing or invalid X-Meridian-Token header" });
  }
  next();
};

// Rate limiting (in-memory, per-IP, basic)
const rateLimitMap = new Map();
const rateLimit = (max = 60, windowMs = 60000) => (req, res, next) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? forwarded.split(",")[0].trim() : null)
    || req.ip
    || req.socket?.remoteAddress
    || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, reset: now + windowMs };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + windowMs;
  }
  entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > max) {
    return res.status(429).json({ error: "Rate limit exceeded", retryAfter: Math.ceil((entry.reset - now) / 1000) });
  }
  next();
};
// Cleanup old entries every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.reset + 60000) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

// ─── DB Connection Pool ──────────────────────────────────────
const pool = new Pool({
  connectionString:    process.env.DATABASE_URL,
  max:                 10,
  idleTimeoutMillis:   30_000,
  connectionTimeoutMillis: 8_000,
});

pool.on("error", (err) => console.error("PG pool error:", err.message));

// ─── Wait for DB ready (retry up to 30s) ────────────────────
async function waitForDb() {
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query("SELECT 1");
      console.log("✓ PostgreSQL connected");
      return;
    } catch {
      console.log(`  DB not ready, retry ${i+1}/30...`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error("PostgreSQL unreachable after 30s");
}

// ─── Auto-migration: ensure cms_daily table exists on existing DBs ──
// init.sql only runs on FIRST startup. For upgrades, run idempotent CREATE here.
async function migrateSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cms_daily (
        cms_id            TEXT NOT NULL,
        cms_name          TEXT,
        snapshot_date     DATE NOT NULL,
        currency          TEXT DEFAULT 'USD',
        revenue           NUMERIC(14, 2) DEFAULT 0,
        views             BIGINT DEFAULT 0,
        channels          INTEGER DEFAULT 0,
        active_channels   INTEGER DEFAULT 0,
        monetized         INTEGER DEFAULT 0,
        demonetized       INTEGER DEFAULT 0,
        suspended         INTEGER DEFAULT 0,
        subscribers       BIGINT DEFAULT 0,
        violations        INTEGER DEFAULT 0,
        health_score      INTEGER DEFAULT 100,
        topics            INTEGER DEFAULT 0,
        partners          INTEGER DEFAULT 0,
        source            TEXT DEFAULT 'auto',
        notes             TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (cms_id, snapshot_date)
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cms_daily_date ON cms_daily(snapshot_date DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cms_daily_cms ON cms_daily(cms_id, snapshot_date DESC);`);
    console.log("✓ Schema migration: cms_daily table ready");
  } catch (e) {
    console.error("Schema migration failed:", e.message);
  }
}

// ─── Helper: safe async handler ─────────────────────────────
const IS_PROD = process.env.NODE_ENV === "production";
const wrap = (fn) => (req, res) =>
  fn(req, res).catch(e => {
    console.error(`[${req.method} ${req.path}]`, e.message);
    res.status(500).json({ error: IS_PROD ? "Internal server error" : e.message });
  });

// ════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════

// ── Health check ─────────────────────────────────────────────
app.get("/api/health", wrap(async (req, res) => {
  const { rows } = await pool.query("SELECT NOW() AS time, version() AS pg");
  res.json({ ok: true, time: rows[0].time, pg: rows[0].pg.split(" ")[1], version: "1.0.0" });
}));

// ── Network info — for LAN access discovery ──────────────────
app.get("/api/network-info", (req, res) => {
  // The URL the user reached us on — most useful for "share this URL"
  const requestHost = req.headers.host || "";
  const isLocalRequest = requestHost.includes("localhost") || requestHost.includes("127.0.0.1");

  // Container interfaces (Docker bridge — for debugging)
  const ifaces = os.networkInterfaces();
  const containerAddrs = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        containerAddrs.push({ name, address: iface.address });
      }
    }
  }

  res.json({
    requestedVia: `http://${requestHost}`,
    isLocalRequest,
    hostname: os.hostname(),
    containerInterfaces: containerAddrs,
    note: isLocalRequest
      ? "Bạn đang truy cập qua localhost. Để chia sẻ cho thiết bị khác trong LAN, dùng IP LAN của máy host."
      : "Đây là URL bạn đang dùng. Chia sẻ URL này với thiết bị khác trong cùng mạng LAN.",
  });
});

// ── Store: list all keys ─────────────────────────────────────
app.get("/api/store", wrap(async (req, res) => {
  const { rows } = await pool.query(
    "SELECT key, value, updated_at FROM store ORDER BY updated_at DESC"
  );
  res.json({ items: rows });
}));

// ── Store: bulk upsert  (POST /api/store/bulk) ───────────────
app.post("/api/store/bulk", rateLimit(120, 60000), requireToken, wrap(async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length) return res.json({ ok: true, count: 0 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const { key, value } of items) {
      if (!key) continue;
      await client.query(
        `INSERT INTO store(key, value, updated_at)
         VALUES($1, $2::jsonb, NOW())
         ON CONFLICT(key) DO UPDATE
         SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, JSON.stringify(value)]
      );
    }
    await client.query("COMMIT");
    const validCount = items.filter(({ key }) => !!key).length;
    res.json({ ok: true, count: validCount });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

// ── Store: get one key ───────────────────────────────────────
app.get("/api/store/:key", wrap(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const { rows } = await pool.query(
    "SELECT value, updated_at FROM store WHERE key = $1",
    [key]
  );
  if (!rows.length) return res.json({ value: null });
  res.json({ value: rows[0].value, updatedAt: rows[0].updated_at });
}));

// ── Store: upsert one key ────────────────────────────────────
app.put("/api/store/:key", rateLimit(60, 60000), requireToken, wrap(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const { value } = req.body;
  await pool.query(
    `INSERT INTO store(key, value, updated_at)
     VALUES($1, $2::jsonb, NOW())
     ON CONFLICT(key) DO UPDATE
     SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)]
  );
  res.json({ ok: true });
}));

// ── Store: delete one key ────────────────────────────────────
app.delete("/api/store/:key", rateLimit(30, 60000), requireToken, wrap(async (req, res) => {
  const key = decodeURIComponent(req.params.key);
  const { rowCount } = await pool.query("DELETE FROM store WHERE key = $1", [key]);
  res.json({ ok: true, deleted: rowCount > 0 });
}));

// ── Import history: list ─────────────────────────────────────
app.get("/api/import-history", wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 500), 1000);
  const { rows } = await pool.query(
    "SELECT * FROM import_history ORDER BY imported_at DESC LIMIT $1",
    [limit]
  );
  res.json({ items: rows });
}));

// ── Import history: add ──────────────────────────────────────
app.post("/api/import-history", rateLimit(60, 60000), requireToken, wrap(async (req, res) => {
  const { fileName, fileHash, fileType, rowCount, importedBy } = req.body;
  if (!fileName) return res.status(400).json({ error: "fileName is required" });
  // fileHash must be non-empty to benefit from dedup (NULL bypasses UNIQUE constraint in PG)
  const hash = (fileHash && typeof fileHash === "string" && fileHash.trim()) ? fileHash.trim() : null;
  if (!hash) {
    // No dedup possible — insert directly without ON CONFLICT
    const { rows } = await pool.query(
      `INSERT INTO import_history(file_name, file_hash, file_type, row_count, imported_by)
       VALUES($1, $2, $3, $4, $5)
       RETURNING id`,
      [fileName, null, fileType, Number(rowCount) || 0, importedBy || "system"]
    );
    return res.json({ ok: true, inserted: rows.length > 0 });
  }
  const { rows } = await pool.query(
    `INSERT INTO import_history(file_name, file_hash, file_type, row_count, imported_by)
     VALUES($1, $2, $3, $4, $5)
     ON CONFLICT(file_hash) DO NOTHING
     RETURNING id`,
    [fileName, hash, fileType, Number(rowCount) || 0, importedBy || "system"]
  );
  res.json({ ok: true, inserted: rows.length > 0 });
}));

// ── Audit: append ────────────────────────────────────────────
app.post("/api/audit", rateLimit(120, 60000), requireToken, wrap(async (req, res) => {
  const { action, actor, detail } = req.body;
  if (!action) return res.status(400).json({ error: "action is required" });
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (forwarded ? forwarded.split(",")[0].trim() : null) || req.socket?.remoteAddress || "";
  await pool.query(
    "INSERT INTO audit_log(action, actor, detail, ip) VALUES($1,$2,$3,$4)",
    [action, actor, detail, ip]
  );
  res.json({ ok: true });
}));

// ── Audit: recent list ───────────────────────────────────────
app.get("/api/audit", wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 100), 500);
  const { rows } = await pool.query(
    "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  res.json({ items: rows });
}));

// ════════════════════════════════════════════════════════════
//  CMS DAILY SNAPSHOTS — time-series tracking per CMS
// ════════════════════════════════════════════════════════════

// ── CMS Daily: bulk upsert (one snapshot per CMS, idempotent by date) ─
app.post("/api/cms-daily/bulk", rateLimit(60, 60000), requireToken, wrap(async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || !items.length) return res.json({ ok: true, count: 0 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let upserted = 0;
    for (const it of items) {
      if (!it.cms_id || !it.snapshot_date) continue;
      await client.query(
        `INSERT INTO cms_daily(
          cms_id, cms_name, snapshot_date, currency,
          revenue, views, channels, active_channels,
          monetized, demonetized, suspended, subscribers,
          violations, health_score, topics, partners,
          source, notes, updated_at
        ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
        ON CONFLICT (cms_id, snapshot_date) DO UPDATE SET
          cms_name = EXCLUDED.cms_name,
          currency = EXCLUDED.currency,
          revenue = EXCLUDED.revenue,
          views = EXCLUDED.views,
          channels = EXCLUDED.channels,
          active_channels = EXCLUDED.active_channels,
          monetized = EXCLUDED.monetized,
          demonetized = EXCLUDED.demonetized,
          suspended = EXCLUDED.suspended,
          subscribers = EXCLUDED.subscribers,
          violations = EXCLUDED.violations,
          health_score = EXCLUDED.health_score,
          topics = EXCLUDED.topics,
          partners = EXCLUDED.partners,
          source = EXCLUDED.source,
          notes = EXCLUDED.notes,
          updated_at = NOW()`,
        [
          it.cms_id, it.cms_name || null, it.snapshot_date, it.currency || "USD",
          Number(it.revenue) || 0, Number(it.views) || 0,
          Number(it.channels) || 0, Number(it.active_channels) || 0,
          Number(it.monetized) || 0, Number(it.demonetized) || 0,
          Number(it.suspended) || 0, Number(it.subscribers) || 0,
          Number(it.violations) || 0, Number(it.health_score) || 100,
          Number(it.topics) || 0, Number(it.partners) || 0,
          it.source || "auto", it.notes || null,
        ]
      );
      upserted++;
    }
    await client.query("COMMIT");
    res.json({ ok: true, count: upserted });
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}));

// ── CMS Daily: query history ─────────────────────────────────
// GET /api/cms-daily?cmsId=CMS01&days=30
// GET /api/cms-daily?days=30  (all CMS)
// GET /api/cms-daily?from=2026-01-01&to=2026-04-01
app.get("/api/cms-daily", wrap(async (req, res) => {
  const cmsId = req.query.cmsId || null;
  const days = Math.min(Number(req.query.days || 0), 730); // max 2 years
  const from = req.query.from || null;
  const to = req.query.to || null;

  const where = [];
  const params = [];
  if (cmsId) { params.push(cmsId); where.push(`cms_id = $${params.length}`); }
  if (from) { params.push(from); where.push(`snapshot_date >= $${params.length}`); }
  if (to) { params.push(to); where.push(`snapshot_date <= $${params.length}`); }
  if (!from && !to && days > 0) {
    params.push(days);
    where.push(`snapshot_date >= CURRENT_DATE - ($${params.length}::INT)`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await pool.query(
    `SELECT cms_id, cms_name, snapshot_date, currency,
            revenue, views, channels, active_channels,
            monetized, demonetized, suspended, subscribers,
            violations, health_score, topics, partners,
            source, notes, updated_at
     FROM cms_daily ${whereClause}
     ORDER BY snapshot_date ASC, cms_id ASC`,
    params
  );
  res.json({ items: rows, count: rows.length });
}));

// ── CMS Daily: stats summary (latest, oldest, count) ─────────
app.get("/api/cms-daily/stats", wrap(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT cms_id, cms_name,
           MIN(snapshot_date) AS first_date,
           MAX(snapshot_date) AS last_date,
           COUNT(*) AS snapshot_count,
           SUM(revenue) AS total_revenue,
           AVG(revenue)::NUMERIC(14,2) AS avg_daily_revenue
    FROM cms_daily
    GROUP BY cms_id, cms_name
    ORDER BY cms_id ASC
  `);
  res.json({ items: rows });
}));

// ── CMS Daily: delete a date range (admin) ───────────────────
app.delete("/api/cms-daily", rateLimit(10, 60000), requireToken, wrap(async (req, res) => {
  const { cms_id, from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: "from + to required" });
  const where = ["snapshot_date >= $1", "snapshot_date <= $2"];
  const params = [from, to];
  if (cms_id) { params.push(cms_id); where.push(`cms_id = $${params.length}`); }
  const { rowCount } = await pool.query(
    `DELETE FROM cms_daily WHERE ${where.join(" AND ")}`,
    params
  );
  res.json({ ok: true, deleted: rowCount });
}));

// ── 404 catch-all ────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// ════════════════════════════════════════════════════════════
//  START
// ════════════════════════════════════════════════════════════
(async () => {
  await waitForDb();
  await migrateSchema();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✓ Meridian Backend v1.1  →  :${PORT}`);
    console.log(`  DB: ${(process.env.DATABASE_URL || "").replace(/:[^@:]+@/, ":***@")}`);
    console.log(`  Endpoints: /api/store, /api/cms-daily, /api/import-history, /api/audit`);
  });
})().catch(err => {
  console.error("Fatal startup error:", err.message);
  process.exit(1);
});
