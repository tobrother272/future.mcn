-- Migration 030: enable unaccent extension for accent-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;
