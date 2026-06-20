-- Migration 040: add email_access and password_enc to channel table
ALTER TABLE channel ADD COLUMN IF NOT EXISTS email_access TEXT;
ALTER TABLE channel ADD COLUMN IF NOT EXISTS password_enc TEXT;
