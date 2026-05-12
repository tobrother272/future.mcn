import ky from "ky";
import { useAuthStore } from "@/stores/authStore";
import { router } from "@/routes/routes";

export const apiClient = ky.create({
  prefixUrl: "/api",
  timeout: 30_000,
  retry: { limit: 2, statusCodes: [408, 413, 429, 500, 502, 503, 504] },
  hooks: {
    beforeRequest: [
      (request) => {
        const token = useAuthStore.getState().token;
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (request, _options, response) => {
        // Only redirect on 401 for protected routes, not for the login endpoint itself
        if (response.status === 401 && !request.url.includes("/auth/login")) {
          useAuthStore.getState().clearAuth();
          router.navigate("/login", { replace: true });
        }
        return response;
      },
    ],
  },
});
