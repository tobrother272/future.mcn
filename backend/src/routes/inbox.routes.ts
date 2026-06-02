import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { queryMany, queryOne, query } from "../db/helpers.js";

const router = Router();
router.use(requireAuth);

export interface InboxMessage {
  id: string;
  type: string;
  title: string;
  body: Record<string, unknown>;
  cms_id: string | null;
  is_read: boolean;
  created_at: string;
}

// GET /api/inbox
router.get("/", async (req, res, next) => {
  try {
    const limit  = Math.min(100, Number(req.query.limit) || 50);
    const offset = (Math.max(1, Number(req.query.page) || 1) - 1) * limit;
    const onlyUnread = req.query.unread === "1";

    const where = onlyUnread ? "WHERE is_read = false" : "";
    const rows = await queryMany<InboxMessage>(
      `SELECT * FROM inbox ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const countRow = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inbox ${where}`
    );
    res.json({ items: rows, total: Number(countRow?.count ?? 0) });
  } catch (e) { next(e); }
});

// GET /api/inbox/unread-count
router.get("/unread-count", async (_req, res, next) => {
  try {
    const row = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM inbox WHERE is_read = false`
    );
    res.json({ count: Number(row?.count ?? 0) });
  } catch (e) { next(e); }
});

// PATCH /api/inbox/:id/read
router.patch("/:id/read", async (req, res, next) => {
  try {
    await query(`UPDATE inbox SET is_read = true WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// PATCH /api/inbox/read-all
router.patch("/read-all", async (_req, res, next) => {
  try {
    await query(`UPDATE inbox SET is_read = true WHERE is_read = false`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// DELETE /api/inbox/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await query(`DELETE FROM inbox WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export { router as inboxRouter };
