ALTER TABLE channel
  ADD COLUMN IF NOT EXISTS is_unlinked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unlinked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unlink_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_channel_unlinked
  ON channel (is_unlinked, unlinked_at DESC);
