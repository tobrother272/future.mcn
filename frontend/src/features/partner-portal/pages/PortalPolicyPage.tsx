import { useState, useCallback, useEffect } from "react";
import { ShieldCheck, ChevronDown, ChevronLeft, ChevronRight, Search, X, Image, ImageOff, ZoomIn } from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { usePolicyList } from "@/api/policies.api";
import type { Policy } from "@/api/policies.api";
import { fmtDate } from "@/lib/format";

// ── Image path helper ─────────────────────────────────────────
function imgSrc(p: string) {
  const n = p.replace(/\\/g, "/");
  if (n.includes("/uploads/")) return n.slice(n.indexOf("/uploads/"));
  if (n.startsWith("uploads/")) return `/${n}`;
  if (n.startsWith("/")) return n;
  return `/${n}`;
}

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = useCallback(() => setIdx((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setIdx((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose, prev, next]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={20} />
      </button>
      {images.length > 1 && (
        <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,.7)", fontSize: 13 }}>
          {idx + 1} / {images.length}
        </div>
      )}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: "absolute", left: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} />
        </button>
      )}
      <img src={imgSrc(images[idx] ?? "")} alt="" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "92vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.6)" }} />
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={24} />
        </button>
      )}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
          {images.map((img, i) => (
            <img key={i} src={imgSrc(img)} alt="" onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              style={{ width: 52, height: 38, objectFit: "cover", borderRadius: 4, cursor: "pointer", opacity: i === idx ? 1 : .4, border: i === idx ? "2px solid #fff" : "2px solid transparent", transition: "all .15s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Single policy card ────────────────────────────────────────
function PolicyCard({ policy }: { policy: Policy }) {
  const [expanded, setExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, overflow: "hidden", boxShadow: SHADOW.sm, transition: "box-shadow .2s" }}>
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{ width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: "16px 20px", display: "flex", alignItems: "flex-start", gap: 14 }}
      >
        {/* Icon */}
        <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <ShieldCheck size={16} color={C.blue} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{policy.name}</div>
          {policy.application && (
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
              <span style={{ color: C.textMuted }}>Áp dụng: </span>{policy.application}
            </div>
          )}
          {!expanded && policy.content && (
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {policy.content.substring(0, 120)}{policy.content.length > 120 ? "…" : ""}
            </div>
          )}
        </div>

        {/* Meta */}
        <div style={{ flexShrink: 0, textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {policy.images.length > 0 && (
              <span style={{ fontSize: 11, background: `${C.purple}20`, color: C.purple, padding: "2px 8px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}>
                <Image size={9} />{policy.images.length}
              </span>
            )}
            <span style={{ fontSize: 11, color: C.textMuted }}>
              {fmtDate(policy.updated_at)}
            </span>
            <ChevronDown size={15} color={C.textMuted} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </div>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "18px 20px 20px", background: `${C.bg}bb` }}>
          {/* Full content */}
          {policy.content && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Nội dung chính sách</div>
              <div style={{ fontSize: 13, color: C.textSub, whiteSpace: "pre-wrap", lineHeight: 1.85, background: C.bgCard, padding: "14px 16px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}` }}>
                {policy.content}
              </div>
            </div>
          )}

          {/* Images */}
          {policy.images.length > 0 ? (
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>
                Hình ảnh minh họa ({policy.images.length})
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {policy.images.map((img, i) => (
                  <div key={img} style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setLightbox(i)}>
                    <img src={imgSrc(img)} alt=""
                      style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}`, display: "block" }}
                      onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                    <div style={{ position: "absolute", inset: 0, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "all .15s", background: "transparent" }}
                      onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,.4)"; el.style.opacity = "1"; }}
                      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "transparent"; el.style.opacity = "0"; }}>
                      <ZoomIn size={22} color="#fff" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 13 }}>
              <ImageOff size={15} /> Không có ảnh minh họa
            </div>
          )}

          {/* Updated date */}
          <div style={{ marginTop: 16, fontSize: 11, color: C.textMuted, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
            Cập nhật lần cuối: {fmtDate(policy.updated_at)}
          </div>
        </div>
      )}

      {lightbox !== null && <Lightbox images={policy.images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── Portal Policy Page ────────────────────────────────────────
export default function PortalPolicyPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery]   = useState("");
  const [page, setPage]     = useState(0);
  const limit = 15;

  const { data, isLoading } = usePolicyList({ search: query || undefined, limit, offset: page * limit });
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${C.blue}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color={C.blue} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Chính sách YouTube</h1>
            <p style={{ margin: 0, fontSize: 13, color: C.textSub }}>Các chính sách nội dung bạn cần tuân thủ khi tham gia mạng lưới</p>
          </div>
        </div>
      </div>

      {/* Notice banner */}
      <div style={{ background: `${C.blue}18`, border: `1px solid ${C.blue}40`, borderRadius: RADIUS.md, padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <ShieldCheck size={18} color={C.blue} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.blue, marginBottom: 4 }}>Lưu ý tuân thủ chính sách</div>
          <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.7 }}>
            Vui lòng đọc kỹ và tuân thủ các chính sách dưới đây. Vi phạm chính sách có thể dẫn đến cảnh báo kênh, giảm doanh thu
            hoặc chấm dứt hợp tác. Nếu có thắc mắc, hãy liên hệ nhân viên phụ trách của bạn.
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(0); }} style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
          <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm chính sách..."
            style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <button type="submit" style={{ padding: "9px 16px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 13, color: C.textSub }}>Tìm</button>
        {query && (
          <button type="button" onClick={() => { setSearch(""); setQuery(""); }}
            style={{ padding: "9px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 13, color: C.textMuted, display: "flex", alignItems: "center", gap: 5 }}>
            <X size={12} /> Xóa lọc
          </button>
        )}
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center" }}>
          {isLoading ? "Đang tải..." : `${total} chính sách`}
        </span>
      </form>

      {/* Content */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Đang tải dữ liệu...</div>
      ) : !data?.items.length ? (
        <div style={{ padding: 60, textAlign: "center", background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}` }}>
          <ShieldCheck size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14 }}>
            {query ? "Không tìm thấy chính sách phù hợp" : "Chưa có chính sách nào được đăng"}
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {data.items.map((p) => <PolicyCard key={p.id} policy={p} />)}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 24 }}>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "6px 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.textSub, display: "flex", alignItems: "center" }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ padding: "6px 12px", borderRadius: RADIUS.sm, border: `1px solid ${i === page ? C.blue : C.border}`, background: i === page ? C.blue : "transparent", color: i === page ? "#fff" : C.textSub, cursor: "pointer", fontSize: 13, fontWeight: i === page ? 600 : 400 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ padding: "6px 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.textSub, display: "flex", alignItems: "center" }}>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
