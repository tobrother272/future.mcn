import { query, queryOne, queryMany, buildWhere, buildPagination } from "../db/helpers.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";
import { appendChannelSearchFilter } from "../lib/channel-search.js";

interface Cms { id: string; name: string; currency: string; status: string; notes: string | null; created_at: string; updated_at: string; }
interface Topic { id: string; cms_id: string | null; name: string; dept: string | null; expected_channels: number; created_at: string; }
interface CmsStats { cms_id: string; cms_name: string; currency: string; total_channels: number; active_channels: number; monetized: number; demonetized: number; critical_channels: number; total_monthly_revenue: number; total_subscribers: number; total_monthly_views: number; partner_count: number; revenue_90: number; revenue_365: number; revenue_lifetime: number; }

export const CmsService = {
  async list(params: { status?: string; page?: number; limit?: number }) {
    const { where, params: wp, nextOffset } = buildWhere({ status: params.status });
    const { sql: pagSql, params: pagParams } = buildPagination(
      params.page, params.limit, nextOffset, "name", "asc",
      ["id","name","currency","status","created_at"]
    );
    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM cms ${where}`, wp
    );
    const rows = await queryMany<Cms>(
      `SELECT * FROM cms ${where} ${pagSql}`,
      [...wp, ...pagParams]
    );
    return {
      items: rows,
      total: Number(countRes?.count ?? 0),
      page: params.page ?? 1,
      limit: params.limit ?? 50,
    };
  },

  async getById(id: string) {
    const cms = await queryOne<Cms>(`SELECT * FROM cms WHERE id = $1`, [id]);
    if (!cms) throw new NotFoundError(`CMS "${id}" not found`);
    return cms;
  },

  async create(data: { id: string; name: string; currency: string; notes?: string }) {
    const existing = await queryOne(`SELECT id FROM cms WHERE id = $1 OR name = $2`, [data.id, data.name]);
    if (existing) throw new ConflictError("CMS id or name already exists");
    const cms = await queryOne<Cms>(
      `INSERT INTO cms (id, name, currency, notes) VALUES ($1,$2,$3,$4) RETURNING *`,
      [data.id, data.name, data.currency ?? "USD", data.notes ?? null]
    );
    return cms!;
  },

  async update(id: string, data: { name?: string; currency?: string; status?: string; notes?: string }) {
    await CmsService.getById(id);
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (data.name    !== undefined) { sets.push(`name=$${idx++}`);     vals.push(data.name); }
    if (data.currency!== undefined) { sets.push(`currency=$${idx++}`); vals.push(data.currency); }
    if (data.status  !== undefined) { sets.push(`status=$${idx++}`);   vals.push(data.status); }
    if (data.notes   !== undefined) { sets.push(`notes=$${idx++}`);    vals.push(data.notes); }
    if (!sets.length) return CmsService.getById(id);
    vals.push(id);
    const cms = await queryOne<Cms>(
      `UPDATE cms SET ${sets.join(",")} WHERE id = $${idx} RETURNING *`, vals
    );
    return cms!;
  },

  async delete(id: string) {
    await CmsService.getById(id);
    const channels = await queryMany<{ id: string; name: string }>(
      `SELECT id, name FROM channel WHERE cms_id = $1 ORDER BY name`, [id]
    );
    if (channels.length > 0) {
      await query(`DELETE FROM channel WHERE cms_id = $1`, [id]);
    }
    await query(`DELETE FROM cms WHERE id = $1`, [id]);
    return { ok: true, deletedChannels: channels };
  },

  async getStats(id: string): Promise<CmsStats> {
    // Always use live query so stats reflect real-time channel updates
    const res = await queryOne<Omit<CmsStats, "total_monthly_revenue" | "revenue_90" | "revenue_365" | "revenue_lifetime">>(
      `SELECT
         c.cms_id,
         cm.name AS cms_name, cm.currency,
         COUNT(c.id)::int                                                         AS total_channels,
         COUNT(c.id) FILTER (WHERE c.status='Active')::int                       AS active_channels,
         COUNT(c.id) FILTER (WHERE c.monetization='On')::int                     AS monetized,
         COUNT(c.id) FILTER (WHERE c.monetization='Off')::int                    AS demonetized,
         COUNT(c.id) FILTER (WHERE c.health='Critical')::int                     AS critical_channels,
         COALESCE(SUM(c.subscribers),0)::float8                                  AS total_subscribers,
         COALESCE(SUM(c.monthly_views),0)::float8                                AS total_monthly_views,
         COUNT(DISTINCT c.partner_id) FILTER (WHERE c.partner_id IS NOT NULL)::int AS partner_count
       FROM channel c
       JOIN cms cm ON c.cms_id = cm.id
       WHERE c.cms_id = $1
       GROUP BY c.cms_id, cm.name, cm.currency`,
      [id]
    );
    if (!res) {
      const cms = await CmsService.getById(id);
      return { cms_id: id, cms_name: cms.name, currency: cms.currency, total_channels:0, active_channels:0, monetized:0, demonetized:0, critical_channels:0, total_monthly_revenue:0, total_subscribers:0, total_monthly_views:0, partner_count:0, revenue_90:0, revenue_365:0, revenue_lifetime:0 };
    }
    // All revenue figures use the same getRevenue logic as the history page
    // (dynamic max_date + CSV priority) — run in parallel for performance
    const [rev28, rev90, rev365, revLifetime] = await Promise.all([
      CmsService.getRevenue(id, { days: 28 }),
      CmsService.getRevenue(id, { days: 90 }),
      CmsService.getRevenue(id, { days: 365 }),
      CmsService.getRevenue(id, { isLifetime: true }),
    ]);
    const sum = (rows: { revenue: number }[]) => rows.reduce((s, r) => s + Number(r.revenue), 0);
    return {
      ...res,
      total_monthly_revenue: sum(rev28),
      revenue_90:       sum(rev90),
      revenue_365:      sum(rev365),
      revenue_lifetime: sum(revLifetime),
    };
  },

  async getRevenue(id: string, opts: { days?: number; from?: string; to?: string; isLifetime?: boolean } = {}) {
    await CmsService.getById(id);
    const { days = 28, from, to, isLifetime } = opts;

    // Date filters for each context (analytics alias ca, csv alias rd, sub-alias ca_sub)
    // For preset days: find the most recent date with analytics data for this CMS,
    // then use that as the upper bound. This avoids off-by-one issues from data lag.
    let dateFilterCA: string;
    let dateFilterRD: string;
    let dateFilterSub: string;
    let queryParams: unknown[];

    if (isLifetime) {
      dateFilterCA  = "1=1";
      dateFilterRD  = "1=1";
      dateFilterSub = "1=1";
      queryParams   = [id];
    } else if (from && to) {
      dateFilterCA  = "ca.date >= $2::date AND ca.date <= $3::date";
      dateFilterRD  = "rd.snapshot_date >= $2::date AND rd.snapshot_date <= $3::date";
      dateFilterSub = "ca_sub.date >= $2::date AND ca_sub.date <= $3::date";
      queryParams   = [id, from, to];
    } else {
      // Find the most recent date where a meaningful number of channels reported data
      // (at least 50% of the peak channel count seen in the last 14 days).
      // This prevents a single test/partial push from skewing the window anchor.
      const maxRes = await queryOne<{ max_date: string }>(
        `WITH recent_counts AS (
           SELECT ca.date, COUNT(DISTINCT ca.channel_id) AS ch_count
           FROM channel_analytics ca
           JOIN channel_cms_history h ON h.channel_id = ca.channel_id
             AND h.cms_id = $1
             AND ca.date >= h.from_date
             AND (h.to_date IS NULL OR ca.date <= h.to_date)
           WHERE ca.date >= CURRENT_DATE - 14
           GROUP BY ca.date
         ),
         threshold AS (SELECT GREATEST(1, MAX(ch_count) * 0.5) AS val FROM recent_counts)
         SELECT COALESCE(MAX(rc.date)::text, (CURRENT_DATE - 3)::text) AS max_date
         FROM recent_counts rc, threshold t
         WHERE rc.ch_count >= t.val`,
        [id]
      );
      const maxDate = maxRes?.max_date ?? new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
      // Window: [maxDate - (days-1), maxDate] = exactly `days` slots
      dateFilterCA  = "ca.date >= $2::date - ($3::int - 1) AND ca.date <= $2::date";
      dateFilterRD  = "rd.snapshot_date >= $2::date - ($3::int - 1) AND rd.snapshot_date <= $2::date";
      dateFilterSub = "ca_sub.date >= $2::date - ($3::int - 1) AND ca_sub.date <= $2::date";
      queryParams   = [id, maxDate, days];
    }

    // Priority rule (based on tool pushing 50 days per run):
    //   date within last 50 days → analytics is most up-to-date (priority 1)
    //   date older than 50 days  → CSV from Studio is authoritative (priority 1)
    // ROW_NUMBER picks the best source per date; the other source fills gaps.
    return queryMany<{ snapshot_date: string; revenue: number; views: number; engaged_views: number; watch_time_hours: number; channels_count: number }>(
      `WITH all_data AS (
         SELECT
           ca.date                            AS d,
           SUM(ca.revenue)::float8            AS revenue,
           SUM(ca.views)::float8              AS views,
           SUM(ca.engaged_views)::float8      AS engaged_views,
           SUM(ca.watch_time_hours)::float8   AS watch_time_hours,
           COUNT(DISTINCT ca.channel_id)::int AS channels_count,
           CASE WHEN ca.date > CURRENT_DATE - 50 THEN 1 ELSE 2 END AS prio
         FROM channel_analytics ca
         JOIN channel_cms_history h
           ON  h.channel_id = ca.channel_id
           AND h.cms_id     = $1
           AND ca.date >= h.from_date
           AND (h.to_date IS NULL OR ca.date <= h.to_date)
         WHERE ${dateFilterCA}
         GROUP BY ca.date

         UNION ALL

         SELECT
           rd.snapshot_date                        AS d,
           rd.revenue::float8,
           rd.views::float8,
           COALESCE(rd.engaged_views, 0)::float8,
           COALESCE(rd.watch_time_hours, 0)::float8,
           0::int,
           CASE WHEN rd.snapshot_date <= CURRENT_DATE - 50 THEN 1 ELSE 2 END AS prio
         FROM revenue_daily rd
         WHERE rd.scope = 'cms' AND rd.scope_id = $1
           AND rd.source = 'csv_import'
           AND ${dateFilterRD}
       ),
       ranked AS (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY d ORDER BY prio ASC) AS rn
         FROM all_data
       )
       SELECT d AS snapshot_date, revenue, views, engaged_views, watch_time_hours, channels_count
       FROM ranked
       WHERE rn = 1
       ORDER BY snapshot_date ASC`,
      queryParams
    );
  },

  async getRevenueByTopic(id: string) {
    await CmsService.getById(id);
    return queryMany<{
      topic_id: string | null;
      topic:    string;
      channel_count: number;
      monetized_count: number;
      total_revenue: number;
      total_last_revenue: number;
    }>(
      `SELECT
         t.id                                                              AS topic_id,
         COALESCE(t.name, 'Chưa gán topic')                               AS topic,
         COUNT(c.id)::int                                                  AS channel_count,
         COUNT(c.id) FILTER (WHERE c.monetization = 'On')::int            AS monetized_count,
         COALESCE(SUM(COALESCE(ca_m.monthly_revenue, 0)), 0)::float8      AS total_revenue,
         COALESCE(SUM(c.last_revenue), 0)::float8                         AS total_last_revenue
       FROM channel c
       LEFT JOIN topic t ON c.topic_id = t.id
       LEFT JOIN (
         -- Revenue scoped to this CMS's ownership dates
         SELECT ca.channel_id, COALESCE(SUM(ca.revenue), 0)::float8 AS monthly_revenue
         FROM channel_analytics ca
         JOIN channel_cms_history h
           ON  h.channel_id = ca.channel_id
           AND h.cms_id     = $1
           AND ca.date >= h.from_date
           AND (h.to_date IS NULL OR ca.date <= h.to_date)
         WHERE ca.date >= CURRENT_DATE - 28 AND ca.date <= CURRENT_DATE - 2
         GROUP BY ca.channel_id
       ) ca_m ON ca_m.channel_id = c.id
       WHERE c.cms_id = $1
         AND c.status <> 'Terminated'
       GROUP BY t.id, t.name
       ORDER BY total_revenue DESC`,
      [id],
    );
  },

  async getChannels(id: string, params: {
    page?: number; limit?: number;
    status?: string; monetization?: string; search?: string;
    topic_id?: string; content_owner?: string;
    min_views?: number; max_views?: number;
    min_revenue?: number; max_revenue?: number;
    min_last_revenue?: number; max_last_revenue?: number;
  }) {
    await CmsService.getById(id);
    const baseParams: unknown[] = [id];
    let idx = 2;
    const andClauses: string[] = [];

    if (params.status)        { andClauses.push(`c.status = $${idx++}`);         baseParams.push(params.status); }
    if (params.monetization)  { andClauses.push(`c.monetization = $${idx++}`);   baseParams.push(params.monetization); }
    if (params.search) {
      const { sql, nextIdx } = appendChannelSearchFilter(params.search, idx, baseParams);
      andClauses.push(sql);
      idx = nextIdx;
    }
    if (params.topic_id)      { andClauses.push(`c.topic_id = $${idx++}`);       baseParams.push(params.topic_id); }
    if (params.content_owner) { andClauses.push(`c.content_owner = $${idx++}`);  baseParams.push(params.content_owner); }
    if (params.min_views != null && params.min_views > 0)     { andClauses.push(`c.total_views >= $${idx++}`);    baseParams.push(params.min_views); }
    if (params.max_views != null && params.max_views > 0)     { andClauses.push(`c.total_views <= $${idx++}`);    baseParams.push(params.max_views); }
    if (params.min_revenue != null && params.min_revenue > 0) { andClauses.push(`COALESCE((SELECT SUM(revenue) FROM channel_analytics WHERE channel_id = c.id AND date >= CURRENT_DATE - 30 AND date <= CURRENT_DATE - 2), 0) >= $${idx++}`);  baseParams.push(params.min_revenue); }
    if (params.max_revenue != null && params.max_revenue > 0) { andClauses.push(`COALESCE((SELECT SUM(revenue) FROM channel_analytics WHERE channel_id = c.id AND date >= CURRENT_DATE - 30 AND date <= CURRENT_DATE - 2), 0) <= $${idx++}`);  baseParams.push(params.max_revenue); }
    if (params.min_last_revenue != null && params.min_last_revenue > 0) { andClauses.push(`c.last_revenue >= $${idx++}`); baseParams.push(params.min_last_revenue); }
    if (params.max_last_revenue != null && params.max_last_revenue > 0) { andClauses.push(`c.last_revenue <= $${idx++}`); baseParams.push(params.max_last_revenue); }

    const andSql = andClauses.length ? `AND ${andClauses.join(" AND ")}` : "";
    const pageLimit = Math.min(100, params.limit ?? 50);
    const offset = (Math.max(1, params.page ?? 1) - 1) * pageLimit;

    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM channel c
       LEFT JOIN topic t ON c.topic_id = t.id
       WHERE c.cms_id = $1 ${andSql}`,
      baseParams
    );
    const rows = await queryMany(
      `SELECT c.*, p.name AS partner_name, t.name AS topic_name,
              COALESCE(ca_m.monthly_revenue, 0)::float8 AS monthly_revenue
       FROM channel c
       LEFT JOIN partner p ON c.partner_id = p.id
       LEFT JOIN topic t   ON c.topic_id   = t.id
       LEFT JOIN (
         SELECT channel_id, COALESCE(SUM(revenue), 0)::float8 AS monthly_revenue
         FROM channel_analytics
         WHERE date >= CURRENT_DATE - 30 AND date <= CURRENT_DATE - 2
         GROUP BY channel_id
       ) ca_m ON ca_m.channel_id = c.id
       WHERE c.cms_id = $1 ${andSql}
       ORDER BY c.name ASC LIMIT $${idx} OFFSET $${idx+1}`,
      [...baseParams, pageLimit, offset]
    );
    return { items: rows, total: Number(countRes?.count ?? 0), page: params.page ?? 1, limit: pageLimit };
  },

  /** Returns ALL global topics (cms_id is no longer used as filter). */
  async getTopics(_id?: string) {
    return queryMany<Topic & { channel_count: number }>(
      `SELECT t.*, COALESCE(ch.cnt, 0)::int AS channel_count
       FROM topic t
       LEFT JOIN (SELECT topic_id, COUNT(*)::int AS cnt FROM channel GROUP BY topic_id) ch
             ON ch.topic_id = t.id
       ORDER BY t.name`
    );
  },

  async createTopic(_cmsId: string, data: { name: string; dept?: string; expected_channels?: number }) {
    const id = nanoid("T");
    return queryOne<Topic>(
      `INSERT INTO topic (id, name, dept, expected_channels) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, data.name, data.dept ?? null, data.expected_channels ?? 0]
    );
  },
};
