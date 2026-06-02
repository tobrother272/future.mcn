import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { C } from "@/styles/theme";
import { Card, Button } from "@/components/ui";
import { useRevenueBreakdown, useRevenueSystemDaily, useRevenueEntityDaily } from "@/api/revenue.api";
import { fmtCurrency, fmt, fmtDate } from "@/lib/format";
import { PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey } from "@/lib/periods";

type MetricKey = "revenue" | "views" | "subscribers";
type FilterType = "cms" | "partner" | "topic";
const METRIC_OPTIONS: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: "revenue", label: "Revenue", color: C.amber },
  { key: "views", label: "Views", color: C.blue },
  { key: "subscribers", label: "Subscribe", color: C.purple },
];
const PIE_COLORS = [C.amber, C.blue, C.cyan, C.purple, C.teal, C.green, C.orange, C.red];

export default function RevenueDashboardPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("28");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayInputDate());
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["revenue"]);
  const [filterType, setFilterType] = useState<FilterType | null>(null);
  const [filterId, setFilterId] = useState<string>("");

  const activeParams = fromDate && toDate
    ? { from: fromDate, to: toDate }
    : periodToParams(periodKey);
  const isLifetime = !fromDate && periodKey === "lifetime";
  const breakdownPeriod = activeParams.days ?? (
    activeParams.from && activeParams.to
      ? Math.max(1, Math.ceil((new Date(activeParams.to).getTime() - new Date(activeParams.from).getTime()) / 86400_000) + 1)
      : 30
  );

  const breakdownOpts = isLifetime
    ? { period: "lifetime" as const }
    : activeParams.from && activeParams.to
    ? { from: activeParams.from, to: activeParams.to }
    : { period: breakdownPeriod };
  const { data: breakdownCms, isLoading: cmsBreakdownLoading } = useRevenueBreakdown("cms", breakdownOpts);
  const { data: breakdownPartner, isLoading: partnerBreakdownLoading } = useRevenueBreakdown("partner", breakdownOpts);
  const { data: breakdownTopic, isLoading: topicBreakdownLoading } = useRevenueBreakdown("topic", breakdownOpts);
  const { data: systemDaily, isLoading: systemDailyLoading } = useRevenueSystemDaily(breakdownOpts);
  const { data: entityDailyRaw, isLoading: entityDailyLoading } = useRevenueEntityDaily(filterType, filterId || null, breakdownOpts);
  const cmsRows = (breakdownCms as Array<{ scope_id: string; name: string; revenue: number; views: number; currency?: string }>) ?? [];
  const partnerRawRows = (breakdownPartner as Array<{ scope_id: string; name: string; revenue: number; views: number }>) ?? [];
  const mergedPartnerMap = new Map<string, { scope_id: string; name: string; revenue: number; views: number }>();
  partnerRawRows.forEach((r) => {
    const key = r.name ?? "�";
    const cur = mergedPartnerMap.get(key) ?? { scope_id: r.scope_id, name: key, revenue: 0, views: 0 };
    cur.revenue += Number(r.revenue ?? 0);
    cur.views += Number(r.views ?? 0);
    mergedPartnerMap.set(key, cur);
  });
  const partnerRows = Array.from(mergedPartnerMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topicRawRows = (breakdownTopic as Array<{ scope_id: string; name: string; revenue: number; channel_count?: number }>) ?? [];
  const topicRows = topicRawRows
    .map((r) => ({ scope_id: r.scope_id, name: r.name ?? "�", revenue: Number(r.revenue ?? 0), channel_count: Number(r.channel_count ?? 0) }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const topicTotal = topicRows.reduce((s, r) => s + r.revenue, 0);
  const activeDaily = (filterType && filterId) ? (entityDailyRaw ?? []) : (systemDaily ?? []);
  const activeLoading = (filterType && filterId) ? entityDailyLoading : systemDailyLoading;
  const timeline = activeDaily.map((r) => ({
    date: fmtDate(r.snapshot_date),
    revenue: Number(r.revenue ?? 0),
    views: Number(r.views ?? 0),
    subscribers: Number(r.subscribers ?? 0),
  }));
  const totalByMetric = {
    revenue: timeline.reduce((s, r) => s + Number(r.revenue ?? 0), 0),
    views: timeline.reduce((s, r) => s + Number(r.views ?? 0), 0),
    subscribers: timeline.reduce((s, r) => s + Number(r.subscribers ?? 0), 0),
  } as const;
  const totalRevenue = totalByMetric.revenue;

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((prev) => (
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    ));
  };

  const setEntityFilter = (type: FilterType, id: string) => {
    if (filterType === type && filterId === id) {
      setFilterType(null);
      setFilterId("");
    } else {
      setFilterType(type);
      setFilterId(id);
    }
  };

  const clearFilter = () => { setFilterType(null); setFilterId(""); };

  const filterName = filterType === "cms"
    ? cmsRows.find((r) => r.scope_id === filterId)?.name
    : filterType === "partner"
    ? partnerRows.find((r) => r.scope_id === filterId)?.name
    : filterType === "topic"
    ? topicRows.find((r) => String(r.scope_id) === filterId)?.name ?? (filterId === "unassigned" ? "Chua g�n topic" : filterId)
    : null;
  const periodLabel = fromDate && toDate
    ? `${fromDate} ? ${toDate}`
    : (PERIOD_OPTIONS.find((p) => p.key === periodKey)?.label ?? "30 ng�y");
  const normalizePieData = (rows: Array<{ name: string; revenue: number }>) => {
    const list = rows
      .map((r) => ({ name: r.name, revenue: Number(r.revenue ?? 0) }))
      .filter((r) => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
    const top = list.slice(0, 8);
    const other = list.slice(8).reduce((s, x) => s + x.revenue, 0);
    return other > 0 ? [...top, { name: "Kh�c", revenue: other }] : top;
  };
  const cmsPie = normalizePieData(cmsRows);
  const partnerPie = normalizePieData(partnerRows);
  const cmsTotal = cmsPie.reduce((s, x) => s + x.revenue, 0);
  const partnerTotal = partnerPie.reduce((s, x) => s + x.revenue, 0);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Revenue</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
            T?ng: <span style={{ color: C.amber, fontWeight: 600 }}>{fmtCurrency(totalRevenue)}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {METRIC_OPTIONS.map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={selectedMetrics.includes(opt.key) ? "primary" : "secondary"}
              onClick={() => toggleMetric(opt.key)}
            >
              <span style={{ marginRight: 6 }}>{selectedMetrics.includes(opt.key) ? "?" : "?"}</span>
              {opt.label}
            </Button>
          ))}
          {/* Period */}
          {PERIOD_OPTIONS.filter((opt) => opt.key !== "180").map((opt) => (
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
            title="T? ng�y"
          />
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
            title="�?n ng�y"
          />
        </div>
      </div>

      {/* Entity filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>L?c bi?u d? theo:</span>
        <select
          value={filterType === "cms" ? filterId : ""}
          onChange={(e) => { if (e.target.value) setEntityFilter("cms", e.target.value); else clearFilter(); }}
          style={{ height: 30, borderRadius: 8, border: `1px solid ${filterType === "cms" ? C.amber : C.border}`, background: C.bgCard, color: filterType === "cms" ? C.amber : C.text, padding: "0 8px", fontSize: 12, cursor: "pointer" }}
        >
          <option value="">CMS: Tất cả</option>
          {cmsRows.map((r) => (
            <option key={r.scope_id} value={r.scope_id}>{r.name}</option>
          ))}
        </select>
        <select
          value={filterType === "partner" ? filterId : ""}
          onChange={(e) => { if (e.target.value) setEntityFilter("partner", e.target.value); else clearFilter(); }}
          style={{ height: 30, borderRadius: 8, border: `1px solid ${filterType === "partner" ? C.amber : C.border}`, background: C.bgCard, color: filterType === "partner" ? C.amber : C.text, padding: "0 8px", fontSize: 12, cursor: "pointer" }}
        >
          <option value="">Partner: Tất cả</option>
          {partnerRows.map((r) => (
            <option key={r.scope_id} value={r.scope_id}>{r.name}</option>
          ))}
        </select>
        <select
          value={filterType === "topic" ? filterId : ""}
          onChange={(e) => { if (e.target.value) setEntityFilter("topic", e.target.value); else clearFilter(); }}
          style={{ height: 30, borderRadius: 8, border: `1px solid ${filterType === "topic" ? C.amber : C.border}`, background: C.bgCard, color: filterType === "topic" ? C.amber : C.text, padding: "0 8px", fontSize: 12, cursor: "pointer" }}
        >
          <option value="">Topic: Tất cả</option>
          {topicRows.map((r) => (
            <option key={r.scope_id} value={r.scope_id}>{r.name}</option>
          ))}
        </select>
        {filterType && filterId && (
          <button
            onClick={clearFilter}
            style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}
            title="Xo� b? l?c"
          >
            ? Xo� l?c
          </button>
        )}
      </div>

      {/* System Timeline Chart */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>
          {filterType && filterName
            ? <><span style={{ color: C.textMuted, fontWeight: 400 }}>Doanh thu � </span><span style={{ color: C.amber }}>{filterName}</span></>
            : "T?ng theo th?i gian"
          }
          <span style={{ marginLeft: 4, color: C.textMuted, fontWeight: 400 }}>({periodLabel})</span>
          <span style={{ marginLeft: 8, color: C.amber }}>Revenue: {fmtCurrency(totalByMetric.revenue)}</span>
          <span style={{ marginLeft: 12, color: C.blue }}>Views: {fmt(totalByMetric.views)}</span>
          <span style={{ marginLeft: 12, color: C.purple }}>Subscribe: {fmt(totalByMetric.subscribers)}</span>
        </div>
        {activeLoading ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>�ang t?i...</div>
        ) : selectedMetrics.length === 0 ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>
            Ch?n �t nh?t 1 metric d? hi?n th? bi?u d?
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: '#fff' }} itemStyle={{ color: '#fff' }}
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Doanh thu c?a CMS (%) � {periodLabel}
          </div>
          {cmsBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>�ang t?i...</div>
          ) : cmsPie.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chua c� d? li?u</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={cmsPie} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {cmsPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: '#fff' }} itemStyle={{ color: '#fff' }}
                    formatter={(v: number, _name: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "CMS"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {cmsPie.slice(0, 5).map((r, i) => {
                  const row = cmsRows.find((x) => x.name === r.name);
                  const isActive = filterType === "cms" && row?.scope_id === filterId;
                  return (
                    <div
                      key={r.name}
                      onClick={() => { if (row) setEntityFilter("cms", row.scope_id); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{cmsTotal > 0 ? ((r.revenue / cmsTotal) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Doanh thu c?a d?i t�c (%) � {periodLabel}
          </div>
          {partnerBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>�ang t?i...</div>
          ) : partnerPie.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chua c� d? li?u</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={partnerPie} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {partnerPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: '#fff' }} itemStyle={{ color: '#fff' }}
                    formatter={(v: number, _name: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "Partner"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {partnerPie.slice(0, 5).map((r, i) => {
                  const row = partnerRows.find((x) => x.name === r.name);
                  const isActive = filterType === "partner" && row?.scope_id === filterId;
                  return (
                    <div
                      key={r.name}
                      onClick={() => { if (row) setEntityFilter("partner", row.scope_id); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{partnerTotal > 0 ? ((r.revenue / partnerTotal) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>
            Doanh thu theo Topic (%) � {periodLabel}
          </div>
          {topicBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>�ang t?i...</div>
          ) : topicRows.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chua c� d? li?u</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={normalizePieData(topicRows)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {normalizePieData(topicRows).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: '#fff' }} itemStyle={{ color: '#fff' }}
                    formatter={(v: number, _name: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "Topic"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {normalizePieData(topicRows).slice(0, 5).map((r, i) => {
                  const row = topicRows.find((x) => x.name === r.name);
                  const isActive = filterType === "topic" && String(row?.scope_id) === filterId;
                  return (
                    <div
                      key={r.name}
                      onClick={() => { if (row) setEntityFilter("topic", String(row.scope_id)); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{topicTotal > 0 ? ((r.revenue / topicTotal) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
