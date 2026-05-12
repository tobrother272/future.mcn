import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import type { InternalUser } from "@/types/user";

// ── Internal users ────────────────────────────────────────────
export function useInternalUsers() {
  return useQuery({
    queryKey: ["auth", "users"],
    queryFn: () => apiClient.get("auth/users").json<InternalUser[]>(),
  });
}

export function useCreateInternalUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; password: string; full_name: string; role: string }) =>
      apiClient.post("auth/users", { json: data }).json<InternalUser>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["auth", "users"] }),
  });
}

export function useUpdateInternalUser(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { role?: string; status?: string; full_name?: string }) =>
      apiClient.patch(`auth/users/${id}`, { json: data }).json<InternalUser>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["auth", "users"] }),
  });
}

// ── Audit log ─────────────────────────────────────────────────
export interface AuditEntry {
  id: number;
  action: string;
  actor: string | null;
  detail: string | null;
  ip: string | null;
  created_at: string;
}

export function useAuditLog(params?: {
  actor?: string; action?: string; from?: string; to?: string; page?: number; limit?: number;
}) {
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () =>
      apiClient
        .get("audit", { searchParams: params as Record<string, string | number> })
        .json<{ items: AuditEntry[]; total: number }>(),
  });
}

// ── System settings ───────────────────────────────────────────
export interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiClient.get("settings").json<SettingRow[]>(),
  });
}

export function useSetSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      apiClient.put(`settings/${encodeURIComponent(key)}`, { json: { value } }).json<SettingRow>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

export function useDeleteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (key: string) =>
      apiClient.delete(`settings/${encodeURIComponent(key)}`).json<{ ok: boolean }>(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ── System health ─────────────────────────────────────────────
export function useHealthCheck() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => apiClient.get("health").json<{ ok: boolean; version: string; env: string }>(),
    refetchInterval: 30_000,
  });
}
