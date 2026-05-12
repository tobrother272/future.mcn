import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auditLogger } from "../middleware/audit.js";
import { queryMany, queryOne } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";
import { NotFoundError } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);
router.use(auditLogger("topic"));

const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"];

const bodySchema = z.object({
  name:              z.string().min(1).max(100),
  dept:              z.string().optional().nullable(),
  expected_channels: z.coerce.number().int().min(0).default(0),
});

// GET /api/topics — list all topics (with channel count)
router.get("/", async (_req, res, next) => {
  try {
    const rows = await queryMany(
      `SELECT t.*, COALESCE(ch.cnt, 0)::int AS channel_count
       FROM topic t
       LEFT JOIN (SELECT topic_id, COUNT(*)::int AS cnt FROM channel GROUP BY topic_id) ch
             ON ch.topic_id = t.id
       ORDER BY t.name`
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/topics — create global topic
router.post("/", requireRole(...ADMIN_ROLES), validate(bodySchema), async (req, res, next) => {
  try {
    const { name, dept, expected_channels } = req.body as z.infer<typeof bodySchema>;
    const id = nanoid("T");
    const row = await queryOne(
      `INSERT INTO topic (id, name, dept, expected_channels) VALUES ($1,$2,$3,$4) RETURNING *`,
      [id, name, dept ?? null, expected_channels]
    );
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// PUT /api/topics/:id — update topic
router.put("/:id", requireRole(...ADMIN_ROLES), validate(bodySchema.partial()), async (req, res, next) => {
  try {
    const { name, dept, expected_channels } = req.body as Partial<z.infer<typeof bodySchema>>;
    const sets: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (name              !== undefined) { sets.push(`name=$${i++}`);              vals.push(name); }
    if (dept              !== undefined) { sets.push(`dept=$${i++}`);              vals.push(dept); }
    if (expected_channels !== undefined) { sets.push(`expected_channels=$${i++}`); vals.push(expected_channels); }
    if (!sets.length) { res.status(400).json({ error: "Không có trường nào cần cập nhật" }); return; }
    vals.push(req.params.id);
    const row = await queryOne(
      `UPDATE topic SET ${sets.join(",")} WHERE id=$${i} RETURNING *`, vals
    );
    if (!row) throw new NotFoundError(`Topic "${req.params.id}" không tồn tại`);
    res.json(row);
  } catch (e) { next(e); }
});

// DELETE /api/topics/:id — delete (only if no channels assigned)
router.delete("/:id", requireRole(...ADMIN_ROLES), async (req, res, next) => {
  try {
    const used = await queryOne<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM channel WHERE topic_id = $1`, [req.params.id]
    );
    if (Number(used?.cnt ?? 0) > 0) {
      res.status(409).json({ error: `Topic đang được dùng bởi ${used!.cnt} kênh, không thể xóa` });
      return;
    }
    await queryOne(`DELETE FROM topic WHERE id=$1`, [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export { router as topicsRouter };
