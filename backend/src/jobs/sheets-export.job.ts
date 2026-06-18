/**
 * sheets-export.job.ts
 * Exports all channel data to Google Sheets once a day at 22:00 UTC (= 05:00 AM Vietnam time).
 * Uses the same zero-dependency setTimeout pattern as daily-snapshot.job.ts.
 */
import { exportChannelsToSheet } from "../services/sheets.service.js";
import { logger } from "../lib/logger.js";
import { env } from "../lib/env.js";

export function startSheetsExportJob() {
  // Skip silently when Google credentials are not configured (dev environment, etc.)
  if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY || !env.GOOGLE_SHEET_ID) {
    logger.info("Sheets export job skipped — GOOGLE_* env vars not set");
    return;
  }

  const RUN_HOUR_UTC = 22;   // 22:00 UTC = 05:00 AM Vietnam (UTC+7)
  const RUN_MINUTE_UTC = 0;

  const runExport = async () => {
    try {
      logger.info("Running Google Sheets channel export...");
      const { written } = await exportChannelsToSheet();
      logger.info({ written }, "Google Sheets export complete");
    } catch (err) {
      logger.error({ err }, "Google Sheets export failed");
    }
  };

  function scheduleNext() {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(RUN_HOUR_UTC, RUN_MINUTE_UTC, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    logger.info({ nextRun: next.toISOString() }, "Sheets export scheduled");
    setTimeout(async () => {
      await runExport();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}
