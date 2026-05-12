import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { useAuthStore } from "@/stores/authStore";

export interface Policy {
  id: string;
  name: string;
  content: string;
  application: string;
  images: string[];
  created_at: string;
  updated_at: string;
}

interface PaginatedPolicies { items: Policy[]; total: number }

export function usePolicyList(params?: { search?: string; limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.limit)  query.set("limit",  String(params.limit));
  if (params?.offset) query.set("offset", String(params.offset));
  return useQuery<PaginatedPolicies>({
    queryKey: ["policies", params],
    queryFn: () => apiClient.get(`policies?${query}`).json<PaginatedPolicies>(),
  });
}

export function usePolicy(id: string) {
  return useQuery<Policy>({
    queryKey: ["policies", id],
    queryFn: () => apiClient.get(`policies/${id}`).json<Policy>(),
    enabled: !!id,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; content?: string; application?: string }) =>
      apiClient.post("policies", { json: data }).json<Policy>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useUpdatePolicy(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; content?: string; application?: string }) =>
      apiClient.put(`policies/${id}`, { json: data }).json<Policy>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`policies/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useUploadPolicyImages(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => {
      const token = useAuthStore.getState().token;
      const form  = new FormData();
      files.forEach((f) => form.append("images", f));
      return fetch(`/api/policies/${id}/images`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      }).then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json() as Promise<Policy>;
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}

export function useRemovePolicyImage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imagePath: string) =>
      apiClient.delete(`policies/${id}/images`, { json: { imagePath } }).json<Policy>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["policies"] }),
  });
}
