import { useState, useMemo } from "react";
import {
  Users, ClipboardList, Settings2, Plus, Search,
  Shield, RefreshCw, Edit2, Check, X, Eye, EyeOff,
  Activity, Server, Database, Clock, ChevronLeft, ChevronRight,
  Trash2, AlertTriangle, Key,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/stores/notificationStore";
import {
  useInternalUsers, useCreateInternalUser, useUpdateInternalUser,
  useAuditLog, useSettings, useSetSetting, useDeleteSetting, useHealthCheck,
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

// ═══════════════════════════════════════════════════════
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
      </div>

      {/* Settings key-value */}
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
          ) : settings.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", padding: "16px 0" }}>Chưa có cài đặt nào</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {settings.map((s) => (
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
