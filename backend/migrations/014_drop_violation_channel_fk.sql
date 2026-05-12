-- ═══════════════════════════════════════════════════════════
-- Migration 014: Allow free-form channel_id on `violation`
--
-- Business requirement: violations can be recorded against a channel
-- that does not yet exist in our `channel` table (e.g. raw YouTube
-- channel id pasted in by a reviewer before the channel has been
-- onboarded into the MCN). Enforcing a foreign key here causes
-- legitimate inserts to fail.
--
-- Trade-offs to be aware of:
--   • `violation.channel_id` may now hold orphan values. JOINs to
--     `channel` will simply return NULL for those rows.
--   • The application is responsible for cleaning up stale references
--     if/when a channel is deleted, since cascading deletes no longer
--     fire.
--
-- The non-FK index on `channel_id` is kept — it remains useful for
-- filtering violations by channel.
-- ═══════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE violation
  DROP CONSTRAINT IF EXISTS violation_channel_id_fkey;

COMMIT;
