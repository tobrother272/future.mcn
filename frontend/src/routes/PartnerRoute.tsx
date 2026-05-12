import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

export function PartnerRoute() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.userType === "internal") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
