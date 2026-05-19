-- Migration 031: partner profile + hierarchy columns (used by v6 API/UI)

ALTER TABLE partner ADD COLUMN IF NOT EXISTS company_name  TEXT;
ALTER TABLE partner ADD COLUMN IF NOT EXISTS contact_name  TEXT;
ALTER TABLE partner ADD COLUMN IF NOT EXISTS website       TEXT;
ALTER TABLE partner ADD COLUMN IF NOT EXISTS parent_id     TEXT REFERENCES partner(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partner_parent ON partner(parent_id);
