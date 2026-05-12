import { useState, useMemo } from "react";
import {
  Tv2, ChevronDown, ChevronRight, Search, RefreshCw,
  Users, Eye, DollarSign, AlertTriangle, Building2,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Pill, Button } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { useChannelList } from "@/api/channels.api";
import { usePartnerProfile } from "@/api/partners.api";
import { fmtCurrency, fmt } from "@/lib/format";
import type { Channel } from "@/types/channel";
import type { Partner } from "@/types/partner";

// ── Color maps ────────────────────────────────────────────────
const STATUS_COLOR: Record<string, "green"|"red"|"gray"|"amber"> = {
  Active: "green", Suspended: "red", Terminated: "red", Pending: "amber",
};
const MONO_COLOR: Record<string, "green"|"red"|"gray"|"amber"> = {
  On: "green", Off: "red",
};

// ── Channel row ───────────────────────────────────────────────
function ChannelRow({ ch }: { ch: Channel }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 100px 120px 90px 90px 90px 60px",
        gap: 8, alignItems: "center",
        padding: "10px 16px 10px 40px",
        borderBottom: `1px solid ${C.border}`,
        transition: "background .12s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Tv2 size={12} color={C.blue} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</div>
          {ch.yt_id && <div style={{ fontSize: 10, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.yt_id}</div>}
        </div>
      </div>
      <Pill color={STATUS_COLOR[ch.status] ?? "gray"}>{ch.status}</Pill>
      <Pill color={MONO_COLOR[ch.monetization] ?? "gray"} style={{ fontSize: 10 }}>{ch.monetization}</Pill>
      <div style={{ fontSize: 12, color: C.textSub, textAlign: "right" }}>{fmt(ch.subscribers)}</div>
      <div style={{ fontSize: 12, color: C.textSub, textAlign: "right" }}>{fmt(ch.monthly_views)}</div>
      <div style={{ fontSize: 12, color: C.amber, textAlign: "right", fontWeight: 600 }}>{fmtCurrency(ch.monthly_revenue, "USD")}</div>
      <div style={{ textAlign: "center" }}>
        {ch.strikes > 0
          ? <span style={{ fontSize: 11, color: C.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, justifyContent: "center" }}><AlertTriangle size={11} />{ch.strikes}</span>
          : <span style={{ fontSize: 11, color: C.textMuted }}>—</span>}
      </div>
    </div>
  );
}

// ── Topic group ───────────────────────────────────────────────
function TopicGroup({ topic, channels }: { topic: string; channels: Channel[] }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 16px 7px 28px", cursor: "pointer", background: `${C.purple}10`, borderBottom: `1px solid ${C.border}`, transition: "background .12s" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.purple}1e`)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.purple}10`)}
      >
        {open ? <ChevronDown size={12} color={C.purple} /> : <ChevronRight size={12} color={C.purple} />}
        <span style={{ fontSize: 11, fontWeight: 600, color: C.purple }}>{topic}</span>
        <span style={{ fontSize: 10, color: C.textMuted }}>{channels.length} kênh</span>
      </div>
      {open && channels.map((ch) => <ChannelRow key={ch.id} ch={ch} />)}
    </div>
  );
}

// ── CMS group ─────────────────────────────────────────────────
function CmsGroup({ cms, channels }: { cms: string; channels: Channel[] }) {
  const [open, setOpen] = useState(true);
  const byTopic = useMemo(() => {
    const map = new Map<string, Channel[]>();
    for (const ch of channels) {
      const t = ch.topic_name ?? "Chưa phân loại";
      if (!map.has(t)) map.set(t, []);
      map.get(t)!.push(ch);
    }
    return map;
  }, [channels]);

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", cursor: "pointer", background: `${C.blue}0d`, borderBottom: open ? `1px solid ${C.border}` : "none", transition: "background .12s" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.blue}1a`)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.blue}0d`)}
      >
        {open ? <ChevronDown size={13} color={C.blue} /> : <ChevronRight size={13} color={C.blue} />}
        <Tv2 size={13} color={C.blue} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{cms}</span>
        <span style={{ fontSize: 11, color: C.textMuted }}>{channels.length} kênh</span>
      </div>
      {open && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 100px 120px 90px 90px 90px 60px", gap: 8, padding: "6px 16px 6px 40px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            {["Tên kênh","Trạng thái","Monetization","Subscribers","Views/tháng","Revenue","Strikes"].map((h, i) => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, textAlign: i >= 3 ? "right" : "left" }}>{h}</div>
            ))}
          </div>
          {[...byTopic.entries()].map(([t, chs]) => <TopicGroup key={t} topic={t} channels={chs} />)}
        </>
      )}
    </div>
  );
}

// ── Partner group (fetch own channels) ───────────────────────
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
      (c.cms_name ?? "").toLowerCase().includes(q)
    );
  }, [channels, search]);

  const byCms = useMemo(() => {
    const map = new Map<string, Channel[]>();
    for (const ch of filtered) {
      const cms = ch.cms_name ?? ch.cms_id ?? "Chưa gán CMS";
      if (!map.has(cms)) map.set(cms, []);
      map.get(cms)!.push(ch);
    }
    return map;
  }, [filtered]);

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

      {/* CMS groups */}
      {open && (
        isLoading ? (
          <div style={{ padding: 20, color: C.textSub, fontSize: 13 }}>Đang tải...</div>
        ) : byCms.size === 0 ? (
          <div style={{ padding: 20, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
            {search ? "Không tìm thấy kênh" : "Chưa có kênh nào"}
          </div>
        ) : (
          [...byCms.entries()].map(([cms, chs]) => <CmsGroup key={cms} cms={cms} channels={chs} />)
        )
      )}
    </div>
  );
}

function StatBadge({ icon, value, color = C.textSub }: { icon: React.ReactNode; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span style={{ color: C.textMuted }}>{icon}</span>
      <span style={{ fontSize: 12, color, fontWeight: color === C.amber ? 600 : 400 }}>{value}</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalChannelsPage() {
  const user      = useAuthStore((s) => s.user);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";
  const [search, setSearch]   = useState("");

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
          placeholder="Tìm theo tên kênh, YouTube ID, CMS..."
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
