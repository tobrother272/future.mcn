-- ═══════════════════════════════════════════════════════════
-- Seed: KUDO Topics (content categories per CMS)
-- ═══════════════════════════════════════════════════════════
INSERT INTO topic (id, cms_id, name, dept, expected_channels) VALUES
  ('T01', 'CMS01', 'Mini Cake',      'BU Diligo',    8),
  ('T02', 'CMS01', 'Mini Food',      'BU Diligo',    7),
  ('T03', 'CMS01', 'DIY Paper',      'BU Diligo',    5),
  ('T04', 'CMS07', 'DIY Story',      'BU Diligo',    6),
  ('T05', 'CMS07', 'Unboxing ASMR',  'BU Diligo',    9),
  ('T06', 'CMS01', 'LEGO FUN',       'BU Diligo',    12),
  ('T07', 'CMS01', 'LEGO Technic',   'BU Diligo',    4),
  ('T08', 'CMS01', 'Roblox Story',   'BU Xaro',      6),
  ('T09', 'CMS01', 'Roblox Series',  'BU Xaro',      5),
  ('T10', 'CMS01', 'Minecraft',      'BU Xaro',      3),
  ('T11', 'CMS04', 'Music Vibes',    'Stella Music', 14),
  ('T12', 'CMS04', 'Music ASMR',     'Stella Music', 8),
  ('T13', 'CMS03', 'Kids Songs',     'BU Diligo',    4),
  ('T14', 'CMS06', 'Animal Stories', 'BU FBN',       6),
  ('T15', 'CMS08', 'Cartoons',       'BU FBN',       11),
  ('T16', 'CMS08', 'Hamster',        'BU FBN',       5),
  ('T17', 'CMS01', 'Brainrot',       'BU Diligo',    7)
ON CONFLICT (id) DO UPDATE
  SET cms_id = EXCLUDED.cms_id, name = EXCLUDED.name,
      dept = EXCLUDED.dept, expected_channels = EXCLUDED.expected_channels;

-- ── Partners ───────────────────────────────────────────────
INSERT INTO partner (id, name, type, tier, rev_share, dept) VALUES
  ('P0001', 'GLOBIX',         'PRODUCTION', 'Premium',  72.00, 'BU Diligo'),
  ('P0002', 'DILIGO',         'PRODUCTION', 'Premium',  75.00, 'BU Diligo'),
  ('P0003', 'BUILDY',         'OWNED',      'Premium', 100.00, 'BU Diligo'),
  ('P0004', 'STELLA MUSIC',   'PRODUCTION', 'Premium',  70.00, 'Stella Music'),
  ('P0005', 'WEFANTASIC',     'AFFILIATE',  'Standard', 60.00, 'Stella Music'),
  ('P0006', 'FBN',            'AFFILIATE',  'Standard', 58.00, 'BU FBN'),
  ('P0007', 'CAP MEDIA',      'PRODUCTION', 'Standard', 65.00, 'BU Cap Media'),
  ('P0008', 'FUTURE NYNE',    'PRODUCTION', 'Standard', 68.00, 'BU Diligo'),
  ('P0009', 'XARO DIGITAL',   'OWNED',      'Standard',100.00, 'BU Xaro'),
  ('P0010', 'DLB',            'AFFILIATE',  'Basic',    55.00, 'BU FBN'),
  ('P0011', 'TDC',            'AFFILIATE',  'Basic',    55.00, 'BU FBN'),
  ('P0012', 'BG MUSIC GROUP', 'AFFILIATE',  'Basic',    57.00, 'Stella Music')
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, type = EXCLUDED.type, tier = EXCLUDED.tier,
      rev_share = EXCLUDED.rev_share, dept = EXCLUDED.dept,
      updated_at = NOW();
