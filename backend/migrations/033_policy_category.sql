-- Add category column to policy table
ALTER TABLE policy ADD COLUMN IF NOT EXISTS category  VARCHAR(100) DEFAULT 'Youtube Policy';
ALTER TABLE policy ADD COLUMN IF NOT EXISTS topic_ids TEXT[]       NOT NULL DEFAULT '{}';

-- Lookup table for policy categories (allows custom categories)
CREATE TABLE IF NOT EXISTS policy_category (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed 3 default categories
INSERT INTO policy_category (name) VALUES
  ('Youtube Policy'),
  ('Net Update'),
  ('Net Notify')
ON CONFLICT (name) DO NOTHING;
