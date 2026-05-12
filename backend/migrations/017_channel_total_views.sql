-- 017 — Add total_views to channel
-- monthly_views = views trong tháng hiện tại (reset theo chu kỳ báo cáo)
-- total_views   = tổng lượt xem lũy kế từ khi kênh tạo đến nay

ALTER TABLE channel ADD COLUMN IF NOT EXISTS total_views BIGINT NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_channel_total_views ON channel(total_views);
