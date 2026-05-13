import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tv2, ChevronDown, ChevronRight, Search, RefreshCw,
  Users, Eye, DollarSign, Building2, Tag,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Pill, Button, StatusDot } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useChannelList } from "@/api/channels.api";
import { usePartnerProfile } from "@/api/partners.api";
import { fmtCurrency, fmt } from "@/lib/format";
import type { Channel } from "@/types/channel";

const COL_HEADERS = [
  "Channel", "Topic", "Partner", "Status", "Monetization",
  "Link Date", "Copyright", "Video", "Total Views", "Subscribers",
  "Revenue", "Last Revenue",
] as const;

// ── Channel table row ───────────────────────────────────────
function ChannelRow({ ch }: { ch: Channel }) {
  const navigate = useNavigate();
  return (
    <tr
      onClick={() => navigate(`/portal/channels/${ch.id}`)}
      title="Xem lịch sử doanh thu chi tiết"
      style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background .12s" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.bgHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
    >
      {/* Channel */}
      <td style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: `${C.blue}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Tv2 size={12} color={C.blue} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {ch.name}
            </div>
            {ch.yt_id && (
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {ch.yt_id}
              </div>
            )}
          </div>
        </div>
      </td>
      {/* Topic */}
      <td style={{ padding: "10px 16px" }}>
        {ch.topic_name ? (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
            background: `${C.purple}18`, color: C.purple,
          }}>
            <Tag size={10} />{ch.topic_name}
          </span>
        ) : (
          <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
        )}
      </td>
      {/* Partner */}
      <td style={{ padding: "10px 16px", color: C.textSub, fontSize: 12 }}>
        {ch.partner_name ?? "—"}
      </td>
      {/* Status */}
      <td style={{ padding: "10px 16px" }}>
        <StatusDot status={ch.status} />
      </td>
      {/* Monetization */}
      <td style={{ padding: "10px 16px" }}>
        <StatusDot status={ch.monetization} />
      </td>
      {/* Link Date */}
      <td style={{ padding: "10px 16px", color: C.textMuted, fontSize: 12, whiteSpace: "nowrap" }}>
        {ch.link_date ? String(ch.link_date).slice(0, 10) : "—"}
      </td>
      {/* Copyright (strikes) */}
      <td style={{ padding: "6px 8px", textAlign: "center", width: 60 }}>
        {(ch.strikes ?? 0) > 0
          ? <span style={{ fontWeight: 600, color: C.red, fontSize: 12 }}>{ch.strikes}</span>
          : <span style={{ color: C.textMuted, fontSize: 12 }}>0</span>}
      </td>
      {/* Video */}
      <td style={{ padding: "10px 16px", color: C.textSub, textAlign: "right" }}>
        {fmt(ch.video ?? 0)}
      </td>
      {/* Total Views */}
      <td style={{ padding: "10px 16px", color: C.text, textAlign: "right" }}>
        {fmt(ch.total_views)}
      </td>
      {/* Subscribers */}
      <td style={{ padding: "10px 16px", color: C.textSub, textAlign: "right" }}>
        {fmt(ch.subscribers)}
      </td>
      {/* Revenue */}
      <td style={{ padding: "10px 16px", color: C.amber, fontWeight: 600, textAlign: "right" }}>
        {fmtCurrency(ch.monthly_revenue)}
      </td>
      {/* Last Revenue */}
      <td style={{ padding: "10px 16px", textAlign: "right" }}>
        {(ch.last_revenue ?? 0) > 0 ? (
          <span
            title={ch.last_sync_analytic ? `Last analytic sync: ${new Date(ch.last_sync_analytic).toLocaleString("vi-VN")}` : "Chưa sync analytics"}
            style={{ fontWeight: 600, color: C.green, cursor: "default", borderBottom: `1px dashed ${C.green}55` }}
          >
            {fmtCurrency(ch.last_revenue)}
          </span>
        ) : (
          <span style={{ color: C.textMuted, fontSize: 12 }}
            title={ch.last_sync_analytic ? `Last analytic sync: ${new Date(ch.last_sync_analytic).toLocaleString("vi-VN")}` : "Chưa sync analytics"}>
            —
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Stat badge in partner header ─────────────────────────────
function StatBadge({ icon, value, color = C.textSub }: { icon: React.ReactNode; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: C.textMuted }}>{icon}</span>
      <span style={{ fontSize: 12, color, fontWeight: color === C.amber ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ── Partner group (header + table) ───────────────────────────
function PartnerGroup({
  partnerId, partnerName, tier, type, isChild = false, search,
}: {
  partnerId: string; partnerName: string; tier?: string; type?: string;
  isChild?: boolean; search: string;
}) {
  const [open, setOpen] = useState(true);
  const { data, isLoading } = useChannelList({ partner_id: partnerId, limit: 500 }, { enabled: !!partnerId });
  const channels = data?.items ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return channels;
    const q = search.toLowerCase();
    return channels.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.yt_id ?? "").toLowerCase().includes(q) ||
      (c.cms_name ?? "").toLowerCase().includes(q) ||
      (c.partner_name ?? "").toLowerCase().includes(q) ||
      (c.topic_name ?? "").toLowerCase().includes(q)
    );
  }, [channels, search]);

  const totalRev  = channels.reduce((s, c) => s + (c.monthly_revenue ?? 0), 0);
  const active    = channels.filter((c) => c.status === "Active").length;
  const monetized = channels.filter((c) => c.monetization === "On").length;
  const accentColor = isChild ? C.teal : C.blue;

  return (
    <div style={{
      background: C.bgCard, borderRadius: RADIUS.md,
      border: `1px solid ${isChild ? C.teal + "50" : C.border}`,
      marginBottom: 16, overflow: "hidden", boxShadow: SHADOW.sm,
    }}>
      {/* Partner header */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", cursor: "pointer",
          background: isChild ? `${C.teal}12` : `${C.blue}12`,
          borderBottom: open ? `1px solid ${C.border}` : "none",
          transition: "background .12s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = isChild ? `${C.teal}20` : `${C.blue}20`)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = isChild ? `${C.teal}12` : `${C.blue}12`)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {open ? <ChevronDown size={15} color={accentColor} /> : <ChevronRight size={15} color={accentColor} />}
          <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accentColor}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Building2 size={16} color={accentColor} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{partnerName}</span>
              {isChild && <Pill color="blue" style={{ fontSize: 10 }}>Đối tác con</Pill>}
              {tier && <Pill color="gray" style={{ fontSize: 10 }}>{tier}</Pill>}
              {type && <span style={{ fontSize: 10, color: C.textMuted }}>· {type}</span>}
            </div>
            <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>
              {channels.length} kênh · {active} active · {monetized} monetized
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
          <StatBadge icon={<Users size={11} />} value={fmt(channels.reduce((s, c) => s + c.subscribers, 0))} />
          <StatBadge icon={<Eye size={11} />} value={fmt(channels.reduce((s, c) => s + c.monthly_views, 0))} />
          <StatBadge icon={<DollarSign size={11} />} value={fmtCurrency(totalRev, "USD")} color={C.amber} />
        </div>
      </div>

      {/* Table */}
      {open && (
        isLoading ? (
          <div style={{ padding: 20, color: C.textSub, fontSize: 13 }}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
            {search ? "Không tìm thấy kênh khớp tìm kiếm" : "Chưa có kênh nào"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
              <thead>
                <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                  {COL_HEADERS.map((h) => (
                    <th key={h} style={{
                      padding: h === "Copyright" ? "9px 8px" : "9px 16px",
                      width: h === "Copyright" ? 70 : undefined,
                      textAlign:
                        h === "Copyright" ? "center"
                        : ["Video", "Total Views", "Subscribers", "Revenue", "Last Revenue"].includes(h) ? "right"
                        : "left",
                      fontSize: 11, fontWeight: 600, color: C.textMuted,
                      whiteSpace: "nowrap", letterSpacing: ".04em",
                    }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ch) => <ChannelRow key={ch.id} ch={ch} />)}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalChannelsPage() {
  const user      = useAuthStore((s) => s.user);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";
  const [search, setSearch] = useState("");

  const { data: profile, refetch } = usePartnerProfile(partnerId);
  const children = profile?.children ?? [];

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Kênh của tôi</h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>
            {profile?.name ?? ""} {children.length > 0 && `· ${children.length} đối tác con`}
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>
          Làm mới
        </Button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20, position: "relative", maxWidth: 360 }}>
        <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên kênh, YouTube ID, partner, topic..."
          style={{
            width: "100%", paddingLeft: 36, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
            color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {!partnerId ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>Tài khoản chưa liên kết với đối tác.</div>
      ) : (
        <>
          {/* Main partner channels */}
          <PartnerGroup
            partnerId={partnerId}
            partnerName={profile?.name ?? "Đối tác của tôi"}
            tier={profile?.tier}
            type={profile?.type}
            isChild={false}
            search={search}
          />

          {/* Child partner channels */}
          {children.map((child) => (
            <PartnerGroup
              key={child.id}
              partnerId={child.id}
              partnerName={child.name}
              tier={child.tier}
              type={child.type}
              isChild
              search={search}
            />
          ))}
        </>
      )}
    </div>
  );
}
