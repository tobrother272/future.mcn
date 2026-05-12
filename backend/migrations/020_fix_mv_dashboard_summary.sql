-- Fix mv_dashboard_summary: update monetization filter On/Off and fix subscribers type
DROP MATERIALIZED VIEW IF EXISTS mv_dashboard_summary;

CREATE MATERIALIZED VIEW mv_dashboard_summary AS
SELECT
  c.cms_id,
  cm.name        AS cms_name,
  cm.currency,
  COUNT(c.id)::int                                                            AS total_channels,
  COUNT(c.id) FILTER (WHERE c.status = 'Active')::int                        AS active_channels,
  COUNT(c.id) FILTER (WHERE c.monetization = 'On')::int                      AS monetized,
  COUNT(c.id) FILTER (WHERE c.monetization = 'Off')::int                     AS demonetized,
  COUNT(c.id) FILTER (WHERE c.health = 'Critical')::int                      AS critical_channels,
  COALESCE(SUM(c.monthly_revenue), 0)                                        AS total_monthly_revenue,
  COALESCE(SUM(c.subscribers), 0)::bigint                                    AS total_subscribers,
  COALESCE(SUM(c.monthly_views), 0)::bigint                                  AS total_monthly_views,
  COUNT(DISTINCT c.partner_id) FILTER (WHERE c.partner_id IS NOT NULL)::int  AS partner_count,
  NOW() AS refreshed_at
FROM channel c
JOIN cms cm ON c.cms_id = cm.id
GROUP BY c.cms_id, cm.name, cm.currency;

CREATE UNIQUE INDEX ON mv_dashboard_summary (cms_id);
