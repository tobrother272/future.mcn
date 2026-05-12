import { Router } from "express";
import multer from "multer";
import path from "path";
import { ContractService } from "../services/contract.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

// ── Multer setup ──────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve("uploads/contracts"));
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "_");
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// GET /api/contracts — list ALL contracts across all partners
router.get("/", async (req, res, next) => {
  try {
    res.json(await ContractService.listAll({
      search:      req.query.search      as string | undefined,
      employee_id: req.query.employee_id as string | undefined,
      partner_id:  req.query.partner_id  as string | undefined,
      limit:       req.query.limit  ? Number(req.query.limit)  : undefined,
      offset:      req.query.offset ? Number(req.query.offset) : undefined,
    }));
  } catch (e) { next(e); }
});

// GET /api/contracts/:partnerId
router.get("/:partnerId", async (req, res, next) => {
  try {
    res.json(await ContractService.listByPartner(req.params.partnerId));
  } catch (e) { next(e); }
});

// GET /api/contracts/:partnerId (with employee join handled in service)

// POST /api/contracts/:partnerId — multipart/form-data { file, title, upload_date? }
router.post("/:partnerId", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) { res.status(400).json({ error: "Không có file" }); return; }
    const title           = (req.body.title as string) || req.file.originalname;
    const upload_date     = req.body.upload_date     as string | undefined;
    const employee_id     = (req.body.employee_id as string)     || null;
    const contract_number = (req.body.contract_number as string) || null;
    const contract = await ContractService.create(req.params.partnerId!, {
      title,
      file_name:  req.file.originalname,
      file_path:  req.file.path,
      file_size:  req.file.size,
      upload_date,
      employee_id,
      contract_number,
    });
    res.status(201).json(contract);
  } catch (e) { next(e); }
});

// PATCH /api/contracts/:partnerId/:id — update metadata (no file re-upload)
router.patch("/:partnerId/:id", async (req, res, next) => {
  try {
    const { contract_number, title, upload_date, employee_id } = req.body as Record<string, string>;
    res.json(await ContractService.update(req.params.id, req.params.partnerId, {
      contract_number: contract_number !== undefined ? (contract_number || null) : undefined,
      title:       title       || undefined,
      upload_date: upload_date || undefined,
      employee_id: employee_id !== undefined ? (employee_id || null) : undefined,
    }));
  } catch (e) { next(e); }
});

// DELETE /api/contracts/:partnerId/:id
router.delete("/:partnerId/:id", async (req, res, next) => {
  try {
    await ContractService.delete(req.params.id, req.params.partnerId);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// GET /api/contracts/:partnerId/:id/download — serve file as attachment
router.get("/:partnerId/:id/download", async (req, res, next) => {
  try {
    const rows = await ContractService.listByPartner(req.params.partnerId);
    const doc  = rows.find((r) => r.id === req.params.id);
    if (!doc) { res.status(404).json({ error: "Không tìm thấy" }); return; }
    res.download(path.resolve(doc.file_path), doc.file_name);
  } catch (e) { next(e); }
});

// GET /api/contracts/:partnerId/:id/view — serve file inline (for PDF viewer)
router.get("/:partnerId/:id/view", async (req, res, next) => {
  try {
    const rows = await ContractService.listByPartner(req.params.partnerId);
    const doc  = rows.find((r) => r.id === req.params.id);
    if (!doc) { res.status(404).json({ error: "Không tìm thấy" }); return; }
    const absPath = path.resolve(doc.file_path);
    const ext = path.extname(doc.file_name).toLowerCase();
    const mime: Record<string, string> = {
      ".pdf":  "application/pdf",
      ".png":  "image/png",
      ".jpg":  "image/jpeg",
      ".jpeg": "image/jpeg",
    };
    const contentType = mime[ext] ?? "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(doc.file_name)}"`);
    res.sendFile(absPath);
  } catch (e) { next(e); }
});

export { router as contractsRouter };
