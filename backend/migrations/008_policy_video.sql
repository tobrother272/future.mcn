-- ── Policy table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  application TEXT NOT NULL DEFAULT '',
  images      JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER set_timestamp_policy BEFORE UPDATE ON policy
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- ── Video table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS video (
  id                TEXT PRIMARY KEY,
  channel_id        TEXT REFERENCES channel(id) ON DELETE CASCADE,
  yt_video_id       TEXT,
  title             TEXT NOT NULL DEFAULT '',
  published_at      TIMESTAMPTZ,
  views             BIGINT NOT NULL DEFAULT 0,
  watch_time_hours  NUMERIC(14,2) NOT NULL DEFAULT 0,
  avg_view_duration TEXT,
  revenue           NUMERIC(14,2) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'Active',
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_video_channel ON video(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_published ON video(published_at DESC);
CREATE TRIGGER set_timestamp_video BEFORE UPDATE ON video
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
