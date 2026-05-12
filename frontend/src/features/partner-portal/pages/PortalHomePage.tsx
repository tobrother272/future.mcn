import { useNavigate } from "react-router-dom";
import {
  Tv2, FileText, AlertTriangle, ShieldCheck, User,
  TrendingUp, CheckCircle, Clock, UploadCloud, ChevronRight,
  Building2, Star,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Pill, Card } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { usePartnerProfile } from "@/api/partners.api";
import { usePartnerContracts } from "@/api/contracts.api";
import { fmtCurrency, fmt } from "@/lib/format";

// ── helpers ──────────────────────────────────────────────────
function ago(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Hôm nay";
  if (d === 1) return "Hôm qua";
  if (d < 30)  return `${d} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}

// ── KPI Card ─────────────────────────────────────────────────
function KpiCard({
  icon, label, value, sub, color = C.blue,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
      padding: "18px 20px", display: "flex", gap: 14, alignItems: "center",
      boxShadow: SHADOW.sm,
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: RADIUS.sm, flexShrink: 0,
        background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

// ── Nav shortcut card ─────────────────────────────────────────
function NavCard({
  icon, label, desc, to, color = C.blue,
}: { icon: React.ReactNode; label: string; desc: string; to: string; color?: string }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(to)}
      style={{
        background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`,
        padding: "16px 18px", cursor: "pointer", transition: "border-color .15s, background .15s",
        display: "flex", alignItems: "center", gap: 14,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = color;
        (e.currentTarget as HTMLDivElement).style.background = C.bgHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = C.border;
        (e.currentTarget as HTMLDivElement).style.background = C.bgCard;
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: RADIUS.sm, flexShrink: 0,
        background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        <div style={{ fontSize: 11, color: C.textSub, marginTop: 1 }}>{desc}</div>
      </div>
      <ChevronRight size={14} color={C.textMuted} />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalHomePage() {
  const user = useAuthStore((s) => s.user);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";
  const { data: profile, isLoading } = usePartnerProfile(partnerId);
  const { data: contracts = [] } = usePartnerContracts(partnerId);

  const channels  = (profile?.channels  as Array<Record<string,unknown>> | undefined) ?? [];
  const activeChannels    = channels.filter((c) => c.status === "Active").length;
  const monetizedChannels = channels.filter((c) => c.monetization === "On").length;
  const recentChannels    = [...channels].sort((a, b) =>
    new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  ).slice(0, 5);
  const recentContracts = [...contracts].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 4);

  const partnerName = user?.userType === "partner"
    ? ((user as { full_name?: string }).full_name ?? user.email)
    : "Đối tác";
  const currency = (profile as Record<string, unknown> | undefined)?.currency as string | undefined ?? "USD";

  return (
    <div style={{ padding: "24px 28px", maxWidth: 960, margin: "0 auto" }}>

      {/* ── Welcome banner ─────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.blue}22 0%, ${C.purple}18 100%)`,
        border: `1px solid ${C.blue}40`,
        borderRadius: RADIUS.lg, padding: "24px 28px", marginBottom: 28,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 11, color: C.blueLight, fontWeight: 600, letterSpacing: 1, marginBottom: 4 }}>
            CỔNG THÔNG TIN ĐỐI TÁC
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0 }}>
            Xin chào, {partnerName} 👋
          </h1>
          {profile && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <Building2 size={13} color={C.textSub} />
              <span style={{ fontSize: 13, color: C.textSub }}>{(profile as Record<string,unknown>).name as string}</span>
              <Pill color={profile.status === "Active" ? "green" : "gray"}>
                {profile.status as string}
              </Pill>
              {(profile as Record<string,unknown>).tier && (
                <Pill color="blue">
                  <Star size={10} style={{ marginRight: 3 }} />
                  {(profile as Record<string,unknown>).tier as string}
                </Pill>
              )}
            </div>
          )}
        </div>
        <div style={{ opacity: 0.15, fontSize: 72 }}>🏢</div>
      </div>

      {/* ── KPI row ────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px,1fr))", gap: 12, marginBottom: 28 }}>
        <KpiCard
          icon={<Tv2 size={18} color={C.blue} />}
          label="Tổng số kênh"
          value={isLoading ? "…" : fmt(channels.length)}
          sub={`${activeChannels} đang hoạt động`}
          color={C.blue}
        />
        <KpiCard
          icon={<CheckCircle size={18} color={C.green} />}
          label="Kênh đã monetize"
          value={isLoading ? "…" : fmt(monetizedChannels)}
          sub={channels.length ? `${Math.round(monetizedChannels / channels.length * 100)}% tổng kênh` : "—"}
          color={C.green}
        />
        <KpiCard
          icon={<TrendingUp size={18} color={C.amber} />}
          label="Doanh thu"
          value={isLoading ? "…" : fmtCurrency(profile?.total_revenue ?? 0, currency)}
          sub="Tổng tích lũy"
          color={C.amber}
        />
        <KpiCard
          icon={<FileText size={18} color={C.cyan} />}
          label="Hợp đồng"
          value={fmt(contracts.length)}
          sub="Đã ký kết"
          color={C.cyan}
        />
      </div>

      {/* ── Content grid ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>

        {/* Recent channels */}
        <Card padding="0">
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Kênh gần đây</span>
            <span
              onClick={() => {}}
              style={{ fontSize: 11, color: C.blue, cursor: "pointer" }}
              // portal channels page
            >Xem tất cả →</span>
          </div>
          {isLoading ? (
            <div style={{ padding: 20, color: C.textSub, fontSize: 13 }}>Đang tải...</div>
          ) : recentChannels.length === 0 ? (
            <div style={{ padding: 20, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              Chưa có kênh nào
            </div>
          ) : (
            <div>
              {recentChannels.map((ch, i) => (
                <div key={ch.id as string} style={{
                  padding: "10px 18px", borderBottom: i < recentChannels.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: `${C.blue}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Tv2 size={14} color={C.blue} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ch.name as string}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {ch.monetization as string} · {ago(ch.created_at as string)}
                    </div>
                  </div>
                  <Pill color={ch.status === "Active" ? "green" : ch.status === "Suspended" ? "red" : "gray"} style={{ fontSize: 10 }}>
                    {ch.status as string}
                  </Pill>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent contracts */}
        <Card padding="0">
          <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Hợp đồng gần đây</span>
            <span style={{ fontSize: 11, color: C.blue, cursor: "pointer" }}>Xem tất cả →</span>
          </div>
          {recentContracts.length === 0 ? (
            <div style={{ padding: 20, color: C.textMuted, fontSize: 13, textAlign: "center" }}>
              Chưa có hợp đồng nào
            </div>
          ) : (
            <div>
              {recentContracts.map((ct, i) => (
                <div key={ct.id} style={{
                  padding: "10px 18px", borderBottom: i < recentContracts.length - 1 ? `1px solid ${C.border}` : "none",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: `${C.cyan}20`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <FileText size={14} color={C.cyan} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ct.title}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {ct.contract_number ? `#${ct.contract_number} · ` : ""}{ago(ct.created_at)}
                    </div>
                  </div>
                  <Clock size={12} color={C.textMuted} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Quick navigation ────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: 1, marginBottom: 12 }}>
          TRUY CẬP NHANH
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px,1fr))", gap: 10 }}>
          <NavCard
            to="/portal/channels"
            icon={<Tv2 size={16} color={C.blue} />}
            label="Kênh của tôi"
            desc="Xem danh sách & trạng thái kênh"
            color={C.blue}
          />
          <NavCard
            to="/portal/submit"
            icon={<UploadCloud size={16} color={C.green} />}
            label="Gửi video duyệt"
            desc="Submit video mới vào MCN"
            color={C.green}
          />
          <NavCard
            to="/portal/contracts"
            icon={<FileText size={16} color={C.cyan} />}
            label="Hợp đồng"
            desc="Xem & tải hợp đồng đã ký"
            color={C.cyan}
          />
          <NavCard
            to="/portal/alerts"
            icon={<AlertTriangle size={16} color={C.amber} />}
            label="Cảnh báo"
            desc="Thông báo vi phạm & cảnh báo"
            color={C.amber}
          />
          <NavCard
            to="/portal/policy"
            icon={<ShieldCheck size={16} color={C.purple} />}
            label="Chính sách"
            desc="Quy định & điều khoản MCN"
            color={C.purple}
          />
          <NavCard
            to="/portal/profile"
            icon={<User size={16} color={C.pink} />}
            label="Hồ sơ"
            desc="Thông tin tài khoản đối tác"
            color={C.pink}
          />
        </div>
      </div>
    </div>
  );
}
