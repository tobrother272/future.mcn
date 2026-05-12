import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { RevenueDaily } from "@/types/revenue";

export function useRevenue(scope: string, scopeId: string, days = 30) {
  return useQuery({
    queryKey: ["revenue", scope, scopeId, days],
    queryFn: () => apiClient.get("revenue", { searchParams: { scope, scopeId, days } }).json<RevenueDaily[]>(),
    enabled: !!(scope && scopeId),
  });
}

export function useRevenueBreakdown(by: "cms" | "channel" | "partner" = "cms", period = 30) {
  return useQuery({
    queryKey: ["revenue", "breakdown", by, period],
    queryFn: () => apiClient.get("revenue/breakdown", { searchParams: { by, period } }).json<unknown[]>(),
  });
}

export function useRevenueVariation(scope: string, scopeId: string) {
  return useQuery({
    queryKey: ["revenue", "variation", scope, scopeId],
    queryFn: () => apiClient.get("revenue/variation", { searchParams: { scope, scopeId } }).json<{
      "1d": { delta: number; delta_pct: number } | null;
      "7d": { delta: number; delta_pct: number } | null;
      "30d": { delta: number; delta_pct: number } | null;
      history: RevenueDaily[];
    }>(),
    enabled: !!(scope && scopeId),
  });
}

export function useSnapshotAll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("revenue/snapshot/all").json<{ ok: boolean; count: number; date: string }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["revenue"] }),
  });
}
