import "dotenv/config";
import { createApp } from "./app.js";
import { waitForDb } from "./db/pool.js";
import { logger } from "./lib/logger.js";
import { env } from "./lib/env.js";
import { createServer } from "http";

(async () => {
  await waitForDb();
  const app = createApp();
  const server = createServer(app);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.fatal({ port: env.PORT }, "Port already in use — killing old process and retrying");
      process.exit(1);
    }
    throw err;
  });

  server.listen(env.PORT, "0.0.0.0", () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, `✓ Meridian v6 API running on :${env.PORT}`);
  });

  // Graceful shutdown so tsx watch can restart cleanly
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000); // force exit after 3s
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
})().catch((err: unknown) => {
  logger.fatal({ err }, "Fatal startup error");
  process.exit(1);
});
