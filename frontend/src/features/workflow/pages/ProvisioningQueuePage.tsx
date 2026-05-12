import { useState } from "react";
import {
  Tv2, Search, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle, Settings2, User2, Building2, FileVideo,
  ExternalLink, Zap,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import {
  useSubmissionList, useProvisionSubmission, useSubmissionLog,
  type Submission,
} from "@/api/submissions.api";
import { useCmsList, useCmsTopics } from "@/api/cms.api";
import { usePartnerList } from "@/api/partners.api";
import { useToast } from "@/stores/notificationStore";

// ── Provision form ────────────────────────────────────────────
function ProvisionForm({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const provision = useProvisionSubmission();
  const toast = useToast();
  const { data: cmsData } = useCmsList({ limit: 200 });
  const { data: partnerData } = usePartnerList({ limit: 200, status: "Active" });
  const cmsList = cmsData?.items ?? [];
  const partners = partnerData?.items ?? [];

  const [selectedCmsId, setSelectedCmsId] = useState("");
  const [topicId,    setTopicId]    = useState("");
  const [partnerId,  setPartnerId]  = useState(
    // Pre-fill from submission's partner
    sub.partner_name ? (partners.find((p) => p.name === sub.partner_name)?.id ?? "") : ""
  );
  const [ytId,       setYtId]       = useState("");
  const [channelName, setChannelName] = useState(sub.video_title);

  const { data: topics = [] } = useCmsTopics(selectedCmsId);

  const handleProvision = async () => {
    if (!selectedCmsId) { toast.warning("Chưa chọn CMS", "Vui lòng chọn CMS đích"); return; }
    try {
      const result = await provision.mutateAsync({
        id: sub.id,
        channelData: {
          cmsId:     selectedCmsId,
          topicId:   topicId   || undefined,
          partnerId: partnerId || undefined,
          ytId:      ytId      || undefined,
          name:      channelName || sub.video_title,
        },
      });
      toast.success("Cấp kênh thành công!", `Kênh ${result.channel.name} đã được tạo`);
      onDone();
    } catch (err) {
      toast.error("Lỗi cấp kênh", err instanceof Error ? err.message : "Thất bại");
    }
  };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px",
    background: C.bgInput, border: `1px solid ${C.border}`,
    borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none",
  };
  const inputStyle: React.CSSProperties = { ...selectStyle };

  return (
    <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, background: `${C.bgCard}dd` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 12 }}>
        ⚡ Cấp kênh — Xác định điểm đến
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* CMS */}
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>CMS đích *</label>
          <select value={selectedCmsId} onChange={(e) => { setSelectedCmsId(e.target.value); setTopicId(""); }} style={selectStyle}>
            <option value="">— Chọn CMS —</option>
            {cmsList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {/* Topic */}
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Topic</label>
          <select value={topicId} onChange={(e) => setTopicId(e.target.value)} style={selectStyle} disabled={!selectedCmsId}>
            <option value="">— Chọn topic —</option>
            {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {/* Partner */}
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Đối tác</label>
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} style={selectStyle}>
            <option value="">— Chọn đối tác —</option>
            {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        {/* Channel name */}
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>Tên kênh</label>
          <input value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder={sub.video_title} style={inputStyle} />
        </div>
        {/* YouTube ID */}
        <div>
          <label style={{ fontSize: 11, color: C.textMuted, display: "block", marginBottom: 4 }}>YouTube Channel ID</label>
          <input value={ytId} onChange={(e) => setYtId(e.target.value)} placeholder="UC..." style={inputStyle} />
        </div>
        {/* Preview summary */}
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <Button
            variant="primary"
            icon={<Zap size={14} />}
            onClick={() => void handleProvision()}
            disabled={provision.isPending || !selectedCmsId}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {provision.isPending ? "Đang cấp..." : "Cấp kênh ngay"}
          </Button>
        </div>
      </div>
      {/* Destination preview */}
      {selectedCmsId && (
        <div style={{ padding: "8px 12px", background: `${C.teal}12`, borderRadius: RADIUS.sm, border: `1px solid ${C.teal}40`, fontSize: 12, color: C.teal, display: "flex", alignItems: "center", gap: 8 }}>
          <Tv2 size={13} />
          Điểm đến: <strong>{cmsList.find((c) => c.id === selectedCmsId)?.name}</strong>
          {topicId && topics.find((t) => t.id === topicId) && <> › <strong>{topics.find((t) => t.id === topicId)?.name}</strong></>}
          {partnerId && partners.find((p) => p.id === partnerId) && <> · Đối tác: <strong>{partners.find((p) => p.id === partnerId)?.name}</strong></>}
        </div>
      )}
    </div>
  );
}

// ── Submission card ───────────────────────────────────────────
function ProvCard({ sub }: { sub: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const { data: logs = [] } = useSubmissionLog(sub.id);

  return (
    <div style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.teal}40`, overflow: "hidden", boxShadow: SHADOW.sm, marginBottom: 10 }}>
      <div onClick={() => setExpanded((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", transition: "background .12s" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      >
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${C.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <FileVideo size={15} color={C.teal} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{sub.video_title}</span>
            <Pill color="teal">Đã duyệt QC</Pill>
            {sub.category && <span style={{ fontSize: 11, color: C.textMuted }}>{sub.category}</span>}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 3 }}>
            {sub.partner_name && <span style={{ fontSize: 11, color: C.textSub, display: "flex", alignItems: "center", gap: 4 }}><Building2 size={10} />{sub.partner_name}</span>}
            {sub.submitter_name && <span style={{ fontSize: 11, color: C.textSub, display: "flex", alignItems: "center", gap: 4 }}><User2 size={10} />{sub.submitter_name}</span>}
            <span style={{ fontSize: 11, color: C.textMuted }}>{new Date(sub.submitted_at).toLocaleString("vi-VN")}</span>
          </div>
        </div>
        {expanded ? <ChevronDown size={15} color={C.textMuted} /> : <ChevronRight size={15} color={C.textMuted} />}
      </div>

      {expanded && (
        <>
          {/* Details */}
          {(sub.video_url || sub.description || sub.admin_note) && (
            <div style={{ padding: "12px 18px", borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                {sub.video_url && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>URL video</div>
                    <a href={sub.video_url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                      style={{ fontSize: 12, color: C.blue, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      <ExternalLink size={11} />{sub.video_url}
                    </a>
                  </div>
                )}
                {sub.description && <div style={{ fontSize: 12, color: C.textSub }}>{sub.description}</div>}
              </div>
              {sub.admin_note && (
                <div style={{ padding: "8px 12px", background: `${C.teal}12`, borderRadius: RADIUS.sm, borderLeft: `3px solid ${C.teal}` }}>
                  <div style={{ fontSize: 10, color: C.teal, fontWeight: 700, marginBottom: 2 }}>GHI CHÚ QC</div>
                  <div style={{ fontSize: 12, color: C.text }}>{sub.admin_note}</div>
                </div>
              )}
            </div>
          )}
          {/* Provision form */}
          <ProvisionForm sub={sub} onDone={() => setExpanded(false)} />
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ProvisioningQueuePage() {
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useSubmissionList({
    state: "QC_APPROVED",
    search: search || undefined,
    limit: 100,
  });
  const items = data?.items ?? [];

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Settings2 size={20} color={C.teal} />
            Hàng chờ Provisioning
          </h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>Cấp kênh YouTube cho các yêu cầu đã được QC duyệt</p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>Làm mới</Button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Chờ cấp kênh", value: items.length,                                      color: C.teal },
          { label: "Đã duyệt QC",  value: items.filter((s) => s.workflow_state === "QC_APPROVED").length, color: C.green },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "14px 16px", boxShadow: SHADOW.sm }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 340, marginBottom: 16 }}>
        <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tiêu đề, đối tác..."
          style={{ width: "100%", paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
      </div>

      {/* Queue */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : items.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <CheckCircle size={40} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14 }}>Không có yêu cầu nào chờ cấp kênh</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>Các yêu cầu đã được QC duyệt sẽ xuất hiện ở đây</div>
        </div>
      ) : (
        items.map((sub) => <ProvCard key={sub.id} sub={sub} />)
      )}
    </div>
  );
}
