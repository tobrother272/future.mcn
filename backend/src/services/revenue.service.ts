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
    by: "cms" | "channel" | "partner" | "topic" | "content_owner",
    opts: {
      period?: number; from?: string; to?: string; isLifetime?: boolean;
      crossFilters?: { cmsIds?: string[]; partnerIds?: string[]; topicIds?: string[]; contentOwners?: string[] };
    } = {}
  ) {
    const { period = 28, from, to, isLifetime = false, crossFilters = {} } = opts;
    const useRange = Boolean(from && to);
    const filterPeriod = period + 2;
    const dateFilter = isLifetime
      ? "1=1"
      : useRange
      ? "ca.date >= $1::date AND ca.date <= $2::date"
      : "ca.date >= CURRENT_DATE - ($1::int) AND ca.date <= CURRENT_DATE - 2";
    const params: unknown[] = isLifetime ? [] : useRange ? [from!, to!] : [filterPeriod];

    // ── Helper: build cross-filter SQL ───────────────────────
    const crossCmsIds     = (crossFilters.cmsIds        ?? []).filter(Boolean);
    const crossPartnerIds = (crossFilters.partnerIds     ?? []).filter(Boolean);
    const crossTopicIds   = (crossFilters.topicIds       ?? []).filter(Boolean);
    const crossOwners     = (crossFilters.contentOwners  ?? []).filter(Boolean);

    const hasCrossCms     = crossCmsIds.length > 0;
    const hasCrossPartner = crossPartnerIds.length > 0;
    const hasCrossTopic   = crossTopicIds.length > 0;
    const hasCrossOwner   = crossOwners.length > 0;

    const extraConditions: string[] = [];

    // CMS cross-filter: always via channel_cms_history (only relevant when by != "cms")
    let cmsHistoryJoin = "";
    if (hasCrossCms && by !== "cms") {
      const ph = crossCmsIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      cmsHistoryJoin = `JOIN channel_cms_history hx
           ON  hx.channel_id = ca.channel_id
           AND ca.date >= hx.from_date
           AND (hx.to_date IS NULL OR ca.date <= hx.to_date)
           AND hx.cms_id IN (${ph})`;
    }

    if (hasCrossPartner && by !== "partner") {
      const ph = crossPartnerIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      extraConditions.push(`c.partner_id IN (${ph})`);
    }
    if (hasCrossTopic && by !== "topic") {
      const ph = crossTopicIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      extraConditions.push(`c.topic_id IN (${ph})`);
    }
    if (hasCrossOwner && by !== "content_owner") {
      const ph = crossOwners.map((o) => { params.push(o); return `$${params.length}`; }).join(", ");
      extraConditions.push(`c.content_owner IN (${ph})`);
    }

    const whereExtra = extraConditions.length > 0 ? " AND " + extraConditions.join(" AND ") : "";

    if (by === "cms") {
      // CMS breakdown: channel_cms_history already joined; add channel join for cross-filters on partner/topic/owner
      const needChannelJoin = hasCrossPartner || hasCrossTopic || hasCrossOwner;
      const channelJoin = needChannelJoin ? "JOIN channel c ON ca.channel_id = c.id" : "";
      return queryMany(
        `SELECT h.cms_id AS scope_id, cm.name, cm.currency,
                SUM(ca.revenue)::numeric AS revenue,
                SUM(ca.views)::bigint    AS views,
                MAX(ca.date)             AS latest_date
         FROM channel_analytics ca
         JOIN channel_cms_history h
           ON  h.channel_id = ca.channel_id
           AND ca.date >= h.from_date
           AND (h.to_date IS NULL OR ca.date <= h.to_date)
         JOIN cms cm ON h.cms_id = cm.id
         ${channelJoin}
         WHERE ${dateFilter}${whereExtra}
         GROUP BY h.cms_id, cm.name, cm.currency
         ORDER BY revenue DESC`,
        params
      );
    }
    if (by === "partner") {
      return queryMany(
        `SELECT p.id AS scope_id, p.name, p.type,
                SUM(ca.revenue)::numeric AS revenue,
                SUM(ca.views)::bigint    AS views
         FROM channel_analytics ca
         JOIN channel c  ON ca.channel_id = c.id
         JOIN partner p  ON c.partner_id = p.id
         ${cmsHistoryJoin}
         WHERE ${dateFilter}${whereExtra}
         GROUP BY p.id, p.name, p.type
         ORDER BY revenue DESC`,
        params
      );
    }
    if (by === "topic") {
      return queryMany(
        `SELECT COALESCE(t.id::text, 'unassigned') AS scope_id,
                COALESCE(t.name, 'Chưa gán topic') AS name,
                SUM(ca.revenue)::numeric AS revenue,
                COUNT(DISTINCT ca.channel_id)::int AS channel_count
         FROM channel_analytics ca
         JOIN channel c ON ca.channel_id = c.id AND c.status <> 'Terminated'
         LEFT JOIN topic t ON c.topic_id = t.id
         ${cmsHistoryJoin}
         WHERE ${dateFilter}${whereExtra}
         GROUP BY t.id, t.name
         ORDER BY revenue DESC`,
        params
      );
    }
    if (by === "content_owner") {
      return queryMany(
        `SELECT COALESCE(c.content_owner, 'Chưa gán') AS scope_id,
                COALESCE(c.content_owner, 'Chưa gán') AS name,
                SUM(ca.revenue)::numeric AS revenue,
                COUNT(DISTINCT ca.channel_id)::int AS channel_count
         FROM channel_analytics ca
         JOIN channel c ON ca.channel_id = c.id AND c.status <> 'Terminated'
         ${cmsHistoryJoin}
         WHERE ${dateFilter}${whereExtra}
         GROUP BY c.content_owner
         ORDER BY revenue DESC`,
        params
      );
    }
    // by === "channel"
    return queryMany(
      `SELECT c.id, c.name, c.cms_id, cm.name AS cms_name,
              SUM(ca.revenue)::numeric AS revenue,
              SUM(ca.views)::bigint    AS views
       FROM channel_analytics ca
       JOIN channel c  ON ca.channel_id = c.id
       LEFT JOIN cms cm ON c.cms_id = cm.id
       WHERE ${dateFilter}
       GROUP BY c.id, c.name, c.cms_id, cm.name
       ORDER BY revenue DESC
       LIMIT 100`,
      params
    );
  },

  async getSystemDaily(opts: { period?: number; from?: string; to?: string; isLifetime?: boolean } = {}) {
    const { period = 28, from, to, isLifetime = false } = opts;
    const useRange = Boolean(from && to);
    const filterPeriod = period + 2;
    const analyticsDateFilter = isLifetime
      ? "1=1"
      : useRange
      ? "ca.date >= $1::date AND ca.date <= $2::date"
      : "ca.date >= CURRENT_DATE - ($1::int) AND ca.date <= CURRENT_DATE - 2";
    const analyticsParams = isLifetime ? [] : useRange ? [from!, to!] : [filterPeriod];
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
    const subDateFilter = isLifetime
      ? "1=1"
      : useRange
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
    const fallbackDateFilter = isLifetime
      ? "1=1"
      : useRange
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

  async getEntityDaily(
    by: "cms" | "partner" | "topic" | "content_owner",
    scopeId: string,
    opts: { period?: number; from?: string; to?: string; isLifetime?: boolean } = {}
  ) {
    const { period = 28, from, to, isLifetime = false } = opts;
    const useRange = Boolean(from && to);
    const filterPeriod = period + 2;

    const dateParams: unknown[] = isLifetime ? [] : useRange ? [from!, to!] : [filterPeriod];
    const isUnassigned = scopeId === "unassigned";
    const entityParamIdx = dateParams.length + 1;
    const params: unknown[] = isUnassigned ? [...dateParams] : [...dateParams, scopeId];

    const dateFilter = isLifetime
      ? "1=1"
      : useRange
      ? "ca.date >= $1::date AND ca.date <= $2::date"
      : `ca.date >= CURRENT_DATE - ($1::int) AND ca.date <= CURRENT_DATE - 2`;

    const entityFilter =
      by === "cms"
        ? `h.cms_id = $${entityParamIdx}`
        : by === "partner"
        ? `c.partner_id = $${entityParamIdx}`
        : by === "content_owner"
        ? isUnassigned
          ? `c.content_owner IS NULL`
          : `c.content_owner = $${entityParamIdx}`
        : isUnassigned
        ? `c.topic_id IS NULL`
        : `c.topic_id = $${entityParamIdx}`;

    // CMS attribution uses channel_cms_history to respect ownership date ranges.
    // Partner/topic attribution uses current channel.partner_id / topic_id.
    const joinSql = by === "cms"
      ? `JOIN channel_cms_history h
           ON  h.channel_id = ca.channel_id
           AND ca.date >= h.from_date
           AND (h.to_date IS NULL OR ca.date <= h.to_date)
           AND ${entityFilter}`
      : `JOIN channel c ON ca.channel_id = c.id`;

    const whereSql = by === "cms"
      ? `WHERE ${dateFilter}`
      : `WHERE ${dateFilter} AND ${entityFilter}`;

    const rows = await queryMany<{ snapshot_date: string; revenue: number; views: number; subscribers: number }>(
      `SELECT
         ca.date AS snapshot_date,
         COALESCE(SUM(ca.revenue), 0)::float8        AS revenue,
         COALESCE(SUM(ca.views), 0)::float8           AS views,
         COALESCE(SUM(rd_sub.subscribers), 0)::float8 AS subscribers
       FROM channel_analytics ca
       ${joinSql}
       LEFT JOIN revenue_daily rd_sub
         ON rd_sub.scope = 'channel'
         AND rd_sub.scope_id = ca.channel_id
         AND rd_sub.snapshot_date = ca.date
       ${whereSql}
       GROUP BY ca.date
       ORDER BY ca.date ASC`,
      params
    );

    return rows.map((r) => ({
      snapshot_date: r.snapshot_date,
      revenue:     Number(r.revenue     ?? 0),
      views:       Number(r.views       ?? 0),
      subscribers: Number(r.subscribers ?? 0),
    }));
  },

  async getMultiFilterDaily(
    filters: { cmsIds?: string[]; partnerIds?: string[]; topicIds?: string[]; contentOwners?: string[] },
    opts: { period?: number; from?: string; to?: string; isLifetime?: boolean } = {}
  ) {
    const { period = 28, from, to, isLifetime = false } = opts;
    const useRange = Boolean(from && to);
    const filterPeriod = period + 2;

    const params: unknown[] = isLifetime ? [] : useRange ? [from!, to!] : [filterPeriod];
    const dateFilter = isLifetime
      ? "1=1"
      : useRange
      ? "ca.date >= $1::date AND ca.date <= $2::date"
      : `ca.date >= CURRENT_DATE - ($1::int) AND ca.date <= CURRENT_DATE - 2`;

    const extraConditions: string[] = [];

    // CMS filter via channel_cms_history (supports multiple CMS IDs)
    let cmsJoin = "";
    const cmsIds = (filters.cmsIds ?? []).filter(Boolean);
    if (cmsIds.length > 0) {
      const placeholders = cmsIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      cmsJoin = `JOIN channel_cms_history h ON h.channel_id = ca.channel_id
           AND ca.date >= h.from_date
           AND (h.to_date IS NULL OR ca.date <= h.to_date)
           AND h.cms_id IN (${placeholders})`;
    }

    // Partner / topic need join on channel
    const partnerIds    = (filters.partnerIds    ?? []).filter(Boolean);
    const topicIds      = (filters.topicIds      ?? []).filter(Boolean);
    const contentOwners = (filters.contentOwners ?? []).filter(Boolean);
    const needChannelJoin = partnerIds.length > 0 || topicIds.length > 0 || contentOwners.length > 0;
    const channelJoin = (needChannelJoin || cmsIds.length === 0) ? "JOIN channel c ON ca.channel_id = c.id" : "";

    if (partnerIds.length > 0) {
      const ph = partnerIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      extraConditions.push(`c.partner_id IN (${ph})`);
    }

    const unassignedTopic = topicIds.includes("unassigned");
    const realTopicIds = topicIds.filter((t) => t !== "unassigned");
    if (unassignedTopic && realTopicIds.length > 0) {
      const ph = realTopicIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      extraConditions.push(`(c.topic_id IS NULL OR c.topic_id IN (${ph}))`);
    } else if (unassignedTopic) {
      extraConditions.push("c.topic_id IS NULL");
    } else if (realTopicIds.length > 0) {
      const ph = realTopicIds.map((id) => { params.push(id); return `$${params.length}`; }).join(", ");
      extraConditions.push(`c.topic_id IN (${ph})`);
    }

    const unassignedOwner = contentOwners.includes("unassigned");
    const realOwners = contentOwners.filter((o) => o !== "unassigned");
    if (unassignedOwner && realOwners.length > 0) {
      const ph = realOwners.map((o) => { params.push(o); return `$${params.length}`; }).join(", ");
      extraConditions.push(`(c.content_owner IS NULL OR c.content_owner IN (${ph}))`);
    } else if (unassignedOwner) {
      extraConditions.push("c.content_owner IS NULL");
    } else if (realOwners.length > 0) {
      const ph = realOwners.map((o) => { params.push(o); return `$${params.length}`; }).join(", ");
      extraConditions.push(`c.content_owner IN (${ph})`);
    }

    const whereExtra = extraConditions.length > 0 ? " AND " + extraConditions.join(" AND ") : "";

    const rows = await queryMany<{ snapshot_date: string; revenue: number; views: number; subscribers: number }>(
      `SELECT
         ca.date AS snapshot_date,
         COALESCE(SUM(ca.revenue), 0)::float8        AS revenue,
         COALESCE(SUM(ca.views), 0)::float8           AS views,
         COALESCE(SUM(rd_sub.subscribers), 0)::float8 AS subscribers
       FROM channel_analytics ca
       ${cmsJoin}
       ${channelJoin}
       LEFT JOIN revenue_daily rd_sub
         ON rd_sub.scope = 'channel'
         AND rd_sub.scope_id = ca.channel_id
         AND rd_sub.snapshot_date = ca.date
       WHERE ${dateFilter}${whereExtra}
       GROUP BY ca.date
       ORDER BY ca.date ASC`,
      params
    );

    return rows.map((r) => ({
      snapshot_date: r.snapshot_date,
      revenue:     Number(r.revenue     ?? 0),
      views:       Number(r.views       ?? 0),
      subscribers: Number(r.subscribers ?? 0),
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

    // Channel snapshots — compute monthly_revenue from channel_analytics
    const channels = await queryMany<{ id: string; monthly_revenue: number; monthly_views: number; subscribers: number }>(
      `SELECT c.id,
              COALESCE(ca_m.monthly_revenue, 0) AS monthly_revenue,
              c.monthly_views,
              c.subscribers
       FROM channel c
       LEFT JOIN (
         SELECT channel_id, COALESCE(SUM(revenue), 0)::float8 AS monthly_revenue
         FROM channel_analytics
         WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY channel_id
       ) ca_m ON ca_m.channel_id = c.id`
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

    // CMS aggregate snapshots — revenue via channel_cms_history for correct attribution
    const cmsAgg = await queryMany<{ cms_id: string; revenue: number; views: number; total: number; active: number; currency: string }>(
      `SELECT ch_cnt.cms_id, ch_cnt.currency, ch_cnt.views, ch_cnt.total, ch_cnt.active,
              COALESCE(rev.revenue, 0)::numeric AS revenue
       FROM (
         SELECT c.cms_id, cm.currency,
                COALESCE(SUM(c.monthly_views), 0)::bigint AS views,
                COUNT(c.id)::int                          AS total,
                COUNT(c.id) FILTER (WHERE c.status='Active')::int AS active
         FROM channel c
         JOIN cms cm ON c.cms_id = cm.id
         WHERE c.cms_id IS NOT NULL
         GROUP BY c.cms_id, cm.currency
       ) ch_cnt
       LEFT JOIN (
         SELECT h.cms_id,
                COALESCE(SUM(ca.revenue), 0)::float8 AS revenue
         FROM channel_analytics ca
         JOIN channel_cms_history h
           ON  h.channel_id = ca.channel_id
           AND ca.date >= h.from_date
           AND (h.to_date IS NULL OR ca.date <= h.to_date)
         WHERE ca.date >= DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY h.cms_id
       ) rev ON rev.cms_id = ch_cnt.cms_id`
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

    // Partner aggregate snapshots — compute revenue from channel_analytics
    const partnerAgg = await queryMany<{ partner_id: string; revenue: number; views: number; total: number }>(
      `SELECT c.partner_id,
              COALESCE(SUM(COALESCE(ca_m.monthly_revenue, 0)), 0)::numeric AS revenue,
              COALESCE(SUM(c.monthly_views),0)::bigint    AS views,
              COUNT(c.id)::int                            AS total
       FROM channel c
       LEFT JOIN (
         SELECT channel_id, COALESCE(SUM(revenue), 0)::float8 AS monthly_revenue
         FROM channel_analytics
         WHERE date >= DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY channel_id
       ) ca_m ON ca_m.channel_id = c.id
       WHERE c.partner_id IS NOT NULL
       GROUP BY c.partner_id`
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
  async bulkImport(rows: Array<{ scope: string; scope_id: string; snapshot_date: string; revenue: number; views?: number; watch_time_hours?: number; engaged_views?: number; source?: string }>) {
    let inserted = 0;
    for (const r of rows) {
      await query(
        `INSERT INTO revenue_daily (scope, scope_id, snapshot_date, revenue, views, watch_time_hours, engaged_views, source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (scope, scope_id, snapshot_date) DO UPDATE
           SET revenue=EXCLUDED.revenue, views=EXCLUDED.views,
               watch_time_hours=EXCLUDED.watch_time_hours, engaged_views=EXCLUDED.engaged_views`,
        [r.scope, r.scope_id, r.snapshot_date, r.revenue, r.views ?? 0, r.watch_time_hours ?? 0, r.engaged_views ?? 0, r.source ?? "csv_import"]
      );
      inserted++;
    }
    return { ok: true, inserted };
  },
};
