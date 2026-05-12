import bcrypt from "bcrypt";
import { query, queryOne, queryMany } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";
import { NotFoundError } from "../lib/errors.js";

export type EmployeeRole = "QC" | "Cấp Kênh" | "Kế Toán";

export interface Employee {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  role: EmployeeRole | null;
  status: string;
  created_at: string;
  updated_at: string;
  // joined
  contract_count?: number;
}

export const EmployeeService = {
  async list(params: { status?: string; search?: string; limit?: number; offset?: number } = {}) {
    const and: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (params.status) { and.push(`e.status = $${idx++}`); vals.push(params.status); }
    if (params.search) { and.push(`(e.name ILIKE $${idx++} OR e.email ILIKE $${idx-1} OR e.username ILIKE $${idx-1})`); vals.push(`%${params.search}%`); }
    const where = and.length ? `WHERE ${and.join(" AND ")}` : "";
    const limit  = Math.min(500, params.limit ?? 100);
    const offset = params.offset ?? 0;

    const total = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM employee e ${where}`, vals
    );
    const rows = await queryMany<Employee>(
      `SELECT e.id, e.name, e.email, e.phone, e.username, e.role, e.status, e.created_at, e.updated_at,
              COALESCE(cd.cnt, 0)::int AS contract_count
       FROM employee e
       LEFT JOIN (SELECT employee_id, COUNT(*)::int AS cnt FROM contract_document GROUP BY employee_id) cd
             ON cd.employee_id = e.id
       ${where} ORDER BY e.name ASC LIMIT $${idx} OFFSET $${idx+1}`,
      [...vals, limit, offset]
    );
    return { items: rows, total: Number(total?.count ?? 0) };
  },

  async getById(id: string) {
    const row = await queryOne<Employee>(
      `SELECT e.id, e.name, e.email, e.phone, e.username, e.role, e.status, e.created_at, e.updated_at,
              COALESCE(cd.cnt, 0)::int AS contract_count
       FROM employee e
       LEFT JOIN (SELECT employee_id, COUNT(*)::int AS cnt FROM contract_document GROUP BY employee_id) cd
             ON cd.employee_id = e.id
       WHERE e.id = $1`, [id]
    );
    if (!row) throw new NotFoundError("Employee not found");
    return row;
  },

  async create(data: { name: string; email?: string; phone?: string; username?: string; password?: string; role?: EmployeeRole; status?: string }) {
    const id = nanoid("EMP");
    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    return queryOne<Employee>(
      `INSERT INTO employee (id, name, email, phone, username, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, name, email, phone, username, role, status, created_at, updated_at`,
      [id, data.name, data.email ?? null, data.phone ?? null,
       data.username ?? null, passwordHash,
       data.role ?? null, data.status ?? "Active"]
    );
  },

  async update(id: string, data: { name?: string; email?: string; phone?: string; username?: string; password?: string; role?: EmployeeRole; status?: string }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (data.name     !== undefined) { sets.push(`name = $${idx++}`);          vals.push(data.name); }
    if (data.email    !== undefined) { sets.push(`email = $${idx++}`);         vals.push(data.email || null); }
    if (data.phone    !== undefined) { sets.push(`phone = $${idx++}`);         vals.push(data.phone || null); }
    if (data.username !== undefined) { sets.push(`username = $${idx++}`);      vals.push(data.username || null); }
    if (data.role     !== undefined) { sets.push(`role = $${idx++}`);          vals.push(data.role || null); }
    if (data.status   !== undefined) { sets.push(`status = $${idx++}`);        vals.push(data.status); }
    if (data.password)               { sets.push(`password_hash = $${idx++}`); vals.push(await bcrypt.hash(data.password, 10)); }

    if (!sets.length) return EmployeeService.getById(id);
    sets.push(`updated_at = now()`);
    vals.push(id);
    return queryOne<Employee>(
      `UPDATE employee SET ${sets.join(", ")} WHERE id = $${idx}
       RETURNING id, name, email, phone, username, role, status, created_at, updated_at`,
      vals
    );
  },

  async delete(id: string) {
    await query(`DELETE FROM employee WHERE id = $1`, [id]);
    return { ok: true };
  },
};
