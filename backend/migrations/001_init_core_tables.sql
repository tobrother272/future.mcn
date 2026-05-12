-- ═══════════════════════════════════════════════════════════
-- Migration 001: Core tables — CMS, Topic, Partner, User, Channel, Contract
-- ═══════════════════════════════════════════════════════════

-- ── Trigger: auto-update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── CMS ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cms (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  currency      TEXT NOT NULL DEFAULT 'USD'
                  CHECK (currency IN ('USD','VND','CAD','EUR','GBP','JPY','SGD','AUD')),
  status        TEXT NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active','Suspended','Closed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cms_status ON cms(status);
CREATE TRIGGER set_timestamp_cms BEFORE UPDATE ON cms
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ── Topic ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic (
  id                  TEXT PRIMARY KEY,
  cms_id              TEXT REFERENCES cms(id) ON DELETE SET NULL,
  name                TEXT NOT NULL,
  dept                TEXT,
  expected_channels   INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cms_id, name)
);
CREATE INDEX IF NOT EXISTS idx_topic_cms ON topic(cms_id);

-- ── Partner ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL UNIQUE,
  email         TEXT,
  phone         TEXT,
  type          TEXT NOT NULL DEFAULT 'AFFILIATE'
                  CHECK (type IN ('OWNED','PRODUCTION','AFFILIATE')),
  tier          TEXT NOT NULL DEFAULT 'Standard'
                  CHECK (tier IN ('Premium','Standard','Basic')),
  rev_share     NUMERIC(5,2) DEFAULT 70.00,
  dept          TEXT,
  status        TEXT NOT NULL DEFAULT 'Active'
                  CHECK (status IN ('Active','Suspended','Terminated')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_status ON partner(status);
CREATE INDEX IF NOT EXISTS idx_partner_type   ON partner(type);
CREATE TRIGGER set_timestamp_partner BEFORE UPDATE ON partner
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ── Partner User (login accounts) ─────────────────────────────
CREATE TABLE IF NOT EXISTS partner_user (
  id             TEXT PRIMARY KEY,
  partner_id     TEXT REFERENCES partner(id) ON DELETE CASCADE,
  email          TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  phone          TEXT,
  password_hash  TEXT NOT NULL,
  status         TEXT DEFAULT 'PendingApproval'
                   CHECK (status IN ('PendingApproval','Active','Rejected','Suspended')),
  approved_by    TEXT,
  approved_at    TIMESTAMPTZ,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_user_partner ON partner_user(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_user_status  ON partner_user(status);

-- ── Internal User (staff) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  id             TEXT PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL
                   CHECK (role IN (
                     'SUPER_ADMIN','ADMIN','QC_REVIEWER','CHANNEL_CREATOR',
                     'CONTENT_MANAGER','FINANCE_MANAGER','COMPLIANCE_MANAGER','VIEWER'
                   )),
  extra_roles    TEXT[],
  status         TEXT DEFAULT 'Active'
                   CHECK (status IN ('Active','Suspended')),
  mfa_enabled    BOOLEAN DEFAULT false,
  last_login     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Channel ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel (
  id               TEXT PRIMARY KEY,
  cms_id           TEXT REFERENCES cms(id) ON DELETE SET NULL,
  partner_id       TEXT REFERENCES partner(id) ON DELETE SET NULL,
  topic_id         TEXT REFERENCES topic(id) ON DELETE SET NULL,
  yt_id            TEXT UNIQUE,
  name             TEXT NOT NULL,
  country          TEXT DEFAULT 'VN',
  status           TEXT DEFAULT 'Active'
                     CHECK (status IN ('Active','Pending','Suspended','Terminated')),
  monetization     TEXT DEFAULT 'Pending'
                     CHECK (monetization IN ('Monetized','Demonetized','Suspended','Pending')),
  health           TEXT DEFAULT 'Healthy'
                     CHECK (health IN ('Healthy','Warning','Critical')),
  strikes          INTEGER DEFAULT 0,
  subscribers      BIGINT DEFAULT 0,
  monthly_views    BIGINT DEFAULT 0,
  monthly_revenue  NUMERIC(14,2) DEFAULT 0,
  notes            TEXT,
  metadata         JSONB DEFAULT '{}'::jsonb,
  submitted_by     TEXT REFERENCES partner_user(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_cms    ON channel(cms_id);
CREATE INDEX IF NOT EXISTS idx_channel_partner ON channel(partner_id);
CREATE INDEX IF NOT EXISTS idx_channel_topic  ON channel(topic_id);
CREATE INDEX IF NOT EXISTS idx_channel_status ON channel(status);
CREATE INDEX IF NOT EXISTS idx_channel_yt     ON channel(yt_id);
CREATE INDEX IF NOT EXISTS idx_channel_monetization ON channel(monetization);
CREATE TRIGGER set_timestamp_channel BEFORE UPDATE ON channel
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ── Contract ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contract (
  id               TEXT PRIMARY KEY,
  partner_id       TEXT NOT NULL REFERENCES partner(id) ON DELETE RESTRICT,
  contract_name    TEXT NOT NULL,
  type             TEXT CHECK (type IN ('OWNED','PRODUCTION','AFFILIATE')),
  start_date       DATE NOT NULL,
  end_date         DATE,
  signed_date      DATE,
  status           TEXT DEFAULT 'Active'
                     CHECK (status IN ('Draft','Active','Expired','Terminated')),
  rev_share        NUMERIC(5,2),
  payment_terms    TEXT DEFAULT 'Net 30',
  monthly_minimum  NUMERIC(14,2) DEFAULT 0,
  terms            TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_contract_partner ON contract(partner_id);
CREATE INDEX IF NOT EXISTS idx_contract_status  ON contract(status);
CREATE INDEX IF NOT EXISTS idx_contract_dates   ON contract(start_date, end_date);
CREATE TRIGGER set_timestamp_contract BEFORE UPDATE ON contract
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ── Contract ↔ Channel (M:N) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS contract_channel (
  contract_id   TEXT REFERENCES contract(id) ON DELETE CASCADE,
  channel_id    TEXT REFERENCES channel(id) ON DELETE CASCADE,
  assigned_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at      DATE,
  PRIMARY KEY (contract_id, channel_id, assigned_at)
);
CREATE INDEX IF NOT EXISTS idx_contract_channel_contract ON contract_channel(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_channel_channel  ON contract_channel(channel_id);
