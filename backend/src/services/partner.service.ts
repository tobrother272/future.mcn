import { query, queryOne, queryMany } from "../db/helpers.js";
import { NotFoundError, ConflictError, ForbiddenError } from "../lib/errors.js";
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
        `SELECT COALESCE(SUM(monthly_revenue),0)::text AS total
         FROM channel WHERE partner_id IN (SELECT id FROM partner WHERE id=$1 OR parent_id=$1)`, [id]
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

  // ─────────────────────────────────────────────────────────────
  // Sub-accounts: parent partner manages 1 account per child partner
  // ─────────────────────────────────────────────────────────────

  /** List child partners + (optional) attached account info. */
  async listChildPartnersWithAccounts(parentPartnerId: string) {
    return queryMany<{
      partner_id: string;
      partner_name: string;
      partner_status: string;
      account_id: string | null;
      account_email: string | null;
      account_full_name: string | null;
      account_phone: string | null;
      account_status: string | null;
      account_last_login: string | null;
      account_created_at: string | null;
    }>(
      `SELECT p.id           AS partner_id,
              p.name         AS partner_name,
              p.status       AS partner_status,
              a.id           AS account_id,
              a.email        AS account_email,
              a.full_name    AS account_full_name,
              a.phone        AS account_phone,
              a.status       AS account_status,
              a.last_login   AS account_last_login,
              a.created_at   AS account_created_at
       FROM partner p
       LEFT JOIN account a
         ON a.account_type = 'partner'
        AND a.partner_id   = p.id
       WHERE p.parent_id = $1
       ORDER BY p.name ASC`,
      [parentPartnerId]
    );
  },

  /** Ensure `childPartnerId` is a direct child of `parentPartnerId`, else 403. */
  async assertChildOfParent(parentPartnerId: string, childPartnerId: string) {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM partner WHERE id=$1 AND parent_id=$2`,
      [childPartnerId, parentPartnerId]
    );
    if (!row) throw new ForbiddenError("Đối tác con không thuộc đối tác cha hiện tại");
  },

  /**
   * Create a partner account that is bound to a specific child partner.
   * 1-to-1: each child partner can only have a single account.
   */
  async createSubAccount(
    parentPartnerId: string,
    data: { child_partner_id: string; email: string; full_name: string; phone?: string; password: string }
  ) {
    await PartnerService.assertChildOfParent(parentPartnerId, data.child_partner_id);

    const dup = await queryOne(
      `SELECT id FROM account
        WHERE account_type='partner' AND partner_id=$1`,
      [data.child_partner_id]
    );
    if (dup) throw new ConflictError("Đối tác con này đã có tài khoản");

    const dupEmail = await queryOne(
      `SELECT id FROM account WHERE account_type='partner' AND lower(email)=lower($1)`,
      [data.email]
    );
    if (dupEmail) throw new ConflictError("Email đã được đăng ký");

    if (!data.password || data.password.length < 8) {
      throw new ConflictError("Mật khẩu tối thiểu 8 ký tự");
    }

    const id = nanoid("PU");
    const hash = await hashPassword(data.password);
    return queryOne<PartnerUser>(
      `INSERT INTO account (
         id, account_type, partner_id, email, full_name, phone, password_hash,
         status, approved_by, approved_at
       ) VALUES ($1,'partner',$2,$3,$4,$5,$6,'Active',$7,NOW())
       RETURNING ${PARTNER_USER_COLS}`,
      [id, data.child_partner_id, data.email.toLowerCase(), data.full_name, data.phone ?? null, hash, parentPartnerId]
    );
  },

  /** Make sure `subAccountId` belongs to a direct child of `parentPartnerId`. */
  async getOwnedSubAccount(parentPartnerId: string, subAccountId: string) {
    const row = await queryOne<PartnerUser & { parent_id: string | null }>(
      `SELECT ${PARTNER_USER_COLS}, p.parent_id
         FROM account a
         JOIN partner p ON p.id = a.partner_id
        WHERE a.id = $1
          AND a.account_type = 'partner'`,
      [subAccountId]
    );
    if (!row) throw new NotFoundError("Sub-account không tồn tại");
    if (row.parent_id !== parentPartnerId) {
      throw new ForbiddenError("Tài khoản này không thuộc đối tác con của bạn");
    }
    return row;
  },

  async setSubAccountStatus(parentPartnerId: string, subAccountId: string, status: "Active" | "Suspended") {
    await PartnerService.getOwnedSubAccount(parentPartnerId, subAccountId);
    const u = await queryOne<PartnerUser>(
      `UPDATE account SET status=$1
        WHERE id=$2 AND account_type='partner'
        RETURNING ${PARTNER_USER_COLS}`,
      [status, subAccountId]
    );
    return u!;
  },

  async resetSubAccountPassword(parentPartnerId: string, subAccountId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new ConflictError("Mật khẩu tối thiểu 8 ký tự");
    }
    await PartnerService.getOwnedSubAccount(parentPartnerId, subAccountId);
    const hash = await hashPassword(newPassword);
    await query(
      `UPDATE account SET password_hash=$1 WHERE id=$2 AND account_type='partner'`,
      [hash, subAccountId]
    );
    return { ok: true };
  },

  async deleteSubAccount(parentPartnerId: string, subAccountId: string) {
    await PartnerService.getOwnedSubAccount(parentPartnerId, subAccountId);
    await query(
      `DELETE FROM account WHERE id=$1 AND account_type='partner'`,
      [subAccountId]
    );
    return { ok: true };
  },
};
