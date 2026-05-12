CREATE TABLE IF NOT EXISTS employee (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  username      TEXT UNIQUE,
  password_hash TEXT,
  role          TEXT,
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);
CREATE TRIGGER set_timestamp_employee BEFORE UPDATE ON employee
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TABLE IF NOT EXISTS partner_contract (
  id          TEXT PRIMARY KEY,
  partner_id  TEXT REFERENCES partner(id) ON DELETE CASCADE,
  employee_id TEXT REFERENCES employee(id) ON DELETE SET NULL,
  title       TEXT,
  status      TEXT DEFAULT 'Active',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_contract_partner ON partner_contract(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_contract_employee ON partner_contract(employee_id);
