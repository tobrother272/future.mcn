import type { Request, Response, NextFunction } from "express";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { env } from "../lib/env.js";

/**
 * Map common PostgreSQL SQLSTATE codes to HTTP responses so the API
 * returns 4xx (not 5xx) when the failure is caused by bad client input.
 *
 * Reference: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
interface PgError {
  code?: string;
  detail?: string;
  table?: string;
  column?: string;
  constraint?: string;
}

function isPgError(err: unknown): err is PgError {
  return typeof err === "object" && err !== null && "code" in err
      && typeof (err as { code: unknown }).code === "string";
}

function pgErrorToAppError(err: PgError): AppError | null {
  switch (err.code) {
    case "23503": {
      // foreign_key_violation
      // detail looks like:  Key (channel_id)=(xyz) is not present in table "channel".
      const fieldMatch  = err.detail?.match(/Key \(([^)]+)\)/);
      const valueMatch  = err.detail?.match(/=\(([^)]+)\)/);
      const tableMatch  = err.detail?.match(/in table "([^"]+)"/);
      const field = fieldMatch?.[1] ?? "field";
      const value = valueMatch?.[1] ?? "";
      const refTable = tableMatch?.[1] ?? "related table";
      return new AppError(
        400,
        "INVALID_REFERENCE",
        `Giá trị "${value}" cho ${field} không tồn tại trong bảng ${refTable}.`,
        { [field]: [`không tồn tại trong ${refTable}`] }
      );
    }
    case "23505": {
      // unique_violation
      const fieldMatch = err.detail?.match(/Key \(([^)]+)\)/);
      const valueMatch = err.detail?.match(/=\(([^)]+)\)/);
      const field = fieldMatch?.[1] ?? "field";
      const value = valueMatch?.[1] ?? "";
      return new AppError(
        409,
        "DUPLICATE_VALUE",
        `Giá trị "${value}" cho ${field} đã tồn tại.`,
        { [field]: ["đã tồn tại"] }
      );
    }
    case "23502": {
      // not_null_violation
      const field = err.column ?? "field";
      return new AppError(
        400,
        "MISSING_REQUIRED_FIELD",
        `Trường "${field}" là bắt buộc.`,
        { [field]: ["không được để trống"] }
      );
    }
    case "23514": {
      // check_violation — usually a bad enum value
      const constraint = err.constraint ?? "check";
      return new AppError(
        400,
        "INVALID_VALUE",
        `Giá trị không hợp lệ (vi phạm ràng buộc ${constraint}).`,
        { _constraint: [constraint] }
      );
    }
    case "22001": // string_data_right_truncation
      return new AppError(400, "VALUE_TOO_LONG", "Một giá trị nhập vào quá dài.");
    case "22P02": // invalid_text_representation (e.g. malformed UUID)
      return new AppError(400, "INVALID_FORMAT", "Định dạng giá trị không hợp lệ.");
    default:
      return null;
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // 1) Application-level errors (thrown deliberately by services/routes)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // 2) Database constraint violations → translate to 4xx with a helpful message
  if (isPgError(err)) {
    const appErr = pgErrorToAppError(err);
    if (appErr) {
      logger.warn({ pgCode: err.code, method: req.method, path: req.path, detail: err.detail }, appErr.message);
      return res.status(appErr.statusCode).json({
        error: { code: appErr.code, message: appErr.message, details: appErr.details },
      });
    }
  }

  // 3) Anything else → 500 (and log as error)
  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error({ err, method: req.method, path: req.path }, message);

  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: env.NODE_ENV === "production" ? "Internal server error" : message,
    },
  });
}
