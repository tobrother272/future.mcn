-- ═══════════════════════════════════════════════════════════
-- Migration 010: Unify `user` + `partner_user` into single `account` table
--
-- Strategy (strangler-fig — zero-downtime for existing BE code):
--   1. Create new `account` table (canonical store).
--   2. Migrate data from `user` and `partner_user` into it, preserving IDs
--      so that all existing FKs (channel.submitted_by, submission.partner_user_id,
--      contract_channel, etc.) remain valid.
--   3. Drop old tables.
--   4. Create updatable VIEWs `"user"` and `partner_user` so legacy SQL in
--      backend services keeps working until the codebase is refactored.
--
-- Rollback: see 010_unify_account.down.sql (sibling file).
-- ═══════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Canonical `account` table ─────────────────────────────
CREATE TABLE IF NOT EXISTS account (
  id              TEXT PRIMARY KEY,
  account_type    TEXT NOT NULL
                    CHECK (account_type IN ('internal', 'partner')),

  -- Identity (email is unique only within its account_type slice)
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  password_hash   TEXT NOT NULL,

  -- Internal-only
  role            TEXT
                    CHECK (role IS NULL OR role IN (
                      'SUPER_ADMIN','ADMIN','QC_REVIEWER','CHANNEL_CREATOR',
                      'CONTENT_MANAGER','FINANCE_MANAGER','COMPLIANCE_MANAGER','VIEWER'
                    )),
  extra_roles     TEXT[],
  mfa_enabled     BOOLEAN DEFAULT false,

  -- Partner-only
  partner_id      TEXT REFERENCES partner(id) ON DELETE CASCADE,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,

  -- Common lifecycle
  status          TEXT NOT NULL DEFAULT 'Active'
                    CHECK (status IN (
                      'Active','Suspended','PendingApproval','Rejected'
                    )),
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Consistency rules between type and role/partner
  CONSTRAINT account_internal_has_role
    CHECK (account_type <> 'internal' OR role IS NOT NULL),
  CONSTRAINT account_partner_no_role
    CHECK (account_type <> 'partner'  OR role IS NULL),
  CONSTRAINT account_partner_status
    CHECK (account_type <> 'partner'  OR status IN
           ('Active','Suspended','PendingApproval','Rejected')),
  CONSTRAINT account_internal_status
    CHECK (account_type <> 'internal' OR status IN ('Active','Suspended'))
);

-- Email unique within each account_type (allow same email for internal vs partner if business needs)
CREATE UNIQUE INDEX IF NOT EXISTS account_email_per_type_uniq
  ON account(account_type, lower(email));

CREATE INDEX IF NOT EXISTS idx_account_type      ON account(account_type);
CREATE INDEX IF NOT EXISTS idx_account_status    ON account(status);
CREATE INDEX IF NOT EXISTS idx_account_partner   ON account(partner_id);
CREATE INDEX IF NOT EXISTS idx_account_last_login ON account(last_login DESC);

CREATE TRIGGER set_timestamp_account BEFORE UPDATE ON account
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- ── 2. Migrate data (preserve IDs!) ──────────────────────────
INSERT INTO account (
  id, account_type, email, full_name, phone, password_hash,
  role, extra_roles, mfa_enabled,
  partner_id, approved_by, approved_at,
  status, last_login, created_at, updated_at
)
SELECT
  u.id,
  'internal',
  u.email,
  u.full_name,
  NULL,
  u.password_hash,
  u.role,
  u.extra_roles,
  COALESCE(u.mfa_enabled, false),
  NULL, NULL, NULL,
  COALESCE(u.status, 'Active'),
  u.last_login,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW())
FROM "user" u
ON CONFLICT (id) DO NOTHING;

INSERT INTO account (
  id, account_type, email, full_name, phone, password_hash,
  role, extra_roles, mfa_enabled,
  partner_id, approved_by, approved_at,
  status, last_login, created_at, updated_at
)
SELECT
  pu.id,
  'partner',
  pu.email,
  pu.full_name,
  pu.phone,
  pu.password_hash,
  NULL, NULL, false,
  pu.partner_id,
  pu.approved_by,
  pu.approved_at,
  COALESCE(pu.status, 'PendingApproval'),
  pu.last_login,
  COALESCE(pu.created_at, NOW()),
  COALESCE(pu.created_at, NOW())
FROM partner_user pu
ON CONFLICT (id) DO NOTHING;


-- ── 3. Drop legacy tables (FKs to them get rewired below) ────
-- First, drop FKs that reference the old tables so we can drop them,
-- then re-create them pointing at `account`.

ALTER TABLE channel        DROP CONSTRAINT IF EXISTS channel_submitted_by_fkey;
ALTER TABLE submission     DROP CONSTRAINT IF EXISTS submission_partner_user_id_fkey;
ALTER TABLE partner_alert  DROP CONSTRAINT IF EXISTS partner_alert_partner_user_id_fkey;

DROP TABLE IF EXISTS partner_user;
DROP TABLE IF EXISTS "user";

-- Re-add FKs pointing at account.id (works because IDs were preserved)
ALTER TABLE channel
  ADD CONSTRAINT channel_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES account(id) ON DELETE SET NULL;

ALTER TABLE submission
  ADD CONSTRAINT submission_partner_user_id_fkey
  FOREIGN KEY (partner_user_id) REFERENCES account(id) ON DELETE SET NULL;

ALTER TABLE partner_alert
  ADD CONSTRAINT partner_alert_partner_user_id_fkey
  FOREIGN KEY (partner_user_id) REFERENCES account(id) ON DELETE SET NULL;


-- ── 4. Backward-compatible VIEWs ─────────────────────────────
-- Make existing code (`SELECT … FROM "user"` / `partner_user`) keep working.

CREATE OR REPLACE VIEW "user" AS
SELECT
  id, email, full_name, password_hash,
  role, extra_roles, status,
  COALESCE(mfa_enabled, false) AS mfa_enabled,
  last_login, created_at
FROM account
WHERE account_type = 'internal';

CREATE OR REPLACE VIEW partner_user AS
SELECT
  id, partner_id, email, full_name, phone, password_hash,
  status, approved_by, approved_at, last_login, created_at
FROM account
WHERE account_type = 'partner';

-- Updatable rules for the views — so legacy INSERT/UPDATE/DELETE still work.
-- (INSTEAD OF triggers because views with JOINs/CTEs would not be auto-updatable;
--  here our views are simple, so PostgreSQL CAN auto-update them, but we add
--  triggers to enforce account_type on INSERT.)

CREATE OR REPLACE FUNCTION account_user_view_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO account (
    id, account_type, email, full_name, password_hash,
    role, extra_roles, status, mfa_enabled, last_login, created_at
  ) VALUES (
    NEW.id, 'internal', NEW.email, NEW.full_name, NEW.password_hash,
    NEW.role, NEW.extra_roles,
    COALESCE(NEW.status, 'Active'),
    COALESCE(NEW.mfa_enabled, false),
    NEW.last_login,
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION account_partner_user_view_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO account (
    id, account_type, partner_id, email, full_name, phone, password_hash,
    status, approved_by, approved_at, last_login, created_at
  ) VALUES (
    NEW.id, 'partner', NEW.partner_id, NEW.email, NEW.full_name, NEW.phone, NEW.password_hash,
    COALESCE(NEW.status, 'PendingApproval'),
    NEW.approved_by, NEW.approved_at, NEW.last_login,
    COALESCE(NEW.created_at, NOW())
  );
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_view_insert ON "user";
CREATE TRIGGER user_view_insert
  INSTEAD OF INSERT ON "user"
  FOR EACH ROW EXECUTE FUNCTION account_user_view_insert();

DROP TRIGGER IF EXISTS partner_user_view_insert ON partner_user;
CREATE TRIGGER partner_user_view_insert
  INSTEAD OF INSERT ON partner_user
  FOR EACH ROW EXECUTE FUNCTION account_partner_user_view_insert();

-- UPDATE/DELETE on the views: PostgreSQL auto-rewrites them against `account`
-- because they are simple SELECT views, so no extra triggers needed.

COMMIT;
