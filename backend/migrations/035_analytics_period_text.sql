-- Migration 035: Change channel_analytics_period.period from INT to TEXT
-- Allows storing "lifetime" alongside numeric values like "90", "365".
ALTER TABLE channel_analytics_period
  ALTER COLUMN period TYPE TEXT USING period::TEXT;
