import { query, queryOne, queryMany } from "../db/helpers.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";
import { hashPassword } from "../lib/password.js";

interface Partner {
  id: string; name: string;
  company_name: string | null; contact_name: string | null; website: string | null;
  email: string | null; phone: string | null;
  type: string; tier: string; rev_share: number; dept: string | null;
  status: string; notes: string | null;
  parent_id: string | null;
  created_at: string; updated_at: string;
}

interface PartnerUser {
  id: string; partner_id: string | null; email: string; full_name: string;
  phone: string | null; status: string; approved_by: string | null;
  approved_at: string | null; last_login: string | null; created_at: string;
}

/** Common SELECT columns when reading partner accounts from the unified `account` table. */
const PARTNER_USER_COLS = `
  id, partner_id, email, full_name, phone,
  status, approved_by, approved_at, last_login, created_at
`;

export const PartnerService = {
  async list(filters: { type?: string; tier?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const andClauses: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (filters.type)   { andClauses.push(`p.type=$${idx++}`);       vals.push(filters.type); }
    if (filters.tier)   { andClauses.push(`p.tier=$${idx++}`);       vals.push(filters.tier); }
    if (filters.status) { andClauses.push(`p.status=$${idx++}`);     vals.push(filters.status); }
    if (filters.search) { andClauses.push(`p.name ILIKE $${idx++}`); vals.push(`%${filters.search}%`); }

    const where = andClauses.length ? `WHERE ${andClauses.join(" AND ")}` : "";
    const pageLimit = Math.min(500, filters.limit ?? 50);
    const offset = (Math.max(1, filters.page ?? 1) - 1) * pageLimit;
    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM partner p LEFT JOIN partner pp ON p.parent_id = pp.id ${where}`, vals
    );
    const rows = await queryMany<Partner & { parent_name: string | null; channel_count: number; total_revenue: number }>(
      `SELECT p.*, pp.name AS parent_name,
              COALESCE(ch.cnt,  0)::int     AS channel_count,
              COALESCE(ch.rev,  0)::float8  AS total_revenue
       FROM partner p
       LEFT JOIN partner pp ON p.parent_id = pp.id
       LEFT JOIN (
         SELECT partner_id,
                COUNT(*)::int            AS cnt,
                SUM(monthly_revenue)     AS rev
         FROM channel
         GROUP BY partner_id
       ) ch ON ch.partner_id = p.id
       ${where} ORDER BY p.name ASC LIMIT $${idx} OFFSET $${idx+1}`,
      [...vals, pageLimit, offset]
    );
    return { items: rows, total: Number(countRes?.count ?? 0), page: filters.page ?? 1, limit: pageLimit };
  },

  async getById(id: string) {
    const p = await queryOne<Partner>(`SELECT * FROM partner WHERE id=$1`, [id]);
    if (!p) throw new NotFoundError(`Partner "${id}" not found`);
    return p;
  },

  async create(data: {
    id?: string; name: string; company_name?: string; contact_name?: string; website?: string;
    email?: string; phone?: string; type: string; tier?: string; rev_share?: number; dept?: string; notes?: string;
  }) {
    const existing = await queryOne(`SELECT id FROM partner WHERE name=$1`, [data.name]);
    if (existing) throw new ConflictError(`Partner "${data.name}" already exists`);
    const id = data.id ?? nanoid("P");
    const p = await queryOne<Partner>(
      `INSERT INTO partner (id,name,company_name,contact_name,website,email,phone,type,tier,rev_share,dept,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        id, data.name,
        data.company_name ?? null, data.contact_name ?? null, data.website ?? null,
        data.email ?? null, data.phone ?? null,
        data.type ?? "AFFILIATE", data.tier ?? "Standard", data.rev_share ?? 70,
        data.dept ?? null, data.notes ?? null,
      ]
    );
    return p!;
  },

  async setParent(id: string, parentId: string | null) {
    await PartnerService.getById(id);
    if (parentId) {
      const parent = await PartnerService.getById(parentId);
      // Enforce max 2 levels: parent must not itself have a parent
      if (parent.parent_id) throw new Error("Chỉ hỗ trợ tối đa 2 cấp (cha → con)");
      // Prevent self-reference
      if (parentId === id) throw new Error("Không thể đặt đối tác làm cha của chính nó");
    }
    return queryOne<Partner>(
      `UPDATE partner SET parent_id=$1, updated_at=now() WHERE id=$2 RETURNING *`,
      [parentId, id]
    );
  },

  async update(id: string, data: Partial<Pick<Partner,"name"|"company_name"|"contact_name"|"website"|"email"|"phone"|"type"|"tier"|"rev_share"|"dept"|"status"|"notes"|"parent_id">>) {
    await PartnerService.getById(id);
    const allowed = ["name","company_name","contact_name","website","email","phone","type","tier","rev_share","dept","status","notes","parent_id"];
    const sets: string[] = []; const vals: unknown[] = []; let idx = 1;
    for (const [k,v] of Object.entries(data)) {
      if (!allowed.includes(k) || v === undefined) continue;
      sets.push(`${k}=$${idx++}`); vals.push(v);
    }
    if (!sets.length) return PartnerService.getById(id);
    vals.push(id);
    return queryOne<Partner>(`UPDATE partner SET ${sets.join(",")} WHERE id=$${idx} RETURNING *`, vals);
  },

  async delete(id: string) {
    await PartnerService.getById(id);
    await query(`DELETE FROM partner WHERE id=$1`, [id]);
    return { ok: true };
  },

  async getProfile(id: string) {
    const partner = await PartnerService.getById(id);
    const [channels, contracts, users, revenue, children] = await Promise.all([
      queryMany(`SELECT id,name,status,monetization,monthly_revenue,subscribers FROM channel WHERE partner_id=$1`, [id]),
      queryMany(`SELECT id,contract_name,type,status,start_date,end_date,rev_share FROM contract WHERE partner_id=$1`, [id]),
      queryMany(
        `SELECT id,email,full_name,status,last_login FROM account
         WHERE account_type='partner' AND partner_id=$1`, [id]
      ),
      queryOne<{ total: string }>(
        `SELECT COALESCE(SUM(monthly_revenue),0)::text AS total FROM channel WHERE partner_id=$1`, [id]
      ),
      queryMany<Partner>(
        `SELECT p.*, pp.name AS parent_name FROM partner p LEFT JOIN partner pp ON p.parent_id = pp.id WHERE p.parent_id=$1 ORDER BY p.name`, [id]
      ),
    ]);
    return { ...partner, channels, contracts, users, children, total_revenue: Number(revenue?.total ?? 0) };
  },

  // ── Partner Users (stored in `account` with account_type='partner') ───
  async listPendingUsers() {
    return queryMany<PartnerUser>(
      `SELECT ${PARTNER_USER_COLS.split(",").map(c => `a.${c.trim()}`).join(",")},
              p.name AS partner_name
       FROM account a
       LEFT JOIN partner p ON a.partner_id = p.id
       WHERE a.account_type='partner' AND a.status='PendingApproval'
       ORDER BY a.created_at ASC`
    );
  },

  async getUser(userId: string) {
    const u = await queryOne<PartnerUser>(
      `SELECT ${PARTNER_USER_COLS} FROM account
       WHERE id=$1 AND account_type='partner'`,
      [userId]
    );
    if (!u) throw new NotFoundError("Partner user not found");
    return u;
  },

  /**
   * Approve a partner user: create or link partner record, set status=Active.
   * Mirrors v5.1 auto-link logic.
   */
  async approveUser(userId: string, approvedBy: string, partnerId?: string) {
    const user = await PartnerService.getUser(userId);

    // If partnerId not supplied, try to auto-match by company_name
    let resolvedPartnerId = partnerId ?? user.partner_id;
    if (!resolvedPartnerId) {
      const setting = await queryOne<{ value: { company_name: string } }>(
        `SELECT value FROM setting WHERE key=$1`, [`pending_company_${userId}`]
      );
      const companyName = setting?.value?.company_name;
      if (companyName) {
        const existing = await queryOne<{ id: string }>(
          `SELECT id FROM partner WHERE name ILIKE $1`, [companyName]
        );
        if (existing) {
          resolvedPartnerId = existing.id;
        } else {
          // Auto-create partner
          const newPartner = await PartnerService.create({ name: companyName, type: "AFFILIATE" });
          resolvedPartnerId = newPartner.id;
        }
      }
    }

    const updated = await queryOne<PartnerUser>(
      `UPDATE account SET status='Active', partner_id=$1, approved_by=$2, approved_at=NOW()
       WHERE id=$3 AND account_type='partner'
       RETURNING ${PARTNER_USER_COLS}`,
      [resolvedPartnerId ?? null, approvedBy, userId]
    );
    await query(`DELETE FROM setting WHERE key=$1`, [`pending_company_${userId}`]);
    return updated!;
  },

  async rejectUser(userId: string, approvedBy: string) {
    const u = await queryOne<PartnerUser>(
      `UPDATE account SET status='Rejected', approved_by=$1, approved_at=NOW()
       WHERE id=$2 AND account_type='partner'
       RETURNING ${PARTNER_USER_COLS}`,
      [approvedBy, userId]
    );
    if (!u) throw new NotFoundError("Partner user not found");
    return u;
  },

  async createUser(data: { partner_id?: string; email: string; full_name: string; phone?: string; password: string }) {
    const existing = await queryOne(
      `SELECT id FROM account WHERE account_type='partner' AND lower(email)=lower($1)`,
      [data.email]
    );
    if (existing) throw new ConflictError("Email already registered");
    const id = nanoid("PU");
    const hash = await hashPassword(data.password);
    return queryOne<PartnerUser>(
      `INSERT INTO account (id,account_type,partner_id,email,full_name,phone,password_hash,status)
       VALUES ($1,'partner',$2,$3,$4,$5,$6,'Active')
       RETURNING ${PARTNER_USER_COLS}`,
      [id, data.partner_id ?? null, data.email.toLowerCase(), data.full_name, data.phone ?? null, hash]
    );
  },

  async autoSync(id: string) {
    // Heal partner-channel relationships: set null cms_ids, fix orphaned channels
    const res = await query(
      `UPDATE channel SET status='Suspended' WHERE partner_id=$1 AND status='Active'
       AND NOT EXISTS (SELECT 1 FROM partner WHERE id=$1 AND status='Active')`,
      [id]
    );
    return { healed: res.rowCount ?? 0 };
  },
};
