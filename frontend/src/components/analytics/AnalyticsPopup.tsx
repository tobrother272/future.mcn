import { useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { C, RADIUS } from "@/styles/theme";
import { Modal, Button } from "@/components/ui";
import {
  PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey,
} from "@/lib/periods";
import { fmt, fmtCurrency, fmtDate } from "@/lib/format";
import { usePartnerRevenueGrouped } from "@/api/partners.api";
import { useChannelAnalytics } from "@/api/channels.api";

const LINE_COLORS = [
  C.amber, C.blue, C.green, C.purple, C.cyan, C.pink, C.orange,
  C.teal, C.red, "#a78bfa", "#f472b6", "#22d3ee", "#fbbf24", "#34d399",
];

type GroupBy = "child" | "channel";
type Metric = "revenue" | "views";

interface ChartDatum {
  date: string;
  [seriesName: string]: number | string;
}

// ── Period filter bar (shared) ───────────────────────────────
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
      marginBottom: 14,
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
        style={{ height: 30, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
      />
      <span style={{ fontSize: 11, color: C.textMuted }}>→</span>
      <input type="date" value={toDate} min={fromDate || undefined}
        onChange={(e) => onChangeTo(e.target.value)}
        style={{ height: 30, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
      />
      {fromDate && (
        <Button size="sm" variant="ghost" onClick={onClearRange}>Xoá khoảng</Button>
      )}
    </div>
  );
}

// ── Metric toggle ────────────────────────────────────────────
function MetricToggle({ metric, onChange }: { metric: Metric; onChange: (m: Metric) => void }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <Button
        size="sm"
        variant={metric === "revenue" ? "primary" : "secondary"}
        onClick={() => onChange("revenue")}
      >
        Doanh thu
      </Button>
      <Button
        size="sm"
        variant={metric === "views" ? "primary" : "secondary"}
        onClick={() => onChange("views")}
      >
        Lượt xem
      </Button>
    </div>
  );
}

// ── Multi-line chart for grouped data (partner mode) ─────────
function GroupedLineChart({
  rows, metric, currency,
}: {
  rows: { snapshot_date: string; group_name: string; revenue: number; views: number }[];
  metric: Metric;
  currency: string;
}) {
  // Pivot long → wide: { date, [group_name]: metricValue }
  const { chartData, seriesNames } = useMemo(() => {
    const dateMap = new Map<string, ChartDatum>();
    const names = new Set<string>();
    for (const r of rows) {
      names.add(r.group_name);
      const dateKey = r.snapshot_date;
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { date: fmtDate(dateKey), _rawDate: dateKey });
      }
      const datum = dateMap.get(dateKey)!;
      datum[r.group_name] = Number(r[metric] ?? 0);
    }
    const data = Array.from(dateMap.values())
      .sort((a, b) => String(a._rawDate).localeCompare(String(b._rawDate)));
    return { chartData: data, seriesNames: Array.from(names).sort() };
  }, [rows, metric]);

  if (chartData.length === 0 || seriesNames.length === 0) {
    return (
      <div style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8 }}>
        <BarChart2 size={32} color={C.textMuted} />
        <div style={{ fontSize: 14 }}>Chưa có dữ liệu trong khoảng thời gian này</div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={420}>
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
          formatter={(v: number, name: string) => [
            metric === "revenue" ? fmtCurrency(v, currency) : fmt(v),
            name,
          ]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
          iconType="line"
        />
        {seriesNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            name={name}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Single-channel analytics chart ───────────────────────────
function ChannelAnalyticsChart({
  rows, metric, currency,
}: {
  rows: { date: string; revenue: number; views: number }[];
  metric: Metric;
  currency: string;
}) {
  const data = rows.map((r) => ({
    date: fmtDate(r.date),
    revenue: Number(r.revenue ?? 0),
    views: Number(r.views ?? 0),
  }));

  if (data.length === 0) {
    return (
      <div style={{ height: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8 }}>
        <BarChart2 size={32} color={C.textMuted} />
        <div style={{ fontSize: 14 }}>Chưa có dữ liệu trong khoảng thời gian này</div>
      </div>
    );
  }

  const color = metric === "revenue" ? C.amber : C.blue;
  const label = metric === "revenue" ? "Doanh thu" : "Lượt xem";

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
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
            metric === "revenue" ? fmtCurrency(v, currency) : fmt(v),
            label,
          ]}
        />
        <Line type="monotone" dataKey={metric} stroke={color} strokeWidth={2.5} dot={false} name={label} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ══════════════════════════════════════════════════════════════
// PARTNER ANALYTICS POPUP — line chart group-by đối tác con / channel
// ══════════════════════════════════════════════════════════════
export function PartnerAnalyticsPopup({
  open, onClose, partnerId, partnerName, isParent, currency = "USD",
}: {
  open: boolean;
  onClose: () => void;
  partnerId: string;
  partnerName: string;
  isParent: boolean;
  currency?: string;
}) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState(todayInputDate());
  const [metric, setMetric]       = useState<Metric>("revenue");
  // Đối tác cha có 2 tab; đối tác con chỉ có tab "channel"
  const [groupBy, setGroupBy]     = useState<GroupBy>(isParent ? "child" : "channel");

  const activeParams = fromDate && toDate ? { from: fromDate, to: toDate } : periodToParams(periodKey);

  const { data: rows = [], isLoading } = usePartnerRevenueGrouped(
    open ? partnerId : "",
    groupBy,
    activeParams,
  );

  const tabs: { key: GroupBy; label: string }[] = isParent
    ? [
        { key: "child",   label: "Theo đối tác con" },
        { key: "channel", label: "Theo channel" },
      ]
    : [
        { key: "channel", label: "Theo channel" },
      ];

  // KPI tổng theo metric đang chọn
  const totals = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + Number(r.revenue ?? 0),
      views:   acc.views   + Number(r.views   ?? 0),
    }),
    { revenue: 0, views: 0 }
  );
  const groupCount = new Set(rows.map((r) => r.group_id)).size;

  return (
    <Modal open={open} onClose={onClose} title={`Analytics — ${partnerName}`} fullscreen>
      <PeriodBar
        periodKey={periodKey}
        fromDate={fromDate}
        toDate={toDate}
        onSelectPeriod={(k) => { setPeriodKey(k); setFromDate(""); }}
        onChangeFrom={setFromDate}
        onChangeTo={setToDate}
        onClearRange={() => setFromDate("")}
      />

      {/* Tabs + metric toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, gap: 0 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setGroupBy(t.key)} style={{
              padding: "8px 18px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
              color: groupBy === t.key ? C.blue : C.textSub,
              borderBottom: groupBy === t.key ? `2px solid ${C.blue}` : "2px solid transparent",
            }}>
              {t.label}
            </button>
          ))}
        </div>
        <MetricToggle metric={metric} onChange={setMetric} />
      </div>

      {/* KPI summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Tổng doanh thu</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>{fmtCurrency(totals.revenue, currency)}</div>
        </div>
        <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Tổng lượt xem</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{fmt(totals.views)}</div>
        </div>
        <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Số {groupBy === "child" ? "đối tác" : "kênh"} có data</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{groupCount}</div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 16 }}>
        {isLoading ? (
          <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>
            Đang tải...
          </div>
        ) : (
          <GroupedLineChart rows={rows} metric={metric} currency={currency} />
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: C.textMuted, textAlign: "center" }}>
          Click vào nhãn trong legend để bật/tắt từng đường
        </div>
      </div>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════
// CHANNEL ANALYTICS POPUP — đơn giản, 1 line theo metric chọn
// ══════════════════════════════════════════════════════════════
export function ChannelAnalyticsPopup({
  open, onClose, channelId, channelName, currency = "USD",
}: {
  open: boolean;
  onClose: () => void;
  channelId: string;
  channelName: string;
  currency?: string;
}) {
  const [periodKey, setPeriodKey] = useState<PeriodKey>("30");
  const [fromDate, setFromDate]   = useState("");
  const [toDate, setToDate]       = useState(todayInputDate());
  const [metric, setMetric]       = useState<Metric>("revenue");

  const activeParams = fromDate && toDate ? { from: fromDate, to: toDate } : periodToParams(periodKey);
  const { data, isLoading } = useChannelAnalytics(open ? channelId : "", activeParams);

  const items = data?.items ?? [];
  const totals = items.reduce(
    (acc, r) => ({
      revenue: acc.revenue + Number(r.revenue ?? 0),
      views:   acc.views   + Number(r.views   ?? 0),
    }),
    { revenue: 0, views: 0 }
  );

  return (
    <Modal open={open} onClose={onClose} title={`Analytics — ${channelName}`} fullscreen>
      <PeriodBar
        periodKey={periodKey}
        fromDate={fromDate}
        toDate={toDate}
        onSelectPeriod={(k) => { setPeriodKey(k); setFromDate(""); }}
        onChangeFrom={setFromDate}
        onChangeTo={setToDate}
        onClearRange={() => setFromDate("")}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 12 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          Dữ liệu lấy từ channel_analytics theo ngày
        </span>
        <MetricToggle metric={metric} onChange={setMetric} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Tổng doanh thu</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>{fmtCurrency(totals.revenue, currency)}</div>
        </div>
        <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Tổng lượt xem</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{fmt(totals.views)}</div>
        </div>
        <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>Số ngày có data</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{items.length}</div>
        </div>
      </div>

      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: 16 }}>
        {isLoading ? (
          <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>
            Đang tải...
          </div>
        ) : (
          <ChannelAnalyticsChart rows={items} metric={metric} currency={currency} />
        )}
      </div>
    </Modal>
  );
}
