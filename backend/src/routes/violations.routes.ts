import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { queryOne, queryMany } from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { nanoid } from "../lib/nanoid.js";
import { NotFoundError, ValidationError } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);

// ── Multer ────────────────────────────────────────────────────
const uploadsDir = path.resolve("uploads/violations");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

// ── Schema ────────────────────────────────────────────────────
const RESULTS = ["Thành Công", "Thất Bại", "Không thực hiện"] as const;
// Migration 015 restored the free-form denormalized columns
// (video_title, video_url, channel_name, channel_url, notes) so the UI can
// record them per violation regardless of whether the referenced channel
// exists. `channel_id` itself stays FK-less (migration 014).
const bodySchema = z.object({
  name:           z.string().min(1),
  violation_type: z.enum(["Thông tin", "Hình ảnh / Video"]).optional(),
  video_id:       z.string().optional().nullable(),
  video_title:    z.string().optional().nullable(),
  video_url:      z.string().optional().nullable(),
  video_thumb:    z.string().optional().nullable(),
  channel_id:     z.string().optional().nullable(),
  channel_name:   z.string().optional().nullable(),
  channel_url:    z.string().optional().nullable(),
  content:        z.string().optional(),
  notes:          z.string().optional().nullable(),
  policy_id:      z.string().optional().nullable(),
  resolution:     z.string().optional(),
  result:         z.enum(RESULTS).optional(),
  detected_date:  z.string().optional().nullable(),
});

// ── Helpers ───────────────────────────────────────────────────
// `channel_name`/`channel_url` live on the row itself, but we still join
// `channel` to fall back to the canonical record when the violation row
// has them blank — keeps the UI populated whenever the channel exists.
const SELECT = `
  SELECT
    v.id, v.name, v.violation_type, v.video_id, v.video_thumb,
    v.channel_id, v.content, v.policy_id, v.resolution, v.result,
    v.detected_date, v.images, v.image_captions, v.created_at, v.updated_at,
    v.video_title, v.video_url, v.notes,
    COALESCE(NULLIF(v.channel_name, ''), c.name)             AS channel_name,
    COALESCE(
      NULLIF(v.channel_url, ''),
      CASE WHEN c.yt_id IS NOT NULL
           THEN 'https://www.youtube.com/channel/' || c.yt_id
           ELSE NULL END
    )                                                         AS channel_url,
    p.name                                                    AS policy_name
  FROM violation v
  LEFT JOIN channel c ON v.channel_id = c.id
  LEFT JOIN policy  p ON v.policy_id  = p.id
`;

/**
 * Validate that foreign-key targets exist before inserting/updating, so we
 * can return a 4xx with a clear field-level error instead of letting the DB
 * raise a generic constraint violation that surfaces as a 500.
 *
 * NOTE: `channel_id` is intentionally NOT validated here — migration 014
 * dropped the FK so violations may reference channels that don't (yet)
 * live in our `channel` table.
 *
 * `null` / `undefined` are treated as "not provided" and skipped.
 */
async function assertRefsExist(refs: {
  policy_id?: string | null;
}): Promise<void> {
  const details: Record<string, string[]> = {};

  if (refs.policy_id) {
    const row = await queryOne<{ id: string }>(
      `SELECT id FROM policy WHERE id = $1`,
      [refs.policy_id]
    );
    if (!row) details.policy_id = [`Không tìm thấy chính sách "${refs.policy_id}"`];
  }

  if (Object.keys(details).length) {
    throw new ValidationError("Tham chiếu không hợp lệ", details);
  }
}

// ── GET /api/violations ───────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { channel_id, policy_id, result, search, page, limit } = req.query as Record<string, string>;
    const where: string[] = [];
    const vals: unknown[] = [];
    let i = 1;
    if (channel_id) { where.push(`v.channel_id=$${i++}`); vals.push(channel_id); }
    if (policy_id)  { where.push(`v.policy_id=$${i++}`);  vals.push(policy_id); }
    if (result)     { where.push(`v.result=$${i++}`);      vals.push(result); }
    if (search)     { where.push(`(v.name ILIKE $${i} OR v.content ILIKE $${i})`); vals.push(`%${search}%`); i++; }
    const clause    = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const pageLimit = Math.min(200, Number(limit) || 50);
    const offset    = (Math.max(1, Number(page) || 1) - 1) * pageLimit;
    const countRow  = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM violation v ${clause}`, vals);
    const rows      = await queryMany(`${SELECT} ${clause} ORDER BY v.created_at DESC LIMIT $${i} OFFSET $${i + 1}`, [...vals, pageLimit, offset]);
    res.json({ items: rows, total: Number(countRow?.count ?? 0) });
  } catch (e) { next(e); }
});

// ── GET /api/violations/:id ───────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const v = await queryOne(`${SELECT} WHERE v.id=$1`, [req.params.id!]);
    if (!v) return next(new NotFoundError("Violation not found"));
    res.json(v);
  } catch (e) { next(e); }
});

// ── POST /api/violations ──────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const d = bodySchema.parse(req.body);
    await assertRefsExist({ policy_id: d.policy_id });
    const id = nanoid("VIO");
    await queryOne(
      `INSERT INTO violation
         (id, name, violation_type,
          video_id, video_title, video_url, video_thumb,
          channel_id, channel_name, channel_url,
          content, notes, policy_id, resolution, result, detected_date, images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'[]')`,
      [
        id, d.name, d.violation_type ?? "Hình ảnh / Video",
        d.video_id ?? null, d.video_title ?? null, d.video_url ?? null, d.video_thumb ?? null,
        d.channel_id ?? null, d.channel_name ?? null, d.channel_url ?? null,
        d.content ?? "", d.notes ?? null,
        d.policy_id ?? null, d.resolution ?? "",
        d.result ?? "Không thực hiện", d.detected_date ?? null,
      ]
    );
    // Re-read through the SELECT helper so the response includes the joined
    // channel/policy fields (and the COALESCE'd channel_name/url).
    const v = await queryOne(`${SELECT} WHERE v.id=$1`, [id]);
    res.status(201).json(v);
  } catch (e) { next(e); }
});

// ── PUT /api/violations/:id ───────────────────────────────────
router.put("/:id", async (req, res, next) => {
  try {
    const d = bodySchema.partial().parse(req.body);
    await assertRefsExist({ policy_id: d.policy_id });
    const allowed = [
      "name","violation_type",
      "video_id","video_title","video_url","video_thumb",
      "channel_id","channel_name","channel_url",
      "content","notes","policy_id","resolution","result","detected_date",
    ] as const;
    const sets: string[] = []; const vals: unknown[] = []; let i = 1;
    for (const k of allowed) {
      if (d[k] !== undefined) { sets.push(`${k}=$${i++}`); vals.push(d[k]); }
    }
    if (!sets.length) { res.status(400).json({ error: "No fields" }); return; }
    sets.push(`updated_at=NOW()`);
    vals.push(req.params.id!);
    const updated = await queryOne<{ id: string }>(
      `UPDATE violation SET ${sets.join(",")} WHERE id=$${i} RETURNING id`,
      vals,
    );
    if (!updated) return next(new NotFoundError("Violation not found"));
    // Read back through SELECT so the response shape (with joins) matches GET.
    const v = await queryOne(`${SELECT} WHERE v.id=$1`, [updated.id]);
    res.json(v);
  } catch (e) { next(e); }
});

// ── POST /api/violations/:id/thumb ───────────────────────────
const thumbUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `thumb_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    cb(null, [".jpg",".jpeg",".png",".webp",".gif"].includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.post("/:id/thumb", thumbUpload.single("thumb"), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: "No file" }); return; }
    // Remove old thumb file if exists
    const current = await queryOne<{ video_thumb: string | null }>(`SELECT video_thumb FROM violation WHERE id=$1`, [req.params.id!]);
    if (current?.video_thumb) {
      try { fs.unlinkSync(path.resolve(current.video_thumb)); } catch { /* ignore */ }
    }
    const thumbPath = `uploads/violations/${file.filename}`;
    const v = await queryOne(
      `UPDATE violation SET video_thumb=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [thumbPath, req.params.id!]
    );
    if (!v) return next(new NotFoundError("Violation not found"));
    res.json(v);
  } catch (e) { next(e); }
});

// ── POST /api/violations/:id/images ──────────────────────────
router.post("/:id/images", upload.array("images", 20), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) { res.status(400).json({ error: "No images" }); return; }
    const current = await queryOne<{ images: string[] }>(`SELECT images FROM violation WHERE id=$1`, [req.params.id!]);
    if (!current) return next(new NotFoundError("Violation not found"));
    const newPaths = files.map((f) => `uploads/violations/${f.filename}`);
    const merged   = [...(current.images ?? []), ...newPaths];
    // captions sent as ordered JSON array matching files array by index
    const captionsRaw = req.body?.captions;
    const captionsList: string[] = captionsRaw ? JSON.parse(captionsRaw) : [];
    const currentCaptions = (await queryOne<{ image_captions: Record<string, string> }>(`SELECT image_captions FROM violation WHERE id=$1`, [req.params.id!]))?.image_captions ?? {};
    const newCaptions: Record<string, string> = {};
    files.forEach((f, i) => { if (captionsList[i]) newCaptions[`uploads/violations/${f.filename}`] = captionsList[i]; });
    const mergedCaptions = { ...currentCaptions, ...newCaptions };
    const v = await queryOne(
      `UPDATE violation SET images=$1, image_captions=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [JSON.stringify(merged), JSON.stringify(mergedCaptions), req.params.id!]
    );
    res.json(v);
  } catch (e) { next(e); }
});

// ── DELETE /api/violations/:id/images ────────────────────────
router.delete("/:id/images", async (req, res, next) => {
  try {
    const { imagePath } = req.body as { imagePath: string };
    const current = await queryOne<{ images: string[] }>(`SELECT images FROM violation WHERE id=$1`, [req.params.id!]);
    if (!current) return next(new NotFoundError("Violation not found"));
    const remaining = (current.images ?? []).filter((p) => p !== imagePath);
    try { fs.unlinkSync(path.resolve(imagePath)); } catch { /* ignore */ }
    const v = await queryOne(
      `UPDATE violation SET images=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [JSON.stringify(remaining), req.params.id!]
    );
    res.json(v);
  } catch (e) { next(e); }
});

// ── GET /api/violations/:id/resolutions ──────────────────────
router.get("/:id/resolutions", async (req, res, next) => {
  try {
    const rows = await queryMany(
      `SELECT * FROM violation_resolution WHERE violation_id=$1 ORDER BY created_at DESC`,
      [req.params.id!]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// ── POST /api/violations/:id/resolutions ──────────────────────
router.post("/:id/resolutions", async (req, res, next) => {
  try {
    const schema = z.object({
      resolution:    z.string().min(1),
      handler_info:  z.string().optional(),
      resolved_date: z.string().optional().nullable(),
      result_date:   z.string().optional().nullable(),
      result:        z.enum(["Thành Công", "Thất Bại", "Chờ Xử Lý"]).optional(),
      notes:         z.string().optional().nullable(),
    });
    const d  = schema.parse(req.body);
    const id = nanoid("VR");
    const row = await queryOne(
      `INSERT INTO violation_resolution (id, violation_id, resolution, handler_info, resolved_date, result_date, result, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, req.params.id!, d.resolution, d.handler_info ?? "", d.resolved_date ?? null,
       d.result_date ?? null, d.result ?? "Chờ Xử Lý", d.notes ?? null]
    );
    res.status(201).json(row);
  } catch (e) { next(e); }
});

// ── PUT /api/violations/:id/resolutions/:rid ─────────────────
router.put("/:id/resolutions/:rid", async (req, res, next) => {
  try {
    const schema = z.object({
      resolution:    z.string().min(1).optional(),
      handler_info:  z.string().optional(),
      resolved_date: z.string().optional().nullable(),
      result_date:   z.string().optional().nullable(),
      result:        z.enum(["Thành Công", "Thất Bại", "Chờ Xử Lý"]).optional(),
      notes:         z.string().optional().nullable(),
    });
    const d = schema.parse(req.body);
    const allowed = ["resolution","handler_info","resolved_date","result_date","result","notes"] as const;
    const sets: string[] = []; const vals: unknown[] = []; let i = 1;
    for (const k of allowed) {
      if (d[k] !== undefined) { sets.push(`${k}=$${i++}`); vals.push(d[k]); }
    }
    if (!sets.length) { res.status(400).json({ error: "No fields" }); return; }
    vals.push(req.params.rid!); vals.push(req.params.id!);
    const row = await queryOne(
      `UPDATE violation_resolution SET ${sets.join(",")} WHERE id=$${i} AND violation_id=$${i+1} RETURNING *`,
      vals
    );
    if (!row) return next(new NotFoundError("Resolution not found"));
    res.json(row);
  } catch (e) { next(e); }
});

// ── DELETE /api/violations/:violationId/resolutions/:rid ──────
router.delete("/:id/resolutions/:rid", async (req, res, next) => {
  try {
    await queryOne(`DELETE FROM violation_resolution WHERE id=$1 AND violation_id=$2`, [req.params.rid!, req.params.id!]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ── DELETE /api/violations/:id ────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const current = await queryOne<{ images: string[] }>(`SELECT images FROM violation WHERE id=$1`, [req.params.id!]);
    if (current?.images?.length) {
      for (const img of current.images) {
        try { fs.unlinkSync(path.resolve(img)); } catch { /* ignore */ }
      }
    }
    await queryOne(`DELETE FROM violation WHERE id=$1`, [req.params.id!]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export { router as violationsRouter };
