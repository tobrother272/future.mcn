import { useRef, useState, useEffect, useCallback } from "react";
import { X, FileDown, Loader, Eye, RefreshCw, AlertCircle } from "lucide-react";
import { C } from "@/styles/theme";
import { Button } from "@/components/ui";
import type { Channel } from "@/types/channel";

interface PdfRow {
  name: string;
  channelId: string;
  licensorPct: number;
  licenseePct: number;
}

export interface RevenueSharePdfModalProps {
  contextTitle: string;
  channels: Channel[];
  onClose: () => void;
  autoSelectAllChannels?: boolean;
  defaultLicensee?: string;
  defaultLicensor?: string;
  defaultLicensorPct?: number;
}

/** DD/MM/YYYY cho hiển thị trên phụ lục */
function formatDateDisplay(iso: string): string {
  if (!iso?.trim()) return ".....";
  const parts = iso.trim().split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function PdfTemplate({
  innerRef,
  contractNo,
  contractDateDisplay,
  licensor,
  licensee,
  rows,
  forPreview,
}: {
  innerRef?: React.RefObject<HTMLDivElement | null>;
  contractNo: string;
  /** Đã format DD/MM/YYYY hoặc placeholder */
  contractDateDisplay: string;
  licensor: string;
  licensee: string;
  rows: PdfRow[];
  forPreview?: boolean;
}) {
  const boxStyle: React.CSSProperties = {
    width: 794,
    padding: "48px 56px",
    fontFamily: "'Times New Roman', Times, serif",
    fontSize: 12,
    color: "#000",
    background: "#fff",
    lineHeight: 1.5,
    boxSizing: "border-box",
    ...(forPreview
      ? { position: "relative", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }
      : {
          position: "fixed",
          left: -9999,
          top: 0,
          pointerEvents: "none" as const,
        }),
  };

  return (
    <div ref={innerRef} style={boxStyle}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>
          PHỤ LỤC 01 - TỶ LỆ CHIA SẺ DOANH THU
        </div>
        <div style={{ fontStyle: "italic", fontSize: 12 }}>APPENDIX 01 - REVENUE SHARE RATE</div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 24, fontSize: 12 }}>
        <div>
          Kèm theo Hợp đồng cấp quyền số <strong>{contractNo || "....."}</strong> ký ngày{" "}
          <strong>{contractDateDisplay}</strong>
        </div>
        <div style={{ fontStyle: "italic" }}>
          Attached with the License Agreement no. <em>{contractNo || "....."}</em> signed on{" "}
          <em>{contractDateDisplay}</em>
        </div>
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 11,
          marginBottom: 40,
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: "30%" }} />
          <col style={{ width: "30%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
        </colgroup>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th colSpan={2} style={thStyle}>
              Kênh khai thác và link
              <br />
              <em>Channel's name and URL</em>
            </th>
            <th colSpan={2} style={thStyle}>
              Tỷ lệ chia sẻ doanh thu / <em>Revenue Share Rate (%)</em>
            </th>
          </tr>
          <tr style={{ background: "#e8e8e8" }}>
            <th style={{ ...thStyle, textAlign: "left", verticalAlign: "middle" }}>
              Tên kênh / <em>Channel's name</em>
            </th>
            <th style={{ ...thStyle, textAlign: "left", verticalAlign: "middle" }}>
              ID kênh / <em>Channel ID</em>
            </th>
            <th style={thStyle}>
              Bên Cấp Quyền /<br />
              <em>Licensor</em>
            </th>
            <th style={thStyle}>
              Bên Nhận Quyền /<br />
              <em>Licensee</em>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ ...tdStyle, textAlign: "center", color: "#888", fontStyle: "italic" }}>
                Chưa có kênh nào được chọn
              </td>
            </tr>
          ) : (
            rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 === 1 ? "#fafafa" : "#fff" }}>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "left",
                    verticalAlign: "top",
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      maxWidth: "100%",
                      lineHeight: 1.35,
                    }}
                  >
                    {r.name}
                  </div>
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "left",
                    verticalAlign: "top",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      color: "#333",
                      fontFamily: "Consolas, 'Courier New', monospace",
                      whiteSpace: "normal",
                      overflowWrap: "anywhere",
                      wordBreak: "break-all",
                      maxWidth: "100%",
                      lineHeight: 1.35,
                    }}
                  >
                    {r.channelId}
                  </div>
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    fontWeight: 600,
                    verticalAlign: "middle",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.licensorPct}%
                </td>
                <td
                  style={{
                    ...tdStyle,
                    textAlign: "center",
                    fontWeight: 600,
                    verticalAlign: "middle",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.licenseePct}%
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>LICENSOR</div>
          <div style={{ fontStyle: "italic", fontSize: 11 }}>{licensor || "—"}</div>
          <div style={{ marginTop: 56, borderTop: "1px solid #000", paddingTop: 4, fontSize: 11 }}>
            Ký tên / Signature
          </div>
        </div>
        <div style={{ textAlign: "center", width: "45%" }}>
          <div style={{ fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>LICENSEE</div>
          <div style={{ fontStyle: "italic", fontSize: 11 }}>{licensee || "—"}</div>
          <div style={{ marginTop: 56, borderTop: "1px solid #000", paddingTop: 4, fontSize: 11 }}>
            Ký tên / Signature
          </div>
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  border: "1px solid #999",
  padding: "6px 8px",
  textAlign: "center",
  fontWeight: 700,
  verticalAlign: "middle",
  fontSize: 11,
  boxSizing: "border-box",
};
const tdStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "6px 10px",
  verticalAlign: "middle",
  fontSize: 11,
  boxSizing: "border-box",
};

async function buildPdfBlob(el: HTMLDivElement): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const ratio = canvas.height / canvas.width;
  const imgH = pageW * ratio;

  if (imgH <= pageH) {
    pdf.addImage(imgData, "PNG", 0, 0, pageW, imgH);
  } else {
    let remaining = canvas.height;
    const sliceH = Math.floor(canvas.width * (pageH / pageW));
    let page = 0;
    while (remaining > 0) {
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(sliceH, remaining);
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.drawImage(
        canvas,
        0,
        page * sliceH,
        canvas.width,
        sliceCanvas.height,
        0,
        0,
        canvas.width,
        sliceCanvas.height
      );
      if (page > 0) pdf.addPage();
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, pageW, pageH);
      remaining -= sliceH;
      page++;
    }
  }

  return pdf.output("blob");
}

export function RevenueSharePdfModal({
  contextTitle,
  channels,
  onClose,
  autoSelectAllChannels = false,
  defaultLicensee = "GLOBIX PRODUCTION AND TRADING COMPANY LIMITED",
  defaultLicensor = "AUTO MOTOTUBE INC.",
  defaultLicensorPct = 70,
}: RevenueSharePdfModalProps) {
  const pdfCaptureRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewTab, setPreviewTab] = useState<"layout" | "pdf">("layout");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfRefreshing, setPdfRefreshing] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [contractNo, setContractNo] = useState("");
  const [contractDate, setContractDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [licensor, setLicensor] = useState(defaultLicensor);
  const [licensee, setLicensee] = useState(defaultLicensee);
  const [licensorPct, setLicensorPct] = useState(() =>
    Math.max(0, Math.min(100, defaultLicensorPct))
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** Tên in trên phụ lục (hotfix); key = channel id */
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!channels.length) {
      setSelected(new Set());
      return;
    }
    if (autoSelectAllChannels) {
      setSelected(new Set(channels.map((c) => c.id)));
    }
  }, [channels, autoSelectAllChannels]);

  useEffect(() => {
    const ids = new Set(channels.map((c) => c.id));
    setNameOverrides((prev) => {
      const next: Record<string, string> = {};
      for (const [id, v] of Object.entries(prev)) {
        if (ids.has(id)) next[id] = v;
      }
      return next;
    });
  }, [channels]);

  const displayNameFor = (c: Channel) => {
    if (nameOverrides[c.id] !== undefined) return nameOverrides[c.id].trim();
    return (c.name || c.yt_id || "").trim();
  };

  const setChannelDisplayName = (id: string, value: string) => {
    setNameOverrides((prev) => ({ ...prev, [id]: value }));
  };

  const defaultNameForInput = (c: Channel) => c.name || c.yt_id || "";

  const toggle = (id: string) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  const toggleAll = () =>
    setSelected(selected.size === channels.length ? new Set() : new Set(channels.map((c) => c.id)));

  const rows: PdfRow[] = channels
    .filter((c) => selected.has(c.id))
    .map((c) => {
      const name = displayNameFor(c) || c.yt_id || "—";
      return {
        name,
        channelId: c.yt_id || "",
        licensorPct,
        licenseePct: 100 - licensorPct,
      };
    });

  const refreshPdfPreview = useCallback(async (switchToPdfTab = true) => {
    const el = pdfCaptureRef.current;
    if (!el || !rows.length) {
      setPdfError("Chọn ít nhất một kênh để tạo PDF.");
      return;
    }
    setPdfError(null);
    setPdfRefreshing(true);
    try {
      const blob = await buildPdfBlob(el);
      setPdfBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      if (switchToPdfTab) setPreviewTab("pdf");
    } catch (e) {
      console.error(e);
      setPdfError(e instanceof Error ? e.message : "Không tạo được PDF");
    } finally {
      setPdfRefreshing(false);
    }
  }, [rows]);

  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  const didAutoPdf = useRef(false);
  useEffect(() => {
    if (rows.length === 0) {
      didAutoPdf.current = false;
      return;
    }
    if (pdfRefreshing || didAutoPdf.current) return;
    didAutoPdf.current = true;
    const t = window.setTimeout(() => {
      void refreshPdfPreview(false);
    }, 500);
    return () => window.clearTimeout(t);
  }, [rows.length, refreshPdfPreview, pdfRefreshing]);

  const handleDownload = async () => {
    if (!rows.length) return;
    setGenerating(true);
    try {
      const el = pdfCaptureRef.current!;
      const blob = await buildPdfBlob(el);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PhuLuc01_${(contractNo || contextTitle).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const dateDisplay = formatDateDisplay(contractDate);
  const missingContractNo = !contractNo.trim();
  const missingRows = rows.length === 0;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 32,
    padding: "0 10px",
    borderRadius: 7,
    boxSizing: "border-box",
    border: `1px solid ${C.border}`,
    background: C.bgCard,
    color: C.text,
    fontSize: 13,
    outline: "none",
  };

  const hint = (text: string, warn?: boolean) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginTop: 6,
        fontSize: 11,
        color: warn ? C.amber : C.textMuted,
      }}
    >
      {warn && <AlertCircle size={12} />}
      {text}
    </div>
  );

  const sharedTemplateProps = {
    contractNo,
    contractDateDisplay: dateDisplay,
    licensor,
    licensee,
    rows,
  };

  return (
    <>
      <PdfTemplate innerRef={pdfCaptureRef} {...sharedTemplateProps} />

      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999,
          background: "rgba(0,0,0,0.72)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          style={{
            width: "min(1180px, 100%)",
            maxHeight: "92vh",
            background: C.bgCard,
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              borderBottom: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Xuất Phụ Lục 01</div>
              <div style={{ fontSize: 12, color: C.textMuted }}>{contextTitle}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "row",
              minHeight: 0,
              gap: 0,
            }}
          >
            {/* Cột trái — Form */}
            <div
              style={{
                width: 400,
                flexShrink: 0,
                overflowY: "auto",
                padding: "16px 18px",
                borderRight: `1px solid ${C.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>Thông tin hợp đồng & bên ký</div>

              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>SỐ HỢP ĐỒNG</div>
                <input
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  placeholder="VD: 0326-02/LA/Auto - Globix"
                  style={{
                    ...inputStyle,
                    borderColor: missingContractNo ? C.amber : C.border,
                  }}
                />
                {missingContractNo &&
                  hint("Nên điền số hợp đồng — hiện đang hiển thị ..... trên phụ lục.", true)}
              </div>

              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>NGÀY KÝ</div>
                <input
                  type="date"
                  value={contractDate}
                  onChange={(e) => setContractDate(e.target.value)}
                  style={inputStyle}
                />
                {hint(`Trên phụ lục sẽ hiển thị: ${dateDisplay}`)}
              </div>

              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>LICENSOR (Bên cấp quyền)</div>
                <input value={licensor} onChange={(e) => setLicensor(e.target.value)} style={inputStyle} />
              </div>

              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>LICENSEE (Bên nhận quyền)</div>
                <input value={licensee} onChange={(e) => setLicensee(e.target.value)} style={inputStyle} />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: C.bgHover,
                }}
              >
                <span style={{ fontSize: 12, color: C.textSub, flex: 1 }}>Tỷ lệ Licensor</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={licensorPct}
                  onChange={(e) => setLicensorPct(Number(e.target.value))}
                  style={{ width: 100 }}
                />
                <span style={{ fontSize: 14, fontWeight: 700, color: C.blue, minWidth: 52 }}>
                  {licensorPct}% / {100 - licensorPct}%
                </span>
              </div>

              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>
                    CHỌN KÊNH ({selected.size}/{channels.length})
                  </div>
                  <button
                    type="button"
                    onClick={toggleAll}
                    style={{
                      background: "none",
                      border: "none",
                      color: C.blue,
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {selected.size === channels.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                  </button>
                </div>
                <div
                  style={{
                    maxHeight: 280,
                    overflowY: "auto",
                    border: `1px solid ${missingRows ? C.amber : C.border}`,
                    borderRadius: 8,
                  }}
                >
                  {channels.map((ch) => {
                    const inputValue =
                      nameOverrides[ch.id] !== undefined
                        ? nameOverrides[ch.id]
                        : defaultNameForInput(ch);
                    return (
                      <div
                        key={ch.id}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderBottom: `1px solid ${C.border}`,
                          background: selected.has(ch.id) ? `${C.blue}10` : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(ch.id)}
                          onChange={() => toggle(ch.id)}
                          style={{ accentColor: C.blue, width: 14, height: 14, marginTop: 22, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
                            Tên trên phụ lục
                          </div>
                          <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setChannelDisplayName(ch.id, e.target.value)}
                            placeholder={defaultNameForInput(ch) || "Nhập tên kênh..."}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              width: "100%",
                              height: 30,
                              padding: "0 8px",
                              borderRadius: 6,
                              boxSizing: "border-box",
                              border: `1px solid ${C.border}`,
                              background: C.bgCard,
                              color: C.text,
                              fontSize: 12,
                              fontWeight: 500,
                              outline: "none",
                            }}
                          />
                          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                            ID: <span style={{ fontFamily: "monospace" }}>{ch.yt_id || "—"}</span>
                          </div>
                        </div>
                        {selected.has(ch.id) && (
                          <span
                            style={{
                              fontSize: 11,
                              color: C.blue,
                              fontWeight: 600,
                              flexShrink: 0,
                              marginTop: 22,
                            }}
                          >
                            {licensorPct}% / {100 - licensorPct}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {missingRows && hint("Chọn ít nhất một kênh để xuất phụ lục.", true)}
              </div>
            </div>

            {/* Cột phải — Xem.trước */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                background: "#1a1c24",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderBottom: `1px solid ${C.border}`,
                  flexShrink: 0,
                }}
              >
                <Eye size={15} color={C.textMuted} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub }}>Xem trước</span>
                <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("layout")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: `1px solid ${previewTab === "layout" ? C.blue : C.border}`,
                      background: previewTab === "layout" ? `${C.blue}22` : "transparent",
                      color: previewTab === "layout" ? C.blue : C.textMuted,
                      fontSize: 12,
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Bản in (HTML)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTab("pdf")}
                    disabled={!pdfBlobUrl}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: `1px solid ${previewTab === "pdf" ? C.blue : C.border}`,
                      background: previewTab === "pdf" ? `${C.blue}22` : "transparent",
                      color: previewTab === "pdf" ? C.blue : C.textMuted,
                      fontSize: 12,
                      cursor: pdfBlobUrl ? "pointer" : "not-allowed",
                      fontWeight: 600,
                      opacity: pdfBlobUrl ? 1 : 0.5,
                    }}
                  >
                    File PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void refreshPdfPreview(true)}
                    disabled={pdfRefreshing || !rows.length}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 10px",
                      borderRadius: 6,
                      border: `1px solid ${C.border}`,
                      background: C.bgCard,
                      color: C.amber,
                      fontSize: 12,
                      cursor: rows.length && !pdfRefreshing ? "pointer" : "not-allowed",
                      fontWeight: 600,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        animation: pdfRefreshing ? "spin 0.8s linear infinite" : undefined,
                      }}
                    >
                      <RefreshCw size={13} />
                    </span>
                    {pdfRefreshing ? "Đang tạo..." : "Làm mới PDF"}
                  </button>
                </div>
              </div>

              {pdfError && (
                <div style={{ padding: "8px 14px", fontSize: 12, color: C.red, background: `${C.red}12` }}>
                  {pdfError}
                </div>
              )}

              <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                {previewTab === "layout" ? (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      overflow: "auto",
                      padding: 16,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        transform: "scale(0.72)",
                        transformOrigin: "top center",
                        marginBottom: 24,
                      }}
                    >
                      <PdfTemplate {...sharedTemplateProps} forPreview />
                    </div>
                  </div>
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
                    {pdfBlobUrl ? (
                      <iframe
                        title="PDF preview"
                        src={pdfBlobUrl}
                        style={{
                          flex: 1,
                          width: "100%",
                          border: "none",
                          background: "#525659",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.textMuted,
                          fontSize: 13,
                          padding: 24,
                          textAlign: "center",
                        }}
                      >
                        Bấm <strong style={{ color: C.amber }}> Làm mới PDF </strong> để tạo và xem file PDF giống khi tải về.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              borderTop: `1px solid ${C.border}`,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 12, color: C.textMuted }}>
              {rows.length > 0 ? `${rows.length} kênh trong phụ lục` : "Chưa chọn kênh"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Đóng
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Eye size={14} />}
                disabled={!rows.length || pdfRefreshing}
                onClick={() => void refreshPdfPreview(true)}
              >
                Xem PDF
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={
                  generating ? (
                    <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                  ) : (
                    <FileDown size={14} />
                  )
                }
                disabled={rows.length === 0 || generating}
                onClick={() => void handleDownload()}
              >
                {generating ? "Đang tạo..." : "Tải PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
