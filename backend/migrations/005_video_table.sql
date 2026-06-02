-- 005: Video table for per-video analytics per channel

-- Ensure gen_id() exists (nanoid-style short id using pgcrypto).
-- Falls back gracefully if already defined.
CREATE OR REPLACE FUNCTION gen_id(size int DEFAULT 12)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  alphabet text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  id text := '';
  i int;
  bytes bytea;
BEGIN
  bytes := gen_random_bytes(size);
  FOR i IN 0..size-1 LOOP
    id := id || substr(alphabet, (get_byte(bytes, i) % 62) + 1, 1);
  END LOOP;
  RETURN id;
END;
$$;

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
