import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { PaginatedResponse } from "@/types/api";

export type WorkflowState =
  | "DRAFT" | "SUBMITTED" | "QC_REVIEWING" | "QC_REJECTED"
  | "QC_APPROVED" | "CHANNEL_PROVISIONING" | "PROVISIONING_FAILED" | "ACTIVE";

export interface Submission {
  id: string;
  channel_id: string | null;
  partner_user_id: string | null;
  workflow_state: WorkflowState;
  video_title: string;
  video_url: string | null;
  storage_type: string | null;
  storage_url: string | null;
  description: string | null;
  category: string | null;
  qc_inspection: Record<string, unknown> | null;
  admin_note: string | null;
  submitted_at: string;
  updated_at: string;
  // joined
  submitter_name?: string | null;
  submitter_email?: string | null;
  partner_name?: string | null;
  channel_name?: string | null;
}

export interface SubmissionLog {
  id: string;
  submission_id: string;
  from_state: string | null;
  to_state: string;
  by_user_id: string | null;
  by_email: string | null;
  by_role: string | null;
  note: string | null;
  ts: string;
}

export interface SubmissionCreate {
  video_title: string;
  video_url?: string;
  storage_type?: string;
  storage_url?: string;
  description?: string;
  category?: string;
}

interface ListParams {
  partner_id?: string;
  state?: WorkflowState | "";
  search?: string;
  page?: number;
  limit?: number;
}

export function useSubmissionList(params?: ListParams) {
  return useQuery({
    queryKey: ["submissions", params],
    queryFn: () =>
      apiClient
        .get("submissions", { searchParams: params as Record<string, string | number> })
        .json<PaginatedResponse<Submission>>(),
    enabled: params?.partner_id ? !!params.partner_id : true,
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: ["submissions", id],
    queryFn: () => apiClient.get(`submissions/${id}`).json<Submission>(),
    enabled: !!id,
  });
}

export function useSubmissionLog(id: string) {
  return useQuery({
    queryKey: ["submissions", id, "log"],
    queryFn: () => apiClient.get(`submissions/${id}/log`).json<SubmissionLog[]>(),
    enabled: !!id,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SubmissionCreate) =>
      apiClient.post("submissions", { json: data }).json<Submission>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

export function useTransitionSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, toState, note, qcInspection }: {
      id: string; toState: WorkflowState; note?: string;
      qcInspection?: Record<string, unknown>;
    }) =>
      apiClient.put(`submissions/${id}/state`, { json: { toState, note, qcInspection } }).json<Submission>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["submissions"] }),
  });
}

export function useProvisionSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, channelData }: {
      id: string;
      channelData: { ytId?: string; cmsId?: string; topicId?: string; name?: string; partnerId?: string };
    }) =>
      apiClient
        .post(`submissions/${id}/provision`, { json: channelData })
        .json<{ submission: Submission; channel: import("@/types/channel").Channel }>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["submissions"] });
      void qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}
