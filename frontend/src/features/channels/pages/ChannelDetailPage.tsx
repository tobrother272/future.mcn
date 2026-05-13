import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, CheckCircle, AlertCircle, Youtube, ExternalLink } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { C } from "@/styles/theme";
import { Button, Card, Pill, StatusDot, Modal, EmptyState } from "@/components/ui";
import { useChannel, useChannelVideos, useImportChannelVideos, useChannelAnalytics } from "@/api/channels.api";
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
        <div onClick={() => fileRef.current?.click()} style={{
          border: `2px dashed ${C.border}`, borderRadius: 10, padding: "20px 16px",
          textAlign: "center", cursor: "pointer",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <Upload size={22} color={C.textMuted} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, color: C.textSub }}>
            {fileName ? <strong style={{ color: C.text }}>{fileName}</strong> : "Click để chọn file CSV"}
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

// ── Main Page ─────────────────────────────────────────────────
export default function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("30");
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
    : (PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? "30 ngày");

  const { data: ch, isLoading } = useChannel(id!);
  const { data: analytics } = useChannelAnalytics(id!, params);
  const { data: videosData, isLoading: videosLoading } = useChannelVideos(id!, {
    limit: VIDEO_LIMIT,
    offset: videoPage * VIDEO_LIMIT,
  });

  if (isLoading) return <div style={{ padding: 24, color: C.textSub }}>Đang tải...</div>;
  if (!ch) return <div style={{ padding: 24, color: C.red }}>Kênh không tồn tại</div>;

  const analyticsItems = analytics?.items ?? [];
  const summary = analytics?.summary;

  const chartData = analyticsItems.map((r) => ({
    date: fmtDate(r.date),
    revenue: Number(r.revenue),
    views: Number(r.views),
    engaged: Number(r.engaged_views),
    watch_h: Number(r.watch_time_hours),
  })).reverse(); // oldest → newest for chart

  const totalRevenue = summary?.total_revenue ?? 0;
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
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Youtube size={20} color={C.red} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{ch.name}</h1>
            <StatusDot status={ch.status} />
            <StatusDot status={ch.monetization} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {ch.yt_id && (
              <a href={`https://youtube.com/channel/${ch.yt_id}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: C.blue, display: "flex", alignItems: "center", gap: 4 }}>
                {ch.yt_id} <ExternalLink size={10} />
              </a>
            )}
            {ch.health && <StatusDot status={ch.health} />}
            {ch.strikes > 0 && (
              <Pill color="red">{ch.strikes} strike{ch.strikes > 1 ? "s" : ""}</Pill>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, textAlign: "right" }}>
          <div>CMS: <span style={{ color: C.text, fontWeight: 600 }}>{ch.cms_name ?? "—"}</span></div>
          <div style={{ marginTop: 2 }}>Partner: <span style={{ color: C.text }}>{ch.partner_name ?? "—"}</span></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Subscribers",  value: fmt(ch.subscribers),           color: C.purple },
          { label: "Views/tháng",  value: fmt(ch.monthly_views),          color: C.blue },
          { label: "Revenue/tháng",value: fmtCurrency(ch.monthly_revenue),color: C.amber },
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

      {/* Analytics Chart + Table */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Doanh thu theo ngày</div>
            {summary && analyticsItems.length > 0 && (
              <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
                {[
                  { label: "Views", value: fmt(summary.total_views), color: C.blue },
                  { label: "Engaged", value: fmt(summary.total_engaged), color: C.cyan },
                  { label: "Watch (h)", value: Number(summary.total_watch_hours).toFixed(1), color: C.purple },
                  { label: "Revenue", value: fmtCurrency(summary.total_revenue), color: C.amber },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <span style={{ fontSize: 10, color: C.textMuted }}>{label} </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {PERIOD_OPTIONS.map((opt) => (
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
                <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
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
                      <td style={{ padding: "6px 12px", color: C.blue,    textAlign: "right" }}>{fmt(row.views)}</td>
                      <td style={{ padding: "6px 12px", color: C.cyan,    textAlign: "right" }}>{fmt(row.engaged_views)}</td>
                      <td style={{ padding: "6px 12px", color: C.textSub, textAlign: "right" }}>{Number(row.watch_time_hours).toFixed(1)}</td>
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
                        {Number(v.watch_time_hours).toFixed(1)}
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
