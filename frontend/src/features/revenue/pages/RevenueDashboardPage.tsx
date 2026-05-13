import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { C } from "@/styles/theme";
import { Card, Button } from "@/components/ui";
import { useRevenueBreakdown, useRevenueSystemDaily } from "@/api/revenue.api";
import { fmtCurrency, fmt, fmtDate } from "@/lib/format";
import { PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey } from "@/lib/periods";

type MetricKey = "revenue" | "views" | "subscribers";
const METRIC_OPTIONS: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: "revenue", label: "Revenue", color: C.amber },
  { key: "views", label: "Views", color: C.blue },
  { key: "subscribers", label: "Subscribe", color: C.purple },
];
const PIE_COLORS = [C.amber, C.blue, C.cyan, C.purple, C.teal, C.green, C.orange, C.red];

export default function RevenueDashboardPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayInputDate());
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["revenue"]);

  const activeParams = fromDate && toDate
    ? { from: fromDate, to: toDate }
    : periodToParams(periodKey);
  const breakdownPeriod = activeParams.days ?? (
    activeParams.from && activeParams.to
      ? Math.max(1, Math.ceil((new Date(activeParams.to).getTime() - new Date(activeParams.from).getTime()) / 86400_000) + 1)
      : 30
  );

  const breakdownOpts = activeParams.from && activeParams.to
    ? { from: activeParams.from, to: activeParams.to }
    : { period: breakdownPeriod };
  const { data: breakdownCms, isLoading: cmsBreakdownLoading } = useRevenueBreakdown("cms", breakdownOpts);
  const { data: breakdownPartner, isLoading: partnerBreakdownLoading } = useRevenueBreakdown("partner", breakdownOpts);
  const { data: systemDaily, isLoading: systemDailyLoading } = useRevenueSystemDaily(activeParams);
  const cmsRows = (breakdownCms as Array<{ name: string; revenue: number; views: number; currency?: string }>) ?? [];
  const partnerRawRows = (breakdownPartner as Array<{ name: string; revenue: number; views: number }>) ?? [];
  const mergedPartnerMap = new Map<string, { name: string; revenue: number; views: number }>();
  partnerRawRows.forEach((r) => {
    const key = r.name ?? "—";
    const cur = mergedPartnerMap.get(key) ?? { name: key, revenue: 0, views: 0 };
    cur.revenue += Number(r.revenue ?? 0);
    cur.views += Number(r.views ?? 0);
    mergedPartnerMap.set(key, cur);
  });
  const partnerRows = Array.from(mergedPartnerMap.values()).sort((a, b) => b.revenue - a.revenue);
  const timeline = (systemDaily ?? []).map((r) => ({
    date: fmtDate(r.snapshot_date),
    revenue: Number(r.revenue ?? 0),
    views: Number(r.views ?? 0),
    subscribers: Number(r.subscribers ?? 0),
  }));
  const totalRevenue = cmsRows.reduce((s, r) => s + Number(r.revenue), 0);
  const totalByMetric = {
    revenue: timeline.reduce((s, r) => s + Number(r.revenue ?? 0), 0),
    views: timeline.reduce((s, r) => s + Number(r.views ?? 0), 0),
    subscribers: timeline.reduce((s, r) => s + Number(r.subscribers ?? 0), 0),
  } as const;

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((prev) => (
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    ));
  };
  const periodLabel = fromDate && toDate
    ? `${fromDate} → ${toDate}`
    : (PERIOD_OPTIONS.find((p) => p.key === periodKey)?.label ?? "30 ngày");
  const normalizePieData = (rows: Array<{ name: string; revenue: number }>) => {
    const list = rows
      .map((r) => ({ name: r.name, revenue: Number(r.revenue ?? 0) }))
      .filter((r) => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
    const top = list.slice(0, 8);
    const other = list.slice(8).reduce((s, x) => s + x.revenue, 0);
    return other > 0 ? [...top, { name: "Khác", revenue: other }] : top;
  };
  const cmsPie = normalizePieData(cmsRows);
  const partnerPie = normalizePieData(partnerRows);
  const cmsTotal = cmsPie.reduce((s, x) => s + x.revenue, 0);
  const partnerTotal = partnerPie.reduce((s, x) => s + x.revenue, 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Revenue</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
            Tổng: <span style={{ color: C.amber, fontWeight: 600 }}>{fmtCurrency(totalRevenue)}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {METRIC_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={selectedMetrics.includes(opt.key) ? "primary" : "secondary"}
              onClick={() => toggleMetric(opt.key)}
            >
              <span style={{ marginRight: 6 }}>{selectedMetrics.includes(opt.key) ? "☑" : "☐"}</span>
              {opt.label}
            </Button>
          ))}
          {/* Period */}
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={periodKey === opt.key ? "primary" : "secondary"}
              onClick={() => {
                setPeriodKey(opt.key);
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

      {/* System Timeline Chart */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>
          Tổng theo thời gian ({periodLabel})
          <span style={{ marginLeft: 8, color: C.amber }}>Revenue: {fmtCurrency(totalByMetric.revenue)}</span>
          <span style={{ marginLeft: 12, color: C.blue }}>Views: {fmt(totalByMetric.views)}</span>
          <span style={{ marginLeft: 12, color: C.purple }}>Subscribe: {fmt(totalByMetric.subscribers)}</span>
        </div>
        {systemDailyLoading ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
        ) : selectedMetrics.length === 0 ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>
            Chọn ít nhất 1 metric để hiển thị biểu đồ
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, name: string) => {
                  if (name === "Revenue") return [fmtCurrency(v), name];
                  return [fmt(v), name];
                }}
              />
              {selectedMetrics.includes("revenue") && (
                <Line type="monotone" dataKey="revenue" stroke={C.amber} strokeWidth={2.5} dot={false} name="Revenue" />
              )}
              {selectedMetrics.includes("views") && (
                <Line type="monotone" dataKey="views" stroke={C.blue} strokeWidth={2.2} dot={false} name="Views" />
              )}
              {selectedMetrics.includes("subscribers") && (
                <Line type="monotone" dataKey="subscribers" stroke={C.purple} strokeWidth={2.2} dot={false} name="Subscribe" />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Pie charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Doanh thu của CMS (%) · {periodLabel}
          </div>
          {cmsBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
          ) : cmsPie.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chưa có dữ liệu</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={cmsPie} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {cmsPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, _name: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "CMS"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {cmsPie.slice(0, 5).map((r, i) => (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{cmsTotal > 0 ? ((r.revenue / cmsTotal) * 100).toFixed(1) : "0.0"}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Doanh thu của đối tác (%) · {periodLabel}
          </div>
          {partnerBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
          ) : partnerPie.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chưa có dữ liệu</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={partnerPie} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {partnerPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number, _name: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "Partner"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {partnerPie.slice(0, 5).map((r, i) => (
                  <div key={r.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                    </div>
                    <span style={{ fontSize: 12, color: C.textMuted }}>{partnerTotal > 0 ? ((r.revenue / partnerTotal) * 100).toFixed(1) : "0.0"}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
