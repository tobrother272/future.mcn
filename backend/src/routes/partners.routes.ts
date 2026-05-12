import { Router } from "express";
import { z } from "zod";
import { PartnerService } from "../services/partner.service.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { auditLogger } from "../middleware/audit.js";

const router = Router();
router.use(requireAuth);
router.use(auditLogger("partner"));

const listQuerySchema = z.object({
  type:   z.enum(["OWNED","PRODUCTION","AFFILIATE"]).optional(),
  tier:   z.enum(["Premium","Standard","Basic"]).optional(),
  status: z.enum(["Active","Suspended","Terminated"]).optional(),
  search: z.string().optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(500).default(50),
});

const createSchema = z.object({
  id:           z.string().optional(),
  name:         z.string().min(1),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  website:      z.string().url().or(z.literal("")).optional(),
  email:        z.string().email().or(z.literal("")).optional(),
  phone:        z.string().optional(),
  type:         z.enum(["OWNED","PRODUCTION","AFFILIATE"]).default("AFFILIATE"),
  tier:         z.enum(["Premium","Standard","Basic"]).default("Standard"),
  rev_share:    z.coerce.number().min(0).max(100).default(70),
  dept:         z.string().optional(),
  notes:        z.string().optional(),
});

router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try { res.json(await PartnerService.list(req.query as never)); } catch(e) { next(e); }
});

router.get("/pending-users", async (req, res, next) => {
  try { res.json(await PartnerService.listPendingUsers()); } catch(e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try { res.json(await PartnerService.getById(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/profile", async (req, res, next) => {
  try { res.json(await PartnerService.getProfile(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/channels", async (req, res, next) => {
  try {
    const { queryMany } = await import("../db/helpers.js");
    const rows = await queryMany(
      `SELECT c.*,
              cm.name AS cms_name,
              t.name  AS topic_name,
              p2.name AS partner_name
       FROM channel c
       LEFT JOIN cms     cm ON c.cms_id     = cm.id
       LEFT JOIN topic   t  ON c.topic_id   = t.id
       LEFT JOIN partner p2 ON c.partner_id = p2.id
       WHERE c.partner_id = $1
       ORDER BY c.name`,
      [req.params.id]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.get("/:id/revenue", async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 30));
    const { queryMany } = await import("../db/helpers.js");
    const rows = await queryMany<{
      snapshot_date: string; revenue: number; views: number;
      engaged_views: number; watch_time_hours: number;
    }>(
      `SELECT
         ca.date                            AS snapshot_date,
         SUM(ca.revenue)::float8            AS revenue,
         SUM(ca.views)::float8              AS views,
         SUM(ca.engaged_views)::float8      AS engaged_views,
         SUM(ca.watch_time_hours)::float8   AS watch_time_hours
       FROM channel_analytics ca
       JOIN channel c ON c.id = ca.channel_id
       WHERE c.partner_id = $1
         AND ca.date >= CURRENT_DATE - ($2::int)
       GROUP BY ca.date
       ORDER BY ca.date ASC`,
      [req.params.id, days]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.get("/:id/contracts", async (req, res, next) => {
  try {
    const { queryMany } = await import("../db/helpers.js");
    const rows = await queryMany(
      `SELECT * FROM contract WHERE partner_id=$1 ORDER BY start_date DESC`, [req.params.id]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.get("/:id/users", async (req, res, next) => {
  try {
    const { queryMany } = await import("../db/helpers.js");
    const rows = await queryMany(
      `SELECT id,email,full_name,status,last_login,created_at FROM account
       WHERE account_type='partner' AND partner_id=$1`,
      [req.params.id]
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.post("/", validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await PartnerService.create(req.body)); } catch(e) { next(e); }
});

router.post("/auto-sync", async (req, res, next) => {
  try { res.json(await PartnerService.autoSync(req.body.id)); } catch(e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try { res.json(await PartnerService.update(req.params.id, req.body)); } catch(e) { next(e); }
});

router.patch("/:id/parent", async (req, res, next) => {
  try {
    const parentId = (req.body as { parent_id: string | null }).parent_id ?? null;
    res.json(await PartnerService.setParent(req.params.id, parentId));
  } catch(e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try { res.json(await PartnerService.delete(req.params.id)); } catch(e) { next(e); }
});

// ── Partner Users sub-resource ─────────────────────────────
router.post("/users/:userId/approve", async (req, res, next) => {
  try {
    const result = await PartnerService.approveUser(req.params.userId, req.user!.id, req.body.partner_id);
    res.json(result);
  } catch(e) { next(e); }
});

router.post("/users/:userId/reject", async (req, res, next) => {
  try { res.json(await PartnerService.rejectUser(req.params.userId, req.user!.id)); } catch(e) { next(e); }
});

export { router as partnersRouter };
