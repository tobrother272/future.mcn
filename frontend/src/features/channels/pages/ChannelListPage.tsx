import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Tag, Tv } from "lucide-react";
import { C } from "@/styles/theme";
import { Button, Input, Select, EmptyState, Pill, StatusDot } from "@/components/ui";
import { useChannelList, useContentOwners } from "@/api/channels.api";
import { useCmsList, useTopics } from "@/api/cms.api";
import { usePartnerList } from "@/api/partners.api";
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
  const { data: topicsData } = useTopics(filters.cms_id ? { cms_id: filters.cms_id } : undefined);
  const { data: partnersData } = usePartnerList({ status: "Active", limit: 500, ...(filters.cms_id ? { cms_id: filters.cms_id } : {}) });
  const { data: contentOwnersList = [] } = useContentOwners();
  const channels = data?.items ?? [];
  const topics = topicsData ?? [];
  const partners = (partnersData?.items ?? []).filter((p) => !!p.parent_id);

  const set = (k: string, v: unknown) => setFilters((f) => ({ ...f, [k]: v, ...(k !== "page" && { page: 1 }) }));

  const HEADERS: Array<{ label: string; align?: "left" | "right" | "center" }> = [
    { label: "CHANNEL" },
    { label: "TOPIC" },
    { label: "CHANNEL'S PARTNER" },
    { label: "CMS" },
    { label: "CODE" },
    { label: "STATUS" },
    { label: "MONO" },
    { label: "LINK DATE" },
    { label: "©", align: "center" },
    { label: "28 DAY REVENUE", align: "right" },
    { label: "LAST DAY REVENUE", align: "right" },
  ];
  const SORT_HEADER_MAP: Record<string, string> = {
    monthly_revenue: "28 DAY REVENUE",
    last_revenue:    "LAST DAY REVENUE",
    name:            "CHANNEL",
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Channels</h1>
          <p style={{ fontSize: 13, color: C.textSub, marginTop: 2 }}>
            {data?.total ?? 0} kênh tổng cộng
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Input
          placeholder="Tìm kiếm kênh..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          icon={<Search size={13} />}
          style={{ width: 220 }}
        />
        <Select value={filters.cms_id ?? ""} onChange={(e) => {
          const v = e.target.value || undefined;
          setFilters((f) => ({ ...f, cms_id: v, topic_id: undefined, partner_id: undefined, page: 1 }));
        }} style={{ width: 160 }}>
          <option value="">Tất cả CMS</option>
          {(cmsData?.items ?? []).map((c) => <option key={String(c.id)} value={String(c.id)}>{String(c.name)}</option>)}
        </Select>
        <Select value={filters.topic_id ?? ""} onChange={(e) => set("topic_id", e.target.value || undefined)} style={{ width: 160 }}>
          <option value="">Tất cả Topic</option>
          {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Select value={filters.partner_id ?? ""} onChange={(e) => set("partner_id", e.target.value || undefined)} style={{ width: 160 }}>
          <option value="">Tất cả Partner</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <Select value={filters.status ?? ""} onChange={(e) => set("status", e.target.value || undefined)} style={{ width: 140 }}>
          <option value="">Tất cả Status</option>
          {["Active","Pending","Suspended","Terminated"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.monetization ?? ""} onChange={(e) => set("monetization", e.target.value || undefined)} style={{ width: 140 }}>
          <option value="">Monetization</option>
          {["On","Off"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.content_owner ?? ""} onChange={(e) => set("content_owner", e.target.value || undefined)} style={{ width: 160 }}>
          <option value="">Tất cả CODE</option>
          {contentOwnersList.map((o) => <option key={o} value={o}>{o}</option>)}
        </Select>
        <Select value={filters.sortBy} onChange={(e) => set("sortBy", e.target.value)} style={{ width: 140 }}>
          {[["name","Tên"],["monthly_revenue","28 Day Revenue"],["last_revenue","Last Day Revenue"],["subscribers","Subscribers"],["total_views","Total Views"]].map(([v,l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Button size="sm" variant={filters.sortDir === "asc" ? "primary" : "secondary"} onClick={() => set("sortDir", filters.sortDir === "asc" ? "desc" : "asc")}>
          {filters.sortDir === "asc" ? "↑ Tăng dần" : "↓ Giảm dần"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ color: C.textSub, textAlign: "center", padding: 48 }}>Đang tải...</div>
      ) : channels.length === 0 ? (
        <EmptyState icon={<Tv size={32} />} title="Không có kênh nào" description="Thử thay đổi bộ lọc" />
      ) : (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1100 }}>
              <thead>
                <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                  {HEADERS.map(({ label, align }) => {
                    const isActive = SORT_HEADER_MAP[filters.sortBy] === label;
                    return (
                      <th key={label} style={{
                        padding: "9px 12px", textAlign: align ?? "left", fontSize: 10, fontWeight: 700,
                        letterSpacing: ".05em", whiteSpace: "nowrap",
                        color: isActive ? "#f59e0b" : C.textMuted,
                        borderBottom: isActive ? "2px solid #f59e0b" : "2px solid transparent",
                      }}>{label}</th>
                    );
                  })}
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
                    {/* Channel */}
                    <td style={{ padding: "9px 12px", minWidth: 180 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200 }}>{ch.name}</div>
                        {ch.is_unlinked && <Pill color="amber">Unlink</Pill>}
                      </div>
                      {ch.yt_id && <div style={{ fontSize: 10, color: C.textMuted }}>{ch.yt_id}</div>}
                    </td>
                    {/* Topic */}
                    <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                      {ch.topic_name ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5, background: `${C.purple}18`, color: C.purple }}>
                          <Tag size={9} />{ch.topic_name}
                        </span>
                      ) : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    {/* Partner → Channel's Partner */}
                    <td style={{ padding: "9px 12px", color: C.textSub, whiteSpace: "nowrap" }}>{ch.partner_name ?? "—"}</td>
                    {/* CMS */}
                    <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                      {ch.cms_name ? (
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.blue }}>{ch.cms_name}</span>
                      ) : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    {/* Content Owners */}
                    <td style={{ padding: "9px 12px", whiteSpace: "nowrap" }}>
                      {ch.content_owner ? (
                        <span style={{ fontSize: 11, color: C.teal }}>{ch.content_owner}</span>
                      ) : <span style={{ color: C.textMuted }}>—</span>}
                    </td>
                    {/* Status */}
                    <td style={{ padding: "9px 12px" }}><StatusDot status={ch.status} /></td>
                    {/* Monetization */}
                    <td style={{ padding: "9px 12px" }}><StatusDot status={ch.monetization} /></td>
                    {/* Link Date */}
                    <td style={{ padding: "9px 12px", color: C.textMuted, whiteSpace: "nowrap" }}>
                      {ch.link_date ? ch.link_date.slice(0, 10) : "—"}
                    </td>
                    {/* Copyright / strikes */}
                    <td style={{ padding: "9px 12px", textAlign: "center" }}>
                      {ch.strikes > 0
                        ? <span style={{ fontWeight: 600, color: C.red, fontSize: 12 }}>{ch.strikes}</span>
                        : <span style={{ color: C.textMuted }}>0</span>
                      }
                    </td>
                    {/* 28D Revenue */}
                    <td style={{ padding: "9px 12px", color: C.amber, fontWeight: 600, textAlign: "right" }}>
                      {fmtCurrency(ch.monthly_revenue)}
                    </td>
                    {/* Last Day Revenue */}
                    <td style={{ padding: "9px 12px", textAlign: "right" }}>
                      {ch.last_revenue > 0 ? (
                        <span style={{ fontWeight: 600, color: C.green }}>{fmtCurrency(ch.last_revenue)}</span>
                      ) : (
                        <span style={{ color: C.textMuted }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
