-- Daily analytics per channel (sourced from YouTube Studio scraper)
CREATE TABLE IF NOT EXISTS channel_analytics (
  id                TEXT        PRIMARY KEY,
  channel_id        TEXT        NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  cms_id            TEXT        NOT NULL REFERENCES cms(id)     ON DELETE CASCADE,
  date              DATE        NOT NULL,

  views             BIGINT      NOT NULL DEFAULT 0,
  engaged_views     BIGINT      NOT NULL DEFAULT 0,
  watch_time_hours  NUMERIC(14,2) NOT NULL DEFAULT 0,
  avg_view_duration TEXT,                         -- "9:34" (M:SS)
  revenue           NUMERIC(14,4) NOT NULL DEFAULT 0,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (channel_id, date)
);

CREATE INDEX IF NOT EXISTS idx_channel_analytics_channel_date
  ON channel_analytics (channel_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_channel_analytics_cms_date
  ON channel_analytics (cms_id, date DESC);
