-- 019 — Simplify monetization to On / Off
-- Old: Monetized | Demonetized | Suspended | Pending
-- New: On | Off

-- Step 1: Drop old constraint first
ALTER TABLE channel DROP CONSTRAINT IF EXISTS channel_monetization_check;

-- Step 2: Migrate existing data
UPDATE channel SET monetization = 'On'  WHERE monetization = 'Monetized';
UPDATE channel SET monetization = 'Off' WHERE monetization IN ('Demonetized','Suspended','Pending');
-- Catch-all for any unexpected value
UPDATE channel SET monetization = 'Off' WHERE monetization NOT IN ('On','Off');

-- Step 3: Add new constraint
ALTER TABLE channel ADD CONSTRAINT channel_monetization_check
  CHECK (monetization IN ('On','Off'));

-- Step 4: Fix default
ALTER TABLE channel ALTER COLUMN monetization SET DEFAULT 'Off';
