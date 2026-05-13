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

export function usePartnerRevenue(id: string, opts: { days?: number; from?: string; to?: string } = {}) {
  const { days = 30, from, to } = opts;
  const searchParams = from && to ? { from, to } : { days };
  return useQuery({
    queryKey: ["partners", id, "revenue", from && to ? `${from}~${to}` : days],
    queryFn: () =>
      apiClient
        .get(`partners/${id}/revenue`, { searchParams })
        .json<Array<{ snapshot_date: string; revenue: number; views: number; engaged_views: number; watch_time_hours: number }>>(),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export interface PartnerTopChannel {
  id: string;
  name: string;
  yt_id: string | null;
  status: string;
  monetization: string;
  subscribers: number | null;
  monthly_revenue: number | null;
  cms_id: string | null;
  cms_name: string | null;
  partner_id: string | null;
  partner_name: string | null;
  revenue: number;
  views: number;
}

export function usePartnerTopChannels(
  id: string,
  opts: { days?: number; from?: string; to?: string; limit?: number } = {}
) {
  const { days = 30, from, to, limit = 10 } = opts;
  const searchParams: Record<string, string | number> =
    from && to ? { from, to, limit } : { days, limit };
  return useQuery({
    queryKey: ["partners", id, "top-channels", from && to ? `${from}~${to}` : days, limit],
    queryFn: () =>
      apiClient
        .get(`partners/${id}/top-channels`, { searchParams })
        .json<PartnerTopChannel[]>(),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export interface PartnerRevenueGroupedRow {
  snapshot_date: string;
  group_id: string;
  group_name: string;
  revenue: number;
  views: number;
}

export function usePartnerRevenueGrouped(
  id: string,
  by: "child" | "channel",
  opts: { days?: number; from?: string; to?: string } = {}
) {
  const { days = 30, from, to } = opts;
  const searchParams: Record<string, string | number> =
    from && to ? { by, from, to } : { by, days };
  return useQuery({
    queryKey: ["partners", id, "revenue-grouped", by, from && to ? `${from}~${to}` : days],
    queryFn: () =>
      apiClient
        .get(`partners/${id}/revenue-grouped`, { searchParams })
        .json<PartnerRevenueGroupedRow[]>(),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export interface PartnerBreakdownRow {
  id: string | null;
  name: string;
  /** Có khi by=child: dùng để đánh dấu phần "của chính tôi". */
  is_self?: boolean;
  /** Có khi by=cms. */
  currency?: string | null;
  revenue: number;
  views: number;
}

export function usePartnerBreakdown(
  id: string,
  by: "child" | "cms",
  opts: { days?: number; from?: string; to?: string } = {}
) {
  const { days = 30, from, to } = opts;
  const searchParams: Record<string, string | number> =
    from && to ? { by, from, to } : { by, days };
  return useQuery({
    queryKey: ["partners", id, "breakdown", by, from && to ? `${from}~${to}` : days],
    queryFn: () =>
      apiClient
        .get(`partners/${id}/breakdown`, { searchParams })
        .json<PartnerBreakdownRow[]>(),
    enabled: !!id,
    staleTime: 60_000,
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

// ─────────────────────────────────────────────────────────────
// Partner sub-accounts (parent partner manages 1 account / child)
// ─────────────────────────────────────────────────────────────
export interface PartnerSubAccountRow {
  partner_id: string;
  partner_name: string;
  partner_status: string;
  account_id: string | null;
  account_email: string | null;
  account_full_name: string | null;
  account_phone: string | null;
  account_status: string | null;
  account_last_login: string | null;
  account_created_at: string | null;
}

export function usePartnerSubAccounts() {
  return useQuery({
    queryKey: ["partner-sub-accounts"],
    queryFn: () => apiClient.get("partners/sub-accounts").json<PartnerSubAccountRow[]>(),
    staleTime: 15_000,
  });
}

export function useCreatePartnerSubAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { child_partner_id: string; email: string; full_name: string; phone?: string; password: string }) =>
      apiClient.post("partners/sub-accounts", { json: data }).json<PartnerUser>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-sub-accounts"] }),
  });
}

export function useSetPartnerSubAccountStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "Active" | "Suspended" }) =>
      apiClient.patch(`partners/sub-accounts/${userId}/status`, { json: { status } }).json<PartnerUser>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-sub-accounts"] }),
  });
}

export function useResetPartnerSubAccountPassword() {
  return useMutation({
    mutationFn: ({ userId, new_password }: { userId: string; new_password: string }) =>
      apiClient.post(`partners/sub-accounts/${userId}/reset-password`, { json: { new_password } }).json<{ ok: true }>(),
  });
}

export function useDeletePartnerSubAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`partners/sub-accounts/${userId}`).json<{ ok: true }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partner-sub-accounts"] }),
  });
}
