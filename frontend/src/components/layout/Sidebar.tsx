import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, FileText,
  Shield, Workflow, Inbox, Settings,
  Brain, LogOut, Server, ChevronLeft, ChevronRight, BookOpen,
} from "lucide-react";
import { useState, useMemo } from "react";
import { C, FONT_MONO } from "@/styles/theme";
import { useAuthStore } from "@/stores/authStore";
import { getAllowedPaths } from "@/lib/permissions";

interface NavItem {
  label: string;
  labelVi: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

// ── Divider marker ────────────────────────────────────────────
interface NavDivider { divider: true; label: string }
type NavEntry = NavItem | NavDivider;

const NAV_ENTRIES: NavEntry[] = [
  // ── Chính ─────────────────────────────────────────────────
  { label: "Overview",    labelVi: "Tổng quan",  icon: <LayoutDashboard size={16} />, path: "/dashboard" },
  { label: "CMS",         labelVi: "CMS",         icon: <Server size={16} />,          path: "/cms" },

  // ── Đối tác ───────────────────────────────────────────────
  { divider: true, label: "Đối tác" },
  { label: "Partners",    labelVi: "Đối tác",     icon: <Users size={16} />,           path: "/partners" },
  { label: "Employees",   labelVi: "Nhân viên",   icon: <Users size={16} />,           path: "/employees" },
  { label: "Contracts",   labelVi: "Hợp đồng",    icon: <FileText size={16} />,        path: "/contracts" },

  // ── Vận hành ──────────────────────────────────────────────
  { divider: true, label: "Vận hành" },
  { label: "Policies",    labelVi: "Chính sách",   icon: <BookOpen size={16} />,        path: "/policies" },
  { label: "Workflow",    labelVi: "Quy trình",   icon: <Workflow size={16} />,        path: "/workflow/qc" },
  { label: "Compliance",  labelVi: "Vi phạm",     icon: <Shield size={16} />,          path: "/compliance" },

  // ── Công cụ ───────────────────────────────────────────────
  { divider: true, label: "Công cụ" },
  { label: "AI Agent",    labelVi: "AI Agent",    icon: <Brain size={16} />,           path: "/ai" },
  { label: "Inbox",       labelVi: "Hộp thư",     icon: <Inbox size={16} />,           path: "/inbox" },
  { label: "Settings",    labelVi: "Cài đặt",     icon: <Settings size={16} />,        path: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  // Lọc nav items theo role
  const visibleEntries = useMemo<NavEntry[]>(() => {
    if (!user) return NAV_ENTRIES;
    const userType = user.userType;
    const role     = "role" in user ? user.role : null;
    const allowed  = getAllowedPaths(userType, role);
    if (allowed === null) return NAV_ENTRIES; // không giới hạn

    // Chỉ giữ các nav item có path trong danh sách được phép
    // Divider chỉ giữ nếu còn ít nhất 1 item phía sau nó visible
    const result: NavEntry[] = [];
    let pendingDivider: NavDivider | null = null;
    for (const entry of NAV_ENTRIES) {
      if ("divider" in entry) {
        pendingDivider = entry;
      } else {
        const ok = allowed.some(
          (prefix) => entry.path === prefix || entry.path.startsWith(prefix + "/") || prefix.startsWith(entry.path)
        );
        if (ok) {
          if (pendingDivider) { result.push(pendingDivider); pendingDivider = null; }
          result.push(entry);
        }
      }
    }
    return result;
  }, [user]);

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <aside style={{
      width: collapsed ? 56 : 220,
      minWidth: collapsed ? 56 : 220,
      height: "100vh",
      background: C.bgCard,
      borderRight: `1px solid ${C.border}`,
      display: "flex",
      flexDirection: "column",
      transition: "width 0.2s",
      overflow: "hidden",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "16px 12px" : "16px 20px",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        {!collapsed && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: C.blue, letterSpacing: 1 }}>
            MERIDIAN
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", padding: 4, display: "flex" }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {visibleEntries.map((entry, i) => {
          // Divider
          if ("divider" in entry) {
            if (collapsed) return null;
            return (
              <div key={`div-${i}`} style={{
                padding: "12px 20px 4px",
                fontSize: 10,
                fontWeight: 700,
                color: C.textMuted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}>
                {entry.label}
              </div>
            );
          }

          // Nav item
          return (
            <NavLink
              key={entry.path}
              to={entry.path}
              title={collapsed ? entry.labelVi : undefined}
              style={({ isActive }) => ({
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: collapsed ? "9px 18px" : "8px 20px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.blue : C.textSub,
                background: isActive ? `${C.blue}15` : "transparent",
                borderLeft: isActive ? `2px solid ${C.blue}` : "2px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              })}
            >
              {entry.icon}
              {!collapsed && entry.labelVi}
              {!collapsed && entry.badge ? (
                <span style={{
                  marginLeft: "auto", background: C.red, color: "#fff",
                  borderRadius: "9999px", fontSize: 10, padding: "1px 6px", fontWeight: 700,
                }}>{entry.badge}</span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        {!collapsed && user && (
          <div style={{ fontSize: 11, color: C.textSub, marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ color: C.text, fontWeight: 500 }}>
              {"full_name" in user ? String(user.full_name) : ""}
            </span>
            <br />
            <span style={{ color: C.textMuted, fontSize: 10 }}>
              {"role" in user ? user.role : "Partner"}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? "Logout" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "none", border: "none", color: C.textSub,
            cursor: "pointer", fontSize: 13, padding: "6px 4px", width: "100%",
          }}
        >
          <LogOut size={15} />
          {!collapsed && "Logout"}
        </button>
      </div>
    </aside>
  );
}
