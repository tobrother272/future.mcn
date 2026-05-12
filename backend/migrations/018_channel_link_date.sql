-- 018 — Add link_date to channel
-- Ngày kênh được link/onboard vào CMS (chỉ date, không có giờ).
-- Nếu không truyền khi tạo, mặc định là ngày tạo record (CURRENT_DATE).

ALTER TABLE channel ADD COLUMN IF NOT EXISTS link_date DATE;
