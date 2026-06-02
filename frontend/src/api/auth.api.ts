import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";
import { useAuthStore } from "@/stores/authStore";
import type { CurrentUser } from "@/types/user";

interface LoginPayload { login: string; password: string }
interface LoginResponse { user: CurrentUser; token: string }

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: (data: LoginPayload) =>
      apiClient.post("auth/login", { json: data }).json<LoginResponse>(),
    onSuccess: ({ user, token }) => setAuth(user, token),
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  return useMutation({
    mutationFn: () => apiClient.post("auth/logout").json<{ ok: boolean }>(),
    onSettled: () => clearAuth(),
  });
}

export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => apiClient.get("auth/me").json<CurrentUser>(),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}

export function useRegisterPartner() {
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      full_name: string;
      company_name: string;
      phone?: string;
    }) => apiClient.post("auth/partner-register", { json: data }).json<{ ok: boolean }>(),
  });
}

export function useUpdateMe() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const token   = useAuthStore((s) => s.token);
  const current = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) =>
      apiClient.patch("auth/me", { json: data }).json<CurrentUser>(),
    onSuccess: (updated) => {
      if (!token || !current) return;
      // Only patch fields that PATCH /auth/me can legitimately change.
      // Never overwrite partner_id / userType / role from the server response
      // because an admin may have reassigned the account between login and this call,
      // which would cause the partner dashboard to go blank.
      const u = updated as Record<string, unknown>;
      const normalized: CurrentUser = {
        ...current,
        ...(u.full_name !== undefined  ? { full_name:  u.full_name  } : {}),
        ...(u.phone     !== undefined  ? { phone:      u.phone      } : {}),
        ...(u.status    !== undefined  ? { status:     u.status     } : {}),
        ...(u.updated_at !== undefined ? { updated_at: u.updated_at } : {}),
        ...(u.last_login !== undefined ? { last_login: u.last_login } : {}),
      } as CurrentUser;
      setAuth(normalized, token);
    },
  });
}

export function useVerifyPassword() {
  return useMutation({
    mutationFn: (password: string) =>
      apiClient.post("auth/verify-password", { json: { password } }).json<{ ok: boolean }>(),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiClient.post("auth/change-password", { json: data }).json<{ ok: boolean }>(),
  });
}
