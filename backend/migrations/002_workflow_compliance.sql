-- ═══════════════════════════════════════════════════════════
-- Migration 002: Workflow (Submission), Violation, Partner Alert, Policy
-- ═══════════════════════════════════════════════════════════

-- ── Submission ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS submission (
  id               TEXT PRIMARY KEY,
  channel_id       TEXT REFERENCES channel(id) ON DELETE SET NULL,
  partner_user_id  TEXT REFERENCES partner_user(id) ON DELETE SET NULL,
  workflow_state   TEXT NOT NULL DEFAULT 'SUBMITTED'
                     CHECK (workflow_state IN (
                       'DRAFT','SUBMITTED','QC_REVIEWING','QC_REJECTED',
                       'QC_APPROVED','CHANNEL_PROVISIONING','PROVISIONING_FAILED','ACTIVE'
                     )),
  video_title      TEXT NOT NULL,
  video_url        TEXT,
  storage_type     TEXT,
  storage_url      TEXT,
  description      TEXT,
  category         TEXT,
  product_info     TEXT,
  license          TEXT,
  qc_inspection    JSONB,
  admin_note       TEXT,
  submitted_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submission_state        ON submission(workflow_state);
CREATE INDEX IF NOT EXISTS idx_submission_partner_user ON submission(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_submission_channel      ON submission(channel_id);
CREATE TRIGGER set_timestamp_submission BEFORE UPDATE ON submission
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ── Submission State Log ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS submission_log (
  id            BIGSERIAL PRIMARY KEY,
  submission_id TEXT REFERENCES submission(id) ON DELETE CASCADE,
  from_state    TEXT,
  to_state      TEXT NOT NULL,
  by_user_id    TEXT,
  by_email      TEXT,
  by_role       TEXT,
  note          TEXT,
  ts            TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_submission_log_sub ON submission_log(submission_id, ts DESC);

-- ── Violation ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS violation (
  id             TEXT PRIMARY KEY,
  channel_id     TEXT REFERENCES channel(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  severity       TEXT CHECK (severity IN ('Low','Medium','High','Critical')),
  status         TEXT DEFAULT 'Active'
                   CHECK (status IN ('Active','Resolved','Appealed','Dismissed')),
  video_title    TEXT,
  video_url      TEXT,
  detected_date  DATE,
  resolved_date  DATE,
  notes          TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_violation_channel ON violation(channel_id);
CREATE INDEX IF NOT EXISTS idx_violation_status  ON violation(status);
CREATE INDEX IF NOT EXISTS idx_violation_date    ON violation(detected_date DESC);

-- ── Partner Alert ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_alert (
  id               TEXT PRIMARY KEY,
  partner_id       TEXT REFERENCES partner(id) ON DELETE CASCADE,
  partner_user_id  TEXT REFERENCES partner_user(id) ON DELETE SET NULL,
  channel_id       TEXT REFERENCES channel(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  required_action  TEXT,
  status           TEXT DEFAULT 'sent'
                     CHECK (status IN ('sent','read','resolved')),
  sent_by          TEXT,
  sent_at          TIMESTAMPTZ DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partner_alert_partner ON partner_alert(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_alert_status  ON partner_alert(status);

-- ── Policy Update ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_update (
  id                      TEXT PRIMARY KEY,
  title                   TEXT NOT NULL,
  body                    TEXT,
  audience                TEXT DEFAULT 'all'
                            CHECK (audience IN ('all','specific_partners','internal_only')),
  audience_partner_ids    TEXT[],
  published_by            TEXT,
  published_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ── Decision Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS decision_log (
  id             TEXT PRIMARY KEY,
  decision_type  TEXT,
  title          TEXT NOT NULL,
  context        TEXT,
  decision       TEXT,
  rationale      TEXT,
  outcome        TEXT,
  decided_by     TEXT,
  decided_at     TIMESTAMPTZ DEFAULT NOW()
);
