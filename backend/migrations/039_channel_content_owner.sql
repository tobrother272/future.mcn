-- Migration 039: add content_owner column to channel table
ALTER TABLE channel ADD COLUMN IF NOT EXISTS content_owner TEXT;
