import { Router } from "express";
import { z } from "zod";
import { WorkflowService } from "../services/workflow.service.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { auditLogger } from "../middleware/audit.js";

const router = Router();
router.use(requireAuth);
router.use(auditLogger("submission"));

const createSchema = z.object({
  video_title:   z.string().min(1),
  video_url:     z.string().url().optional(),
  storage_type:  z.string().optional(),
  storage_url:   z.string().optional(),
  description:   z.string().optional(),
  category:      z.string().optional(),
});

const transitionSchema = z.object({
  toState:      z.enum(["DRAFT","SUBMITTED","QC_REVIEWING","QC_REJECTED","QC_APPROVED","CHANNEL_PROVISIONING","PROVISIONING_FAILED","ACTIVE"]),
  note:         z.string().optional(),
  qcInspection: z.record(z.unknown()).optional(),
});

router.get("/", async (req, res, next) => {
  try {
    res.json(await WorkflowService.list({
      state:      req.query.state as string | undefined,
      partner_id: req.query.partner_id as string | undefined,
      search:     req.query.search as string | undefined,
      page:       Number(req.query.page) || 1,
      limit:      Number(req.query.limit) || 50,
    }));
  } catch(e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try { res.json(await WorkflowService.getById(req.params.id)); } catch(e) { next(e); }
});

router.get("/:id/log", async (req, res, next) => {
  try { res.json(await WorkflowService.getLog(req.params.id)); } catch(e) { next(e); }
});

router.post("/", validate(createSchema), async (req, res, next) => {
  try {
    const data = { ...req.body, partner_user_id: req.user!.id };
    res.status(201).json(await WorkflowService.create(data));
  } catch(e) { next(e); }
});

router.put("/:id/state", validate(transitionSchema), async (req, res, next) => {
  try {
    const by = { id: req.user!.id, email: req.user!.email ?? "", role: req.user!.role };
    res.json(await WorkflowService.transition(req.params.id!, req.body.toState, by, req.body));
  } catch(e) { next(e); }
});

router.post("/:id/provision", async (req, res, next) => {
  try {
    const by = { id: req.user!.id, email: req.user!.email ?? "", role: req.user!.role };
    res.json(await WorkflowService.provision(req.params.id!, by, req.body));
  } catch(e) { next(e); }
});

export { router as submissionsRouter };
