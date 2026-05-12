const { Pool } = require("pg");
const pool = new Pool({ connectionString: "postgresql://meridian:Meridian%402026@localhost:5432/meridian" });
pool.query(`
  CREATE TABLE IF NOT EXISTS video (
    id               text        PRIMARY KEY,
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
  CREATE INDEX IF NOT EXISTS idx_video_published  ON video(published_at DESC);
`).then(() => { console.log("OK: video table ready"); pool.end(); })
  .catch(e => { console.error("ERROR:", e.message); pool.end(); process.exit(1); });
