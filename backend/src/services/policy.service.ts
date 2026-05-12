import { queryMany, queryOne } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";
import fs from "fs";
import path from "path";

export interface Policy {
  id: string;
  name: string;
  content: string;
  application: string;
  /** Array of stored file paths / URLs */
  images: string[];
  created_at: string;
  updated_at: string;
}

export const PolicyService = {
  async list(params: { search?: string; limit?: number; offset?: number } = {}): Promise<{ items: Policy[]; total: number }> {
    const vals: unknown[] = [];
    let where = "";
    if (params.search) {
      vals.push(`%${params.search}%`);
      where = `WHERE name ILIKE $1 OR application ILIKE $1`;
    }
    const limit  = Math.min(params.limit  ?? 50, 200);
    const offset = params.offset ?? 0;
    const rows = await queryMany<Policy>(
      `SELECT * FROM policy ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      vals
    );
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM policy ${where}`, vals
    );
    return { items: rows, total: Number(countRow?.count ?? 0) };
  },

  async getById(id: string): Promise<Policy | null> {
    return queryOne<Policy>(`SELECT * FROM policy WHERE id=$1`, [id]);
  },

  async create(data: { name: string; content?: string; application?: string; images?: string[] }): Promise<Policy> {
    const id = nanoid("POL");
    const row = await queryOne<Policy>(
      `INSERT INTO policy (id, name, content, application, images)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, data.name, data.content ?? "", data.application ?? "", JSON.stringify(data.images ?? [])]
    );
    return row!;
  },

  async update(id: string, data: { name?: string; content?: string; application?: string; images?: string[] }): Promise<Policy | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (data.name        !== undefined) { sets.push(`name=$${i++}`);        vals.push(data.name); }
    if (data.content     !== undefined) { sets.push(`content=$${i++}`);     vals.push(data.content); }
    if (data.application !== undefined) { sets.push(`application=$${i++}`); vals.push(data.application); }
    if (data.images      !== undefined) { sets.push(`images=$${i++}`);      vals.push(JSON.stringify(data.images)); }
    if (!sets.length) return PolicyService.getById(id);
    sets.push(`updated_at=NOW()`);
    vals.push(id);
    return queryOne<Policy>(
      `UPDATE policy SET ${sets.join(", ")} WHERE id=$${i} RETURNING *`,
      vals
    );
  },

  async addImages(id: string, newPaths: string[]): Promise<Policy | null> {
    const current = await PolicyService.getById(id);
    if (!current) return null;
    const merged = [...current.images, ...newPaths];
    return PolicyService.update(id, { images: merged });
  },

  async removeImage(id: string, imagePath: string): Promise<Policy | null> {
    const current = await PolicyService.getById(id);
    if (!current) return null;
    const remaining = current.images.filter((p) => p !== imagePath);
    // Delete physical file
    try { fs.unlinkSync(path.resolve(imagePath)); } catch { /* ignore */ }
    return PolicyService.update(id, { images: remaining });
  },

  async delete(id: string): Promise<void> {
    const current = await PolicyService.getById(id);
    if (current) {
      for (const img of current.images) {
        try { fs.unlinkSync(path.resolve(img)); } catch { /* ignore */ }
      }
    }
    await queryOne(`DELETE FROM policy WHERE id=$1`, [id]);
  },
};
