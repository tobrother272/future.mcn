-- ────────────────────────────────────────────────────────────────────────────
-- 016 — CMS-scoped API keys for the public sync API
--
-- Each row represents one revocable token bound to one CMS. The plaintext
-- token is shown to the operator only once (on creation); we store a SHA-256
-- hash so a leaked DB dump can't be replayed against the API.
--
-- Tokens are intentionally NOT tied to the `account` table — they are meant
-- for tools / cron jobs / external sync scripts that don't have a human
-- identity attached. Admins create them through `/api/cms/:id/api-keys`.
--
-- Lookup pattern: we don't index by plaintext, we index by `key_hash` so the
-- middleware can do a single point-lookup with the hash of the incoming token.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_api_key (
  id          TEXT PRIMARY KEY,
  cms_id      TEXT NOT NULL REFERENCES cms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,            -- human label, e.g. "youtube-scraper-prod"
  key_hash    TEXT NOT NULL UNIQUE,     -- sha256(token) in hex
  key_prefix  TEXT NOT NULL,            -- first 8 chars of plaintext for UI display
  scopes      TEXT[] NOT NULL DEFAULT ARRAY['channels:sync']::TEXT[],
  status      TEXT NOT NULL DEFAULT 'Active'
                CHECK (status IN ('Active', 'Revoked')),
  created_by  TEXT REFERENCES account(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cms_api_key_cms    ON cms_api_key(cms_id);
CREATE INDEX IF NOT EXISTS idx_cms_api_key_status ON cms_api_key(status);
-- key_hash already has a UNIQUE index from the constraint.

-- ────────────────────────────────────────────────────────────────────────────
-- Scratch table for multi-batch full-sync runs.
-- We don't track full payloads here, only the set of yt_ids seen per sync_id
-- so the reconcile step can compute the "missing → Terminated" diff. Rows
-- live only between the first batch and the final batch of a sync run; they
-- are deleted after reconcile completes.
--
-- A safety job could DELETE rows older than 24h to avoid build-up if a tool
-- never sends `is_final = true`, but it's not critical: each CMS' run uses
-- its own sync_id so the table stays small.
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cms_sync_run (
  sync_id    TEXT NOT NULL,
  cms_id     TEXT NOT NULL REFERENCES cms(id) ON DELETE CASCADE,
  yt_id      TEXT NOT NULL,
  seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sync_id, yt_id)
);
CREATE INDEX IF NOT EXISTS idx_cms_sync_run_cms ON cms_sync_run(cms_id);
