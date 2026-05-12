import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Server, Tv, Users, DollarSign, TrendingUp, RefreshCw,
  AlertTriangle, ShieldCheck, FileText, CheckCircle2,
  Clock, XCircle, ArrowRight, Activity, ChevronRight,
  Upload,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import { useCmsList, useCmsStats } from "@/api/cms.api";
import { useChannelList } from "@/api/channels.api";
import { useRevenueBreakdown, useSnapshotAll } from "@/api/revenue.api";
import { usePartnerList } from "@/api/partners.api";
import { useViolationList } from "@/api/violations.api";
import { useSubmissionList } from "@/api/submissions.api";
import { fmt, fmtCurrency, fmtDate } from "@/lib/format";
import { useToast } from "@/stores/notificationStore";
import { useQueries } from "@tanstack/react-query";
import { apiClient } from "@/api/client";
import type { CmsStats } from "@/types/cms";

// ── Helpers ───────────────────────────────────────────────────
const NOW = new Date();
const GREETING = NOW.getHours() < 12 ? "Chào buổi sáng" : NOW.getHours() < 18 ? "Chào buổi chiều" : "Chào buổi tối";
const DATE_STR = NOW.toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

const SEVERITY_COLOR: Record<string, string> = {
  Critical: C.red,
  High:     C.orange,
  Medium:   C.amber,
  Low:      C.teal,
};

const WORKFLOW_CFG: Record<string, { label: string; color: string }> = {
  DRAFT:               { label: "Nháp",          color: C.textMuted },
  SUBMITTED:           { label: "Chờ duyệt",      color: C.blue },
  QC_REVIEWING:        { label: "Đang kiểm tra",  color: C.cyan },
  QC_REJECTED:         { label: "Từ chối",         color: C.red },
  QC_APPROVED:         { label: "Đã duyệt",        color: C.green },
  CHANNEL_PROVISIONING:{ label: "Tạo kênh",        color: C.purple },
  PROVISIONING_FAILED: { label: "Tạo kênh lỗi",   color: C.red },
  ACTIVE:              { label: "Hoạt động",       color: C.green },
};

// ── KPI card ──────────────────────────────────────────────────
function KpiCard({
  label, value, icon, color, sub, onClick, trend,
}: {
  label: string; value: string; icon: React.ReactNode;
  color: string; sub?: string; onClick?: () => void; trend?: string;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md,
        padding: "18px 20px", cursor: onClick ? "pointer" : "default",
        boxShadow: SHADOW.sm, transition: "border-color .15s, transform .15s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={(e) => { if (onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = color; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; } }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.transform = ""; }}
    >
      <div style={{ position: "absolute", right: -10, top: -10, width: 70, height: 70, borderRadius: "50%", background: `${color}12` }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>{label}</span>
        <div style={{ background: `${color}22`, borderRadius: RADIUS.sm, padding: 7, color, display: "flex", flexShrink: 0 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: "-0.5px" }}>{value}</div>
      {(sub || trend) && (
        <div style={{ display: "flex", gap: 8, marginTop: 5, alignItems: "center" }}>
          {sub && <span style={{ fontSize: 11, color: C.textMuted }}>{sub}</span>}
          {trend && <span style={{ fontSize: 11, color: trend.startsWith("+") ? C.green : C.red }}>{trend}</span>}
        </div>
      )}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: C.textSub, margin: 0, textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</h2>
      {action}
    </div>
  );
}

// ── Violation alert row ───────────────────────────────────────
function ViolationRow({ v, onClick }: { v: ReturnType<typeof useViolationList>["data"] extends { items: infer I } ? (I extends (infer T)[] ? T : never) : never; onClick: () => void }) {
  const sColor = SEVERITY_COLOR[v.severity ?? "Low"] ?? C.textMuted;
  return (
    <div onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
      borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background .1s",
    }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
    >
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: sColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.name}</div>
        <div style={{ fontSize: 11, color: C.textMuted }}>{v.channel_name || "—"} · {v.detected_date ? fmtDate(v.detected_date) : "—"}</div>
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: RADIUS.full, background: `${sColor}20`, color: sColor, flexShrink: 0 }}>
        {v.severity ?? "—"}
      </span>
      <ChevronRight size={13} color={C.textMuted} />
    </div>
  );
}

// ── CMS stats row in table ─────────────────────────────────────
function CmsStatsRow({ cmsId, cmsName, currency, onClick }: { cmsId: string; cmsName: string; currency: string; onClick: () => void }) {
  const { data: s } = useCmsStats(cmsId);
  const pct = s && s.total_channels > 0 ? Math.round((s.monetized / s.total_channels) * 100) : 0;
  return (
    <tr onClick={onClick} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.bgHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}>
      <td style={{ padding: "11px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Server size={12} color={C.blue} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{cmsName}</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{cmsId}</div>
          </div>
        </div>
      </td>
      <td style={{ padding: "11px 16px", textAlign: "right" }}>
        <span style={{ fontSize: 13, color: C.text }}>{fmt(s?.total_channels)}</span>
      </td>
      <td style={{ padding: "11px 16px", textAlign: "right" }}>
        <span style={{ fontSize: 13, color: C.amber, fontWeight: 700 }}>{fmtCurrency(s?.total_monthly_revenue, currency)}</span>
      </td>
      <td style={{ padding: "11px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 5, background: C.border, borderRadius: 3 }}>
            <div style={{ width: `${pct}%`, height: "100%", background: C.green, borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: C.textMuted, width: 32, textAlign: "right" }}>{pct}%</span>
        </div>
      </td>
      <td style={{ padding: "11px 16px" }}>
        {s && s.demonetized > 0 ? (
          <span style={{ fontSize: 11, color: C.red, background: `${C.red}18`, padding: "2px 8px", borderRadius: RADIUS.full }}>{s.demonetized} demo</span>
        ) : (
          <span style={{ fontSize: 11, color: C.green }}>✓</span>
        )}
      </td>
    </tr>
  );
}

// ── Aggregate stats across all CMS ────────────────────────────
function useAllCmsStats(ids: string[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["cms", id, "stats"],
      queryFn: () => apiClient.get(`cms/${id}/stats`).json<CmsStats>(),
      enabled: !!id,
    })),
  });
  const all = results.map((r) => r.data).filter(Boolean) as CmsStats[];
  return {
    totalChannels:    all.reduce((s, x) => s + (x.total_channels ?? 0), 0),
    monetized:        all.reduce((s, x) => s + (x.monetized ?? 0), 0),
    demonetized:      all.reduce((s, x) => s + (x.demonetized ?? 0), 0),
    totalSubscribers: all.reduce((s, x) => s + (x.total_subscribers ?? 0), 0),
    totalRevenue:     all.reduce((s, x) => s + (x.total_monthly_revenue ?? 0), 0),
  };
}

// ── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const navigate  = useNavigate();
  const toast     = useToast();
  const snapshot  = useSnapshotAll();

  const { data: cmsData, refetch: refetchCms }    = useCmsList();
  const { data: partnersData }  = usePartnerList({ limit: 1 });
  const { data: violationsData } = useViolationList({ limit: 6, result: "" });
  const { data: breakdown }     = useRevenueBreakdown("cms", 30);
  const { data: submissions }   = useSubmissionList({ limit: 50 });

  const cmsList = cmsData?.items ?? [];
  const cmsIds  = cmsList.map((c) => c.id);
  const aggStats = useAllCmsStats(cmsIds);

  const totalPartners   = partnersData?.total ?? 0;
  const activeViolations= (violationsData?.items ?? []).filter((v) => v.result === "Không thực hiện");
  const criticalCount   = activeViolations.filter((v) => (v as unknown as { severity?: string }).severity === "Critical").length;

  // Submission counts by state
  const subItems = submissions?.items ?? [];
  const subCounts: Record<string, number> = {};
  subItems.forEach((s) => { subCounts[s.workflow_state] = (subCounts[s.workflow_state] ?? 0) + 1; });
  const pendingQc    = (subCounts["SUBMITTED"] ?? 0) + (subCounts["QC_REVIEWING"] ?? 0);
  const pendingProv  = subCounts["QC_APPROVED"] ?? 0;

  type BreakdownRow = { name: string; revenue: number; views: number };
  const breakdownRows = (breakdown as BreakdownRow[] | undefined) ?? [];
  const barData = breakdownRows
    .map((r) => ({ name: r.name.length > 12 ? r.name.slice(0, 12) + "…" : r.name, revenue: Number(r.revenue) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 9);

  // Pie chart: monetization breakdown
  const monoData = [
    { name: "On",  value: aggStats.monetized,   color: C.green },
    { name: "Off", value: aggStats.demonetized, color: C.red   },
  ].filter((d) => d.value > 0);

  // Submission pipeline pie
  const pipelineData = Object.entries(subCounts)
    .filter(([, v]) => v > 0)
    .map(([state, count]) => ({
      name: WORKFLOW_CFG[state]?.label ?? state,
      value: count,
      color: WORKFLOW_CFG[state]?.color ?? C.textMuted,
    }));

  const handleSnapshot = async () => {
    try {
      const res = await snapshot.mutateAsync();
      toast.success("Snapshot hoàn tất", `${res.count} bản ghi — ${res.date}`);
      void refetchCms();
    } catch (err) {
      toast.error("Snapshot thất bại", err instanceof Error ? err.message : "");
    }
  };

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>

      {/* ── Top header ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>
            {GREETING} 👋
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: "4px 0 0" }}>{DATE_STR} · Meridian MCN Control Center</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} loading={snapshot.isPending} onClick={() => void handleSnapshot()}>
            Snapshot
          </Button>
          <Button variant="primary" size="sm" icon={<TrendingUp size={13} />} onClick={() => navigate("/revenue")}>
            Revenue
          </Button>
        </div>
      </div>

      {/* ── Critical alert banner ── */}
      {criticalCount > 0 && (
        <div onClick={() => navigate("/compliance")} style={{
          display: "flex", alignItems: "center", gap: 12, padding: "13px 18px", marginBottom: 20,
          background: `${C.red}12`, border: `1px solid ${C.red}50`, borderRadius: RADIUS.md,
          cursor: "pointer", transition: "background .1s",
        }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.red}1c`)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.red}12`)}
        >
          <AlertTriangle size={18} color={C.red} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>
              {criticalCount} vi phạm Critical đang chờ xử lý
            </span>
            <span style={{ fontSize: 12, color: C.textSub, marginLeft: 8 }}>
              · Cần hành động ngay để tránh ảnh hưởng doanh thu và kênh
            </span>
          </div>
          <span style={{ fontSize: 12, color: C.red, display: "flex", alignItems: "center", gap: 4 }}>
            Xem ngay <ArrowRight size={13} />
          </span>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))", gap: 14, marginBottom: 24 }}>
        <KpiCard label="CMS Accounts"    value={String(cmsList.length)} icon={<Server size={16} />}     color={C.blue}   sub={`${cmsList.filter((c) => c.status === "Active").length} active`}       onClick={() => navigate("/cms")} />
        <KpiCard label="Tổng kênh"        value={fmt(aggStats.totalChannels)} icon={<Tv size={16} />}    color={C.cyan}   sub={`${fmt(aggStats.monetized)} monetized`}                                   onClick={() => navigate("/channels")} />
        <KpiCard label="Đối tác"          value={fmt(totalPartners)}    icon={<Users size={16} />}        color={C.purple} sub="đang hợp tác"                                                             onClick={() => navigate("/partners")} />
        <KpiCard label="Doanh thu tháng"  value={fmtCurrency(aggStats.totalRevenue)} icon={<DollarSign size={16} />} color={C.amber} sub="tổng tất cả CMS" />
        <KpiCard label="Vi phạm mở"       value={String(activeViolations.length)} icon={<AlertTriangle size={16} />} color={activeViolations.length > 0 ? C.red : C.green} sub={criticalCount > 0 ? `${criticalCount} critical` : "không có critical"} onClick={() => navigate("/compliance")} />
        <KpiCard label="Hàng chờ QC"      value={String(pendingQc + pendingProv)} icon={<Activity size={16} />} color={C.teal} sub={`${pendingQc} QC · ${pendingProv} provisioning`} onClick={() => navigate("/workflow/qc")} />
      </div>

      {/* ── Row 2: chart + violations ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16, marginBottom: 20 }}>

        {/* Revenue bar chart */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: "18px 20px", boxShadow: SHADOW.sm }}>
          <SectionHeader
            title="Doanh thu theo CMS (30 ngày)"
            action={<Button variant="ghost" size="sm" icon={<ArrowRight size={12} />} onClick={() => navigate("/revenue")}>Chi tiết</Button>}
          />
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={`${C.border}80`} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} axisLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `$${(v/1000).toFixed(0)}K` : `$${v}`} />
                <Tooltip
                  contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [fmtCurrency(v), "Revenue"]}
                />
                <Bar dataKey="revenue" fill={C.blue} radius={[5, 5, 0, 0]}>
                  {barData.map((_, i) => <Cell key={i} fill={i === 0 ? C.amber : i === 1 ? C.blue : C.cyan} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 13 }}>
              Chưa có dữ liệu doanh thu — Nhấn Snapshot để cập nhật
            </div>
          )}
        </div>

        {/* Active Violations */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, boxShadow: SHADOW.sm }}>
          <div style={{ padding: "16px 16px 0" }}>
            <SectionHeader
              title="Vi phạm cần xử lý"
              action={<Button variant="ghost" size="sm" icon={<ArrowRight size={12} />} onClick={() => navigate("/compliance")}>Tất cả</Button>}
            />
          </div>
          {activeViolations.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}>
              <CheckCircle2 size={28} color={C.green} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 13, color: C.textSub }}>Không có vi phạm nào đang mở</div>
            </div>
          ) : (
            <div>
              {activeViolations.slice(0, 6).map((v) => (
                <ViolationRow key={v.id} v={v as Parameters<typeof ViolationRow>[0]["v"]} onClick={() => navigate("/compliance")} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: CMS table + pie charts ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, marginBottom: 20 }}>

        {/* CMS stats table */}
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, overflow: "hidden", boxShadow: SHADOW.sm }}>
          <div style={{ padding: "16px 16px 0" }}>
            <SectionHeader
              title="Hiệu suất từng CMS"
              action={<Button variant="ghost" size="sm" icon={<ArrowRight size={12} />} onClick={() => navigate("/cms")}>Quản lý</Button>}
            />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["CMS", "Kênh", "Doanh thu", "Monetize %", "Alert"].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: h === "CMS" ? "left" : "right", fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: ".05em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cmsList.map((cms) => (
                <CmsStatsRow
                  key={cms.id}
                  cmsId={cms.id}
                  cmsName={cms.name}
                  currency={cms.currency}
                  onClick={() => navigate(`/cms/${cms.id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pie charts stacked */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Monetization pie */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: "16px", boxShadow: SHADOW.sm, flex: 1 }}>
            <SectionHeader title="Trạng thái kênh" />
            {monoData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={monoData} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                    dataKey="value" paddingAngle={3}>
                    {monoData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted, fontSize: 12 }}>Đang tải...</div>
            )}
          </div>

          {/* Submission pipeline */}
          <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: "16px", boxShadow: SHADOW.sm, flex: 1 }}>
            <SectionHeader
              title="Pipeline gửi video"
              action={<Button variant="ghost" size="sm" icon={<ArrowRight size={12} />} onClick={() => navigate("/workflow/qc")}>Queue</Button>}
            />
            {pipelineData.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {Object.entries(WORKFLOW_CFG).slice(1, 5).map(([, cfg]) => (
                  <div key={cfg.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{cfg.label}</span>
                    <span style={{ fontSize: 12, color: cfg.color, fontWeight: 700 }}>0</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pipelineData.map((d) => (
                  <div key={d.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                      <span style={{ fontSize: 12, color: C.textSub }}>{d.name}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.color }}>{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Quick actions ── */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: "16px 20px", boxShadow: SHADOW.sm }}>
        <SectionHeader title="Truy cập nhanh" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {[
            { icon: <Upload size={14} />,      label: "Import kênh CSV",    color: C.blue,   path: "/cms" },
            { icon: <Users size={14} />,        label: "Duyệt đối tác",      color: C.purple, path: "/partners" },
            { icon: <CheckCircle2 size={14} />, label: "Hàng chờ QC",         color: C.cyan,   path: "/workflow/qc" },
            { icon: <Activity size={14} />,     label: "Provisioning",        color: C.teal,   path: "/workflow/provisioning" },
            { icon: <AlertTriangle size={14} />,label: "Xử lý vi phạm",       color: C.red,    path: "/compliance" },
            { icon: <ShieldCheck size={14} />,  label: "Chính sách YouTube",  color: C.green,  path: "/policies" },
            { icon: <FileText size={14} />,     label: "Hợp đồng",            color: C.amber,  path: "/contracts" },
            { icon: <TrendingUp size={14} />,   label: "Lịch sử doanh thu",   color: C.orange, path: "/revenue" },
          ].map(({ icon, label, color, path }) => (
            <button key={label} onClick={() => navigate(path)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: RADIUS.sm, cursor: "pointer",
                border: `1px solid ${C.border}`, background: C.bgHover,
                color: C.textSub, fontSize: 12, fontWeight: 500, transition: "all .12s",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = color; el.style.color = color; el.style.background = `${color}10`; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textSub; el.style.background = C.bgHover; }}
            >
              <span style={{ color }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Row 5: Bottom stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 16 }}>
        {[
          { icon: <Tv size={14} color={C.green} />,        label: "Monetize On",  value: fmt(aggStats.monetized),   color: C.green  },
          { icon: <Tv size={14} color={C.red} />,          label: "Monetize Off", value: fmt(aggStats.demonetized), color: C.red    },
          { icon: <Users size={14} color={C.purple} />,    label: "Subscribers", value: fmt(aggStats.totalSubscribers), color: C.purple },
          { icon: <Clock size={14} color={C.amber} />,     label: "QC chờ duyệt",value: String(pendingQc),         color: C.amber  },
        ].map(({ icon, label, value, color }) => (
          <div key={label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: SHADOW.sm }}>
            <div style={{ width: 34, height: 34, borderRadius: RADIUS.sm, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
