import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { Channel, ChannelCreate, ChannelFilters } from "@/types/channel";
import type { PaginatedResponse, PaginationParams } from "@/types/api";

type ChannelParams = ChannelFilters & PaginationParams;

export function useChannelList(
  params?: ChannelParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["channels", params],
    queryFn: () =>
      apiClient
        .get("channels", { searchParams: params as Record<string, string | number> })
        .json<PaginatedResponse<Channel>>(),
    enabled: !!params && (options?.enabled ?? true),
  });
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: ["channels", id],
    queryFn: () => apiClient.get(`channels/${id}`).json<Channel>(),
    enabled: !!id,
  });
}

export function useBulkImportChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<Record<string, unknown>>) =>
      apiClient.post("channels/import", { json: rows })
        .json<{ created: number; updated: number; errors: Array<{ row: number; message: string }> }>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["cms"] });
      void qc.invalidateQueries({ queryKey: ["channels"] });
    },
  });
}

export interface YtValidateResult {
  valid: boolean;
  message?: string;
  channel?: {
    yt_id: string; name: string; description: string;
    country: string | null; thumbnail: string | null;
    subscribers: number; videos: number; views: number;
  };
}

export function useValidateYtChannel() {
  return useMutation({
    mutationFn: (yt_id: string) =>
      apiClient.get("channels/validate-yt", { searchParams: { yt_id } }).json<YtValidateResult>(),
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ChannelCreate) => apiClient.post("channels", { json: data }).json<Channel>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

export function useUpdateChannel(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ChannelCreate>) =>
      apiClient.put(`channels/${id}`, { json: data }).json<Channel>(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channels", id] });
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`channels/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useBulkDeleteChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiClient.post(`channels/bulk-delete`, { json: { ids } }).json<{ deleted: number }>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["channels"] });
      void qc.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

export interface VideoRow {
  id: string;
  channel_id: string;
  yt_video_id: string | null;
  title: string;
  published_at: string | null;
  views: number;
  watch_time_hours: number;
  avg_view_duration: string | null;
  revenue: number;
  status: string;
}

export function useChannelVideos(channelId: string, params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["channels", channelId, "videos", params],
    queryFn: () =>
      apiClient
        .get(`channels/${channelId}/videos`, { searchParams: params as Record<string, number> })
        .json<{ items: VideoRow[]; total: number }>(),
    enabled: !!channelId,
  });
}

export function useImportChannelVideos(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<Record<string, unknown>>) =>
      apiClient
        .post(`channels/${channelId}/videos/import`, { json: rows })
        .json<{ created: number; updated: number; errors: Array<{ row: number; message: string }> }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", channelId, "videos"] }),
  });
}

export interface AnalyticsRow {
  date: string;
  views: number;
  engaged_views: number;
  watch_time_hours: number;
  avg_view_duration: string | null;
  revenue: number;
}

export interface AnalyticsSummary {
  total_views: number;
  total_engaged: number;
  total_watch_hours: number;
  total_revenue: number;
  avg_view_duration?: string | null;
}

export interface ChannelAnalyticsResponse {
  channel_id: string;
  days: number;
  summary: AnalyticsSummary;
  items: AnalyticsRow[];
}

export function useChannelAnalytics(
  channelId: string,
  opts: { days?: number; from?: string; to?: string; period?: string } = {}
) {
  const { days = 30, from, to, period } = opts;
  const isLifetime = period === "lifetime";
  const searchParams = isLifetime
    ? { period: "lifetime" }
    : from && to
      ? { from, to }
      : { days };
  return useQuery({
    queryKey: ["channels", channelId, "analytics", isLifetime ? "lifetime" : from && to ? `${from}~${to}` : days],
    queryFn: () =>
      apiClient
        .get(`channels/${channelId}/analytics`, { searchParams })
        .json<ChannelAnalyticsResponse>(),
    enabled: !!channelId,
  });
}

export function useBulkEditChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids: string[]; updates: Partial<ChannelCreate> }) =>
      apiClient.post("channels/bulk-edit", { json: payload }).json<{ count: number }>(),
    onSuccess: () => {
      // Invalidate both standalone channel list and CMS-scoped channel list
      void qc.invalidateQueries({ queryKey: ["channels"] });
      void qc.invalidateQueries({ queryKey: ["cms"] });
    },
  });
}

export function useChannelCredentials(channelId: string) {
  return useQuery({
    queryKey: ["channels", channelId, "credentials"],
    queryFn: () => apiClient.get(`channels/${channelId}/credentials`).json<{ email_access: string | null; password: string | null }>(),
    enabled: !!channelId,
    retry: false,
  });
}

export function useUpdateChannelCredentials(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email_access?: string; password?: string }) =>
      apiClient.patch(`channels/${channelId}/credentials`, { json: data }).json<{ ok: boolean }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", channelId, "credentials"] }),
  });
}

export function useContentOwners() {
  return useQuery({
    queryKey: ["channels", "content-owners"],
    queryFn: () => apiClient.get("channels/content-owners").json<string[]>(),
    staleTime: 60_000,
  });
}
