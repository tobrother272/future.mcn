-- ═══════════════════════════════════════════════════════════
-- Migration 013: Reconcile `violation` table
--
-- The `violation` table was defined twice — first in migration 002
-- (English/legacy columns) and later extended in migration 009
-- (Vietnamese/UI columns) — resulting in a "split personality"
-- with duplicate/overlapping columns.
--
-- This migration consolidates the table:
--   • Keep migration-009 columns (those are what the current API
--     and frontend use): name, violation_type, content, result,
--     images, image_captions, etc.
--   • Merge useful data from legacy columns into the canonical ones:
--       video_title → name        (when name is empty)
--       notes       → content     (when content is empty)
--   • DROP legacy/denormalized columns:
--       - type            (always 'violation' — meaningless)
--       - video_title     (merged into name)
--       - notes           (merged into content)
--       - video_url       (replaced by video_id + a URL builder if needed)
--       - resolved_date   (lives in violation_resolution now)
--       - metadata        (unused JSONB '{}'::jsonb everywhere)
--       - channel_name    (DENORMALIZE — derive via JOIN with channel)
--       - channel_url     (DENORMALIZE — derive in UI)
--   • Add CHECK constraints to enforce valid enum values:
--       - violation_type ∈ ('Thông tin', 'Hình ảnh / Video')
--       - result         ∈ ('Thành Công', 'Thất Bại', 'Không thực hiện', 'Chờ Xử Lý')
--   • Rebuild indexes that referenced dropped columns.
--
-- Reasoning notes:
--   - We intentionally KEEP the Vietnamese enum labels because the
--     frontend (and existing API contract) depend on them. Migrating
--     to English codes is a separate concern that would also touch FE.
--   - `severity` (legacy) is kept because it has a useful CHECK and
--     could be re-used; nothing is forcing us to drop it.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Merge data from legacy columns into canonical columns ─

-- video_title → name (only when name is empty/null)
UPDATE violation
SET    name = video_title
WHERE  (name IS NULL OR btrim(name) = '')
  AND  video_title IS NOT NULL
  AND  btrim(video_title) <> '';

-- notes → content (only when content is empty/null)
UPDATE violation
SET    content = notes
WHERE  (content IS NULL OR btrim(content) = '')
  AND  notes IS NOT NULL
  AND  btrim(notes) <> '';

-- Guarantee name is non-empty for the future NOT NULL CHECK
UPDATE violation
SET    name = COALESCE(NULLIF(btrim(name), ''), 'Vi phạm không có tên')
WHERE  name IS NULL OR btrim(name) = '';


-- ── 2. Drop legacy / denormalized columns ────────────────────
ALTER TABLE violation DROP COLUMN IF EXISTS type;
ALTER TABLE violation DROP COLUMN IF EXISTS video_title;
ALTER TABLE violation DROP COLUMN IF EXISTS video_url;      -- callers use video_id + frontend builds URL
ALTER TABLE violation DROP COLUMN IF EXISTS notes;
ALTER TABLE violation DROP COLUMN IF EXISTS resolved_date;  -- canonical home is violation_resolution
ALTER TABLE violation DROP COLUMN IF EXISTS metadata;
ALTER TABLE violation DROP COLUMN IF EXISTS channel_name;   -- derive via JOIN
ALTER TABLE violation DROP COLUMN IF EXISTS channel_url;    -- derive in UI


-- ── 3. Tighten remaining columns ─────────────────────────────

-- name: enforce NOT NULL + non-empty (already TEXT NOT NULL DEFAULT '')
ALTER TABLE violation
  ALTER COLUMN name DROP DEFAULT;
ALTER TABLE violation
  ADD CONSTRAINT violation_name_not_empty CHECK (btrim(name) <> '');

-- violation_type: enum CHECK (Vietnamese labels — current API contract)
ALTER TABLE violation
  ADD CONSTRAINT violation_type_check
  CHECK (violation_type IS NULL OR violation_type IN ('Thông tin', 'Hình ảnh / Video'));

-- result: enum CHECK
ALTER TABLE violation
  ADD CONSTRAINT violation_result_check
  CHECK (result IS NULL OR result IN (
    'Thành Công', 'Thất Bại', 'Không thực hiện', 'Chờ Xử Lý'
  ));

-- Also tighten violation_resolution.result with the same allowed values
ALTER TABLE violation_resolution
  ADD CONSTRAINT violation_resolution_result_check
  CHECK (result IS NULL OR result IN (
    'Thành Công', 'Thất Bại', 'Không thực hiện', 'Chờ Xử Lý'
  ));


-- ── 4. Indexes ────────────────────────────────────────────────
-- The legacy idx_violation_date pointed at `detected_date` which still
-- exists, so it remains valid. Add an index for the `result` filter that
-- the API frequently uses.
CREATE INDEX IF NOT EXISTS idx_violation_result
  ON violation(result);

COMMIT;
