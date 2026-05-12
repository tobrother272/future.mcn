import pg from "pg";
import { env } from "../lib/env.js";
import { logger } from "../lib/logger.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected pg pool error");
});

export async function waitForDb(retries = 10, delay = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query("SELECT 1");
      logger.info("✓ Database connected");
      return;
    } catch (err) {
      logger.warn({ attempt: i + 1, retries, err }, "Waiting for DB...");
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("Database connection failed after retries");
}
