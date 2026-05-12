-- Track last sync time and last day revenue on channel
ALTER TABLE channel
  ADD COLUMN IF NOT EXISTS last_revenue NUMERIC(14,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_sync    TIMESTAMPTZ;
