import { useState, useMemo } from "react";
import {
  Users, Plus, Search, Pencil, Trash2, FileText, Mail,
  Phone, KeyRound, RefreshCw, ChevronDown, ChevronRight,
  Shield, UserCheck, UserX, ClipboardList, Monitor, Check,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill, Modal } from "@/components/ui";
import {
  useEmployeeList, useCreateEmployee, useUpdateEmployee, useDeleteEmployee,
  EMPLOYEE_ROLES,
} from "@/api/employees.api";
import type { Employee, EmployeeRole } from "@/api/employees.api";
import { useAllContracts } from "@/api/contracts.api";
import { useToast } from "@/stores/notificationStore";
import { fmtDate } from "@/lib/format";
import { useCmsList } from "@/api/cms.api";
import { useAuthStore } from "@/stores/authStore";

// ── Role config ───────────────────────────────────────────────
const ROLE_CFG: Record<EmployeeRole, { color: "amber"|"blue"|"green"|"red"; label: string }> = {
  "Admin":    { color: "red",   label: "Admin" },
  "QC":       { color: "amber", label: "QC" },
  "Cấp Kênh": { color: "blue",  label: "Cấp Kênh" },
  "Kế Toán":  { color: "green", label: "Kế Toán" },
};

// ── Employee form ─────────────────────────────────────────────
function EmployeeForm({
  employee, onClose,
}: { employee?: Employee; onClose: () => void }) {
  const toast     = useToast();
  const createMut = useCreateEmployee();
  const updateMut = useUpdateEmployee(employee?.id ?? "");
  const isEdit    = !!employee;
  const currentUser = useAuthStore((s) => s.user);
  // Admin employee không được tạo nhân viên role Admin
  const isCurrentAdmin = currentUser?.userType === "employee" && currentUser.role === "Admin";
  const selectableRoles = isCurrentAdmin
    ? EMPLOYEE_ROLES.filter((r) => r !== "Admin")
    : EMPLOYEE_ROLES;

  const [form, setForm] = useState({
    name:     employee?.name     ?? "",
    email:    employee?.email    ?? "",
    phone:    employee?.phone    ?? "",
    username: employee?.username ?? "",
    password: "",
    role:     employee?.role     ?? "" as EmployeeRole | "",
    status:   employee?.status   ?? "Active",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((v) => ({ ...v, [k]: e.target.value }));

  const validate = () => {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = "Tên bắt buộc";
    if (!form.username.trim()) e.username = "Username bắt buộc";
    if (!isEdit && !form.password) e.password = "Mật khẩu bắt buộc khi tạo mới";
    if (form.password && form.password.length < 6) e.password = "Tối thiểu 6 ký tự";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Email không hợp lệ";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload: Record<string, unknown> = {
      name: form.name, email: form.email || undefined,
      phone: form.phone || undefined, username: form.username,
      role: form.role || null, status: form.status,
    };
    if (form.password) payload.password = form.password;
    try {
      if (isEdit) {
        await updateMut.mutateAsync(payload as Parameters<typeof updateMut.mutateAsync>[0]);
        toast.success("Đã cập nhật", form.name);
      } else {
        await createMut.mutateAsync(payload as Parameters<typeof createMut.mutateAsync>[0]);
        toast.success("Đã tạo nhân viên", form.name);
      }
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Thất bại");
    }
  };

  const isPending = createMut.isPending || updateMut.isPending;

  const inpStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: RADIUS.sm, color: C.text, fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 4 };
  const errStyle: React.CSSProperties  = { fontSize: 11, color: C.red, marginTop: 3 };

  return (
    <Modal open onClose={onClose} title={isEdit ? `Sửa: ${employee.name}` : "Thêm nhân viên mới"} width={520} closeOnOverlay={false}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={isPending}>
            {isPending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo nhân viên"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name + Role */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Họ tên *</label>
            <input value={form.name} onChange={set("name")} placeholder="Nguyễn Văn A" style={{ ...inpStyle, borderColor: errors.name ? C.red : C.border }} />
            {errors.name && <div style={errStyle}>{errors.name}</div>}
          </div>
          <div>
            <label style={labelStyle}>Vai trò</label>
            <select value={form.role} onChange={set("role")} style={inpStyle}>
              <option value="">— Chọn vai trò —</option>
              {selectableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {/* Email + Phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={labelStyle}>Email</label>
            <input value={form.email} onChange={set("email")} type="email" placeholder="email@company.vn"
              style={{ ...inpStyle, borderColor: errors.email ? C.red : C.border }} />
            {errors.email && <div style={errStyle}>{errors.email}</div>}
          </div>
          <div>
            <label style={labelStyle}>Số điện thoại</label>
            <input value={form.phone} onChange={set("phone")} placeholder="0901 234 567" style={inpStyle} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Shield size={12} color={C.blue} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Thông tin đăng nhập</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Username *</label>
              <input value={form.username} onChange={set("username")} placeholder="nguyen.van.a"
                style={{ ...inpStyle, borderColor: errors.username ? C.red : C.border }} />
              {errors.username && <div style={errStyle}>{errors.username}</div>}
            </div>
            <div>
              <label style={labelStyle}>{isEdit ? "Mật khẩu mới (bỏ trống = giữ nguyên)" : "Mật khẩu *"}</label>
              <input value={form.password} onChange={set("password")} type="password"
                placeholder={isEdit ? "••••••" : "Tối thiểu 6 ký tự"}
                style={{ ...inpStyle, borderColor: errors.password ? C.red : C.border }} />
              {errors.password && <div style={errStyle}>{errors.password}</div>}
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <label style={labelStyle}>Trạng thái</label>
          <select value={form.status} onChange={set("status")} style={inpStyle}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

      </div>
    </Modal>
  );
}

// ── CMS Assign Modal ──────────────────────────────────────────
function CmsAssignModal({
  employee, onClose,
}: { employee: Employee; onClose: () => void }) {
  const toast = useToast();
  const updateMut = useUpdateEmployee(employee.id);
  const { data: cmsData } = useCmsList({ limit: 200 });
  const cmsList = cmsData?.items ?? [];
  const [selected, setSelected] = useState<string[]>(employee.cms_ids ?? []);

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({ cms_ids: selected });
      toast.success("Đã lưu CMS", selected.length === 0 ? "Nhân viên thấy tất cả CMS" : `${selected.length} CMS được gán`);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      closeOnOverlay={false}
      title={`Gán CMS — ${employee.name}`}
      width={400}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" loading={updateMut.isPending} onClick={() => void handleSave()}>
            Lưu
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>
          Để trống = nhân viên thấy tất cả CMS. Tick chọn để giới hạn.
        </div>

        {/* Select all / Clear */}
        <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
          <button
            onClick={() => setSelected(cmsList.map((c) => c.id))}
            style={{ fontSize: 11, color: C.blue, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Chọn tất cả
          </button>
          <span style={{ color: C.textMuted, fontSize: 11 }}>·</span>
          <button
            onClick={() => setSelected([])}
            style={{ fontSize: 11, color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Bỏ chọn
          </button>
          <span style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>
            {selected.length === 0 ? "Tất cả" : `${selected.length}/${cmsList.length}`}
          </span>
        </div>

        {/* Checklist */}
        <div style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, overflow: "hidden" }}>
          {cmsList.length === 0 ? (
            <div style={{ padding: "16px", textAlign: "center", color: C.textMuted, fontSize: 12 }}>Đang tải...</div>
          ) : cmsList.map((cms, i) => {
            const isChecked = selected.includes(cms.id);
            return (
              <div
                key={cms.id}
                onClick={() => toggle(cms.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  borderTop: i > 0 ? `1px solid ${C.border}` : "none",
                  background: isChecked ? `${C.blue}0d` : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!isChecked) (e.currentTarget as HTMLDivElement).style.background = C.bgHover; }}
                onMouseLeave={(e) => { if (!isChecked) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                {/* Checkbox */}
                <div style={{
                  width: 16, height: 16, borderRadius: 3, flexShrink: 0,
                  border: `1.5px solid ${isChecked ? C.blue : C.border}`,
                  background: isChecked ? C.blue : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.1s",
                }}>
                  {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                </div>
                <span style={{ fontSize: 13, color: isChecked ? C.text : C.textSub, fontWeight: isChecked ? 600 : 400 }}>
                  {cms.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}

// ── Employee detail drawer ────────────────────────────────────
function EmployeeDetail({
  emp, onEdit, onClose,
}: { emp: Employee; onEdit: () => void; onClose: () => void }) {
  const { data } = useAllContracts({ employee_id: emp.id, limit: 50 });
  const contracts = data?.items ?? [];
  const roleCfg = emp.role ? ROLE_CFG[emp.role] : null;

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 380, zIndex: 900,
      background: C.bgCard, borderLeft: `1px solid ${C.border}`,
      boxShadow: "-4px 0 24px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: `${C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{emp.name.charAt(0).toUpperCase()}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{emp.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            {roleCfg && <Pill color={roleCfg.color}>{roleCfg.label}</Pill>}
            <Pill color={emp.status === "Active" ? "green" : "gray"} dot>{emp.status}</Pill>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onEdit} style={{ background: `${C.blue}20`, border: "none", cursor: "pointer", color: C.blue, padding: "6px 8px", borderRadius: RADIUS.sm, display: "flex" }}><Pencil size={13} /></button>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: "6px 8px", borderRadius: RADIUS.sm, display: "flex" }}>✕</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Info rows */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 10 }}>Thông tin</div>
          {[
            { icon: <Mail size={12} />, label: "Email", value: emp.email },
            { icon: <Phone size={12} />, label: "Điện thoại", value: emp.phone },
            { icon: <KeyRound size={12} />, label: "Username", value: emp.username ? <code style={{ fontSize: 12, background: C.bg, padding: "2px 6px", borderRadius: 4, border: `1px solid ${C.border}`, color: C.blue }}>{emp.username}</code> : null },
            { icon: <Users size={12} />, label: "Mã NV", value: <code style={{ fontSize: 11, color: C.textMuted }}>{emp.id}</code> },
            { icon: <ClipboardList size={12} />, label: "Ngày tạo", value: fmtDate(emp.created_at) },
          ].map(({ icon, label, value }) => value ? (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ color: C.textMuted, width: 16 }}>{icon}</span>
              <span style={{ fontSize: 12, color: C.textMuted, minWidth: 80 }}>{label}</span>
              <span style={{ fontSize: 12, color: C.textSub }}>{value}</span>
            </div>
          ) : null)}
        </div>

        {/* KPI */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
          <div style={{ background: C.bg, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Hợp đồng phụ trách</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.blue }}>{emp.contract_count ?? contracts.length}</div>
          </div>
          <div style={{ background: C.bg, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Trạng thái</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: emp.status === "Active" ? C.green : C.textMuted }}>{emp.status}</div>
          </div>
        </div>

        {/* Contracts list */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={11} /> Hợp đồng đang phụ trách ({contracts.length})
          </div>
          {contracts.length === 0 ? (
            <div style={{ color: C.textMuted, fontSize: 12, textAlign: "center", padding: "16px 0" }}>Chưa có hợp đồng</div>
          ) : (
            contracts.map((c) => (
              <div key={c.id} style={{ padding: "9px 10px", background: C.bg, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{c.title}</div>
                <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: C.textMuted }}>{c.partner_name ?? "—"}</span>
                  {c.contract_number && <span style={{ fontSize: 10, color: C.blue }}>{c.contract_number}</span>}
                  <span style={{ fontSize: 10, color: C.textMuted }}>{fmtDate(c.upload_date)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function EmployeesPage() {
  const toast = useToast();
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState("");
  const [statusFilter, setStatus] = useState("Active");
  const [showCreate, setCreate]       = useState(false);
  const [editing, setEditing]         = useState<Employee | null>(null);
  const [detail,  setDetail]          = useState<Employee | null>(null);
  const [cmsAssigning, setCmsAssign]  = useState<Employee | null>(null);
  const deleteMut = useDeleteEmployee();

  const { data, isLoading, refetch } = useEmployeeList({ search: search || undefined, status: statusFilter || undefined, limit: 200 });
  const all = data?.items ?? [];
  const employees = useMemo(() => !roleFilter ? all : all.filter((e) => e.role === roleFilter), [all, roleFilter]);

  // KPI counts (from all, regardless of current filter)
  const { data: allData } = useEmployeeList({ limit: 500 });
  const allEmps = allData?.items ?? [];
  const kpi = useMemo(() => ({
    total:  allEmps.length,
    active: allEmps.filter((e) => e.status === "Active").length,
    qc:     allEmps.filter((e) => e.role === "QC").length,
    channel:allEmps.filter((e) => e.role === "Cấp Kênh").length,
    finance:allEmps.filter((e) => e.role === "Kế Toán").length,
    contracts: allEmps.reduce((s, e) => s + (e.contract_count ?? 0), 0),
  }), [allEmps]);

  const handleDelete = async (emp: Employee) => {
    if (!confirm(`Xóa nhân viên "${emp.name}"?`)) return;
    try {
      await deleteMut.mutateAsync(emp.id);
      toast.success("Đã xóa", emp.name);
      if (detail?.id === emp.id) setDetail(null);
    } catch (err) { toast.error("Lỗi", err instanceof Error ? err.message : ""); }
  };

  return (
    <div style={{ padding: "24px 28px", paddingRight: detail ? 400 : 28, transition: "padding-right .2s" }}>
      {(showCreate || editing) && (
        <EmployeeForm employee={editing ?? undefined} onClose={() => { setCreate(false); setEditing(null); }} />
      )}
      {cmsAssigning && (
        <CmsAssignModal employee={cmsAssigning} onClose={() => setCmsAssign(null)} />
      )}
      {detail && (
        <EmployeeDetail emp={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Users size={20} color={C.blue} /> Nhân viên
          </h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>Quản lý nhân sự nội bộ và phân công phụ trách</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void refetch()}>Làm mới</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreate(true)}>Thêm nhân viên</Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Tổng NV",        value: kpi.total,     color: C.text,   bg: C.bgCard },
          { label: "Đang hoạt động", value: kpi.active,    color: C.green,  bg: C.bgCard },
          { label: "QC",             value: kpi.qc,        color: C.amber,  bg: C.bgCard },
          { label: "Cấp Kênh",       value: kpi.channel,   color: C.blue,   bg: C.bgCard },
          { label: "Kế Toán",        value: kpi.finance,   color: C.teal,   bg: C.bgCard },
          { label: "HĐ phụ trách",   value: kpi.contracts, color: C.purple, bg: C.bgCard },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "12px 14px", boxShadow: SHADOW.sm }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 220px", maxWidth: 320 }}>
          <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, email, username..."
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        {[
          { label: "Vai trò", value: roleFilter, set: setRole, options: [{ v: "", l: "Tất cả vai trò" }, ...EMPLOYEE_ROLES.map((r) => ({ v: r, l: r }))] },
          { label: "Trạng thái", value: statusFilter, set: setStatus, options: [{ v: "", l: "Tất cả" }, { v: "Active", l: "Active" }, { v: "Inactive", l: "Inactive" }] },
        ].map(({ label, value, set, options }) => (
          <select key={label} value={value} onChange={(e) => set(e.target.value)}
            style={{ height: 36, padding: "0 10px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, cursor: "pointer" }}>
            {options.map(({ v, l }) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>{employees.length} nhân viên</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : employees.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <Users size={36} color={C.textMuted} style={{ marginBottom: 10 }} />
          <div style={{ color: C.textSub, fontSize: 14, marginBottom: 6 }}>
            {search ? "Không tìm thấy nhân viên phù hợp" : "Chưa có nhân viên nào"}
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setCreate(true)}>Thêm nhân viên</Button>
        </div>
      ) : (
        <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                {["Nhân viên", "Liên hệ", "Tài khoản", "Vai trò", "CMS", "HĐ phụ trách", "Trạng thái", "Ngày tạo", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: C.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const roleCfg = emp.role ? ROLE_CFG[emp.role] : null;
                const isSelected = detail?.id === emp.id;
                return (
                  <tr key={emp.id}
                    onClick={() => setDetail(isSelected ? null : emp)}
                    style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", background: isSelected ? `${C.blue}0d` : "transparent", transition: "background .12s" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = C.bgHover; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                  >
                    {/* Name */}
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700, color: C.blue }}>
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{emp.name}</div>
                          <div style={{ fontSize: 10, color: C.textMuted }}>{emp.id}</div>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {emp.email && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSub }}><Mail size={10} />{emp.email}</div>}
                        {emp.phone && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSub }}><Phone size={10} />{emp.phone}</div>}
                        {!emp.email && !emp.phone && <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>}
                      </div>
                    </td>

                    {/* Username */}
                    <td style={{ padding: "11px 16px" }}>
                      {emp.username
                        ? <div style={{ display: "flex", alignItems: "center", gap: 5 }}><KeyRound size={10} color={C.textMuted} /><code style={{ fontSize: 12, color: C.blue }}>{emp.username}</code></div>
                        : <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>}
                    </td>

                    {/* Role */}
                    <td style={{ padding: "11px 16px" }}>
                      {roleCfg
                        ? <Pill color={roleCfg.color}>{roleCfg.label}</Pill>
                        : <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>}
                    </td>

                    {/* CMS */}
                    <td style={{ padding: "11px 16px" }}>
                      {(emp.cms_ids ?? []).length === 0 ? (
                        <span style={{ fontSize: 11, color: C.textMuted }}>Tất cả</span>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, maxWidth: 160 }}>
                          {(emp.cms_ids ?? []).slice(0, 3).map((cid) => (
                            <span key={cid} style={{ fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 3, background: `${C.blue}20`, color: C.blue }}>{cid}</span>
                          ))}
                          {(emp.cms_ids ?? []).length > 3 && (
                            <span style={{ fontSize: 10, color: C.textMuted }}>+{(emp.cms_ids ?? []).length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Contracts */}
                    <td style={{ padding: "11px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, color: (emp.contract_count ?? 0) > 0 ? C.blue : C.textMuted, fontWeight: 600, fontSize: 13 }}>
                        <FileText size={11} />{emp.contract_count ?? 0}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "11px 16px" }}>
                      <Pill color={emp.status === "Active" ? "green" : "gray"} dot>{emp.status}</Pill>
                    </td>

                    {/* Date */}
                    <td style={{ padding: "11px 16px", color: C.textMuted, fontSize: 12 }}>
                      {fmtDate(emp.created_at)}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "11px 16px" }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button title="Sửa thông tin" onClick={() => setEditing(emp)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: "4px 6px", borderRadius: RADIUS.sm, transition: "color .12s", display: "flex" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.blue)}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textMuted)}>
                          <Pencil size={13} />
                        </button>
                        <button
                          title={`Gán CMS${(emp.cms_ids ?? []).length > 0 ? ` (${emp.cms_ids.length})` : " (tất cả)"}`}
                          onClick={() => setCmsAssign(emp)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px", borderRadius: RADIUS.sm, transition: "color .12s", display: "flex", alignItems: "center", gap: 3,
                            color: (emp.cms_ids ?? []).length > 0 ? C.blue : C.textMuted }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.cyan)}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = (emp.cms_ids ?? []).length > 0 ? C.blue : C.textMuted)}
                        >
                          <Monitor size={13} />
                          {(emp.cms_ids ?? []).length > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700 }}>{emp.cms_ids.length}</span>
                          )}
                        </button>
                        <button title="Xóa" onClick={() => void handleDelete(emp)}
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: "4px 6px", borderRadius: RADIUS.sm, transition: "color .12s", display: "flex" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.red)}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textMuted)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
