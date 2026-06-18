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
  by: "cms" | "channel" | "partner" | "topic" | "content_owner" = "cms",
  periodOrOpts: number | { period?: number | "lifetime"; from?: string; to?: string } = 30,
  crossFilters?: { cmsIds?: string[]; partnerIds?: string[]; topicIds?: string[]; contentOwners?: string[] }
) {
  const opts = typeof periodOrOpts === "number" ? { period: periodOrOpts } : periodOrOpts;
  const { period = 30, from, to } = opts;
  const searchParams: Record<string, string | number> = from && to ? { by, from, to } : { by, period };
  const cf = crossFilters ?? {};
  if (cf.cmsIds?.length)        searchParams.crossCmsId        = cf.cmsIds.join(",");
  if (cf.partnerIds?.length)    searchParams.crossPartnerId    = cf.partnerIds.join(",");
  if (cf.topicIds?.length)      searchParams.crossTopicId      = cf.topicIds.join(",");
  if (cf.contentOwners?.length) searchParams.crossContentOwner = cf.contentOwners.join(",");
  const cfKey = [cf.cmsIds?.join(",") ?? "", cf.partnerIds?.join(",") ?? "", cf.topicIds?.join(",") ?? "", cf.contentOwners?.join(",") ?? ""].join("|");
  return useQuery({
    queryKey: ["revenue", "breakdown", by, from && to ? `${from}~${to}` : period, cfKey],
    queryFn: () => apiClient.get("revenue/breakdown", { searchParams }).json<unknown[]>(),
  });
}

export function useRevenueSystemDaily(
  periodOrOpts: number | { period?: number | "lifetime"; from?: string; to?: string } = 30
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

export function useRevenueEntityDaily(
  by: "cms" | "partner" | "topic" | "content_owner" | null,
  id: string | null,
  periodOrOpts: number | { period?: number | "lifetime"; from?: string; to?: string } = 30
) {
  const opts = typeof periodOrOpts === "number" ? { period: periodOrOpts } : periodOrOpts;
  const { period = 30, from, to } = opts;
  const searchParams = from && to
    ? { by: by ?? "cms", id: id ?? "", from, to }
    : { by: by ?? "cms", id: id ?? "", period };
  return useQuery({
    queryKey: ["revenue", "entity-daily", by, id, from && to ? `${from}~${to}` : period],
    queryFn: () =>
      apiClient.get("revenue/entity-daily", { searchParams })
        .json<Array<{ snapshot_date: string; revenue: number; views: number; subscribers: number }>>(),
    enabled: !!(by && id),
  });
}

export function useRevenueMultiDaily(
  filters: { cmsIds?: string[] | null; partnerIds?: string[] | null; topicIds?: string[] | null; contentOwners?: string[] | null },
  periodOrOpts: number | { period?: number | "lifetime"; from?: string; to?: string } = 30
) {
  const opts = typeof periodOrOpts === "number" ? { period: periodOrOpts } : periodOrOpts;
  const { period = 30, from, to } = opts;
  const searchParams: Record<string, string | number> = from && to ? { from, to } : { period };
  const cmsIds        = (filters.cmsIds        ?? []).filter(Boolean);
  const partnerIds    = (filters.partnerIds    ?? []).filter(Boolean);
  const topicIds      = (filters.topicIds      ?? []).filter(Boolean);
  const contentOwners = (filters.contentOwners ?? []).filter(Boolean);
  if (cmsIds.length)        searchParams.cmsId         = cmsIds.join(",");
  if (partnerIds.length)    searchParams.partnerId     = partnerIds.join(",");
  if (topicIds.length)      searchParams.topicId       = topicIds.join(",");
  if (contentOwners.length) searchParams.contentOwner  = contentOwners.join(",");
  const hasAnyFilter = cmsIds.length > 0 || partnerIds.length > 0 || topicIds.length > 0 || contentOwners.length > 0;
  return useQuery({
    queryKey: ["revenue", "multi-daily", cmsIds.join(","), partnerIds.join(","), topicIds.join(","), contentOwners.join(","), from && to ? `${from}~${to}` : period],
    queryFn: () =>
      apiClient.get("revenue/multi-daily", { searchParams })
        .json<Array<{ snapshot_date: string; revenue: number; views: number; subscribers: number }>>(),
    enabled: hasAnyFilter,
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
