import { query, queryOne, queryMany } from "../db/helpers.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../lib/errors.js";
import { nanoid } from "../lib/nanoid.js";
import { ChannelService } from "./channel.service.js";

export type WorkflowState =
  | "DRAFT" | "SUBMITTED" | "QC_REVIEWING" | "QC_REJECTED"
  | "QC_APPROVED" | "CHANNEL_PROVISIONING" | "PROVISIONING_FAILED" | "ACTIVE";

/** Which transitions are allowed from each state */
const ALLOWED_TRANSITIONS: Record<WorkflowState, WorkflowState[]> = {
  DRAFT:                 ["SUBMITTED"],
  SUBMITTED:             ["QC_REVIEWING", "QC_REJECTED"],
  QC_REVIEWING:          ["QC_REJECTED", "QC_APPROVED"],
  QC_REJECTED:           ["SUBMITTED"],   // allow resubmit
  QC_APPROVED:           ["CHANNEL_PROVISIONING"],
  CHANNEL_PROVISIONING:  ["PROVISIONING_FAILED", "ACTIVE"],
  PROVISIONING_FAILED:   ["CHANNEL_PROVISIONING"],
  ACTIVE:                [],
};

interface Submission {
  id: string; channel_id: string | null; partner_user_id: string | null;
  workflow_state: WorkflowState; video_title: string; video_url: string | null;
  storage_type: string | null; storage_url: string | null;
  description: string | null; category: string | null;
  qc_inspection: Record<string, unknown> | null;
  admin_note: string | null; submitted_at: string; updated_at: string;
}

export const WorkflowService = {
  async list(filters: { state?: string; partner_id?: string; search?: string; page?: number; limit?: number }) {
    const andClauses: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;
    if (filters.state)      { andClauses.push(`s.workflow_state=$${idx++}`);  vals.push(filters.state); }
    if (filters.partner_id) { andClauses.push(`a.partner_id=$${idx++}`);      vals.push(filters.partner_id); }
    if (filters.search)     { andClauses.push(`s.video_title ILIKE $${idx++}`); vals.push(`%${filters.search}%`); }

    const where = andClauses.length ? `WHERE ${andClauses.join(" AND ")}` : "";
    const pageLimit = Math.min(100, filters.limit ?? 50);
    const offset = (Math.max(1, filters.page ?? 1) - 1) * pageLimit;

    // `account` (account_type='partner') replaces the old `partner_user` table.
    const countRes = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM submission s
       LEFT JOIN account a ON s.partner_user_id = a.id AND a.account_type='partner'
       ${where}`, vals
    );
    const rows = await queryMany(
      `SELECT s.*, a.full_name AS submitter_name, a.email AS submitter_email,
              p.name AS partner_name, c.name AS channel_name
       FROM submission s
       LEFT JOIN account a ON s.partner_user_id = a.id AND a.account_type='partner'
       LEFT JOIN partner p ON a.partner_id = p.id
       LEFT JOIN channel c ON s.channel_id = c.id
       ${where}
       ORDER BY s.submitted_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      [...vals, pageLimit, offset]
    );
    return { items: rows, total: Number(countRes?.count ?? 0), page: filters.page ?? 1, limit: pageLimit };
  },

  async getById(id: string) {
    const s = await queryOne<Submission>(
      `SELECT s.*, a.full_name AS submitter_name, a.email AS submitter_email
       FROM submission s
       LEFT JOIN account a ON s.partner_user_id = a.id AND a.account_type='partner'
       WHERE s.id = $1`, [id]
    );
    if (!s) throw new NotFoundError(`Submission "${id}" not found`);
    return s;
  },

  async create(data: {
    partner_user_id?: string; video_title: string; video_url?: string;
    storage_type?: string; storage_url?: string; description?: string;
    category?: string; product_info?: string; license?: string;
  }) {
    const id = nanoid("SUB");
    const s = await queryOne<Submission>(
      `INSERT INTO submission (id,partner_user_id,workflow_state,video_title,video_url,
         storage_type,storage_url,description,category)
       VALUES ($1,$2,'SUBMITTED',$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, data.partner_user_id ?? null, data.video_title, data.video_url ?? null,
       data.storage_type ?? null, data.storage_url ?? null, data.description ?? null, data.category ?? null]
    );
    await WorkflowService._logTransition(id, null, "SUBMITTED", data.partner_user_id, null);
    return s!;
  },

  async transition(id: string, toState: WorkflowState, by: { id: string; email: string; role: string }, options: { note?: string; qcInspection?: Record<string, unknown> } = {}) {
    const sub = await WorkflowService.getById(id);
    const allowed = ALLOWED_TRANSITIONS[sub.workflow_state] ?? [];
    if (!allowed.includes(toState)) {
      throw new ValidationError(`Transition from ${sub.workflow_state} → ${toState} not allowed`);
    }
    const updates: string[] = ["workflow_state=$1"];
    const vals: unknown[] = [toState];
    let idx = 2;
    if (options.note)         { updates.push(`admin_note=$${idx++}`);     vals.push(options.note); }
    if (options.qcInspection) { updates.push(`qc_inspection=$${idx++}`); vals.push(JSON.stringify(options.qcInspection)); }
    vals.push(id);
    const updated = await queryOne<Submission>(
      `UPDATE submission SET ${updates.join(",")} WHERE id=$${idx} RETURNING *`, vals
    );
    await WorkflowService._logTransition(id, sub.workflow_state, toState, by.id, by.email, by.role, options.note);
    return updated!;
  },

  /** Provision: create channel + set submission ACTIVE */
  async provision(submissionId: string, by: { id: string; email: string; role: string }, channelData: { ytId?: string; cmsId?: string; topicId?: string; name?: string; partnerId?: string }) {
    const sub = await WorkflowService.getById(submissionId);
    if (sub.workflow_state !== "QC_APPROVED") {
      throw new ForbiddenError("Submission must be QC_APPROVED before provisioning");
    }
    await WorkflowService.transition(submissionId, "CHANNEL_PROVISIONING", by);

    try {
      const channel = await ChannelService.create({
        cms_id: channelData.cmsId,
        partner_id: channelData.partnerId,
        topic_id: channelData.topicId,
        yt_id: channelData.ytId,
        name: channelData.name ?? sub.video_title,
        status: "Active",
        monetization: "Pending",
      });
      await query(
        `UPDATE submission SET channel_id=$1 WHERE id=$2`, [channel.id, submissionId]
      );
      await WorkflowService.transition(submissionId, "ACTIVE", by, { note: `Provisioned as channel ${channel.id}` });
      return { submission: await WorkflowService.getById(submissionId), channel };
    } catch (err) {
      await WorkflowService.transition(submissionId, "PROVISIONING_FAILED", by, {
        note: err instanceof Error ? err.message : "Unknown error"
      });
      throw err;
    }
  },

  async getLog(id: string) {
    return queryMany(
      `SELECT * FROM submission_log WHERE submission_id=$1 ORDER BY ts ASC`, [id]
    );
  },

  async _logTransition(id: string, from: string | null, to: string, byId?: string | null, byEmail?: string | null, byRole?: string | null, note?: string) {
    await query(
      `INSERT INTO submission_log (submission_id,from_state,to_state,by_user_id,by_email,by_role,note)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, from, to, byId ?? null, byEmail ?? null, byRole ?? null, note ?? null]
    );
  },
};
