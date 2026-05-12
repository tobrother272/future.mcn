CREATE TABLE IF NOT EXISTS partner_contract (
  id               TEXT PRIMARY KEY,
  partner_id       TEXT NOT NULL REFERENCES partner(id) ON DELETE CASCADE,
  contract_number  TEXT,
  title            TEXT NOT NULL,
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  file_size        INTEGER DEFAULT 0,
  upload_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  employee_id      TEXT REFERENCES employee(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_partner_contract_partner  ON partner_contract(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_contract_employee ON partner_contract(employee_id);
CREATE INDEX IF NOT EXISTS idx_partner_contract_date     ON partner_contract(upload_date DESC);
