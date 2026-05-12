import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { useAuthStore } from "@/stores/authStore";

export type ViolationResult = "Thành Công" | "Thất Bại" | "Không thực hiện";

export type ViolationType = "Thông tin" | "Hình ảnh / Video";

export interface Violation {
  id: string;
  name: string;
  violation_type: ViolationType;
  video_id: string | null;
  video_url: string | null;
  video_title: string;
  video_thumb: string | null;
  channel_id: string | null;
  channel_name: string;
  channel_url: string | null;
  content: string;
  policy_id: string | null;
  policy_name?: string | null;
  images: string[];
  image_captions: Record<string, string>;
  resolution: string;
  result: ViolationResult;
  notes: string | null;
  detected_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ViolationCreate {
  name: string;
  violation_type?: ViolationType;
  video_id?: string | null;
  video_title?: string;
  video_thumb?: string | null;
  channel_id?: string | null;
  channel_name?: string;
  channel_url?: string | null;
  content?: string;
  policy_id?: string | null;
  resolution?: string;
  result?: ViolationResult;
  notes?: string | null;
  detected_date?: string | null;
}

interface Paginated { items: Violation[]; total: number }

export function useViolationList(params?: {
  search?: string; channel_id?: string; policy_id?: string;
  result?: string; page?: number; limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.search)     q.set("search",     params.search);
  if (params?.channel_id) q.set("channel_id", params.channel_id);
  if (params?.policy_id)  q.set("policy_id",  params.policy_id);
  if (params?.result)     q.set("result",      params.result);
  if (params?.page)       q.set("page",        String(params.page));
  if (params?.limit)      q.set("limit",       String(params.limit));
  return useQuery<Paginated>({
    queryKey: ["violations", params],
    queryFn:  () => apiClient.get(`violations?${q}`).json<Paginated>(),
  });
}

export function useCreateViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ViolationCreate) =>
      apiClient.post("violations", { json: data }).json<Violation>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations"] }),
  });
}

export function useUpdateViolation(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ViolationCreate>) =>
      apiClient.put(`violations/${id}`, { json: data }).json<Violation>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations"] }),
  });
}

export function useDeleteViolation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`violations/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations"] }),
  });
}

export function useUploadViolationThumb(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const token = useAuthStore.getState().token;
      const form  = new FormData();
      form.append("thumb", file);
      const r = await fetch(`/api/violations/${id}/thumb`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<Violation>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations"] }),
  });
}

export function useUploadViolationImages(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: { file: File; caption: string }[]) => {
      const token = useAuthStore.getState().token;
      const form  = new FormData();
      items.forEach(({ file }) => form.append("images", file));
      // ordered array matching files by index
      form.append("captions", JSON.stringify(items.map((i) => i.caption ?? "")));
      const r = await fetch(`/api/violations/${id}/images`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json() as Promise<Violation>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations"] }),
  });
}

// ── Resolution history ────────────────────────────────────────
export interface ViolationResolution {
  id: string;
  violation_id: string;
  resolution: string;
  handler_info: string;
  resolved_date: string | null;
  result_date: string | null;
  result: "Thành Công" | "Thất Bại" | "Chờ Xử Lý";
  notes: string | null;
  created_at: string;
}

export function useViolationResolutions(violationId: string) {
  return useQuery<ViolationResolution[]>({
    queryKey: ["violations", violationId, "resolutions"],
    queryFn:  () => apiClient.get(`violations/${violationId}/resolutions`).json<ViolationResolution[]>(),
    enabled:  !!violationId,
  });
}

export function useAddResolution(violationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      resolution: string; handler_info?: string;
      resolved_date?: string | null; result_date?: string | null;
      result?: "Thành Công" | "Thất Bại" | "Chờ Xử Lý"; notes?: string | null;
    }) => apiClient.post(`violations/${violationId}/resolutions`, { json: data }).json<ViolationResolution>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations", violationId, "resolutions"] }),
  });
}

export function useUpdateResolution(violationId: string, rid: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      resolution?: string; handler_info?: string;
      resolved_date?: string | null; result_date?: string | null;
      result?: "Thành Công" | "Thất Bại" | "Chờ Xử Lý"; notes?: string | null;
    }) => apiClient.put(`violations/${violationId}/resolutions/${rid}`, { json: data }).json<ViolationResolution>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations", violationId, "resolutions"] }),
  });
}

export function useDeleteResolution(violationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rid: string) =>
      apiClient.delete(`violations/${violationId}/resolutions/${rid}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations", violationId, "resolutions"] }),
  });
}

export function useRemoveViolationImage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imagePath: string) =>
      apiClient.delete(`violations/${id}/images`, { json: { imagePath } }).json<Violation>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["violations"] }),
  });
}
