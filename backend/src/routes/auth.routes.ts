import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth.service.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

const loginSchema = z.object({
  login:    z.string().min(1),   // email or employee username
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1),
  company_name: z.string().min(1),
  phone: z.string().optional(),
});

const firstSetupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
});

router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const result = await AuthService.login(req.body.login, req.body.password);
    res.json(result);
  } catch (e) { next(e); }
});

router.post("/partner-register", validate(registerSchema), async (req, res, next) => {
  try {
    const result = await AuthService.registerPartner(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.post("/first-setup", validate(firstSetupSchema), async (req, res, next) => {
  try {
    const result = await AuthService.firstSetup(req.body);
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.post("/logout", requireAuth, (_req, res) => {
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await AuthService.getMe(req.user!.id, req.user!.userType);
    res.json(user);
  } catch (e) { next(e); }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { full_name, phone } = req.body as { full_name?: string; phone?: string };
    const ut = req.user!.userType as "partner" | "internal";
    res.json(await AuthService.updateMe(req.user!.id, ut, { full_name, phone }));
  } catch (e) { next(e); }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body as { current_password: string; new_password: string };
    if (!current_password || !new_password) { res.status(400).json({ error: "Thiếu thông tin" }); return; }
    if (new_password.length < 8) { res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 8 ký tự" }); return; }
    const ut = req.user!.userType as "partner" | "internal";
    res.json(await AuthService.changePassword(req.user!.id, ut, current_password, new_password));
  } catch (e) { next(e); }
});

// ── Internal user management (admin only) ────────────────────
router.get("/users", requireAuth, async (req, res, next) => {
  try { res.json(await AuthService.listUsers()); } catch(e) { next(e); }
});

router.post("/users", requireAuth, async (req, res, next) => {
  try {
    const { email, password, full_name, role } = req.body as Record<string, string>;
    if (!email || !password || !full_name || !role) { res.status(400).json({ error: "Thiếu thông tin bắt buộc" }); return; }
    if (password.length < 8) { res.status(400).json({ error: "Mật khẩu phải có ít nhất 8 ký tự" }); return; }
    res.status(201).json(await AuthService.createUser({ email, password, full_name, role }));
  } catch(e) { next(e); }
});

router.patch("/users/:id", requireAuth, async (req, res, next) => {
  try {
    const { role, status, full_name } = req.body as Record<string, string>;
    res.json(await AuthService.updateUser(req.params.id!, { role, status, full_name }));
  } catch(e) { next(e); }
});

export { router as authRouter };
