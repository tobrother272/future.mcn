import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tv2, FileText, AlertTriangle, ShieldCheck, User,
  TrendingUp, CheckCircle, Clock, UploadCloud, ChevronRight,
  Building2, Star, Eye, DollarSign, BarChart2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Pill, Card, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import {
  usePartnerProfile, usePartnerRevenue,
  usePartnerTopChannels, usePartnerBreakdown,
  type PartnerBreakdownRow,
} from "@/api/partners.api";
import { usePartnerContracts } from "@/api/contracts.api";
import { fmtCurrency, fmt, fmtDate } from "@/lib/format";
import {
  PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey,
} from "@/lib/periods";

// ── helpers ──────────────────────────────────────────────────
function ago(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Hôm nay";
  if (d === 1) return "Hôm qua";
  if (d < 30)  return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

const PIE_COLORS = [C.amber, C.blue, C.cyan, C.purple, C.teal, C.green, C.orange, C.red, C.pink];

const METRIC_CFG = {
  revenue: { key: "revenue", label: "Doanh thu", color: C.amber, isCurrency: true },
  views:   { key: "views",   label: "View",      color: C.blue,  isCurrency: false },
} as const;
type MetricKey = keyof typeof METRIC_CFG;

function normalizePieData(rows: PartnerBreakdownRow[] | undefined, topN = 8) {
  const list = (rows ?? [])
    .map((r) => ({ name: r.name ?? "—", revenue: Number(r.revenue ?? 0) }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  if (list.length <= topN) return list;
  const top = list.slice(0, topN);
  const other = list.slice(topN).reduce((s, x) => s + x.revenue, 0);
  return other > 0 ? [...top, { name: "Khác", revenue: other }] : top;
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, color = C.blue,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
      padding: "18px 20px", display: "flex", gap: 14, alignItems: "center",
      boxShadow: SHADOW.sm,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: RADIUS.sm, flexShrink: 0,
        background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Nav shortcut card ─────────────────────────────────────────
function NavCard({
  icon, label, desc, to, color = C.blue,
}: { icon: React.ReactNode; label: string; desc: string; to: string; color?: string }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(to)}
      style={{
        background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
        padding: "16px 18px", cursor: "pointer", transition: "border-color .15s, background .15s",
        display: "flex", alignItems: "center", gap: 14,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
        (e.currentTarget as HTMLDivElement).style.background = C.bgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
        (e.currentTarget as HTMLDivElement).style.background = C.bgCard;
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: RADIUS.sm, flexShrink: 0,
        background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        <div style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>{desc}</div>
      </div>
      <ChevronRight size={14} color={C.textMuted} />
    </div>
  );
}

// ── Section header ───────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textSub, margin: 0, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</h2>
      {action}
    </div>
  );
}

// ── Pie card ─────────────────────────────────────────────────
function BreakdownPie({
  title, rows, currency,
}: { title: string; rows: PartnerBreakdownRow[] | undefined; currency: string }) {
  const data = normalizePieData(rows);
  const total = data.reduce((s, x) => s + x.revenue, 0);
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 16, boxShadow: SHADOW.sm }}>
      <SectionHeader title={title} />
      {data.length === 0 ? (
        <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
          Chưa có dữ liệu trong khoảng thời gian này
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                dataKey="revenue"
                nameKey="name"
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={85}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.text }}
                itemStyle={{ color: C.text }}
                formatter={(v: number, _name: string, item: { payload?: { name?: string } }) => [
                  fmtCurrency(v, currency),
                  item?.payload?.name ?? "—",
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {data.slice(0, 6).map((row, i) => {
              const pct = total > 0 ? (row.revenue / total) * 100 : 0;
              return (
                <div key={row.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</span>
                  </div>
                  <span style={{ fontSize: 11, color: C.textMuted, flexShrink: 0 }}>{pct.toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalHomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";
  const { data: profile, isLoading } = usePartnerProfile(partnerId);
  const { data: contracts = [] } = usePartnerContracts(partnerId);

  // ── Analytics state ─────────────────────────────────────────
  const [periodKey, setPeriodKey]    = useState<PeriodKey>("30");
  const [fromDate, setFromDate]      = useState<string>("");
  const [toDate, setToDate]          = useState<string>(todayInputDate());
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["revenue", "views"]);

  const activeParams = useMemo(() => {
    if (fromDate && toDate) return { from: fromDate, to: toDate };
    return periodToParams(periodKey);
  }, [periodKey, fromDate, toDate]);

  const { data: revenueRows = [] } = usePartnerRevenue(partnerId, activeParams);
  const { data: topChannels = [] } = usePartnerTopChannels(partnerId, { ...activeParams, limit: 10 });
  const { data: childBreakdown }   = usePartnerBreakdown(partnerId, "child", activeParams);
  const { data: cmsBreakdown }     = usePartnerBreakdown(partnerId, "cms",   activeParams);

  const channels  = (profile?.channels  as Array<Record<string,unknown>> | undefined) ?? [];
  const activeChannels    = channels.filter((c) => c.status === "Active").length;
  const monetizedChannels = channels.filter((c) => c.monetization === "On").length;
  const isParent = ((profile?.children as unknown[] | undefined)?.length ?? 0) > 0;
  const recentChannels    = [...channels].sort((a, b) =>
    new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  ).slice(0, 5);
  const recentContracts = [...contracts].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 4);

  const partnerName = user?.userType === "partner"
    ? ((user as { full_name?: string }).full_name ?? user.email)
    : "Đối tác";
  const currency = (profile as Record<string, unknown> | undefined)?.currency as string | undefined ?? "USD";

  // Chart data
  const chartData = revenueRows.map((r) => ({
    date: fmtDate(r.snapshot_date),
    revenue: Number(r.revenue ?? 0),
    views:   Number(r.views   ?? 0),
  }));

  // Period summary
  const periodLabel = (() => {
    if (fromDate && toDate) return `${fromDate} → ${toDate}`;
    const opt = PERIOD_OPTIONS.find((o) => o.key === periodKey);
    return opt?.label ?? `${periodKey} ngày`;
  })();
  const periodTotals = chartData.reduce(
    (acc, r) => ({ revenue: acc.revenue + r.revenue, views: acc.views + r.views }),
    { revenue: 0, views: 0 }
  );

  function selectPeriod(key: PeriodKey) {
    setPeriodKey(key);
    setFromDate("");
  }
  function toggleMetric(m: MetricKey) {
    setSelectedMetrics((prev) => prev.includes(m)
      ? prev.filter((x) => x !== m)
      : [...prev, m]);
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1280, margin: "0 auto" }}>

      {/* ── Welcome banner ─────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.blue}22 0%, ${C.purple}18 100%)`,
        border: `1px solid ${C.blue}40`,
        borderRadius: RADIUS.lg, padding: "24px 28px", marginBottom: 28,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.blueLight, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
            CỔNG THÔNG TIN ĐỐI TÁC
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
            Xin chào, {partnerName} 👋
          </h1>
          {profile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <Building2 size={13} color={C.textSub} />
              <span style={{ fontSize: 13, color: C.textSub }}>{(profile as Record<string,unknown>).name as string}</span>
              <Pill color={profile.status === "Active" ? "green" : "gray"}>
                {profile.status as string}
              </Pill>
              {(profile as Record<string,unknown>).tier && (
                <Pill color="blue">
                  <Star size={10} style={{ marginRight: 3 }} />
                  {(profile as Record<string,unknown>).tier as string}
                </Pill>
              )}
              {isParent && (
                <Pill color="purple">
                  Đối tác cha · {(profile?.children as unknown[]).length} con
                </Pill>
              )}
            </div>
          )}
        </div>
        <div style={{ opacity: 0.15, fontSize: 72 }}>🏢</div>
      </div>

      {/* ── KPI row ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard
          icon={<Tv2 size={18} color={C.blue} />}
          label="Tổng số kênh"
          value={isLoading ? "…" : fmt(channels.length)}
          sub={`${activeChannels} đang hoạt động`}
          color={C.blue}
        />
        <KpiCard
          icon={<CheckCircle size={18} color={C.green} />}
          label="Kênh đã monetize"
          value={isLoading ? "…" : fmt(monetizedChannels)}
          sub={channels.length ? `${Math.round(monetizedChannels / channels.length * 100)}% tổng kênh` : "—"}
          color={C.green}
        />
        <KpiCard
          icon={<TrendingUp size={18} color={C.amber} />}
          label="Doanh thu"
          value={isLoading ? "…" : fmtCurrency(profile?.total_revenue ?? 0, currency)}
          sub="Tổng tích lũy"
          color={C.amber}
        />
        <KpiCard
          icon={<FileText size={18} color={C.cyan} />}
          label="Hợp đồng"
          value={fmt(contracts.length)}
          sub="Đã ký kết"
          color={C.cyan}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          ANALYTICS SECTION
          ══════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, marginBottom: 12 }}>
          PHÂN TÍCH DOANH THU
        </div>
      </div>

      {/* Period filter bar */}
      <div style={{
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8,
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
        padding: "10px 14px", boxShadow: SHADOW.sm, marginBottom: 14,
      }}>
        {PERIOD_OPTIONS.map((opt) => {
          const active = !fromDate && periodKey === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => selectPeriod(opt.key)}
              style={{
                padding: "6px 12px",
                borderRadius: RADIUS.sm,
                border: `1px solid ${active ? C.blue : C.border}`,
                background: active ? `${C.blue}22` : "transparent",
                color: active ? C.blue : C.textSub,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
        <span style={{ width: 1, height: 22, background: C.border, margin: "0 6px" }} />
        <span style={{ fontSize: 11, color: C.textMuted }}>Từ ngày</span>
        <input type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          style={{
            background: C.bgHover, border: `1px solid ${C.border}`, color: C.text,
            borderRadius: RADIUS.sm, padding: "5px 8px", fontSize: 12,
          }}
        />
        <span style={{ fontSize: 11, color: C.textMuted }}>→ Đến ngày</span>
        <input type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          style={{
            background: C.bgHover, border: `1px solid ${C.border}`, color: C.text,
            borderRadius: RADIUS.sm, padding: "5px 8px", fontSize: 12,
          }}
        />
        {fromDate && (
          <Button size="sm" variant="ghost" onClick={() => setFromDate("")}>
            Xoá khoảng
          </Button>
        )}
      </div>

      {/* Multi-metric line chart */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
        padding: "18px 20px", boxShadow: SHADOW.sm, marginBottom: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, margin: 0 }}>
            Biến động {selectedMetrics.map((m) => METRIC_CFG[m].label.toLowerCase()).join(" · ") || "—"} ({periodLabel})
          </h2>
          <div style={{ display: "flex", gap: 14 }}>
            {periodTotals.revenue > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DollarSign size={13} color={C.amber} />
                <span style={{ fontSize: 12, color: C.textSub }}>Tổng doanh thu:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>{fmtCurrency(periodTotals.revenue, currency)}</span>
              </div>
            )}
            {periodTotals.views > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Eye size={13} color={C.blue} />
                <span style={{ fontSize: 12, color: C.textSub }}>Tổng view:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>{fmt(periodTotals.views)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metric checkboxes */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          {(Object.keys(METRIC_CFG) as MetricKey[]).map((m) => {
            const cfg = METRIC_CFG[m];
            const active = selectedMetrics.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggleMetric(m)}
                style={{
                  padding: "6px 14px",
                  borderRadius: RADIUS.sm,
                  border: `1px solid ${active ? cfg.color : C.border}`,
                  background: active ? `${cfg.color}22` : "transparent",
                  color: active ? cfg.color : C.textSub,
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <span>{active ? "☑" : "☐"}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>

        {selectedMetrics.length === 0 ? (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
            Chọn ít nhất 1 metric để hiển thị biểu đồ
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
            Chưa có dữ liệu trong khoảng thời gian này
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}80`} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} />
              {selectedMetrics.includes("revenue") && (
                <YAxis yAxisId="rev" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
              )}
              {selectedMetrics.includes("views") && (
                <YAxis yAxisId="views" orientation="right" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : `${v}`} />
              )}
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: C.text }}
                itemStyle={{ color: C.text }}
                formatter={(v: number, name: string) => {
                  if (name === "Doanh thu") return [fmtCurrency(v, currency), name];
                  return [fmt(v), name];
                }}
              />
              {selectedMetrics.includes("revenue") && (
                <Line yAxisId="rev"   type="monotone" dataKey="revenue" stroke={C.amber} strokeWidth={2.5} dot={false} name="Doanh thu" />
              )}
              {selectedMetrics.includes("views") && (
                <Line yAxisId="views" type="monotone" dataKey="views"   stroke={C.blue}  strokeWidth={2.5} dot={false} name="View" />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top channels + breakdown pies */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)", gap: 16, marginBottom: 24 }}>

        {/* Top 10 channels by revenue */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, overflow: "hidden", boxShadow: SHADOW.sm }}>
          <div style={{ padding: "16px 16px 0" }}>
            <SectionHeader
              title={`Top 10 kênh doanh thu cao nhất (${periodLabel})`}
              action={
                <Button variant="ghost" size="sm" icon={<BarChart2 size={12} />} onClick={() => navigate("/portal/channels")}>
                  Tất cả kênh
                </Button>
              }
            />
          </div>
          {topChannels.length === 0 ? (
            <div style={{ padding: 24, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              Chưa có dữ liệu doanh thu
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.bg }}>
                    {["#", "Kênh", "CMS", "Doanh thu", "View", "Monetize", "Status"].map((h) => (
                      <th key={h} style={{
                        padding: "8px 12px",
                        textAlign: h === "Doanh thu" || h === "View" ? "right" : "left",
                        fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: ".05em",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topChannels.map((ch, idx) => (
                    <tr key={ch.id} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 12px", color: C.textMuted, fontSize: 12, fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Tv2 size={12} color={C.blue} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ch.name}
                            </div>
                            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{ch.yt_id ?? ch.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", color: C.textSub, fontSize: 12 }}>
                        {ch.cms_name ?? "—"}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <span style={{ fontSize: 13, color: C.amber, fontWeight: 700 }}>{fmtCurrency(ch.revenue, currency)}</span>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: C.textSub, fontSize: 12 }}>
                        {fmt(ch.views)}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <Pill color={ch.monetization === "On" ? "green" : "red"}>{ch.monetization}</Pill>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <Pill color={ch.status === "Active" ? "green" : ch.status === "Suspended" ? "amber" : "red"}>
                          {ch.status}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <BreakdownPie
          title={isParent ? "Doanh thu đối tác con (%)" : "Doanh thu theo đối tác (%)"}
          rows={childBreakdown}
          currency={currency}
        />
        <BreakdownPie
          title="Doanh thu theo CMS net (%)"
          rows={cmsBreakdown}
          currency={currency}
        />
      </div>

      {/* ── Content grid ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Recent channels */}
        <Card padding="0">
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Kênh gần đây</span>
            <span
              onClick={() => navigate("/portal/channels")}
              style={{ fontSize: 11, color: C.blue, cursor: "pointer" }}
            >Xem tất cả →</span>
          </div>
          {isLoading ? (
            <div style={{ padding: 20, color: C.textSub, fontSize: 13 }}>Đang tải...</div>
          ) : recentChannels.length === 0 ? (
            <div style={{ padding: 20, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              Chưa có kênh nào
            </div>
          ) : (
            <div>
              {recentChannels.map((ch, i) => (
                <div key={ch.id as string} style={{
                  padding: "10px 18px", borderBottom: i < recentChannels.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: `${C.blue}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Tv2 size={14} color={C.blue} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.name as string}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {ch.monetization as string} · {ago(ch.created_at as string)}
                    </div>
                  </div>
                  <Pill color={ch.status === "Active" ? "green" : ch.status === "Suspended" ? "red" : "gray"} style={{ fontSize: 10 }}>
                    {ch.status as string}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent contracts */}
        <Card padding="0">
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Hợp đồng gần đây</span>
            <span
              onClick={() => navigate("/portal/contracts")}
              style={{ fontSize: 11, color: C.blue, cursor: "pointer" }}
            >Xem tất cả →</span>
          </div>
          {recentContracts.length === 0 ? (
            <div style={{ padding: 20, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              Chưa có hợp đồng nào
            </div>
          ) : (
            <div>
              {recentContracts.map((ct, i) => (
                <div key={ct.id} style={{
                  padding: "10px 18px", borderBottom: i < recentContracts.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: `${C.cyan}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <FileText size={14} color={C.cyan} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ct.title}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {ct.contract_number ? `#${ct.contract_number} · ` : ""}{ago(ct.created_at)}
                    </div>
                  </div>
                  <Clock size={12} color={C.textMuted} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Quick navigation ────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, marginBottom: 12 }}>
          TRUY CẬP NHANH
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 10 }}>
          <NavCard
            to="/portal/channels"
            icon={<Tv2 size={16} color={C.blue} />}
            label="Kênh của tôi"
            desc="Xem danh sách & trạng thái kênh"
            color={C.blue}
          />
          <NavCard
            to="/portal/submit"
            icon={<UploadCloud size={16} color={C.green} />}
            label="Gửi video duyệt"
            desc="Submit video mới vào MCN"
            color={C.green}
          />
          <NavCard
            to="/portal/contracts"
            icon={<FileText size={16} color={C.cyan} />}
            label="Hợp đồng"
            desc="Xem & tải hợp đồng đã ký"
            color={C.cyan}
          />
          <NavCard
            to="/portal/alerts"
            icon={<AlertTriangle size={16} color={C.amber} />}
            label="Cảnh báo"
            desc="Thông báo vi phạm & cảnh báo"
            color={C.amber}
          />
          <NavCard
            to="/portal/policy"
            icon={<ShieldCheck size={16} color={C.purple} />}
            label="Chính sách"
            desc="Quy định & điều khoản MCN"
            color={C.purple}
          />
          <NavCard
            to="/portal/profile"
            icon={<User size={16} color={C.pink} />}
            label="Hồ sơ"
            desc="Thông tin tài khoản đối tác"
            color={C.pink}
          />
        </div>
      </div>
    </div>
  );
}
