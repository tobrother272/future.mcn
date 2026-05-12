import { queryMany, queryOne } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";
import fs from "fs";
import path from "path";

export interface PolicyImage {
  path: string;
  caption: string;
}

export interface Policy {
  id: string;
  name: string;
  content: string;
  application: string;
  images: PolicyImage[];
  topic_ids: string[];
  created_at: string;
  updated_at: string;
}

/** Normalise whatever is stored in DB → PolicyImage[].
 *  Handles legacy string[] and new {path,caption}[] transparently. */
function normaliseImages(raw: unknown): PolicyImage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return { path: item, caption: "" };
    if (item && typeof item === "object" && "path" in item) {
      return { path: String((item as Record<string,unknown>).path ?? ""), caption: String((item as Record<string,unknown>).caption ?? "") };
    }
    return { path: String(item), caption: "" };
  });
}

export const PolicyService = {
  async list(params: { search?: string; topic_id?: string; limit?: number; offset?: number } = {}): Promise<{ items: Policy[]; total: number }> {
    const vals: unknown[] = [];
    const clauses: string[] = [];
    if (params.search) {
      vals.push(`%${params.search}%`);
      clauses.push(`(name ILIKE $${vals.length} OR application ILIKE $${vals.length})`);
    }
    if (params.topic_id) {
      vals.push(params.topic_id);
      clauses.push(`$${vals.length} = ANY(topic_ids)`);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const limit  = Math.min(params.limit  ?? 50, 200);
    const offset = params.offset ?? 0;
    const rows = await queryMany<Policy>(
      `SELECT * FROM policy ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      vals
    );
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM policy ${where}`, vals
    );
    return {
      items: rows.map((r) => ({ ...r, images: normaliseImages(r.images), topic_ids: r.topic_ids ?? [] })),
      total: Number(countRow?.count ?? 0),
    };
  },

  async getById(id: string): Promise<Policy | null> {
    const row = await queryOne<Policy>(`SELECT * FROM policy WHERE id=$1`, [id]);
    if (!row) return null;
    return { ...row, images: normaliseImages(row.images), topic_ids: row.topic_ids ?? [] };
  },

  async create(data: { name: string; content?: string; application?: string; images?: PolicyImage[]; topic_ids?: string[] }): Promise<Policy> {
    const id = nanoid("POL");
    const row = await queryOne<Policy>(
      `INSERT INTO policy (id, name, content, application, images, topic_ids)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, data.name, data.content ?? "", data.application ?? "",
       JSON.stringify(data.images ?? []), data.topic_ids ?? []]
    );
    return { ...row!, images: normaliseImages(row!.images), topic_ids: row!.topic_ids ?? [] };
  },

  async update(id: string, data: { name?: string; content?: string; application?: string; images?: PolicyImage[]; topic_ids?: string[] }): Promise<Policy | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (data.name        !== undefined) { sets.push(`name=$${i++}`);        vals.push(data.name); }
    if (data.content     !== undefined) { sets.push(`content=$${i++}`);     vals.push(data.content); }
    if (data.application !== undefined) { sets.push(`application=$${i++}`); vals.push(data.application); }
    if (data.images      !== undefined) { sets.push(`images=$${i++}`);      vals.push(JSON.stringify(data.images)); }
    if (data.topic_ids   !== undefined) { sets.push(`topic_ids=$${i++}`);   vals.push(data.topic_ids); }
    if (!sets.length) return PolicyService.getById(id);
    sets.push(`updated_at=NOW()`);
    vals.push(id);
    const row = await queryOne<Policy>(
      `UPDATE policy SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`,
      vals
    );
    if (!row) return null;
    return { ...row, images: normaliseImages(row.images), topic_ids: row.topic_ids ?? [] };
  },

  async addImages(id: string, newImages: PolicyImage[]): Promise<Policy | null> {
    const current = await PolicyService.getById(id);
    if (!current) return null;
    const merged = [...current.images, ...newImages];
    return PolicyService.update(id, { images: merged });
  },

  /** Update captions / reorder — replaces the entire images array */
  async setImages(id: string, images: PolicyImage[]): Promise<Policy | null> {
    return PolicyService.update(id, { images });
  },

  async removeImage(id: string, imagePath: string): Promise<Policy | null> {
    const current = await PolicyService.getById(id);
    if (!current) return null;
    const remaining = current.images.filter((p) => p.path !== imagePath);
    try { fs.unlinkSync(path.resolve(imagePath)); } catch { /* ignore */ }
    return PolicyService.update(id, { images: remaining });
  },

  async delete(id: string): Promise<void> {
    const current = await PolicyService.getById(id);
    if (current) {
      for (const img of current.images) {
        try { fs.unlinkSync(path.resolve(img.path)); } catch { /* ignore */ }
      }
    }
    await queryOne(`DELETE FROM policy WHERE id=$1`, [id]);
  },
};
