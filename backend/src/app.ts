import express from "express";
import path from "path";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./lib/logger.js";
import { env } from "./lib/env.js";

// ── Route imports ────────────────────────────────────────────
import { authRouter }         from "./routes/auth.routes.js";
import { cmsRouter }          from "./routes/cms.routes.js";
import { channelsRouter }     from "./routes/channels.routes.js";
import { partnersRouter }     from "./routes/partners.routes.js";
import { contractsRouter }    from "./routes/contracts.routes.js";
import { employeesRouter }    from "./routes/employees.routes.js";
import { revenueRouter }      from "./routes/revenue.routes.js";
import { submissionsRouter }  from "./routes/submissions.routes.js";
import { violationsRouter }   from "./routes/violations.routes.js";
import { notificationsRouter }from "./routes/notifications.routes.js";
import { auditRouter }        from "./routes/audit.routes.js";
import { policiesRouter }     from "./routes/policies.routes.js";
import { settingsRouter }     from "./routes/settings.routes.js";
import { publicRouter }       from "./routes/public.routes.js";
import { startDailySnapshotJob } from "./jobs/daily-snapshot.job.js";

export function createApp() {
  const app = express();

  // ── Middleware ─────────────────────────────────────────────
  app.set("trust proxy", 1);

  app.use(cors({
    origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()),
    credentials: true,
  }));

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static(path.resolve("uploads")));

  app.use(pinoHttp({ logger, autoLogging: env.NODE_ENV !== "test" }));

  app.use(
    "/api",
    rateLimit({
      windowMs: 60_000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req): string => {
        const forwarded = req.headers["x-forwarded-for"];
        let ip: string | undefined;
        if (Array.isArray(forwarded)) {
          ip = forwarded[0];
        } else if (typeof forwarded === "string") {
          ip = forwarded.split(",")[0]?.trim();
        }
        return ip ?? req.ip ?? "unknown";
      },
    })
  );

  // ── Health check ───────────────────────────────────────────
  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, version: "6.0.0", env: env.NODE_ENV });
  });

  // ── Mount routers ──────────────────────────────────────────
  // Public API for external tools — authenticated via CMS-scoped API keys,
  // NOT JWT. Mounted FIRST so it short-circuits before the catch-all
  // `notificationsRouter` (which calls `requireAuth` and would otherwise
  // intercept any /api/* path with a 401).
  app.use("/api/public",      publicRouter);

  app.use("/api/auth",        authRouter);
  app.use("/api/cms",         cmsRouter);
  app.use("/api/channels",    channelsRouter);
  app.use("/api/partners",    partnersRouter);
  app.use("/api/contracts",   contractsRouter);
  app.use("/api/employees",   employeesRouter);
  app.use("/api/revenue",     revenueRouter);
  app.use("/api/submissions", submissionsRouter);
  app.use("/api/violations",  violationsRouter);
  app.use("/api",             notificationsRouter);   // /api/notifications, /api/comments
  app.use("/api/audit",       auditRouter);
  app.use("/api/policies",    policiesRouter);
  app.use("/api/settings",    settingsRouter);

  // ── Network info endpoint ─────────────────────────────────
  app.get("/api/network-info", (_req, res) => {
    res.json({ hostname: process.env.HOSTNAME ?? "localhost", port: env.PORT });
  });

  // ── Start background jobs ─────────────────────────────────
  if (env.NODE_ENV !== "test") {
    startDailySnapshotJob();
  }

  // ── 404 handler ───────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Endpoint not found" } });
  });

  // ── Global error handler ─────────────────────────────────
  app.use(errorHandler);

  return app;
}
