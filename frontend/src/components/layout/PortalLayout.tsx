import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Tv2, FileText, AlertTriangle, ShieldCheck,
  User, UploadCloud, Home, LogOut,
} from "lucide-react";
import { C, RADIUS } from "@/styles/theme";
import { useAuthStore } from "@/stores/authStore";
import { ToastContainer } from "@/components/notifications/ToastContainer";

const NAV_ITEMS = [
  { to: "/portal/home",      icon: <Home size={16} />,          label: "Tổng quan" },
  { to: "/portal/channels",  icon: <Tv2 size={16} />,           label: "Kênh của tôi" },
  { to: "/portal/submit",    icon: <UploadCloud size={16} />,   label: "Gửi video" },
  { to: "/portal/contracts", icon: <FileText size={16} />,      label: "Hợp đồng" },
  { to: "/portal/alerts",    icon: <AlertTriangle size={16} />, label: "Cảnh báo" },
  { to: "/portal/policy",    icon: <ShieldCheck size={16} />,   label: "Chính sách" },
  { to: "/portal/profile",   icon: <User size={16} />,          label: "Hồ sơ" },
];

export function PortalLayout() {
  const navigate  = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user      = useAuthStore((s) => s.user);

  const handleLogout = () => { clearAuth(); navigate("/login"); };

  const userName = user?.userType === "partner"
    ? ((user as { full_name?: string }).full_name ?? user.email)
    : "";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: C.bgCard,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: 0.3 }}>
            Meridian MCN
          </div>
          <div style={{ fontSize: 11, color: C.blue, fontWeight: 600, marginTop: 2 }}>
            CỔNG ĐỐI TÁC
          </div>
        </div>

        {/* User info */}
        <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: `${C.blue}30`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 700, color: C.blue, flexShrink: 0,
          }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {userName}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted }}>Đối tác</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, padding: "10px 10px", overflowY: "auto" }}>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: RADIUS.sm,
                marginBottom: 2, textDecoration: "none",
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                color: isActive ? C.blue : C.textSub,
                background: isActive ? `${C.blue}18` : "transparent",
                transition: "background .15s, color .15s",
              })}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.classList.contains("active")) {
                  el.style.background = C.bgHover;
                  el.style.color = C.text;
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.getAttribute("aria-current")) {
                  el.style.background = "transparent";
                  el.style.color = C.textSub;
                }
              }}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: "12px 10px", borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: RADIUS.sm,
              background: "transparent", border: "none", cursor: "pointer",
              fontSize: 13, color: C.red, transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${C.red}15`)}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
          >
            <LogOut size={15} />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────── */}
      <main style={{ flex: 1, overflow: "auto", background: C.bg }}>
        <Outlet />
      </main>

      <ToastContainer />
    </div>
  );
}
