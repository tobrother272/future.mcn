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

// ── Sub-accounts (partner cha quản lý tài khoản cho từng đối tác con) ─────
// Đặt TRƯỚC mọi route "/:id/..." để tránh router treat "sub-accounts" như partner ID.

/** Bảo đảm caller là partner cha (account_type='partner', partner_id != null, không có parent_id). */
async function requireParentPartner(req: import("express").Request) {
  const u = req.user;
  if (!u || u.userType !== "partner" || !u.partner_id) {
    const { ForbiddenError } = await import("../lib/errors.js");
    throw new ForbiddenError("Chỉ tài khoản đối tác mới truy cập được");
  }
  const { queryOne } = await import("../db/helpers.js");
  const p = await queryOne<{ parent_id: string | null }>(
    `SELECT parent_id FROM partner WHERE id=$1`, [u.partner_id]
  );
  if (!p) {
    const { NotFoundError } = await import("../lib/errors.js");
    throw new NotFoundError("Đối tác không tồn tại");
  }
  if (p.parent_id) {
    const { ForbiddenError } = await import("../lib/errors.js");
    throw new ForbiddenError("Chỉ đối tác cha mới có thể quản lý tài khoản con");
  }
  return u.partner_id;
}

const subAccountCreateSchema = z.object({
  child_partner_id: z.string().min(1),
  email:            z.string().email(),
  full_name:        z.string().min(1),
  phone:            z.string().optional(),
  password:         z.string().min(8),
});

const subAccountStatusSchema = z.object({
  status: z.enum(["Active", "Suspended"]),
});

const subAccountResetPwdSchema = z.object({
  new_password: z.string().min(8),
});

router.get("/sub-accounts", async (req, res, next) => {
  try {
    const parentId = await requireParentPartner(req);
    res.json(await PartnerService.listChildPartnersWithAccounts(parentId));
  } catch (e) { next(e); }
});

router.post("/sub-accounts", validate(subAccountCreateSchema), async (req, res, next) => {
  try {
    const parentId = await requireParentPartner(req);
    const created = await PartnerService.createSubAccount(parentId, req.body);
    res.status(201).json(created);
  } catch (e) { next(e); }
});

router.patch("/sub-accounts/:userId/status", validate(subAccountStatusSchema), async (req, res, next) => {
  try {
    const parentId = await requireParentPartner(req);
    const userId = req.params.userId ?? "";
    res.json(await PartnerService.setSubAccountStatus(parentId, userId, req.body.status));
  } catch (e) { next(e); }
});

router.post("/sub-accounts/:userId/reset-password", validate(subAccountResetPwdSchema), async (req, res, next) => {
  try {
    const parentId = await requireParentPartner(req);
    const userId = req.params.userId ?? "";
    res.json(await PartnerService.resetSubAccountPassword(parentId, userId, req.body.new_password));
  } catch (e) { next(e); }
});

router.delete("/sub-accounts/:userId", async (req, res, next) => {
  try {
    const parentId = await requireParentPartner(req);
    const userId = req.params.userId ?? "";
    res.json(await PartnerService.deleteSubAccount(parentId, userId));
  } catch (e) { next(e); }
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
    const { from, to } = req.query as { from?: string; to?: string };
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 30));
    const { queryMany } = await import("../db/helpers.js");
    const dateFilter = from && to
      ? `AND ca.date >= $2::date AND ca.date <= $3::date`
      : `AND ca.date >= CURRENT_DATE - ($2::int)`;
    const params = from && to ? [req.params.id, from, to] : [req.params.id, days];
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
       WHERE c.partner_id IN (
         SELECT id FROM partner WHERE id = $1 OR parent_id = $1
       )
         ${dateFilter}
       GROUP BY ca.date
       ORDER BY ca.date ASC`,
      params
    );
    res.json(rows);
  } catch(e) { next(e); }
});

/**
 * Revenue/views theo từng ngày, GROUP-BY theo:
 * - by=child   → mỗi đối tác (bản thân partner + từng partner con)
 * - by=channel → mỗi kênh thuộc partner + partner con
 *
 * Period: ?days= hoặc ?from=&to=
 *
 * Trả về dạng dài (long format) để frontend pivot:
 *   [{ snapshot_date, group_id, group_name, revenue, views }]
 */
router.get("/:id/revenue-grouped", async (req, res, next) => {
  try {
    const by = (req.query["by"] === "channel" ? "channel" : "child") as "child" | "channel";
    const { from, to } = req.query as { from?: string; to?: string };
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 30));
    const { queryMany } = await import("../db/helpers.js");

    const useRange = Boolean(from && to);
    const dateFilter = useRange
      ? `AND ca.date >= $2::date AND ca.date <= $3::date`
      : `AND ca.date >= CURRENT_DATE - ($2::int)`;
    const params = useRange
      ? [req.params.id, from, to]
      : [req.params.id, days];

    if (by === "channel") {
      const rows = await queryMany(
        `SELECT ca.date                          AS snapshot_date,
                c.id                             AS group_id,
                c.name                           AS group_name,
                SUM(ca.revenue)::float8          AS revenue,
                SUM(ca.views)::float8            AS views
         FROM channel_analytics ca
         JOIN channel c ON c.id = ca.channel_id
         WHERE c.partner_id IN (
           SELECT id FROM partner WHERE id = $1 OR parent_id = $1
         )
           ${dateFilter}
         GROUP BY ca.date, c.id, c.name
         ORDER BY ca.date ASC, group_name ASC`,
        params
      );
      res.json(rows);
      return;
    }

    // by === "child": gom revenue/views theo từng partner (chính + từng con)
    const rows = await queryMany(
      `SELECT ca.date                          AS snapshot_date,
              p.id                             AS group_id,
              p.name                           AS group_name,
              SUM(ca.revenue)::float8          AS revenue,
              SUM(ca.views)::float8            AS views
       FROM channel_analytics ca
       JOIN channel c ON c.id = ca.channel_id
       JOIN partner p ON p.id = c.partner_id
       WHERE p.id = $1 OR p.parent_id = $1
         ${dateFilter}
       GROUP BY ca.date, p.id, p.name
       ORDER BY ca.date ASC, group_name ASC`,
      params
    );
    res.json(rows);
  } catch(e) { next(e); }
});

/**
 * Top channels by revenue cho partner (gồm cả partner con).
 * Period: ?days= hoặc ?from=&to=
 * Limit:  ?limit= (default 10, max 50)
 *
 * Ưu tiên SUM doanh thu từ channel_analytics trong khoảng thời gian.
 * Nếu kênh chưa có data analytics trong khoảng → revenue trả về 0
 * (frontend có thể fallback sort theo monthly_revenue nếu cần).
 */
router.get("/:id/top-channels", async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 30));
    const limit = Math.min(50, Math.max(1, Number(req.query["limit"]) || 10));
    const { queryMany } = await import("../db/helpers.js");

    const useRange = Boolean(from && to);
    const dateFilter = useRange
      ? `AND ca.date >= $2::date AND ca.date <= $3::date`
      : `AND ca.date >= CURRENT_DATE - ($2::int)`;
    const baseParams: unknown[] = useRange
      ? [req.params.id, from, to]
      : [req.params.id, days];
    baseParams.push(limit);
    const limitIdx = baseParams.length;

    const rows = await queryMany(
      `SELECT c.id,
              c.name,
              c.yt_id,
              c.status,
              c.monetization,
              c.subscribers,
              c.monthly_revenue,
              c.cms_id,
              cm.name AS cms_name,
              c.partner_id,
              p.name  AS partner_name,
              COALESCE(SUM(ca.revenue) FILTER (WHERE ca.id IS NOT NULL), 0)::float8 AS revenue,
              COALESCE(SUM(ca.views)   FILTER (WHERE ca.id IS NOT NULL), 0)::float8 AS views
       FROM channel c
       LEFT JOIN cms cm    ON cm.id = c.cms_id
       LEFT JOIN partner p ON p.id  = c.partner_id
       LEFT JOIN channel_analytics ca
              ON ca.channel_id = c.id
              ${dateFilter}
       WHERE c.partner_id IN (
         SELECT id FROM partner WHERE id = $1 OR parent_id = $1
       )
       GROUP BY c.id, cm.name, p.name
       ORDER BY revenue DESC, c.monthly_revenue DESC NULLS LAST
       LIMIT $${limitIdx}`,
      baseParams
    );
    res.json(rows);
  } catch(e) { next(e); }
});

/**
 * Breakdown doanh thu cho partner (gồm partner con).
 * Period: ?days= hoặc ?from=&to=
 * by=child  → nhóm theo từng partner con (partner gốc gọi là "Của tôi")
 * by=cms    → nhóm theo CMS (net)
 *
 * Doanh thu lấy từ channel_analytics trong khoảng thời gian (chính xác hơn
 * so với monthly_revenue tích lũy).
 */
router.get("/:id/breakdown", async (req, res, next) => {
  try {
    const by = (req.query["by"] === "cms" ? "cms" : "child") as "cms" | "child";
    const { from, to } = req.query as { from?: string; to?: string };
    const days = Math.min(365, Math.max(1, Number(req.query["days"]) || 30));
    const { queryMany } = await import("../db/helpers.js");

    const useRange = Boolean(from && to);
    const dateFilter = useRange
      ? `AND ca.date >= $2::date AND ca.date <= $3::date`
      : `AND ca.date >= CURRENT_DATE - ($2::int)`;
    const params = useRange
      ? [req.params.id, from, to]
      : [req.params.id, days];

    if (by === "cms") {
      // Nhóm theo CMS (net) — gộp luôn channel của partner + partner con
      const rows = await queryMany(
        `SELECT c.cms_id              AS id,
                COALESCE(cm.name, '— Chưa có CMS —') AS name,
                cm.currency,
                COALESCE(SUM(ca.revenue), 0)::float8 AS revenue,
                COALESCE(SUM(ca.views),   0)::float8 AS views
         FROM channel c
         LEFT JOIN cms cm ON cm.id = c.cms_id
         LEFT JOIN channel_analytics ca
                ON ca.channel_id = c.id
                ${dateFilter}
         WHERE c.partner_id IN (
           SELECT id FROM partner WHERE id = $1 OR parent_id = $1
         )
         GROUP BY c.cms_id, cm.name, cm.currency
         ORDER BY revenue DESC`,
        params
      );
      res.json(rows);
      return;
    }

    // by === "child": nhóm theo partner (chính + từng con)
    const rows = await queryMany(
      `SELECT p.id,
              p.name,
              CASE WHEN p.id = $1 THEN true ELSE false END AS is_self,
              COALESCE(SUM(ca.revenue), 0)::float8 AS revenue,
              COALESCE(SUM(ca.views),   0)::float8 AS views
       FROM partner p
       LEFT JOIN channel c ON c.partner_id = p.id
       LEFT JOIN channel_analytics ca
              ON ca.channel_id = c.id
              ${dateFilter}
       WHERE p.id = $1 OR p.parent_id = $1
       GROUP BY p.id, p.name
       ORDER BY revenue DESC`,
      params
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.get("/:id/contracts", async (req, res, next) => {
  try {
    const { queryMany } = await import("../db/helpers.js");
    // Lấy contracts của partner này VÀ tất cả partner con (đệ quy)
    const rows = await queryMany(
      `WITH RECURSIVE sub AS (
         SELECT id FROM partner WHERE id = $1
         UNION ALL
         SELECT p.id FROM partner p JOIN sub s ON p.parent_id = s.id
       )
       SELECT c.*, p.name AS partner_name
       FROM contract c
       JOIN sub s ON c.partner_id = s.id
       JOIN partner p ON p.id = c.partner_id
       ORDER BY c.start_date DESC`,
      [req.params.id]
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
