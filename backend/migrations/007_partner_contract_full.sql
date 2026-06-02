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

-- Backward-compat: nếu partner_contract đã tồn tại từ migration 006 (schema rút gọn),
-- bổ sung các cột mới để index/index ở dưới chạy được.
ALTER TABLE partner_contract ADD COLUMN IF NOT EXISTS contract_number TEXT;
ALTER TABLE partner_contract ADD COLUMN IF NOT EXISTS file_name       TEXT;
ALTER TABLE partner_contract ADD COLUMN IF NOT EXISTS file_path       TEXT;
ALTER TABLE partner_contract ADD COLUMN IF NOT EXISTS file_size       INTEGER DEFAULT 0;
ALTER TABLE partner_contract ADD COLUMN IF NOT EXISTS upload_date     DATE NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_partner_contract_partner  ON partner_contract(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_contract_employee ON partner_contract(employee_id);
CREATE INDEX IF NOT EXISTS idx_partner_contract_date     ON partner_contract(upload_date DESC);
