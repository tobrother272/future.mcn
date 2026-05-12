import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../lib/errors.js";
import { CmsApiKeyService, type CmsApiKey } from "../services/cms-api-key.service.js";

/**
 * Authenticates a request via a CMS-scoped API key.
 *
 * Token is read from the `Authorization: Bearer <token>` header (preferred)
 * or the `X-Api-Key` header (convenient for cron / curl). On success we
 * attach the resolved key row to `req.apiKey` so downstream handlers can
 * scope queries by `req.apiKey.cms_id`.
 *
 * Pass `requiredScope` to enforce a specific permission, e.g.
 * `requireCmsApiKey("channels:sync")` for the sync endpoint.
 */
declare global {
  namespace Express {
    interface Request {
      apiKey?: CmsApiKey;
    }
  }
}

function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <token>
  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  // 2. X-Api-Key header
  const xkey = req.headers["x-api-key"];
  if (typeof xkey === "string" && xkey.trim()) return xkey.trim();
  // 3. ?api_key=<token>  (convenient for browser / simple curl / cron)
  const qkey = req.query["api_key"];
  if (typeof qkey === "string" && qkey.trim()) return qkey.trim();
  return null;
}

export function requireCmsApiKey(requiredScope?: string) {
  return async function (req: Request, _res: Response, next: NextFunction) {
    try {
      const token = extractToken(req);
      if (!token) return next(new UnauthorizedError("Missing API key"));
      const key = await CmsApiKeyService.verify(token);
      if (!key) return next(new UnauthorizedError("Invalid or revoked API key"));
      if (requiredScope && !CmsApiKeyService.hasScope(key, requiredScope as never)) {
        return next(new ForbiddenError(`Missing scope: ${requiredScope}`));
      }
      req.apiKey = key;
      next();
    } catch (e) {
      next(e);
    }
  };
}
