import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, X, Upload, ImageOff,
  ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ShieldCheck,
  RefreshCw, FileText, Image,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import {
  usePolicyList, useCreatePolicy, useUpdatePolicy, useDeletePolicy,
  useUploadPolicyImages, useRemovePolicyImage,
} from "@/api/policies.api";
import type { Policy } from "@/api/policies.api";
import { useToast } from "@/stores/notificationStore";

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
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <X size={20} />
      </button>
      {images.length > 1 && <div style={{ position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)", color: "rgba(255,255,255,.7)", fontSize: 13 }}>{idx + 1} / {images.length}</div>}
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: "absolute", left: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} />
        </button>
      )}
      <img src={imgSrc(images[idx] ?? "")} alt="" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "90vw", maxHeight: "88vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.6)" }} />
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={24} />
        </button>
      )}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
          {images.map((img, i) => (
            <img key={i} src={imgSrc(img)} alt="" onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, cursor: "pointer", opacity: i === idx ? 1 : .4, border: i === idx ? "2px solid #fff" : "2px solid transparent", transition: "all .15s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────
function DropZone({ pendingFiles, onChange }: { pendingFiles: { file: File; url: string }[]; onChange: (f: { file: File; url: string }[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const add = (list: FileList | null) => {
    if (!list) return;
    onChange([...pendingFiles, ...Array.from(list).map((f) => ({ file: f, url: URL.createObjectURL(f) }))]);
  };
  const rm = (i: number) => {
    if (pendingFiles[i]) URL.revokeObjectURL(pendingFiles[i].url);
    onChange(pendingFiles.filter((_, j) => j !== i));
  };

  return (
    <div>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        style={{
          border: `2px dashed ${drag ? C.blue : C.border}`, borderRadius: RADIUS.sm,
          padding: "18px 20px", cursor: "pointer", textAlign: "center",
          background: drag ? `${C.blue}0d` : C.bg, transition: "all .15s",
        }}
      >
        <Upload size={20} color={drag ? C.blue : C.textMuted} style={{ margin: "0 auto 6px" }} />
        <div style={{ fontSize: 13, color: drag ? C.blue : C.textSub, fontWeight: 500 }}>Kéo thả ảnh vào đây</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>hoặc click để chọn — JPG, PNG, WebP (tối đa 20 MB)</div>
      </div>
      <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => add(e.target.files)} />
      {pendingFiles.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {pendingFiles.map((p, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img src={p.url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, fontSize: 9, background: "rgba(0,0,0,.6)", color: "#fff", borderRadius: "0 0 8px 8px", padding: "1px 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.file.name}</div>
              <button onClick={() => rm(i)} style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Policy form modal ─────────────────────────────────────────
function PolicyModal({ policy, onClose }: { policy?: Policy; onClose: () => void }) {
  const createMut = useCreatePolicy();
  const updateMut = useUpdatePolicy(policy?.id ?? "");
  const removeMut = useRemovePolicyImage(policy?.id ?? "");
  const toast = useToast();
  const isEdit = !!policy;

  const [name, setName] = useState(policy?.name ?? "");
  const [content, setContent] = useState(policy?.content ?? "");
  const [application, setApplication] = useState(policy?.application ?? "");
  const [pendingFiles, setPendingFiles] = useState<{ file: File; url: string }[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);

  const uploadImages = async (policyId: string) => {
    if (!pendingFiles.length) return;
    setUploading(true);
    try {
      const token = (await import("@/stores/authStore")).useAuthStore.getState().token;
      const form = new FormData();
      pendingFiles.forEach((p) => form.append("images", p.file));
      const r = await fetch(`/api/policies/${policyId}/images`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!r.ok) throw new Error(await r.text());
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.warning("Thiếu tên", "Nhập tên chính sách"); return; }
    const data = { name: name.trim(), content: content.trim(), application: application.trim() };
    try {
      if (isEdit) {
        const updated = await updateMut.mutateAsync(data);
        await uploadImages(updated.id);
        toast.success("Đã cập nhật", data.name);
      } else {
        const created = await createMut.mutateAsync(data);
        await uploadImages(created.id);
        toast.success("Đã tạo chính sách", data.name);
      }
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "Thất bại");
    }
  };

  const isPending = createMut.isPending || updateMut.isPending || uploading;

  const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", background: C.bgInput, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.textMuted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".03em" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, width: 660, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={16} color={C.blue} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>{isEdit ? "Chỉnh sửa chính sách" : "Thêm chính sách mới"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex" }}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Name */}
          <div>
            <label style={lbl}>Tên chính sách *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="VD: Chính sách vi phạm bản quyền..." style={inp} />
          </div>

          {/* Content */}
          <div>
            <label style={lbl}>Nội dung chi tiết</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5}
              placeholder="Mô tả chi tiết nội dung chính sách..."
              style={{ ...inp, resize: "vertical" as const }} />
          </div>

          {/* Application */}
          <div>
            <label style={lbl}>Phạm vi áp dụng</label>
            <input value={application} onChange={(e) => setApplication(e.target.value)}
              placeholder="VD: Áp dụng cho tất cả kênh từ ngày 01/01/2026..." style={inp} />
          </div>

          {/* Images */}
          <div>
            <label style={{ ...lbl, marginBottom: 8 }}>
              Hình ảnh minh họa
              {pendingFiles.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, background: `${C.blue}20`, color: C.blue, padding: "2px 8px", borderRadius: 99, fontWeight: 600, textTransform: "none" }}>
                  +{pendingFiles.length} ảnh mới
                </span>
              )}
            </label>

            {/* Existing images */}
            {isEdit && policy!.images.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>Ảnh hiện tại:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {policy!.images.map((img, i) => (
                    <div key={img} style={{ position: "relative" }}>
                      <img src={imgSrc(img)} alt="" onClick={() => setLightbox(i)}
                        style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, cursor: "zoom-in" }}
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                      <button type="button" onClick={() => removeMut.mutate(img)}
                        style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DropZone pendingFiles={pendingFiles} onChange={setPendingFiles} />
          </div>

          {/* Footer buttons */}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button variant="primary" onClick={() => {}} disabled={isPending || !name.trim()} type="submit">
              {isPending ? (uploading ? "Đang tải ảnh..." : "Đang lưu...") : (isEdit ? "Lưu thay đổi" : "Tạo chính sách")}
            </Button>
          </div>
        </form>
      </div>

      {lightbox !== null && policy && (
        <Lightbox images={policy.images} startIndex={lightbox} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}

// ── Policy card ───────────────────────────────────────────────
function PolicyCard({ policy, onEdit, onDelete }: { policy: Policy; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const removeMut = useRemovePolicyImage(policy.id);
  const uploadMut = useUploadPolicyImages(policy.id);
  const { refetch } = usePolicyList();
  const [uploadFiles, setUploadFiles] = useState<{ file: File; url: string }[]>([]);

  const doUpload = async () => {
    if (!uploadFiles.length) return;
    await uploadMut.mutateAsync(uploadFiles.map((f) => f.file));
    uploadFiles.forEach((f) => URL.revokeObjectURL(f.url));
    setUploadFiles([]);
    setShowUpload(false);
    void refetch();
  };

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, marginBottom: 10, overflow: "hidden", boxShadow: SHADOW.sm }}>
      {/* Header */}
      <div style={{ padding: "15px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Policy icon */}
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <ShieldCheck size={16} color={C.blue} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{policy.name}</span>
            {policy.images.length > 0 && (
              <Pill color="purple" style={{ fontSize: 10 }}><Image size={9} style={{ marginRight: 3 }} />{policy.images.length} ảnh</Pill>
            )}
          </div>
          {policy.application && (
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
              <span style={{ fontWeight: 600 }}>Áp dụng:</span> {policy.application}
            </div>
          )}
          {!expanded && policy.content && (
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 600 }}>
              {policy.content}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit}
            style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textSub, transition: "all .12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.blue; (e.currentTarget as HTMLButtonElement).style.color = C.blue; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textSub; }}>
            <Pencil size={12} /> Sửa
          </button>
          <button onClick={onDelete}
            style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.textMuted, transition: "all .12s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.red; (e.currentTarget as HTMLButtonElement).style.color = C.red; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.border; (e.currentTarget as HTMLButtonElement).style.color = C.textMuted; }}>
            <Trash2 size={12} />
          </button>
          <button onClick={() => setExpanded((v) => !v)}
            style={{ background: expanded ? `${C.blue}18` : "transparent", border: `1px solid ${expanded ? C.blue : C.border}`, borderRadius: RADIUS.sm, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: expanded ? C.blue : C.textSub, transition: "all .12s" }}>
            <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            {expanded ? "Thu gọn" : "Xem chi tiết"}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 18px", background: `${C.bg}cc` }}>
          {policy.content && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", marginBottom: 8 }}>Nội dung</div>
              <div style={{ fontSize: 13, color: C.textSub, whiteSpace: "pre-wrap", lineHeight: 1.8, background: C.bgCard, padding: "12px 14px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}` }}>
                {policy.content}
              </div>
            </div>
          )}

          {/* Images section */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: "uppercase" }}>Hình ảnh minh họa</div>
              <button onClick={() => setShowUpload((v) => !v)}
                style={{ background: `${C.blue}18`, border: `1px solid ${C.blue}40`, borderRadius: RADIUS.sm, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: C.blue, display: "flex", alignItems: "center", gap: 4 }}>
                <Upload size={11} /> Thêm ảnh
              </button>
            </div>

            {showUpload && (
              <div style={{ marginBottom: 14 }}>
                <DropZone pendingFiles={uploadFiles} onChange={setUploadFiles} />
                {uploadFiles.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    <Button variant="primary" size="sm" onClick={() => void doUpload()} disabled={uploadMut.isPending}>
                      {uploadMut.isPending ? "Đang tải..." : `Tải lên ${uploadFiles.length} ảnh`}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { uploadFiles.forEach((f) => URL.revokeObjectURL(f.url)); setUploadFiles([]); setShowUpload(false); }}>
                      Hủy
                    </Button>
                  </div>
                )}
              </div>
            )}

            {policy.images.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {policy.images.map((img, i) => (
                  <div key={img} style={{ position: "relative" }}>
                    <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setLightbox(i)}>
                      <img src={imgSrc(img)} alt=""
                        style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, display: "block" }}
                        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "all .15s" }}
                        onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,.4)"; el.style.opacity = "1"; }}
                        onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,0)"; el.style.opacity = "0"; }}>
                        <ZoomIn size={22} color="#fff" />
                      </div>
                    </div>
                    <button onClick={() => removeMut.mutate(img, { onSuccess: () => void refetch() })}
                      style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.textMuted, fontSize: 13 }}>
                <ImageOff size={16} /> Chưa có ảnh minh họa
              </div>
            )}
          </div>
        </div>
      )}

      {lightbox !== null && <Lightbox images={policy.images} startIndex={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PoliciesPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery]   = useState("");
  const [page, setPage]     = useState(0);
  const limit = 20;
  const toast = useToast();

  const { data, isLoading, refetch } = usePolicyList({ search: query || undefined, limit, offset: page * limit });
  const deleteMut = useDeletePolicy();
  const [modal, setModal] = useState<"create" | Policy | null>(null);

  const handleDelete = (p: Policy) => {
    if (!confirm(`Xóa chính sách "${p.name}"?`)) return;
    deleteMut.mutate(p.id, {
      onSuccess: () => toast.success("Đã xóa", p.name),
      onError: () => toast.error("Lỗi", "Không thể xóa"),
    });
  };

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const withImages = data?.items.filter((p) => p.images.length > 0).length ?? 0;

  return (
    <div style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={20} color={C.blue} /> Chính sách YouTube
          </h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>Quản lý danh sách các chính sách nội dung áp dụng cho đối tác và kênh</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void refetch()}>Làm mới</Button>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModal("create")}>Thêm chính sách</Button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng chính sách", value: total,      color: C.blue,   icon: <FileText size={16} /> },
          { label: "Có ảnh minh họa", value: withImages, color: C.purple, icon: <Image size={16} /> },
          { label: "Trang hiện tại",  value: `${page + 1}/${Math.max(1, totalPages)}`, color: C.teal, icon: <ShieldCheck size={16} /> },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", gap: 12, alignItems: "center", boxShadow: SHADOW.sm }}>
            <div style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setQuery(search); setPage(0); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
          <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên chính sách..."
            style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <Button variant="ghost" size="sm" type="submit">Tìm</Button>
        {query && <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={() => { setSearch(""); setQuery(""); }}>Xóa lọc</Button>}
        <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center" }}>{total} chính sách</span>
      </form>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : !data?.items.length ? (
        <div style={{ padding: 60, textAlign: "center", background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}` }}>
          <ShieldCheck size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14, marginBottom: 8 }}>
            {query ? "Không tìm thấy chính sách phù hợp" : "Chưa có chính sách nào"}
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModal("create")}>Thêm chính sách đầu tiên</Button>
        </div>
      ) : (
        <>
          {data.items.map((p) => (
            <PolicyCard key={p.id} policy={p} onEdit={() => setModal(p)} onDelete={() => handleDelete(p)} />
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                style={{ padding: "6px 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.textSub, display: "flex" }}><ChevronLeft size={14} /></button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} onClick={() => setPage(i)}
                  style={{ padding: "6px 12px", borderRadius: RADIUS.sm, border: `1px solid ${i === page ? C.blue : C.border}`, background: i === page ? C.blue : "transparent", color: i === page ? "#fff" : C.textSub, cursor: "pointer", fontSize: 13, fontWeight: i === page ? 600 : 400 }}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                style={{ padding: "6px 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", cursor: "pointer", color: C.textSub, display: "flex" }}><ChevronRight size={14} /></button>
            </div>
          )}
        </>
      )}

      {modal && <PolicyModal policy={modal === "create" ? undefined : modal} onClose={() => { setModal(null); void refetch(); }} />}
    </div>
  );
}
