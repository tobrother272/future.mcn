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

export function useRevenueBreakdown(
  by: "cms" | "channel" | "partner" = "cms",
  periodOrOpts: number | { period?: number; from?: string; to?: string } = 30
) {
  const opts = typeof periodOrOpts === "number" ? { period: periodOrOpts } : periodOrOpts;
  const { period = 30, from, to } = opts;
  const searchParams = from && to ? { by, from, to } : { by, period };
  return useQuery({
    queryKey: ["revenue", "breakdown", by, from && to ? `${from}~${to}` : period],
    queryFn: () => apiClient.get("revenue/breakdown", { searchParams }).json<unknown[]>(),
  });
}

export function useRevenueSystemDaily(
  periodOrOpts: number | { period?: number; from?: string; to?: string } = 30
) {
  const opts = typeof periodOrOpts === "number" ? { period: periodOrOpts } : periodOrOpts;
  const { period = 30, from, to } = opts;
  const searchParams = from && to ? { from, to } : { period };
  return useQuery({
    queryKey: ["revenue", "system-daily", from && to ? `${from}~${to}` : period],
    queryFn: () =>
      apiClient.get("revenue/system-daily", { searchParams })
        .json<Array<{ snapshot_date: string; revenue: number; views: number; subscribers: number }>>(),
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
