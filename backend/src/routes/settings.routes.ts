import { Router } from "express";
import { queryMany, queryOne } from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    const rows = await queryMany<{ key: string; value: unknown; updated_at: string }>(
      `SELECT key, value, updated_at FROM setting ORDER BY key`
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.put("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value: unknown };
    const row = await queryOne<{ key: string; value: unknown; updated_at: string }>(
      `INSERT INTO setting (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()
       RETURNING key, value, updated_at`,
      [key, JSON.stringify(value)]
    );
    res.json(row);
  } catch(e) { next(e); }
});

router.delete("/:key", async (req, res, next) => {
  try {
    await queryOne(`DELETE FROM setting WHERE key=$1`, [req.params.key]);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

export { router as settingsRouter };
