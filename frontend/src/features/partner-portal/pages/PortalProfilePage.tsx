import { useState } from "react";
import {
  User, Mail, Phone, Building2, Globe, Shield,
  Lock, Edit2, Check, X, Calendar,
  Clock, Star, TrendingUp, Eye, EyeOff, RefreshCw,
  ArrowRight, CheckCircle2, KeyRound, Save,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill, Modal } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { usePartnerProfile } from "@/api/partners.api";
import { useUpdateMe, useChangePassword, useVerifyPassword } from "@/api/auth.api";
import { useToast } from "@/stores/notificationStore";
import type { PartnerUser } from "@/types/partner";

// ── Section card wrapper ──────────────────────────────────────
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
      overflow: "hidden", boxShadow: SHADOW.sm, marginBottom: 16,
    }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: C.blue }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
      </div>
      <div style={{ padding: "18px 20px" }}>{children}</div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────
function InfoRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.textMuted, minWidth: 140, flexShrink: 0, paddingTop: 1 }}>{label}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: C.text }}>{value ?? <span style={{ color: C.textMuted }}>—</span>}</div>
        {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Editable field ────────────────────────────────────────────
function EditableField({
  label, value, placeholder, onSave, type = "text",
}: { label: string; value: string; placeholder?: string; onSave: (v: string) => Promise<void>; type?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(draft); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: C.textMuted, minWidth: 140, flexShrink: 0, paddingTop: 8 }}>{label}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
        {editing ? (
          <>
            <input
              type={type}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={placeholder}
              autoFocus
              style={{
                flex: 1, padding: "7px 10px", background: C.bgInput,
                border: `1px solid ${C.blue}`, borderRadius: RADIUS.sm,
                color: C.text, fontSize: 13, outline: "none",
              }}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSave(); if (e.key === "Escape") setEditing(false); }}
            />
            <button onClick={() => void handleSave()} disabled={saving} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.green, padding: 4 }}>
              <Check size={15} />
            </button>
            <button onClick={() => { setEditing(false); setDraft(value); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4 }}>
              <X size={15} />
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 13, color: value ? C.text : C.textMuted, flex: 1 }}>{value || placeholder || "—"}</span>
            <button onClick={() => { setDraft(value); setEditing(true); }} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, borderRadius: 4, transition: "color .12s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.blue)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = C.textMuted)}
            >
              <Edit2 size={13} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Shared password input ─────────────────────────────────────
function PwdInput({ value, onChange, show, onToggle, placeholder, onEnter, autoFocus, style: extraStyle }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
  placeholder?: string; onEnter?: () => void; autoFocus?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <Lock size={13} color={C.textMuted} style={{ position: "absolute", left: 10, zIndex: 1, pointerEvents: "none" }} />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        style={{
          flex: 1, padding: "9px 36px",
          background: C.bgInput, border: `1px solid ${C.border}`,
          borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none",
          transition: "border-color .15s", width: "100%", boxSizing: "border-box",
          ...extraStyle,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = C.blue)}
        onBlur={(e) => (e.currentTarget.style.borderColor = (extraStyle as { borderColor?: string })?.borderColor ?? C.border)}
        onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
      />
      <button onClick={onToggle} style={{ position: "absolute", right: 10, background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 0, display: "flex" }}>
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

// ── Change password modal ─────────────────────────────────────
function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const verifyPwd  = useVerifyPassword();
  const changePwd  = useChangePassword();
  const toast      = useToast();

  const [step, setStep]       = useState<1 | 2 | "done">(1);
  const [current, setCurrent] = useState("");
  const [next,    setNext]    = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurr, setShowCurr] = useState(false);
  const [showNext, setShowNext] = useState(false);

  const inputBorderStyle = (err: boolean): React.CSSProperties =>
    err ? { borderColor: C.red } : {};

  const handleClose = () => { setStep(1); setCurrent(""); setNext(""); setConfirm(""); onClose(); };

  const handleVerify = async () => {
    if (!current) { toast.warning("Thiếu thông tin", "Vui lòng nhập mật khẩu hiện tại"); return; }
    try {
      await verifyPwd.mutateAsync(current);
      setStep(2);
    } catch {
      toast.error("Sai mật khẩu", "Mật khẩu hiện tại không đúng");
    }
  };

  const handleChange = async () => {
    if (!next || !confirm) { toast.warning("Thiếu thông tin", "Vui lòng điền đầy đủ"); return; }
    if (next.length < 8) { toast.warning("Mật khẩu quá ngắn", "Tối thiểu 8 ký tự"); return; }
    if (next !== confirm) { toast.error("Không khớp", "Mật khẩu xác nhận không khớp"); return; }
    try {
      await changePwd.mutateAsync({ current_password: current, new_password: next });
      setStep("done");
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Thất bại");
    }
  };


  // Step indicator
  const steps = ["Xác thực", "Mật khẩu mới"];
  const StepBar = () => (
    <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
      {steps.map((label, i) => {
        const num = i + 1;
        const done = step === "done" || (typeof step === "number" && step > num);
        const active = typeof step === "number" && step === num;
        const color = done ? C.green : active ? C.blue : C.textMuted;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 64 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: done ? `${C.green}20` : active ? `${C.blue}20` : C.bg, border: `2px solid ${color}`, transition: "all .2s" }}>
                {done ? <Check size={13} color={C.green} /> : <span style={{ fontSize: 12, fontWeight: 700, color }}>{num}</span>}
              </div>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, color }}>{label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: done ? C.green : C.border, margin: "0 4px", marginBottom: 18, transition: "background .3s" }} />}
          </div>
        );
      })}
    </div>
  );

  const footer = step === "done" ? (
    <div style={{ display: "flex", justifyContent: "flex-end" }}>
      <Button variant="ghost" size="sm" onClick={handleClose}>Đóng</Button>
    </div>
  ) : step === 1 ? (
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
      <Button variant="ghost" size="sm" onClick={handleClose}>Huỷ</Button>
      <Button variant="primary" size="sm" icon={<ArrowRight size={14} />} onClick={() => void handleVerify()} disabled={verifyPwd.isPending}>
        {verifyPwd.isPending ? "Đang xác thực..." : "Tiếp tục"}
      </Button>
    </div>
  ) : (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <button onClick={() => { setStep(1); setNext(""); setConfirm(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.textMuted, padding: 0 }}>← Quay lại</button>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="ghost" size="sm" onClick={handleClose}>Huỷ</Button>
        <Button variant="primary" size="sm" icon={<Save size={14} />} onClick={() => void handleChange()} disabled={changePwd.isPending}>
          {changePwd.isPending ? "Đang lưu..." : "Đổi mật khẩu"}
        </Button>
      </div>
    </div>
  );

  return (
    <Modal open={open} onClose={handleClose} title="Đổi mật khẩu" width={400} closeOnOverlay={false} footer={footer}>
      {step === "done" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "16px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${C.green}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={26} color={C.green} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Đổi mật khẩu thành công</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>Mật khẩu mới của bạn đã được cập nhật.</div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <StepBar />
          {step === 1 && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 6 }}>Mật khẩu hiện tại</label>
              <PwdInput value={current} onChange={setCurrent} show={showCurr} onToggle={() => setShowCurr(v => !v)}
                placeholder="Nhập mật khẩu hiện tại" autoFocus onEnter={() => void handleVerify()} />
            </div>
          )}
          {step === 2 && (
            <>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 6 }}>
                  Mật khẩu mới <span style={{ fontWeight: 400 }}>(tối thiểu 8 ký tự)</span>
                </label>
                <PwdInput value={next} onChange={setNext} show={showNext} onToggle={() => setShowNext(v => !v)}
                  placeholder="Nhập mật khẩu mới" autoFocus />
                {next.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                    {[1,2,3,4].map((n) => (
                      <div key={n} style={{ flex: 1, height: 3, borderRadius: 2, transition: "background .2s",
                        background: next.length >= n*3 ? (n<=1?C.red:n<=2?C.amber:n<=3?C.blue:C.green) : C.border }} />
                    ))}
                    <span style={{ fontSize: 10, color: C.textMuted, marginLeft: 4 }}>
                      {next.length < 4 ? "Yếu" : next.length < 8 ? "Trung bình" : next.length < 12 ? "Mạnh" : "Rất mạnh"}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, display: "block", marginBottom: 6 }}>Xác nhận mật khẩu mới</label>
                <PwdInput
                  value={confirm} onChange={setConfirm}
                  show={showNext} onToggle={() => setShowNext(v => !v)}
                  placeholder="Nhập lại mật khẩu mới"
                  onEnter={() => void handleChange()}
                  style={inputBorderStyle(!!confirm && confirm !== next)}
                />
                {confirm && confirm !== next && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>Mật khẩu xác nhận không khớp</div>}
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalProfilePage() {
  const user      = useAuthStore((s) => s.user);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";
  const toast     = useToast();
  const updateMe  = useUpdateMe();
  const [pwdOpen, setPwdOpen] = useState(false);

  const { data: profile, refetch: refetchProfile } = usePartnerProfile(partnerId);

  // Partner user fields
  const pu = user?.userType === "partner" ? (user as { userType: "partner"; partner_id: string | null } & PartnerUser) : null;

  const handleSaveName = async (v: string) => {
    if (!v.trim()) return;
    try {
      await updateMe.mutateAsync({ full_name: v });
      toast.success("Đã lưu", "Cập nhật tên thành công");
    } catch {
      toast.error("Lỗi", "Không thể cập nhật tên");
    }
  };

  const handleSavePhone = async (v: string) => {
    try {
      await updateMe.mutateAsync({ phone: v });
      toast.success("Đã lưu", "Cập nhật số điện thoại thành công");
    } catch {
      toast.error("Lỗi", "Không thể cập nhật số điện thoại");
    }
  };

  if (!user) return null;

  const statusColor: Record<string, "green"|"amber"|"red"|"gray"> = {
    Active: "green", PendingApproval: "amber", Suspended: "red", Rejected: "red",
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 820 }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: `${C.blue}30`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 22, fontWeight: 700, color: C.blue, flexShrink: 0,
          }}>
            {(pu?.full_name ?? (user as unknown as { email?: string }).email ?? "?").charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>
              {pu?.full_name ?? (user as unknown as { email?: string }).email}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <Pill color={statusColor[pu?.status ?? ""] ?? "gray"} dot>{pu?.status ?? "—"}</Pill>
              {profile?.name && <span style={{ fontSize: 12, color: C.textSub }}>· {profile.name}</span>}
              {profile?.type && <span style={{ fontSize: 12, color: C.textMuted }}>· {profile.type}</span>}
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetchProfile()}>Làm mới</Button>
      </div>

      {/* ── Personal info ────────────────────────────── */}
      <Section title="Thông tin cá nhân" icon={<User size={15} />}>
        <EditableField label="Họ và tên" value={pu?.full_name ?? ""} placeholder="Nhập họ và tên" onSave={handleSaveName} />
        <InfoRow label="Email" value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} color={C.textMuted} />{pu?.email ?? (user as unknown as { email?: string }).email}</span>} sub="Không thể thay đổi email" />
        <EditableField label="Số điện thoại" value={pu?.phone ?? ""} placeholder="Nhập số điện thoại" onSave={handleSavePhone} />
        <InfoRow
          label="Mật khẩu"
          value={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 13, letterSpacing: 3, color: C.textMuted }}>••••••••</span>
              <Button variant="ghost" size="sm" icon={<KeyRound size={13} />} onClick={() => setPwdOpen(true)}>
                Đổi mật khẩu
              </Button>
            </div>
          }
        />
        <InfoRow
          label="Ngày tham gia"
          value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Calendar size={12} color={C.textMuted} />{new Date(pu?.created_at ?? "").toLocaleDateString("vi-VN")}</span>}
        />
        {pu?.last_login && (
          <InfoRow
            label="Đăng nhập gần nhất"
            value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Clock size={12} color={C.textMuted} />{new Date(pu.last_login).toLocaleString("vi-VN")}</span>}
          />
        )}
        <div style={{ marginBottom: 0, paddingBottom: 0, borderBottom: "none" }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Mã tài khoản</div>
          <code style={{ fontSize: 11, color: C.textSub, background: C.bg, padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>{pu?.id}</code>
        </div>
      </Section>

      {/* ── Partner info ─────────────────────────────── */}
      {profile && (
        <Section title="Thông tin đối tác" icon={<Building2 size={15} />}>
          <InfoRow label="Tên đối tác" value={<span style={{ fontWeight: 600 }}>{profile.name}</span>} />
          {profile.company_name && <InfoRow label="Tên công ty" value={profile.company_name} />}
          {profile.contact_name && <InfoRow label="Người liên hệ" value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><User size={12} color={C.textMuted} />{profile.contact_name}</span>} />}
          {profile.email && <InfoRow label="Email công ty" value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Mail size={12} color={C.textMuted} />{profile.email}</span>} />}
          {profile.phone && <InfoRow label="Điện thoại" value={<span style={{ display: "flex", alignItems: "center", gap: 6 }}><Phone size={12} color={C.textMuted} />{profile.phone}</span>} />}
          {profile.website && (
            <InfoRow label="Website" value={
              <a href={profile.website} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, color: C.blue, textDecoration: "none", fontSize: 13 }}>
                <Globe size={12} />{profile.website}
              </a>
            } />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginTop: 8 }}>
            {[
              { label: "Loại đối tác", value: profile.type,       color: C.blue,  icon: <Shield size={13} /> },
              { label: "Hạng",         value: profile.tier,        color: C.amber, icon: <Star size={13} /> },
              { label: "Rev share",    value: `${profile.rev_share ?? 0}%`, color: C.green, icon: <TrendingUp size={13} /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} style={{ background: C.bg, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, color }}>
                  {icon}
                  <span style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{label}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Security ─────────────────────────────────── */}

      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
