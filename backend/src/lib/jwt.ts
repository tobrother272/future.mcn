import { SignJWT, jwtVerify } from "jose";
import { env } from "./env.js";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface JwtPayload {
  sub: string;         // user id
  email?: string;
  username?: string;
  role: string;
  userType: "internal" | "partner" | "employee";
  partner_id?: string | null;
  iat?: number;
  exp?: number;
}

export async function signToken(payload: Omit<JwtPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .setSubject(payload.sub)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}
