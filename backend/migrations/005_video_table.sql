-- 005: Video table for per-video analytics per channel

-- Helper: gen_id() - tạo random text id (12 ký tự hex).
-- App backend thường tự sinh id qua nanoid(), function này chỉ dùng làm
-- fallback DEFAULT khi INSERT không truyền id.
CREATE OR REPLACE FUNCTION gen_id() RETURNS TEXT AS $$
  SELECT substring(md5(random()::text || clock_timestamp()::text), 1, 12);
$$ LANGUAGE sql VOLATILE;

CREATE TABLE IF NOT EXISTS video (
  id               text        PRIMARY KEY DEFAULT gen_id(),
  channel_id       text        NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  yt_video_id      text        UNIQUE,
  title            text        NOT NULL DEFAULT '',
  published_at     date,
  views            bigint      NOT NULL DEFAULT 0,
  watch_time_hours numeric(14,4) NOT NULL DEFAULT 0,
  avg_view_duration text,
  revenue          numeric(14,4) NOT NULL DEFAULT 0,
  status           text        NOT NULL DEFAULT 'Active',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_channel_id ON video(channel_id);
CREATE INDEX IF NOT EXISTS idx_video_published   ON video(published_at DESC);
