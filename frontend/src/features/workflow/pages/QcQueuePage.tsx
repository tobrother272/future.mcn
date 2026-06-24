import React, { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import {
  ClipboardCheck, Search, RefreshCw, ChevronDown, ChevronRight,
  Clock, CheckCircle, XCircle, Eye, ExternalLink,
  User2, Building2, FileVideo, Tv, RotateCcw, Zap,
  KeyRound, Copy, Check, EyeOff,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import {
  useSubmissionList, useTransitionSubmission, useSubmissionLog, useProvisionSubmission,
  type Submission, type WorkflowState,
} from "@/api/submissions.api";
import { useCmsList } from "@/api/cms.api";
import { useChannelCredentials, useUpdateChannelCredentials } from "@/api/channels.api";
import { useToast } from "@/stores/notificationStore";

// ── Channel credentials (admin view) ─────────────────────────
function CredRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [show, setShow]     = useState(!secret);
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    void copyToClipboard(value).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    });
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: C.textMuted, width: 72, flexShrink: 0, fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, display: "flex", alignItems: "center", background: `${C.bgCard}e0`, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, overflow: "hidden" }}>
        <span style={{ flex: 1, padding: "5px 10px", fontSize: 12, color: C.text, fontFamily: "monospace", letterSpacing: secret && !show ? "4px" : "normal" }}>
          {secret && !show ? "••••••••••••" : value}
        </span>
        {secret && (
          <button onClick={() => setShow(v => !v)} title={show ? "Ẩn" : "Hiện"}
            style={{ background: "transparent", border: "none", borderLeft: `1px solid ${C.border}`, cursor: "pointer", padding: "5px 7px", color: C.textMuted, display: "flex" }}>
            {show ? <EyeOff size={12} /> : <Eye size={12} />}
          </button>
        )}
        <button onClick={handleCopy} title="Sao chép"
          style={{ background: copied ? `${C.teal}18` : "transparent", border: "none", borderLeft: `1px solid ${C.border}`, cursor: "pointer", padding: "5px 7px", color: copied ? C.teal : C.textMuted, display: "flex" }}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
        </button>
      </div>
    </div>
  );
}

function ChannelCredBox({ channelId }: { channelId: string }) {
  const { data, isLoading, isError } = useChannelCredentials(channelId);
  const update = useUpdateChannelCredentials(channelId);
  const toast  = useToast();

  const [editing,  setEditing]  = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [emailVal, setEmailVal] = useState("");
  const [pwdVal,   setPwdVal]   = useState("");

  const startEdit = () => {
    setEmailVal(data?.email_access ?? "");
    setPwdVal("");
    setShowPwd(false);
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({ email_access: emailVal, password: pwdVal || undefined });
      toast.success("Đã lưu", "Thông tin truy cập đã cập nhật");
      setEditing(false);
    } catch { toast.error("Lỗi", "Không lưu được thông tin truy cập"); }
  };

  if (isLoading) return <div style={{ fontSize: 11, color: C.textMuted }}>Đang tải...</div>;
  if (isError) return null;

  return (
    <div style={{ marginTop: 12, background: `${C.teal}08`, border: `1px solid ${C.teal}30`, borderRadius: RADIUS.sm, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: C.teal, marginBottom: editing ? 10 : 0, display: "flex", alignItems: "center", justifyContent: "space-between", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><KeyRound size={10} /> Thông tin truy cập kênh</span>
        {!editing && (
          <button onClick={startEdit} style={{ fontSize: 10, color: C.teal, background: `${C.teal}18`, border: `1px solid ${C.teal}35`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontWeight: 600, textTransform: "none", letterSpacing: 0 }}>
            {data?.email_access || data?.password ? "Sửa" : "+ Thêm"}
          </button>
        )}
      </div>

      {!editing && (
        <div style={{ marginTop: (data?.email_access || data?.password) ? 10 : 0 }}>
          {data?.email_access && <CredRow label="Email"    value={data.email_access} />}
          {data?.password     && <CredRow label="Password" value={data.password} secret />}
          {!data?.email_access && !data?.password && (
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>Chưa có thông tin truy cập</div>
          )}
        </div>
      )}

      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted, width: 60, flexShrink: 0 }}>Email</span>
            <input value={emailVal} onChange={e => setEmailVal(e.target.value)} placeholder="email@example.com"
              style={{ flex: 1, padding: "5px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted, width: 60, flexShrink: 0 }}>Password</span>
            <div style={{ flex: 1, position: "relative" }}>
              <input type={showPwd ? "text" : "password"} value={pwdVal} onChange={e => setPwdVal(e.target.value)}
                placeholder={data?.password ? "Để trống = giữ nguyên" : "Nhập password mới"}
                style={{ width: "100%", padding: "5px 28px 5px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
              <button onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}>
                {showPwd ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 2 }}>
            <button onClick={() => setEditing(false)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.textMuted, fontSize: 11, cursor: "pointer" }}>Hủy</button>
            <button onClick={() => void handleSave()} disabled={update.isPending}
              style={{ padding: "4px 12px", background: C.teal, border: "none", borderRadius: RADIUS.sm, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", opacity: update.isPending ? 0.6 : 1 }}>
              {update.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── State config ──────────────────────────────────────────────
const STATE_CFG: Record<WorkflowState, { label: string; color: "blue"|"amber"|"green"|"red"|"purple"|"gray"|"teal"; icon: React.ReactNode }> = {
  DRAFT:                { label: "Nháp",              color: "gray",   icon: <Clock size={11} /> },
  SUBMITTED:            { label: "Chờ duyệt",         color: "blue",   icon: <Clock size={11} /> },
  QC_REVIEWING:         { label: "Đang xem xét",      color: "amber",  icon: <Eye size={11} /> },
  QC_REJECTED:          { label: "Từ chối",            color: "red",    icon: <XCircle size={11} /> },
  QC_APPROVED:          { label: "Đã duyệt",           color: "teal",   icon: <CheckCircle size={11} /> },
  CHANNEL_PROVISIONING: { label: "Đang cấp kênh",     color: "purple", icon: <RotateCcw size={11} /> },
  PROVISIONING_FAILED:  { label: "Cấp kênh thất bại", color: "red",    icon: <XCircle size={11} /> },
  ACTIVE:               { label: "Hoạt động",          color: "green",  icon: <CheckCircle size={11} /> },
};

// ── Timeline log ──────────────────────────────────────────────
function LogPanel({ id }: { id: string }) {
  const { data: logs = [], isLoading } = useSubmissionLog(id);
  if (isLoading) return <div style={{ padding: "12px 20px", color: C.textMuted, fontSize: 12 }}>Đang tải...</div>;
  if (!logs.length) return <div style={{ padding: "12px 20px", color: C.textMuted, fontSize: 12 }}>Chưa có lịch sử.</div>;
  return (
    <div style={{ padding: "12px 20px", display: "flex", flexDirection: "column" }}>
      {logs.map((l, idx) => {
        const cfg     = STATE_CFG[l.to_state as WorkflowState] ?? STATE_CFG.SUBMITTED;
        const isLast  = idx === logs.length - 1;
        return (
          <div key={l.id} style={{ display: "flex", gap: 12, paddingBottom: isLast ? 4 : 14, position: "relative" }}>
            {/* Icon + connector line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: `${(C as Record<string,string>)[cfg.color] ?? C.blue}22`,
                border: `1.5px solid ${(C as Record<string,string>)[cfg.color] ?? C.blue}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: (C as Record<string,string>)[cfg.color] ?? C.blue, zIndex: 1,
              }}>
                {cfg.icon}
              </div>
              {!isLast && <div style={{ flex: 1, width: 2, background: C.border, marginTop: 3 }} />}
            </div>
            {/* Content */}
            <div style={{ paddingTop: 3, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {l.from_state && (
                  <>
                    <span style={{ fontSize: 11, color: C.textMuted }}>{STATE_CFG[l.from_state as WorkflowState]?.label ?? l.from_state}</span>
                    <ChevronRight size={9} color={C.textMuted} />
                  </>
                )}
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{cfg.label}</span>
              </div>
              {l.note && (
                <div style={{
                  fontSize: 11, marginTop: 4, padding: "5px 9px",
                  borderRadius: RADIUS.sm, lineHeight: 1.5,
                  background: l.to_state === "PROVISIONING_FAILED"
                    ? `${C.red}12`
                    : l.to_state === "ACTIVE"
                    ? `${C.green}12`
                    : l.to_state === "QC_APPROVED" || l.to_state === "QC_REJECTED"
                    ? `${C.teal}12`
                    : `${C.bgCard}cc`,
                  borderLeft: `2px solid ${
                    l.to_state === "PROVISIONING_FAILED" ? C.red
                    : l.to_state === "ACTIVE" ? C.green
                    : l.to_state === "QC_APPROVED" || l.to_state === "QC_REJECTED" ? C.teal
                    : C.border
                  }`,
                  color: l.to_state === "PROVISIONING_FAILED" ? C.red
                    : l.to_state === "ACTIVE" ? C.green
                    : l.to_state === "QC_APPROVED" ? C.teal
                    : C.textSub,
                  fontWeight: 500,
                }}>
                  {l.note}
                </div>
              )}
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
                {l.by_email ?? "Hệ thống"} · {new Date(l.ts).toLocaleString("vi-VN")}
              </div>
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

// ── Rejected Panel — re-open to reviewing ─────────────────────
function RejectedPanel({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const transition = useTransitionSubmission();
  const toast = useToast();
  const handleReopen = async () => {
    try {
      await transition.mutateAsync({ id: sub.id, toState: "QC_REVIEWING" });
      toast.success("Đã mở lại", sub.video_title);
      onDone();
    } catch { toast.error("Lỗi", "Không thể mở lại"); }
  };
  return (
    <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: `${C.red}08` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>Yêu cầu bị từ chối. Mở lại để xem xét lại?</span>
        <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => void handleReopen()} disabled={transition.isPending}
          style={{ color: C.amber, borderColor: C.amber }}>
          Mở lại xem xét
        </Button>
      </div>
    </div>
  );
}

// ── Provision Panel — cấp kênh cho QC_APPROVED ───────────────
function ProvisionPanel({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const provision = useProvisionSubmission();
  const transition = useTransitionSubmission();
  const toast = useToast();
  const { data: cmsData } = useCmsList({ limit: 100, status: "Active" });
  const cmsList = cmsData?.items ?? [];

  const [ytId,      setYtId]      = useState("");
  const [channelName, setChannelName] = useState(sub.channel_name ?? sub.video_title ?? "");
  const [cmsId,     setCmsId]     = useState("");
  const [emailAccess, setEmailAccess] = useState("");
  const [password,    setPassword]    = useState("");
  const [showForm,  setShowForm]  = useState(false);

  const handleProvision = async () => {
    if (!cmsId) { toast.warning("Thiếu thông tin", "Chọn CMS"); return; }
    try {
      const res = await provision.mutateAsync({ id: sub.id, channelData: { ytId: ytId.trim() || undefined, cmsId, name: channelName.trim() || sub.video_title, emailAccess: emailAccess || undefined, password: password || undefined } });
      toast.success("Cấp kênh thành công", res.channel.name);
      onDone();
    } catch (err) { toast.error("Lỗi cấp kênh", err instanceof Error ? err.message : ""); }
  };

  const handleMarkFailed = async () => {
    try {
      await transition.mutateAsync({ id: sub.id, toState: "PROVISIONING_FAILED", note: "Cấp kênh thất bại" });
      toast.warning("Đã đánh dấu thất bại", sub.video_title);
      onDone();
    } catch { toast.error("Lỗi", ""); }
  };

  if (sub.workflow_state === "CHANNEL_PROVISIONING") {
    return (
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: `${C.purple}08` }}>
        <div style={{ fontSize: 12, color: C.purple, display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={13} /> Đang trong quá trình cấp kênh...
        </div>
      </div>
    );
  }

  if (sub.workflow_state === "PROVISIONING_FAILED") {
    return (
      <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: `${C.red}08` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.red }}>Cấp kênh thất bại.</span>
          <Button variant="ghost" size="sm" icon={<RotateCcw size={13} />} onClick={() => { setShowForm(true); }}
            style={{ color: C.amber, borderColor: C.amber }}>Thử lại</Button>
        </div>
        {showForm && renderForm()}
      </div>
    );
  }

  // QC_APPROVED
  return (
    <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, background: `${C.teal}08` }}>
      {!showForm ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: C.textSub }}>Yêu cầu đã được duyệt. Tiến hành cấp kênh?</span>
          <Button variant="primary" size="sm" icon={<Tv size={13} />} onClick={() => setShowForm(true)}>
            Cấp kênh
          </Button>
        </div>
      ) : renderForm()}
    </div>
  );

  function renderForm() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>YouTube Channel ID <span style={{ color: C.textMuted, fontStyle: "italic" }}>(UC... — để trống nếu chưa có)</span></div>
            <input value={ytId} onChange={(e) => setYtId(e.target.value)} placeholder="UCxxxxxxxxxxxxxxxxxxxx"
              style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Tên kênh</div>
            <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="Tên kênh..."
              style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>CMS *</div>
            <select value={cmsId} onChange={(e) => setCmsId(e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none" }}>
              <option value="">-- Chọn CMS --</option>
              {cmsList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Truy cập mail</div>
            <input value={emailAccess} onChange={(e) => setEmailAccess(e.target.value)} placeholder="email@gmail.com"
              style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>Password</div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu ban đầu" autoComplete="off"
              style={{ width: "100%", padding: "7px 10px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Hủy</Button>
          <Button variant="primary" size="sm" icon={<Tv size={13} />}
            loading={provision.isPending} onClick={() => void handleProvision()}>
            Xác nhận cấp kênh
          </Button>
          {sub.workflow_state === "QC_APPROVED" && (
            <Button variant="ghost" size="sm" icon={<XCircle size={13} />}
              onClick={() => void handleMarkFailed()} disabled={transition.isPending}
              style={{ color: C.red, borderColor: C.red, marginLeft: "auto" }}>
              Đánh dấu thất bại
            </Button>
          )}
        </div>
      </div>
    );
  }
}

// ── Submission card ───────────────────────────────────────────
function SubmissionCard({ sub }: { sub: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATE_CFG[sub.workflow_state];

  const showReviewPanel   = sub.workflow_state === "SUBMITTED" || sub.workflow_state === "QC_REVIEWING";
  const showRejectedPanel = sub.workflow_state === "QC_REJECTED";
  const showProvisionPanel = sub.workflow_state === "QC_APPROVED" || sub.workflow_state === "CHANNEL_PROVISIONING" || sub.workflow_state === "PROVISIONING_FAILED";

  return (
    <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: SHADOW.sm, marginBottom: 10 }}>
      {/* Header row */}
      <div onClick={() => setExpanded((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", transition: "background .12s" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      >
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.purple}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileVideo size={15} color={C.purple} />
        </div>
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
                  <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{sub.description}</div>
                </div>
              )}
              {sub.admin_note && (
                <div style={{ marginTop: 8, padding: "8px 12px", background: `${C.amber}15`, borderRadius: RADIUS.sm, borderLeft: `3px solid ${C.amber}` }}>
                  <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginBottom: 2 }}>GHI CHÚ QC</div>
                  <div style={{ fontSize: 12, color: C.text }}>{sub.admin_note}</div>
                </div>
              )}
              {sub.workflow_state === "ACTIVE" && sub.channel_id && (
                <ChannelCredBox channelId={sub.channel_id} />
              )}
            </div>
            <div>
              <div style={{ padding: "12px 18px 4px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Lịch sử</div>
              <LogPanel id={sub.id} />
            </div>
          </div>

          {showReviewPanel   && <ReviewPanel    sub={sub} onDone={() => setExpanded(false)} />}
          {showRejectedPanel && <RejectedPanel  sub={sub} onDone={() => setExpanded(false)} />}
          {showProvisionPanel && <ProvisionPanel sub={sub} onDone={() => setExpanded(false)} />}
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
type TabKey = "all" | "provision" | "rejected" | "reviewing" | "pending" | "active";

export default function QcQueuePage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const { data, isLoading, refetch } = useSubmissionList({ search: search || undefined, limit: 200 });
  const items = data?.items ?? [];

  const submitted    = items.filter((s) => s.workflow_state === "SUBMITTED").length;
  const reviewing    = items.filter((s) => s.workflow_state === "QC_REVIEWING").length;
  const rejected     = items.filter((s) => s.workflow_state === "QC_REJECTED").length;
  const approved     = items.filter((s) => s.workflow_state === "QC_APPROVED").length;
  const provisioning = items.filter((s) => s.workflow_state === "CHANNEL_PROVISIONING" || s.workflow_state === "PROVISIONING_FAILED").length;
  const active       = items.filter((s) => s.workflow_state === "ACTIVE").length;

  const tabItems: Record<TabKey, Submission[]> = {
    all:       items.filter((s) => s.workflow_state === "SUBMITTED" || s.workflow_state === "QC_REVIEWING"),
    pending:   items.filter((s) => s.workflow_state === "SUBMITTED"),
    reviewing: items.filter((s) => s.workflow_state === "QC_REVIEWING"),
    rejected:  items.filter((s) => s.workflow_state === "QC_REJECTED"),
    provision: items.filter((s) => s.workflow_state === "QC_APPROVED" || s.workflow_state === "CHANNEL_PROVISIONING" || s.workflow_state === "PROVISIONING_FAILED"),
    active:    items.filter((s) => s.workflow_state === "ACTIVE"),
  };

  const tabs: Array<{ key: TabKey; label: string; count: number; color: string }> = [
    { key: "all",       label: "Hàng chờ QC",  count: submitted + reviewing,  color: C.blue   },
    { key: "provision", label: "Cấp kênh",      count: approved + provisioning, color: C.teal   },
    { key: "active",    label: "Hoạt động",     count: active,                 color: C.green  },
    { key: "rejected",  label: "Từ chối",       count: rejected,               color: C.red    },
    { key: "reviewing", label: "Đang xem xét",  count: reviewing,              color: C.amber  },
    { key: "pending",   label: "Chờ duyệt",     count: submitted,              color: C.purple },
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Chờ duyệt",      value: submitted,   color: C.blue   },
          { label: "Đang xem xét",   value: reviewing,   color: C.amber  },
          { label: "Từ chối",         value: rejected,    color: C.red    },
          { label: "Chờ cấp kênh",   value: approved,    color: C.teal   },
          { label: "Đang cấp / lỗi", value: provisioning,color: C.purple },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "14px 16px", boxShadow: SHADOW.sm }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 3, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: 3 }}>
          {tabs.map(({ key, label, count, color }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              style={{ padding: "5px 14px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
                background: activeTab === key ? color : "transparent",
                color: activeTab === key ? "#fff" : C.textSub,
                transition: "all .15s", fontWeight: activeTab === key ? 600 : 400 }}>
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

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : tabItems[activeTab].length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <ClipboardCheck size={40} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14 }}>
            {activeTab === "rejected"  ? "Không có yêu cầu bị từ chối" :
             activeTab === "provision" ? "Không có yêu cầu chờ cấp kênh" :
             activeTab === "reviewing" ? "Không có yêu cầu đang xem xét" :
             activeTab === "pending"   ? "Không có yêu cầu chờ duyệt" :
             "Không có yêu cầu nào trong hàng chờ"}
          </div>
        </div>
      ) : (
        tabItems[activeTab].map((sub) => <SubmissionCard key={sub.id} sub={sub} />)
      )}
    </div>
  );
}
