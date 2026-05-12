import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Partner, PartnerUser } from "@/types/partner";
import type { PaginatedResponse } from "@/types/api";

interface PartnerFilters { type?: string; tier?: string; status?: string; search?: string; page?: number; limit?: number; }

export function usePartnerList(filters?: PartnerFilters) {
  return useQuery({
    queryKey: ["partners", filters],
    queryFn: () => apiClient.get("partners", { searchParams: filters as Record<string, string | number> }).json<PaginatedResponse<Partner>>(),
  });
}

export function usePartner(id: string) {
  return useQuery({
    queryKey: ["partners", id],
    queryFn: () => apiClient.get(`partners/${id}`).json<Partner>(),
    enabled: !!id,
  });
}

export function usePartnerProfile(id: string) {
  return useQuery({
    queryKey: ["partners", id, "profile"],
    queryFn: () => apiClient
      .get(`partners/${id}/profile`)
      .json<Partner & { channels: unknown[]; contracts: unknown[]; users: unknown[]; children: Partner[]; total_revenue: number }>(),
    enabled: !!id,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Partner>) => apiClient.post("partners", { json: data }).json<Partner>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useSetPartnerParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parent_id }: { id: string; parent_id: string | null }) =>
      apiClient.patch(`partners/${id}/parent`, { json: { parent_id } }).json<Partner>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useUpdatePartner(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Partner>) => apiClient.put(`partners/${id}`, { json: data }).json<Partner>(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["partners"] }); qc.invalidateQueries({ queryKey: ["partners", id] }); },
  });
}

export function usePendingPartnerUsers() {
  return useQuery({
    queryKey: ["partner-users", "pending"],
    queryFn: () => apiClient.get("partners/pending-users").json<(PartnerUser & { partner_name?: string })[]>(),
    refetchInterval: 30_000,
  });
}

export function useApprovePartnerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, partner_id }: { userId: string; partner_id?: string }) =>
      apiClient.post(`partners/users/${userId}/approve`, { json: { partner_id } }).json<PartnerUser>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-users"] }),
  });
}

export function useRejectPartnerUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => apiClient.post(`partners/users/${userId}/reject`).json<PartnerUser>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-users"] }),
  });
}
