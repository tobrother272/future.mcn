import { useState } from "react";
import {
  ClipboardCheck, Search, RefreshCw, ChevronDown, ChevronRight,
  Clock, CheckCircle, XCircle, Eye, ExternalLink,
  User2, Building2, FileVideo, MessageSquare,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import {
  useSubmissionList, useTransitionSubmission, useSubmissionLog,
  type Submission, type WorkflowState,
} from "@/api/submissions.api";
import { useToast } from "@/stores/notificationStore";

// ── State config ──────────────────────────────────────────────
const STATE_CFG: Record<WorkflowState, { label: string; color: "blue"|"amber"|"green"|"red"|"purple"|"gray"|"teal" }> = {
  DRAFT:                { label: "Nháp",              color: "gray" },
  SUBMITTED:            { label: "Chờ duyệt",         color: "blue" },
  QC_REVIEWING:         { label: "Đang xem xét",      color: "amber" },
  QC_REJECTED:          { label: "Từ chối",            color: "red" },
  QC_APPROVED:          { label: "Đã duyệt",           color: "teal" },
  CHANNEL_PROVISIONING: { label: "Đang cấp kênh",     color: "purple" },
  PROVISIONING_FAILED:  { label: "Cấp kênh thất bại", color: "red" },
  ACTIVE:               { label: "Hoạt động",          color: "green" },
};

// ── Timeline log ──────────────────────────────────────────────
function LogPanel({ id }: { id: string }) {
  const { data: logs = [], isLoading } = useSubmissionLog(id);
  if (isLoading) return <div style={{ padding: "12px 20px", color: C.textMuted, fontSize: 12 }}>Đang tải...</div>;
  if (!logs.length) return <div style={{ padding: "12px 20px", color: C.textMuted, fontSize: 12 }}>Chưa có lịch sử.</div>;
  return (
    <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
      {logs.map((l) => {
        const cfg = STATE_CFG[l.to_state as WorkflowState] ?? STATE_CFG.SUBMITTED;
        return (
          <div key={l.id} style={{ display: "flex", gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${C[cfg.color] ?? C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: C[cfg.color] ?? C.blue }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>
                {l.from_state ? `${STATE_CFG[l.from_state as WorkflowState]?.label ?? l.from_state} → ` : ""}{cfg.label}
              </div>
              {l.note && <div style={{ fontSize: 11, color: C.amber, marginTop: 1 }}>{l.note}</div>}
              <div style={{ fontSize: 10, color: C.textMuted }}>{l.by_email ?? "Hệ thống"} · {new Date(l.ts).toLocaleString("vi-VN")}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Review Panel (QC actions) ─────────────────────────────────
function ReviewPanel({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const transition = useTransitionSubmission();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleStartReview = async () => {
    try {
      await transition.mutateAsync({ id: sub.id, toState: "QC_REVIEWING" });
      toast.success("Bắt đầu xem xét", sub.video_title);
      onDone();
    } catch { toast.error("Lỗi", "Không thể chuyển trạng thái"); }
  };

  const handleApprove = async () => {
    try {
      await transition.mutateAsync({ id: sub.id, toState: "QC_APPROVED", note: note || undefined });
      toast.success("Đã duyệt", sub.video_title);
      onDone();
    } catch { toast.error("Lỗi", "Không thể duyệt"); }
  };

  const handleReject = async () => {
    if (!note.trim()) { toast.warning("Thiếu lý do", "Nhập lý do từ chối"); return; }
    try {
      await transition.mutateAsync({ id: sub.id, toState: "QC_REJECTED", note });
      toast.success("Đã từ chối", sub.video_title);
      setShowRejectForm(false);
      onDone();
    } catch { toast.error("Lỗi", "Không thể từ chối"); }
  };

  return (
    <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: `${C.bgCard}bb` }}>
      {sub.workflow_state === "SUBMITTED" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textSub }}>Bắt đầu xem xét yêu cầu này?</span>
          <Button variant="primary" size="sm" icon={<Eye size={13} />} onClick={() => void handleStartReview()} disabled={transition.isPending}>
            Bắt đầu xem xét
          </Button>
        </div>
      )}

      {sub.workflow_state === "QC_REVIEWING" && !showRejectForm && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú phê duyệt (tuỳ chọn)..."
              style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          <Button variant="primary" size="sm" icon={<CheckCircle size={13} />} onClick={() => void handleApprove()} disabled={transition.isPending}>
            Duyệt
          </Button>
          <Button variant="ghost" size="sm" icon={<XCircle size={13} />} onClick={() => setShowRejectForm(true)}
            style={{ color: C.red, borderColor: C.red }}>
            Từ chối
          </Button>
        </div>
      )}

      {showRejectForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do từ chối (bắt buộc)..." rows={2}
            style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.red}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => { setShowRejectForm(false); setNote(""); }}>Hủy</Button>
            <Button size="sm" icon={<XCircle size={13} />} onClick={() => void handleReject()} disabled={transition.isPending}
              style={{ background: C.red, color: "#fff", border: "none" }}>
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Submission card ───────────────────────────────────────────
function SubmissionCard({ sub }: { sub: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATE_CFG[sub.workflow_state];

  return (
    <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm, marginBottom: 10 }}>
      {/* Header row */}
      <div onClick={() => setExpanded((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", transition: "background .12s" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      >
        {/* Icon */}
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.purple}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileVideo size={15} color={C.purple} />
        </div>
        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{sub.video_title}</span>
            <Pill color={cfg.color}>{cfg.label}</Pill>
            {sub.category && <span style={{ fontSize: 11, color: C.textMuted }}>{sub.category}</span>}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 4, flexWrap: "wrap" }}>
            {sub.partner_name && (
              <span style={{ fontSize: 11, color: C.textSub, display: "flex", alignItems: "center", gap: 4 }}><Building2 size={10} />{sub.partner_name}</span>
            )}
            {sub.submitter_name && (
              <span style={{ fontSize: 11, color: C.textSub, display: "flex", alignItems: "center", gap: 4 }}><User2 size={10} />{sub.submitter_name}</span>
            )}
            <span style={{ fontSize: 11, color: C.textMuted }}>{new Date(sub.submitted_at).toLocaleString("vi-VN")}</span>
          </div>
        </div>
        {expanded ? <ChevronDown size={15} color={C.textMuted} /> : <ChevronRight size={15} color={C.textMuted} />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${C.border}` }}>
            {/* Details */}
            <div style={{ padding: "14px 18px", borderRight: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, marginBottom: 10, textTransform: "uppercase" }}>Chi tiết nội dung</div>
              {sub.video_url && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>URL video</div>
                  <a href={sub.video_url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: C.blue, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}
                    onClick={(e) => e.stopPropagation()}>
                    <ExternalLink size={11} />{sub.video_url}
                  </a>
                </div>
              )}
              {sub.description && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Mô tả</div>
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{sub.description}</div>
                </div>
              )}
              {sub.storage_type && (
                <div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>Nguồn lưu trữ</div>
                  <div style={{ fontSize: 12, color: C.textSub }}>{sub.storage_type}{sub.storage_url ? ` — ${sub.storage_url}` : ""}</div>
                </div>
              )}
              {sub.admin_note && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.amber}15`, borderRadius: RADIUS.sm, borderLeft: `3px solid ${C.amber}` }}>
                  <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 2 }}>GHI CHÚ QC</div>
                  <div style={{ fontSize: 12, color: C.text }}>{sub.admin_note}</div>
                </div>
              )}
            </div>
            {/* Timeline log */}
            <div>
              <div style={{ padding: "12px 18px 4px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Lịch sử</div>
              <LogPanel id={sub.id} />
            </div>
          </div>

          {/* Action panel */}
          {(sub.workflow_state === "SUBMITTED" || sub.workflow_state === "QC_REVIEWING") && (
            <ReviewPanel sub={sub} onDone={() => setExpanded(false)} />
          )}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function QcQueuePage() {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"SUBMITTED"|"QC_REVIEWING"|"">("");

  const { data, isLoading, refetch } = useSubmissionList({
    state: stateFilter || undefined,
    search: search || undefined,
    limit: 100,
  });
  const items = data?.items ?? [];

  const submitted   = items.filter((s) => s.workflow_state === "SUBMITTED").length;
  const reviewing   = items.filter((s) => s.workflow_state === "QC_REVIEWING").length;

  const tabs = [
    { label: "Tất cả chờ",   value: "" as const,            count: submitted + reviewing },
    { label: "Chờ duyệt",    value: "SUBMITTED" as const,   count: submitted },
    { label: "Đang xem xét", value: "QC_REVIEWING" as const, count: reviewing },
  ];

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <ClipboardCheck size={20} color={C.blue} />
            Hàng chờ QC
          </h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>Xét duyệt yêu cầu nội dung từ đối tác</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>Làm mới</Button>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Chờ duyệt",    value: submitted,                  color: C.blue },
          { label: "Đang xem xét", value: reviewing,                  color: C.amber },
          { label: "Tổng cần xử lý", value: submitted + reviewing,   color: C.purple },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "14px 16px", boxShadow: SHADOW.sm }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: 3 }}>
          {tabs.map(({ label, value, count }) => (
            <button key={value} onClick={() => setStateFilter(value)}
              style={{ padding: "5px 12px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, background: stateFilter === value ? C.blue : "transparent", color: stateFilter === value ? "#fff" : C.textSub, transition: "all .15s", fontWeight: stateFilter === value ? 600 : 400 }}>
              {label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.8 }}>({count})</span>
            </button>
          ))}
        </div>
        <div style={{ position: "relative", flex: 1, maxWidth: 300 }}>
          <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề video, đối tác..."
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
      </div>

      {/* Queue */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <ClipboardCheck size={40} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14 }}>Không có yêu cầu nào cần xử lý</div>
        </div>
      ) : (
        items.map((sub) => <SubmissionCard key={sub.id} sub={sub} />)
      )}
    </div>
  );
}
