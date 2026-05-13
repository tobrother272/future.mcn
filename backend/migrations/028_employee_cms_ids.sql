-- Migration 028: add cms_ids to employee table
ALTER TABLE employee
  ADD COLUMN IF NOT EXISTS cms_ids TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN employee.cms_ids IS 'List of CMS IDs this employee is assigned to manage. Empty = access to all CMS.';
