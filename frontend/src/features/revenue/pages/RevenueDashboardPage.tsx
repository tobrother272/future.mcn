import { useState, useRef, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { useQueries } from "@tanstack/react-query";
import { C } from "@/styles/theme";
import { Card, Button } from "@/components/ui";
import { useRevenueBreakdown, useRevenueSystemDaily, useRevenueMultiDaily } from "@/api/revenue.api";
import { apiClient } from "@/api/client";
import { fmtCurrency, fmt, fmtDate } from "@/lib/format";
import { PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey } from "@/lib/periods";

type MetricKey = "revenue" | "views" | "subscribers";
const METRIC_OPTIONS: Array<{ key: MetricKey; label: string; color: string }> = [
  { key: "revenue",     label: "Revenue",     color: C.amber  },
  { key: "views",       label: "Views",       color: C.blue   },
  { key: "subscribers", label: "Subscribers", color: C.purple },
];
const PIE_COLORS = [C.amber, C.blue, C.cyan, C.purple, C.teal, C.green, C.orange, C.red];

// ── Multi-select dropdown ─────────────────────────────────────
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  color = C.amber,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (vals: string[]) => void;
  color?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const displayText = selected.length === 0
    ? `${label}: Tất cả`
    : selected.length === 1
    ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
    : `${label}: ${selected.length} đã chọn`;

  const isActive = selected.length > 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 30, padding: "0 10px 0 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
          border: `1px solid ${isActive ? color : C.border}`,
          background: isActive ? `${color}15` : C.bgCard,
          color: isActive ? color : C.text,
          display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        }}
      >
        {displayText}
        <span style={{ fontSize: 10, opacity: 0.7 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{
          position: "absolute", top: 34, left: 0, zIndex: 200,
          background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          minWidth: 200, maxHeight: 280, overflowY: "auto", padding: "6px 0",
        }}>
          {options.length === 0 && (
            <div style={{ padding: "8px 14px", fontSize: 12, color: C.textMuted }}>Không có dữ liệu</div>
          )}
          {options.map((opt) => {
            const checked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 14px", cursor: "pointer", fontSize: 12,
                  background: checked ? `${color}12` : "transparent",
                  color: checked ? color : C.text,
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { if (!checked) (e.currentTarget as HTMLElement).style.background = `${C.bgHover}`; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = checked ? `${color}12` : "transparent"; }}
              >
                <input
                  type="checkbox" checked={checked}
                  onChange={() => toggle(opt.value)}
                  style={{ accentColor: color, width: 13, height: 13, flexShrink: 0 }}
                />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{opt.label}</span>
              </label>
            );
          })}
          {selected.length > 0 && (
            <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 4, padding: "4px 8px" }}>
              <button
                onClick={() => { onChange([]); setOpen(false); }}
                style={{ fontSize: 11, color: C.textMuted, background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}
              >
                ✕ Bỏ chọn tất cả
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Custom multi-entity tooltip ──────────────────────────────
const METRIC_DASH: Record<string, string | undefined> = {
  revenue: undefined, views: "5 3", subscribers: "2 2",
};
const METRIC_LABEL: Record<string, string> = {
  revenue: "Revenue", views: "Views", subscribers: "Subscribers",
};

function CustomMultiTooltip({ active, payload, label, entityItems }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string;
  entityItems: Array<{ key: string; label: string; color: string }>;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 12, minWidth: 200 }}>
      <div style={{ color: C.textMuted, marginBottom: 8, fontSize: 11 }}>{label}</div>
      {payload.map((item) => {
        const parts = item.name.split("__");
        const entityLabel = parts[0] ?? item.name;
        const metric      = parts[1] ?? "revenue";
        const entity      = entityItems.find((e) => e.label === entityLabel);
        const color       = entity?.color ?? item.color ?? C.amber;
        const dash        = METRIC_DASH[metric];
        const metricLabel = METRIC_LABEL[metric] ?? metric;
        const value       = metric === "revenue" ? fmtCurrency(item.value) : fmt(item.value);
        return (
          <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            {/* Line style indicator */}
            <svg width={24} height={10} style={{ flexShrink: 0 }}>
              <line x1={0} y1={5} x2={24} y2={5}
                stroke={color} strokeWidth={2}
                strokeDasharray={dash ?? "none"} />
            </svg>
            <span style={{ color, fontWeight: 600, minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {entityLabel}
            </span>
            <span style={{ color: C.textMuted, fontSize: 10, marginRight: 2 }}>{metricLabel}</span>
            <span style={{ color: "#fff", fontWeight: 700 }}>{value}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function RevenueDashboardPage() {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("28");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayInputDate());
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(["revenue"]);

  // Multi-select filter states
  const [filterCms, setFilterCms]                   = useState<string[]>([]);
  const [filterPartner, setFilterPartner]           = useState<string[]>([]);
  const [filterTopic, setFilterTopic]               = useState<string[]>([]);
  const [filterContentOwner, setFilterContentOwner] = useState<string[]>([]);

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

  const { data: breakdownCms,          isLoading: cmsBreakdownLoading          } = useRevenueBreakdown("cms",           breakdownOpts, { partnerIds: filterPartner, topicIds: filterTopic, contentOwners: filterContentOwner });
  const { data: breakdownPartner,      isLoading: partnerBreakdownLoading      } = useRevenueBreakdown("partner",       breakdownOpts, { cmsIds: filterCms, topicIds: filterTopic, contentOwners: filterContentOwner });
  const { data: breakdownTopic,        isLoading: topicBreakdownLoading        } = useRevenueBreakdown("topic",         breakdownOpts, { cmsIds: filterCms, partnerIds: filterPartner, contentOwners: filterContentOwner });
  const { data: breakdownContentOwner, isLoading: ownerBreakdownLoading        } = useRevenueBreakdown("content_owner", breakdownOpts, { cmsIds: filterCms, partnerIds: filterPartner, topicIds: filterTopic });
  const { data: systemDaily,      isLoading: systemDailyLoading      } = useRevenueSystemDaily(breakdownOpts);

  const hasAnyFilter = filterCms.length > 0 || filterPartner.length > 0 || filterTopic.length > 0 || filterContentOwner.length > 0;
  const { data: multiDailyRaw, isLoading: multiDailyLoading } = useRevenueMultiDaily(
    { cmsIds: filterCms, partnerIds: filterPartner, topicIds: filterTopic, contentOwners: filterContentOwner },
    breakdownOpts
  );

  const cmsRows = (breakdownCms as Array<{ scope_id: string; name: string; revenue: number; views: number; currency?: string }>) ?? [];
  const partnerRawRows = (breakdownPartner as Array<{ scope_id: string; name: string; revenue: number; views: number }>) ?? [];
  const mergedPartnerMap = new Map<string, { scope_id: string; name: string; revenue: number; views: number }>();
  partnerRawRows.forEach((r) => {
    const key = r.name ?? "Không tên";
    const cur = mergedPartnerMap.get(key) ?? { scope_id: r.scope_id, name: key, revenue: 0, views: 0 };
    cur.revenue += Number(r.revenue ?? 0);
    cur.views   += Number(r.views   ?? 0);
    mergedPartnerMap.set(key, cur);
  });
  const partnerRows = Array.from(mergedPartnerMap.values()).sort((a, b) => b.revenue - a.revenue);
  const topicRawRows = (breakdownTopic as Array<{ scope_id: string; name: string; revenue: number; channel_count?: number }>) ?? [];
  const topicRows = topicRawRows
    .map((r) => ({ scope_id: r.scope_id, name: r.name ?? "Không tên", revenue: Number(r.revenue ?? 0), channel_count: Number(r.channel_count ?? 0) }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
  const topicTotal = topicRows.reduce((s, r) => s + r.revenue, 0);

  const ownerRawRows = (breakdownContentOwner as Array<{ scope_id: string; name: string; revenue: number; channel_count?: number }>) ?? [];
  const ownerRows = ownerRawRows
    .map((r) => ({ scope_id: r.scope_id, name: r.name ?? "Chưa gán", revenue: Number(r.revenue ?? 0), channel_count: Number(r.channel_count ?? 0) }))
    .filter((r) => r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // ── Per-entity separate line queries ──────────────────────────
  // Build list of entities to show as separate lines
  const entityItems = useMemo(() => {
    const items: Array<{ key: string; label: string; color: string; cmsIds: string[]; partnerIds: string[]; topicIds: string[]; contentOwners: string[] }> = [];
    const ENTITY_COLORS = [C.amber, C.blue, C.cyan, C.purple, C.teal, C.green, "#f97316", "#ec4899", "#a78bfa"];
    let colorIdx = 0;

    // CMS acts as a scoping constraint when other filter types are also active.
    // Only generate standalone CMS lines when NO partner/topic/owner is selected.
    const hasNonCmsFilter = filterPartner.length > 0 || filterTopic.length > 0 || filterContentOwner.length > 0;
    const cmsScope = filterCms; // passed as constraint to partner/topic/owner lines

    if (!hasNonCmsFilter) {
      filterCms.forEach((id) => {
        items.push({ key: `cms_${id}`, label: cmsRows.find((r) => r.scope_id === id)?.name ?? id,
          color: ENTITY_COLORS[(colorIdx++) % ENTITY_COLORS.length] ?? C.amber,
          cmsIds: [id], partnerIds: [], topicIds: [], contentOwners: [] });
      });
    }
    filterPartner.forEach((id) => {
      items.push({ key: `partner_${id}`, label: partnerRows.find((r) => r.scope_id === id)?.name ?? id,
        color: ENTITY_COLORS[(colorIdx++) % ENTITY_COLORS.length] ?? C.blue,
        cmsIds: cmsScope, partnerIds: [id], topicIds: [], contentOwners: [] });
    });
    filterTopic.forEach((id) => {
      items.push({ key: `topic_${id}`, label: topicRows.find((r) => String(r.scope_id) === id)?.name ?? id,
        color: ENTITY_COLORS[(colorIdx++) % ENTITY_COLORS.length] ?? C.purple,
        cmsIds: cmsScope, partnerIds: [], topicIds: [id], contentOwners: [] });
    });
    filterContentOwner.forEach((name) => {
      items.push({ key: `owner_${name}`, label: ownerRows.find((r) => r.scope_id === name)?.name ?? name,
        color: ENTITY_COLORS[(colorIdx++) % ENTITY_COLORS.length] ?? C.teal,
        cmsIds: cmsScope, partnerIds: [], topicIds: [], contentOwners: [name] });
    });
    return items;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCms.join(","), filterPartner.join(","), filterTopic.join(","), filterContentOwner.join(","), cmsRows.length, partnerRows.length, topicRows.length, ownerRows.length]);

  const isMultiEntity = hasAnyFilter && entityItems.length >= 2;

  // Fetch per-entity daily data (only when multi-entity mode)
  const entityQueryParams = useMemo(() => {
    const sp: Record<string, string> = activeParams.from && activeParams.to
      ? { from: activeParams.from, to: activeParams.to }
      : { period: String(breakdownPeriod) };
    return sp;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeParams.from, activeParams.to, breakdownPeriod]);

  type DailyRow = { snapshot_date: string; revenue: number; views: number; subscribers: number };
  type TimelineEntry = { date: string; [key: string]: string | number };
  const perEntityResults = useQueries({
    queries: isMultiEntity ? entityItems.map((e) => ({
      queryKey: ["revenue", "entity-line", e.key, entityQueryParams],
      queryFn: async (): Promise<DailyRow[]> => {
        const sp: Record<string, string> = { ...entityQueryParams };
        if (e.cmsIds.length)        sp.cmsId        = e.cmsIds.join(",");
        if (e.partnerIds.length)    sp.partnerId    = e.partnerIds.join(",");
        if (e.topicIds.length)      sp.topicId      = e.topicIds.join(",");
        if (e.contentOwners.length) sp.contentOwner = e.contentOwners.join(",");
        return apiClient.get("revenue/multi-daily", { searchParams: sp }).json<DailyRow[]>();
      },
      enabled: true,
    })) : [],
  });

  // Build merged multi-entity timeline (keyed by entity label)
  const multiEntityTimeline = useMemo((): TimelineEntry[] => {
    if (!isMultiEntity) return [];
    const dateMap = new Map<string, TimelineEntry>();
    perEntityResults.forEach((res, i) => {
      const label = entityItems[i]?.label ?? `Entity ${i}`;
      (res.data ?? []).forEach((row) => {
        const d = fmtDate(row.snapshot_date);
        if (!dateMap.has(d)) dateMap.set(d, { date: d });
        const entry = dateMap.get(d)!;
        entry[`${label}__revenue`]     = Number(row.revenue     ?? 0);
        entry[`${label}__views`]       = Number(row.views       ?? 0);
        entry[`${label}__subscribers`] = Number(row.subscribers ?? 0);
      });
    });
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [isMultiEntity, perEntityResults, entityItems]);

  const perEntityLoading = isMultiEntity && perEntityResults.some((r) => r.isLoading);

  const activeDaily   = hasAnyFilter ? (multiDailyRaw ?? []) : (systemDaily ?? []);
  const activeLoading = isMultiEntity ? perEntityLoading : (hasAnyFilter ? multiDailyLoading : systemDailyLoading);

  const timeline = activeDaily.map((r) => ({
    date:        fmtDate(r.snapshot_date),
    revenue:     Number(r.revenue     ?? 0),
    views:       Number(r.views       ?? 0),
    subscribers: Number(r.subscribers ?? 0),
  }));

  // Totals: sum from per-entity results when multi-entity, else from aggregated
  const multiEntityTotals = useMemo(() => {
    if (!isMultiEntity) return null;
    return perEntityResults.reduce((acc, res) => {
      (res.data ?? []).forEach((row) => {
        acc.revenue     += Number(row.revenue     ?? 0);
        acc.views       += Number(row.views       ?? 0);
        acc.subscribers += Number(row.subscribers ?? 0);
      });
      return acc;
    }, { revenue: 0, views: 0, subscribers: 0 });
  }, [isMultiEntity, perEntityResults]);

  const totalByMetric = multiEntityTotals ?? {
    revenue:     timeline.reduce((s, r) => s + r.revenue,     0),
    views:       timeline.reduce((s, r) => s + r.views,       0),
    subscribers: timeline.reduce((s, r) => s + r.subscribers, 0),
  } as const;

  const toggleMetric = (key: MetricKey) =>
    setSelectedMetrics((prev) => prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]);

  const clearAllFilters = () => { setFilterCms([]); setFilterPartner([]); setFilterTopic([]); setFilterContentOwner([]); };

  // Build label tags for active filters
  const filterTags: string[] = [
    ...filterCms.map((id) => cmsRows.find((r) => r.scope_id === id)?.name ?? id),
    ...filterPartner.map((id) => partnerRows.find((r) => r.scope_id === id)?.name ?? id),
    ...filterTopic.map((id) => topicRows.find((r) => String(r.scope_id) === id)?.name ?? id),
    ...filterContentOwner.map((name) => ownerRows.find((r) => r.scope_id === name)?.name ?? name),
  ];

  const periodLabel = fromDate && toDate
    ? `${fromDate} → ${toDate}`
    : (PERIOD_OPTIONS.find((p) => p.key === periodKey)?.label ?? "30 ngày");

  const normalizePieData = (rows: Array<{ name: string; revenue: number }>) => {
    const list = rows
      .map((r) => ({ name: r.name, revenue: Number(r.revenue ?? 0) }))
      .filter((r) => r.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
    const top   = list.slice(0, 8);
    const other = list.slice(8).reduce((s, x) => s + x.revenue, 0);
    return other > 0 ? [...top, { name: "Khác", revenue: other }] : top;
  };
  const cmsPie      = normalizePieData(
    filterCms.length > 0
      ? cmsRows.filter((r) => filterCms.includes(r.scope_id))
      : cmsRows
  );
  const partnerPie  = normalizePieData(
    filterPartner.length > 0
      ? partnerRows.filter((r) => filterPartner.includes(r.scope_id))
      : partnerRows
  );
  const filteredTopicRows = filterTopic.length > 0
    ? topicRows.filter((r) => filterTopic.includes(String(r.scope_id)))
    : topicRows;
  const cmsTotal    = cmsPie.reduce((s, x) => s + x.revenue, 0);
  const partnerTotal = partnerPie.reduce((s, x) => s + x.revenue, 0);
  const filteredTopicTotal = filteredTopicRows.reduce((s, r) => s + r.revenue, 0);

  // Options for multi-select dropdowns
  const cmsOptions          = cmsRows.map((r)     => ({ value: r.scope_id,         label: r.name }));
  const partnerOptions      = partnerRows.map((r) => ({ value: r.scope_id,         label: r.name }));
  const topicOptions        = topicRows.map((r)   => ({ value: String(r.scope_id), label: r.name }));
  const contentOwnerOptions = ownerRows.map((r)   => ({ value: r.scope_id,         label: r.name }));

  const filteredOwnerRows   = filterContentOwner.length > 0
    ? ownerRows.filter((r) => filterContentOwner.includes(r.scope_id))
    : ownerRows;
  const filteredOwnerTotal  = filteredOwnerRows.reduce((s, r) => s + r.revenue, 0);

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Doanh thu</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
            Tổng: <span style={{ color: C.amber, fontWeight: 600 }}>{fmtCurrency(totalByMetric.revenue)}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {METRIC_OPTIONS.map((opt) => (
            <Button key={opt.key} size="sm" variant={selectedMetrics.includes(opt.key) ? "primary" : "secondary"} onClick={() => toggleMetric(opt.key)}>
              <span style={{ marginRight: 6 }}>{selectedMetrics.includes(opt.key) ? "✓" : "○"}</span>
              {opt.label}
            </Button>
          ))}
          {PERIOD_OPTIONS.filter((opt) => opt.key !== "180").map((opt) => (
            <Button key={opt.key} size="sm" variant={periodKey === opt.key ? "primary" : "secondary"} onClick={() => { setPeriodKey(opt.key); setFromDate(""); }}>
              {opt.label}
            </Button>
          ))}
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)}
            style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }} title="Từ ngày" />
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)}
            style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }} title="Đến ngày" />
        </div>
      </div>

      {/* Multi-select filter row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>Lọc biểu đồ theo:</span>
        <MultiSelect label="CMS"           options={cmsOptions}          selected={filterCms}          onChange={setFilterCms}          color={C.amber}  />
        <MultiSelect label="Đối tác"       options={partnerOptions}      selected={filterPartner}      onChange={setFilterPartner}      color={C.blue}   />
        <MultiSelect label="Chủ đề"        options={topicOptions}        selected={filterTopic}        onChange={setFilterTopic}        color={C.purple} />
        <MultiSelect label="Code" options={contentOwnerOptions} selected={filterContentOwner} onChange={setFilterContentOwner} color={C.teal}   />
        {hasAnyFilter && (
          <button onClick={clearAllFilters}
            style={{ height: 30, padding: "0 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>
            ✕ Xoá lọc
          </button>
        )}
        {/* Active filter tags */}
        {filterTags.map((label, i) => (
          <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: `${C.amber}22`, color: C.amber, border: `1px solid ${C.amber}44` }}>
            {label}
          </span>
        ))}
      </div>

      {/* Timeline chart */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>
          {filterTags.length > 0
            ? <><span style={{ color: C.textMuted, fontWeight: 400 }}>Doanh thu — </span><span style={{ color: C.amber }}>{filterTags.join(" + ")}</span></>
            : "Tổng theo thời gian"
          }
          <span style={{ marginLeft: 4, color: C.textMuted, fontWeight: 400 }}>({periodLabel})</span>
          <span style={{ marginLeft: 8,  color: C.amber  }}>Revenue: {fmtCurrency(totalByMetric.revenue)}</span>
          <span style={{ marginLeft: 12, color: C.blue   }}>Views: {fmt(totalByMetric.views)}</span>
          <span style={{ marginLeft: 12, color: C.purple }}>Subscribers: {fmt(totalByMetric.subscribers)}</span>
        </div>
        {activeLoading ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
        ) : selectedMetrics.length === 0 ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>
            Chọn ít nhất 1 chỉ số để hiển thị biểu đồ
          </div>
        ) : isMultiEntity ? (
          /* ── Multi-entity mode: one line per entity ── */
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={multiEntityTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              {selectedMetrics.includes("revenue") && (
                <YAxis yAxisId="revenue" orientation="left" tick={{ fontSize: 11, fill: C.amber }} tickLine={false} width={72}
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}`} />
              )}
              {(selectedMetrics.includes("views") || selectedMetrics.includes("subscribers")) && (
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: C.blue }} tickLine={false} width={64}
                  tickFormatter={(v: number) => fmt(v)} />
              )}
              <Tooltip
                content={(props) => (
                  <CustomMultiTooltip
                    active={props.active}
                    payload={props.payload as Array<{ name: string; value: number; color?: string }>}
                    label={props.label as string}
                    entityItems={entityItems}
                  />
                )}
              />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) => value.split("__")[0]}
              />
              {entityItems.map((e) =>
                selectedMetrics.map((metric) => (
                  <Line
                    key={`${e.key}__${metric}`}
                    yAxisId={metric === "revenue" ? "revenue" : "count"}
                    type="monotone"
                    dataKey={`${e.label}__${metric}`}
                    stroke={e.color}
                    strokeWidth={2.2}
                    dot={false}
                    name={`${e.label}__${metric}`}
                    strokeDasharray={metric === "views" ? "5 3" : metric === "subscribers" ? "2 2" : undefined}
                  />
                ))
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          /* ── Single aggregated mode ── */
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              {/* Left Y-axis: Revenue */}
              {selectedMetrics.includes("revenue") && (
                <YAxis yAxisId="revenue" orientation="left" tick={{ fontSize: 11, fill: C.amber }} tickLine={false} width={72}
                  tickFormatter={(v: number) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toFixed(0)}`} />
              )}
              {/* Right Y-axis: Views / Subscribers */}
              {(selectedMetrics.includes("views") || selectedMetrics.includes("subscribers")) && (
                <YAxis yAxisId="count" orientation="right" tick={{ fontSize: 11, fill: C.blue }} tickLine={false} width={64}
                  tickFormatter={(v: number) => fmt(v)} />
              )}
              <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: "#fff" }} itemStyle={{ color: "#fff" }}
                formatter={(v: number, name: string) => name === "Revenue" ? [fmtCurrency(v), name] : [fmt(v), name]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              {selectedMetrics.includes("revenue")     && <Line yAxisId="revenue" type="monotone" dataKey="revenue"     stroke={C.amber}  strokeWidth={2.5} dot={false} name="Revenue" />}
              {selectedMetrics.includes("views")       && <Line yAxisId="count"   type="monotone" dataKey="views"       stroke={C.blue}   strokeWidth={2.2} dot={false} name="Views" />}
              {selectedMetrics.includes("subscribers") && <Line yAxisId="count"   type="monotone" dataKey="subscribers" stroke={C.purple} strokeWidth={2.2} dot={false} name="Subscribers" />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Pie charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {/* CMS */}
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Doanh thu của CMS (%) — {periodLabel}</div>
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
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: "#fff" }} itemStyle={{ color: "#fff" }}
                    formatter={(v: number, _n: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "CMS"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {cmsPie.slice(0, 5).map((r, i) => {
                  const row = cmsRows.find((x) => x.name === r.name);
                  const isActive = row ? filterCms.includes(row.scope_id) : false;
                  return (
                    <div key={r.name} onClick={() => { if (!row) return; setFilterCms(isActive ? filterCms.filter(x => x !== row.scope_id) : [...filterCms, row.scope_id]); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}>
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

        {/* Partner */}
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Doanh thu của đối tác (%) — {periodLabel}</div>
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
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: "#fff" }} itemStyle={{ color: "#fff" }}
                    formatter={(v: number, _n: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "Đối tác"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {partnerPie.slice(0, 5).map((r, i) => {
                  const row = partnerRows.find((x) => x.name === r.name);
                  const isActive = row ? filterPartner.includes(row.scope_id) : false;
                  return (
                    <div key={r.name} onClick={() => { if (!row) return; setFilterPartner(isActive ? filterPartner.filter(x => x !== row.scope_id) : [...filterPartner, row.scope_id]); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}>
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

        {/* Topic */}
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Doanh thu theo Chủ đề (%) — {periodLabel}</div>
          {topicBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
          ) : filteredTopicRows.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chưa có dữ liệu</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={normalizePieData(filteredTopicRows)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {normalizePieData(filteredTopicRows).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: "#fff" }} itemStyle={{ color: "#fff" }}
                    formatter={(v: number, _n: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "Chủ đề"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {normalizePieData(filteredTopicRows).slice(0, 5).map((r, i) => {
                  const row = topicRows.find((x) => x.name === r.name);
                  const scopeStr = String(row?.scope_id ?? "");
                  const isActive = filterTopic.includes(scopeStr);
                  return (
                    <div key={r.name} onClick={() => { if (!row) return; setFilterTopic(isActive ? filterTopic.filter(x => x !== scopeStr) : [...filterTopic, scopeStr]); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{filteredTopicTotal > 0 ? ((r.revenue / filteredTopicTotal) * 100).toFixed(1) : "0.0"}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        {/* Content Owner */}
        <Card padding="16px">
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Doanh thu theo Code (%) — {periodLabel}</div>
          {ownerBreakdownLoading ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
          ) : filteredOwnerRows.length === 0 ? (
            <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textMuted }}>Chưa có dữ liệu</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={normalizePieData(filteredOwnerRows)} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={2}>
                    {normalizePieData(filteredOwnerRows).map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: "#fff" }} itemStyle={{ color: "#fff" }}
                    formatter={(v: number, _n: string, item: { payload?: { name?: string } }) => [fmtCurrency(v), item?.payload?.name ?? "Code"]} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gap: 6 }}>
                {normalizePieData(filteredOwnerRows).slice(0, 5).map((r, i) => {
                  const row = ownerRows.find((x) => x.name === r.name);
                  const isActive = row ? filterContentOwner.includes(row.scope_id) : false;
                  return (
                    <div key={r.name} onClick={() => { if (!row) return; setFilterContentOwner(isActive ? filterContentOwner.filter(x => x !== row.scope_id) : [...filterContentOwner, row.scope_id]); }}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", borderRadius: 4, padding: "2px 4px", background: isActive ? `${PIE_COLORS[i % PIE_COLORS.length]}22` : "transparent" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: C.textSub, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: C.textMuted }}>{filteredOwnerTotal > 0 ? ((r.revenue / filteredOwnerTotal) * 100).toFixed(1) : "0.0"}%</span>
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
