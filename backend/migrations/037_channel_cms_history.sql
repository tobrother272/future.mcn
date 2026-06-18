-- 037: channel_cms_history — track which CMS owned which channel on which dates
-- Enables accurate revenue attribution when channels move between CMS networks.
--
-- from_date: date channel was linked into this CMS (= link_date from YouTube Studio)
-- to_date:   date channel left this CMS (unlinked_at::date); NULL = still active

CREATE TABLE IF NOT EXISTS channel_cms_history (
  id          TEXT        PRIMARY KEY,
  channel_id  TEXT        NOT NULL REFERENCES channel(id)  ON DELETE CASCADE,
  cms_id      TEXT        NOT NULL REFERENCES cms(id)      ON DELETE CASCADE,
  from_date   DATE        NOT NULL,
  to_date     DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique: one record per (channel, cms, start-date) — prevents double-insert on retries
CREATE UNIQUE INDEX IF NOT EXISTS uidx_channel_cms_history
  ON channel_cms_history (channel_id, cms_id, from_date);

-- Index for revenue queries: filter by cms + date range
CREATE INDEX IF NOT EXISTS idx_cch_cms_dates
  ON channel_cms_history (cms_id, from_date, to_date);

-- Index for lookups by channel
CREATE INDEX IF NOT EXISTS idx_cch_channel
  ON channel_cms_history (channel_id, from_date, to_date);

-- Backfill from existing channel data:
-- Active channels   → open record (to_date = NULL)
-- Unlinked channels → closed record (to_date = unlinked_at::date)
INSERT INTO channel_cms_history (id, channel_id, cms_id, from_date, to_date)
SELECT
  'CCH_' || substr(md5(c.id || '_' || c.cms_id || '_init'), 1, 16),
  c.id,
  c.cms_id,
  COALESCE(c.link_date, c.created_at::date),
  CASE WHEN c.is_unlinked AND c.unlinked_at IS NOT NULL
       THEN c.unlinked_at::date
       ELSE NULL
  END
FROM channel c
WHERE c.cms_id IS NOT NULL
ON CONFLICT (channel_id, cms_id, from_date) DO NOTHING;
