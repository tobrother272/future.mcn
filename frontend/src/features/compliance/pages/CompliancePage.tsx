import { useState, useRef, useCallback, useEffect } from "react";
import {
  Plus, Search, Pencil, Trash2, X, Upload, ExternalLink,
  ChevronDown, ChevronLeft, ChevronRight, ZoomIn,
  AlertTriangle, CheckCircle, XCircle, History, Clock,
  RefreshCw, Minus, ImageOff,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import {
  useViolationList, useCreateViolation, useUpdateViolation,
  useDeleteViolation, useUploadViolationImages, useUploadViolationThumb, useRemoveViolationImage,
  useViolationResolutions, useAddResolution, useUpdateResolution, useDeleteResolution,
} from "@/api/violations.api";
import type { Violation, ViolationCreate, ViolationResult, ViolationResolution, ViolationType } from "@/api/violations.api";
import { usePolicyList } from "@/api/policies.api";
import { useAuthStore } from "@/stores/authStore";
import { useToast } from "@/stores/notificationStore";
import { fmtDate } from "@/lib/format";

// ── Shared styles ─────────────────────────────────────────────
const LBL: React.CSSProperties = {
  display: "block", marginBottom: 5, fontSize: 11, fontWeight: 700,
  color: "var(--c-text-muted,#6b7280)", textTransform: "uppercase", letterSpacing: ".04em",
};
const INP: React.CSSProperties = {
  width: "100%", padding: "8px 12px", background: C.bgInput,
  border: `1px solid ${C.border}`, borderRadius: RADIUS.sm,
  color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
};

// ── Constants ─────────────────────────────────────────────────
const RESULTS: ViolationResult[] = ["Thành Công", "Thất Bại", "Không thực hiện"];
const RESULT_OPTS = ["Thành Công", "Thất Bại", "Chờ Xử Lý"] as const;

function resultCfg(r: ViolationResult | (typeof RESULT_OPTS)[number]) {
  if (r === "Thành Công") return { color: C.green,  bg: `${C.green}20`,  pillColor: "green"  as const };
  if (r === "Thất Bại")   return { color: C.red,    bg: `${C.red}20`,    pillColor: "red"    as const };
  return                          { color: C.amber,  bg: `${C.amber}20`,  pillColor: "amber"  as const };
}

function ResultIcon({ r }: { r: ViolationResult | (typeof RESULT_OPTS)[number] }) {
  if (r === "Thành Công") return <CheckCircle size={12} />;
  if (r === "Thất Bại")   return <XCircle     size={12} />;
  return                          <Clock       size={12} />;
}

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
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowLeft") prev(); if (e.key === "ArrowRight") next(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose, prev, next]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
      {images.length > 1 && <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,.7)", fontSize: 13 }}>{idx + 1} / {images.length}</div>}
      {images.length > 1 && <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: "absolute", left: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronLeft size={24} /></button>}
      <img src={imgSrc(images[idx] ?? "")} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "90vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.6)" }} />
      {images.length > 1 && <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><ChevronRight size={24} /></button>}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
          {images.map((img, i) => <img key={i} src={imgSrc(img)} alt="" onClick={(e) => { e.stopPropagation(); setIdx(i); }} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, cursor: "pointer", opacity: i === idx ? 1 : .45, border: i === idx ? "2px solid #fff" : "2px solid transparent", transition: "all .15s" }} />)}
        </div>
      )}
    </div>
  );
}

// ── Video Modal ───────────────────────────────────────────────
function toGDriveEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/file\/d\/([^/]+)/);
    if (m) return `https://drive.google.com/file/d/${m[1]}/preview`;
    const id = u.searchParams.get("id");
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  } catch { /* not a URL */ }
  return null;
}

function VideoModal({ url, onClose }: { url: string; onClose: () => void }) {
  const embedUrl = toGDriveEmbed(url);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={20} /></button>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 92vw)", background: "#000", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 60px rgba(0,0,0,.8)" }}>
        {embedUrl ? (
          <iframe src={embedUrl} allow="autoplay" style={{ width: "100%", aspectRatio: "16/9", border: "none", display: "block" }} allowFullScreen />
        ) : (
          <div style={{ aspectRatio: "16/9", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: C.textMuted }}>
            <p style={{ margin: 0, fontSize: 14 }}>Không thể nhúng link này.</p>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.blue, fontSize: 13 }}>Mở trong tab mới</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────
function DropZone({ pending, onChange }: { pending: { file: File; url: string; caption: string }[]; onChange: (v: { file: File; url: string; caption: string }[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const add = (list: FileList | null) => {
    if (!list) return;
    onChange([...pending, ...Array.from(list).map((f) => ({ file: f, url: URL.createObjectURL(f), caption: "" }))]);
  };
  return (
    <div>
      <div onClick={() => ref.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        style={{ border: `2px dashed ${drag ? C.amber : C.border}`, borderRadius: RADIUS.sm, padding: "16px 20px", cursor: "pointer", background: drag ? `${C.amber}0d` : C.bg, textAlign: "center", fontSize: 13, color: drag ? C.amber : C.textSub, transition: "all .15s" }}>
        <Upload size={20} color={drag ? C.amber : C.textMuted} style={{ margin: "0 auto 6px", display: "block" }} />
        Kéo thả ảnh minh họa hoặc click để chọn
      </div>
      <input ref={ref} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => add(e.target.files)} />
      {pending.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {pending.map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={p.url} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
              <button type="button" onClick={() => { URL.revokeObjectURL(p.url); onChange(pending.filter((_, j) => j !== i)); }}
                style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Resolution item ───────────────────────────────────────────
function ResolutionItem({ r, violationId }: { r: ViolationResolution; violationId: string }) {
  const [editing, setEditing] = useState(false);
  const updateMut = useUpdateResolution(violationId, r.id);
  const [result, setResult] = useState<(typeof RESULT_OPTS)[number]>(r.result);
  const [resolution, setResolution] = useState(r.resolution);
  const [notes, setNotes]           = useState(r.notes ?? "");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate({ resolution: resolution.trim(), result, notes: notes.trim() || null }, { onSuccess: () => setEditing(false) });
  };

  const cfg = resultCfg(r.result);

  if (editing) {
    return (
      <form onSubmit={handleSave} style={{ border: `2px solid ${C.blue}`, borderRadius: RADIUS.sm, padding: "14px 16px", background: C.bgCard }}>
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Kết quả</label>
          <div style={{ display: "flex", gap: 8 }}>
            {RESULT_OPTS.map((ro) => {
              const c = resultCfg(ro);
              return (
                <button key={ro} type="button" onClick={() => setResult(ro)}
                  style={{ flex: 1, padding: "7px 4px", borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 12, fontWeight: result === ro ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center", gap: 4, transition: "all .15s", border: `2px solid ${result === ro ? c.color : C.border}`, background: result === ro ? c.bg : "transparent", color: result === ro ? c.color : C.textMuted }}>
                  <ResultIcon r={ro} /> {ro}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Cách xử lý</label>
          <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2} style={{ ...INP, resize: "vertical" as const }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label style={LBL}>Ghi chú</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...INP, resize: "vertical" as const }} />
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Hủy</Button>
          <Button variant="primary" size="sm" type="submit" disabled={updateMut.isPending}>Lưu</Button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: "12px 16px", background: C.bgCard }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4, background: cfg.bg, color: cfg.color }}>
          <ResultIcon r={r.result} /> {r.result}
        </span>
        <button onClick={() => setEditing(true)} style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.blue, cursor: "pointer", padding: "3px 8px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <Pencil size={11} /> Sửa
        </button>
      </div>
      <p style={{ margin: "0 0 6px", fontSize: 13, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{r.resolution}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: C.textMuted }}>
        {r.handler_info  && <span>👤 {r.handler_info}</span>}
        {r.resolved_date && <span>🔧 {fmtDate(r.resolved_date)}</span>}
        {r.result_date   && <span>📩 {fmtDate(r.result_date)}</span>}
      </div>
      {r.notes && <p style={{ margin: "6px 0 0", fontSize: 11, color: C.textSub, fontStyle: "italic" }}>{r.notes}</p>}
      <p style={{ margin: "5px 0 0", fontSize: 10, color: C.textMuted }}>{fmtDate(r.created_at)}</p>
    </div>
  );
}

// ── Resolution History Modal ──────────────────────────────────
function ResolutionHistoryModal({ violation, onClose }: { violation: Violation; onClose: () => void }) {
  const { data: resolutions, isLoading } = useViolationResolutions(violation.id);
  const addMut = useAddResolution(violation.id);
  const delMut = useDeleteResolution(violation.id);
  const today  = new Date().toISOString().slice(0, 10);

  const [resolution,   setResolution]   = useState("");
  const [handlerInfo,  setHandlerInfo]  = useState("");
  const [resolvedDate, setResolvedDate] = useState(today);
  const [resultDate,   setResultDate]   = useState("");
  const [result,       setResult]       = useState<(typeof RESULT_OPTS)[number]>("Chờ Xử Lý");
  const [notes,        setNotes]        = useState("");
  const [showForm,     setShowForm]     = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addMut.mutate({
      resolution: resolution.trim(), handler_info: handlerInfo.trim() || undefined,
      resolved_date: resolvedDate || null, result_date: resultDate || null, result, notes: notes.trim() || null,
    }, {
      onSuccess: () => {
        setResolution(""); setHandlerInfo(""); setResolvedDate(today);
        setResultDate(""); setResult("Chờ Xử Lý"); setNotes(""); setShowForm(false);
      },
    });
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, width: 680, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <History size={16} color={C.blue} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Lịch sử xử lý</div>
            <div style={{ fontSize: 11, color: C.textSub }}>{violation.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}><X size={18} /></button>
        </div>

        <div style={{ padding: "18px 22px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Button variant={showForm ? "ghost" : "primary"} size="sm" icon={showForm ? <X size={13} /> : <Plus size={13} />} onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Hủy" : "Thêm xử lý"}
            </Button>
          </div>

          {showForm && (
            <form onSubmit={handleAdd} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LBL}>Cách xử lý *</label>
                  <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} required rows={3} style={{ ...INP, resize: "vertical" as const }} placeholder="Mô tả cách xử lý đã thực hiện..." />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LBL}>Thông tin người xử lý</label>
                  <input value={handlerInfo} onChange={(e) => setHandlerInfo(e.target.value)} style={INP} placeholder="VD: Nguyễn Văn A — Bộ phận Content..." />
                </div>
                <div>
                  <label style={LBL}>Ngày xử lý</label>
                  <input type="date" value={resolvedDate} onChange={(e) => setResolvedDate(e.target.value)} style={INP} />
                </div>
                <div>
                  <label style={LBL}>Ngày nhận kết quả</label>
                  <input type="date" value={resultDate} onChange={(e) => setResultDate(e.target.value)} style={INP} />
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LBL}>Kết quả</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {RESULT_OPTS.map((r) => {
                      const c = resultCfg(r);
                      return (
                        <button key={r} type="button" onClick={() => setResult(r)}
                          style={{ flex: 1, padding: "8px 4px", borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 12, fontWeight: result === r ? 700 : 400, transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, border: `2px solid ${result === r ? c.color : C.border}`, background: result === r ? c.bg : "transparent", color: result === r ? c.color : C.textMuted }}>
                          <ResultIcon r={r} /> {r}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={LBL}>Ghi chú</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...INP, resize: "vertical" as const }} placeholder="Ghi chú thêm..." />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Hủy</Button>
                <Button variant="primary" size="sm" type="submit" disabled={addMut.isPending || !resolution.trim()}>
                  {addMut.isPending ? "Đang lưu..." : "Lưu"}
                </Button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>Đang tải...</div>
          ) : !resolutions?.length ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
              <Clock size={32} style={{ margin: "0 auto 8px", display: "block", opacity: .4 }} />Chưa có lịch sử xử lý
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resolutions.map((r) => (
                <div key={r.id} style={{ position: "relative" }}>
                  <ResolutionItem r={r} violationId={violation.id} />
                  <button onClick={() => { if (confirm("Xóa bản ghi này?")) delMut.mutate(r.id); }}
                    style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex" }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Violation Form Modal ──────────────────────────────────────
function ViolationModal({ violation, onClose }: { violation?: Violation; onClose: () => void }) {
  const { data: policiesData } = usePolicyList({ limit: 200 });
  const createMut = useCreateViolation();
  const updateMut = useUpdateViolation(violation?.id ?? "");
  const removeMut = useRemoveViolationImage(violation?.id ?? "");
  const toast = useToast();

  const [violationType, setViolationType] = useState<ViolationType>(violation?.violation_type === "Thông tin" ? "Thông tin" : "Hình ảnh / Video");
  const [name,         setName]         = useState(violation?.name         ?? "");
  const [videoId,      setVideoId]      = useState(violation?.video_id      ?? "");
  const [videoUrl,     setVideoUrl]     = useState(violation?.video_url     ?? "");
  const [videoTitle,   setVideoTitle]   = useState(violation?.video_title   ?? "");
  const [thumbFile,    setThumbFile]    = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState(false);
  const [channelId,    setChannelId]    = useState(violation?.channel_id    ?? "");
  const [channelName,  setChannelName]  = useState(violation?.channel_name  ?? "");
  const [channelUrl,   setChannelUrl]   = useState(violation?.channel_url   ?? "");
  const [content,      setContent]      = useState(violation?.content       ?? "");
  const [policyId,     setPolicyId]     = useState(violation?.policy_id     ?? "");
  const [result,       setResult]       = useState<ViolationResult>(violation?.result ?? "Không thực hiện");
  const [notes,        setNotes]        = useState(violation?.notes         ?? "");
  const [detectedDate, setDetectedDate] = useState(violation?.detected_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10));
  const [pending,      setPending]      = useState<{ file: File; url: string; caption: string }[]>([]);
  const [uploading,    setUploading]    = useState(false);
  const [lightbox,     setLightbox]     = useState<number | null>(null);

  const isEdit = !!violation;
  const saving = createMut.isPending || updateMut.isPending || uploading;

  const uploadAll = async (id: string) => {
    setUploading(true);
    try {
      const token = useAuthStore.getState().token;
      if (thumbFile) {
        const f = new FormData(); f.append("thumb", thumbFile);
        await fetch(`/api/violations/${id}/thumb`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: f });
      }
      if (pending.length) {
        const f = new FormData();
        pending.forEach((p) => f.append("images", p.file));
        f.append("captions", JSON.stringify(pending.map((p) => p.caption ?? "")));
        await fetch(`/api/violations/${id}/images`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: f });
      }
    } finally { setUploading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.warning("Thiếu thông tin", "Nhập tên vi phạm"); return; }
    const data: ViolationCreate = {
      name: name.trim(), violation_type: violationType,
      video_id: videoId.trim() || null, video_url: videoUrl.trim() || null, video_title: videoTitle.trim(),
      channel_id: channelId.trim() || null, channel_name: channelName.trim(), channel_url: channelUrl.trim() || null,
      content: content.trim(), policy_id: policyId || null,
      result, notes: notes.trim() || null, detected_date: detectedDate || null,
    };
    try {
      if (isEdit) {
        await updateMut.mutateAsync(data); await uploadAll(violation!.id);
        toast.success("Đã cập nhật", name.trim());
      } else {
        const created = await createMut.mutateAsync(data); await uploadAll(created.id);
        toast.success("Đã tạo vi phạm", name.trim());
      }
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Thất bại");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, width: 700, maxHeight: "94vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertTriangle size={16} color={C.amber} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>{isEdit ? "Chỉnh sửa vi phạm" : "Thêm vi phạm mới"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, display: "flex" }}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: "18px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Name */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={LBL}>Tên vi phạm *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required style={INP} placeholder="VD: Vi phạm bản quyền âm nhạc..." />
            </div>

            {/* Video info + Thumb */}
            <div style={{ gridColumn: "1/-1", display: "grid", gridTemplateColumns: "1fr 180px", gap: 14, alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={LBL}>Video ID vi phạm</label>
                  <input value={videoId} onChange={(e) => setVideoId(e.target.value)} style={INP} placeholder="VD: dQw4w9WgXcQ" />
                </div>
                <div>
                  <label style={LBL}>Tiêu đề video</label>
                  <input value={videoTitle} onChange={(e) => setVideoTitle(e.target.value)} style={INP} placeholder="Tên video vi phạm..." />
                </div>
                <div>
                  <label style={LBL}>Link video (Google Drive)</label>
                  <div style={{ position: "relative" }}>
                    <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} style={{ ...INP, paddingRight: videoUrl.trim() ? 38 : undefined }} placeholder="https://drive.google.com/file/d/..." />
                    {videoUrl.trim() && (
                      <button type="button" onClick={() => setPreviewVideo(true)}
                        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.blue, cursor: "pointer", display: "flex", padding: 0 }}>
                        <ExternalLink size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label style={LBL}>Thumbnail</label>
                <label style={{ display: "block", cursor: "pointer" }}>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    setThumbFile(f);
                    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
                    setThumbPreview(URL.createObjectURL(f));
                  }} />
                  {(thumbPreview || violation?.video_thumb) ? (
                    <div style={{ position: "relative" }}>
                      <img src={thumbPreview ?? imgSrc(violation!.video_thumb!)} alt=""
                        style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: RADIUS.sm, border: `2px dashed ${C.border}`, display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      <div style={{ position: "absolute", inset: 0, borderRadius: RADIUS.sm, background: "rgba(0,0,0,.35)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0"; }}>
                        <Upload size={18} color="#fff" />
                        <span style={{ fontSize: 11, color: "#fff", marginTop: 4 }}>Thay ảnh</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ width: "100%", aspectRatio: "16/9", border: `2px dashed ${C.border}`, borderRadius: RADIUS.sm, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, color: C.textMuted }}>
                      <Upload size={22} /><span style={{ fontSize: 11 }}>Upload thumbnail</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Channel */}
            <div>
              <label style={LBL}>Tên kênh</label>
              <input value={channelName} onChange={(e) => setChannelName(e.target.value)} style={INP} placeholder="Tên kênh vi phạm..." />
            </div>
            <div>
              <label style={LBL}>Channel ID</label>
              <input value={channelId} onChange={(e) => setChannelId(e.target.value)} style={INP} placeholder="VD: UCxxxxxx" />
            </div>

            {/* Policy + Date */}
            <div>
              <label style={LBL}>Chính sách liên quan</label>
              <select value={policyId} onChange={(e) => setPolicyId(e.target.value)} style={{ ...INP, appearance: "none" as const }}>
                <option value="">— Không chọn —</option>
                {policiesData?.items.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Ngày phát hiện</label>
              <input type="date" value={detectedDate} onChange={(e) => setDetectedDate(e.target.value)} style={INP} />
            </div>

            {/* Result */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={LBL}>Kết quả xử lý</label>
              <div style={{ display: "flex", gap: 8 }}>
                {RESULTS.map((r) => {
                  const c = resultCfg(r);
                  return (
                    <button key={r} type="button" onClick={() => setResult(r)}
                      style={{ flex: 1, padding: "9px 8px", borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 12, fontWeight: result === r ? 700 : 400, transition: "all .15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: `2px solid ${result === r ? c.color : C.border}`, background: result === r ? c.bg : "transparent", color: result === r ? c.color : C.textMuted }}>
                      <ResultIcon r={r} /> {r}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ gridColumn: "1/-1" }}>
              <label style={LBL}>Ghi chú</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...INP, resize: "vertical" as const }} placeholder="Ghi chú thêm..." />
            </div>

            {/* Evidence type */}
            <div style={{ gridColumn: "1/-1", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <label style={{ ...LBL, marginBottom: 10 }}>Loại vi phạm *</label>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {([
                  { val: "Thông tin",       icon: "📝", label: "Vi phạm thông tin" },
                  { val: "Hình ảnh / Video", icon: "🖼", label: "Vi phạm hình ảnh / video" },
                ] as { val: ViolationType; icon: string; label: string }[]).map(({ val, icon, label }) => (
                  <button key={val} type="button" onClick={() => setViolationType(val)}
                    style={{ flex: 1, padding: "10px 8px", borderRadius: RADIUS.sm, cursor: "pointer", fontSize: 12, fontWeight: violationType === val ? 700 : 400, transition: "all .15s", textAlign: "center" as const, border: `2px solid ${violationType === val ? C.blue : C.border}`, background: violationType === val ? `${C.blue}18` : "transparent", color: violationType === val ? C.blue : C.textMuted }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{icon}</div>{label}
                  </button>
                ))}
              </div>

              {/* Text content */}
              {violationType === "Thông tin" && (
                <div>
                  <div style={{ background: `${C.blue}18`, border: `1px solid ${C.blue}40`, borderRadius: RADIUS.sm, padding: "10px 14px", fontSize: 12, color: C.blue, marginBottom: 10 }}>
                    📝 Dán đoạn văn bản vi phạm (tiêu đề, mô tả, từ khóa…) bị YouTube cảnh báo vào ô bên dưới.
                  </div>
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} style={{ ...INP, resize: "vertical" as const }} placeholder="Dán nội dung vi phạm vào đây..." />
                </div>
              )}

              {/* Image evidence */}
              {violationType === "Hình ảnh / Video" && (
                <div>
                  <div style={{ background: `${C.amber}18`, border: `1px solid ${C.amber}40`, borderRadius: RADIUS.sm, padding: "10px 14px", fontSize: 12, color: C.amber, marginBottom: 10 }}>
                    🖼 Upload hình ảnh / chụp màn hình vi phạm, mỗi hình kèm mô tả lý do.
                  </div>

                  {isEdit && violation!.images.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ margin: "0 0 8px", fontSize: 11, color: C.textMuted, fontWeight: 700, textTransform: "uppercase" }}>Ảnh hiện tại:</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {violation!.images.map((img, imgIdx) => (
                          <div key={img} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg, borderRadius: RADIUS.sm, padding: 8, border: `1px solid ${C.border}` }}>
                            <img src={imgSrc(img)} alt="" style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, cursor: "zoom-in", flexShrink: 0 }}
                              onClick={() => setLightbox(imgIdx)} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div style={{ flex: 1, fontSize: 12, color: C.textSub }}>
                              {(violation!.image_captions ?? {})[img] || <em style={{ color: C.textMuted }}>Không có mô tả</em>}
                            </div>
                            <button type="button" onClick={() => removeMut.mutate(img)}
                              style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: 4, display: "flex" }}><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pending.length > 0 && (
                    <div style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                      {pending.map((p, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, background: `${C.blue}12`, borderRadius: RADIUS.sm, padding: 8, border: `1px solid ${C.blue}30` }}>
                          <img src={p.url} alt="" style={{ width: 80, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: "0 0 4px", fontSize: 11, color: C.textSub, fontWeight: 500 }}>{p.file.name}</p>
                            <input value={p.caption} onChange={(e) => setPending(prev => prev.map((item, j) => j === i ? { ...item, caption: e.target.value } : item))}
                              placeholder="Mô tả lý do vi phạm của hình này..." style={{ ...INP, fontSize: 12, padding: "5px 10px" }} />
                          </div>
                          <button type="button" onClick={() => { URL.revokeObjectURL(p.url); setPending(prev => prev.filter((_, j) => j !== i)); }}
                            style={{ background: "none", border: "none", color: C.red, cursor: "pointer", padding: 4, flexShrink: 0, display: "flex" }}><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: `2px dashed ${C.border}`, borderRadius: RADIUS.sm, cursor: "pointer", background: C.bg, fontSize: 13, color: C.textSub }}>
                    <Upload size={16} /> Chọn hoặc kéo thả ảnh vào đây
                    <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      setPending(prev => [...prev, ...files.map(f => ({ file: f, url: URL.createObjectURL(f), caption: "" }))]);
                      e.target.value = "";
                    }} />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button variant="primary" type="submit" disabled={saving || !name.trim()}>
              {saving ? (uploading ? "Đang tải ảnh..." : "Đang lưu...") : isEdit ? "Lưu thay đổi" : "Tạo vi phạm"}
            </Button>
          </div>
        </form>
      </div>

      {lightbox !== null && violation && <Lightbox images={violation.images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      {previewVideo && videoUrl.trim() && <VideoModal url={videoUrl.trim()} onClose={() => setPreviewVideo(false)} />}
    </div>
  );
}

// ── Violation Detail Modal ────────────────────────────────────
function ViolationDetailModal({ v, onClose, onEdit, onOpenHistory }: { v: Violation; onClose: () => void; onEdit: () => void; onOpenHistory: () => void }) {
  const [lightbox,  setLightbox]  = useState<number | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const { data: resolutions } = useViolationResolutions(v.id);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const cfg = resultCfg(v.result);

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ width: 160, flexShrink: 0, fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{children}</span>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 16px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, width: "100%", maxWidth: 780, boxShadow: "0 20px 60px rgba(0,0,0,.7)", marginBottom: 40 }}>
        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>{v.name}</h2>
              <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600, background: v.violation_type === "Thông tin" ? `${C.blue}25` : `${C.amber}25`, color: v.violation_type === "Thông tin" ? C.blue : C.amber }}>
                {v.violation_type === "Thông tin" ? "📝" : "🖼"} {v.violation_type}
              </span>
              {v.policy_name && <Pill color="purple" style={{ fontSize: 10 }}>📋 {v.policy_name}</Pill>}
              <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 99, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, background: cfg.bg, color: cfg.color }}>
                <ResultIcon r={v.result} /> {v.result}
              </span>
            </div>
            {v.detected_date && <p style={{ margin: 0, fontSize: 11, color: C.textMuted }}>📅 Phát hiện: {fmtDate(v.detected_date)}</p>}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <Button variant="primary" size="sm" icon={<Pencil size={12} />} onClick={() => { onClose(); onEdit(); }}>Sửa</Button>
            <button onClick={onClose} style={{ padding: "6px 10px", border: `1px solid ${C.border}`, background: "transparent", borderRadius: RADIUS.sm, cursor: "pointer", display: "flex", color: C.textMuted }}><X size={16} /></button>
          </div>
        </div>

        <div style={{ padding: "0 22px" }}>
          {/* Video info */}
          {(v.video_thumb || v.video_title || v.video_id) && (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
              {v.video_thumb && (
                <img src={imgSrc(v.video_thumb)} alt="" style={{ width: 140, height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, flexShrink: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {v.video_title && <span style={{ fontWeight: 600, fontSize: 13, color: C.text }}>🎬 {v.video_title}</span>}
                {v.video_id    && <span style={{ fontSize: 12, color: C.textMuted }}>ID: {v.video_id}</span>}
                {v.video_url   && (
                  <button type="button" onClick={() => setShowVideo(true)}
                    style={{ alignSelf: "flex-start", background: `${C.blue}18`, border: "none", color: C.blue, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, borderRadius: RADIUS.sm, padding: "4px 10px" }}>
                    <ExternalLink size={11} /> Xem video
                  </button>
                )}
              </div>
            </div>
          )}

          {(v.channel_name || v.channel_id) && <Row label="Kênh vi phạm">{v.channel_name && <strong>{v.channel_name}</strong>} {v.channel_id && <span style={{ color: C.textMuted }}>({v.channel_id})</span>}</Row>}

          {v.content && (
            <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Nội dung vi phạm</p>
              <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.8, background: C.bg, borderRadius: RADIUS.sm, padding: "10px 14px", border: `1px solid ${C.border}` }}>{v.content}</div>
            </div>
          )}

          {v.images.length > 0 && (
            <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ margin: "0 0 10px", fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Hình ảnh minh họa ({v.images.length})</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {v.images.map((img, i) => {
                  const caption = (v.image_captions ?? {})[img];
                  return (
                    <div key={img} style={{ width: 130, display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setLightbox(i)}>
                        <img src={imgSrc(img)} alt="" style={{ width: 130, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, display: "block" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        <div style={{ position: "absolute", inset: 0, borderRadius: 8, background: "rgba(0,0,0,0)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "all .15s" }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,.4)"; el.style.opacity = "1"; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,0)"; el.style.opacity = "0"; }}>
                          <ZoomIn size={20} color="#fff" />
                        </div>
                      </div>
                      {caption && <p style={{ margin: 0, fontSize: 10, color: C.textSub, lineHeight: 1.4 }}>{caption}</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {v.notes && <Row label="Ghi chú">{v.notes}</Row>}

          {/* Resolution history */}
          <div style={{ padding: "14px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>
                Lịch sử xử lý {(resolutions?.length ?? 0) > 0 && `(${resolutions!.length})`}
              </p>
              <Button variant="ghost" size="sm" icon={<History size={12} />} onClick={onOpenHistory}>Xem & thêm lịch sử</Button>
            </div>
            {(resolutions?.length ?? 0) > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {resolutions!.slice(0, 3).map((r) => {
                  const res = resultCfg(r.result);
                  return (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "6px 10px", background: C.bg, borderRadius: RADIUS.sm, border: `1px solid ${C.border}` }}>
                      <span style={{ padding: "2px 8px", borderRadius: 99, fontWeight: 700, fontSize: 10, background: res.bg, color: res.color }}>{r.result}</span>
                      <span style={{ color: C.textSub }}>{r.handler_info}</span>
                      {r.resolved_date && <span style={{ color: C.textMuted }}>{fmtDate(r.resolved_date)}</span>}
                      {r.notes && <span style={{ color: C.textSub, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.notes}</span>}
                    </div>
                  );
                })}
                {resolutions!.length > 3 && <p style={{ margin: 0, fontSize: 11, color: C.textMuted, textAlign: "center" }}>+{resolutions!.length - 3} bản ghi khác…</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      {lightbox !== null && <Lightbox images={v.images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
      {showVideo && v.video_url && <VideoModal url={v.video_url} onClose={() => setShowVideo(false)} />}
    </div>
  );
}

// ── Violation Card ────────────────────────────────────────────
function ViolationCard({ v, onEdit, onDelete }: { v: Violation; onEdit: () => void; onDelete: () => void }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showHist,   setShowHist]   = useState(false);
  const [showVideo,  setShowVideo]  = useState(false);
  const cfg = resultCfg(v.result);
  // Resolution history count — drives the badge on the "Lịch sử" button.
  const { data: resolutions } = useViolationResolutions(v.id);
  const histCount = resolutions?.length ?? 0;

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, marginBottom: 10, overflow: "hidden", boxShadow: SHADOW.sm }}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Left icon */}
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.amber}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
          <AlertTriangle size={16} color={C.amber} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{v.name}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 600, background: v.violation_type === "Thông tin" ? `${C.blue}25` : `${C.amber}25`, color: v.violation_type === "Thông tin" ? C.blue : C.amber }}>
              {v.violation_type === "Thông tin" ? "📝" : "🖼"} {v.violation_type}
            </span>
            {v.policy_name && <Pill color="purple" style={{ fontSize: 10 }}>📋 {v.policy_name}</Pill>}
            {v.images.length > 0 && <Pill color="amber" style={{ fontSize: 10 }}>{v.images.length} ảnh</Pill>}
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, background: cfg.bg, color: cfg.color }}>
              <ResultIcon r={v.result} /> {v.result}
            </span>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 4 }}>
            {v.video_thumb && (
              <img src={imgSrc(v.video_thumb)} alt="" style={{ width: 72, height: 50, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {v.video_title && (
                <span style={{ fontSize: 12, color: C.textSub, display: "flex", alignItems: "center", gap: 6 }}>
                  🎬 {v.video_title}
                  {v.video_id && <span style={{ color: C.textMuted, fontSize: 10 }}>({v.video_id})</span>}
                  {v.video_url && (
                    <button type="button" onClick={() => setShowVideo(true)}
                      style={{ background: `${C.blue}18`, border: "none", color: C.blue, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, borderRadius: RADIUS.sm, padding: "2px 8px" }}>
                      <ExternalLink size={10} /> Xem video
                    </button>
                  )}
                </span>
              )}
              {(v.channel_name || v.channel_id) && (
                <span style={{ fontSize: 11, color: C.textMuted }}>
                  📺{" "}
                  {v.channel_url
                    ? <a href={v.channel_url} target="_blank" rel="noreferrer" style={{ color: C.blue, textDecoration: "none" }}>{v.channel_name || v.channel_id}</a>
                    : (v.channel_name || v.channel_id)}
                  {v.channel_name && v.channel_id && <span style={{ color: C.textMuted, marginLeft: 4 }}>({v.channel_id})</span>}
                </span>
              )}
              {v.detected_date && <span style={{ fontSize: 11, color: C.textMuted }}>📅 {fmtDate(v.detected_date)}</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={() => setShowDetail(true)}
            style={{ padding: "5px 10px", border: `1px solid ${C.blue}`, borderRadius: RADIUS.sm, background: `${C.blue}18`, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.blue, fontWeight: 600 }}>
            <ChevronDown size={12} /> Xem
          </button>
          <button onClick={() => setShowHist(true)} title="Lịch sử xử lý"
            style={{ position: "relative", padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textSub, fontWeight: 600 }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.amber; el.style.color = C.amber; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textSub; }}>
            <History size={12} /> Lịch sử
            {histCount > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: "0 5px",
                borderRadius: 99, background: C.amber, color: "#fff",
                fontSize: 10, fontWeight: 700,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                marginLeft: 2,
              }}>
                {histCount}
              </span>
            )}
          </button>
          <button onClick={onEdit}
            style={{ padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textSub }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.blue; el.style.color = C.blue; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textSub; }}>
            <Pencil size={12} />
          </button>
          <button onClick={onDelete}
            style={{ padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.textMuted }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.red; el.style.color = C.red; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {showDetail && <ViolationDetailModal v={v} onClose={() => setShowDetail(false)} onEdit={() => { setShowDetail(false); onEdit(); }} onOpenHistory={() => setShowHist(true)} />}
      {showHist   && <ResolutionHistoryModal violation={v} onClose={() => setShowHist(false)} />}
      {showVideo  && v.video_url && <VideoModal url={v.video_url} onClose={() => setShowVideo(false)} />}
    </div>
  );
}

// ── Result filter tabs ────────────────────────────────────────
const RESULT_TABS = [
  { label: "Tất cả",          value: "" },
  { label: "Thành Công",      value: "Thành Công" },
  { label: "Thất Bại",        value: "Thất Bại" },
  { label: "Không thực hiện", value: "Không thực hiện" },
];

// ── Main Page ─────────────────────────────────────────────────
export default function CompliancePage() {
  const [search,       setSearch]       = useState("");
  const [query,        setQuery]        = useState("");
  const [filterResult, setFilterResult] = useState("");
  const [page,         setPage]         = useState(1);
  const toast = useToast();
  const limit = 20;

  const { data, isLoading, refetch } = useViolationList({ search: query || undefined, result: filterResult || undefined, page, limit });
  const deleteMut = useDeleteViolation();
  const [modal, setModal] = useState<"create" | Violation | null>(null);

  const handleDelete = (v: Violation) => {
    if (!confirm(`Xóa vi phạm "${v.name}"?`)) return;
    deleteMut.mutate(v.id, {
      onSuccess: () => toast.success("Đã xóa", v.name),
      onError:   () => toast.error("Lỗi", "Không thể xóa"),
    });
  };

  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const items      = data?.items ?? [];

  const kpiCounts = {
    total:   total,
    success: items.filter((v) => v.result === "Thành Công").length,
    failed:  items.filter((v) => v.result === "Thất Bại").length,
    pending: items.filter((v) => v.result === "Không thực hiện").length,
  };

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={20} color={C.amber} /> Vi phạm YouTube
          </h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>Quản lý và theo dõi các vi phạm nội dung YouTube của kênh</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void refetch()}>Làm mới</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModal("create")}>Thêm vi phạm</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng vi phạm",     value: total,              color: C.amber, icon: <AlertTriangle size={16} /> },
          { label: "Xử lý thành công", value: kpiCounts.success,  color: C.green, icon: <CheckCircle    size={16} /> },
          { label: "Xử lý thất bại",   value: kpiCounts.failed,   color: C.red,   icon: <XCircle        size={16} /> },
          { label: "Chưa xử lý",       value: kpiCounts.pending,  color: C.blue,  icon: <Clock          size={16} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", boxShadow: SHADOW.sm }}>
            <div style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {/* Result tabs */}
        <div style={{ display: "flex", gap: 3, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: 3 }}>
          {RESULT_TABS.map(({ label, value }) => (
            <button key={value} onClick={() => { setFilterResult(value); setPage(1); }}
              style={{ padding: "5px 12px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 11, background: filterResult === value ? C.amber : "transparent", color: filterResult === value ? "#fff" : C.textSub, transition: "all .15s", fontWeight: filterResult === value ? 700 : 400 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(1); }} style={{ display: "flex", gap: 8, flex: 1 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên vi phạm..."
              style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>
          <Button variant="ghost" size="sm" type="submit">Tìm</Button>
          {query && <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={() => { setSearch(""); setQuery(""); }}>Xóa</Button>}
        </form>

        <span style={{ fontSize: 12, color: C.textMuted, marginLeft: "auto" }}>{total} vi phạm</span>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>Đang tải...</div>
      ) : !items.length ? (
        <div style={{ textAlign: "center", padding: 60, background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}` }}>
          <AlertTriangle size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
          <p style={{ color: C.textSub, margin: "0 0 12px" }}>
            {query || filterResult ? "Không tìm thấy vi phạm phù hợp" : "Chưa có vi phạm nào"}
          </p>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModal("create")}>Thêm vi phạm đầu tiên</Button>
        </div>
      ) : (
        <>
          {items.map((v) => (
            <ViolationCard key={v.id} v={v} onEdit={() => setModal(v)} onDelete={() => handleDelete(v)} />
          ))}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.textSub, display: "flex" }}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  style={{ padding: "6px 12px", borderRadius: RADIUS.sm, border: `1px solid ${i + 1 === page ? C.amber : C.border}`, background: i + 1 === page ? C.amber : "transparent", color: i + 1 === page ? "#fff" : C.textSub, cursor: "pointer", fontSize: 13, fontWeight: i + 1 === page ? 600 : 400 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                style={{ padding: "6px 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.textSub, display: "flex" }}><ChevronRight size={14} /></button>
            </div>
          )}
        </>
      )}

      {modal && (
        <ViolationModal violation={modal === "create" ? undefined : modal} onClose={() => { setModal(null); void refetch(); }} />
      )}
    </div>
  );
}
