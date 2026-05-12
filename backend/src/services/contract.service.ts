import { queryMany, queryOne } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────
// `contract_document` stores uploaded contract files (PDF scans,
// signed agreements, …). Each document optionally links to a row
// in the `contract` table via `contract_id`.
//
// Renamed from the misleading `partner_contract` in migration 011.
// ─────────────────────────────────────────────────────────────

export interface ContractDocument {
  id: string;
  partner_id: string;
  contract_id: string | null;
  contract_number: string | null;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number;
  upload_date: string;
  employee_id: string | null;
  employee_name?: string | null;
  created_at: string;
}

export interface ContractDocumentWithPartner extends ContractDocument {
  partner_name: string | null;
  contract_name?: string | null;
}

// Legacy aliases kept so existing callers (and types in old code) keep compiling.
export type PartnerContract = ContractDocument;
export type PartnerContractWithPartner = ContractDocumentWithPartner;

export const ContractService = {
  async listAll(params: {
    search?: string; employee_id?: string; partner_id?: string; contract_id?: string;
    limit?: number; offset?: number;
  } = {}): Promise<{ items: ContractDocumentWithPartner[]; total: number }> {
    const conds: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (params.search) {
      conds.push(`(cd.title ILIKE $${i} OR cd.contract_number ILIKE $${i} OR p.name ILIKE $${i})`);
      vals.push(`%${params.search}%`); i++;
    }
    if (params.employee_id) { conds.push(`cd.employee_id = $${i++}`); vals.push(params.employee_id); }
    if (params.partner_id)  { conds.push(`cd.partner_id  = $${i++}`); vals.push(params.partner_id); }
    if (params.contract_id) { conds.push(`cd.contract_id = $${i++}`); vals.push(params.contract_id); }
    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
    const limit  = Math.min(params.limit  ?? 50, 500);
    const offset = params.offset ?? 0;
    const rows = await queryMany<ContractDocumentWithPartner>(
      `SELECT cd.*, e.name AS employee_name, p.name AS partner_name, c.contract_name
       FROM   contract_document cd
       LEFT JOIN employee e ON cd.employee_id = e.id
       LEFT JOIN partner  p ON cd.partner_id  = p.id
       LEFT JOIN contract c ON cd.contract_id = c.id
       ${where}
       ORDER BY cd.upload_date DESC, cd.created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      vals
    );
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM contract_document cd
       LEFT JOIN partner p ON cd.partner_id = p.id ${where}`, vals
    );
    return { items: rows, total: Number(countRow?.count ?? 0) };
  },

  async listByPartner(partnerId: string): Promise<ContractDocument[]> {
    return queryMany<ContractDocument>(
      `SELECT cd.*, e.name AS employee_name, c.contract_name
       FROM   contract_document cd
       LEFT JOIN employee e ON cd.employee_id = e.id
       LEFT JOIN contract c ON cd.contract_id = c.id
       WHERE  cd.partner_id = $1
       ORDER BY cd.upload_date DESC, cd.created_at DESC`,
      [partnerId]
    );
  },

  async listByContract(contractId: string): Promise<ContractDocument[]> {
    return queryMany<ContractDocument>(
      `SELECT cd.*, e.name AS employee_name
       FROM   contract_document cd
       LEFT JOIN employee e ON cd.employee_id = e.id
       WHERE  cd.contract_id = $1
       ORDER BY cd.upload_date DESC, cd.created_at DESC`,
      [contractId]
    );
  },

  async create(partnerId: string, data: {
    title: string; file_name: string; file_path: string; file_size: number;
    upload_date?: string; employee_id?: string | null; contract_number?: string | null;
    contract_id?: string | null;
  }): Promise<ContractDocument> {
    const id = nanoid("CTR");
    const row = await queryOne<ContractDocument>(
      `INSERT INTO contract_document
         (id, partner_id, contract_id, contract_number, title, file_name, file_path, file_size, upload_date, employee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        id, partnerId, data.contract_id ?? null, data.contract_number ?? null,
        data.title, data.file_name, data.file_path, data.file_size,
        data.upload_date ?? new Date().toISOString().slice(0, 10),
        data.employee_id ?? null,
      ]
    );
    return row!;
  },

  async update(id: string, partnerId: string, data: {
    contract_number?: string | null; title?: string;
    upload_date?: string; employee_id?: string | null;
    contract_id?: string | null;
  }): Promise<ContractDocument> {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if ("contract_number" in data) { sets.push(`contract_number = $${idx++}`); vals.push(data.contract_number ?? null); }
    if (data.title)                { sets.push(`title = $${idx++}`);           vals.push(data.title); }
    if (data.upload_date)          { sets.push(`upload_date = $${idx++}`);     vals.push(data.upload_date); }
    if ("employee_id" in data)     { sets.push(`employee_id = $${idx++}`);     vals.push(data.employee_id ?? null); }
    if ("contract_id" in data)     { sets.push(`contract_id = $${idx++}`);     vals.push(data.contract_id ?? null); }
    if (!sets.length) return (await ContractService.listByPartner(partnerId)).find(r => r.id === id)!;
    vals.push(id, partnerId);
    const row = await queryOne<ContractDocument>(
      `UPDATE contract_document SET ${sets.join(", ")}
       WHERE id=$${idx} AND partner_id=$${idx+1} RETURNING *`,
      vals
    );
    return row!;
  },

  async delete(id: string, partnerId: string): Promise<void> {
    const row = await queryOne<ContractDocument>(
      `DELETE FROM contract_document WHERE id=$1 AND partner_id=$2 RETURNING file_path`,
      [id, partnerId]
    );
    if (row?.file_path) {
      try { fs.unlinkSync(path.resolve(row.file_path)); } catch { /* ignore if file already gone */ }
    }
  },
};
