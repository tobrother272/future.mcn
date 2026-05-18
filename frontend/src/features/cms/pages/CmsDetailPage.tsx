import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, History, Tv, Upload, CheckCircle, AlertCircle, UserCog, Building2, ArrowRightLeft, Tag, Plus, Server, Trash2, Search, Loader2, ShieldCheck, X } from "lucide-react";
import { C } from "@/styles/theme";
import { Button, Pill, Card, Input, EmptyState, StatusDot, Modal, Field } from "@/components/ui";
import { useCms, useCmsStats, useCmsChannels, useTopics, useCmsList, useCreateTopic, useClearCmsChannels, useDeleteTopic } from "@/api/cms.api";
import { useBulkImportChannels, useUpdateChannel, useBulkEditChannels, useCreateChannel, useValidateYtChannel } from "@/api/channels.api";
import type { YtValidateResult } from "@/api/channels.api";
import { usePartnerList } from "@/api/partners.api";
import { useToast } from "@/stores/notificationStore";
import { fmt, fmtCurrency } from "@/lib/format";
import { usePermissions } from "@/hooks/usePermissions";
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

// ── Assign Partner Modal (bulk) ───────────────────────────────
function AssignPartnerModal({
  channelIds,
  cmsId,
  onClose,
}: {
  channelIds: string[];
  cmsId: string;
  onClose: () => void;
}) {
  const toast    = useToast();
  const qc       = useQueryClient();
  const bulkEdit = useBulkEditChannels();
  const { data } = usePartnerList({ status: "Active", limit: 500 });

  const childPartners: Partner[] = (data?.items ?? []).filter((p) => !!p.parent_id);

  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch]         = useState("");

  const filtered = childPartners.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    try {
      const res = await bulkEdit.mutateAsync({
        ids: channelIds,
        updates: { partner_id: selectedId || null },
      });
      await qc.invalidateQueries({ queryKey: ["cms", cmsId, "channels"] });
      const name = childPartners.find((p) => p.id === selectedId)?.name;
      toast.success(
        "Đã gán partner",
        name ? `${res.count} kênh → "${name}"` : `Đã bỏ partner cho ${res.count} kênh`
      );
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose}
      title={`Gán Partner — ${channelIds.length} kênh đã chọn`}
      width={460}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" loading={bulkEdit.isPending}
            onClick={() => void handleSave()}>
            {selectedId ? `Gán partner (${channelIds.length})` : `Bỏ partner (${channelIds.length})`}
          </Button>
        </>
      }
    >
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={12} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm partner..."
          style={{ width: "100%", paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
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

      {filtered.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "16px 0" }}>
          {search ? "Không tìm thấy partner" : "Chưa có partner con nào đang hoạt động"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 340, overflowY: "auto" }}>
          {filtered.map((p) => (
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
  const qc          = useQueryClient();
  const bulkEdit    = useBulkEditChannels();
  const createTopic = useCreateTopic(cmsId);
  const { data: topics = [], refetch } = useTopics();

  const [selectedId, setSelectedId] = useState<string>("");
  const [newName, setNewName]       = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [search, setSearch]         = useState("");

  const handleCreateTopic = async () => {
    if (!newName?.trim()) return;
    setCreating(true);
    try {
      const t = await createTopic.mutateAsync({ name: newName.trim() });
      await refetch();
      setSelectedId(t.id);
      setNewName(null);
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
      // Force refresh CMS channel list immediately
      await qc.invalidateQueries({ queryKey: ["cms", cmsId, "channels"] });
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
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm chủ đề..."
          autoComplete="off"
          style={{
            width: "100%", boxSizing: "border-box",
            padding: "7px 12px 7px 32px",
            background: C.bgInput, border: `1px solid ${C.border}`,
            borderRadius: 8, color: C.text, fontSize: 13, outline: "none",
          }}
        />
      </div>

      <div style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, marginBottom: 8 }}>
        CHỌN CHỦ ĐỀ ({topics.length})
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 280, overflowY: "auto" }}>

        {/* Tạo chủ đề mới — record đầu list */}
        {newName !== null ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
            borderRadius: 8, border: `1px dashed ${C.blue}`, background: `${C.blue}08`,
          }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `${C.blue}20`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Plus size={11} color={C.blue} />
            </div>
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateTopic();
                if (e.key === "Escape") setNewName(null);
              }}
              placeholder="Tên chủ đề mới..."
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 13, fontWeight: 600 }}
            />
            <Button size="sm" variant="primary" loading={creating} disabled={!newName.trim()}
              onClick={() => void handleCreateTopic()} style={{ padding: "3px 10px", fontSize: 12 }}>
              Tạo
            </Button>
            <button onClick={() => setNewName(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 2, display: "flex" }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setNewName("")}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 12px",
              borderRadius: 8, border: `1px dashed ${C.border}`,
              background: "transparent", cursor: "pointer", transition: "all 0.1s", width: "100%",
              color: C.textMuted,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue;
              (e.currentTarget as HTMLButtonElement).style.color = C.blue;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border;
              (e.currentTarget as HTMLButtonElement).style.color = C.textMuted;
            }}
          >
            <div style={{ width: 24, height: 24, borderRadius: 6, background: `${C.blue}15`,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Plus size={11} color={C.blue} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Tạo chủ đề mới...</span>
          </button>
        )}

        {/* Danh sách chủ đề hiện có */}
        {topics.filter(t => t.name.toLowerCase().includes(search.toLowerCase())).map((t) => (
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

// ── Add single channel modal ──────────────────────────────────────
function AddChannelModal({
  cmsId, onClose, onCreate, isPending,
}: {
  cmsId: string;
  onClose: () => void;
  onCreate: (data: import("@/types/channel").ChannelCreate) => Promise<void>;
  isPending: boolean;
}) {
  const [form, setForm] = useState({ yt_id: "", name: "", country: "VN", status: "Active", monetization: "Off" });
  const [ytInfo, setYtInfo] = useState<YtValidateResult["channel"] | null>(null);
  const [ytError, setYtError] = useState<string | null>(null);
  const validateMut = useValidateYtChannel();
  const toast = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-validate with 700ms debounce
  useEffect(() => {
    const id = form.yt_id.trim();
    setYtInfo(null); setYtError(null);
    if (!id || id.length < 10) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await validateMut.mutateAsync(id);
        if (res.valid && res.channel) {
          setYtInfo(res.channel);
          setForm((f) => ({
            ...f,
            name:    f.name || res.channel!.name,
            country: res.channel!.country ?? f.country,
          }));
        } else {
          setYtError(res.message ?? "Channel không tồn tại");
        }
      } catch (err) {
        setYtError(err instanceof Error ? err.message : "Lỗi kiểm tra");
      }
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.yt_id]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Lỗi", "Tên kênh không được để trống"); return; }
    try {
      await onCreate({ ...form, cms_id: cmsId });
    } catch (err) { toast.error("Lỗi", err instanceof Error ? err.message : "Thử lại"); }
  };

  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : String(n);

  const validateIcon = validateMut.isPending
    ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
    : ytInfo
      ? <CheckCircle size={14} color={C.green} />
      : ytError
        ? <AlertCircle size={14} color={C.red} />
        : <ShieldCheck size={14} />;

  return (
    <Modal open onClose={onClose} title="Thêm kênh mới" width={500}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Huỷ</Button>
        <Button variant="primary" size="sm" loading={isPending} onClick={handleSubmit} icon={<Plus size={14} />}>Thêm kênh</Button>
      </>}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* UC input — validate icon appended inside the field */}
        <Field label="YouTube Channel ID (UC)">
          <div style={{ position: "relative" }}>
            <Input
              value={form.yt_id}
              onChange={(e) => setForm((f) => ({ ...f, yt_id: e.target.value }))}
              placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxx"
              autoFocus
              style={{
                paddingRight: 36,
                borderColor: ytInfo ? C.green : ytError ? C.red : undefined,
              }}
            />
            <span style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              color: ytInfo ? C.green : ytError ? C.red : C.textMuted,
              display: "flex", alignItems: "center", pointerEvents: "none",
            }}>
              {validateIcon}
            </span>
          </div>
        </Field>

        {/* Validate result */}
        {ytInfo && (
          <div style={{ display: "flex", gap: 10, padding: "10px 12px", background: `${C.green}0d`, border: `1px solid ${C.green}40`, borderRadius: 8 }}>
            {ytInfo.thumbnail && (
              <img src={ytInfo.thumbnail} alt="" style={{ width: 44, height: 44, borderRadius: 6, flexShrink: 0, objectFit: "cover" }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <CheckCircle size={13} color={C.green} />
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ytInfo.name}</span>
                {ytInfo.country && <span style={{ fontSize: 10, color: C.textMuted }}>🌐 {ytInfo.country}</span>}
              </div>
              <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.textMuted }}>
                <span>👥 {fmt(ytInfo.subscribers)} subscribers</span>
                <span>▶ {fmt(ytInfo.videos)} videos</span>
                <span>👁 {fmt(ytInfo.views)} views</span>
              </div>
            </div>
          </div>
        )}

        {ytError && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", background: `${C.red}0d`, border: `1px solid ${C.red}40`, borderRadius: 8, fontSize: 12, color: C.red }}>
            <AlertCircle size={13} />
            {ytError}
          </div>
        )}

        <Field label="Tên kênh *">
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Tên hiển thị" />
        </Field>
        <div style={{ display: "flex", gap: 12 }}>
          <Field label="Quốc gia" style={{ flex: "0 0 80px" }}>
            <Input value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="VN" maxLength={2} />
          </Field>
          <Field label="Status" style={{ flex: 1 }}>
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 8, fontSize: 13,
                border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, outline: "none" }}>
              {["Active","Pending","Suspended","Terminated"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Monetization" style={{ flex: 1 }}>
            <select value={form.monetization} onChange={(e) => setForm((f) => ({ ...f, monetization: e.target.value }))}
              style={{ width: "100%", height: 36, padding: "0 10px", borderRadius: 8, fontSize: 13,
                border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, outline: "none" }}>
              {["On","Off"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
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
  const [maxViews, setMaxViews]         = useState("");
  const [minRevenue, setMinRevenue]     = useState("");
  const [maxRevenue, setMaxRevenue]     = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [showAssignPartner, setShowAssignPartner] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showTransferCms, setShowTransferCms] = useState(false);
  const [showAssignTopic, setShowAssignTopic] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearChannels = useClearCmsChannels(id!);
  const createChannel = useCreateChannel();
  const deleteTopic  = useDeleteTopic();
  const toast = useToast();
  const { can } = usePermissions();

  const { data: cms, isLoading } = useCms(id!);
  const { data: stats } = useCmsStats(id!);
  const { data: channelsData } = useCmsChannels(id!, {
    ...(search      ? { search }                        : {}),
    ...(topicFilter ? { topic_id: topicFilter }         : {}),
    ...(statusFilter? { status: statusFilter }          : {}),
    ...(monoFilter  ? { monetization: monoFilter }      : {}),
    ...(minViews    ? { min_views: Number(minViews) }   : {}),
    ...(maxViews    ? { max_views: Number(maxViews) }   : {}),
    ...(minRevenue  ? { min_revenue: Number(minRevenue)}: {}),
    ...(maxRevenue  ? { max_revenue: Number(maxRevenue)}: {}),
    limit: 100,
  });
  const { data: topics } = useTopics();

  if (isLoading) return <div style={{ padding: 24, color: C.textSub }}>Đang tải...</div>;
  if (!cms) return <div style={{ padding: 24, color: C.red }}>CMS không tồn tại</div>;

  const channels = channelsData?.items ?? [];
  const totalChannels = channelsData?.total ?? 0;

  return (
    <div style={{ padding: 24 }}>
      <ImportChannelModal open={showImport} onClose={() => setShowImport(false)} cmsId={id!} />

      {/* Add single channel modal */}
      {showAddChannel && (
        <AddChannelModal
          cmsId={id!}
          onClose={() => setShowAddChannel(false)}
          onCreate={async (data) => {
            await createChannel.mutateAsync(data);
            toast.success("Thành công", "Đã thêm kênh");
            setShowAddChannel(false);
          }}
          isPending={createChannel.isPending}
        />
      )}

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
      {showAssignPartner && (
        <AssignPartnerModal channelIds={[...selectedIds]} cmsId={id!} onClose={() => { setShowAssignPartner(false); setSelectedIds(new Set()); }} />
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
              <div key={t.id} style={{
                display: "inline-flex", alignItems: "center", gap: 0,
                borderRadius: 99, overflow: "hidden",
                border: `1px solid ${topicFilter === t.id ? C.purple : C.border}`,
                background: topicFilter === t.id ? `${C.purple}15` : C.bgHover,
                transition: "all .1s",
              }}>
                <button
                  onClick={() => setTopicFilter(topicFilter === t.id ? "" : t.id)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 10px 5px 12px",
                    background: "transparent", border: "none", cursor: "pointer",
                    color: topicFilter === t.id ? C.purple : C.textSub,
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  <Tag size={11} color={topicFilter === t.id ? C.purple : C.textMuted} />
                  {t.name}
                  {t.channel_count != null && (
                    <span style={{ fontSize: 10, opacity: 0.7 }}>({t.channel_count})</span>
                  )}
                </button>
                <button
                  title={`Xóa chủ đề "${t.name}"`}
                  onClick={() => {
                    if (!confirm(`Xóa chủ đề "${t.name}"? Tất cả kênh gắn chủ đề này sẽ bị clear.`)) return;
                    void deleteTopic.mutateAsync(t.id).then(() => {
                      toast.success("Đã xóa chủ đề", `"${t.name}" và clear khỏi tất cả kênh`);
                      if (topicFilter === t.id) setTopicFilter("");
                    }).catch((err: unknown) => {
                      toast.error("Lỗi", err instanceof Error ? err.message : "Thử lại");
                    });
                  }}
                  style={{
                    background: "transparent", border: "none", borderLeft: `1px solid ${C.border}`,
                    cursor: "pointer", padding: "5px 8px", display: "flex", alignItems: "center",
                    color: C.textMuted, transition: "color .1s, background .1s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = C.red;
                    (e.currentTarget as HTMLButtonElement).style.background = `${C.red}15`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = C.textMuted;
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setTopicFilter("")}
              style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 99, cursor: "pointer",
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
            placeholder="Tên kênh / UC..."
            style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 8, boxSizing: "border-box",
              border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
        </div>

        {/* Views range */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>Views</span>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted, pointerEvents: "none" }}>{">"}</span>
            <input value={minViews} onChange={(e) => setMinViews(e.target.value)}
              type="number" min={0} placeholder="min"
              style={{ width: 84, height: 32, padding: "0 6px 0 18px", borderRadius: 8, boxSizing: "border-box",
                border: `1px solid ${minViews ? C.cyan : C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted, pointerEvents: "none" }}>{"<"}</span>
            <input value={maxViews} onChange={(e) => setMaxViews(e.target.value)}
              type="number" min={0} placeholder="max"
              style={{ width: 84, height: 32, padding: "0 6px 0 18px", borderRadius: 8, boxSizing: "border-box",
                border: `1px solid ${maxViews ? C.cyan : C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
        </div>

        {/* Revenue range */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>Revenue</span>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted, pointerEvents: "none" }}>{">"}</span>
            <input value={minRevenue} onChange={(e) => setMinRevenue(e.target.value)}
              type="number" min={0} placeholder="min"
              style={{ width: 84, height: 32, padding: "0 6px 0 18px", borderRadius: 8, boxSizing: "border-box",
                border: `1px solid ${minRevenue ? C.amber : C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted, pointerEvents: "none" }}>{"<"}</span>
            <input value={maxRevenue} onChange={(e) => setMaxRevenue(e.target.value)}
              type="number" min={0} placeholder="max"
              style={{ width: 84, height: 32, padding: "0 6px 0 18px", borderRadius: 8, boxSizing: "border-box",
                border: `1px solid ${maxRevenue ? C.amber : C.border}`, background: C.bgCard, color: C.text, fontSize: 12, outline: "none" }} />
          </div>
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
        {(search || minViews || maxViews || minRevenue || maxRevenue || statusFilter || monoFilter || topicFilter) && (
          <button onClick={() => { setSearch(""); setMinViews(""); setMaxViews(""); setMinRevenue(""); setMaxRevenue(""); setStatusFilter(""); setMonoFilter(""); setTopicFilter(""); setSelectedIds(new Set()); }}
            style={{ height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              border: `1px solid ${C.border}`, background: C.bgCard, color: C.red }}>
            Xóa bộ lọc
          </button>
        )}

        {/* Kết quả */}
        <span style={{ fontSize: 12, color: C.textMuted, marginLeft: 4 }}>
          {channels.length} / {totalChannels} kênh
        </span>

        {/* Add channel */}
        {can("channel:create") && (
          <button
            onClick={() => setShowAddChannel(true)}
            style={{
              marginLeft: 4, height: 32, padding: "0 12px", borderRadius: 8, fontSize: 12,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              border: `1px solid ${C.green}`, background: `${C.green}15`, color: C.green,
              fontWeight: 600,
            }}
          >
            <Plus size={13} />
            Thêm kênh
          </button>
        )}
      </div>

      {(
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {can("channel:create") && (
              <Button variant="secondary" size="sm" icon={<Upload size={14} />} onClick={() => setShowImport(true)}>
                Import CSV
              </Button>
            )}
            {can("channel:delete") && (
              <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setShowClearConfirm(true)}>
                Xoá tất cả kênh
              </Button>
            )}
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
              {/* Gán partner */}
              <Button
                variant={selectedIds.size > 0 ? "secondary" : "ghost"}
                size="sm"
                icon={<UserCog size={14} />}
                disabled={selectedIds.size === 0}
                onClick={() => setShowAssignPartner(true)}
                style={{ color: selectedIds.size > 0 ? C.blue : undefined, borderColor: selectedIds.size > 0 ? C.blue : undefined }}
              >
                Gán partner{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
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
                    {(["Channel", "Topic", "Partner", "Status", "Monetization", "Link Date", "Copyright", "Video", "Total Views", "Subscribers", "30 Days Revenue", "Last Day Revenue", ""] as const).map((h) => (
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
                            title={ch.last_sync_analytic ? `Last analytic sync: ${new Date(ch.last_sync_analytic).toLocaleString("vi-VN")}` : "Chưa sync analytics"}
                            style={{
                              fontWeight: 600, color: C.green, cursor: "default",
                              borderBottom: `1px dashed ${C.green}55`,
                            }}
                          >
                            {fmtCurrency(ch.last_revenue, cms.currency)}
                          </span>
                        ) : (
                          <span
                            title={ch.last_sync_analytic ? `Last analytic sync: ${new Date(ch.last_sync_analytic).toLocaleString("vi-VN")}` : "Chưa sync analytics"}
                            style={{ color: C.textMuted, fontSize: 12, cursor: "default" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        {ch.partner_name ? (
                          <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>{ch.partner_name}</span>
                        ) : (
                          <span style={{ fontSize: 12, color: C.textMuted }}>—</span>
                        )}
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
