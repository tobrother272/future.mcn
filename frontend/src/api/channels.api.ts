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

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ChannelCreate) => apiClient.post("channels", { json: data }).json<Channel>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
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
}

export interface ChannelAnalyticsResponse {
  channel_id: string;
  days: number;
  summary: AnalyticsSummary;
  items: AnalyticsRow[];
}

export function useChannelAnalytics(channelId: string, days: number) {
  return useQuery({
    queryKey: ["channels", channelId, "analytics", days],
    queryFn: () =>
      apiClient
        .get(`channels/${channelId}/analytics`, { searchParams: { days } })
        .json<ChannelAnalyticsResponse>(),
    enabled: !!channelId,
  });
}

export function useBulkEditChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { ids: string[]; updates: Partial<ChannelCreate> }) =>
      apiClient.post("channels/bulk-edit", { json: payload }).json<{ count: number }>(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}
