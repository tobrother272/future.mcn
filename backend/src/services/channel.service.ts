import { query, queryOne, queryMany, buildPagination } from "../db/helpers.js";
import { NotFoundError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";
import { appendChannelSearchFilter } from "../lib/channel-search.js";

export interface Channel {
  id: string; cms_id: string | null; partner_id: string | null; topic_id: string | null;
  yt_id: string | null; name: string; country: string;
  status: string; monetization: string; health: string;
  strikes: number; subscribers: number; monthly_views: number; total_views: number; video: number; monthly_revenue: number;
  link_date: string | null;
  is_unlinked: boolean;
  unlinked_at: string | null;
  unlink_reason: string | null;
  notes: string | null; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
}

interface ChannelFilters {
  cms_id?: string; partner_id?: string; topic_id?: string; content_owner?: string;
  status?: string; monetization?: string; health?: string;
  search?: string;
  min_views?: number; max_views?: number;
  min_revenue?: number; max_revenue?: number;
  page?: number; limit?: number;
  sortBy?: string; sortDir?: "asc" | "desc";
  cms_ids?: string[];
  partner_ids?: string[];
}


export const ChannelService = {
  async list(filters: ChannelFilters) {
    const andClauses: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    // Nếu có cms_ids (scope của employee), ưu tiên dùng thay cho cms_id đơn lẻ
    if (filters.cms_ids && filters.cms_ids.length > 0) {
      const placeholders = filters.cms_ids.map(() => `$${idx++}`).join(", ");
      andClauses.push(`c.cms_id IN (${placeholders})`);
      vals.push(...filters.cms_ids);
    } else if (filters.cms_id) {
      andClauses.push(`c.cms_id=$${idx++}`);
      vals.push(filters.cms_id);
    }
    if (filters.partner_id) { andClauses.push(`c.partner_id=$${idx++}`);     vals.push(filters.partner_id); }
    // partner_ids dùng để scope channel list cho partner user (không cho pass partner_id ngoài phạm vi)
    if (filters.partner_ids && filters.partner_ids.length > 0 && !filters.partner_id) {
      const ph = filters.partner_ids.map(() => `$${idx++}`).join(", ");
      andClauses.push(`c.partner_id IN (${ph})`);
      vals.push(...filters.partner_ids);
    }
    if (filters.topic_id)   { andClauses.push(`c.topic_id=$${idx++}`);       vals.push(filters.topic_id); }
    if (filters.content_owner) { andClauses.push(`c.content_owner=$${idx++}`); vals.push(filters.content_owner); }
    if (filters.status)     { andClauses.push(`c.status=$${idx++}`);         vals.push(filters.status); }
    if (filters.monetization){ andClauses.push(`c.monetization=$${idx++}`);  vals.push(filters.monetization); }
    if (filters.health)     { andClauses.push(`c.health=$${idx++}`);         vals.push(filters.health); }
    if (filters.search) {
      const { sql, nextIdx } = appendChannelSearchFilter(filters.search, idx, vals);
      andClauses.push(sql);
      idx = nextIdx;
    }
    // range views
    if (filters.min_views != null) { andClauses.push(`c.monthly_views >= $${idx++}`); vals.push(filters.min_views); }
    if (filters.max_views != null) { andClauses.push(`c.monthly_views <= $${idx++}`); vals.push(filters.max_views); }
    // range revenue — computed from channel_analytics via JOIN
    if (filters.min_revenue != null) { andClauses.push(`COALESCE(ca_m.monthly_revenue, 0) >= $${idx++}`); vals.push(filters.min_revenue); }
    if (filters.max_revenue != null) { andClauses.push(`COALESCE(ca_m.monthly_revenue, 0) <= $${idx++}`); vals.push(filters.max_revenue); }

    const where = andClauses.length ? `WHERE ${andClauses.join(" AND ")}` : "";

    // Build ORDER BY: monthly_revenue must reference the JOIN alias explicitly
    // to avoid ambiguity with c.monthly_revenue from c.*
    const sortBy  = filters.sortBy ?? "name";
    const safeDir = filters.sortDir === "asc" ? "ASC" : "DESC";
    const allowedCols = ["name","subscribers","monthly_views","total_views","last_revenue","created_at","updated_at"];
    let orderExpr: string;
    if (sortBy === "monthly_revenue") {
      orderExpr = `COALESCE(ca_m.monthly_revenue, 0) ${safeDir}`;
    } else if (sortBy === "last_revenue") {
      orderExpr = `c.last_revenue ${safeDir}`;
    } else {
      const safeCol = allowedCols.includes(sortBy) ? sortBy : "name";
      orderExpr = `c.${safeCol} ${safeDir}`;
    }
    const pageLimit = Math.min(500, filters.limit ?? 50);
    const pageOffset = (Math.max(1, filters.page ?? 1) - 1) * pageLimit;
    const pagSql = `ORDER BY ${orderExpr} LIMIT $${idx} OFFSET $${idx + 1}`;
    const pagParams = [pageLimit, pageOffset];

    // Subquery to compute 28-day revenue from channel_analytics
    // Use CURRENT_DATE - 30 (= 28 + 2) to mirror the analytics endpoint's
    // date window, which adds +2 to compensate for YouTube's 2-day data lag.
    const caMonthJoin = `LEFT JOIN (
       SELECT channel_id, COALESCE(SUM(revenue), 0)::float8 AS monthly_revenue
       FROM channel_analytics
       WHERE date >= CURRENT_DATE - 30 AND date <= CURRENT_DATE - 2
       GROUP BY channel_id
     ) ca_m ON ca_m.channel_id = c.id`;

    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM channel c
       LEFT JOIN topic t ON c.topic_id = t.id
       ${caMonthJoin}
       ${where}`, vals
    );
    const rows = await queryMany<Channel & { cms_name?: string; partner_name?: string; topic_name?: string }>(
      `SELECT c.*,
              COALESCE(ca_m.monthly_revenue, 0)::float8 AS monthly_revenue,
              cm.name AS cms_name,
              p.name  AS partner_name,
              t.name  AS topic_name
       FROM channel c
       LEFT JOIN cms cm     ON c.cms_id     = cm.id
       LEFT JOIN partner p  ON c.partner_id = p.id
       LEFT JOIN topic t    ON c.topic_id   = t.id
       ${caMonthJoin}
       ${where} ${pagSql}`,
      [...vals, ...pagParams]
    );
    return {
      items: rows,
      total: Number(countRes?.count ?? 0),
      page: filters.page ?? 1,
      limit: filters.limit ?? 50,
    };
  },

  async getById(id: string) {
    const ch = await queryOne<Channel & { cms_name?: string; partner_name?: string }>(
      `SELECT c.*,
              cm.name AS cms_name,
              p.name  AS partner_name,
              t.name  AS topic_name,
              COALESCE(ca_m.monthly_revenue, c.monthly_revenue, 0)::float8 AS monthly_revenue
       FROM channel c
       LEFT JOIN cms cm     ON c.cms_id     = cm.id
       LEFT JOIN partner p  ON c.partner_id = p.id
       LEFT JOIN topic t    ON c.topic_id   = t.id
       LEFT JOIN (
         SELECT channel_id, COALESCE(SUM(revenue), 0)::float8 AS monthly_revenue
         FROM channel_analytics
         WHERE date >= CURRENT_DATE - 30
           AND date <= CURRENT_DATE - 2
         GROUP BY channel_id
       ) ca_m ON ca_m.channel_id = c.id
       WHERE c.id = $1`,
      [id]
    );
    if (!ch) throw new NotFoundError(`Channel "${id}" not found`);
    return ch;
  },

  async create(data: {
    cms_id?: string; partner_id?: string; topic_id?: string; yt_id?: string;
    name: string; country?: string; status?: string; monetization?: string; notes?: string;
    subscribers?: number; monthly_views?: number; total_views?: number; video?: number; monthly_revenue?: number;
    link_date?: string | null;
    metadata?: Record<string, unknown>;
    email_access?: string;
    password_enc?: string;
  }) {
    const id = nanoid("C");
    const ch = await queryOne<Channel>(
      `INSERT INTO channel (id,cms_id,partner_id,topic_id,yt_id,name,country,status,monetization,
         subscribers,monthly_views,total_views,video,monthly_revenue,link_date,notes,metadata,
         email_access,password_enc)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
      [
        id, data.cms_id ?? null, data.partner_id ?? null, data.topic_id ?? null,
        data.yt_id?.trim() || null, data.name, data.country ?? "VN",
        data.status ?? "Active", data.monetization ?? "Pending",
        data.subscribers ?? 0, data.monthly_views ?? 0, data.total_views ?? 0,
        data.video ?? 0, data.monthly_revenue ?? 0, data.link_date ?? null,
        data.notes ?? null, JSON.stringify(data.metadata ?? {}),
        data.email_access ?? null, data.password_enc ?? null,
      ]
    );
    return ch!;
  },

  async update(id: string, data: Partial<{
    cms_id: string; partner_id: string; topic_id: string; yt_id: string;
    name: string; country: string; status: string; monetization: string; health: string;
    strikes: number; subscribers: number; monthly_views: number; total_views: number; video: number;
    monthly_revenue: number; link_date: string | null; notes: string; metadata: Record<string, unknown>;
    is_unlinked: boolean; unlinked_at: string | null; unlink_reason: string | null;
  }>) {
    await ChannelService.getById(id);
    const normalized: Record<string, unknown> = { ...data };
    if (Object.prototype.hasOwnProperty.call(normalized, "cms_id")) {
      const isUnlink = normalized.cms_id === null || normalized.cms_id === "";
      if (isUnlink) {
        normalized.is_unlinked = true;
        normalized.unlinked_at = normalized.unlinked_at ?? new Date().toISOString();
        normalized.unlink_reason = normalized.unlink_reason ?? "manual_unlink";
        if (!Object.prototype.hasOwnProperty.call(normalized, "status")) normalized.status = "Terminated";
        if (!Object.prototype.hasOwnProperty.call(normalized, "monetization")) normalized.monetization = "Off";
      } else {
        normalized.is_unlinked = false;
        normalized.unlinked_at = null;
        normalized.unlink_reason = null;
      }
    }

    const allowed = ["cms_id","partner_id","topic_id","yt_id","name","country","status",
                     "monetization","health","strikes","subscribers","monthly_views","total_views",
                     "video","monthly_revenue","link_date","notes","metadata",
                     "is_unlinked","unlinked_at","unlink_reason"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(normalized)) {
      if (!allowed.includes(k) || v === undefined) continue;
      sets.push(`${k}=$${idx++}`);
      vals.push(k === "metadata" ? JSON.stringify(v) : v);
    }
    if (!sets.length) return ChannelService.getById(id);
    vals.push(id);
    const ch = await queryOne<Channel>(
      `UPDATE channel SET ${sets.join(",")} WHERE id=$${idx} RETURNING *`, vals
    );
    return ch!;
  },

  async delete(id: string) {
    await ChannelService.getById(id);
    await query(`DELETE FROM channel WHERE id=$1`, [id]);
    return { ok: true };
  },

  async bulkDelete(ids: string[]) {
    if (!ids.length) return { deleted: 0 };
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
    const rows = await queryMany<{ id: string }>(
      `DELETE FROM channel WHERE id IN (${placeholders}) RETURNING id`,
      ids
    );
    return { deleted: rows.length };
  },

  async bulkEdit(ids: string[], updates: Record<string, unknown>) {
    if (!ids.length) return { count: 0 };
    const normalized: Record<string, unknown> = { ...updates };
    if (Object.prototype.hasOwnProperty.call(normalized, "cms_id")) {
      const isUnlink = normalized.cms_id === null || normalized.cms_id === "";
      if (isUnlink) {
        normalized.is_unlinked = true;
        normalized.unlinked_at = new Date().toISOString();
        normalized.unlink_reason = "manual_unlink";
        if (!Object.prototype.hasOwnProperty.call(normalized, "status")) normalized.status = "Terminated";
        if (!Object.prototype.hasOwnProperty.call(normalized, "monetization")) normalized.monetization = "Off";
      } else {
        normalized.is_unlinked = false;
        normalized.unlinked_at = null;
        normalized.unlink_reason = null;
      }
    }

    const allowed = ["status","monetization","health","cms_id","partner_id","topic_id","content_owner","is_unlinked","unlinked_at","unlink_reason"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(normalized)) {
      if (!allowed.includes(k) || v === undefined) continue;
      sets.push(`${k}=$${idx++}`);
      vals.push(v);
    }
    if (!sets.length) return { count: 0 };
    const placeholders = ids.map((_, i) => `$${idx + i}`).join(",");
    const res = await query(
      `UPDATE channel SET ${sets.join(",")} WHERE id IN (${placeholders})`,
      [...vals, ...ids]
    );
    return { count: res.rowCount ?? 0 };
  },

  async bulkImport(rows: Array<{
    cms_id?: string; partner_id?: string; topic_id?: string; yt_id?: string;
    name: string; country?: string; status?: string; monetization?: string; notes?: string;
    subscribers?: number; monthly_views?: number; monthly_revenue?: number;
  }>) {
    const created: string[] = [];
    const updated: string[] = [];
    const errors: Array<{ row: number; message: string }> = [];

    for (const [i, row] of rows.entries()) {
      if (!row.name?.trim()) {
        errors.push({ row: i + 1, message: "Tên kênh không được trống" });
        continue;
      }
      try {
        // Upsert by yt_id if provided, otherwise always insert
        if (row.yt_id) {
          const existing = await queryOne<{ id: string }>(
            `SELECT id FROM channel WHERE yt_id = $1`, [row.yt_id]
          );
          if (existing) {
            await query(
              `UPDATE channel SET name=$1, cms_id=COALESCE($2, cms_id),
               status=COALESCE($3, status), monetization=COALESCE($4, monetization),
               subscribers=COALESCE($5, subscribers), monthly_views=COALESCE($6, monthly_views),
               monthly_revenue=COALESCE($7, monthly_revenue), updated_at=NOW()
               WHERE id=$8`,
              [row.name, row.cms_id ?? null, row.status ?? null, row.monetization ?? null,
               row.subscribers ?? null, row.monthly_views ?? null, row.monthly_revenue ?? null,
               existing.id]
            );
            updated.push(existing.id);
            continue;
          }
        }
        const ch = await ChannelService.create(row);
        created.push(ch.id);
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : String(err) });
      }
    }
    return { created: created.length, updated: updated.length, errors };
  },

  async getRevenue(id: string, days = 30) {
    await ChannelService.getById(id);
    return queryMany(
      `SELECT * FROM revenue_daily
       WHERE scope='channel' AND scope_id=$1 AND snapshot_date >= CURRENT_DATE - ($2::int)
       ORDER BY snapshot_date ASC`,
      [id, days]
    );
  },

  async getViolations(id: string) {
    await ChannelService.getById(id);
    return queryMany(
      `SELECT * FROM violation WHERE channel_id=$1 ORDER BY detected_date DESC`,
      [id]
    );
  },

  async getSubmissions(id: string) {
    await ChannelService.getById(id);
    return queryMany(
      `SELECT s.*, a.full_name AS submitter_name, a.email AS submitter_email
       FROM submission s
       LEFT JOIN account a ON s.partner_user_id = a.id AND a.account_type='partner'
       WHERE s.channel_id=$1 ORDER BY s.submitted_at DESC`,
      [id]
    );
  },
};
