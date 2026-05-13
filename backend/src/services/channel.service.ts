import { query, queryOne, queryMany, buildPagination } from "../db/helpers.js";
import { NotFoundError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";

export interface Channel {
  id: string; cms_id: string | null; partner_id: string | null; topic_id: string | null;
  yt_id: string | null; name: string; country: string;
  status: string; monetization: string; health: string;
  strikes: number; subscribers: number; monthly_views: number; total_views: number; video: number; monthly_revenue: number;
  link_date: string | null;
  notes: string | null; metadata: Record<string, unknown>;
  created_at: string; updated_at: string;
}

interface ChannelFilters {
  cms_id?: string; partner_id?: string; topic_id?: string;
  status?: string; monetization?: string; health?: string;
  search?: string;
  page?: number; limit?: number;
  sortBy?: string; sortDir?: "asc" | "desc";
  /** Giới hạn chỉ lấy kênh thuộc các CMS này (dùng cho Admin/Cấp Kênh employee). */
  cms_ids?: string[];
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
    if (filters.topic_id)   { andClauses.push(`c.topic_id=$${idx++}`);       vals.push(filters.topic_id); }
    if (filters.status)     { andClauses.push(`c.status=$${idx++}`);         vals.push(filters.status); }
    if (filters.monetization){ andClauses.push(`c.monetization=$${idx++}`);  vals.push(filters.monetization); }
    if (filters.health)     { andClauses.push(`c.health=$${idx++}`);         vals.push(filters.health); }
    if (filters.search)     { andClauses.push(`c.name ILIKE $${idx++}`);     vals.push(`%${filters.search}%`); }

    const where = andClauses.length ? `WHERE ${andClauses.join(" AND ")}` : "";

    const allowed = ["name","monthly_revenue","subscribers","monthly_views","created_at","updated_at"];
    const { sql: pagSql, params: pagParams } = buildPagination(
      filters.page, filters.limit, idx,
      filters.sortBy ?? "name", filters.sortDir ?? "asc", allowed
    );

    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM channel c ${where}`, vals
    );
    const rows = await queryMany<Channel & { cms_name?: string; partner_name?: string; topic_name?: string }>(
      `SELECT c.*,
              cm.name AS cms_name,
              p.name  AS partner_name,
              t.name  AS topic_name
       FROM channel c
       LEFT JOIN cms cm     ON c.cms_id     = cm.id
       LEFT JOIN partner p  ON c.partner_id = p.id
       LEFT JOIN topic t    ON c.topic_id   = t.id
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
      `SELECT c.*, cm.name AS cms_name, p.name AS partner_name, t.name AS topic_name
       FROM channel c
       LEFT JOIN cms cm ON c.cms_id = cm.id
       LEFT JOIN partner p ON c.partner_id = p.id
       LEFT JOIN topic t ON c.topic_id = t.id
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
  }) {
    const id = nanoid("C");
    const ch = await queryOne<Channel>(
      `INSERT INTO channel (id,cms_id,partner_id,topic_id,yt_id,name,country,status,monetization,
         subscribers,monthly_views,total_views,video,monthly_revenue,link_date,notes,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        id, data.cms_id ?? null, data.partner_id ?? null, data.topic_id ?? null,
        data.yt_id?.trim() || null, data.name, data.country ?? "VN",
        data.status ?? "Active", data.monetization ?? "Pending",
        data.subscribers ?? 0, data.monthly_views ?? 0, data.total_views ?? 0,
        data.video ?? 0, data.monthly_revenue ?? 0, data.link_date ?? null,
        data.notes ?? null, JSON.stringify(data.metadata ?? {}),
      ]
    );
    return ch!;
  },

  async update(id: string, data: Partial<{
    cms_id: string; partner_id: string; topic_id: string; yt_id: string;
    name: string; country: string; status: string; monetization: string; health: string;
    strikes: number; subscribers: number; monthly_views: number; total_views: number; video: number;
    monthly_revenue: number; link_date: string | null; notes: string; metadata: Record<string, unknown>;
  }>) {
    await ChannelService.getById(id);
    const allowed = ["cms_id","partner_id","topic_id","yt_id","name","country","status",
                     "monetization","health","strikes","subscribers","monthly_views","total_views",
                     "video","monthly_revenue","link_date","notes","metadata"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
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

  async bulkEdit(ids: string[], updates: Record<string, unknown>) {
    if (!ids.length) return { count: 0 };
    const allowed = ["status","monetization","health","cms_id","partner_id","topic_id"];
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(updates)) {
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
