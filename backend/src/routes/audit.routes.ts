import { Router } from "express";
import { queryOne, queryMany } from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { actor, action, from, to, page, limit } = req.query as Record<string, string>;
    const andClauses: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (actor)  { andClauses.push(`actor_email ILIKE $${idx++}`);  vals.push(`%${actor}%`); }
    if (action) { andClauses.push(`action ILIKE $${idx++}`);       vals.push(`%${action}%`); }
    if (from)   { andClauses.push(`created_at >= $${idx++}`);      vals.push(from); }
    if (to)     { andClauses.push(`created_at <= $${idx++}`);      vals.push(to); }
    const where = andClauses.length ? `WHERE ${andClauses.join(" AND ")}` : "";
    const pageLimit = Math.min(200, Number(limit) || 50);
    const offset = (Math.max(1, Number(page) || 1) - 1) * pageLimit;
    const countRes = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM audit_log ${where}`, vals);
    const rows = await queryMany(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      [...vals, pageLimit, offset]
    );
    res.json({ items: rows, total: Number(countRes?.count ?? 0) });
  } catch(e) { next(e); }
});

export { router as auditRouter };
