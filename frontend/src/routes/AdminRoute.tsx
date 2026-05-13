import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { getDefaultPath } from "@/lib/permissions";

export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === "partner") return <Navigate to="/portal" replace />;
  return <AdminLayout />;
}

/** Hook để lấy default landing path cho user hiện tại (dùng trong index route). */
export function DefaultRedirect() {
  const user = useAuthStore((s) => s.user);
  const role  = user && "role" in user ? user.role : null;
  const utype = user?.userType ?? "internal";
  return <Navigate to={getDefaultPath(utype, role)} replace />;
}
