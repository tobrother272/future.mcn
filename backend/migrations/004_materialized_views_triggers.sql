-- ═══════════════════════════════════════════════════════════
-- Migration 004: Materialized Views, Indexes, Triggers
-- ═══════════════════════════════════════════════════════════

-- ── Materialized view: dashboard summary ─────────────────────
-- Refresh every 5 minutes via job: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_summary AS
SELECT
  c.cms_id,
  cm.name                                                           AS cms_name,
  cm.currency,
  COUNT(c.id)                                                       AS total_channels,
  COUNT(c.id) FILTER (WHERE c.status = 'Active')                   AS active_channels,
  COUNT(c.id) FILTER (WHERE c.monetization = 'Demonetized')        AS demonetized,
  COUNT(c.id) FILTER (WHERE c.monetization = 'Monetized')          AS monetized,
  COUNT(c.id) FILTER (WHERE c.health = 'Critical')                 AS critical_channels,
  COALESCE(SUM(c.monthly_revenue), 0)                              AS total_monthly_revenue,
  COALESCE(SUM(c.subscribers), 0)                                  AS total_subscribers,
  COALESCE(SUM(c.monthly_views), 0)                                AS total_monthly_views,
  COUNT(DISTINCT c.partner_id) FILTER (WHERE c.partner_id IS NOT NULL) AS partner_count,
  NOW()                                                             AS refreshed_at
FROM channel c
JOIN cms cm ON c.cms_id = cm.id
GROUP BY c.cms_id, cm.name, cm.currency;

CREATE UNIQUE INDEX IF NOT EXISTS mv_dashboard_summary_cms ON mv_dashboard_summary(cms_id);

-- ── Materialized view: partner summary ───────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_partner_summary AS
SELECT
  p.id                                                              AS partner_id,
  p.name                                                           AS partner_name,
  p.type,
  p.tier,
  p.status,
  COUNT(c.id)                                                       AS total_channels,
  COUNT(c.id) FILTER (WHERE c.status = 'Active')                   AS active_channels,
  COUNT(c.id) FILTER (WHERE c.monetization = 'Monetized')          AS monetized_channels,
  COALESCE(SUM(c.monthly_revenue), 0)                              AS total_revenue,
  COALESCE(SUM(c.subscribers), 0)                                  AS total_subscribers,
  NOW()                                                             AS refreshed_at
FROM partner p
LEFT JOIN channel c ON c.partner_id = p.id
GROUP BY p.id, p.name, p.type, p.tier, p.status;

CREATE UNIQUE INDEX IF NOT EXISTS mv_partner_summary_id ON mv_partner_summary(partner_id);

-- ── Full-text search index on channel name ────────────────────
CREATE INDEX IF NOT EXISTS idx_channel_name_fts
  ON channel USING gin(to_tsvector('english', name));

-- ── Partial indexes for common filters ───────────────────────
CREATE INDEX IF NOT EXISTS idx_channel_active
  ON channel(cms_id, monthly_revenue DESC) WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_violation_open
  ON violation(channel_id, detected_date DESC) WHERE status = 'Active';

CREATE INDEX IF NOT EXISTS idx_submission_pending
  ON submission(submitted_at DESC)
  WHERE workflow_state IN ('SUBMITTED','QC_REVIEWING','QC_APPROVED','CHANNEL_PROVISIONING');

-- ── Additional trigger: auto-log channel changes ─────────────
-- (Lightweight — just sets updated_at. Full audit done in app layer.)
