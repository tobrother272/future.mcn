import React, { useState, useMemo } from "react";
import {
  Users, ClipboardList, Settings2, Plus, Search,
  Shield, RefreshCw, Edit2, Check, X, Eye, EyeOff,
  Activity, Server, Database, Clock, ChevronLeft, ChevronRight,
  Trash2, AlertTriangle, Key, Table2, Upload, ToggleLeft, ToggleRight,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/stores/notificationStore";
import {
  useInternalUsers, useCreateInternalUser, useUpdateInternalUser,
  useAuditLog, useSettings, useSetSetting, useDeleteSetting, useHealthCheck,
  useTriggerSheetsExport,
} from "@/api/settings.api";
import { useChangePassword } from "@/api/auth.api";
import type { InternalUser, InternalRole } from "@/types/user";

// ── Constants ─────────────────────────────────────────────────
const ROLES: InternalRole[] = [
  "SUPER_ADMIN","ADMIN","QC_REVIEWER","CHANNEL_CREATOR",
  "CONTENT_MANAGER","FINANCE_MANAGER","COMPLIANCE_MANAGER","VIEWER",
];

const ROLE_COLOR: Record<string, "red"|"blue"|"amber"|"teal"|"purple"|"green"|"cyan"|"gray"> = {
  SUPER_ADMIN: "red", ADMIN: "blue", QC_REVIEWER: "amber",
  CHANNEL_CREATOR: "teal", CONTENT_MANAGER: "purple",
  FINANCE_MANAGER: "green", COMPLIANCE_MANAGER: "cyan", VIEWER: "gray",
};

const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", QC_REVIEWER: "QC Reviewer",
  CHANNEL_CREATOR: "Channel Creator", CONTENT_MANAGER: "Content Manager",
  FINANCE_MANAGER: "Finance Manager", COMPLIANCE_MANAGER: "Compliance Mgr", VIEWER: "Viewer",
};

// ── Tab button ────────────────────────────────────────────────
function TabBtn({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
      borderRadius: RADIUS.sm, border: "none", cursor: "pointer",
      background: active ? `${C.blue}18` : "transparent",
      color: active ? C.blue : C.textSub,
      fontWeight: active ? 600 : 400, fontSize: 13,
      transition: "all .15s",
    }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = C.bgHover; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {icon}{label}
      {count !== undefined && (
        <span style={{ fontSize: 10, background: active ? C.blue : C.bgHover, color: active ? "#fff" : C.textMuted, padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>{count}</span>
      )}
    </button>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 1: Users
// ═══════════════════════════════════════════════════════

function UserRow({ user, currentId }: { user: InternalUser; currentId: string }) {
  const toast = useToast();
  const [editingRole, setEditingRole] = useState(false);
  const [newRole, setNewRole] = useState(user.role);
  const updateMut = useUpdateInternalUser(user.id);
  const isSelf = user.id === currentId;

  const handleRoleSave = async () => {
    try {
      await updateMut.mutateAsync({ role: newRole });
      toast.success("Đã cập nhật", `Đổi role thành ${ROLE_LABEL[newRole]}`);
      setEditingRole(false);
    } catch { toast.error("Lỗi", "Không thể cập nhật role"); }
  };

  const handleToggleStatus = async () => {
    if (isSelf) { toast.warning("Không thể", "Không thể khóa tài khoản của chính mình"); return; }
    const next = user.status === "Active" ? "Suspended" : "Active";
    try {
      await updateMut.mutateAsync({ status: next });
      toast.success("Đã cập nhật", `${user.email} → ${next}`);
    } catch { toast.error("Lỗi", "Không thể cập nhật trạng thái"); }
  };

  return (
    <tr style={{ borderBottom: `1px solid ${C.border}` }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.bgHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
    >
      <td style={{ padding: "11px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: "50%", background: `${C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.blue, flexShrink: 0 }}>
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{user.full_name} {isSelf && <span style={{ fontSize: 10, color: C.blue }}>(bạn)</span>}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{user.email}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "11px 16px" }}>
        {editingRole ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <select value={newRole} onChange={(e) => setNewRole(e.target.value as InternalRole)}
              style={{ padding: "4px 8px", background: C.bgInput, border: `1px solid ${C.blue}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none" }}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
            <button onClick={() => void handleRoleSave()} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.green, padding: 2 }}><Check size={14} /></button>
            <button onClick={() => setEditingRole(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2 }}><X size={14} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Pill color={ROLE_COLOR[user.role] ?? "gray"}>{ROLE_LABEL[user.role] ?? user.role}</Pill>
            {!isSelf && (
              <button onClick={() => setEditingRole(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2, opacity: 0.6, transition: "opacity .12s" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "1")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.opacity = "0.6")}
              ><Edit2 size={11} /></button>
            )}
          </div>
        )}
      </td>
      <td style={{ padding: "11px 16px" }}>
        <Pill color={user.status === "Active" ? "green" : "red"} dot>{user.status}</Pill>
      </td>
      <td style={{ padding: "11px 16px", fontSize: 11, color: C.textMuted }}>
        {user.last_login ? new Date(user.last_login).toLocaleString("vi-VN") : "Chưa đăng nhập"}
      </td>
      <td style={{ padding: "11px 16px" }}>
        <button
          onClick={() => void handleToggleStatus()}
          disabled={isSelf || updateMut.isPending}
          style={{ padding: "4px 10px", fontSize: 11, borderRadius: RADIUS.sm, cursor: isSelf ? "not-allowed" : "pointer", border: `1px solid ${user.status === "Active" ? C.red : C.green}`, background: "transparent", color: user.status === "Active" ? C.red : C.green, opacity: isSelf ? 0.3 : 1, transition: "all .12s" }}
          onMouseEnter={(e) => { if (!isSelf) (e.currentTarget as HTMLButtonElement).style.background = user.status === "Active" ? `${C.red}15` : `${C.green}15`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          {user.status === "Active" ? "Khóa" : "Kích hoạt"}
        </button>
      </td>
    </tr>
  );
}

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const createMut = useCreateInternalUser();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "VIEWER" });
  const [showPwd, setShowPwd] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((v) => ({ ...v, [k]: e.target.value }));

  const handleCreate = async () => {
    if (!form.email || !form.password || !form.full_name) { toast.warning("Thiếu thông tin", "Điền đầy đủ các trường"); return; }
    if (form.password.length < 8) { toast.warning("Mật khẩu yếu", "Tối thiểu 8 ký tự"); return; }
    try {
      await createMut.mutateAsync(form);
      toast.success("Đã tạo", `${form.email} — ${ROLE_LABEL[form.role]}`);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Không tạo được người dùng");
    }
  };

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
      <div style={{ background: C.bgCard, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`, width: 460, boxShadow: "0 20px 60px rgba(0,0,0,.7)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <Shield size={16} color={C.blue} />
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Tạo tài khoản nội bộ</span>
        </div>
        <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { k: "full_name" as const, label: "Họ và tên *", type: "text", placeholder: "Nguyễn Văn A" },
            { k: "email"    as const, label: "Email *",      type: "email", placeholder: "name@meridian.vn" },
          ].map(({ k, label, type, placeholder }) => (
            <div key={k}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 4 }}>{label}</label>
              <input type={type} value={form[k]} onChange={set(k)} placeholder={placeholder} style={inp} />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 4 }}>Mật khẩu *</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input type={showPwd ? "text" : "password"} value={form.password} onChange={set("password")} placeholder="Tối thiểu 8 ký tự" style={{ ...inp, paddingRight: 36 }} />
              <button onClick={() => setShowPwd((v) => !v)} style={{ position: "absolute", right: 10, background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}>
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 4 }}>Vai trò</label>
            <select value={form.role} onChange={set("role")} style={inp}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => void handleCreate()} disabled={createMut.isPending}>
            {createMut.isPending ? "Đang tạo..." : "Tạo tài khoản"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function UsersTab({ currentId }: { currentId: string }) {
  const { data: users = [], isLoading, refetch } = useInternalUsers();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q));
  }, [users, search]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên, email, vai trò..."
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void refetch()}>Làm mới</Button>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Thêm tài khoản</Button>
      </div>

      <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
              {["Người dùng", "Vai trò", "Trạng thái", "Đăng nhập gần nhất", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "9px 16px", fontSize: 10, fontWeight: 600, color: C.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Không có dữ liệu</td></tr>
            ) : (
              filtered.map((u) => <UserRow key={u.id} user={u} currentId={currentId} />)
            )}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// TAB 2: Audit Log
// ═══════════════════════════════════════════════════════

function AuditTab() {
  const [page, setPage] = useState(1);
  const [actor,  setActor]  = useState("");
  const [action, setAction] = useState("");
  const [from,   setFrom]   = useState("");
  const [to,     setTo]     = useState("");
  const limit = 20;

  const { data, isLoading, refetch } = useAuditLog({
    actor:  actor  || undefined,
    action: action || undefined,
    from:   from   || undefined,
    to:     to     || undefined,
    page, limit,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / limit);

  const inp: React.CSSProperties = { padding: "7px 10px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none" };

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <input value={actor} onChange={(e) => { setActor(e.target.value); setPage(1); }} placeholder="Actor (email)" style={{ ...inp, minWidth: 160 }} />
        <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Action" style={{ ...inp, minWidth: 140 }} />
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={inp} />
        <span style={{ color: C.textMuted, fontSize: 12 }}>→</span>
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={inp} />
        <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void refetch()}>Làm mới</Button>
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>{total} bản ghi</span>
      </div>

      <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
              {["Thời gian", "Action", "Actor", "Chi tiết", "IP"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "9px 14px", fontSize: 10, fontWeight: 600, color: C.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: C.textMuted }}>Đang tải...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: C.textMuted }}>Không có bản ghi</td></tr>
            ) : items.map((e) => (
              <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}` }}
                onMouseEnter={(ev) => ((ev.currentTarget as HTMLTableRowElement).style.background = C.bgHover)}
                onMouseLeave={(ev) => ((ev.currentTarget as HTMLTableRowElement).style.background = "transparent")}
              >
                <td style={{ padding: "9px 14px", fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>
                  {new Date(e.created_at).toLocaleString("vi-VN")}
                </td>
                <td style={{ padding: "9px 14px" }}>
                  <code style={{ fontSize: 11, color: C.amber, background: `${C.amber}15`, padding: "2px 6px", borderRadius: 4 }}>{e.action}</code>
                </td>
                <td style={{ padding: "9px 14px", fontSize: 12, color: C.textSub }}>{e.actor ?? "—"}</td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: C.textSub, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.detail ?? "—"}</td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: C.textMuted }}>{e.ip ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: "4px 8px", cursor: "pointer", color: C.textSub, display: "flex" }}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 12, color: C.textSub }}>Trang {page}/{pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: "4px 8px", cursor: "pointer", color: C.textSub, display: "flex" }}><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}

// ── Google API Key card ──────────────────────────────────────────
function GoogleApiKeyCard() {
  const { data: settings = [], isLoading } = useSettings();
  const setSetting = useSetSetting();
  const delSetting = useDeleteSetting();
  const toast = useToast();

  const SETTING_KEY = "GOOGLE_API_KEY";

  // Value stored as JSON array of strings
  const rawVal = settings.find((s) => s.key === SETTING_KEY)?.value;
  const keys: string[] = Array.isArray(rawVal)
    ? rawVal
    : typeof rawVal === "string" && rawVal.trim().startsWith("[")
      ? (() => { try { return JSON.parse(rawVal) as string[]; } catch { return [rawVal]; } })()
      : rawVal ? [rawVal as string] : [];

  const [newKey, setNewKey] = useState("");
  const [showIdx, setShowIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  const save = async (list: string[]) => {
    await setSetting.mutateAsync({ key: SETTING_KEY, value: JSON.stringify(list) });
  };

  const handleAdd = async () => {
    const trimmed = newKey.trim();
    if (!trimmed) { toast.warning("Thiếu giá trị", "Nhập API Key"); return; }
    if (keys.includes(trimmed)) { toast.warning("Trùng key", "Key này đã tồn tại"); return; }
    try {
      await save([...keys, trimmed]);
      toast.success("Đã thêm", "Google API Key");
      setNewKey("");
    } catch { toast.error("Lỗi", "Không lưu được API Key"); }
  };

  const handleDelete = async (idx: number) => {
    const next = keys.filter((_, i) => i !== idx);
    try {
      if (next.length === 0) {
        await delSetting.mutateAsync(SETTING_KEY);
      } else {
        await save(next);
      }
      toast.success("Đã xóa key");
      if (showIdx === idx) setShowIdx(null);
    } catch { toast.error("Lỗi", "Không xóa được"); }
  };

  const handleEditSave = async (idx: number) => {
    const trimmed = editVal.trim();
    if (!trimmed) return;
    const next = keys.map((k, i) => (i === idx ? trimmed : k));
    try {
      await save(next);
      toast.success("Đã cập nhật key");
      setEditIdx(null);
    } catch { toast.error("Lỗi", "Không lưu được"); }
  };

  const masked = (k: string) => k.slice(0, 8) + "•".repeat(Math.max(0, k.length - 12)) + k.slice(-4);

  return (
    <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <Key size={14} color={C.amber} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Google API Keys</span>
        <span style={{ fontSize: 10, color: C.textMuted }}>— YouTube Data API v3 · tự động xoay vòng</span>
        {keys.length > 0 && (
          <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: `${C.green}20`, color: C.green, padding: "2px 7px", borderRadius: 10 }}>{keys.length} key</span>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {isLoading ? (
          <div style={{ fontSize: 12, color: C.textMuted }}>Đang tải...</div>
        ) : (
          <>
            {/* Existing keys list */}
            {keys.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: `${C.amber}0d`, border: `1px dashed ${C.amber}50`, borderRadius: RADIUS.sm, marginBottom: 12 }}>
                <AlertTriangle size={13} color={C.amber} />
                <span style={{ fontSize: 12, color: C.textSub }}>Chưa có key nào — channel stats sẽ không tự cập nhật</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {keys.map((k, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm }}>
                    <span style={{ fontSize: 10, color: C.textMuted, minWidth: 18, textAlign: "right" }}>#{idx + 1}</span>
                    {editIdx === idx ? (
                      <>
                        <input
                          value={editVal}
                          onChange={(e) => setEditVal(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Enter") void handleEditSave(idx); if (e.key === "Escape") setEditIdx(null); }}
                          style={{ flex: 1, padding: "4px 8px", background: C.bgInput, border: `1px solid ${C.blue}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none" }}
                        />
                        <button onClick={() => void handleEditSave(idx)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.green, padding: 2 }}><Check size={13} /></button>
                        <button onClick={() => setEditIdx(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2 }}><X size={13} /></button>
                      </>
                    ) : (
                      <>
                        <code style={{ flex: 1, fontSize: 12, color: C.green, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {showIdx === idx ? k : masked(k)}
                        </code>
                        <button onClick={() => setShowIdx(showIdx === idx ? null : idx)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2, display: "flex" }}>
                          {showIdx === idx ? <EyeOff size={12} /> : <Eye size={12} />}
                        </button>
                        <button onClick={() => { setEditIdx(idx); setEditVal(k); }}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2, display: "flex" }}>
                          <Edit2 size={11} />
                        </button>
                        <button onClick={() => void handleDelete(idx)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.red, padding: 2, display: "flex" }}>
                          <Trash2 size={11} />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new key input */}
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Thêm key mới: AIzaSy..."
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAdd(); }}
                  style={{ width: "100%", padding: "8px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = C.blue)}
                  onBlur={(e) => (e.currentTarget.style.borderColor = C.border)}
                />
              </div>
              <button
                onClick={() => void handleAdd()}
                disabled={setSetting.isPending}
                style={{ padding: "8px 14px", background: `${C.blue}18`, border: `1px solid ${C.blue}`, borderRadius: RADIUS.sm, cursor: "pointer", color: C.blue, fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                <Plus size={13} /> Thêm
              </button>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, color: C.textMuted }}>
              Lấy key tại <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: C.blue }}>Google Cloud Console</a> → YouTube Data API v3 · Nhiều key giúp tránh quota limit
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ─── Test interval row (inside GoogleSheetsCard) ─────────────

// ─── Google Sheets Integration Card ──────────────────────────
function GoogleSheetsCard() {
  const { data: settings = [] } = useSettings();
  const setSetting    = useSetSetting();
  const triggerExport = useTriggerSheetsExport();
  const toast = useToast();

  const get = (key: string) => (settings.find(s => s.key === key)?.value ?? "") as string;

  const enabledRow = settings.find(s => s.key === "sheets_export_enabled");
  const lastExport = settings.find(s => s.key === "sheets_last_export");
  const isEnabled  = enabledRow === undefined || enabledRow.value !== false;
  const lastInfo   = lastExport?.value as { written?: number; ts?: string } | undefined;

  const [email,    setEmail]    = useState("");
  const [privKey,  setPrivKey]  = useState("");
  const [sheetId,  setSheetId]  = useState("");
  const [editKey,  setEditKey]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  // Populate fields when settings load
  const emailSaved   = get("sheets_service_account_email");
  const privKeySaved = get("sheets_private_key");
  const sheetIdSaved = get("sheets_sheet_id");

  // Initialize from saved values (only once when data loads)
  const initialized = React.useRef(false);
  React.useEffect(() => {
    if (!initialized.current && settings.length > 0) {
      initialized.current = true;
      if (emailSaved)   setEmail(emailSaved);
      if (privKeySaved) setPrivKey(privKeySaved);
      if (sheetIdSaved) setSheetId(sheetIdSaved);
    }
  }, [settings.length, emailSaved, privKeySaved, sheetIdSaved]);

  const hasCredentials = !!(emailSaved && privKeySaved && sheetIdSaved);

  const handleToggle = async () => {
    try {
      await setSetting.mutateAsync({ key: "sheets_export_enabled", value: !isEnabled });
      toast.success(isEnabled ? "Đã tắt" : "Đã bật", "Tự động xuất Google Sheets " + (!isEnabled ? "bật" : "tắt"));
    } catch { toast.error("Lỗi", "Không lưu được cài đặt"); }
  };

  const handleSaveCreds = async () => {
    if (!email.trim() || !privKey.trim() || !sheetId.trim()) {
      toast.warning("Thiếu thông tin", "Nhập đủ 3 thông tin Google"); return;
    }
    setSaving(true);
    try {
      await setSetting.mutateAsync({ key: "sheets_service_account_email", value: email.trim() });
      await setSetting.mutateAsync({ key: "sheets_private_key",           value: privKey.trim() });
      await setSetting.mutateAsync({ key: "sheets_sheet_id",              value: sheetId.trim() });
      toast.success("Đã lưu", "Cấu hình Google Sheets đã được lưu");
      setEditKey(false);
    } catch { toast.error("Lỗi", "Không lưu được cấu hình"); }
    finally { setSaving(false); }
  };

  const handleTrigger = async () => {
    try {
      const res = await triggerExport.mutateAsync();
      toast.success("Xuất thành công", `Đã ghi ${res.written} kênh lên Google Sheets`);
    } catch (err) {
      toast.error("Xuất thất bại", err instanceof Error ? err.message : "Kiểm tra Google credentials");
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", padding: "7px 10px",
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: RADIUS.sm, color: C.text, fontSize: 12,
    outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { fontSize: 11, color: C.textMuted, marginBottom: 4, display: "block" };

  return (
    <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <Table2 size={14} color={C.green} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, flex: 1 }}>Google Sheets Export</span>
        {hasCredentials && (
          <span style={{ fontSize: 10, color: C.green, background: `${C.green}15`, padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>
            ✓ Đã cấu hình
          </span>
        )}
      </div>

      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Tự động xuất lúc 5:00 sáng</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Chạy hằng ngày nếu đã cấu hình thông tin bên dưới</div>
          </div>
          <button
            onClick={() => void handleToggle()}
            disabled={setSetting.isPending}
            style={{ background: "none", border: "none", cursor: "pointer", color: isEnabled ? C.green : C.textMuted, display: "flex", padding: 2 }}
            title={isEnabled ? "Đang bật — click để tắt" : "Đang tắt — click để bật"}
          >
            {isEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>

        {/* Last export info */}
        {lastInfo?.ts && (
          <div style={{ fontSize: 11, color: C.textMuted, padding: "7px 10px", background: `${C.bgPage}cc`, borderRadius: RADIUS.sm, border: `1px solid ${C.border}` }}>
            <span style={{ color: C.textSub }}>Lần cuối: </span>
            <span style={{ color: C.teal, fontWeight: 500 }}>
              {new Date(lastInfo.ts).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
            </span>
            {lastInfo.written !== undefined && <span> — {lastInfo.written} kênh</span>}
          </div>
        )}

        {/* Credentials form */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 10 }}>Thông tin kết nối Google</div>

          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Service Account Email</label>
            <input
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your-service@project.iam.gserviceaccount.com"
              style={inp}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Private Key</label>
            {privKeySaved && !editKey ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8,
                padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`,
                borderRadius: RADIUS.sm }}>
                <span style={{ fontSize: 11, color: C.green, flex: 1 }}>
                  ✓ Đã lưu — <span style={{ fontFamily: "monospace", color: C.textMuted }}>
                    {privKeySaved.slice(0, 28)}...{privKeySaved.slice(-12)}
                  </span>
                </span>
                <button onClick={() => setEditKey(true)}
                  style={{ fontSize: 11, color: C.blue, background: "none", border: "none",
                    cursor: "pointer", padding: "2px 6px", borderRadius: 4,
                    whiteSpace: "nowrap" }}>
                  Đổi key
                </button>
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                <textarea
                  value={privKey} onChange={e => setPrivKey(e.target.value)}
                  placeholder={"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}
                  rows={4}
                  autoFocus={editKey}
                  style={{ ...inp, resize: "none", fontFamily: "monospace", fontSize: 11 }}
                />
                {editKey && (
                  <button onClick={() => { setEditKey(false); setPrivKey(privKeySaved); }}
                    style={{ position: "absolute", top: 6, right: 8, background: "none",
                      border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}
                    title="Hủy">
                    <X size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Google Sheet ID</label>
            <input
              value={sheetId} onChange={e => setSheetId(e.target.value)}
              placeholder="Lấy từ URL: /spreadsheets/d/[SHEET_ID]/edit"
              style={inp}
            />
          </div>

          <Button
            variant="ghost" size="sm"
            icon={saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={13} />}
            loading={saving}
            onClick={() => void handleSaveCreds()}
          >
            Lưu cấu hình
          </Button>
        </div>

        {/* Manual trigger button */}
        <button
          onClick={() => void handleTrigger()}
          disabled={triggerExport.isPending || !hasCredentials}
          title={!hasCredentials ? "Điền thông tin Google trước" : undefined}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            padding: "9px 14px", borderRadius: RADIUS.sm,
            border: `1px solid ${hasCredentials ? C.green + "40" : C.border}`,
            background: !hasCredentials ? `${C.bgPage}` : triggerExport.isPending ? `${C.green}10` : `${C.green}15`,
            color: hasCredentials ? C.green : C.textMuted,
            fontSize: 13, fontWeight: 600,
            cursor: (triggerExport.isPending || !hasCredentials) ? "default" : "pointer",
            transition: "background .15s",
            opacity: hasCredentials ? 1 : 0.5,
          }}
        >
          {triggerExport.isPending
            ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Đang xuất...</>
            : <><Upload size={13} /> Xuất ngay lên Google Sheets</>
          }
        </button>
      </div>
    </div>
  );
}

// TAB 3: System Info
// ═══════════════════════════════════════════════════════

function SystemTab() {
  const { data: health, isLoading: hLoading } = useHealthCheck();
  const { data: settings = [], isLoading: sLoading, refetch: refetchSettings } = useSettings();
  const setSetting = useSetSetting();
  const delSetting = useDeleteSetting();
  const toast = useToast();

  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");

  const handleAddSetting = async () => {
    if (!newKey.trim()) { toast.warning("Thiếu key", "Nhập tên key"); return; }
    try {
      await setSetting.mutateAsync({ key: newKey.trim(), value: newVal });
      toast.success("Đã lưu", newKey);
      setNewKey(""); setNewVal("");
    } catch { toast.error("Lỗi", "Không lưu được setting"); }
  };

  const handleEditSave = async (key: string) => {
    try {
      await setSetting.mutateAsync({ key, value: editVal });
      toast.success("Đã cập nhật", key);
      setEditKey(null);
    } catch { toast.error("Lỗi", "Không lưu được"); }
  };

  const handleDelete = async (key: string) => {
    try {
      await delSetting.mutateAsync(key);
      toast.success("Đã xóa", key);
    } catch { toast.error("Lỗi", "Không xóa được"); }
  };

  const inp: React.CSSProperties = { padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
      {/* System health */}
      <div>
        <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm, marginBottom: 16 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Server size={14} color={C.blue} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Trạng thái hệ thống</span>
          </div>
          <div style={{ padding: 16 }}>
            {hLoading ? (
              <div style={{ color: C.textMuted, fontSize: 13 }}>Đang kiểm tra...</div>
            ) : health ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <InfoLine icon={<Activity size={13} />} label="API" value={health.ok ? "Hoạt động bình thường" : "Có vấn đề"} valueColor={health.ok ? C.green : C.red} />
                <InfoLine icon={<Database size={13} />} label="Phiên bản" value={`v${health.version}`} />
                <InfoLine icon={<Server size={13} />} label="Environment" value={health.env} />
                <InfoLine icon={<Clock size={13} />} label="Thời gian" value={new Date().toLocaleString("vi-VN")} />
              </div>
            ) : (
              <div style={{ color: C.red, fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><AlertTriangle size={14} /> Không kết nối được API</div>
            )}
          </div>
        </div>

        {/* Change admin password */}
        <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <Key size={14} color={C.amber} />
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Đổi mật khẩu của tôi</span>
          </div>
          <div style={{ padding: 16 }}>
            <ChangePasswordInline />
          </div>
        </div>

        {/* Google Sheets */}
        <div style={{ marginTop: 16 }}>
          <GoogleSheetsCard />
        </div>
      </div>

      {/* Settings key-value */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Google API Key card */}
        <GoogleApiKeyCard />

        <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Settings2 size={14} color={C.purple} />
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Cài đặt hệ thống</span>
            </div>
            <button onClick={() => void refetchSettings()} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, display: "flex", padding: 4 }}><RefreshCw size={13} /></button>
          </div>
        <div style={{ padding: 16 }}>
          {/* Add new setting */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            <input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="key" style={{ ...inp, flex: "0 0 130px" }} />
            <input value={newVal} onChange={(e) => setNewVal(e.target.value)} placeholder="value" style={{ ...inp, flex: 1 }} />
            <button onClick={() => void handleAddSetting()} style={{ padding: "7px 12px", background: `${C.blue}20`, border: `1px solid ${C.blue}`, borderRadius: RADIUS.sm, cursor: "pointer", color: C.blue, fontSize: 12, fontWeight: 600 }}>Thêm</button>
          </div>
          {/* List */}
          {sLoading ? (
            <div style={{ color: C.textMuted, fontSize: 13 }}>Đang tải...</div>
          ) : settings.filter((s) => s.key !== "GOOGLE_API_KEY" && !s.key.startsWith("sheets_")).length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", padding: "16px 0" }}>Chưa có cài đặt nào</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {settings.filter((s) => s.key !== "GOOGLE_API_KEY" && !s.key.startsWith("sheets_")).map((s) => (
                <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: C.bg, borderRadius: RADIUS.sm, border: `1px solid ${C.border}` }}>
                  <code style={{ fontSize: 11, color: C.blue, minWidth: 120, flexShrink: 0 }}>{s.key}</code>
                  {editKey === s.key ? (
                    <>
                      <input value={editVal} onChange={(e) => setEditVal(e.target.value)} style={{ ...inp, flex: 1, fontSize: 12, padding: "4px 8px" }} autoFocus onKeyDown={(e) => { if (e.key === "Enter") void handleEditSave(s.key); if (e.key === "Escape") setEditKey(null); }} />
                      <button onClick={() => void handleEditSave(s.key)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.green, padding: 2 }}><Check size={13} /></button>
                      <button onClick={() => setEditKey(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2 }}><X size={13} /></button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, fontSize: 12, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{JSON.stringify(s.value)}</span>
                      <button onClick={() => { setEditKey(s.key); setEditVal(String(s.value ?? "")); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 2 }}><Edit2 size={11} /></button>
                      <button onClick={() => void handleDelete(s.key)} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.red, padding: 2 }}><Trash2 size={11} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value, valueColor = C.text }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.textMuted, fontSize: 12 }}>{icon}{label}</div>
      <span style={{ fontSize: 12, fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}

function ChangePasswordInline() {
  const changePwd = useChangePassword();
  const toast = useToast();
  const [form, setForm] = useState({ cur: "", next: "", confirm: "" });
  const [show, setShow] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (form.next !== form.confirm) { toast.error("Không khớp", "Mật khẩu xác nhận không đúng"); return; }
    if (form.next.length < 8) { toast.warning("Quá ngắn", "Tối thiểu 8 ký tự"); return; }
    try {
      await changePwd.mutateAsync({ current_password: form.cur, new_password: form.next });
      toast.success("Đã đổi mật khẩu thành công");
      setForm({ cur: "", next: "", confirm: "" });
    } catch { toast.error("Lỗi", "Mật khẩu hiện tại không đúng"); }
  };

  const pwdInp: React.CSSProperties = { width: "100%", padding: "7px 32px 7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" };

  const PwdInput = ({ field, label }: { field: keyof typeof form; label: string }) => (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 3 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input type={show ? "text" : "password"} value={form[field]} onChange={set(field)} style={pwdInp} />
        <button onClick={() => setShow((v) => !v)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}>
          {show ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
      </div>
    </div>
  );

  return (
    <div>
      <PwdInput field="cur" label="Mật khẩu hiện tại" />
      <PwdInput field="next" label="Mật khẩu mới" />
      <PwdInput field="confirm" label="Xác nhận mật khẩu mới" />
      <Button variant="primary" size="sm" onClick={() => void handleSubmit()} disabled={changePwd.isPending} style={{ width: "100%", justifyContent: "center" }}>
        {changePwd.isPending ? "Đang lưu..." : "Đổi mật khẩu"}
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// Main Page
// ═══════════════════════════════════════════════════════

type Tab = "users" | "audit" | "system";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<Tab>("users");

  const { data: users = [] } = useInternalUsers();

  if (!user || user.userType !== "internal") return null;

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Cài đặt hệ thống</h1>
        <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>Quản lý tài khoản, nhật ký và cấu hình hệ thống</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: C.bgCard, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, padding: 4, width: "fit-content" }}>
        <TabBtn active={tab === "users"}  icon={<Users size={14} />}        label="Tài khoản nội bộ" count={users.length} onClick={() => setTab("users")} />
        <TabBtn active={tab === "audit"}  icon={<ClipboardList size={14} />} label="Nhật ký kiểm toán"                    onClick={() => setTab("audit")} />
        <TabBtn active={tab === "system"} icon={<Settings2 size={14} />}    label="Hệ thống & Cài đặt"                   onClick={() => setTab("system")} />
      </div>

      {/* Content */}
      {tab === "users"  && <UsersTab currentId={user.id} />}
      {tab === "audit"  && <AuditTab />}
      {tab === "system" && <SystemTab />}
    </div>
  );
}
