-- ═══════════════════════════════════════════════════════════
-- Seed: KUDO Network — 8 CMS accounts
-- ═══════════════════════════════════════════════════════════
INSERT INTO cms (id, name, currency, status) VALUES
  ('CMS01', 'KUDO Future',        'USD', 'Active'),
  ('CMS02', 'KUDO Network',       'USD', 'Active'),
  ('CMS03', 'KUDO Kids',          'USD', 'Active'),
  ('CMS04', 'KUDO Music',         'USD', 'Active'),
  ('CMS05', 'KUDO Entertainment', 'USD', 'Active'),
  ('CMS06', 'KUDO Animal',        'USD', 'Active'),
  ('CMS07', 'KUDO DIY',           'USD', 'Active'),
  ('CMS08', 'Auto Mototube',      'CAD', 'Active')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, currency = EXCLUDED.currency, status = EXCLUDED.status,
      updated_at = NOW();
