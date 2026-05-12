import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, History, Tv, Upload, CheckCircle, AlertCircle, UserCog, Building2, ArrowRightLeft, Tag, Plus, Server, Trash2 } from "lucide-react";
import { C } from "@/styles/theme";
import { Button, Pill, Card, Input, EmptyState, StatusDot, Modal, Field } from "@/components/ui";
import { useCms, useCmsStats, useCmsChannels, useCmsTopics, useCmsList, useCreateTopic, useClearCmsChannels } from "@/api/cms.api";
import { useBulkImportChannels, useUpdateChannel, useBulkEditChannels } from "@/api/channels.api";
import { usePartnerList } from "@/api/partners.api";
import { useToast } from "@/stores/notificationStore";
import { fmt, fmtCurrency } from "@/lib/format";
import type { Channel } from "@/types/channel";
import type { Partner } from "@/types/partner";

// ── CSV parser for YouTube Studio export format ──────────────
// Expected columns: Channel, Channel title, Engaged views, Views,
//                   Watch time (hours), Average view duration,
//                   Estimated partner revenue (USD)

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseChannelCSV(text: string, cms_id: string): Array<Record<string, unknown>> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map((h) => h.toLowerCase());

  // Detect column indices
  const idxYtId    = headers.findIndex((h) => h === "channel");
  const idxName    = headers.findIndex((h) => h === "channel title");
  const idxViews   = headers.findIndex((h) => h === "views");
  const idxRevenue = headers.findIndex((h) => h.includes("revenue"));

  const rows: Array<Record<string, unknown>> = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    const ytId = idxYtId >= 0 ? cols[idxYtId] : "";
    const name = idxName >= 0 ? cols[idxName] : "";

    // Skip total/summary rows (no yt_id or empty name)
    if (!ytId || !name || name.toLowerCase() === "total" || ytId.toLowerCase() === "total") continue;

    const views   = idxViews   >= 0 ? Number(cols[idxViews]?.replace(/[^0-9.]/g, ""))   || 0 : 0;
    const revenue = idxRevenue >= 0 ? Number(cols[idxRevenue]?.replace(/[^0-9.]/g, "")) || 0 : 0;

    rows.push({
      cms_id,
      yt_id:           ytId,
      name:            name,
      monthly_views:   views,
      monthly_revenue: revenue,
      monetization:    revenue > 0 ? "On" : "Off",
      status:          "Active",
      country:         "VN",
    });
  }
  return rows;
}

// ── Transfer CMS Modal ────────────────────────────────────────
function TransferCmsModal({
  channelIds,
  currentCmsId,
  onClose,
}: {
  channelIds: string[];
  currentCmsId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const bulkEdit = useBulkEditChannels();
  const { data } = useCmsList({ limit: 200, status: "Active" });
  const cmsList = (data?.items ?? []).filter((c) => c.id !== currentCmsId);
  const [selectedCmsId, setSelectedCmsId] = useState("");

  const handleTransfer = async () => {
    if (!selectedCmsId) return;
    try {
      const res = await bulkEdit.mutateAsync({ ids: channelIds, updates: { cms_id: selectedCmsId } });
      const name = cmsList.find((c) => c.id === selectedCmsId)?.name ?? selectedCmsId;
      toast.success("Chuyển CMS thành công", `${res.count} kênh → ${name}`);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Chuyển ${channelIds.length} kênh sang CMS khác`} width={440}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" icon={<ArrowRightLeft size={13} />}
            loading={bulkEdit.isPending} disabled={!selectedCmsId}
            onClick={() => void handleTransfer()}>
            Chuyển {channelIds.length} kênh
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14 }}>
        Chọn CMS đích — <strong style={{ color: C.text }}>{channelIds.length}</strong> kênh sẽ được chuyển sang CMS mới.
      </div>
      {cmsList.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>
          Không có CMS nào khác đang hoạt động
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
          {cmsList.map((c) => (
            <label key={c.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, border: `1px solid ${selectedCmsId === c.id ? C.blue : C.border}`,
              background: selectedCmsId === c.id ? `${C.blue}10` : C.bgCard,
              cursor: "pointer", transition: "all 0.1s",
            }}>
              <input type="radio" name="targetCms" value={c.id}
                checked={selectedCmsId === c.id}
                onChange={() => setSelectedCmsId(c.id)}
                style={{ accentColor: C.blue }} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: C.textMuted }}>{c.id}</div>
              </div>
              <Pill color={c.status === "Active" ? "green" : "gray"} style={{ marginLeft: "auto" }}>
                {c.status}
              </Pill>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Assign Partner Modal ──────────────────────────────────────
function AssignPartnerModal({
  channel,
  onClose,
}: {
  channel: Channel;
  onClose: () => void;
}) {
  const toast = useToast();
  const updateMut = useUpdateChannel(channel.id);
  const { data } = usePartnerList({ status: "Active", limit: 500 });

  // Chỉ hiện partner con (có parent_id)
  const childPartners: Partner[] = (data?.items ?? []).filter((p) => !!p.parent_id);

  const [selectedId, setSelectedId] = useState<string>(channel.partner_id ?? "");

  const handleSave = async () => {
    if (selectedId === (channel.partner_id ?? "")) { onClose(); return; }
    try {
      await updateMut.mutateAsync({ partner_id: selectedId || undefined });
      const name = childPartners.find((p) => p.id === selectedId)?.name ?? "—";
      toast.success("Đã gán partner", `${channel.name} → ${name}`);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Gán Partner: ${channel.name}`} width={440}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" loading={updateMut.isPending}
            onClick={() => void handleSave()}>
            {selectedId ? "Gán partner" : "Bỏ partner"}
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14 }}>
        Partner hiện tại:{" "}
        <strong style={{ color: C.text }}>{channel.partner_name ?? "Chưa gán"}</strong>
      </div>

      {/* Bỏ partner */}
      <label style={{
        display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
        borderRadius: 8, border: `1px solid ${selectedId === "" ? C.amber : C.border}`,
        background: selectedId === "" ? `${C.amber}10` : C.bgCard,
        cursor: "pointer", marginBottom: 8,
      }}>
        <input type="radio" name="partner" value="" checked={selectedId === ""}
          onChange={() => setSelectedId("")} style={{ accentColor: C.amber }} />
        <span style={{ fontSize: 13, color: C.textMuted, fontStyle: "italic" }}>Bỏ partner (không gán)</span>
      </label>

      {childPartners.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "16px 0" }}>
          Chưa có partner con nào đang hoạt động
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto" }}>
          {childPartners.map((p) => (
            <label key={p.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              borderRadius: 8, border: `1px solid ${selectedId === p.id ? C.blue : C.border}`,
              background: selectedId === p.id ? `${C.blue}10` : C.bgCard,
              cursor: "pointer", transition: "all 0.1s",
            }}>
              <input type="radio" name="partner" value={p.id}
                checked={selectedId === p.id}
                onChange={() => setSelectedId(p.id)}
                style={{ accentColor: C.blue }} />
              <div style={{ width: 26, height: 26, borderRadius: 6, background: `${C.blue}20`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Building2 size={12} color={C.blue} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                {p.company_name && <div style={{ fontSize: 11, color: C.textMuted }}>{p.company_name}</div>}
                {p.parent_name && <div style={{ fontSize: 11, color: C.textMuted }}>↳ {p.parent_name}</div>}
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Assign Topic Modal ────────────────────────────────────────
function AssignTopicModal({
  channelIds,
  cmsId,
  onClose,
}: {
  channelIds: string[];
  cmsId: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const bulkEdit    = useBulkEditChannels();
  const createTopic = useCreateTopic(cmsId);
  const { data: topics = [], refetch } = useCmsTopics(cmsId);

  const [selectedId, setSelectedId] = useState<string>("");
  const [newName, setNewName]       = useState("");
  const [creating, setCreating]     = useState(false);

  const handleCreateTopic = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const t = await createTopic.mutateAsync({ name: newName.trim() });
      await refetch();
      setSelectedId(t.id);
      setNewName("");
      toast.success("Đã tạo chủ đề", t.name);
    } catch (err) {
      toast.error("Lỗi tạo chủ đề", err instanceof Error ? err.message : "");
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedId) return;
    try {
      const res = await bulkEdit.mutateAsync({ ids: channelIds, updates: { topic_id: selectedId } });
      const name = topics.find((t) => t.id === selectedId)?.name ?? selectedId;
      toast.success("Đã gán chủ đề", `${res.count} kênh → "${name}"`);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Gán chủ đề cho ${channelIds.length} kênh`} width={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" icon={<Tag size={13} />}
            loading={bulkEdit.isPending} disabled={!selectedId}
            onClick={() => void handleAssign()}>
            Gán chủ đề
          </Button>
        </>
      }
    >
      {/* Tạo chủ đề mới */}
      <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, border: `1px dashed ${C.border}`, background: C.bgHover }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>TẠO CHỦ ĐỀ MỚI</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreateTopic(); }}
            placeholder="Nhập tên chủ đề mới..."
            style={{
              flex: 1, height: 34, padding: "0 12px", borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.bgCard,
              color: C.text, fontSize: 13, outline: "none",
            }}
          />
          <Button size="sm" variant="secondary" icon={<Plus size={13} />}
            loading={creating} disabled={!newName.trim()}
            onClick={() => void handleCreateTopic()}>
            Tạo
          </Button>
        </div>
      </div>

      {/* Danh sách chủ đề hiện có */}
      <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>
        CHỌN CHỦ ĐỀ HIỆN CÓ ({topics.length})
      </div>
      {topics.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "16px 0" }}>
          Chưa có chủ đề nào — tạo chủ đề mới ở trên
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>
          {topics.map((t) => (
            <label key={t.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              borderRadius: 8, border: `1px solid ${selectedId === t.id ? C.purple : C.border}`,
              background: selectedId === t.id ? `${C.purple}10` : C.bgCard,
              cursor: "pointer", transition: "all 0.1s",
            }}>
              <input type="radio" name="topic" value={t.id}
                checked={selectedId === t.id}
                onChange={() => setSelectedId(t.id)}
                style={{ accentColor: C.purple }} />
              <div style={{ width: 24, height: 24, borderRadius: 6, background: `${C.purple}20`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Tag size={11} color={C.purple} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</div>
                {t.dept && <div style={{ fontSize: 11, color: C.textMuted }}>{t.dept}</div>}
              </div>
              {t.expected_channels > 0 && (
                <div style={{ marginLeft: "auto", fontSize: 11, color: C.textMuted }}>
                  {t.expected_channels} kênh
                </div>
              )}
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Import Modal ─────────────────────────────────────────────
function ImportChannelModal({ open, onClose, cmsId }: { open: boolean; onClose: () => void; cmsId: string }) {
  const toast = useToast();
  const importMutation = useBulkImportChannels();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ created: number; updated: number; errors: Array<{ row: number; message: string }> } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseChannelCSV(text, cmsId));
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    if (!rows.length) return;
    try {
      const res = await importMutation.mutateAsync(rows);
      setResult(res);
      if (res.errors.length === 0) {
        toast.success("Import thành công", `${res.created} tạo mới, ${res.updated} cập nhật`);
      } else {
        toast.error("Import hoàn tất với lỗi", `${res.errors.length} dòng lỗi`);
      }
    } catch (err) {
      toast.error("Import thất bại", err instanceof Error ? err.message : "");
    }
  };

  const handleClose = () => {
    setRows([]); setFileName(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Import Channels từ CSV" width={560}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>Đóng</Button>
          {rows.length > 0 && !result && (
            <Button variant="primary" size="sm" icon={<Upload size={14} />}
              loading={importMutation.isPending} onClick={() => void handleImport()}>
              Import {rows.length} channels
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* File picker */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${C.border}`, borderRadius: 10, padding: "24px 16px",
            textAlign: "center", cursor: "pointer", transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <Upload size={24} color={C.textMuted} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, color: C.textSub }}>
            {fileName ? <strong style={{ color: C.text }}>{fileName}</strong> : "Click để chọn file CSV"}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Hỗ trợ: Tên kênh, ID kênh, Trạng thái, Kiếm tiền, Subscriber, View, Doanh thu
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>
              Xem trước — {rows.length} dòng dữ liệu:
            </div>
            <div style={{ background: C.bgHover, borderRadius: 8, overflow: "auto", maxHeight: 200, fontSize: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["#","Tên kênh","YT ID","Status","Monetization","Views","Revenue"].map((h) => (
                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "5px 10px", color: C.textMuted }}>{i + 1}</td>
                      <td style={{ padding: "5px 10px", color: C.text, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(r.name ?? "—")}</td>
                      <td style={{ padding: "5px 10px", color: C.textMuted, fontSize: 11 }}>{String(r.yt_id ?? "—").slice(0, 16)}…</td>
                      <td style={{ padding: "5px 10px" }}>{String(r.status ?? "—")}</td>
                      <td style={{ padding: "5px 10px" }}>{String(r.monetization ?? "—")}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right" }}>{fmt(Number(r.monthly_views ?? 0))}</td>
                      <td style={{ padding: "5px 10px", color: C.amber, textAlign: "right" }}>${Number(r.monthly_revenue ?? 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <div style={{ padding: "6px 10px", color: C.textMuted }}>...và {rows.length - 10} dòng nữa</div>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1, background: `${C.green}15`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color={C.green} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{result.created}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Tạo mới</div>
                </div>
              </div>
              <div style={{ flex: 1, background: `${C.blue}15`, borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} color={C.blue} />
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{result.updated}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>Cập nhật</div>
                </div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div style={{ background: `${C.red}10`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <AlertCircle size={14} color={C.red} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.red }}>{result.errors.length} lỗi</span>
                </div>
                {result.errors.map((e) => (
                  <div key={e.row} style={{ fontSize: 11, color: C.textSub }}>Dòng {e.row}: {e.message}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function CmsDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [monoFilter, setMonoFilter]     = useState("");
  const [minViews, setMinViews]         = useState("");
  const [minRevenue, setMinRevenue]     = useState("");
  const [showImport, setShowImport] = useState(false);
  const [assigningChannel, setAssigningChannel] = useState<Channel | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTransferCms, setShowTransferCms] = useState(false);
  const [showAssignTopic, setShowAssignTopic] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearChannels = useClearCmsChannels(id!);
  const toast = useToast();

  const { data: cms, isLoading } = useCms(id!);
  const { data: stats } = useCmsStats(id!);
  const { data: channelsData } = useCmsChannels(id!, {
    ...(search      ? { search }                        : {}),
    ...(topicFilter ? { topic_id: topicFilter }         : {}),
    ...(statusFilter? { status: statusFilter }          : {}),
    ...(monoFilter  ? { monetization: monoFilter }      : {}),
    ...(minViews    ? { min_views: Number(minViews) }   : {}),
    ...(minRevenue  ? { min_revenue: Number(minRevenue)}: {}),
    limit: 100,
  });
  const { data: topics } = useCmsTopics(id!);

  if (isLoading) return <div style={{ padding: 24, color: C.textSub }}>Đang tải...</div>;
  if (!cms) return <div style={{ padding: 24, color: C.red }}>CMS không tồn tại</div>;

  const channels = channelsData?.items ?? [];
  const totalChannels = channelsData?.total ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <ImportChannelModal open={showImport} onClose={() => setShowImport(false)} cmsId={id!} />

      {/* Clear all channels confirm */}
      {showClearConfirm && (
        <Modal open onClose={() => setShowClearConfirm(false)} title="Xoá toàn bộ kênh" width={440}
          footer={<>
            <Button variant="ghost" size="sm" onClick={() => setShowClearConfirm(false)}>Huỷ</Button>
            <Button variant="danger" size="sm" loading={clearChannels.isPending}
              onClick={() => {
                void clearChannels.mutateAsync().then((r) => {
                  toast.success("Đã xoá toàn bộ kênh", `${r.deleted} kênh đã bị xoá khỏi ${cms?.name}`);
                  setShowClearConfirm(false);
                }).catch((err) => {
                  toast.error("Lỗi xoá kênh", err instanceof Error ? err.message : "Thử lại");
                });
              }}>
              Xoá {stats?.total_channels ? `${stats.total_channels} kênh` : "tất cả"}
            </Button>
          </>}>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7 }}>
            Bạn có chắc muốn xoá <strong>toàn bộ {stats?.total_channels ?? 0} kênh</strong> khỏi CMS <strong>{cms?.name}</strong>?
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 6, background: `${C.red}15`, color: C.red, fontSize: 12, border: `1px solid ${C.red}35` }}>
              ⚠️ Hành động này không thể hoàn tác. Toàn bộ dữ liệu kênh, doanh thu và vi phạm liên quan sẽ bị xoá vĩnh viễn.
            </div>
          </div>
        </Modal>
      )}
      {assigningChannel && (
        <AssignPartnerModal channel={assigningChannel} onClose={() => setAssigningChannel(null)} />
      )}
      {showTransferCms && (
        <TransferCmsModal
          channelIds={[...selectedIds]}
          currentCmsId={id!}
          onClose={() => { setShowTransferCms(false); setSelectedIds(new Set()); }}
        />
      )}
      {showAssignTopic && (
        <AssignTopicModal
          channelIds={[...selectedIds]}
          cmsId={id!}
          onClose={() => { setShowAssignTopic(false); setSelectedIds(new Set()); }}
        />
      )}

      {/* Breadcrumb */}
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate("/cms")} style={{ marginBottom: 16 }}>
        Quay lại danh sách CMS
      </Button>

      {/* Header card */}
      <div style={{
        background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "18px 22px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
              <Server size={20} color={C.blue} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>{cms.name}</h1>
                <Pill color={cms.status === "Active" ? "green" : "gray"}>{cms.status}</Pill>
                <span style={{ fontSize: 12, color: C.textMuted, background: C.bgHover, padding: "2px 10px", borderRadius: 6, fontWeight: 700 }}>{cms.currency}</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, fontFamily: "monospace" }}>{cms.id}</div>
              {cms.notes && (
                <div style={{ fontSize: 12, color: C.textSub, marginTop: 6, padding: "5px 10px", background: C.bgHover, borderRadius: 6, display: "inline-block" }}>
                  {cms.notes}
                </div>
              )}
            </div>
          </div>
          <Button variant="secondary" size="sm" icon={<History size={14} />} onClick={() => navigate(`/cms/${id}/history`)}>
            Lịch sử doanh thu
          </Button>
        </div>

        {/* Topic chips */}
        {(topics ?? []).length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}`, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>TOPIC:</span>
            {(topics ?? []).map((t) => (
              <button
                key={t.id}
                onClick={() => setTopicFilter(topicFilter === t.id ? "" : t.id)}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 99, cursor: "pointer",
                  border: `1px solid ${topicFilter === t.id ? C.purple : C.border}`,
                  background: topicFilter === t.id ? `${C.purple}15` : C.bgHover,
                  color: topicFilter === t.id ? C.purple : C.textSub,
                  transition: "all .1s",
                }}
              >
                {t.name} {t.channel_count != null ? `(${t.channel_count})` : ""}
              </button>
            ))}
            <button
              onClick={() => setTopicFilter("")}
              style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 99, cursor: "pointer",
                border: `1px solid ${!topicFilter ? C.blue : C.border}`,
                background: !topicFilter ? `${C.blue}15` : "transparent",
                color: !topicFilter ? C.blue : C.textMuted,
              }}
            >
              Tất cả
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total channels",  value: fmt(stats?.total_channels),            color: C.blue },
          { label: "Active",          value: fmt(stats?.active_channels),            color: C.green },
          { label: "Monetized",       value: fmt(stats?.monetized),                  color: C.cyan },
          { label: "Demonetized",     value: fmt(stats?.demonetized),                color: C.red },
          { label: "Revenue",         value: fmtCurrency(stats?.total_monthly_revenue, cms.currency), color: C.amber },
          { label: "Subscribers",     value: fmt(stats?.total_subscribers),          color: C.purple },
        ].map(({ label, value, color }) => (
          <Card key={label} padding="14px 16px">
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kênh..."
            style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 8, boxSizing: "border-box",
              border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
        </div>

        {/* Views > */}
        <div style={{ position: "relative", flex: "0 0 130px" }}>
          <input value={minViews} onChange={(e) => setMinViews(e.target.value)}
            type="number" min={0} placeholder="Views ≥"
            style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 8, boxSizing: "border-box",
              border: `1px solid ${minViews ? C.cyan : C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
        </div>

        {/* Revenue > */}
        <div style={{ position: "relative", flex: "0 0 130px" }}>
          <input value={minRevenue} onChange={(e) => setMinRevenue(e.target.value)}
            type="number" min={0} placeholder="Revenue ≥ $"
            style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 8, boxSizing: "border-box",
              border: `1px solid ${minRevenue ? C.amber : C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
        </div>

        {/* Status */}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 32, padding: "0 8px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            border: `1px solid ${statusFilter ? C.green : C.border}`, background: C.bgCard, color: statusFilter ? C.green : C.textSub, outline: "none" }}>
          <option value="">Tất cả Status</option>
          {["Active","Pending","Suspended","Terminated"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Monetization */}
        <select value={monoFilter} onChange={(e) => setMonoFilter(e.target.value)}
          style={{ height: 32, padding: "0 8px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            border: `1px solid ${monoFilter ? C.purple : C.border}`, background: C.bgCard, color: monoFilter ? C.purple : C.textSub, outline: "none" }}>
          <option value="">Tất cả Monetization</option>
          {["On","Off"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Topic */}
        <select value={topicFilter} onChange={(e) => { setTopicFilter(e.target.value); setSelectedIds(new Set()); }}
          style={{ height: 32, padding: "0 8px", borderRadius: 8, fontSize: 12, cursor: "pointer",
            border: `1px solid ${topicFilter ? C.blue : C.border}`, background: C.bgCard, color: topicFilter ? C.blue : C.textSub, outline: "none" }}>
          <option value="">Tất cả Topic</option>
          {(topics ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.name} ({t.channel_count ?? 0})</option>
          ))}
        </select>

        {/* Reset */}
        {(search || minViews || minRevenue || statusFilter || monoFilter || topicFilter) && (
          <button onClick={() => { setSearch(""); setMinViews(""); setMinRevenue(""); setStatusFilter(""); setMonoFilter(""); setTopicFilter(""); setSelectedIds(new Set()); }}
            style={{ height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              border: `1px solid ${C.border}`, background: C.bgCard, color: C.red }}>
            Xóa bộ lọc
          </button>
        )}

        {/* Kết quả */}
        <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>
          {channels.length} / {totalChannels} kênh
        </span>
      </div>

      {(
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => setShowImport(true)}>
              Import CSV
            </Button>
            <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setShowClearConfirm(true)}>
              Xoá tất cả kênh
            </Button>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {/* Gán chủ đề */}
              <Button
                variant={selectedIds.size > 0 ? "secondary" : "ghost"}
                size="sm"
                icon={<Tag size={14} />}
                disabled={selectedIds.size === 0}
                onClick={() => setShowAssignTopic(true)}
                style={{ color: selectedIds.size > 0 ? C.purple : undefined, borderColor: selectedIds.size > 0 ? C.purple : undefined }}
              >
                Gán chủ đề{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </Button>
              {/* Chuyển CMS */}
              <Button
                variant={selectedIds.size > 0 ? "primary" : "ghost"}
                size="sm"
                icon={<ArrowRightLeft size={14} />}
                disabled={selectedIds.size === 0}
                onClick={() => setShowTransferCms(true)}
              >
                Chuyển CMS{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
              </Button>
            </div>
          </div>
          {channels.length === 0 ? (
            <EmptyState icon={<Tv size={32} />} title="Không có kênh nào" description={search ? "Thử từ khóa khác" : "CMS này chưa có kênh nào"} />
          ) : (
            <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflowX: "auto" }}>
              <table style={{ width: "max-content", minWidth: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bgHover }}>
                    {/* Select-all checkbox */}
                    <th style={{ padding: "10px 12px 10px 16px", width: 36 }}>
                      <input
                        type="checkbox"
                        checked={channels.length > 0 && selectedIds.size === channels.length}
                        ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < channels.length; }}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(channels.map((c) => c.id)));
                          else setSelectedIds(new Set());
                        }}
                        style={{ accentColor: C.blue, cursor: "pointer" }}
                      />
                    </th>
                    {(["Channel", "Topic", "Partner", "Status", "Monetization", "Link Date", "Copyright", "Video", "Total Views", "Subscribers", "Revenue", "Last Revenue", ""] as const).map((h) => (
                      <th key={h} style={{
                        padding: h === "Copyright" ? "10px 8px" : "10px 16px",
                        width: h === "Copyright" ? 70 : undefined,
                        textAlign: h === "Copyright" ? "center" : "left",
                        fontSize: 11, fontWeight: 600, color: C.textMuted,
                        letterSpacing: "0.05em", whiteSpace: "nowrap",
                      }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch) => (
                    <tr key={ch.id}
                      style={{
                        borderBottom: `1px solid ${C.border}`, cursor: "pointer",
                        background: selectedIds.has(ch.id) ? `${C.blue}08` : "transparent",
                      }}
                      onMouseEnter={(e) => { if (!selectedIds.has(ch.id)) e.currentTarget.style.background = C.bgHover; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = selectedIds.has(ch.id) ? `${C.blue}08` : "transparent"; }}
                      onClick={() => navigate(`/channels/${ch.id}`)}
                    >
                      {/* Row checkbox */}
                      <td style={{ padding: "10px 12px 10px 16px", width: 36 }}
                        onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(ch.id)}
                          onChange={(e) => {
                            setSelectedIds((prev) => {
                              const s = new Set(prev);
                              e.target.checked ? s.add(ch.id) : s.delete(ch.id);
                              return s;
                            });
                          }}
                          style={{ accentColor: C.blue, cursor: "pointer" }}
                        />
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <div style={{ fontWeight: 500, color: C.text }}>{ch.name}</div>
                        {ch.yt_id && <div style={{ fontSize: 11, color: C.textMuted }}>{ch.yt_id}</div>}
                      </td>
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
                      <td style={{ padding: "10px 16px", color: C.textSub }}>{ch.partner_name ?? "—"}</td>
                      <td style={{ padding: "10px 16px" }}><StatusDot status={ch.status} /></td>
                      <td style={{ padding: "10px 16px" }}><StatusDot status={ch.monetization} /></td>
                      <td style={{ padding: "10px 16px", color: C.textMuted, fontSize: 12, whiteSpace: "nowrap" }}>
                        {ch.link_date ? ch.link_date.slice(0, 10) : "—"}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "center", width: 60 }}>
                        {ch.strikes > 0 ? (
                          <span style={{ fontWeight: 600, color: C.red, fontSize: 12 }}>{ch.strikes}</span>
                        ) : (
                          <span style={{ color: C.textMuted, fontSize: 12 }}>0</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px", color: C.textSub }}>
                        {fmt(ch.video)}
                      </td>
                      <td style={{ padding: "10px 16px", color: C.text }}>{fmt(ch.total_views)}</td>
                      <td style={{ padding: "10px 16px", color: C.textSub }}>{fmt(ch.subscribers)}</td>
                      <td style={{ padding: "10px 16px", color: C.amber, fontWeight: 600 }}>{fmtCurrency(ch.monthly_revenue, cms.currency)}</td>
                      <td style={{ padding: "10px 16px" }}>
                        {ch.last_revenue > 0 ? (
                          <span
                            title={ch.last_sync ? `Last sync: ${new Date(ch.last_sync).toLocaleString("vi-VN")}` : "Chưa sync"}
                            style={{
                              fontWeight: 600, color: C.green, cursor: "default",
                              borderBottom: `1px dashed ${C.green}55`,
                            }}
                          >
                            {fmtCurrency(ch.last_revenue, cms.currency)}
                          </span>
                        ) : (
                          <span
                            title={ch.last_sync ? `Last sync: ${new Date(ch.last_sync).toLocaleString("vi-VN")}` : "Chưa sync"}
                            style={{ color: C.textMuted, fontSize: 12, cursor: "default" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          title={ch.partner_name ? "Đổi partner" : "Gán partner"}
                          onClick={() => setAssigningChannel(ch)}
                          style={{
                            display: "flex", alignItems: "center", gap: 5,
                            padding: "4px 10px", borderRadius: 6, cursor: "pointer",
                            fontSize: 11, fontWeight: 600,
                            border: `1px solid ${C.border}`,
                            background: C.bgHover,
                            color: ch.partner_name ? C.blue : C.textMuted,
                            whiteSpace: "nowrap",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.color = C.blue; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = ch.partner_name ? C.blue : C.textMuted; }}
                        >
                          <UserCog size={11} />
                          {ch.partner_name ? "Đổi" : "Gán"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
