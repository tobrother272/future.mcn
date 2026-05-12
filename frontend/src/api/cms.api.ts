import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Cms, CmsCreate, CmsUpdate, CmsStats, Topic, CmsApiKey, CmsApiKeyCreated } from "@/types/cms";
import type { PaginatedResponse, PaginationParams } from "@/types/api";
import type { RevenueDaily } from "@/types/revenue";

export function useCmsList(params?: PaginationParams & { status?: string }) {
  return useQuery({
    queryKey: ["cms", params],
    queryFn: () =>
      apiClient.get("cms", { searchParams: params as Record<string, string> })
        .json<PaginatedResponse<Cms>>(),
  });
}

export function useCms(id: string) {
  return useQuery({
    queryKey: ["cms", id],
    queryFn: () => apiClient.get(`cms/${id}`).json<Cms>(),
    enabled: !!id,
  });
}

export function useCmsStats(id: string) {
  return useQuery({
    queryKey: ["cms", id, "stats"],
    queryFn: () => apiClient.get(`cms/${id}/stats`).json<CmsStats>(),
    enabled: !!id,
  });
}

export function useCmsRevenue(id: string, days = 30) {
  return useQuery({
    queryKey: ["cms", id, "revenue", days],
    queryFn: () => apiClient.get(`cms/${id}/revenue`, { searchParams: { days } }).json<RevenueDaily[]>(),
    enabled: !!id,
  });
}

// ── Global topics (not per-CMS) ───────────────────────────────
export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => apiClient.get("topics").json<Topic[]>(),
    staleTime: 60_000,
  });
}

/** @deprecated use useTopics() — kept for backward compat */
export function useCmsTopics(_id?: string) {
  return useTopics();
}

export function useCreateTopic(_cmsId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; dept?: string; expected_channels?: number }) =>
      apiClient.post("topics", { json: data }).json<Topic>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useUpdateTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; dept?: string; expected_channels?: number }) =>
      apiClient.put(`topics/${id}`, { json: data }).json<Topic>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useDeleteTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`topics/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["topics"] }),
  });
}

export function useCreateCms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CmsCreate) => apiClient.post("cms", { json: data }).json<Cms>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms"] }),
  });
}

export function useUpdateCms(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CmsUpdate) => apiClient.put(`cms/${id}`, { json: data }).json<Cms>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms"] });
      qc.invalidateQueries({ queryKey: ["cms", id] });
    },
  });
}

export function useImportCmsRevenue(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<{ snapshot_date: string; revenue: number; views: number }>) =>
      apiClient.post(`cms/${id}/revenue/import`, { json: rows })
        .json<{ ok: boolean; inserted: number }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", id, "revenue"] }),
  });
}

export function useDeleteCms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`cms/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms"] }),
  });
}

export function useClearCmsChannels(cmsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.delete(`cms/${cmsId}/channels`).json<{ ok: boolean; deleted: number }>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cms", cmsId, "channels"] });
      qc.invalidateQueries({ queryKey: ["cms", cmsId, "stats"] });
      qc.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

// ── API Key management ────────────────────────────────────────
export function useCmsApiKeys(cmsId: string, enabled = true) {
  return useQuery({
    queryKey: ["cms", cmsId, "api-keys"],
    queryFn: () => apiClient.get(`cms/${cmsId}/api-keys`).json<CmsApiKey[]>(),
    enabled: enabled && !!cmsId,
  });
}

export function useCreateCmsApiKey(cmsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; scopes?: string[] }) =>
      apiClient.post(`cms/${cmsId}/api-keys`, { json: data }).json<CmsApiKeyCreated>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", cmsId, "api-keys"] }),
  });
}

export function useRevokeCmsApiKey(cmsId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) =>
      apiClient.delete(`cms/${cmsId}/api-keys/${keyId}`).json<CmsApiKey>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cms", cmsId, "api-keys"] }),
  });
}

export function useCmsChannels(id: string, params?: PaginationParams & {
  topic_id?: string; status?: string; monetization?: string;
  min_views?: number; min_revenue?: number;
}) {
  return useQuery({
    queryKey: ["cms", id, "channels", params],
    queryFn: () =>
      apiClient
        .get(`cms/${id}/channels`, { searchParams: params as Record<string, string> })
        .json<PaginatedResponse<import("@/types/channel").Channel>>(),
    enabled: !!id,
  });
}
