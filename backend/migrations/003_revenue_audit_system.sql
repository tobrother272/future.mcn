-- ═══════════════════════════════════════════════════════════
-- Migration 003: Revenue (time-series), Audit, Session, Notifications,
--                Comments, Import History, Settings
-- ═══════════════════════════════════════════════════════════

-- ── Revenue Daily (polymorphic scope) ─────────────────────────
CREATE TABLE IF NOT EXISTS revenue_daily (
  id               BIGSERIAL PRIMARY KEY,
  scope            TEXT NOT NULL CHECK (scope IN ('cms','channel','partner','contract')),
  scope_id         TEXT NOT NULL,
  snapshot_date    DATE NOT NULL,
  currency         TEXT NOT NULL DEFAULT 'USD',
  revenue          NUMERIC(14,2) DEFAULT 0,
  views            BIGINT DEFAULT 0,
  subscribers      BIGINT DEFAULT 0,
  channels_count   INTEGER DEFAULT 0,
  active_channels  INTEGER DEFAULT 0,
  source           TEXT DEFAULT 'auto'
                     CHECK (source IN ('auto','manual','import','adsense','youtube_api','csv_import')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope, scope_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_revenue_scope_date ON revenue_daily(scope, scope_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_date       ON revenue_daily(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_scope      ON revenue_daily(scope, scope_id);

-- ── Audit Log ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id             BIGSERIAL PRIMARY KEY,
  action         TEXT NOT NULL,
  actor_id       TEXT,
  actor_email    TEXT,
  resource_type  TEXT,
  resource_id    TEXT,
  detail         JSONB,
  ip             TEXT,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor   ON audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_log(resource_type, resource_id);

-- ── Session ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  user_type    TEXT CHECK (user_type IN ('internal','partner')),
  ip           TEXT,
  user_agent   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_user    ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_expires ON session(expires_at);

-- ── Notification ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  user_type   TEXT CHECK (user_type IN ('internal','partner')),
  title       TEXT NOT NULL,
  body        TEXT,
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notification_user
  ON notification(user_id, created_at DESC) WHERE read_at IS NULL;

-- ── Comment (threaded, polymorphic) ──────────────────────────
CREATE TABLE IF NOT EXISTS comment (
  id           TEXT PRIMARY KEY,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  parent_id    TEXT REFERENCES comment(id) ON DELETE CASCADE,
  author_id    TEXT NOT NULL,
  author_email TEXT,
  author_name  TEXT,
  body         TEXT NOT NULL,
  mentions     TEXT[],
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comment_entity ON comment(entity_type, entity_id);

-- ── Import History ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS import_history (
  id           BIGSERIAL PRIMARY KEY,
  file_name    TEXT,
  file_hash    TEXT UNIQUE,
  file_type    TEXT,
  row_count    INTEGER,
  imported_by  TEXT,
  imported_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Settings (key-value store) ────────────────────────────────
CREATE TABLE IF NOT EXISTS setting (
  key         TEXT PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
