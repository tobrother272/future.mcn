-- 038: Add watch_time_hours and engaged_views to revenue_daily for CSV import enrichment
ALTER TABLE revenue_daily
  ADD COLUMN IF NOT EXISTS watch_time_hours NUMERIC(16,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engaged_views     BIGINT       DEFAULT 0;
