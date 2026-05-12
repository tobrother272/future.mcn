import { queryOne, queryMany } from "../db/helpers.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { signToken } from "../lib/jwt.js";
import {
  UnauthorizedError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";

// ─────────────────────────────────────────────────────────────
// Unified `account` table replaces the legacy `"user"` and
// `partner_user` tables. `account_type` discriminates between
// internal staff and external partner users.
// ─────────────────────────────────────────────────────────────

export type AccountType = "internal" | "partner";

interface AccountRow {
  id: string;
  account_type: AccountType;
  email: string;
  full_name: string;
  phone: string | null;
  password_hash: string;
  role: string | null;
  extra_roles: string[] | null;
  mfa_enabled: boolean;
  partner_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  status: string;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

/** Common columns used in safe responses (no password). */
const SAFE_COLS = `
  id, account_type, email, full_name, phone,
  role, extra_roles, mfa_enabled,
  partner_id, approved_by, approved_at,
  status, last_login, created_at, updated_at
`;

function stripHash<T extends { password_hash?: string }>(row: T): Omit<T, "password_hash"> {
  const { password_hash: _omit, ...rest } = row;
  return rest;
}

export const AuthService = {
  async loginInternal(email: string, password: string) {
    const acc = await queryOne<AccountRow>(
      `SELECT * FROM account
       WHERE account_type='internal' AND lower(email)=lower($1) AND status='Active'`,
      [email]
    );
    if (!acc) throw new UnauthorizedError("Invalid email or password");

    const valid = await verifyPassword(password, acc.password_hash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    await queryOne(
      `UPDATE account SET last_login = NOW() WHERE id = $1`,
      [acc.id]
    );

    const token = await signToken({
      sub: acc.id,
      email: acc.email,
      role: acc.role ?? "VIEWER",
      userType: "internal",
    });

    return { user: { ...stripHash(acc), userType: "internal" as const }, token };
  },

  async loginPartner(email: string, password: string) {
    const acc = await queryOne<AccountRow>(
      `SELECT * FROM account
       WHERE account_type='partner' AND lower(email)=lower($1) AND status='Active'`,
      [email]
    );
    if (!acc) throw new UnauthorizedError("Invalid email or password");

    const valid = await verifyPassword(password, acc.password_hash);
    if (!valid) throw new UnauthorizedError("Invalid email or password");

    await queryOne(
      `UPDATE account SET last_login = NOW() WHERE id = $1`,
      [acc.id]
    );

    const token = await signToken({
      sub: acc.id,
      email: acc.email,
      role: "PARTNER",
      userType: "partner",
      partner_id: acc.partner_id,
    });

    return { user: { ...stripHash(acc), userType: "partner" as const }, token };
  },

  /** Login by employee username — employees live in their own table. */
  async loginEmployee(username: string, password: string) {
    const emp = await queryOne<{ id: string; name: string; username: string; password_hash: string; role: string | null; status: string }>(
      `SELECT id, name, username, password_hash, role, status FROM employee WHERE username = $1`,
      [username]
    );
    if (!emp) throw new UnauthorizedError("Invalid username or password");
    if (emp.status !== "Active") throw new UnauthorizedError("Tài khoản đã bị vô hiệu hóa");
    const valid = await verifyPassword(password, emp.password_hash ?? "");
    if (!valid) throw new UnauthorizedError("Invalid username or password");

    const token = await signToken({
      sub: emp.id,
      username: emp.username,
      role: emp.role ?? "employee",
      userType: "employee",
    });
    return {
      user: { id: emp.id, name: emp.name, username: emp.username, role: emp.role, status: emp.status, userType: "employee" as const },
      token,
    };
  },

  /** Unified login — tries internal (email), then partner (email), then employee (username). */
  async login(login: string, password: string) {
    const isEmail = login.includes("@");
    if (isEmail) {
      try { return await AuthService.loginInternal(login, password); } catch { /* continue */ }
      try { return await AuthService.loginPartner(login, password); } catch { /* continue */ }
    }
    try { return await AuthService.loginEmployee(login, password); } catch { /* continue */ }
    if (!isEmail) {
      try { return await AuthService.loginInternal(login, password); } catch { /* continue */ }
      try { return await AuthService.loginPartner(login, password); } catch { /* continue */ }
    }
    throw new UnauthorizedError("Sai tên đăng nhập hoặc mật khẩu");
  },

  async registerPartner(data: {
    email: string;
    password: string;
    full_name: string;
    company_name: string;
    phone?: string;
  }) {
    const existing = await queryOne(
      `SELECT id FROM account WHERE account_type='partner' AND lower(email)=lower($1)`,
      [data.email]
    );
    if (existing) throw new ConflictError("Email already registered");

    const id = nanoid("PU");
    const hash = await hashPassword(data.password);
    await queryOne(
      `INSERT INTO account (id, account_type, email, full_name, phone, password_hash, status)
       VALUES ($1,'partner',$2,$3,$4,$5,'PendingApproval')`,
      [id, data.email.toLowerCase(), data.full_name, data.phone ?? null, hash]
    );

    // Stash company_name in setting until partner record is created on approval
    await queryOne(
      `INSERT INTO setting (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = setting.value || $2::jsonb`,
      [`pending_company_${id}`, JSON.stringify({ company_name: data.company_name, user_id: id })]
    );

    return { ok: true, message: "Registration submitted — awaiting admin approval" };
  },

  async firstSetup(data: { email: string; password: string; full_name: string }) {
    const count = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM account WHERE account_type='internal'`
    );
    if (Number(count?.count ?? 0) > 0) {
      throw new ForbiddenError("First setup already completed");
    }
    const id = nanoid("U");
    const hash = await hashPassword(data.password);
    await queryOne(
      `INSERT INTO account (id, account_type, email, full_name, password_hash, role, status)
       VALUES ($1,'internal',$2,$3,$4,'SUPER_ADMIN','Active')`,
      [id, data.email.toLowerCase(), data.full_name, hash]
    );
    const token = await signToken({ sub: id, email: data.email, role: "SUPER_ADMIN", userType: "internal" });
    return { ok: true, token };
  },

  async getMe(userId: string, userType: "internal" | "partner" | "employee") {
    if (userType === "employee") {
      const emp = await queryOne<{ id: string; name: string; username: string; role: string | null; status: string }>(
        `SELECT id, name, username, role, status FROM employee WHERE id = $1`, [userId]
      );
      if (!emp) throw new NotFoundError("Employee not found");
      return { ...emp, userType: "employee" as const };
    }

    const acc = await queryOne<AccountRow>(
      `SELECT ${SAFE_COLS} FROM account WHERE id = $1 AND account_type = $2`,
      [userId, userType]
    );
    if (!acc) throw new NotFoundError("User not found");
    return { ...acc, userType };
  },

  async updateMe(userId: string, userType: "partner" | "internal", data: { full_name?: string; phone?: string }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (data.full_name) { sets.push(`full_name=$${idx++}`); vals.push(data.full_name); }
    if (data.phone !== undefined && userType === "partner") {
      sets.push(`phone=$${idx++}`); vals.push(data.phone || null);
    }
    if (!sets.length) throw new Error("No fields to update");
    vals.push(userId, userType);
    return queryOne<AccountRow>(
      `UPDATE account SET ${sets.join(",")}
       WHERE id=$${idx} AND account_type=$${idx+1}
       RETURNING ${SAFE_COLS}`,
      vals
    );
  },

  async changePassword(userId: string, userType: "partner" | "internal", currentPassword: string, newPassword: string) {
    const row = await queryOne<{ password_hash: string }>(
      `SELECT password_hash FROM account WHERE id=$1 AND account_type=$2`,
      [userId, userType]
    );
    if (!row) throw new NotFoundError("User not found");
    const valid = await verifyPassword(currentPassword, row.password_hash);
    if (!valid) throw new UnauthorizedError("Mật khẩu hiện tại không đúng");
    const hash = await hashPassword(newPassword);
    await queryOne(`UPDATE account SET password_hash=$1 WHERE id=$2`, [hash, userId]);
    return { ok: true };
  },

  async createUser(data: { email: string; password: string; full_name: string; role: string }) {
    const existing = await queryOne(
      `SELECT id FROM account WHERE account_type='internal' AND lower(email)=lower($1)`,
      [data.email]
    );
    if (existing) throw new ConflictError("Email already registered");
    const id = nanoid("U");
    const hash = await hashPassword(data.password);
    const u = await queryOne<AccountRow>(
      `INSERT INTO account (id, account_type, email, full_name, password_hash, role, status)
       VALUES ($1,'internal',$2,$3,$4,$5,'Active')
       RETURNING ${SAFE_COLS}`,
      [id, data.email.toLowerCase(), data.full_name, hash, data.role]
    );
    return u!;
  },

  async updateUser(id: string, data: { role?: string; status?: string; full_name?: string }) {
    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (data.role)      { sets.push(`role=$${idx++}`);      vals.push(data.role); }
    if (data.status)    { sets.push(`status=$${idx++}`);    vals.push(data.status); }
    if (data.full_name) { sets.push(`full_name=$${idx++}`); vals.push(data.full_name); }
    if (!sets.length) throw new Error("No fields to update");
    vals.push(id);
    return queryOne<AccountRow>(
      `UPDATE account SET ${sets.join(",")}
       WHERE id=$${idx} AND account_type='internal'
       RETURNING ${SAFE_COLS}`,
      vals
    );
  },

  async listUsers() {
    return queryMany<AccountRow>(
      `SELECT ${SAFE_COLS} FROM account
       WHERE account_type='internal'
       ORDER BY created_at DESC`
    );
  },
};
