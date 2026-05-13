import { Router } from "express";
import { RevenueService } from "../services/revenue.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res, next) => {
  try {
    const { scope, scopeId, days } = req.query as Record<string, string>;
    if (!scope || !scopeId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "scope and scopeId are required" } });
      return;
    }
    res.json(await RevenueService.getByScope(scope, scopeId, Number(days) || 30));
  } catch(e) { next(e); }
});

router.get("/breakdown", async (req, res, next) => {
  try {
    const by = (req.query.by as "cms" | "channel" | "partner") ?? "cms";
    const period = Math.min(365, Number(req.query.period) || 30);
    const { from, to } = req.query as { from?: string; to?: string };
    res.json(await RevenueService.getBreakdown(by, { period, from, to }));
  } catch(e) { next(e); }
});

router.get("/system-daily", async (req, res, next) => {
  try {
    const period = Math.min(365, Number(req.query.period) || 30);
    const { from, to } = req.query as { from?: string; to?: string };
    res.json(await RevenueService.getSystemDaily({ period, from, to }));
  } catch(e) { next(e); }
});

router.get("/variation", async (req, res, next) => {
  try {
    const { scope, scopeId } = req.query as Record<string, string>;
    if (!scope || !scopeId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "scope and scopeId required" } });
      return;
    }
    res.json(await RevenueService.getVariation(scope, scopeId));
  } catch(e) { next(e); }
});

router.post("/snapshot/all", async (req, res, next) => {
  try {
    res.json(await RevenueService.snapshotAll(req.user?.email));
  } catch(e) { next(e); }
});

router.post("/import", async (req, res, next) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows as never[] : [];
    res.json(await RevenueService.bulkImport(rows));
  } catch(e) { next(e); }
});

export { router as revenueRouter };
