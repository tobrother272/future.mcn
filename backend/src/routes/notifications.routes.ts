import { Router } from "express";
import { queryOne, queryMany, query } from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { nanoid } from "../lib/nanoid.js";

const router = Router();
router.use(requireAuth);

// ── Notifications ─────────────────────────────────────────────
router.get("/notifications", async (req, res, next) => {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const uid = req.user!.id;
    const rows = await queryMany(
      `SELECT * FROM notification
       WHERE user_id=$1 ${unreadOnly ? "AND read_at IS NULL" : ""}
       ORDER BY created_at DESC LIMIT 50`,
      [uid]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.put("/notifications/:id/read", async (req, res, next) => {
  try {
    await query(`UPDATE notification SET read_at=NOW() WHERE id=$1 AND user_id=$2`, [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

// ── Comments ──────────────────────────────────────────────────
router.get("/comments", async (req, res, next) => {
  try {
    const { entityType, entityId } = req.query as Record<string, string>;
    if (!entityType || !entityId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "entityType and entityId required" } });
      return;
    }
    const rows = await queryMany(
      `SELECT * FROM comment WHERE entity_type=$1 AND entity_id=$2 ORDER BY created_at ASC`,
      [entityType, entityId]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.post("/comments", async (req, res, next) => {
  try {
    const { entity_type, entity_id, parent_id, body, mentions } = req.body as Record<string, string>;
    const id = nanoid("CM");
    const c = await queryOne(
      `INSERT INTO comment (id,entity_type,entity_id,parent_id,author_id,author_email,author_name,body,mentions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [id, entity_type, entity_id, parent_id ?? null, req.user!.id, req.user!.email, null,
       body, mentions ? JSON.parse(mentions as string) : []]
    );
    res.status(201).json(c);
  } catch(e) { next(e); }
});

router.delete("/comments/:id", async (req, res, next) => {
  try {
    await query(`DELETE FROM comment WHERE id=$1 AND author_id=$2`, [req.params.id, req.user!.id]);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

export { router as notificationsRouter };
