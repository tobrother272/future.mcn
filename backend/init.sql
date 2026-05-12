-- ═══════════════════════════════════════════════════════════
-- MERIDIAN MCN — PostgreSQL Schema v1.1
-- Auto-executed on first container startup
-- ═══════════════════════════════════════════════════════════

-- Generic key-value store (mirrors localStorage keys)
CREATE TABLE IF NOT EXISTS store (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_store_updated ON store(updated_at DESC);

-- Import history (normalized, deduplication via file_hash)
CREATE TABLE IF NOT EXISTS import_history (
  id          SERIAL PRIMARY KEY,
  file_name   TEXT,
  file_hash   TEXT,
  file_type   TEXT,
  row_count   INTEGER DEFAULT 0,
  imported_by TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_hash)
);
CREATE INDEX IF NOT EXISTS idx_import_hash ON import_history(file_hash);

-- Audit log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  action      TEXT NOT NULL,
  actor       TEXT,
  detail      TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- ─── CMS Daily Snapshots ────────────────────────────────────
-- One row per (CMS, date) → enables time-series analytics and variation tracking
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
  source            TEXT DEFAULT 'auto',  -- 'auto' | 'manual' | 'import'
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cms_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_cms_daily_date ON cms_daily(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_cms_daily_cms ON cms_daily(cms_id, snapshot_date DESC);
