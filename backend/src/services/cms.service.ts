import { query, queryOne, queryMany, buildWhere, buildPagination } from "../db/helpers.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";

interface Cms { id: string; name: string; currency: string; status: string; notes: string | null; created_at: string; updated_at: string; }
interface Topic { id: string; cms_id: string | null; name: string; dept: string | null; expected_channels: number; created_at: string; }
interface CmsStats { cms_id: string; cms_name: string; currency: string; total_channels: number; active_channels: number; monetized: number; demonetized: number; critical_channels: number; total_monthly_revenue: number; total_subscribers: number; total_monthly_views: number; partner_count: number; }

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
    await query(`DELETE FROM cms WHERE id = $1`, [id]);
    return { ok: true };
  },

  async getStats(id: string): Promise<CmsStats> {
    // Always use live query so stats reflect real-time channel updates
    const res = await queryOne<CmsStats>(
      `SELECT
         c.cms_id,
         cm.name AS cms_name, cm.currency,
         COUNT(c.id)::int                                                         AS total_channels,
         COUNT(c.id) FILTER (WHERE c.status='Active')::int                       AS active_channels,
         COUNT(c.id) FILTER (WHERE c.monetization='On')::int                     AS monetized,
         COUNT(c.id) FILTER (WHERE c.monetization='Off')::int                    AS demonetized,
         COUNT(c.id) FILTER (WHERE c.health='Critical')::int                     AS critical_channels,
         COALESCE(SUM(c.monthly_revenue),0)::float8                               AS total_monthly_revenue,
         COALESCE(SUM(c.subscribers),0)::float8                                  AS total_subscribers,
         COALESCE(SUM(c.monthly_views),0)::float8                                AS total_monthly_views,
         COUNT(DISTINCT c.partner_id) FILTER (WHERE c.partner_id IS NOT NULL)::int AS partner_count
       FROM channel c JOIN cms cm ON c.cms_id = cm.id
       WHERE c.cms_id = $1
       GROUP BY c.cms_id, cm.name, cm.currency`,
      [id]
    );
    if (!res) {
      const cms = await CmsService.getById(id);
      return { cms_id: id, cms_name: cms.name, currency: cms.currency, total_channels:0, active_channels:0, monetized:0, demonetized:0, critical_channels:0, total_monthly_revenue:0, total_subscribers:0, total_monthly_views:0, partner_count:0 };
    }
    return res;
  },

  async getRevenue(id: string, days = 30) {
    await CmsService.getById(id);
    // Aggregate from channel_analytics for all channels in this CMS
    const rows = await queryMany<{ snapshot_date: string; revenue: number; views: number; engaged_views: number; watch_time_hours: number }>(
      `SELECT
         ca.date                       AS snapshot_date,
         SUM(ca.revenue)::float8       AS revenue,
         SUM(ca.views)::float8         AS views,
         SUM(ca.engaged_views)::float8 AS engaged_views,
         SUM(ca.watch_time_hours)::float8 AS watch_time_hours
       FROM channel_analytics ca
       WHERE ca.cms_id = $1
         AND ca.date >= CURRENT_DATE - ($2::int)
       GROUP BY ca.date
       ORDER BY ca.date ASC`,
      [id, days]
    );
    // Fall back to legacy revenue_daily if no channel_analytics data
    if (rows.length > 0) return rows;
    return queryMany(
      `SELECT snapshot_date, revenue::float8 AS revenue, views::float8 AS views,
              0::float8 AS engaged_views, 0::float8 AS watch_time_hours
       FROM revenue_daily
       WHERE scope = 'cms' AND scope_id = $1
         AND snapshot_date >= CURRENT_DATE - ($2::int)
       ORDER BY snapshot_date ASC`,
      [id, days]
    );
  },

  async getChannels(id: string, params: {
    page?: number; limit?: number;
    status?: string; monetization?: string; search?: string;
    topic_id?: string; min_views?: number; min_revenue?: number;
  }) {
    await CmsService.getById(id);
    const baseParams: unknown[] = [id];
    let idx = 2;
    const andClauses: string[] = [];

    if (params.status)      { andClauses.push(`c.status = $${idx++}`);            baseParams.push(params.status); }
    if (params.monetization){ andClauses.push(`c.monetization = $${idx++}`);       baseParams.push(params.monetization); }
    if (params.search)      { andClauses.push(`c.name ILIKE $${idx++}`);           baseParams.push(`%${params.search}%`); }
    if (params.topic_id)    { andClauses.push(`c.topic_id = $${idx++}`);           baseParams.push(params.topic_id); }
    if (params.min_views != null && params.min_views > 0)   { andClauses.push(`c.monthly_views >= $${idx++}`);   baseParams.push(params.min_views); }
    if (params.min_revenue != null && params.min_revenue > 0){ andClauses.push(`c.monthly_revenue >= $${idx++}`); baseParams.push(params.min_revenue); }

    const andSql = andClauses.length ? `AND ${andClauses.join(" AND ")}` : "";
    const pageLimit = Math.min(100, params.limit ?? 50);
    const offset = (Math.max(1, params.page ?? 1) - 1) * pageLimit;

    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM channel c WHERE c.cms_id = $1 ${andSql}`,
      baseParams
    );
    const rows = await queryMany(
      `SELECT c.*, p.name AS partner_name, t.name AS topic_name
       FROM channel c
       LEFT JOIN partner p ON c.partner_id = p.id
       LEFT JOIN topic t   ON c.topic_id   = t.id
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
