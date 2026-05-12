import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool.js";
import { logger } from "../lib/logger.js";

/** Auto-log every mutating request (POST / PUT / PATCH / DELETE) to audit_log */
export function auditLogger(
  resourceType?: string
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    if (!mutating) return next();

    const origSend = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode < 400) {
        const actor = req.user;
        const resourceId =
          (req.params as Record<string, string>)["id"] ?? extractIdFromBody(body);

        pool
          .query(
            `INSERT INTO audit_log (action, actor_id, actor_email, resource_type, resource_id, detail, ip, user_agent)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              `${req.method} ${resourceType ?? req.path}`,
              actor?.id ?? null,
              actor?.email ?? null,
              resourceType ?? null,
              resourceId ?? null,
              JSON.stringify({ method: req.method, path: req.path, status: res.statusCode }),
              (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip,
              req.headers["user-agent"] ?? null,
            ]
          )
          .catch((err: unknown) => logger.warn({ err }, "audit_log insert failed"));
      }
      return origSend(body);
    };
    next();
  };
}

function extractIdFromBody(body: unknown): string | null {
  if (body && typeof body === "object" && "id" in body) {
    return String((body as Record<string, unknown>)["id"]);
  }
  return null;
}
