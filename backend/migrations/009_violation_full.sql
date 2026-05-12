-- Add missing columns to violation table
ALTER TABLE violation
  ADD COLUMN IF NOT EXISTS name           TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS violation_type TEXT DEFAULT 'Hình ảnh / Video',
  ADD COLUMN IF NOT EXISTS video_id       TEXT,
  ADD COLUMN IF NOT EXISTS video_thumb    TEXT,
  ADD COLUMN IF NOT EXISTS channel_name   TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS channel_url    TEXT,
  ADD COLUMN IF NOT EXISTS content        TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS policy_id      TEXT REFERENCES policy(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolution     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS result         TEXT DEFAULT 'Không thực hiện',
  ADD COLUMN IF NOT EXISTS images         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS image_captions JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_violation_policy ON violation(policy_id);

CREATE TRIGGER set_timestamp_violation BEFORE UPDATE ON violation
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- violation_resolution table
CREATE TABLE IF NOT EXISTS violation_resolution (
  id             TEXT PRIMARY KEY,
  violation_id   TEXT NOT NULL REFERENCES violation(id) ON DELETE CASCADE,
  resolution     TEXT NOT NULL,
  handler_info   TEXT DEFAULT '',
  resolved_date  DATE,
  result_date    DATE,
  result         TEXT DEFAULT 'Chờ Xử Lý',
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vr_violation ON violation_resolution(violation_id);
