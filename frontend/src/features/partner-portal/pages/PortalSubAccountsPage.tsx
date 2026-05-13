import { useMemo, useState } from "react";
import {
  UserPlus, Users, Mail, Phone, Lock, Save, X,
  KeyRound, ShieldOff, ShieldCheck, RefreshCw, Trash2, Building2,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill, Modal, Input, Field, EmptyState } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/stores/notificationStore";
import {
  usePartnerSubAccounts,
  useCreatePartnerSubAccount,
  useSetPartnerSubAccountStatus,
  useResetPartnerSubAccountPassword,
  useDeletePartnerSubAccount,
  type PartnerSubAccountRow,
} from "@/api/partners.api";

const fmtDateTime = (s: string | null) =>
  s ? new Date(s).toLocaleString("vi-VN") : "—";

function StatCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: SHADOW.sm, flex: 1,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: RADIUS.sm,
        background: `${color}20`, color, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 18, color: C.text, fontWeight: 700, marginTop: 2 }}>{value}</div>
      </div>
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────
function CreateSubAccountModal({
  open, onClose, availableChildren,
}: {
  open: boolean;
  onClose: () => void;
  availableChildren: { id: string; name: string }[];
}) {
  const create = useCreatePartnerSubAccount();
  const toast = useToast();
  const [form, setForm] = useState({
    child_partner_id: "", email: "", full_name: "", phone: "", password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => { setForm({ child_partner_id: "", email: "", full_name: "", phone: "", password: "" }); setErrors({}); };

  const handleSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!form.child_partner_id) errs.child_partner_id = "Vui lòng chọn đối tác con";
    if (!form.email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) errs.email = "Email không hợp lệ";
    if (!form.full_name.trim()) errs.full_name = "Vui lòng nhập họ và tên";
    if (form.password.length < 8) errs.password = "Mật khẩu tối thiểu 8 ký tự";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      await create.mutateAsync({
        child_partner_id: form.child_partner_id,
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      toast.success("Đã tạo tài khoản", `Cho đối tác con: ${availableChildren.find((c) => c.id === form.child_partner_id)?.name ?? ""}`);
      reset();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Tạo tài khoản thất bại";
      toast.error("Lỗi", msg);
    }
  };

  const inputCss: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
    color: C.text, fontSize: 13, outline: "none",
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Tạo tài khoản con mới"
      width={520}
      closeOnOverlay={false}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<X size={14} />} onClick={() => { reset(); onClose(); }}>
            Huỷ
          </Button>
          <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => void handleSubmit()} disabled={create.isPending}>
            {create.isPending ? "Đang tạo..." : "Tạo tài khoản"}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Đối tác con" required error={errors.child_partner_id}>
          {availableChildren.length === 0 ? (
            <div style={{
              padding: "10px 12px", background: `${C.amber}15`, color: C.amber,
              border: `1px solid ${C.amber}40`, borderRadius: RADIUS.sm, fontSize: 12,
            }}>
              Tất cả đối tác con đã có tài khoản hoặc bạn chưa có đối tác con nào.
            </div>
          ) : (
            <select
              value={form.child_partner_id}
              onChange={(e) => setForm((f) => ({ ...f, child_partner_id: e.target.value }))}
              style={inputCss}
            >
              <option value="">— Chọn đối tác con —</option>
              {availableChildren.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Họ và tên" required error={errors.full_name}>
          <Input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Nguyễn Văn A"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email đăng nhập" required error={errors.email}>
            <Input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              icon={<Mail size={13} />}
            />
          </Field>
          <Field label="Số điện thoại">
            <Input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="0901..."
              icon={<Phone size={13} />}
            />
          </Field>
        </div>

        <Field label="Mật khẩu (≥ 8 ký tự)" required error={errors.password} hint="Tài khoản con sẽ dùng mật khẩu này để đăng nhập lần đầu.">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="********"
            icon={<Lock size={13} />}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ── Reset password modal ──────────────────────────────────────
function ResetPasswordModal({
  open, onClose, account,
}: {
  open: boolean;
  onClose: () => void;
  account: PartnerSubAccountRow | null;
}) {
  const reset = useResetPartnerSubAccountPassword();
  const toast = useToast();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");

  const close = () => { setPwd(""); setConfirm(""); onClose(); };

  const handleSubmit = async () => {
    if (!account?.account_id) return;
    if (pwd.length < 8) { toast.warning("Mật khẩu quá ngắn", "Tối thiểu 8 ký tự"); return; }
    if (pwd !== confirm) { toast.error("Không khớp", "Mật khẩu xác nhận không khớp"); return; }
    try {
      await reset.mutateAsync({ userId: account.account_id, new_password: pwd });
      toast.success("Đã đặt lại mật khẩu", `Cho ${account.account_email}`);
      close();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Đặt lại mật khẩu thất bại";
      toast.error("Lỗi", msg);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Đặt lại mật khẩu"
      width={420}
      closeOnOverlay={false}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={close}>Huỷ</Button>
          <Button variant="primary" size="sm" icon={<KeyRound size={14} />} onClick={() => void handleSubmit()} disabled={reset.isPending}>
            {reset.isPending ? "Đang đặt..." : "Đặt lại"}
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 12, color: C.textSub }}>
          Tài khoản: <span style={{ color: C.text, fontWeight: 600 }}>{account?.account_email}</span>
          <br />
          Đối tác con: <span style={{ color: C.text }}>{account?.partner_name}</span>
        </div>
        <Field label="Mật khẩu mới" required>
          <Input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            icon={<Lock size={13} />}
            autoFocus
          />
        </Field>
        <Field label="Xác nhận mật khẩu" required>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            icon={<Lock size={13} />}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function PortalSubAccountsPage() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const { data, isLoading, refetch } = usePartnerSubAccounts();
  const setStatus = useSetPartnerSubAccountStatus();
  const del = useDeletePartnerSubAccount();

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<PartnerSubAccountRow | null>(null);

  const rows = data ?? [];
  const totalChildren = rows.length;
  const withAccount = rows.filter((r) => r.account_id).length;
  const withoutAccount = totalChildren - withAccount;

  const availableChildren = useMemo(
    () => rows.filter((r) => !r.account_id).map((r) => ({ id: r.partner_id, name: r.partner_name })),
    [rows]
  );

  if (!user || user.userType !== "partner") {
    return (
      <div style={{ padding: 28 }}>
        <EmptyState icon={<Users size={32} />} title="Không có quyền" description="Trang này chỉ dành cho tài khoản đối tác." />
      </div>
    );
  }

  const handleToggleStatus = async (row: PartnerSubAccountRow) => {
    if (!row.account_id) return;
    const next = row.account_status === "Active" ? "Suspended" : "Active";
    try {
      await setStatus.mutateAsync({ userId: row.account_id, status: next });
      toast.success(next === "Active" ? "Đã kích hoạt" : "Đã tạm khoá", row.account_email ?? "");
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Không thể cập nhật");
    }
  };

  const handleDelete = async (row: PartnerSubAccountRow) => {
    if (!row.account_id) return;
    if (!window.confirm(`Xoá tài khoản "${row.account_email}" của đối tác con "${row.partner_name}"?`)) return;
    try {
      await del.mutateAsync(row.account_id);
      toast.success("Đã xoá tài khoản", row.account_email ?? "");
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Không thể xoá");
    }
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280 }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>Tài khoản con</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>
            Mỗi đối tác con tương ứng với 1 tài khoản đăng nhập riêng.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>Làm mới</Button>
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus size={14} />}
            onClick={() => setCreateOpen(true)}
            disabled={availableChildren.length === 0}
          >
            Tạo tài khoản con
          </Button>
        </div>
      </div>

      {/* ── KPI tiles ───────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <StatCard label="Đối tác con"        value={totalChildren}  icon={<Building2 size={18} />} color={C.blue} />
        <StatCard label="Đã có tài khoản"   value={withAccount}    icon={<ShieldCheck size={18} />} color={C.green} />
        <StatCard label="Chưa có tài khoản" value={withoutAccount} icon={<ShieldOff size={18} />} color={C.amber} />
      </div>

      {/* ── Table ──────────────────────────────────── */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
        boxShadow: SHADOW.sm, overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                <Th>Đối tác con</Th>
                <Th>Tài khoản</Th>
                <Th>Họ tên</Th>
                <Th>SĐT</Th>
                <Th>Trạng thái</Th>
                <Th>Đăng nhập gần nhất</Th>
                <Th>Tạo lúc</Th>
                <Th style={{ textAlign: "right" }}>Thao tác</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><Td colSpan={8} style={{ padding: 24, textAlign: "center", color: C.textMuted }}>Đang tải...</Td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <Td colSpan={8} style={{ padding: 0 }}>
                    <EmptyState
                      icon={<Users size={28} />}
                      title="Chưa có đối tác con nào"
                      description="Khi bạn được gắn các đối tác con, danh sách này sẽ hiện ra để bạn tạo tài khoản đăng nhập cho từng đối tác con."
                    />
                  </Td>
                </tr>
              )}
              {!isLoading && rows.map((r) => {
                const has = !!r.account_id;
                const statusColor: Record<string, "green" | "amber" | "red" | "gray"> = {
                  Active: "green", PendingApproval: "amber", Suspended: "red", Rejected: "red",
                };
                return (
                  <tr key={r.partner_id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <Td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: `${C.blue}25`, color: C.blue,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700, flexShrink: 0,
                        }}>
                          {r.partner_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.partner_name}</div>
                          <div style={{ fontSize: 10.5, color: C.textMuted, fontFamily: "monospace" }}>{r.partner_id}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {has ? (
                        <span style={{ fontSize: 12.5, color: C.text }}>{r.account_email}</span>
                      ) : (
                        <Pill color="amber">Chưa có</Pill>
                      )}
                    </Td>
                    <Td><span style={{ fontSize: 12.5, color: has ? C.text : C.textMuted }}>{r.account_full_name ?? "—"}</span></Td>
                    <Td><span style={{ fontSize: 12.5, color: C.textSub }}>{r.account_phone ?? "—"}</span></Td>
                    <Td>
                      {has ? (
                        <Pill color={statusColor[r.account_status ?? ""] ?? "gray"} dot>{r.account_status}</Pill>
                      ) : "—"}
                    </Td>
                    <Td><span style={{ fontSize: 12, color: C.textSub }}>{fmtDateTime(r.account_last_login)}</span></Td>
                    <Td><span style={{ fontSize: 12, color: C.textSub }}>{fmtDateTime(r.account_created_at)}</span></Td>
                    <Td style={{ textAlign: "right" }}>
                      {has ? (
                        <div style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end" }}>
                          <IconBtn
                            title={r.account_status === "Active" ? "Tạm khoá" : "Kích hoạt"}
                            onClick={() => void handleToggleStatus(r)}
                            color={r.account_status === "Active" ? C.amber : C.green}
                          >
                            {r.account_status === "Active" ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                          </IconBtn>
                          <IconBtn title="Đặt lại mật khẩu" onClick={() => setResetTarget(r)} color={C.blue}>
                            <KeyRound size={14} />
                          </IconBtn>
                          <IconBtn title="Xoá tài khoản" onClick={() => void handleDelete(r)} color={C.red}>
                            <Trash2 size={14} />
                          </IconBtn>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<UserPlus size={13} />}
                          onClick={() => setCreateOpen(true)}
                        >
                          Tạo
                        </Button>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <CreateSubAccountModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        availableChildren={availableChildren}
      />
      <ResetPasswordModal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        account={resetTarget}
      />
    </div>
  );
}

// ── Tiny presentational helpers ───────────────────────────────
function Th({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <th style={{
      textAlign: "left", padding: "10px 14px",
      fontSize: 11, fontWeight: 700, color: C.textMuted,
      textTransform: "uppercase", letterSpacing: 0.4, ...style,
    }}>{children}</th>
  );
}

function Td({ children, style, colSpan }: { children: React.ReactNode; style?: React.CSSProperties; colSpan?: number }) {
  return (
    <td colSpan={colSpan} style={{ padding: "10px 14px", verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );
}

function IconBtn({ children, title, onClick, color }: { children: React.ReactNode; title: string; onClick: () => void; color: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 28, height: 28, display: "inline-flex",
        alignItems: "center", justifyContent: "center",
        background: "transparent", border: `1px solid ${C.border}`,
        borderRadius: RADIUS.sm, cursor: "pointer", color,
        transition: "background .15s, border-color .15s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = `${color}15`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}55`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
      }}
    >
      {children}
    </button>
  );
}
