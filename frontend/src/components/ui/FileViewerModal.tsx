import { useEffect, useState } from "react";
import { X, Download, ExternalLink, Loader } from "lucide-react";
import { C } from "@/styles/theme";
import { useAuthStore } from "@/stores/authStore";

interface Props {
  url: string;          // full path e.g. /api/contracts/:pid/:id/view
  downloadUrl: string;  // /api/contracts/:pid/:id/download
  fileName: string;
  title?: string;
  onClose: () => void;
}

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
const PDF_EXT   = [".pdf"];

function extOf(name: string) {
  return name.substring(name.lastIndexOf(".")).toLowerCase();
}

export function FileViewerModal({ url, downloadUrl, fileName, title, onClose }: Props) {
  const ext = extOf(fileName);
  const isPdf   = PDF_EXT.includes(ext);
  const isImage = IMAGE_EXT.includes(ext);
  const canPreview = isPdf || isImage;

  const [blobUrl,  setBlobUrl]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    if (!canPreview) { setLoading(false); return; }

    let revoked = false;
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    const token = useAuthStore.getState().token;
    fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => {
        if (revoked) return;
        const objUrl = URL.createObjectURL(blob);
        setBlobUrl(objUrl);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (revoked) return;
        setError(e.message);
        setLoading(false);
      });

    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.80)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "92vw", height: "92vh",
        background: C.bgCard,
        borderRadius: 14,
        border: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}>
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px",
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              padding: "2px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
              textTransform: "uppercase", fontFamily: "monospace",
              background: `${C.blue}15`, color: C.blue,
            }}>
              {ext.replace(".", "")}
            </div>
            <span style={{
              fontSize: 14, fontWeight: 600, color: C.text,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {title || fileName}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {blobUrl && (
              <a
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Mở tab mới"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${C.border}`, background: C.bgHover,
                  color: C.textSub, textDecoration: "none", cursor: "pointer",
                }}
              >
                <ExternalLink size={13} />Tab mới
              </a>
            )}
            {/* Download fetches directly with auth token */}
            <DownloadButton downloadUrl={downloadUrl} fileName={fileName} />
            <button
              onClick={onClose}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 32, height: 32, borderRadius: 7, cursor: "pointer",
                border: `1px solid ${C.border}`, background: C.bgHover,
                color: C.textSub,
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: "hidden", background: "#111", position: "relative" }}>
          {/* Loading */}
          {loading && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
              color: C.textMuted,
            }}>
              <Loader size={28} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 13 }}>Đang tải file...</span>
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 12,
              color: C.textMuted,
            }}>
              <div style={{ fontSize: 40 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.red }}>Không thể tải file</div>
              <div style={{ fontSize: 12 }}>{error}</div>
            </div>
          )}

          {/* PDF */}
          {!loading && !error && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              style={{ width: "100%", height: "100%", border: "none" }}
              title={fileName}
            />
          )}

          {/* Image */}
          {!loading && !error && blobUrl && isImage && (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "auto", padding: 16, boxSizing: "border-box",
            }}>
              <img
                src={blobUrl}
                alt={fileName}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
              />
            </div>
          )}

          {/* Cannot preview */}
          {!loading && !canPreview && (
            <div style={{
              width: "100%", height: "100%",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
              color: C.textMuted,
            }}>
              <div style={{ fontSize: 48 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.textSub }}>
                Không thể xem trước loại file này
              </div>
              <div style={{ fontSize: 13, color: C.textMuted }}>{fileName}</div>
              <DownloadButton downloadUrl={downloadUrl} fileName={fileName} large />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Separate component so download also uses auth token
function DownloadButton({ downloadUrl, fileName, large }: { downloadUrl: string; fileName: string; large?: boolean }) {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={() => void handleDownload()}
      disabled={busy}
      style={{
        display: "inline-flex", alignItems: "center", gap: large ? 8 : 5,
        padding: large ? "10px 20px" : "6px 12px",
        borderRadius: large ? 10 : 7,
        fontSize: large ? 14 : 12,
        fontWeight: 600,
        border: `1px solid ${large ? C.blue : C.border}`,
        background: large ? C.blue : C.bgHover,
        color: large ? "#fff" : C.blue,
        cursor: busy ? "not-allowed" : "pointer",
        opacity: busy ? 0.7 : 1,
      }}
    >
      <Download size={large ? 16 : 13} />
      {busy ? "Đang tải..." : "Tải xuống"}
    </button>
  );
}
