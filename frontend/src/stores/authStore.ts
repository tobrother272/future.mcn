import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser } from "@/types/user";

interface AuthState {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: CurrentUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: "meridian-auth",
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
