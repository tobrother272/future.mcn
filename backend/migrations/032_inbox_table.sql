-- Migration 032: inbox table for system notifications (monetization changes, etc.)
CREATE TABLE IF NOT EXISTS inbox (
  id          TEXT         PRIMARY KEY,
  type        TEXT         NOT NULL DEFAULT 'system',
  title       TEXT         NOT NULL,
  body        JSONB        NOT NULL DEFAULT '{}',
  cms_id      TEXT         REFERENCES cms(id) ON DELETE SET NULL,
  is_read     BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON inbox(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_is_read    ON inbox(is_read);
