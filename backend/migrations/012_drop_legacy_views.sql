-- ═══════════════════════════════════════════════════════════
-- Migration 012: Drop backward-compatibility views.
--
-- After services in `backend/src` were refactored to query
-- `account` / `contract_document` directly, the legacy views
-- `"user"`, `partner_user`, and `partner_contract` are no longer
-- referenced by application code. Drop them to remove a dead
-- abstraction layer and reduce schema noise.
--
-- IMPORTANT: Verify there are no external consumers (BI scripts,
-- analytics dashboards, ad-hoc queries) of these views before
-- applying in production.
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- Drop INSTEAD OF INSERT triggers + their functions first
DROP TRIGGER IF EXISTS user_view_insert         ON "user";
DROP TRIGGER IF EXISTS partner_user_view_insert ON partner_user;

DROP FUNCTION IF EXISTS account_user_view_insert();
DROP FUNCTION IF EXISTS account_partner_user_view_insert();

-- Drop the views themselves
DROP VIEW IF EXISTS "user";
DROP VIEW IF EXISTS partner_user;
DROP VIEW IF EXISTS partner_contract;

COMMIT;
