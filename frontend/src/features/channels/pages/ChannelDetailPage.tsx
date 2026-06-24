import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, CheckCircle, AlertCircle, Youtube, ExternalLink, Eye, EyeOff } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { C } from "@/styles/theme";
import { Button, Card, Pill, StatusDot, Modal, EmptyState } from "@/components/ui";
import { useChannel, useChannelVideos, useImportChannelVideos, useChannelAnalytics, useChannelCredentials, useUpdateChannelCredentials } from "@/api/channels.api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/stores/notificationStore";
import { fmt, fmtCurrency, fmtDate } from "@/lib/format";
import { PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey } from "@/lib/periods";

// ── CSV parser for YouTube Studio video report ────────────────
// Columns: Video title, Video ID, Views, Watch time (hours), Average view duration, Revenue
function parseVideoCSV(text: string): Array<Record<string, unknown>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  function splitLine(line: string): string[] {
    const result: string[] = [];
    let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { result.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idxTitle    = headers.findIndex((h) => h.includes("title") || h === "video title");
  const idxVideoId  = headers.findIndex((h) => h === "video id" || h === "video");
  const idxViews    = headers.findIndex((h) => h === "views");
  const idxWatchTime= headers.findIndex((h) => h.includes("watch time"));
  const idxAvgDur   = headers.findIndex((h) => h.includes("average view"));
  const idxRevenue  = headers.findIndex((h) => h.includes("revenue"));
  const idxDate     = headers.findIndex((h) => h.includes("publish") || h.includes("date"));

  const rows: Array<Record<string, unknown>> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const title = idxTitle >= 0 ? cols[idxTitle] : "";
    if (!title || title.toLowerCase() === "total") continue;

    rows.push({
      title:            title,
      yt_video_id:      idxVideoId  >= 0 ? cols[idxVideoId]  || null : null,
      views:            idxViews    >= 0 ? Number(cols[idxViews]?.replace(/[^0-9.]/g, "")) || 0 : 0,
      watch_time_hours: idxWatchTime>= 0 ? Number(cols[idxWatchTime]?.replace(/[^0-9.]/g, "")) || 0 : 0,
      avg_view_duration:idxAvgDur   >= 0 ? cols[idxAvgDur] || null : null,
      revenue:          idxRevenue  >= 0 ? Number(cols[idxRevenue]?.replace(/[^0-9.]/g, "")) || 0 : 0,
      published_at:     idxDate     >= 0 ? cols[idxDate] || null : null,
    });
  }
  return rows;
}

// ── Import Video Modal ────────────────────────────────────────
function ImportVideoModal({ open, onClose, channelId }: { open: boolean; onClose: () => void; channelId: string }) {
  const toast = useToast();
  const importMut = useImportChannelVideos(channelId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number; errors: Array<{ row: number; message: string }> } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setRows(parseVideoCSV(ev.target?.result as string));
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    try {
      const res = await importMut.mutateAsync(rows);
      setResult(res);
      toast.success("Import video thành công", `${res.created} tạo mới, ${res.updated} cập nhật`);
    } catch (err) {
      toast.error("Import thất bại", err instanceof Error ? err.message : "");
    }
  };

  const handleClose = () => {
    setRows([]); setFileName(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Video từ CSV" width={560}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>Đóng</Button>
          {rows.length > 0 && !result && (
            <Button variant="primary" size="sm" icon={<Upload size={14} />}
              loading={importMut.isPending} onClick={() => void handleImport()}>
              Import {rows.length} video
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Dropzone */}
        <div onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = `${C.blue}10`; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.background = "transparent";
            const file = e.dataTransfer.files[0];
            if (!file) return;
            setFileName(file.name);
            setResult(null);
            const reader = new FileReader();
            reader.onload = (ev) => setRows(parseVideoCSV(ev.target?.result as string));
            reader.readAsText(file, "utf-8");
          }}
          style={{
            border: `2px dashed ${C.border}`, borderRadius: 10, padding: "20px 16px",
            textAlign: "center", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <Upload size={22} color={C.textMuted} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, color: C.textSub }}>
            {fileName ? <strong style={{ color: C.text }}>{fileName}</strong> : "Kéo thả hoặc click để chọn file CSV"}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Cột: Video title, Video ID, Views, Watch time, Revenue
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div style={{ background: C.bgHover, borderRadius: 8, overflow: "auto", maxHeight: 200, fontSize: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Tiêu đề","Video ID","Views","Revenue"].map((h) => (
                    <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 6).map((r, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "5px 10px", color: C.text, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {String(r.title ?? "")}
                    </td>
                    <td style={{ padding: "5px 10px", color: C.textMuted, fontFamily: "monospace", fontSize: 11 }}>
                      {String(r.yt_video_id ?? "—")}
                    </td>
                    <td style={{ padding: "5px 10px", color: C.blue }}>{fmt(r.views as number)}</td>
                    <td style={{ padding: "5px 10px", color: C.amber }}>${Number(r.revenue ?? 0).toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 6 && (
              <div style={{ padding: "5px 10px", color: C.textMuted }}>...và {rows.length - 6} video nữa</div>
            )}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: `${C.green}15`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color={C.green} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{result.created}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Tạo mới</div>
                </div>
              </div>
              <div style={{ flex: 1, background: `${C.blue}15`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color={C.blue} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{result.updated}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Cập nhật</div>
                </div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: `${C.red}10`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <AlertCircle size={14} color={C.red} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>{result.errors.length} lỗi</span>
                </div>
                {result.errors.map((e) => (
                  <div key={e.row} style={{ fontSize: 11, color: C.textSub }}>Dòng {e.row}: {e.message}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Credentials Box (employee only) ──────────────────────────
function CredentialsBox({ channelId }: { channelId: string }) {
  const { data: creds, isLoading } = useChannelCredentials(channelId);
  const update = useUpdateChannelCredentials(channelId);
  const toast  = useToast();

  const [editing, setEditing]     = useState(false);
  const [showPwd, setShowPwd]     = useState(false);
  const [emailVal, setEmailVal]   = useState("");
  const [pwdVal, setPwdVal]       = useState("");

  const startEdit = () => {
    setEmailVal(creds?.email_access ?? "");
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

  if (isLoading) return null;

  return (
    <div style={{
      background: `${C.amber}0d`, border: `1px solid ${C.amber}30`, borderRadius: 10,
      padding: "12px 16px", marginBottom: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: editing ? 12 : 0 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase" }}>Thông tin truy cập kênh</span>
        {!editing && (
          <button onClick={startEdit} style={{ fontSize: 11, color: C.amber, background: `${C.amber}20`, border: `1px solid ${C.amber}40`, borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>
            {creds?.email_access || creds?.password ? "Chỉnh sửa" : "+ Thêm"}
          </button>
        )}
      </div>

      {!editing && (
        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: (creds?.email_access || creds?.password) ? 8 : 0 }}>
          {creds?.email_access && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>Mail:</span>
              <span style={{ fontSize: 12, color: C.text, fontFamily: "monospace" }}>{creds.email_access}</span>
            </div>
          )}
          {creds?.password && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, color: C.textMuted }}>Password:</span>
              <span style={{ fontSize: 12, color: C.text, fontFamily: "monospace", letterSpacing: showPwd ? 0 : 2 }}>
                {showPwd ? creds.password : "•".repeat(Math.min(creds.password.length, 12))}
              </span>
              <button onClick={() => setShowPwd(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: C.textMuted, display: "flex" }}>
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          )}
          {!creds?.email_access && !creds?.password && (
            <span style={{ fontSize: 11, color: C.textMuted }}>Chưa có thông tin truy cập</span>
          )}
        </div>
      )}

      {editing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted, width: 60 }}>Email</span>
            <input
              value={emailVal} onChange={e => setEmailVal(e.target.value)}
              placeholder="email@example.com"
              style={{ flex: 1, padding: "5px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, outline: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted, width: 60 }}>Password</span>
            <div style={{ flex: 1, position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                value={pwdVal} onChange={e => setPwdVal(e.target.value)}
                placeholder={creds?.password ? "Để trống = giữ nguyên" : "Nhập password mới"}
                style={{ width: "100%", padding: "5px 28px 5px 8px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={() => setShowPwd(v => !v)} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}>
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={() => setEditing(false)} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
              Hủy
            </button>
            <button onClick={() => void handleSave()} disabled={update.isPending} style={{ padding: "5px 14px", background: C.amber, border: "none", borderRadius: 6, color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: update.isPending ? 0.6 : 1 }}>
              {update.isPending ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("28");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayInputDate());
  const [importOpen, setImportOpen] = useState(false);
  const [videoPage, setVideoPage] = useState(0);
  const VIDEO_LIMIT = 50;
  const params = fromDate && toDate
    ? { from: fromDate, to: toDate }
    : periodToParams(period);
  const selectedPeriodLabel = fromDate && toDate
    ? `${fromDate} → ${toDate}`
    : (PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? "28 ngày");

  const { data: ch, isLoading } = useChannel(id!);
  const { data: analytics } = useChannelAnalytics(id!, params);
  const { data: videosData, isLoading: videosLoading } = useChannelVideos(id!, {
    limit: VIDEO_LIMIT,
    offset: videoPage * VIDEO_LIMIT,
  });
  const user = useAuthStore((s) => s.user);
  const isEmployee = user?.userType === "employee";
  if (isLoading) return <div style={{ padding: 24, color: C.textSub }}>Đang tải...</div>;
  if (!ch) return <div style={{ padding: 24, color: C.red }}>Kênh không tồn tại</div>;

  const analyticsItems = analytics?.items ?? [];
  const summary = analytics?.summary;
  // For 90/365-day views: use authoritative period summary if available,
  // otherwise fall back to aggregated daily summary.
  const periodSummary = analytics?.period_summary;
  const displaySummary = periodSummary ?? summary;

  const chartData = analyticsItems.map((r) => ({
    date: fmtDate(r.date),
    revenue: Number(r.revenue),
    views: Number(r.views),
    engaged: Number(r.engaged_views),
    watch_h: Number(r.watch_time_hours),
  })).reverse(); // oldest → newest for chart

  const totalRevenue = displaySummary?.total_revenue ?? 0;
  const videos = videosData?.items ?? [];
  const totalVideos = videosData?.total ?? 0;
  const totalPages = Math.ceil(totalVideos / VIDEO_LIMIT);

  return (
    <div style={{ padding: 24 }}>
      <ImportVideoModal open={importOpen} onClose={() => setImportOpen(false)} channelId={id!} />

      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
        Quay lại
      </Button>

      {/* Header */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: "20px 24px", marginBottom: 20,
        display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
      }}>
        {/* Left: name + badges */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <Youtube size={20} color={C.red} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>{ch.name}</h1>
            <StatusDot status={ch.status} />
            <StatusDot status={ch.monetization} />
            {ch.is_unlinked && <Pill color="amber">Unlink</Pill>}
            {ch.strikes > 0 && <Pill color="red">{ch.strikes} strike{ch.strikes > 1 ? "s" : ""}</Pill>}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: ch.is_unlinked ? 10 : 0 }}>
            {ch.yt_id && (
              <a href={`https://youtube.com/channel/${ch.yt_id}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: C.blue, display: "flex", alignItems: "center", gap: 4 }}>
                {ch.yt_id} <ExternalLink size={10} />
              </a>
            )}
            {ch.health && <StatusDot status={ch.health} />}
          </div>

          {ch.is_unlinked && (
            <div style={{ fontSize: 12, color: C.amber, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertCircle size={13} />
              <span>
                Kênh đã unlink khỏi Studio, hệ thống vẫn giữ lịch sử doanh thu.
                {ch.unlinked_at ? ` (CMS ${ch.cms_name ?? ""} - Unlink ngày ${new Date(ch.unlinked_at).toLocaleDateString("vi-VN")})` : ""}
                {ch.unlink_reason === "manual_unlink" ? " · Bỏ gán thủ công" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Right: meta pills */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, alignItems: "flex-end" }}>
          {/* CMS */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>CMS</span>
            <span style={{
              fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
              background: `${C.amber}18`, color: C.amber, border: `1px solid ${C.amber}33`,
            }}>{ch.cms_name ?? "—"}</span>
          </div>
          {/* Partner */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Partner</span>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
              background: ch.partner_name ? `${C.blue}18` : "transparent",
              color: ch.partner_name ? C.blue : C.textMuted,
              border: `1px solid ${ch.partner_name ? C.blue + "33" : C.border}`,
            }}>{ch.partner_name ?? "—"}</span>
          </div>
          {/* Content Owner */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Code</span>
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 6,
              background: ch.content_owner ? `${C.teal}18` : "transparent",
              color: ch.content_owner ? C.teal : C.textMuted,
              border: `1px solid ${ch.content_owner ? C.teal + "33" : C.border}`,
            }}>{ch.content_owner ?? "—"}</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Subscribers",  value: fmt(ch.subscribers),           color: C.purple },
          { label: "Views/tháng",  value: fmt(ch.monthly_views),          color: C.blue },
          { label: "Strikes",      value: String(ch.strikes),             color: ch.strikes > 0 ? C.red : C.green },
          { label: "Videos",       value: String(totalVideos),            color: C.cyan },
          { label: `Revenue ${selectedPeriodLabel}`, value: fmtCurrency(totalRevenue), color: C.amber },
        ].map(({ label, value, color }) => (
          <Card key={label} padding="14px 16px">
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Credentials (employee only) */}
      {isEmployee && (
        <CredentialsBox channelId={id ?? ""} />
      )}

      {/* Analytics Chart + Table */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Doanh thu theo ngày</div>
            {displaySummary && analyticsItems.length > 0 && (
              <div style={{ display: "flex", gap: 16, marginTop: 6, alignItems: "center" }}>
                {[
                  { label: "Views",     value: Number(displaySummary.total_views).toLocaleString("en-US"),                                                             color: C.blue },
                  { label: "Engaged",   value: Number(displaySummary.total_engaged).toLocaleString("en-US"),                                                           color: C.cyan },
                  { label: "Watch (h)", value: Number(displaySummary.total_watch_hours).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }), color: C.purple },
                  { label: "Avg duration", value: displaySummary.avg_view_duration ?? "—",                                                                             color: C.text },
                  { label: "Revenue",   value: fmtCurrency(displaySummary.total_revenue),                                                                               color: C.amber },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <span style={{ fontSize: 10, color: C.textMuted }}>{label} </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
                {periodSummary && (
                  <span title={`Tổng từ YouTube Studio (cập nhật ${periodSummary.captured_date})`}
                    style={{ fontSize: 10, color: C.green, background: `${C.green}22`, borderRadius: 4, padding: "1px 6px", cursor: "default" }}>
                    YT Studio
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {PERIOD_OPTIONS.filter((opt) => !["180", "this_month", "last_month"].includes(opt.key)).map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={period === opt.key ? "primary" : "secondary"}
                onClick={() => {
                  setPeriod(opt.key);
                  setFromDate("");
                }}
              >
                {opt.label}
              </Button>
            ))}
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
              title="Từ ngày"
            />
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
              title="Đến ngày"
            />
          </div>
        </div>

        {chartData.length === 0 ? (
          <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
            Chưa có dữ liệu analytics
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : String(v)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                  formatter={(value: number, name: string) => {
                    if (name === "Revenue ($)") return [`$${value.toFixed(2)}`, name];
                    return [fmt(value), name];
                  }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line yAxisId="left"  type="monotone" dataKey="views"    stroke={C.blue}   strokeWidth={2} dot={false} name="Views" />
                <Line yAxisId="left"  type="monotone" dataKey="engaged"  stroke={C.cyan}   strokeWidth={1.5} dot={false} name="Engaged views" strokeDasharray="4 2" />
                <Line yAxisId="right" type="monotone" dataKey="revenue"  stroke={C.amber}  strokeWidth={2} dot={false} name="Revenue ($)" />
              </LineChart>
            </ResponsiveContainer>

            {/* Daily table */}
            <div style={{ marginTop: 16, overflowX: "auto", maxHeight: 280, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: C.bgHover }}>
                  <tr>
                    {["Ngày", "Views", "Engaged views", "Watch time (h)", "Avg duration", "Revenue"].map((h) => (
                      <th key={h} style={{ padding: "7px 12px", textAlign: h === "Ngày" ? "left" : "right", fontSize: 11, fontWeight: 600, color: C.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analyticsItems.map((row) => (
                    <tr key={row.date} style={{ borderTop: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "6px 12px", color: C.textSub, whiteSpace: "nowrap" }}>{fmtDate(row.date)}</td>
                      <td style={{ padding: "6px 12px", color: C.blue,    textAlign: "right" }}>{Number(row.views).toLocaleString("en-US")}</td>
                      <td style={{ padding: "6px 12px", color: C.cyan,    textAlign: "right" }}>{Number(row.engaged_views).toLocaleString("en-US")}</td>
                      <td style={{ padding: "6px 12px", color: C.textSub, textAlign: "right" }}>{Number(row.watch_time_hours).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                      <td style={{ padding: "6px 12px", color: C.textSub, textAlign: "right" }}>{row.avg_view_duration ?? "—"}</td>
                      <td style={{ padding: "6px 12px", color: C.amber,   textAlign: "right", fontWeight: 600 }}>{fmtCurrency(row.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Video List */}
      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            Danh sách Video
            {totalVideos > 0 && <span style={{ marginLeft: 8, fontSize: 12, color: C.textMuted }}>({totalVideos})</span>}
          </div>
          <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
        </div>

        {videosLoading ? (
          <div style={{ padding: 32, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
        ) : videos.length === 0 ? (
          <EmptyState
            icon={<Youtube size={32} />}
            title="Chưa có video nào"
            description='Import file CSV từ YouTube Studio để thêm dữ liệu video'
          />
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: C.bgHover }}>
                  <tr>
                    {["Tiêu đề", "Video ID", "Ngày đăng", "Views", "Watch time (h)", "Avg duration", "Revenue"].map((h) => (
                      <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted, whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id} style={{ borderTop: `1px solid ${C.border}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "8px 14px", maxWidth: 280 }}>
                        <div style={{ fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.title || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        {v.yt_video_id ? (
                          <a href={`https://youtube.com/watch?v=${v.yt_video_id}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: C.blue, fontFamily: "monospace", display: "flex", alignItems: "center", gap: 3 }}>
                            {v.yt_video_id} <ExternalLink size={9} />
                          </a>
                        ) : (
                          <span style={{ color: C.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 14px", color: C.textSub, whiteSpace: "nowrap" }}>
                        {v.published_at ? fmtDate(v.published_at) : "—"}
                      </td>
                      <td style={{ padding: "8px 14px", color: C.blue, textAlign: "right" }}>{fmt(v.views)}</td>
                      <td style={{ padding: "8px 14px", color: C.textSub, textAlign: "right" }}>
                        {Number(v.watch_time_hours).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </td>
                      <td style={{ padding: "8px 14px", color: C.textSub }}>{v.avg_view_duration ?? "—"}</td>
                      <td style={{ padding: "8px 14px", color: C.amber, fontWeight: 600, textAlign: "right" }}>
                        {fmtCurrency(v.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderTop: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  Trang {videoPage + 1} / {totalPages} ({totalVideos} video)
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button size="sm" variant="ghost" disabled={videoPage === 0} onClick={() => setVideoPage((p) => p - 1)}>← Trước</Button>
                  <Button size="sm" variant="ghost" disabled={videoPage >= totalPages - 1} onClick={() => setVideoPage((p) => p + 1)}>Sau →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
