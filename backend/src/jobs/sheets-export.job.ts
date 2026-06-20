/**
 * sheets-export.job.ts
 * Exports all channel data to Google Sheets once a day at 22:00 UTC (= 05:00 AM Vietnam time).
 */
import { exportChannelsToSheet } from "../services/sheets.service.js";
import { logger } from "../lib/logger.js";
import { queryOne, queryMany } from "../db/helpers.js";

export function startSheetsExportJob() {
  const RUN_HOUR_UTC   = 22;
  const RUN_MINUTE_UTC = 0;

  const runExport = async () => {
    try {
      const enabledRow = await queryOne<{ value: unknown }>(
        `SELECT value FROM setting WHERE key='sheets_export_enabled'`
      );
      if (enabledRow !== null && enabledRow.value === false) {
        logger.info("Sheets export skipped — disabled in system settings");
        return;
      }

      const credRows = await queryMany<{ key: string; value: unknown }>(
        `SELECT key, value FROM setting WHERE key IN ('sheets_service_account_email','sheets_private_key','sheets_sheet_id')`
      );
      const byKey = Object.fromEntries(credRows.map((r) => [r.key, r.value as string]));
      const creds = (byKey.sheets_service_account_email && byKey.sheets_private_key && byKey.sheets_sheet_id)
        ? { email: byKey.sheets_service_account_email, privateKey: byKey.sheets_private_key, sheetId: byKey.sheets_sheet_id }
        : undefined;

      logger.info("Running Google Sheets channel export...");
      const { written } = await exportChannelsToSheet(creds);
      await queryOne(
        `INSERT INTO setting (key, value, updated_at) VALUES ('sheets_last_export', $1::jsonb, now())
         ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = now()`,
        [JSON.stringify({ written, ts: new Date().toISOString() })]
      );
      logger.info({ written }, "Google Sheets export complete");
    } catch (err) {
      logger.error({ err }, "Google Sheets export failed");
    }
  };

  function scheduleNext() {
    const now  = new Date();
    const next = new Date();
    next.setUTCHours(RUN_HOUR_UTC, RUN_MINUTE_UTC, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delay = next.getTime() - now.getTime();
    logger.info({ nextRun: next.toISOString() }, "Sheets export scheduled (daily 05:00 VN)");
    setTimeout(async () => {
      await runExport();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}
