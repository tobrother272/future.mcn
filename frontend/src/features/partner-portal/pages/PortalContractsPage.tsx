import { useState, useMemo, useEffect } from "react";
import {
  FileText, Download, Eye, Search, RefreshCw, FileIcon,
  Calendar, HardDrive, Hash, User2, ChevronDown, ChevronRight,
  X, ExternalLink,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button } from "@/components/ui";
import { useAuthStore } from "@/stores/authStore";
import { usePartnerContracts, type PartnerContract } from "@/api/contracts.api";
import { fmtBytes } from "@/lib/format";

// ── File type helpers ─────────────────────────────────────────
function getExt(name: string) {
  return (name.split(".").pop() ?? "").toLowerCase();
}

const EXT_ICON: Record<string, { icon: string; color: string }> = {
  pdf:  { icon: "PDF",  color: "#f87171" },
  doc:  { icon: "DOC",  color: "#4f8ef7" },
  docx: { icon: "DOC",  color: "#4f8ef7" },
  xls:  { icon: "XLS",  color: "#4ade80" },
  xlsx: { icon: "XLS",  color: "#4ade80" },
  png:  { icon: "IMG",  color: "#a78bfa" },
  jpg:  { icon: "IMG",  color: "#a78bfa" },
  jpeg: { icon: "IMG",  color: "#a78bfa" },
};

function FileTypeBadge({ name }: { name: string }) {
  const ext  = getExt(name);
  const cfg  = EXT_ICON[ext] ?? { icon: "FILE", color: C.textMuted };
  return (
    <div style={{
      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
      background: `${cfg.color}20`, display: "flex", alignItems: "center",
      justifyContent: "center", fontSize: 9, fontWeight: 700, color: cfg.color,
      letterSpacing: 0.3,
    }}>{cfg.icon}</div>
  );
}

function isPreviewable(name: string) {
  return ["pdf", "png", "jpg", "jpeg"].includes(getExt(name));
}

// ── Authenticated fetch helper ────────────────────────────────
async function authFetch(url: string, token: string | null) {
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

async function downloadFile(url: string, filename: string, token: string | null) {
  const res  = await authFetch(url, token);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = href; a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

// ── Preview modal ─────────────────────────────────────────────
function PreviewModal({
  contract, partnerId, token, onClose,
}: { contract: PartnerContract; partnerId: string; token: string | null; onClose: () => void }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const ext = getExt(contract.file_name);

  useEffect(() => {
    let objUrl: string;
    const url = `/api/contracts/${partnerId}/${contract.id}/view`;
    authFetch(url, token)
      .then((r) => r.blob())
      .then((b) => { objUrl = URL.createObjectURL(b); setBlobUrl(objUrl); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
    return () => { if (objUrl) URL.revokeObjectURL(objUrl); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      display: "flex", flexDirection: "column", zIndex: 1000,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 20px", background: C.bgCard, borderBottom: `1px solid ${C.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <FileTypeBadge name={contract.file_name} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{contract.title}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{contract.file_name}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="ghost" size="sm" icon={<Download size={14} />}
            onClick={() => void downloadFile(`/api/contracts/${partnerId}/${contract.id}/download`, contract.file_name, token)}
          >Tải xuống</Button>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 6, borderRadius: RADIUS.sm, display: "flex" }}><X size={18} /></button>
        </div>
      </div>
      {/* Content */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        {loading ? (
          <div style={{ color: C.textMuted, fontSize: 14 }}>Đang tải...</div>
        ) : error ? (
          <div style={{ color: C.red, fontSize: 14 }}>Không thể xem trước tệp này.</div>
        ) : ext === "pdf" ? (
          <iframe
            src={blobUrl!}
            style={{ width: "100%", height: "100%", border: "none" }}
            title={contract.file_name}
          />
        ) : (
          <img src={blobUrl!} alt={contract.file_name} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: RADIUS.md }} />
        )}
      </div>
    </div>
  );
}

// ── Contract row ──────────────────────────────────────────────
function ContractRow({
  contract, partnerId, token,
}: { contract: PartnerContract; partnerId: string; token: string | null }) {
  const [preview, setPreview] = useState(false);

  return (
    <>
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 130px 120px 90px 120px 100px",
        gap: 8, alignItems: "center",
        padding: "12px 16px",
        borderBottom: `1px solid ${C.border}`,
        transition: "background .12s",
      }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = C.bgHover)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
      >
        {/* File + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <FileTypeBadge name={contract.file_name} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {contract.title}
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {contract.file_name}
            </div>
          </div>
        </div>

        {/* Contract number */}
        <div style={{ fontSize: 12, color: C.textSub }}>
          {contract.contract_number
            ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Hash size={10} color={C.blue} />{contract.contract_number}</span>
            : <span style={{ color: C.textMuted }}>—</span>}
        </div>

        {/* Employee */}
        <div style={{ fontSize: 11, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {contract.employee_name
            ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User2 size={10} color={C.teal} />{contract.employee_name}</span>
            : <span style={{ color: C.textMuted }}>—</span>}
        </div>

        {/* Size */}
        <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
          <HardDrive size={10} />
          {contract.file_size ? fmtBytes(contract.file_size) : "—"}
        </div>

        {/* Date */}
        <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
          <Calendar size={10} />
          {new Date(contract.upload_date).toLocaleDateString("vi-VN")}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {isPreviewable(contract.file_name) && (
            <button
              onClick={() => setPreview(true)}
              title="Xem trước"
              style={{
                width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
                background: "transparent", cursor: "pointer", display: "flex", alignItems: "center",
                justifyContent: "center", color: C.textSub, transition: "all .12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue; (e.currentTarget as HTMLButtonElement).style.color = C.blue; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textSub; }}
            >
              <Eye size={13} />
            </button>
          )}
          <button
            onClick={() => void downloadFile(`/api/contracts/${partnerId}/${contract.id}/download`, contract.file_name, token)}
            title="Tải xuống"
            style={{
              width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`,
              background: "transparent", cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", color: C.textSub, transition: "all .12s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.green; (e.currentTarget as HTMLButtonElement).style.color = C.green; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textSub; }}
          >
            <Download size={13} />
          </button>
        </div>
      </div>

      {preview && (
        <PreviewModal contract={contract} partnerId={partnerId} token={token} onClose={() => setPreview(false)} />
      )}
    </>
  );
}

// ── Year group ────────────────────────────────────────────────
function YearGroup({ year, contracts, partnerId, token }: {
  year: string; contracts: PartnerContract[]; partnerId: string; token: string | null;
}) {
  const [open, setOpen] = useState(true);
  const totalSize = contracts.reduce((s, c) => s + (c.file_size ?? 0), 0);

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
          background: `${C.blue}0d`, borderRadius: open ? `${RADIUS.sm} ${RADIUS.sm} 0 0` : RADIUS.sm,
          border: `1px solid ${C.border}`, cursor: "pointer", transition: "background .12s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.blue}1a`)}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = `${C.blue}0d`)}
      >
        {open ? <ChevronDown size={13} color={C.blue} /> : <ChevronRight size={13} color={C.blue} />}
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{year}</span>
        <span style={{ fontSize: 11, color: C.textMuted }}>{contracts.length} hợp đồng</span>
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>· {fmtBytes(totalSize)}</span>
      </div>

      {open && (
        <div style={{ border: `1px solid ${C.border}`, borderTop: "none", borderRadius: `0 0 ${RADIUS.sm} ${RADIUS.sm}`, overflow: "hidden", background: C.bgCard }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 130px 120px 90px 120px 100px", gap: 8, padding: "8px 16px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
            {["Tên hợp đồng", "Số hợp đồng", "Phụ trách", "Dung lượng", "Ngày tải", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{h}</div>
            ))}
          </div>
          {contracts.map((c) => (
            <ContractRow key={c.id} contract={c} partnerId={partnerId} token={token} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PortalContractsPage() {
  const user      = useAuthStore((s) => s.user);
  const token     = useAuthStore((s) => s.token);
  const partnerId = user?.userType === "partner" ? (user.partner_id ?? "") : "";

  const [search, setSearch] = useState("");

  const { data: contracts = [], isLoading, refetch } = usePartnerContracts(partnerId);

  const filtered = useMemo(() => {
    if (!search.trim()) return contracts;
    const q = search.toLowerCase();
    return contracts.filter((c) =>
      c.title.toLowerCase().includes(q) ||
      (c.contract_number ?? "").toLowerCase().includes(q) ||
      c.file_name.toLowerCase().includes(q)
    );
  }, [contracts, search]);

  // Group by year (descending)
  const byYear = useMemo(() => {
    const map = new Map<string, PartnerContract[]>();
    for (const c of filtered) {
      const y = new Date(c.upload_date).getFullYear().toString();
      if (!map.has(y)) map.set(y, []);
      map.get(y)!.push(c);
    }
    return [...map.entries()].sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filtered]);

  const totalSize = contracts.reduce((s, c) => s + (c.file_size ?? 0), 0);
  const latestDate = contracts.length > 0
    ? new Date(Math.max(...contracts.map((c) => new Date(c.upload_date).getTime())))
        .toLocaleDateString("vi-VN")
    : "—";

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* ── Header ──────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0 }}>Hợp đồng</h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>
            Danh sách hợp đồng và phụ lục giữa bạn và Meridian MCN
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={() => void refetch()}>
          Làm mới
        </Button>
      </div>

      {/* ── KPI strip ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng hợp đồng",   value: contracts.length.toString(), icon: <FileText size={16} />, color: C.blue },
          { label: "Tổng dung lượng",  value: fmtBytes(totalSize),          icon: <HardDrive size={16} />, color: C.purple },
          { label: "Cập nhật gần nhất", value: latestDate,                  icon: <Calendar size={16} />,  color: C.teal },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", boxShadow: SHADOW.sm }}>
            <div style={{ width: 40, height: 40, borderRadius: RADIUS.sm, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div style={{ marginBottom: 16, position: "relative", maxWidth: 360 }}>
        <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên, số hợp đồng..."
          style={{
            width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
            color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
          }}
        />
      </div>

      {/* ── Content ─────────────────────────────────── */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : contracts.length === 0 ? (
        <div style={{ padding: 60, textAlign: "center" }}>
          <FileText size={40} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14 }}>Chưa có hợp đồng nào</div>
          <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>Hợp đồng sẽ được hiển thị tại đây khi MCN cập nhật</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>Không tìm thấy kết quả phù hợp</div>
      ) : (
        byYear.map(([year, items]) => (
          <YearGroup key={year} year={year} contracts={items} partnerId={partnerId} token={token} />
        ))
      )}
    </div>
  );
}
