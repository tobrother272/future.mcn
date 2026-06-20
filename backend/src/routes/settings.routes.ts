import { Router } from "express";
import { queryMany, queryOne } from "../db/helpers.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (_req, res, next) => {
  try {
    const rows = await queryMany<{ key: string; value: unknown; updated_at: string }>(
      `SELECT key, value, updated_at FROM setting ORDER BY key`
    );
    res.json(rows);
  } catch(e) { next(e); }
});

router.put("/:key", async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body as { value: unknown };
    const row = await queryOne<{ key: string; value: unknown; updated_at: string }>(
      `INSERT INTO setting (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = $2::jsonb, updated_at = now()
       RETURNING key, value, updated_at`,
      [key, JSON.stringify(value)]
    );
    res.json(row);
  } catch(e) { next(e); }
});

router.delete("/:key", async (req, res, next) => {
  try {
    await queryOne(`DELETE FROM setting WHERE key=$1`, [req.params.key]);
    res.json({ ok: true });
  } catch(e) { next(e); }
});

// ── Manual Google Sheets export trigger ──────────────────────
router.post("/sheets-export/trigger", async (_req, res, next) => {
  try {
    // Read credentials from DB settings (override env vars if set)
    const rows = await queryMany<{ key: string; value: unknown }>(
      `SELECT key, value FROM setting WHERE key IN ('sheets_service_account_email','sheets_private_key','sheets_sheet_id')`
    );
    const byKey = Object.fromEntries(rows.map(r => [r.key, r.value as string]));
    const creds = (byKey.sheets_service_account_email && byKey.sheets_private_key && byKey.sheets_sheet_id)
      ? { email: byKey.sheets_service_account_email, privateKey: byKey.sheets_private_key, sheetId: byKey.sheets_sheet_id }
      : undefined;

    const { exportChannelsToSheet } = await import("../services/sheets.service.js");
    const result = await exportChannelsToSheet(creds);
    // Update last export time in settings
    await queryOne(
      `INSERT INTO setting (key, value, updated_at) VALUES ('sheets_last_export', $1::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb, updated_at = now()`,
      [JSON.stringify({ written: result.written, ts: new Date().toISOString() })]
    );
    res.json({ ok: true, written: result.written });
  } catch(e) { next(e); }
});

export { router as settingsRouter };
