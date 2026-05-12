-- ═══════════════════════════════════════════════════════════
-- Migration 011: Rename `partner_contract` → `contract_document`
--                and link it to `contract` via contract_id.
--
-- Why:
--   - `partner_contract` actually stores uploaded contract FILES (PDF scans, etc.),
--     not the logical contract. It clashes with the existing `contract` table.
--   - Renaming clarifies intent and lets us attach each document to the specific
--     contract it belongs to.
--
-- Backward-compatibility:
--   A view named `partner_contract` is created so legacy SQL in BE still works
--   until services are refactored.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Rename table & associated objects ─────────────────────
ALTER TABLE IF EXISTS partner_contract
  RENAME TO contract_document;

-- Rename indexes for clarity
ALTER INDEX IF EXISTS partner_contract_pkey
  RENAME TO contract_document_pkey;
ALTER INDEX IF EXISTS idx_partner_contract_partner
  RENAME TO idx_contract_document_partner;
ALTER INDEX IF EXISTS idx_partner_contract_employee
  RENAME TO idx_contract_document_employee;
ALTER INDEX IF EXISTS idx_partner_contract_date
  RENAME TO idx_contract_document_date;

-- Rename existing FK constraints to match the new table name
ALTER TABLE contract_document
  RENAME CONSTRAINT partner_contract_partner_id_fkey
  TO contract_document_partner_id_fkey;
ALTER TABLE contract_document
  RENAME CONSTRAINT partner_contract_employee_id_fkey
  TO contract_document_employee_id_fkey;


-- ── 2. New column: link document to a logical contract ──────
ALTER TABLE contract_document
  ADD COLUMN IF NOT EXISTS contract_id TEXT
    REFERENCES contract(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contract_document_contract
  ON contract_document(contract_id);


-- ── 3. Best-effort back-fill of contract_id ─────────────────
-- Try to auto-link a document to a contract when a partner has exactly
-- one Active contract — safe heuristic to avoid wrong matches.
WITH single_contract_partner AS (
  SELECT partner_id, MIN(id) AS contract_id, COUNT(*) AS n
  FROM contract
  WHERE status IN ('Active','Draft')
  GROUP BY partner_id
  HAVING COUNT(*) = 1
)
UPDATE contract_document cd
SET    contract_id = scp.contract_id
FROM   single_contract_partner scp
WHERE  cd.contract_id IS NULL
  AND  cd.partner_id  = scp.partner_id;


-- ── 4. Backward-compatible VIEW for legacy code ─────────────
-- BE services currently SELECT/INSERT/UPDATE/DELETE on `partner_contract`.
-- This view keeps them working until they are refactored to use
-- `contract_document` directly.

CREATE OR REPLACE VIEW partner_contract AS
SELECT
  id,
  partner_id,
  contract_number,
  title,
  file_name,
  file_path,
  file_size,
  upload_date,
  employee_id,
  contract_id,
  created_at
FROM contract_document;

-- The view is a simple 1:1 projection so PostgreSQL can auto-update it.
-- No INSTEAD OF triggers needed for INSERT/UPDATE/DELETE.

COMMIT;
