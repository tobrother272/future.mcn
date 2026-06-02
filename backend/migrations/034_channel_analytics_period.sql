-- Migration 034: channel_analytics_period
-- Stores pre-aggregated period summaries (90/365 days) pushed by the sync tool.
-- These are authoritative YouTube Studio totals, not computed from daily rows.
-- UNIQUE(channel_id, period) — one row per channel per period, overwritten each sync.
CREATE TABLE IF NOT EXISTS channel_analytics_period (
  id                TEXT        PRIMARY KEY,
  channel_id        TEXT        NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
  cms_id            TEXT,
  period            INT         NOT NULL,          -- 90 or 365 (days)
  captured_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  views             BIGINT      NOT NULL DEFAULT 0,
  engaged_views     BIGINT      NOT NULL DEFAULT 0,
  watch_time_hours  NUMERIC(14,1) NOT NULL DEFAULT 0,
  avg_view_duration TEXT,                           -- "10:12" string
  revenue           NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (channel_id, period)
);

CREATE INDEX IF NOT EXISTS idx_cap_channel_period
  ON channel_analytics_period (channel_id, period);
