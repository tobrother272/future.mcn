import { query, queryOne, queryMany } from "../db/helpers.js";

export const RevenueService = {
  async getByScope(scope: string, scopeId: string, days = 30) {
    return queryMany(
      `SELECT * FROM revenue_daily
       WHERE scope=$1 AND scope_id=$2
         AND snapshot_date >= CURRENT_DATE - ($3::int)
       ORDER BY snapshot_date ASC`,
      [scope, scopeId, days]
    );
  },

  async getBreakdown(
    by: "cms" | "channel" | "partner",
    opts: { period?: number; from?: string; to?: string } = {}
  ) {
    const { period = 30, from, to } = opts;
    const useRange = Boolean(from && to);
    const dateFilter = useRange
      ? `rd.snapshot_date >= $1::date AND rd.snapshot_date <= $2::date`
      : `rd.snapshot_date >= CURRENT_DATE - ($1::int)`;
    const params = useRange ? [from!, to!] : [period];
    if (by === "cms") {
      return queryMany(
        `SELECT rd.scope_id, cm.name, cm.currency,
                SUM(rd.revenue)::numeric AS revenue,
                SUM(rd.views)::bigint AS views,
                MAX(rd.snapshot_date) AS latest_date
         FROM revenue_daily rd
         JOIN cms cm ON rd.scope_id = cm.id
         WHERE rd.scope='cms' AND ${dateFilter}
         GROUP BY rd.scope_id, cm.name, cm.currency
         ORDER BY revenue DESC`,
        params
      );
    }
    if (by === "partner") {
      return queryMany(
        `SELECT rd.scope_id, p.name, p.type,
                SUM(rd.revenue)::numeric AS revenue,
                SUM(rd.views)::bigint AS views
         FROM revenue_daily rd
         JOIN channel c ON rd.scope_id = c.id
         JOIN partner p ON c.partner_id = p.id
         WHERE rd.scope='channel' AND ${dateFilter}
         GROUP BY rd.scope_id, p.name, p.type
         ORDER BY revenue DESC`,
        params
      );
    }
    // by === "channel"
    return queryMany(
      `SELECT c.id, c.name, c.cms_id, cm.name AS cms_name,
              SUM(rd.revenue)::numeric AS revenue,
              SUM(rd.views)::bigint AS views
       FROM revenue_daily rd
       JOIN channel c ON rd.scope_id = c.id
       LEFT JOIN cms cm ON c.cms_id = cm.id
       WHERE rd.scope='channel' AND ${dateFilter}
       GROUP BY c.id, c.name, c.cms_id, cm.name
       ORDER BY revenue DESC
       LIMIT 100`,
      params
    );
  },

  async getSystemDaily(opts: { period?: number; from?: string; to?: string } = {}) {
    const { period = 30, from, to } = opts;
    const useRange = Boolean(from && to);
    const analyticsDateFilter = useRange
      ? "ca.date >= $1::date AND ca.date <= $2::date"
      : "ca.date >= CURRENT_DATE - ($1::int)";
    const analyticsParams = useRange ? [from!, to!] : [period];
    const analyticsRows = await queryMany<{ snapshot_date: string; revenue: number; views: number }>(
      `SELECT
         ca.date AS snapshot_date,
         COALESCE(SUM(ca.revenue), 0)::float8 AS revenue,
         COALESCE(SUM(ca.views), 0)::float8   AS views
       FROM channel_analytics ca
       WHERE ${analyticsDateFilter}
       GROUP BY ca.date
       ORDER BY ca.date ASC`,
      analyticsParams
    );
    const subDateFilter = useRange
      ? "rd.snapshot_date >= $1::date AND rd.snapshot_date <= $2::date"
      : "rd.snapshot_date >= CURRENT_DATE - ($1::int)";
    const subRows = await queryMany<{ snapshot_date: string; subscribers: number }>(
      `SELECT
         rd.snapshot_date,
         COALESCE(SUM(rd.subscribers), 0)::float8 AS subscribers
       FROM revenue_daily rd
       WHERE rd.scope='channel'
         AND ${subDateFilter}
       GROUP BY rd.snapshot_date`,
      analyticsParams
    );
    const subMap = new Map(subRows.map((r) => [String(r.snapshot_date), Number(r.subscribers)]));
    if (analyticsRows.length > 0) {
      return analyticsRows.map((r) => ({
        snapshot_date: r.snapshot_date,
        revenue: Number(r.revenue ?? 0),
        views: Number(r.views ?? 0),
        subscribers: subMap.get(String(r.snapshot_date)) ?? 0,
      }));
    }
    // Fallback to snapshot table if analytics is not available
    const fallbackDateFilter = useRange
      ? "rd.snapshot_date >= $1::date AND rd.snapshot_date <= $2::date"
      : "rd.snapshot_date >= CURRENT_DATE - ($1::int)";
    const fallback = await queryMany<{ snapshot_date: string; revenue: number; views: number }>(
      `SELECT
         rd.snapshot_date,
         COALESCE(SUM(rd.revenue), 0)::float8 AS revenue,
         COALESCE(SUM(rd.views), 0)::float8   AS views
       FROM revenue_daily rd
       WHERE rd.scope='cms'
         AND ${fallbackDateFilter}
       GROUP BY rd.snapshot_date
       ORDER BY rd.snapshot_date ASC`,
      analyticsParams
    );
    return fallback.map((r) => ({
      snapshot_date: r.snapshot_date,
      revenue: Number(r.revenue ?? 0),
      views: Number(r.views ?? 0),
      subscribers: subMap.get(String(r.snapshot_date)) ?? 0,
    }));
  },

  async getVariation(scope: string, scopeId: string) {
    const rows = await queryMany<{ snapshot_date: string; revenue: number; views: number }>(
      `SELECT snapshot_date, revenue, views
       FROM revenue_daily
       WHERE scope=$1 AND scope_id=$2
       ORDER BY snapshot_date DESC
       LIMIT 60`,
      [scope, scopeId]
    );
    const today = rows[0];
    const prev  = rows[1];
    const prev7  = rows[6];
    const prev30 = rows[29];
    const delta = (cur: typeof today | undefined, prev: typeof today | undefined) => {
      if (!cur || !prev) return null;
      const d = cur.revenue - prev.revenue;
      return { current: cur.revenue, previous: prev.revenue, delta: d, delta_pct: prev.revenue ? (d / prev.revenue) * 100 : 0 };
    };
    return {
      "1d": delta(today, prev),
      "7d": delta(today, prev7),
      "30d": delta(today, prev30),
      history: rows.slice(0, 30),
    };
  },

  /** Snapshot all CMS / channels / partners from live channel data */
  async snapshotAll(triggeredBy?: string) {
    const date = new Date().toISOString().slice(0, 10);
    let count = 0;

    // Channel snapshots
    const channels = await queryMany<{ id: string; monthly_revenue: number; monthly_views: number; subscribers: number }>(
      `SELECT id, monthly_revenue, monthly_views, subscribers FROM channel`
    );
    for (const ch of channels) {
      await query(
        `INSERT INTO revenue_daily (scope, scope_id, snapshot_date, revenue, views, subscribers, source)
         VALUES ('channel',$1,$2,$3,$4,$5,'auto')
         ON CONFLICT (scope, scope_id, snapshot_date) DO UPDATE
           SET revenue=EXCLUDED.revenue, views=EXCLUDED.views, subscribers=EXCLUDED.subscribers`,
        [ch.id, date, ch.monthly_revenue, ch.monthly_views, ch.subscribers]
      );
      count++;
    }

    // CMS aggregate snapshots
    const cmsAgg = await queryMany<{ cms_id: string; revenue: number; views: number; total: number; active: number; currency: string }>(
      `SELECT c.cms_id, cm.currency,
              COALESCE(SUM(c.monthly_revenue),0)::numeric AS revenue,
              COALESCE(SUM(c.monthly_views),0)::bigint    AS views,
              COUNT(c.id)::int                            AS total,
              COUNT(c.id) FILTER (WHERE c.status='Active')::int AS active
       FROM channel c JOIN cms cm ON c.cms_id = cm.id
       WHERE c.cms_id IS NOT NULL
       GROUP BY c.cms_id, cm.currency`
    );
    for (const cms of cmsAgg) {
      await query(
        `INSERT INTO revenue_daily (scope, scope_id, snapshot_date, currency, revenue, views, channels_count, active_channels, source)
         VALUES ('cms',$1,$2,$3,$4,$5,$6,$7,'auto')
         ON CONFLICT (scope, scope_id, snapshot_date) DO UPDATE
           SET revenue=EXCLUDED.revenue, views=EXCLUDED.views, channels_count=EXCLUDED.channels_count,
               active_channels=EXCLUDED.active_channels`,
        [cms.cms_id, date, cms.currency, cms.revenue, cms.views, cms.total, cms.active]
      );
      count++;
    }

    // Partner aggregate snapshots
    const partnerAgg = await queryMany<{ partner_id: string; revenue: number; views: number; total: number }>(
      `SELECT c.partner_id,
              COALESCE(SUM(c.monthly_revenue),0)::numeric AS revenue,
              COALESCE(SUM(c.monthly_views),0)::bigint    AS views,
              COUNT(c.id)::int                            AS total
       FROM channel c WHERE c.partner_id IS NOT NULL GROUP BY c.partner_id`
    );
    for (const p of partnerAgg) {
      await query(
        `INSERT INTO revenue_daily (scope, scope_id, snapshot_date, revenue, views, channels_count, source)
         VALUES ('partner',$1,$2,$3,$4,$5,'auto')
         ON CONFLICT (scope, scope_id, snapshot_date) DO UPDATE
           SET revenue=EXCLUDED.revenue, views=EXCLUDED.views, channels_count=EXCLUDED.channels_count`,
        [p.partner_id, date, p.revenue, p.views, p.total]
      );
      count++;
    }

    // Refresh materialized views (concurrent if possible)
    try {
      await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_summary`);
      await query(`REFRESH MATERIALIZED VIEW CONCURRENTLY mv_partner_summary`);
    } catch {
      // Non-concurrent fallback (blocks briefly)
      await query(`REFRESH MATERIALIZED VIEW mv_dashboard_summary`);
      await query(`REFRESH MATERIALIZED VIEW mv_partner_summary`);
    }

    return { ok: true, count, date, triggered_by: triggeredBy ?? "system" };
  },

  /** Bulk import from CSV (replaces old /api/cms-daily/bulk) */
  async bulkImport(rows: Array<{ scope: string; scope_id: string; snapshot_date: string; revenue: number; views?: number; source?: string }>) {
    let inserted = 0;
    for (const r of rows) {
      await query(
        `INSERT INTO revenue_daily (scope, scope_id, snapshot_date, revenue, views, source)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (scope, scope_id, snapshot_date) DO UPDATE
           SET revenue=EXCLUDED.revenue, views=EXCLUDED.views`,
        [r.scope, r.scope_id, r.snapshot_date, r.revenue, r.views ?? 0, r.source ?? "csv_import"]
      );
      inserted++;
    }
    return { ok: true, inserted };
  },
};
