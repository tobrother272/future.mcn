import { useState, useMemo } from "react";
import {
  UploadCloud, Plus, Search, RefreshCw, ChevronRight, ChevronDown,
  Clock, CheckCircle, XCircle, Loader2, Tv2, FileVideo, AlertCircle, Trash2,
  Eye, EyeOff, KeyRound, Copy, Check,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import {
  useSubmissionList, useCreateSubmission, useSubmissionLog, useDeleteSubmission,
  type Submission, type WorkflowState,
} from "@/api/submissions.api";
import { useChannelCredentials } from "@/api/channels.api";
import { useToast } from "@/stores/notificationStore";
import { useTopics } from "@/api/cms.api";

// ── Workflow state config ─────────────────────────────────────
const STATE_CFG: Record<WorkflowState, { label: string; color: "blue"|"amber"|"green"|"red"|"purple"|"gray"|"teal"; icon: React.ReactNode }> = {
  DRAFT:                { label: "Nháp",              color: "gray",   icon: <Clock size={11} /> },
  SUBMITTED:            { label: "Chờ duyệt",         color: "blue",   icon: <Clock size={11} /> },
  QC_REVIEWING:         { label: "Đang xem xét",      color: "amber",  icon: <Loader2 size={11} /> },
  QC_REJECTED:          { label: "Từ chối",            color: "red",    icon: <XCircle size={11} /> },
  QC_APPROVED:          { label: "Đã duyệt",           color: "teal",   icon: <CheckCircle size={11} /> },
  CHANNEL_PROVISIONING: { label: "Đang cấp kênh",     color: "purple", icon: <Loader2 size={11} /> },
  PROVISIONING_FAILED:  { label: "Cấp kênh thất bại", color: "red",    icon: <XCircle size={11} /> },
  ACTIVE:               { label: "Hoạt động",          color: "green",  icon: <CheckCircle size={11} /> },
};



// ── State pill ────────────────────────────────────────────────
function StatePill({ state }: { state: WorkflowState }) {
  const cfg = STATE_CFG[state] ?? STATE_CFG.DRAFT;
  return <Pill color={cfg.color} dot>{cfg.label}</Pill>;
}

// ── Workflow timeline row ─────────────────────────────────────
function TimelineRow({ from, to, byEmail, note, ts }: {
  from: string | null; to: string; byEmail: string | null; note: string | null; ts: string;
}) {
  const cfg = STATE_CFG[to as WorkflowState] ?? STATE_CFG.DRAFT;
  // Ẩn lỗi kỹ thuật khi cấp kênh thất bại — hiện thông báo thân thiện
  const displayNote = to === "PROVISIONING_FAILED"
    ? "Quá trình cấp kênh gặp sự cố. Vui lòng liên hệ quản trị viên để được hỗ trợ."
    : note;
  return (
    <div style={{ display: "flex", gap: 14, paddingBottom: 16, position: "relative" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${C[cfg.color] ?? C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center", color: C[cfg.color] ?? C.blue, zIndex: 1 }}>
          {cfg.icon}
        </div>
        <div style={{ flex: 1, width: 2, background: C.border, marginTop: 4 }} />
      </div>
      <div style={{ paddingTop: 4, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {from && <span style={{ fontSize: 11, color: C.textMuted }}>{STATE_CFG[from as WorkflowState]?.label ?? from}</span>}
          {from && <ChevronRight size={10} color={C.textMuted} />}
          <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{cfg.label}</span>
        </div>
        {displayNote && (
          <div style={{
            fontSize: 11, marginTop: 4, padding: "5px 9px",
            borderRadius: RADIUS.sm, lineHeight: 1.5,
            background: to === "PROVISIONING_FAILED"
              ? `${C.amber}15`
              : to === "ACTIVE"
              ? `${C.green}12`
              : to === "QC_APPROVED" || to === "QC_REJECTED"
              ? `${C.teal}12`
              : `${C.bgPage}cc`,
            borderLeft: `2px solid ${
              to === "PROVISIONING_FAILED" ? C.amber
              : to === "ACTIVE" ? C.green
              : to === "QC_APPROVED" || to === "QC_REJECTED" ? C.teal
              : C.border
            }`,
            color: to === "PROVISIONING_FAILED" ? C.amber
              : to === "ACTIVE" ? C.green
              : to === "QC_APPROVED" ? C.teal
              : C.textSub,
            fontWeight: 500,
          }}>
            {displayNote}
          </div>
        )}
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3 }}>
          {byEmail ?? "Hệ thống"} · {new Date(ts).toLocaleString("vi-VN")}
        </div>
      </div>
    </div>
  );
}

// ── Submission log panel ──────────────────────────────────────
function SubmissionLogPanel({ id }: { id: string }) {
  const { data: logs = [], isLoading } = useSubmissionLog(id);
  if (isLoading) return <div style={{ padding: 16, color: C.textMuted, fontSize: 12 }}>Đang tải...</div>;
  if (!logs.length)  return <div style={{ padding: 16, color: C.textMuted, fontSize: 12 }}>Chưa có lịch sử.</div>;
  return (
    <div style={{ padding: "16px 20px" }}>
      {logs.map((log) => (
        <TimelineRow key={log.id} from={log.from_state} to={log.to_state} byEmail={log.by_email} note={log.note} ts={log.ts} />
      ))}
    </div>
  );
}

// ── Channel credentials box (for partner after provisioning) ──
function CredRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow]     = useState(!secret);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
      <span style={{
        fontSize: 11, color: C.textMuted, width: 72, flexShrink: 0,
        fontWeight: 500, letterSpacing: "0.02em",
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        background: `${C.bgPage}e0`, border: `1px solid ${C.border}`,
        borderRadius: RADIUS.sm, overflow: "hidden",
      }}>
        <span style={{
          flex: 1, padding: "6px 10px",
          fontSize: 12, color: C.text, fontFamily: "monospace",
          letterSpacing: secret && !show ? "4px" : "normal",
          userSelect: show || !secret ? "text" : "none",
        }}>
          {secret && !show ? "••••••••••••" : value}
        </span>
        {secret && (
          <button
            onClick={() => setShow(v => !v)}
            title={show ? "Ẩn" : "Hiện"}
            style={{
              background: "transparent", border: "none", borderLeft: `1px solid ${C.border}`,
              cursor: "pointer", padding: "6px 8px", color: C.textMuted,
              display: "flex", alignItems: "center", transition: "background .12s",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${C.border}80`)}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
          >
            {show ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        )}
        <button
          onClick={handleCopy}
          title="Sao chép"
          style={{
            background: copied ? `${C.teal}18` : "transparent",
            border: "none", borderLeft: `1px solid ${C.border}`,
            cursor: "pointer", padding: "6px 8px",
            color: copied ? C.teal : C.textMuted,
            display: "flex", alignItems: "center", transition: "background .12s, color .12s",
          }}
          onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLElement).style.background = `${C.border}80`; }}
          onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  );
}

function ChannelCredentialsBox({ channelId }: { channelId: string }) {
  const { data, isLoading, isError } = useChannelCredentials(channelId);

  if (isLoading) return (
    <div style={{ marginTop: 12, fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
      <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Đang tải thông tin truy cập...
    </div>
  );
  if (isError || (!data?.email_access && !data?.password)) return null;

  return (
    <div style={{
      marginTop: 14,
      background: `${C.teal}08`,
      border: `1px solid ${C.teal}30`,
      borderRadius: RADIUS.md,
      padding: "12px 14px",
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600, color: C.teal,
        marginBottom: 12, display: "flex", alignItems: "center", gap: 5,
        textTransform: "uppercase", letterSpacing: "0.05em",
      }}>
        <KeyRound size={11} /> Thông tin truy cập kênh
      </div>

      {data.email_access && <CredRow label="Email" value={data.email_access} />}
      {data.password     && <CredRow label="Password" value={data.password} secret />}

      <div style={{
        fontSize: 10.5, color: C.amber, marginTop: 10,
        padding: "6px 10px",
        background: `${C.amber}12`, borderRadius: RADIUS.sm,
        borderLeft: `2px solid ${C.amber}`,
        lineHeight: 1.5,
      }}>
        Đây là thông tin truy cập ban đầu. Vui lòng <strong>đổi mật khẩu</strong> và bật xác thực 2 bước sau khi đăng nhập lần đầu.
      </div>
    </div>
  );
}

// ── Submission row ────────────────────────────────────────────
function SubmissionRow({ sub, onDelete }: { sub: Submission; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const canDelete = sub.workflow_state === "SUBMITTED";
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 110px 130px 90px 140px 40px",
          gap: 8, alignItems: "center",
          padding: "12px 16px",
          borderBottom: `1px solid ${C.border}`,
          transition: "background .12s",
          cursor: "pointer",
        }}
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      >
        {/* Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.purple}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileVideo size={13} color={C.purple} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub.video_title}</div>
            {sub.video_url && <a href={sub.video_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.blue, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} onClick={(e) => e.stopPropagation()}>Link demo</a>}
          </div>
        </div>

        {/* Category */}
        <div style={{ fontSize: 12, color: C.textSub }}>{sub.category ?? "—"}</div>

        {/* State */}
        <StatePill state={sub.workflow_state} />

        {/* Channel / destination */}
        <div style={{ fontSize: 12, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {sub.workflow_state === "ACTIVE" && sub.channel_name ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.green }}>
              <Tv2 size={11} />{sub.channel_name}
            </span>
          ) : sub.workflow_state === "CHANNEL_PROVISIONING" ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: C.purple, fontSize: 11 }}>
              <Loader2 size={10} />Đang cấp kênh...
            </span>
          ) : sub.workflow_state === "QC_APPROVED" ? (
            <span style={{ fontSize: 11, color: C.teal }}>Chờ cấp kênh</span>
          ) : (
            <span style={{ color: C.textMuted }}>—</span>
          )}
        </div>

        {/* Date */}
        <div style={{ fontSize: 11, color: C.textMuted }}>{new Date(sub.submitted_at).toLocaleDateString("vi-VN")}</div>

        {/* Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {canDelete && (
            <button
              title="Xoá yêu cầu"
              onClick={(e) => { e.stopPropagation(); onDelete(sub.id); }}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                padding: 4, borderRadius: 4, color: C.red,
                display: "flex", alignItems: "center",
                transition: "background .12s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${C.red}18`)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "transparent")}
            >
              <Trash2 size={13} />
            </button>
          )}
          <div style={{ color: C.textMuted }}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ background: `${C.bgCard}cc`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: `1px solid ${C.border}` }}>
            {/* Details */}
            <div style={{ padding: "14px 20px", borderRight: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, marginBottom: 10, textTransform: "uppercase" }}>Chi tiết</div>
              <DetailItem label="ID" value={sub.id} />
              {sub.video_url && <DetailItem label="Link demo" value={sub.video_url} />}
              {sub.description && <DetailItem label="Mô tả" value={sub.description} />}
              {sub.admin_note && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.amber}15`, borderRadius: RADIUS.sm, borderLeft: `3px solid ${C.amber}` }}>
                  <div style={{ fontSize: 10, color: C.amber, fontWeight: 600, marginBottom: 3 }}>GHI CHÚ TỪ QC</div>
                  <div style={{ fontSize: 12, color: C.text }}>{sub.admin_note}</div>
                </div>
              )}
              {sub.workflow_state === "ACTIVE" && sub.channel_id && (
                <ChannelCredentialsBox channelId={sub.channel_id} />
              )}
            </div>
            {/* Workflow log */}
            <div>
              <div style={{ padding: "14px 20px 8px", fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase" }}>Lịch sử trạng thái</div>
              <SubmissionLogPanel id={sub.id} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: C.textMuted, minWidth: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 12, color: C.textSub }}>{value}</span>
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────
function CreateModal({ onClose }: { onClose: () => void }) {
  const createMut = useCreateSubmission();
  const toast = useToast();
  const { data: topics = [] } = useTopics();

  const [form, setForm] = useState({
    video_title: "",
    video_url:   "",
    category:    "",
    description: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((v) => ({ ...v, [k]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.video_title.trim()) { toast.error("Thiếu tên kênh", "Vui lòng nhập tên kênh cấp mới"); return; }
    if (!form.video_url.trim())   { toast.error("Thiếu link demo", "Vui lòng nhập link truy cập demo"); return; }
    try {
      await createMut.mutateAsync({
        video_title: form.video_title,
        video_url:   form.video_url,
        category:    form.category   || undefined,
        description: form.description || undefined,
      });
      toast.success("Thành công", "Đã gửi yêu cầu thành công!");
      onClose();
    } catch {
      toast.error("Thất bại", "Gửi yêu cầu thất bại");
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px",
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: RADIUS.sm, color: C.text, fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: C.textMuted,
    marginBottom: 5, display: "block",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999, padding: 20,
    }}>
      <div style={{
        background: C.bgCard, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`,
        width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: RADIUS.sm, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UploadCloud size={17} color={C.blue} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Gửi demo cấp / mời kênh mới</div>
            <div style={{ fontSize: 11, color: C.textSub }}>Yêu cầu sẽ được chuyển đến bộ phận QC để xem xét</div>
          </div>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Channel name */}
          <div>
            <label style={labelStyle}>Tên kênh cấp mới *</label>
            <input value={form.video_title} onChange={set("video_title")} placeholder="Nhập tên kênh..." style={inputStyle} />
          </div>

          {/* Demo link */}
          <div>
            <label style={labelStyle}>Link truy cập demo *</label>
            <input value={form.video_url} onChange={set("video_url")} placeholder="https://..." style={inputStyle} />
          </div>

          {/* Topic */}
          <div>
            <label style={labelStyle}>Chủ đề</label>
            <select value={form.category} onChange={set("category")} style={inputStyle}>
              <option value="">-- Chọn chủ đề --</option>
              {topics.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Mô tả</label>
            <textarea
              value={form.description} onChange={set("description")}
              placeholder="Link File SEO và thông tin thị trường muốn triển khai, mô tả một số đặc trưng như mục tiêu, đối tượng hướng đến, khác biệt so với các kênh khác cùng hệ thống..."
              rows={4}
              style={{ ...inputStyle, resize: "vertical" as const }}
            />
          </div>

          {/* Info box */}
          <div style={{ background: `${C.blue}12`, borderRadius: RADIUS.sm, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={14} color={C.blue} style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: C.textSub, lineHeight: 1.5 }}>
              Sau khi gửi, yêu cầu sẽ được đội ngũ QC xem xét. Bạn có thể theo dõi trạng thái trong danh sách bên dưới.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>Hủy</Button>
          <Button
            variant="primary"
            icon={<UploadCloud size={14} />}
            onClick={() => void handleSubmit()}
            disabled={createMut.isPending}
          >
            {createMut.isPending ? "Đang gửi..." : "Gửi yêu cầu"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── State filter tabs ─────────────────────────────────────────
const STATE_TABS: { label: string; value: WorkflowState | "" }[] = [
  { label: "Tất cả", value: "" },
  { label: "Chờ duyệt", value: "SUBMITTED" },
  { label: "Đang xem", value: "QC_REVIEWING" },
  { label: "Đã duyệt", value: "QC_APPROVED" },
  { label: "Từ chối", value: "QC_REJECTED" },
  { label: "Hoạt động", value: "ACTIVE" },
];

// ── Main Page ─────────────────────────────────────────────────
export default function PortalSubmitPage() {
  const user      = useAuthStore((s) => s.user);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";
  const toast     = useToast();
  const deleteMut = useDeleteSubmission();

  const [search,   setSearch]   = useState("");
  const [stateTab, setStateTab] = useState<WorkflowState | "">("");
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, refetch } = useSubmissionList({
    partner_id: partnerId || undefined,
    search:     search   || undefined,
    limit: 200,
  });

  const allItems  = data?.items ?? [];
  const items     = stateTab ? allItems.filter((s) => s.workflow_state === stateTab) : allItems;
  const total     = items.length;

  // counts per state for tab badges
  const stateCounts = useMemo(() => {
    const counts: Partial<Record<WorkflowState | "", number>> = { "": allItems.length };
    for (const s of allItems) counts[s.workflow_state] = (counts[s.workflow_state] ?? 0) + 1;
    return counts;
  }, [allItems]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xoá yêu cầu này?")) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Đã xoá", "Yêu cầu đã được xoá thành công");
    } catch {
      toast.error("Thất bại", "Không thể xoá yêu cầu");
    }
  };

  // KPI counts
  const kpiCounts = useMemo(() => ({
    pending:   allItems.filter((s) => s.workflow_state === "SUBMITTED").length,
    reviewing: allItems.filter((s) => s.workflow_state === "QC_REVIEWING").length,
    approved:  allItems.filter((s) => s.workflow_state === "QC_APPROVED").length,
    active:    allItems.filter((s) => s.workflow_state === "ACTIVE").length,
  }), [allItems]);

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Demo cấp / mời kênh mới</h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>
            Gửi yêu cầu cấp kênh mới và theo dõi trạng thái xét duyệt
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>Làm mới</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Gửi demo / mời kênh</Button>
        </div>
      </div>

      {/* ── KPI strip ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Chờ duyệt",   value: kpiCounts.pending,   color: C.blue   },
          { label: "Đang xem xét", value: kpiCounts.reviewing, color: C.amber  },
          { label: "Đã duyệt",    value: kpiCounts.approved,  color: C.teal   },
          { label: "Hoạt động",   value: kpiCounts.active,    color: C.green  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
            padding: "14px 16px", boxShadow: SHADOW.sm,
          }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* State tabs */}
        <div style={{ display: "flex", gap: 4, background: C.bgCard, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, padding: 3 }}>
        {STATE_TABS.map(({ label, value }) => {
            const count = stateCounts[value] ?? 0;
            const active = stateTab === value;
            return (
            <button
              key={value}
              onClick={() => setStateTab(value)}
              style={{
                padding: "5px 12px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
                background: active ? C.blue : "transparent",
                color: active ? "#fff" : C.textSub,
                transition: "all .15s", fontWeight: active ? 600 : 400,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.25)" : `${C.blue}22`,
                  color: active ? "#fff" : C.blue,
                  borderRadius: 10, padding: "1px 6px", lineHeight: "16px",
                }}>{count}</span>
              )}
            </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
          <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên kênh..."
            style={{
              width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
              color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted }}>{total} yêu cầu cấp kênh</div>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm }}>
        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "2fr 110px 130px 90px 140px 40px",
          gap: 8, padding: "10px 16px",
          background: C.bg, borderBottom: `1px solid ${C.border}`,
        }}>
          {["Tên kênh cấp mới", "Chủ đề", "Trạng thái", "Điểm đến", "Ngày gửi", ""].map((h, i) => (
            <div key={h || i} style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{h}</div>
          ))}
        </div>

        {isLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Đang tải...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <UploadCloud size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
            <div style={{ color: C.textSub, fontSize: 14, marginBottom: 8 }}>Chưa có yêu cầu nào</div>
            <div style={{ color: C.textMuted, fontSize: 12, marginBottom: 20 }}>Gửi demo kênh đầu tiên để bắt đầu quá trình xét duyệt</div>
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Gửi demo / mời kênh</Button>
          </div>
        ) : (
          items.map((sub) => <SubmissionRow key={sub.id} sub={sub} onDelete={(id) => void handleDelete(id)} />)
        )}
      </div>

      {/* ── Create modal ────────────────────────────── */}
      {showModal && <CreateModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
