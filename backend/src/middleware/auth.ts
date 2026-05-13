import type { Request, Response, NextFunction } from "express";
import { jwtVerify } from "jose";
import { UnauthorizedError } from "../lib/errors.js";
import { env } from "../lib/env.js";

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  role: string;
  userType: "internal" | "partner" | "employee";
  partner_id?: string | null;
  cms_ids?: string[];
  /** ID của Admin employee đã tạo user này (dùng để lọc danh sách nhân viên). */
  created_by?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing authorization header"));
  }
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, secretKey);
    // Map the standard JWT `sub` claim to `id` so routes can use req.user.id
    req.user = { ...payload, id: payload.sub } as unknown as AuthUser;
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new UnauthorizedError());
    const userRoles = [req.user.role];
    if (!userRoles.some((r) => roles.includes(r))) {
      return next(new UnauthorizedError("Insufficient permissions"));
    }
    next();
  };
}
