import { query, queryMany, queryOne } from "../db/helpers.js";
import { nanoid } from "../lib/nanoid.js";
import { AppError } from "../lib/errors.js";

export interface VideoRow {
  id: string;
  channel_id: string;
  yt_video_id: string | null;
  title: string;
  published_at: string | null;
  views: number;
  watch_time_hours: number;
  avg_view_duration: string | null;
  revenue: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export const VideoService = {
  async listByChannel(channelId: string, params: { limit?: number; offset?: number } = {}) {
    const limit  = Math.min(200, params.limit  ?? 50);
    const offset = params.offset ?? 0;

    const [rows, countRow] = await Promise.all([
      queryMany<VideoRow>(
        `SELECT * FROM video WHERE channel_id = $1
         ORDER BY published_at DESC NULLS LAST, created_at DESC
         LIMIT $2 OFFSET $3`,
        [channelId, limit, offset]
      ),
      queryOne<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM video WHERE channel_id = $1`,
        [channelId]
      ),
    ]);

    return { items: rows, total: Number(countRow?.total ?? 0) };
  },

  async bulkImport(channelId: string, rows: Array<{
    yt_video_id?: string;
    title: string;
    published_at?: string;
    views?: number;
    watch_time_hours?: number;
    avg_view_duration?: string;
    revenue?: number;
  }>) {
    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (const [i, r] of rows.entries()) {
      if (!r.title?.trim()) {
        errors.push({ row: i + 1, message: "title is required" });
        continue;
      }
      try {
        if (r.yt_video_id) {
          // Upsert by yt_video_id
          const existing = await queryOne<{ id: string }>(
            `SELECT id FROM video WHERE yt_video_id = $1`,
            [r.yt_video_id]
          );
          if (existing) {
            await query(
              `UPDATE video SET
                 title=$1, published_at=$2, views=$3, watch_time_hours=$4,
                 avg_view_duration=$5, revenue=$6, updated_at=now()
               WHERE yt_video_id=$7`,
              [
                r.title, r.published_at ?? null,
                r.views ?? 0, r.watch_time_hours ?? 0,
                r.avg_view_duration ?? null, r.revenue ?? 0,
                r.yt_video_id,
              ]
            );
            updated++;
            continue;
          }
        }
        await query(
          `INSERT INTO video (id, channel_id, yt_video_id, title, published_at, views, watch_time_hours, avg_view_duration, revenue)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            nanoid("VID"),
            channelId,
            r.yt_video_id ?? null,
            r.title,
            r.published_at ?? null,
            r.views ?? 0,
            r.watch_time_hours ?? 0,
            r.avg_view_duration ?? null,
            r.revenue ?? 0,
          ]
        );
        created++;
      } catch (err) {
        errors.push({ row: i + 1, message: err instanceof Error ? err.message : "unknown error" });
      }
    }

    return { created, updated, errors };
  },
};
