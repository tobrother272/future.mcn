-- Migration 024: add last_sync_analytic to channel
-- Tracks the last time analytics data was pushed via public analytics sync API.
-- Separate from last_sync (which is updated by the channel list sync API).
ALTER TABLE channel
  ADD COLUMN IF NOT EXISTS last_sync_analytic TIMESTAMPTZ;
