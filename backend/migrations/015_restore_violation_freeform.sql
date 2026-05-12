-- ────────────────────────────────────────────────────────────────────────────
-- 015 — Restore free-form text columns on `violation`
--
-- Rationale
--   Migration 013 dropped `video_title`, `video_url`, `channel_name`,
--   `channel_url`, and `notes` in favour of joining `channel`/`video`. That
--   model relied on a strict FK relationship which migration 014 then
--   removed (channel_id is now free-text). Without the FK we cannot rely on
--   the join to produce the channel name/url anymore — and the UI still
--   needs a place to record the video title/url and free-form notes that
--   don't fit into the structured `content`/`resolution` fields.
--
--   So we re-add the columns as plain nullable text (no constraints). They
--   are denormalized by design: users may paste arbitrary URLs / titles /
--   notes per violation regardless of whether the channel exists.
--
-- Idempotent: safe to re-run.
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE violation ADD COLUMN IF NOT EXISTS video_title   TEXT;
ALTER TABLE violation ADD COLUMN IF NOT EXISTS video_url     TEXT;
ALTER TABLE violation ADD COLUMN IF NOT EXISTS channel_name  TEXT;
ALTER TABLE violation ADD COLUMN IF NOT EXISTS channel_url   TEXT;
ALTER TABLE violation ADD COLUMN IF NOT EXISTS notes         TEXT;
