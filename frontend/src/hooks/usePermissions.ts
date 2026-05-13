import { useMemo } from "react";
import { useAuthStore } from "@/stores/authStore";
import { getPermissions, can, type Permission } from "@/lib/permissions";

/**
 * Hook trả về object permissions cho user đang đăng nhập.
 *
 * Usage:
 *   const { can } = usePermissions();
 *   if (can("channel:delete")) { ... }
 */
export function usePermissions() {
  const user = useAuthStore((s) => s.user);

  const perms = useMemo(() => {
    if (!user) return new Set<Permission>();
    const role =
      user.userType === "internal"   ? user.role :
      user.userType === "employee"   ? user.role :
      null;
    return getPermissions(user.userType, role);
  }, [user]);

  return {
    /** Kiểm tra 1 permission */
    can: (p: Permission) => can(perms, p),
    /** Kiểm tra tất cả permissions */
    canAll: (...ps: Permission[]) => ps.every((p) => can(perms, p)),
    /** Kiểm tra ít nhất 1 permission */
    canAny: (...ps: Permission[]) => ps.some((p) => can(perms, p)),
    /** Raw set để debug */
    perms,
  };
}
