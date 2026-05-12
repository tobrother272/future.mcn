import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ValidationError } from "../lib/errors.js";

export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        details[key] = [...(details[key] ?? []), issue.message];
      }
      return next(new ValidationError("Validation failed", details));
    }
    req[source] = result.data as typeof req[typeof source];
    next();
  };
}
