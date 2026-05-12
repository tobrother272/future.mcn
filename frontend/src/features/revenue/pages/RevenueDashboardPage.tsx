import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { C } from "@/styles/theme";
import { Card, Button, Select } from "@/components/ui";
import { useRevenueBreakdown } from "@/api/revenue.api";
import { fmtCurrency, fmt, fmtDate } from "@/lib/format";

const PERIOD_OPTIONS = [
  { label: "7 ngày",  days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

const COLORS = [C.blue, C.cyan, C.green, C.amber, C.purple, C.orange, C.teal, C.pink];

export default function RevenueDashboardPage() {
  const [period, setPeriod] = useState(30);
  const [by, setBy] = useState<"cms" | "channel" | "partner">("cms");

  const { data: breakdown, isLoading } = useRevenueBreakdown(by, period);
  const rows = (breakdown as Array<{ name: string; revenue: number; views: number; currency?: string }>) ?? [];

  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const barData = rows.slice(0, 10).map((r, i) => ({
    name: r.name?.replace("KUDO ", ""),
    revenue: Number(r.revenue),
    color: COLORS[i % COLORS.length] ?? C.blue,
  }));

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
          {/* Group By */}
          <Select value={by} onChange={(e) => setBy(e.target.value as typeof by)} style={{ width: 130 }}>
            <option value="cms">By CMS</option>
            <option value="partner">By Partner</option>
            <option value="channel">By Channel</option>
          </Select>
          {/* Period */}
          {PERIOD_OPTIONS.map((opt) => (
            <Button key={opt.days} size="sm" variant={period === opt.days ? "primary" : "secondary"} onClick={() => setPeriod(opt.days)}>
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Bar Chart */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>
          Revenue theo {by === "cms" ? "CMS" : by === "partner" ? "Partner" : "Channel"} ({period} ngày)
        </div>
        {isLoading ? (
          <div style={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.textMuted }} tickLine={false} />
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [fmtCurrency(v), "Revenue"]}
              />
              <Bar dataKey="revenue" fill={C.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Table */}
      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.text }}>
          Chi tiết ({rows.length} records)
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bgHover }}>
              <th style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Tên</th>
              <th style={{ padding: "8px 16px", textAlign: "right", fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Revenue</th>
              <th style={{ padding: "8px 16px", textAlign: "right", fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Views</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 16px", color: C.text, fontWeight: 500 }}>{r.name}</td>
                <td style={{ padding: "8px 16px", textAlign: "right", color: C.amber, fontWeight: 600 }}>
                  {fmtCurrency(Number(r.revenue), r.currency ?? "USD")}
                </td>
                <td style={{ padding: "8px 16px", textAlign: "right", color: C.textSub }}>{fmt(Number(r.views))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
