-- Add video count field directly on channel table (synced from scraper tool)
ALTER TABLE channel ADD COLUMN IF NOT EXISTS video BIGINT NOT NULL DEFAULT 0;
