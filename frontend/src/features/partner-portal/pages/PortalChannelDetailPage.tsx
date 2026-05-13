import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Tv2, AlertTriangle, Eye, DollarSign, Users, Building2,
  ExternalLink, BarChart2, Hash, Clock, Youtube, Film,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill, StatusDot, EmptyState } from "@/components/ui";
import { useChannel, useChannelAnalytics, useChannelVideos } from "@/api/channels.api";
import { fmt, fmtCurrency, fmtDate } from "@/lib/format";
import {
  PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey,
} from "@/lib/periods";

type Metric = "revenue" | "views";

const METRIC_CFG = {
  revenue: { label: "Doanh thu", color: C.amber },
  views:   { label: "Lượt xem",  color: C.blue  },
} as const;

// ── Period filter bar ───────────────────────────────────────
function PeriodBar({
  periodKey, fromDate, toDate,
  onSelectPeriod, onChangeFrom, onChangeTo, onClearRange,
}: {
  periodKey: PeriodKey;
  fromDate: string;
  toDate: string;
  onSelectPeriod: (k: PeriodKey) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onClearRange: () => void;
}) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6,
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
      padding: "10px 12px", boxShadow: SHADOW.sm,
    }}>
      {PERIOD_OPTIONS.map((opt) => {
        const active = !fromDate && periodKey === opt.key;
        return (
          <Button
            key={opt.key}
            size="sm"
            variant={active ? "primary" : "secondary"}
            onClick={() => onSelectPeriod(opt.key)}
          >
            {opt.label}
          </Button>
        );
      })}
      <span style={{ width: 1, height: 22, background: C.border, margin: "0 4px" }} />
      <span style={{ fontSize: 11, color: C.textMuted }}>Từ</span>
      <input type="date" value={fromDate} max={toDate || undefined}
        onChange={(e) => onChangeFrom(e.target.value)}
        style={{ height: 30, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: C.bgHover, color: C.text, padding: "0 8px", fontSize: 12 }}
      />
      <span style={{ fontSize: 11, color: C.textMuted }}>→</span>
      <input type="date" value={toDate} min={fromDate || undefined}
        onChange={(e) => onChangeTo(e.target.value)}
        style={{ height: 30, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: C.bgHover, color: C.text, padding: "0 8px", fontSize: 12 }}
      />
      {fromDate && (
        <Button size="sm" variant="ghost" onClick={onClearRange}>Xoá khoảng</Button>
      )}
    </div>
  );
}

// ── KPI tile ─────────────────────────────────────────────────
function Kpi({
  icon, label, value, color = C.text,
}: { icon: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: SHADOW.sm,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: RADIUS.sm,
        background: `${color}20`, color,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════
export default function PortalChannelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [periodKey, setPeriodKey] = useState<PeriodKey>("30");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState(todayInputDate());
  const [metric, setMetric]       = useState<Metric>("revenue");
  const [videoPage, setVideoPage] = useState(0);
  const VIDEO_LIMIT = 50;

  const { data: ch, isLoading, error } = useChannel(id ?? "");

  const activeParams = useMemo(() =>
    fromDate && toDate ? { from: fromDate, to: toDate } : periodToParams(periodKey),
    [periodKey, fromDate, toDate]
  );
  const { data: analytics, isLoading: analyticsLoading } = useChannelAnalytics(id ?? "", activeParams);
  const { data: videosData, isLoading: videosLoading } = useChannelVideos(id ?? "", {
    limit: VIDEO_LIMIT,
    offset: videoPage * VIDEO_LIMIT,
  });

  const periodLabel = useMemo(() => {
    if (fromDate && toDate) return `${fromDate} → ${toDate}`;
    return PERIOD_OPTIONS.find((o) => o.key === periodKey)?.label ?? `${periodKey} ngày`;
  }, [periodKey, fromDate, toDate]);

  if (isLoading) {
    return <div style={{ padding: 32, color: C.textSub }}>Đang tải...</div>;
  }
  if (error || !ch) {
    return (
      <div style={{ padding: 32 }}>
        <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate("/portal/channels")}>
          Danh sách kênh
        </Button>
        <div style={{ marginTop: 24, color: C.red, fontSize: 14 }}>
          Không tìm thấy kênh hoặc bạn không có quyền truy cập.
        </div>
      </div>
    );
  }

  const items     = analytics?.items ?? [];
  const summary   = analytics?.summary;
  const sortedAsc = [...items].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const chartData = sortedAsc.map((r) => ({
    date:    fmtDate(r.date),
    revenue: Number(r.revenue ?? 0),
    views:   Number(r.views   ?? 0),
  }));

  const cfg = METRIC_CFG[metric];

  const videos      = videosData?.items ?? [];
  const totalVideos = videosData?.total ?? 0;
  const totalPages  = Math.max(1, Math.ceil(totalVideos / VIDEO_LIMIT));

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

      {/* Back link */}
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate("/portal/channels")}>
        Danh sách kênh
      </Button>

      {/* ── Channel header ─────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap", margin: "16px 0 24px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: `${C.blue}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Tv2 size={24} color={C.blue} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>{ch.name}</h1>
              <Pill color={ch.status === "Active" ? "green" : ch.status === "Suspended" ? "amber" : "red"}>
                {ch.status}
              </Pill>
              <Pill color={ch.monetization === "On" ? "green" : "red"}>
                Monetize {ch.monetization}
              </Pill>
              {ch.strikes > 0 && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  fontSize: 11, fontWeight: 700,
                  background: `${C.red}20`, color: C.red,
                  padding: "3px 8px", borderRadius: 999,
                }}>
                  <AlertTriangle size={11} />{ch.strikes} strike{ch.strikes > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: C.textSub }}>
              {ch.yt_id && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "monospace" }}>
                  <Hash size={11} />{ch.yt_id}
                </span>
              )}
              {ch.cms_name && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Building2 size={11} />CMS: <strong style={{ color: C.text }}>{ch.cms_name}</strong>
                </span>
              )}
              {ch.partner_name && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Building2 size={11} />Đối tác: <strong style={{ color: C.text }}>{ch.partner_name}</strong>
                </span>
              )}
              {ch.link_date && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} />Link: {fmtDate(ch.link_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {ch.yt_id && (
          <a
            href={`https://www.youtube.com/channel/${ch.yt_id}`}
            target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
              padding: "7px 14px", fontSize: 12, color: C.blue, textDecoration: "none",
            }}
          >
            <ExternalLink size={12} />Mở YouTube
          </a>
        )}
      </div>

      {/* ── Channel KPI strip ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <Kpi
          icon={<Users size={16} />}
          label="Subscribers"
          value={fmt(ch.subscribers)}
          color={C.purple}
        />
        <Kpi
          icon={<Eye size={16} />}
          label="Lượt xem (tháng)"
          value={fmt(ch.monthly_views)}
          color={C.blue}
        />
        <Kpi
          icon={<Eye size={16} />}
          label="Tổng lượt xem"
          value={fmt(ch.total_views)}
          color={C.cyan}
        />
        <Kpi
          icon={<DollarSign size={16} />}
          label="Doanh thu (tháng)"
          value={fmtCurrency(ch.monthly_revenue)}
          color={C.amber}
        />
        <Kpi
          icon={<DollarSign size={16} />}
          label="Doanh thu kỳ trước"
          value={fmtCurrency(ch.last_revenue)}
          color={C.green}
        />
      </div>

      {/* ══════ LỊCH SỬ DOANH THU ══════ */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textSub, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: ".06em" }}>
          Lịch sử doanh thu / lượt xem
        </h2>
      </div>

      <div style={{ marginBottom: 14 }}>
        <PeriodBar
          periodKey={periodKey}
          fromDate={fromDate}
          toDate={toDate}
          onSelectPeriod={(k) => { setPeriodKey(k); setFromDate(""); }}
          onChangeFrom={setFromDate}
          onChangeTo={setToDate}
          onClearRange={() => setFromDate("")}
        />
      </div>

      {/* Chart period KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        <Kpi icon={<DollarSign size={16} />} label={`Tổng doanh thu · ${periodLabel}`} value={fmtCurrency(summary?.total_revenue ?? 0)} color={C.amber} />
        <Kpi icon={<Eye size={16} />}        label={`Tổng lượt xem · ${periodLabel}`} value={fmt(summary?.total_views ?? 0)}            color={C.blue} />
        <Kpi icon={<Eye size={16} />}        label="Engaged views"                    value={fmt(summary?.total_engaged ?? 0)}          color={C.cyan} />
        <Kpi icon={<Clock size={16} />}      label="Watch time (giờ)"                 value={fmt(Math.round(summary?.total_watch_hours ?? 0))} color={C.purple} />
      </div>

      {/* Metric toggle + chart */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
        padding: 16, boxShadow: SHADOW.sm, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
            Biến động {cfg.label.toLowerCase()} ({periodLabel})
          </h3>
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="sm" variant={metric === "revenue" ? "primary" : "secondary"} onClick={() => setMetric("revenue")}>
              Doanh thu
            </Button>
            <Button size="sm" variant={metric === "views" ? "primary" : "secondary"} onClick={() => setMetric("views")}>
              Lượt xem
            </Button>
          </div>
        </div>

        {analyticsLoading ? (
          <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>
            Đang tải...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8 }}>
            <BarChart2 size={32} color={C.textMuted} />
            <div style={{ fontSize: 14 }}>Chưa có dữ liệu trong khoảng thời gian này</div>
            <div style={{ fontSize: 12 }}>Dữ liệu xuất hiện sau khi sync analytics</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}80`} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => {
                  if (metric === "revenue") return v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v.toFixed(0)}`;
                  return v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`;
                }}
              />
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.text }}
                itemStyle={{ color: C.text }}
                formatter={(v: number) => [
                  metric === "revenue" ? fmtCurrency(v) : fmt(v),
                  cfg.label,
                ]}
              />
              <Line type="monotone" dataKey={metric} stroke={cfg.color} strokeWidth={2.5} dot={false} name={cfg.label} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detailed daily table */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, overflow: "hidden", boxShadow: SHADOW.sm }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
            Chi tiết theo ngày ({items.length} ngày · {periodLabel})
          </h3>
          <span style={{ fontSize: 11, color: C.textMuted }}>
            Mới nhất ở trên
          </span>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            Chưa có dữ liệu chi tiết trong khoảng thời gian này
          </div>
        ) : (
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead style={{ position: "sticky", top: 0, background: C.bgHover, zIndex: 1 }}>
                <tr>
                  {["Ngày", "Doanh thu", "Lượt xem", "Engaged Views", "Watch Time (h)", "Avg View Duration"].map((h, i) => (
                    <th key={h} style={{
                      padding: "8px 14px",
                      textAlign: i === 0 || i === 5 ? "left" : "right",
                      fontSize: 11, color: C.textMuted, fontWeight: 700,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.date} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 14px", color: C.textSub }}>{fmtDate(r.date)}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", color: C.amber, fontWeight: 600 }}>{fmtCurrency(Number(r.revenue ?? 0))}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", color: C.text }}>{fmt(Number(r.views ?? 0))}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", color: C.cyan }}>{fmt(Number(r.engaged_views ?? 0))}</td>
                    <td style={{ padding: "8px 14px", textAlign: "right", color: C.purple }}>{Number(r.watch_time_hours ?? 0).toFixed(1)}</td>
                    <td style={{ padding: "8px 14px", color: C.textMuted, fontFamily: "monospace" }}>{r.avg_view_duration ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════ DANH SÁCH VIDEO ══════ */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
        overflow: "hidden", boxShadow: SHADOW.sm, marginTop: 16,
      }}>
        <div style={{
          padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Film size={14} color={C.purple} />
            <h3 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>
              Danh sách video
              {totalVideos > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, color: C.textMuted, fontWeight: 500 }}>
                  ({totalVideos})
                </span>
              )}
            </h3>
          </div>
          {totalPages > 1 && (
            <span style={{ fontSize: 11, color: C.textMuted }}>
              Trang {videoPage + 1} / {totalPages}
            </span>
          )}
        </div>

        {videosLoading ? (
          <div style={{ padding: 28, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
            Đang tải...
          </div>
        ) : videos.length === 0 ? (
          <EmptyState
            icon={<Youtube size={32} />}
            title="Chưa có video nào"
            description="Dữ liệu video sẽ xuất hiện sau khi MCN import từ YouTube Studio"
          />
        ) : (
          <>
            <div style={{ overflowX: "auto", maxHeight: 560, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead style={{ position: "sticky", top: 0, background: C.bgHover, zIndex: 1 }}>
                  <tr>
                    {["Tiêu đề", "Video ID", "Ngày đăng", "Lượt xem", "Watch time (h)", "Avg duration", "Doanh thu"].map((h, i) => (
                      <th key={h} style={{
                        padding: "8px 14px",
                        textAlign: i >= 3 && i !== 5 ? "right" : "left",
                        fontSize: 11, fontWeight: 700, color: C.textMuted,
                        whiteSpace: "nowrap",
                      }}>
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
                      <td style={{ padding: "8px 14px", maxWidth: 320 }}>
                        <div style={{ fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {v.title || "—"}
                        </div>
                      </td>
                      <td style={{ padding: "8px 14px" }}>
                        {v.yt_video_id ? (
                          <a href={`https://youtube.com/watch?v=${v.yt_video_id}`} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 11, color: C.blue, fontFamily: "monospace", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {v.yt_video_id} <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span style={{ color: C.textMuted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "8px 14px", color: C.textSub, whiteSpace: "nowrap" }}>
                        {v.published_at ? fmtDate(v.published_at) : "—"}
                      </td>
                      <td style={{ padding: "8px 14px", color: C.blue, textAlign: "right" }}>{fmt(v.views)}</td>
                      <td style={{ padding: "8px 14px", color: C.purple, textAlign: "right" }}>
                        {Number(v.watch_time_hours).toFixed(1)}
                      </td>
                      <td style={{ padding: "8px 14px", color: C.textSub, fontFamily: "monospace" }}>
                        {v.avg_view_duration ?? "—"}
                      </td>
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
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 16px", borderTop: `1px solid ${C.border}`,
              }}>
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  Trang {videoPage + 1} / {totalPages} · {totalVideos} video
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button size="sm" variant="ghost" disabled={videoPage === 0}
                    onClick={() => setVideoPage((p) => Math.max(0, p - 1))}>
                    ← Trước
                  </Button>
                  <Button size="sm" variant="ghost" disabled={videoPage >= totalPages - 1}
                    onClick={() => setVideoPage((p) => p + 1)}>
                    Sau →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Status footer */}
      {ch.last_sync_analytic && (
        <div style={{ marginTop: 14, fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
          <StatusDot status="Active" />
          Lần sync analytics gần nhất: {new Date(ch.last_sync_analytic).toLocaleString("vi-VN")}
        </div>
      )}
    </div>
  );
}
