import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface InboxChannel {
  id: string;
  name: string;
  yt_id: string;
  from?: string;
  to?: string;
}

export interface InboxMessage {
  id: string;
  type: string;
  title: string;
  body: {
    turned_on?: InboxChannel[];
    turned_off?: InboxChannel[];
    [key: string]: unknown;
  };
  cms_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface Paginated { items: InboxMessage[]; total: number }

export function useInboxList(params?: { page?: number; limit?: number; unread?: boolean }) {
  const q = new URLSearchParams();
  if (params?.page)   q.set("page",   String(params.page));
  if (params?.limit)  q.set("limit",  String(params.limit));
  if (params?.unread) q.set("unread", "1");
  return useQuery<Paginated>({
    queryKey: ["inbox", params],
    queryFn: () => apiClient.get(`inbox?${q}`).json<Paginated>(),
    refetchInterval: 30_000,
  });
}

export function useInboxUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ["inbox", "unread-count"],
    queryFn: () => apiClient.get("inbox/unread-count").json<{ count: number }>(),
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`inbox/${id}/read`).json<{ ok: boolean }>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch("inbox/read-all").json<{ ok: boolean }>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}

export function useDeleteInbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`inbox/${id}`).json<{ ok: boolean }>(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
  });
}
