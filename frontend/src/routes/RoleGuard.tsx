import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { getAllowedPaths, getDefaultPath } from "@/lib/permissions";
import type { ReactNode } from "react";

/**
 * Bảo vệ route theo role.
 * Nếu role hiện tại không được phép truy cập path này → redirect về landing page.
 */
export function RoleGuard({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const { pathname } = useLocation();

  if (!user) return <>{children}</>;

  const userType = user.userType;
  const role     = "role" in user ? user.role : null;

  const allowed = getAllowedPaths(userType, role);

  // null = không giới hạn → cho qua
  if (allowed === null) return <>{children}</>;

  // Kiểm tra xem path hiện tại có nằm trong danh sách được phép không
  const ok = allowed.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/"));

  if (!ok) {
    const fallback = getDefaultPath(userType, role);
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
