import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import { PolicyService } from "../services/policy.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ── Multer ────────────────────────────────────────────────────
const uploadsDir = path.resolve("uploads/policies");
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

// ── Body schema ───────────────────────────────────────────────
const bodySchema = z.object({
  name:        z.string().min(1),
  content:     z.string().optional(),
  application: z.string().optional(),
});

// GET /api/policies
router.get("/", async (req, res, next) => {
  try {
    res.json(await PolicyService.list({
      search: req.query.search as string | undefined,
      limit:  req.query.limit  ? Number(req.query.limit)  : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    }));
  } catch (e) { next(e); }
});

// GET /api/policies/:id
router.get("/:id", async (req, res, next) => {
  try {
    const policy = await PolicyService.getById(req.params.id);
    if (!policy) { res.status(404).json({ error: "Không tìm thấy" }); return; }
    res.json(policy);
  } catch (e) { next(e); }
});

// POST /api/policies
router.post("/", async (req, res, next) => {
  try {
    const parsed = bodySchema.parse(req.body);
    res.status(201).json(await PolicyService.create(parsed));
  } catch (e) { next(e); }
});

// PUT /api/policies/:id
router.put("/:id", async (req, res, next) => {
  try {
    const parsed = bodySchema.partial().parse(req.body);
    const updated = await PolicyService.update(req.params.id, parsed);
    if (!updated) { res.status(404).json({ error: "Không tìm thấy" }); return; }
    res.json(updated);
  } catch (e) { next(e); }
});

// POST /api/policies/:id/images — upload multiple images
router.post("/:id/images", upload.array("images", 20), async (req, res, next) => {
  try {
    const files = req.files as Express.Multer.File[] | undefined;
    if (!files?.length) { res.status(400).json({ error: "Không có ảnh" }); return; }
    const paths = files.map((f) => `uploads/policies/${f.filename}`);
    const updated = await PolicyService.addImages(req.params.id!, paths);
    if (!updated) { res.status(404).json({ error: "Không tìm thấy" }); return; }
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/policies/:id/images — remove one image
router.delete("/:id/images", async (req, res, next) => {
  try {
    const { imagePath } = req.body as { imagePath: string };
    if (!imagePath) { res.status(400).json({ error: "Thiếu imagePath" }); return; }
    const updated = await PolicyService.removeImage(req.params.id, imagePath);
    if (!updated) { res.status(404).json({ error: "Không tìm thấy" }); return; }
    res.json(updated);
  } catch (e) { next(e); }
});

// DELETE /api/policies/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await PolicyService.delete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export { router as policiesRouter };
