-- Migration 027: add topic_ids array to policy table
ALTER TABLE policy
  ADD COLUMN IF NOT EXISTS topic_ids TEXT[] NOT NULL DEFAULT '{}';
