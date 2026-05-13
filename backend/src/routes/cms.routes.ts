import { Router } from "express";
import { z } from "zod";
import { CmsService } from "../services/cms.service.js";
import { RevenueService } from "../services/revenue.service.js";
import { CmsApiKeyService } from "../services/cms-api-key.service.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { auditLogger } from "../middleware/audit.js";
import { NotFoundError } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);
router.use(auditLogger("cms"));

const createSchema = z.object({
  id: z.string().min(1).max(20).regex(/^[A-Z0-9_]+$/, "ID must be uppercase letters, digits, underscore"),
  name: z.string().min(1),
  currency: z.enum(["USD","VND","CAD","EUR","GBP","JPY","SGD","AUD"]).default("USD"),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  name:     z.string().min(1).optional(),
  currency: z.enum(["USD","VND","CAD","EUR","GBP","JPY","SGD","AUD"]).optional(),
  status:   z.enum(["Active","Suspended","Closed"]).optional(),
  notes:    z.string().optional(),
});

const listQuerySchema = z.object({
  status: z.enum(["Active","Suspended","Closed"]).optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(500).default(50),
});

router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try {
    const filters = req.query as { status?: string; page?: number; limit?: number };
    // Employees with assigned cms_ids only see their CMS
    const user = req.user;
    if (user?.userType === "employee" && user.cms_ids && user.cms_ids.length > 0) {
      const { queryMany, queryOne: qOne } = await import("../db/helpers.js");
      const ids = user.cms_ids;
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
      const rows = await queryMany(
        `SELECT * FROM cms WHERE id IN (${placeholders}) ORDER BY name ASC`,
        ids
      );
      const total = await qOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM cms WHERE id IN (${placeholders})`,
        ids
      );
      res.json({ items: rows, total: Number(total?.count ?? 0), page: 1, limit: ids.length });
      return;
    }
    res.json(await CmsService.list(filters as never));
  } catch(e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try { res.json(await CmsService.getById(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/stats", async (req, res, next) => {
  try { res.json(await CmsService.getStats(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/revenue", async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const days = Math.min(365, Number(req.query.days) || 30);
    res.json(await CmsService.getRevenue(req.params.id, { days, from, to }));
  } catch(e) { next(e); }
});

router.post("/:id/revenue/import", async (req, res, next) => {
  try {
    const rows = req.body as Array<{ snapshot_date: string; revenue: number; views?: number }>;
    if (!Array.isArray(rows) || !rows.length) {
      res.status(400).json({ error: "Body phải là mảng rows" }); return;
    }
    const mapped = rows.map((r) => ({
      scope:         "cms",
      scope_id:      req.params.id,
      snapshot_date: r.snapshot_date,
      revenue:       Number(r.revenue) || 0,
      views:         Number(r.views)   || 0,
      source:        "csv_import",
    }));
    res.json(await RevenueService.bulkImport(mapped));
  } catch(e) { next(e); }
});

router.get("/:id/channels", async (req, res, next) => {
  try {
    res.json(await CmsService.getChannels(req.params.id, {
      page:         Number(req.query.page)        || 1,
      limit:        Number(req.query.limit)       || 50,
      status:       req.query.status        as string | undefined,
      monetization: req.query.monetization  as string | undefined,
      search:       req.query.search        as string | undefined,
      topic_id:     req.query.topic_id      as string | undefined,
      min_views:    req.query.min_views     ? Number(req.query.min_views)   : undefined,
      min_revenue:  req.query.min_revenue   ? Number(req.query.min_revenue) : undefined,
    }));
  } catch(e) { next(e); }
});

router.get("/:id/topics", async (req, res, next) => {
  try { res.json(await CmsService.getTopics(req.params.id)); } catch(e) { next(e); }
});

router.post("/", validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await CmsService.create(req.body)); } catch(e) { next(e); }
});

const createTopicSchema = z.object({
  name:              z.string().min(1).max(100),
  dept:              z.string().optional(),
  expected_channels: z.coerce.number().int().min(0).optional(),
});

router.post("/:id/topics", validate(createTopicSchema), async (req, res, next) => {
  try {
    const t = await CmsService.createTopic(req.params.id!, req.body);
    res.status(201).json(t);
  } catch(e) { next(e); }
});

router.put("/:id", validate(updateSchema), async (req, res, next) => {
  try { res.json(await CmsService.update(req.params.id!, req.body)); } catch(e) { next(e); }
});


router.delete("/:id", async (req, res, next) => {
  try { res.json(await CmsService.delete(req.params.id)); } catch(e) { next(e); }
});

// ── API keys for the public sync endpoint ────────────────────────────────
// Only super admins and content managers should be able to mint long-lived
// tokens that bypass JWT auth — keep this gated.
const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN", "CONTENT_MANAGER"];

// Clear ALL channels of a CMS (destructive — admin only)
router.delete("/:id/channels",
  requireRole(...ADMIN_ROLES),
  async (req, res, next) => {
    try {
      const cms = await CmsService.getById(req.params.id!);
      if (!cms) throw new NotFoundError("CMS not found");
      const result = await (await import("../db/helpers.js")).query(
        `DELETE FROM channel WHERE cms_id = $1`, [req.params.id!]
      );
      res.json({ ok: true, deleted: result.rowCount ?? 0 });
    } catch(e) { next(e); }
  });

const createApiKeySchema = z.object({
  name:   z.string().min(1).max(80),
  scopes: z.array(z.enum(["channels:sync", "channels:read"]))
            .min(1).default(["channels:sync"]),
});

router.get("/:id/api-keys",
  requireRole(...ADMIN_ROLES),
  async (req, res, next) => {
    try {
      const cms = await CmsService.getById(req.params.id!);
      if (!cms) throw new NotFoundError("CMS not found");
      res.json(await CmsApiKeyService.listByCms(req.params.id!));
    } catch (e) { next(e); }
  });

router.post("/:id/api-keys",
  requireRole(...ADMIN_ROLES),
  validate(createApiKeySchema),
  async (req, res, next) => {
    try {
      const cms = await CmsService.getById(req.params.id!);
      if (!cms) throw new NotFoundError("CMS not found");
      const body = req.body as z.infer<typeof createApiKeySchema>;
      const result = await CmsApiKeyService.create({
        cms_id:     req.params.id!,
        name:       body.name,
        scopes:     body.scopes,
        created_by: req.user?.id ?? null,
      });
      // `plaintext` is shown ONLY here — never queryable afterwards.
      res.status(201).json({
        ...result.key,
        token: result.plaintext,
        warning: "Copy this token now — it cannot be retrieved later.",
      });
    } catch (e) { next(e); }
  });

router.delete("/:id/api-keys/:keyId",
  requireRole(...ADMIN_ROLES),
  async (req, res, next) => {
    try {
      const row = await CmsApiKeyService.revoke(req.params.keyId!);
      if (!row) throw new NotFoundError("API key not found or already revoked");
      res.json(row);
    } catch (e) { next(e); }
  });

export { router as cmsRouter };
