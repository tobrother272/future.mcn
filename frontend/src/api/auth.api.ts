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
  return useMutation({
    mutationFn: (data: { full_name?: string; phone?: string }) =>
      apiClient.patch("auth/me", { json: data }).json<CurrentUser>(),
    onSuccess: (updated) => {
      if (token) setAuth({ ...updated } as CurrentUser, token);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiClient.post("auth/change-password", { json: data }).json<{ ok: boolean }>(),
  });
}
