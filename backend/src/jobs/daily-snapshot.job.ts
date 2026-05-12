/**
 * daily-snapshot.job.ts
 * Runs once at startup to check if today's snapshot is missing, then schedules
 * a cron-like interval (every 24h at ~00:05 UTC).
 * No external cron dependency — uses setInterval.
 */
import { RevenueService } from "../services/revenue.service.js";
import { logger } from "../lib/logger.js";

export function startDailySnapshotJob() {
  const RUN_HOUR_UTC = 0;  // midnight UTC
  const RUN_MINUTE_UTC = 5;

  const runSnapshot = async () => {
    try {
      logger.info("Running daily revenue snapshot...");
      const result = await RevenueService.snapshotAll("cron");
      logger.info({ count: result.count, date: result.date }, "Daily snapshot complete");
    } catch (err) {
      logger.error({ err }, "Daily snapshot failed");
    }
  };

  // Schedule next run at 00:05 UTC
  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(RUN_HOUR_UTC, RUN_MINUTE_UTC, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    logger.info({ nextRun: next.toISOString() }, "Daily snapshot scheduled");
    setTimeout(async () => {
      await runSnapshot();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}
