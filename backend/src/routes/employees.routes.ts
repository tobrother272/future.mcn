import { Router } from "express";
import { z } from "zod";
import { EmployeeService } from "../services/employee.service.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const ROLES = ["Admin", "Cấp Kênh", "QC", "Kế Toán"] as const;

const bodySchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email().or(z.literal("")).optional(),
  phone:    z.string().optional(),
  username: z.string().min(1).optional().nullable(),
  password: z.string().min(6).optional(),
  role:     z.enum(ROLES).optional().nullable(),
  status:   z.enum(["Active", "Inactive"]).default("Active"),
  cms_ids:  z.array(z.string()).optional().default([]),
});

router.get("/", async (req, res, next) => {
  try {
    const user = req.user;
    // Admin employee chỉ thấy nhân viên do mình tạo
    const created_by =
      user?.userType === "employee" && user.role === "Admin"
        ? user.id
        : undefined;

    res.json(await EmployeeService.list({
      status:     req.query.status as string | undefined,
      search:     req.query.search as string | undefined,
      limit:      req.query.limit  ? Number(req.query.limit)  : 100,
      offset:     req.query.offset ? Number(req.query.offset) : 0,
      created_by,
    }));
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try { res.json(await EmployeeService.getById(req.params.id)); } catch (e) { next(e); }
});

router.post("/", async (req, res, next) => {
  try {
    const data = bodySchema.parse(req.body);
    const user = req.user;
    const isAdminEmployee = user?.userType === "employee" && user.role === "Admin";

    // Admin employee không được tạo nhân viên có role Admin
    if (isAdminEmployee && data.role === "Admin") {
      const { ForbiddenError } = await import("../lib/errors.js");
      return next(new ForbiddenError("Admin không có quyền tạo nhân viên role Admin"));
    }

    // Ghi nhận ai tạo ra nhân viên này
    const created_by = user?.userType === "employee" ? user.id : null;

    res.status(201).json(await EmployeeService.create({
      ...data,
      username: data.username ?? undefined,
      role:     data.role     ?? undefined,
      created_by,
    }));
  } catch (e) { next(e); }
});

router.put("/:id", async (req, res, next) => {
  try {
    const data = bodySchema.partial().parse(req.body);
    res.json(await EmployeeService.update(req.params.id, data as Parameters<typeof EmployeeService.update>[1]));
  } catch (e) { next(e); }
});

router.delete("/:id", async (req, res, next) => {
  try { res.json(await EmployeeService.delete(req.params.id)); } catch (e) { next(e); }
});

export { router as employeesRouter };
