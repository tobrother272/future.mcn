import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Tv } from "lucide-react";
import { C } from "@/styles/theme";
import { Button, Input, Select, EmptyState, Pill, StatusDot } from "@/components/ui";
import { useChannelList } from "@/api/channels.api";
import { useCmsList } from "@/api/cms.api";
import { fmt, fmtCurrency } from "@/lib/format";
import type { ChannelFilters } from "@/types/channel";

export default function ChannelListPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ChannelFilters & { page: number; limit: number; sortBy: string; sortDir: "asc" | "desc" }>({
    page: 1, limit: 50, sortBy: "name", sortDir: "asc",
  });
  const [search, setSearch] = useState("");

  const { data, isLoading } = useChannelList({ ...filters, search: search || undefined });
  const { data: cmsData } = useCmsList();
  const channels = data?.items ?? [];

  const set = (k: string, v: unknown) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Channels</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
            {data?.total ?? 0} kênh tổng cộng
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <Input
          placeholder="Tìm kiếm kênh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={13} />}
          style={{ width: 240 }}
        />
        <Select value={filters.cms_id ?? ""} onChange={(e) => set("cms_id", e.target.value || undefined)} style={{ width: 180 }}>
          <option value="">Tất cả CMS</option>
          {(cmsData?.items ?? []).map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
        </Select>
        <Select value={filters.status ?? ""} onChange={(e) => set("status", e.target.value || undefined)} style={{ width: 140 }}>
          <option value="">Tất cả Status</option>
          {["Active","Pending","Suspended","Terminated"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.monetization ?? ""} onChange={(e) => set("monetization", e.target.value || undefined)} style={{ width: 160 }}>
          <option value="">Monetization</option>
          {["On","Off"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.sortBy} onChange={(e) => set("sortBy", e.target.value)} style={{ width: 160 }}>
          {[["name","Tên"],["monthly_revenue","Revenue"],["subscribers","Subscribers"],["monthly_views","Views"]].map(([v,l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Button size="sm" variant={filters.sortDir === "asc" ? "primary" : "secondary"} onClick={() => set("sortDir", filters.sortDir === "asc" ? "desc" : "asc")}>
          {filters.sortDir === "asc" ? "↑ ASC" : "↓ DESC"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ color: C.textSub, textAlign: "center", padding: 48 }}>Đang tải...</div>
      ) : channels.length === 0 ? (
        <EmptyState icon={<Tv size={32} />} title="Không có kênh nào" description="Thử thay đổi bộ lọc" />
      ) : (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                {["Channel","CMS","Status","Monetization","Views","Revenue","Health"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.map((ch) => (
                <tr
                  key={ch.id}
                  onClick={() => navigate(`/channels/${ch.id}`)}
                  style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ fontWeight: 500, color: C.text }}>{ch.name}</div>
                    {ch.yt_id && <div style={{ fontSize: 11, color: C.textMuted }}>{ch.yt_id}</div>}
                  </td>
                  <td style={{ padding: "10px 16px", color: C.textSub, fontSize: 12 }}>{ch.cms_name ?? "—"}</td>
                  <td style={{ padding: "10px 16px" }}><StatusDot status={ch.status} /></td>
                  <td style={{ padding: "10px 16px" }}><StatusDot status={ch.monetization} /></td>
                  <td style={{ padding: "10px 16px", color: C.text }}>{fmt(ch.monthly_views)}</td>
                  <td style={{ padding: "10px 16px", color: C.amber, fontWeight: 600 }}>
                    {fmtCurrency(ch.monthly_revenue)}
                  </td>
                  <td style={{ padding: "10px 16px" }}><StatusDot status={ch.health} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {data && data.total > filters.limit && (
            <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: C.textSub }}>
                Trang {filters.page} / {Math.ceil(data.total / filters.limit)}
              </span>
              <Button size="sm" variant="secondary" disabled={filters.page <= 1} onClick={() => set("page", filters.page - 1)}>←</Button>
              <Button size="sm" variant="secondary" disabled={filters.page >= Math.ceil(data.total / filters.limit)} onClick={() => set("page", filters.page + 1)}>→</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
