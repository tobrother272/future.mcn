import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { AdminLayout } from "@/components/layout/AdminLayout";

export function AdminRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === "partner") return <Navigate to="/portal" replace />;
  return <AdminLayout />;
}
