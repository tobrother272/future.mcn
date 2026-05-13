-- Migration 029: thêm created_by vào employee
-- Admin employee chỉ quản lý được nhân viên do mình tạo ra.
ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT NULL;

COMMENT ON COLUMN employee.created_by IS 'ID của employee (Admin) đã tạo ra nhân viên này. NULL = tạo bởi super_admin/hệ thống.';

-- Thêm role "Admin" vào check constraint nếu có
-- (Nếu bảng có check constraint cho cột role, cần drop & recreate)
DO $$
BEGIN
  -- Xóa constraint cũ nếu tồn tại
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employee' AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%role%'
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE employee DROP CONSTRAINT ' || constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'employee' AND constraint_type = 'CHECK'
        AND constraint_name LIKE '%role%'
      LIMIT 1
    );
  END IF;
END $$;

-- Thêm constraint mới bao gồm "Admin"
ALTER TABLE employee
  DROP CONSTRAINT IF EXISTS employee_role_check;

ALTER TABLE employee
  ADD CONSTRAINT employee_role_check
  CHECK (role IN ('Admin', 'Cấp Kênh', 'QC', 'Kế Toán'));
