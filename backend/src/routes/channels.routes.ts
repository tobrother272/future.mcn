import { Router } from "express";
import { z } from "zod";
import { ChannelService } from "../services/channel.service.js";
import { VideoService } from "../services/video.service.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { auditLogger } from "../middleware/audit.js";
import { queryMany, queryOne } from "../db/helpers.js";
import { NotFoundError } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);
router.use(auditLogger("channel"));

const createSchema = z.object({
  cms_id:        z.string().optional(),
  partner_id:    z.string().optional(),
  topic_id:      z.string().optional(),
  yt_id:         z.string().optional(),
  name:          z.string().min(1),
  country:       z.string().length(2).default("VN"),
  status:        z.enum(["Active","Pending","Suspended","Terminated"]).default("Active"),
  monetization:  z.enum(["On","Off"]).default("Off"),
  notes:         z.string().optional(),
  subscribers:     z.coerce.number().default(0),
  monthly_views:   z.coerce.number().default(0),
  total_views:     z.coerce.number().default(0),
  video:           z.coerce.number().default(0),
  monthly_revenue: z.coerce.number().default(0),
  link_date:       z.string().date().optional().nullable(),
  metadata:        z.record(z.unknown()).default({}),
});

const listQuerySchema = z.object({
  cms_id:       z.string().optional(),
  partner_id:   z.string().optional(),
  topic_id:     z.string().optional(),
  status:       z.enum(["Active","Pending","Suspended","Terminated"]).optional(),
  monetization: z.enum(["On","Off"]).optional(),
  health:       z.enum(["Healthy","Warning","Critical"]).optional(),
  search:       z.string().optional(),
  page:         z.coerce.number().int().positive().default(1),
  limit:        z.coerce.number().int().positive().max(500).default(50),
  sortBy:       z.string().optional(),
  sortDir:      z.enum(["asc","desc"]).default("asc"),
});

router.get("/", validate(listQuerySchema, "query"), async (req, res, next) => {
  try { res.json(await ChannelService.list(req.query as never)); } catch(e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try { res.json(await ChannelService.getById(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/revenue", async (req, res, next) => {
  try {
    const days = Math.min(365, Number(req.query.days) || 30);
    res.json(await ChannelService.getRevenue(req.params.id, days));
  } catch(e) { next(e); }
});

router.get("/:id/violations", async (req, res, next) => {
  try { res.json(await ChannelService.getViolations(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/submissions", async (req, res, next) => {
  try { res.json(await ChannelService.getSubmissions(req.params.id)); } catch(e) { next(e); }
});

router.post("/", validate(createSchema), async (req, res, next) => {
  try { res.status(201).json(await ChannelService.create(req.body)); } catch(e) { next(e); }
});

router.post("/import", async (req, res, next) => {
  try {
    const rows = req.body as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "Body phải là mảng channel rows" });
      return;
    }
    res.json(await ChannelService.bulkImport(rows as never));
  } catch(e) { next(e); }
});

router.post("/bulk-edit", async (req, res, next) => {
  try {
    const { ids, updates } = req.body as { ids: string[]; updates: Record<string, unknown> };
    res.json(await ChannelService.bulkEdit(ids ?? [], updates ?? {}));
  } catch(e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try { res.json(await ChannelService.update(req.params.id, req.body)); } catch(e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try { res.json(await ChannelService.delete(req.params.id)); } catch(e) { next(e); }
});

// ── Analytics sub-resource ───────────────────────────────────
router.get("/:id/analytics", async (req, res, next) => {
  try {
    const ch = await queryOne<{ id: string }>(
      `SELECT id FROM channel WHERE id = $1`, [req.params.id]
    );
    if (!ch) throw new NotFoundError(`Channel ${req.params.id} not found`);

    const days  = Math.min(365, Number(req.query.days)  || 30);
    const limit = Math.min(365, Number(req.query.limit) || days);

    const rows = await queryMany(
      `SELECT date, views, engaged_views, watch_time_hours,
              avg_view_duration, revenue
       FROM channel_analytics
       WHERE channel_id = $1
         AND date >= CURRENT_DATE - ($2::int)
       ORDER BY date DESC
       LIMIT $3`,
      [ch.id, days, limit]
    );

    const summary = await queryOne<{
      total_views: string; total_engaged: string;
      total_watch_hours: string; total_revenue: string;
    }>(
      `SELECT
         COALESCE(SUM(views),0)::text            AS total_views,
         COALESCE(SUM(engaged_views),0)::text    AS total_engaged,
         COALESCE(SUM(watch_time_hours),0)::text AS total_watch_hours,
         COALESCE(SUM(revenue),0)::text          AS total_revenue
       FROM channel_analytics
       WHERE channel_id = $1
         AND date >= CURRENT_DATE - ($2::int)`,
      [ch.id, days]
    );

    res.json({
      channel_id: ch.id,
      days,
      summary: {
        total_views:       Number(summary?.total_views       ?? 0),
        total_engaged:     Number(summary?.total_engaged     ?? 0),
        total_watch_hours: Number(summary?.total_watch_hours ?? 0),
        total_revenue:     Number(summary?.total_revenue     ?? 0),
      },
      items: rows,
    });
  } catch(e) { next(e); }
});

// ── Video sub-resource ────────────────────────────────────────
router.get("/:id/videos", async (req, res, next) => {
  try {
    const limit  = Math.min(200, Number(req.query.limit)  || 50);
    const offset = Number(req.query.offset) || 0;
    res.json(await VideoService.listByChannel(req.params.id, { limit, offset }));
  } catch(e) { next(e); }
});

router.post("/:id/videos/import", async (req, res, next) => {
  try {
    const rows = req.body as Array<Record<string, unknown>>;
    if (!Array.isArray(rows) || !rows.length) {
      res.status(400).json({ error: "Body phải là mảng video rows" }); return;
    }
    res.json(await VideoService.bulkImport(req.params.id, rows as never));
  } catch(e) { next(e); }
});

export { router as channelsRouter };
