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
  category: string;
  content: string;
  application: string;
  images: PolicyImage[];
  topic_ids: string[];
  created_at: string;
  updated_at: string;
}

async function listCategories(): Promise<string[]> {
  const rows = await queryMany<{ name: string }>("SELECT name FROM policy_category ORDER BY id ASC", []);
  return rows.map((r) => r.name);
}

async function createCategory(name: string): Promise<string> {
  await queryOne(
    "INSERT INTO policy_category (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
    [name]
  );
  return name;
}

async function deleteCategory(name: string): Promise<void> {
  // Reset policies using this category to default
  await queryOne(
    "UPDATE policy SET category = 'Youtube Policy' WHERE category = $1",
    [name]
  );
  await queryOne("DELETE FROM policy_category WHERE name = $1", [name]);
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
  async list(params: { search?: string; topic_id?: string; category?: string; limit?: number; offset?: number } = {}): Promise<{ items: Policy[]; total: number }> {
    const vals: unknown[] = [];
    const clauses: string[] = [];

    if (params.search) {
      const tokens = params.search.trim().split(/\s+/).filter(Boolean);
      for (const token of tokens) {
        vals.push(`%${token}%`);
        const n = vals.length;
        clauses.push(
          `(unaccent(name)        ILIKE unaccent($${n})` +
          ` OR unaccent(application) ILIKE unaccent($${n})` +
          ` OR unaccent(content)     ILIKE unaccent($${n}))`
        );
      }
    }

    if (params.topic_id) {
      vals.push(params.topic_id);
      clauses.push(`$${vals.length} = ANY(topic_ids)`);
    }

    if (params.category) {
      vals.push(params.category);
      clauses.push(`category = $${vals.length}`);
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
      items: rows.map((r) => ({ ...r, images: normaliseImages(r.images), topic_ids: r.topic_ids ?? [], category: r.category ?? "Youtube Policy" })),
      total: Number(countRow?.count ?? 0),
    };
  },

  async getById(id: string): Promise<Policy | null> {
    const row = await queryOne<Policy>(`SELECT * FROM policy WHERE id=$1`, [id]);
    if (!row) return null;
    return { ...row, images: normaliseImages(row.images), topic_ids: row.topic_ids ?? [], category: row.category ?? "Youtube Policy" };
  },

  async create(data: { name: string; category?: string; content?: string; application?: string; images?: PolicyImage[]; topic_ids?: string[] }): Promise<Policy> {
    const id = nanoid("POL");
    const row = await queryOne<Policy>(
      `INSERT INTO policy (id, name, category, content, application, images, topic_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, data.name, data.category ?? "Youtube Policy", data.content ?? "", data.application ?? "",
       JSON.stringify(data.images ?? []), data.topic_ids ?? []]
    );
    return { ...row!, images: normaliseImages(row!.images), topic_ids: row!.topic_ids ?? [], category: row!.category ?? "Youtube Policy" };
  },

  async update(id: string, data: { name?: string; category?: string; content?: string; application?: string; images?: PolicyImage[]; topic_ids?: string[] }): Promise<Policy | null> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (data.name        !== undefined) { sets.push(`name=$${i++}`);        vals.push(data.name); }
    if (data.category    !== undefined) { sets.push(`category=$${i++}`);    vals.push(data.category); }
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
    return { ...row, images: normaliseImages(row.images), topic_ids: row.topic_ids ?? [], category: row.category ?? "Youtube Policy" };
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

  listCategories,
  createCategory,
  deleteCategory,
};
