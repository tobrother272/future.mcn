import { Router } from "express";
import { z } from "zod";
import { query, queryOne } from "../db/helpers.js";
import { requireCmsApiKey } from "../middleware/cms-api-key.js";
import { ValidationError, NotFoundError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";

/**
 * Public API for external tools (e.g. YouTube scrapers) to sync a CMS's
 * channel list. Authentication is by CMS-scoped API key, not by JWT.
 *
 * Designed for batched full-sync:
 *
 *   POST /api/public/channels/sync
 *     - "items":     array of channels (max 500 per request)
 *     - "is_final":  true for the final batch in this sync run; missing
 *                    channels (those not seen across all batches of the
 *                    same `sync_id`) are then marked Terminated.
 *     - "sync_id":   UUID-ish string that ties multiple batches together
 *                    so the tool can stream large datasets without buffering.
 *
 * Typical flow for a CMS with 1500 channels:
 *   POST { sync_id, items: [500], is_final: false }
 *   POST { sync_id, items: [500], is_final: false }
 *   POST { sync_id, items: [500], is_final: true  }   ← seals the sync
 *
 * Reasoning:
 *   • Full-sync demands knowing the universe of channels — we accumulate a
 *     temp set keyed by `sync_id` across requests, then reconcile once.
 *   • We use a JSONB scratch table (`cms_sync_run`) per sync_id rather than
 *     a server-side cursor, so a tool crash doesn't leave the DB locked.
 */

const router = Router();

// Every public route consumes one CMS API key with the "channels:sync" scope.
router.use(requireCmsApiKey("channels:sync"));

// ── Helpers ──────────────────────────────────────────────────────────────────
/**
 * Parse human-readable numbers from scrapers into plain integers/floats.
 *
 * Handles:
 *   "1.3M"   → 1_300_000
 *   "370.6K" → 370_600
 *   "5.1B"   → 5_100_000_000
 *   "1,234"  → 1234           (comma-grouped)
 *   1234     → 1234           (already a number, pass through)
 *   ""  / null / undefined → 0
 */
function parseHumanNumber(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return Math.round(v);
  // Strip currency symbols (£, $, €, ¥, ₫, ...) and whitespace before parsing
  const s = String(v).trim().replace(/[£$€¥₫₩฿₹]/g, "").replace(/,/g, "").toUpperCase();
  const multipliers: Record<string, number> = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
  const last = s.slice(-1);
  if (last in multipliers) {
    return Math.round(parseFloat(s.slice(0, -1)) * multipliers[last]!);
  }
  const n = parseFloat(s);
  return isNaN(n) ? 0 : Math.round(n);
}

/** Zod preprocessor that converts human-readable strings to integers. */
const humanInt = z.preprocess(parseHumanNumber, z.number().int().nonnegative());

/**
 * Parse human-readable date strings into ISO YYYY-MM-DD.
 *
 * Handles:
 *   "May 8, 2026"  → "2026-05-08"
 *   "Apr 29, 2026" → "2026-04-29"
 *   "Mar 27, 2026" → "2026-03-27"
 *   "2026-05-08"   → "2026-05-08"  (ISO pass-through)
 *   null / ""      → null
 */
const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseHumanDate(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // "May 8, 2026" or "Apr 29, 2026"
  const m = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mon = MONTHS[m[1]!.toLowerCase()];
    if (!mon) return null;
    const day  = m[2]!.padStart(2, "0");
    const year = m[3]!;
    return `${year}-${mon}-${day}`;
  }
  return null;
}

const humanDate = z.preprocess(parseHumanDate, z.string().date().nullable().optional());

/**
 * Extract the YouTube channel ID from various URL formats:
 *   https://www.youtube.com/channel/UCh-djxSS39I4TacvY_DjBxw/  → UCh-djxSS39I4TacvY_DjBxw
 *   https://www.youtube.com/channel/UCh-djxSS39I4TacvY_DjBxw   → UCh-djxSS39I4TacvY_DjBxw
 *   UCh-djxSS39I4TacvY_DjBxw                                   → UCh-djxSS39I4TacvY_DjBxw (pass-through)
 */
function extractYtId(v: unknown): unknown {
  if (typeof v !== "string") return v;
  const s = v.trim().replace(/\/+$/, ""); // strip trailing slashes
  // /channel/<ID>
  const chanMatch = s.match(/\/channel\/([A-Za-z0-9_-]+)/);
  if (chanMatch) return chanMatch[1];
  // Already a bare ID (no slashes, no dot) — pass through
  if (!s.includes("/") && !s.includes(".")) return s;
  // Fallback: last path segment
  const last = s.split("/").pop();
  return last ?? s;
}

// ── Schema ──────────────────────────────────────────────────────────────────
const channelItemSchema = z.object({
  yt_id:           z.preprocess(extractYtId, z.string().min(1).max(64)),
  name:            z.string().min(1).max(255),
  country:         z.string().length(2).default("VN"),
  subscribers:     humanInt.default(0),
  monthly_views:   humanInt.default(0),
  total_views:     humanInt.default(0),
  video:           humanInt.default(0),
  monthly_revenue: z.preprocess(parseHumanNumber, z.number().nonnegative()).default(0),
  monetization:    z.enum(["On", "Off"]).default("Off"),
  status:          z.enum(["Active", "Pending", "Suspended", "Terminated"]).default("Active"),
  link_date:       humanDate,
  topic_id:        z.string().optional().nullable(),
  metadata:        z.record(z.unknown()).optional(),
});

const syncBodySchema = z.object({
  // sync_id ties batches of a multi-batch run together.
  // If omitted the server generates one — fine for single-batch (most CMS).
  // For multi-batch: generate once client-side and reuse across all batches.
  sync_id:  z.string().min(1).max(64).optional(),
  items:    z.array(channelItemSchema).max(500),
  is_final: z.boolean().default(false),
});

// ── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Upsert a single channel row, scoped to the API key's CMS. Returns the
 * column name we touched ("inserted" or "updated") plus the channel id so
 * we can build a per-batch report.
 *
 * Conflict target is `yt_id` because that's the natural identity from
 * YouTube. If a channel previously belonged to a different CMS it gets
 * re-assigned to this one (operator intent: the tool is the source of
 * truth for "which channels live under this CMS").
 */
async function upsertChannel(cms_id: string, row: z.infer<typeof channelItemSchema>) {
  const id = nanoid("CH");
  const result = await queryOne<{ id: string; was_insert: boolean }>(
    `INSERT INTO channel (
       id, cms_id, yt_id, name, country, subscribers, monthly_views,
       total_views, video, monthly_revenue, monetization, status, link_date, topic_id, metadata,
       last_sync
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, NOW())
     ON CONFLICT (yt_id) DO UPDATE SET
       cms_id          = EXCLUDED.cms_id,
       name            = EXCLUDED.name,
       country         = EXCLUDED.country,
       subscribers     = EXCLUDED.subscribers,
       monthly_views   = EXCLUDED.monthly_views,
       total_views     = EXCLUDED.total_views,
       video           = EXCLUDED.video,
       monthly_revenue = EXCLUDED.monthly_revenue,
       monetization    = EXCLUDED.monetization,
       status          = EXCLUDED.status,
       link_date       = COALESCE(EXCLUDED.link_date, channel.link_date),
       topic_id        = COALESCE(EXCLUDED.topic_id, channel.topic_id),
       metadata        = channel.metadata || EXCLUDED.metadata,
       last_sync       = NOW(),
       updated_at      = NOW()
     RETURNING id, (xmax = 0) AS was_insert`,
    [
      id, cms_id, row.yt_id, row.name, row.country,
      row.subscribers, row.monthly_views, row.total_views, row.video, row.monthly_revenue,
      row.monetization, row.status, row.link_date ?? null, row.topic_id ?? null,
      JSON.stringify(row.metadata ?? {}),
    ],
  );
  if (!result) throw new Error("upsert returned no row");
  return result;
}

/**
 * Persist the set of yt_ids that we've seen in this sync run. Stored in
 * a scratch table so successive batches accumulate; reconciliation reads
 * the full set when `is_final = true`.
 */
async function recordSeen(sync_id: string, cms_id: string, yt_ids: string[]) {
  if (!yt_ids.length) return;
  // One row per yt_id keyed by (sync_id, yt_id) — idempotent against retries.
  const values: string[] = [];
  const params: unknown[] = [sync_id, cms_id];
  let i = 3;
  for (const yt of yt_ids) {
    values.push(`($1, $2, $${i})`);
    params.push(yt);
    i++;
  }
  await query(
    `INSERT INTO cms_sync_run (sync_id, cms_id, yt_id)
     VALUES ${values.join(",")}
     ON CONFLICT (sync_id, yt_id) DO NOTHING`,
    params,
  );
}

/**
 * Mark any channel belonging to `cms_id` whose yt_id is NOT in the seen
 * set for `sync_id` as Terminated. Returns the number of channels affected
 * and a sample list of names so the operator can spot-check.
 */
async function reconcileMissing(sync_id: string, cms_id: string) {
  const result = await queryOne<{ terminated: string; names: string[] }>(
    `WITH missing AS (
       SELECT c.id, c.name FROM channel c
        WHERE c.cms_id = $1
          AND c.status <> 'Terminated'
          AND c.yt_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM cms_sync_run r
             WHERE r.sync_id = $2 AND r.yt_id = c.yt_id
          )
     ),
     upd AS (
       UPDATE channel SET status = 'Terminated', updated_at = NOW()
        WHERE id IN (SELECT id FROM missing)
       RETURNING id, name
     )
     SELECT COUNT(*)::text AS terminated,
            COALESCE(array_agg(name) FILTER (WHERE name IS NOT NULL), '{}') AS names
       FROM upd`,
    [cms_id, sync_id],
  );
  // Cleanup the scratch table for this sync_id.
  await query(`DELETE FROM cms_sync_run WHERE sync_id = $1`, [sync_id]);
  return {
    terminated: Number(result?.terminated ?? 0),
    sample: (result?.names ?? []).slice(0, 10),
  };
}

// ── Routes ──────────────────────────────────────────────────────────────────

/** Probe endpoint: lets the tool confirm its API key works before syncing. */
router.get("/whoami", async (req, res) => {
  res.json({
    cms_id: req.apiKey!.cms_id,
    key_id: req.apiKey!.id,
    key_name: req.apiKey!.name,
    scopes: req.apiKey!.scopes,
  });
});

/**
 * GET /api/public/analytics/next?api_key=<KEY>
 *
 * Work-queue endpoint. Returns the single channel in this CMS that has gone
 * the longest without an analytics sync (NULL last_sync first, then oldest).
 *
 * Typical loop for a scraper tool:
 *   while True:
 *     ch = GET /api/public/analytics/next?api_key=KEY
 *     if ch.yt_id is None: break / sleep
 *     data = scrape_youtube_analytics(ch.yt_id)
 *     POST /api/public/analytics/sync/{ch.yt_id}?api_key=KEY  { items: data }
 *
 * Response:
 *   { ok, cms_id, yt_id, channel_id, name, subscribers, monetization,
 *     status, last_sync, minutes_since_sync }
 *   yt_id is null when every channel has been synced recently.
 */
router.get("/analytics/next", async (req, res, next) => {
  try {
    const cms_id = req.apiKey!.cms_id;

    const ch = await queryOne<{
      yt_id: string; channel_id: string; name: string; subscribers: number;
      monetization: string; status: string;
      last_sync_analytic: string | null; minutes_since_analytic: number | null;
    }>(
      `SELECT
         c.yt_id,
         c.id                  AS channel_id,
         c.name,
         c.subscribers,
         c.monetization,
         c.status,
         c.last_sync_analytic,
         CASE WHEN c.last_sync_analytic IS NOT NULL
              THEN ROUND(EXTRACT(EPOCH FROM (NOW() - c.last_sync_analytic)) / 60)::int
              ELSE NULL END AS minutes_since_analytic
       FROM channel c
       WHERE c.cms_id = $1
         AND c.yt_id  IS NOT NULL
         AND (c.last_sync_analytic IS NULL OR c.last_sync_analytic <= NOW() - INTERVAL '2 hours')
       ORDER BY c.last_sync_analytic ASC NULLS FIRST
       LIMIT 1`,
      [cms_id],
    );

    res.json({
      ok:                    true,
      cms_id,
      yt_id:                 ch?.yt_id                  ?? null,
      channel_id:            ch?.channel_id              ?? null,
      name:                  ch?.name                   ?? null,
      subscribers:           ch?.subscribers             ?? null,
      monetization:          ch?.monetization            ?? null,
      status:                ch?.status                  ?? null,
      last_sync_analytic:    ch?.last_sync_analytic      ?? null,
      minutes_since_analytic: ch?.minutes_since_analytic ?? null,
    });
  } catch (e) { next(e); }
});

router.post("/channels/sync", async (req, res, next) => {
  try {
    const parsed = syncBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid sync payload", parsed.error.flatten().fieldErrors as never);
    }
    const cms_id = req.apiKey!.cms_id;
    // Auto-generate sync_id if caller didn't supply one.
    // Auto-generated IDs always set is_final=true implicitly so the
    // reconcile fires on this single call (caller can still override).
    const sync_id = parsed.data.sync_id ?? `auto_${cms_id}_${Date.now()}`;
    const is_final = parsed.data.sync_id ? parsed.data.is_final : true;

    // Bail out early if the CMS was deleted while the key was still active.
    const cms = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM cms WHERE id = $1`, [cms_id],
    );
    if (!cms) throw new NotFoundError(`CMS ${cms_id} no longer exists`);

    // ── Upsert this batch ──────────────────────────────────────────────
    let inserted = 0, updated = 0;
    const ytIds: string[] = [];
    for (const item of parsed.data.items) {
      const r = await upsertChannel(cms_id, item);
      if (r.was_insert) inserted++; else updated++;
      ytIds.push(item.yt_id);
    }
    await recordSeen(sync_id, cms_id, ytIds);

    // ── Reconcile when caller marks the run final ──────────────────────
    let terminated = 0, terminatedSample: string[] = [];
    if (is_final) {
      const rec = await reconcileMissing(sync_id, cms_id);
      terminated = rec.terminated;
      terminatedSample = rec.sample;
    }

    res.json({
      ok: true,
      sync_id,
      batch_size: parsed.data.items.length,
      inserted,
      updated,
      terminated,
      terminated_sample: terminatedSample,
      is_final,
    });
  } catch (e) { next(e); }
});

// ── Analytics sync ──────────────────────────────────────────────────────────

/**
 * Schema for one day of analytics for one channel.
 *
 * All numeric fields accept human-readable strings (e.g. "1.3K", "29,718.4")
 * in addition to plain numbers.
 *
 * avg_view_duration accepts "M:SS" strings (e.g. "9:34") or plain seconds.
 */

/** Convert "M:SS" or "H:MM:SS" duration strings to plain text storage. */
function normDuration(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  const s = String(v).trim();
  // Accept "9:34", "1:09:34" — store as-is
  if (/^\d+:\d{2}(:\d{2})?$/.test(s)) return s;
  // Plain seconds number → convert to M:SS
  const n = parseFloat(s.replace(/,/g, ""));
  if (!isNaN(n)) {
    const total = Math.round(n);
    const m = Math.floor(total / 60);
    const sec = total % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }
  return null;
}

const analyticsItemSchema = z.object({
  date:              z.preprocess((v) => {
    if (!v) return null;
    const s = String(v as string).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    return parseHumanDate(v);
  }, z.string().date()),
  views:             humanInt.default(0),
  engaged_views:     humanInt.default(0),
  watch_time_hours:  z.preprocess(parseHumanNumber, z.number().nonnegative()).default(0),
  avg_view_duration: z.preprocess(normDuration, z.string().nullable().optional()),
  revenue:           z.preprocess(parseHumanNumber, z.number().nonnegative()).default(0),
});

const analyticsSyncSchema = z.object({
  items: z.array(analyticsItemSchema).min(1).max(1000),
});

/**
 * POST /api/public/analytics/sync/:yt_id
 *
 * Push daily analytics for ONE channel identified by its YouTube channel ID
 * (or full URL — auto-extracted). Typical call pushes 30–90 rows at once.
 *
 * Example:
 *   POST /api/public/analytics/sync/UCh-djxSS39I4TacvY_DjBxw
 *   {
 *     "items": [
 *       { "date": "2026-05-10", "views": "2,269", "engaged_views": "2,269",
 *         "watch_time_hours": "296.2", "avg_view_duration": "7:50", "revenue": "13.33" },
 *       ...
 *     ]
 *   }
 */
router.post("/analytics/sync/:yt_id", async (req, res, next) => {
  try {
    const cms_id = req.apiKey!.cms_id;
    const rawYtId = req.params["yt_id"] ?? "";
    const yt_id   = String(extractYtId(rawYtId));

    if (!yt_id) throw new ValidationError("yt_id is required in URL");

    const parsed = analyticsSyncSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid analytics payload", parsed.error.flatten().fieldErrors as never);
    }

    // Resolve channel by yt_id scoped to this CMS
    const ch = await queryOne<{ id: string }>(
      `SELECT id FROM channel WHERE yt_id = $1 AND cms_id = $2 LIMIT 1`,
      [yt_id, cms_id],
    );
    if (!ch) throw new NotFoundError(`Channel yt_id="${yt_id}" not found in CMS ${cms_id}`);

    // Sort items to find the most recent date for last_revenue
    const sortedItems = [...parsed.data.items].sort(
      (a, b) => b.date.localeCompare(a.date)
    );
    const latestItem = sortedItems[0];

    for (const item of parsed.data.items) {
      const id = `CA_${ch.id}_${item.date}`.replace(/[^A-Za-z0-9_-]/g, "_");
      await query(
        `INSERT INTO channel_analytics
           (id, channel_id, cms_id, date, views, engaged_views,
            watch_time_hours, avg_view_duration, revenue)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (channel_id, date) DO UPDATE SET
           views             = EXCLUDED.views,
           engaged_views     = EXCLUDED.engaged_views,
           watch_time_hours  = EXCLUDED.watch_time_hours,
           avg_view_duration = EXCLUDED.avg_view_duration,
           revenue           = EXCLUDED.revenue,
           updated_at        = NOW()`,
        [
          id, ch.id, cms_id, item.date,
          item.views, item.engaged_views,
          item.watch_time_hours, item.avg_view_duration ?? null,
          item.revenue,
        ],
      );
    }

    // Update last_revenue (most recent date in batch), monthly_revenue (sum last 30d),
    // last_sync_analytic (timestamp of this analytics push), last_sync
    if (latestItem) {
      await query(
        `UPDATE channel
         SET last_revenue         = $1,
             monthly_revenue      = COALESCE((
               SELECT SUM(revenue) FROM channel_analytics
               WHERE channel_id = $2
                 AND date >= CURRENT_DATE - 30
             ), 0),
             last_sync_analytic   = NOW(),
             last_sync            = NOW(),
             updated_at           = NOW()
         WHERE id = $2`,
        [latestItem.revenue, ch.id],
      );
    }

    res.json({
      ok: true,
      cms_id,
      yt_id,
      channel_id: ch.id,
      upserted: parsed.data.items.length,
      last_revenue: latestItem?.revenue ?? 0,
    });
  } catch (e) { next(e); }
});

export { router as publicRouter };
