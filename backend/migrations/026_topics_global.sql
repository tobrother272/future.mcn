-- Migration 026: make topics global (not per-CMS)
-- 1. Drop the CMS-scoped unique constraint
ALTER TABLE topic DROP CONSTRAINT IF EXISTS topic_cms_id_name_key;

-- 2. Null out cms_id for all existing topics (they become shared)
UPDATE topic SET cms_id = NULL WHERE cms_id IS NOT NULL;

-- 3. Add a global unique constraint on name only
ALTER TABLE topic DROP CONSTRAINT IF EXISTS topic_name_key;
ALTER TABLE topic ADD CONSTRAINT topic_name_key UNIQUE (name);

-- 4. Drop the old CMS-scoped index (replaced by the unique constraint above)
DROP INDEX IF EXISTS idx_topic_cms;
