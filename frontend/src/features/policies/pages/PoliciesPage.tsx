import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, X, Upload, ImageOff,
  ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ShieldCheck,
  RefreshCw, FileText, Image, Check, Type, Tag,
} from "lucide-react";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, Pill } from "@/components/ui";
import {
  usePolicyList, useCreatePolicy, useUpdatePolicy, useDeletePolicy,
  useUploadPolicyImages, useRemovePolicyImage, useSetPolicyImages,
} from "@/api/policies.api";
import type { Policy, PolicyImage } from "@/api/policies.api";
import { useTopics } from "@/api/cms.api";
import { useToast } from "@/stores/notificationStore";

// ── HTML → Markdown links converter (used on paste) ──────────
function htmlToMarkdownLinks(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  // Replace <a href="url">text</a> → [text](url), recursively for all anchors
  div.querySelectorAll("a[href]").forEach((a) => {
    const href = (a as HTMLAnchorElement).href;
    const label = (a.textContent ?? "").trim();
    if (!href || !label) return;
    // Replace anchor node with a text node containing the markdown link
    const replacement = document.createTextNode(label === href ? href : `[${label}](${href})`);
    a.replaceWith(replacement);
  });
  // Get plain text, preserving newlines from block elements
  div.querySelectorAll("p, div, br, li").forEach((el) => {
    el.after(document.createTextNode("\n"));
  });
  return (div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Linkify: render text with [label](url) and bare URLs ──────
// Matches [label](url) first, then bare https?:// URLs
const LINK_RE = /(\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/[^\s<>"')\]]+)/g;
function Linkify({ text }: { text: string }) {
  const parts = text.split(LINK_RE);
  return (
    <>
      {parts.map((part, i) => {
        // Markdown link [label](url)
        const md = /^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.exec(part);
        if (md) {
          return (
            <a key={i} href={md[2]} target="_blank" rel="noopener noreferrer"
              style={{ color: "#60a5fa", textDecoration: "underline" }}
              onClick={(e) => e.stopPropagation()}>
              {md[1]}
            </a>
          );
        }
        // Bare URL
        if (/^https?:\/\//.test(part)) {
          return (
            <a key={i} href={part} target="_blank" rel="noopener noreferrer"
              style={{ color: "#60a5fa", textDecoration: "underline", wordBreak: "break-all" }}
              onClick={(e) => e.stopPropagation()}>
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Image path helper ─────────────────────────────────────────
function imgSrc(p: string) {
  const n = p.replace(/\\/g, "/");
  if (n.includes("/uploads/")) return n.slice(n.indexOf("/uploads/"));
  if (n.startsWith("uploads/")) return `/${n}`;
  if (n.startsWith("/")) return n;
  return `/${n}`;
}

// ── Lightbox ──────────────────────────────────────────────────
function Lightbox({ images, startIndex, onClose }: { images: PolicyImage[]; startIndex: number; onClose: () => void }) {
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

  const cur = images[idx];

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }} onClick={(e) => e.stopPropagation()}>
        <img src={imgSrc(cur?.path ?? "")} alt={cur?.caption ?? ""}
          style={{ maxWidth: "90vw", maxHeight: "78vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.6)" }} />
        {cur?.caption && (
          <div style={{ color: "rgba(255,255,255,.9)", fontSize: 14, maxWidth: "80vw", textAlign: "center", background: "rgba(0,0,0,.5)", padding: "8px 16px", borderRadius: 8, lineHeight: 1.5 }}>
            {cur.caption}
          </div>
        )}
      </div>
      {images.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: "absolute", right: 16, background: "rgba(255,255,255,.15)", border: "none", color: "#fff", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={24} />
        </button>
      )}
      {images.length > 1 && (
        <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
          {images.map((img, i) => (
            <img key={i} src={imgSrc(img.path)} alt="" onClick={(e) => { e.stopPropagation(); setIdx(i); }}
              style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 4, cursor: "pointer", opacity: i === idx ? 1 : .4, border: i === idx ? "2px solid #fff" : "2px solid transparent", transition: "all .15s" }} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Topic picker (multi-select pills) ────────────────────────
function TopicPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const { data: topics = [] } = useTopics();
  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);

  if (!topics.length) return (
    <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>Chưa có topic nào trong hệ thống</div>
  );

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {topics.map((t) => {
        const selected = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => toggle(t.id)}
            style={{
              padding: "4px 12px", borderRadius: 99, fontSize: 12, cursor: "pointer",
              border: `1px solid ${selected ? C.purple : C.border}`,
              background: selected ? `${C.purple}20` : C.bgHover,
              color: selected ? C.purple : C.textSub,
              fontWeight: selected ? 600 : 400,
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .12s",
            }}
          >
            {selected && <Check size={10} />}
            <Tag size={10} />
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

// ── Pending file with caption ─────────────────────────────────
interface PendingFile { file: File; url: string; caption: string }

// ── Drop zone ─────────────────────────────────────────────────
function DropZone({ pendingFiles, onChange }: { pendingFiles: PendingFile[]; onChange: (f: PendingFile[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const add = (list: FileList | null) => {
    if (!list) return;
    onChange([...pendingFiles, ...Array.from(list).map((f) => ({ file: f, url: URL.createObjectURL(f), caption: "" }))]);
  };
  const rm = (i: number) => {
    if (pendingFiles[i]) URL.revokeObjectURL(pendingFiles[i].url);
    onChange(pendingFiles.filter((_, j) => j !== i));
  };
  const setCaption = (i: number, caption: string) => {
    onChange(pendingFiles.map((p, j) => j === i ? { ...p, caption } : p));
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
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>hoặc click để chọn nhiều ảnh — JPG, PNG, WebP (tối đa 20 MB)</div>
      </div>
      <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={(e) => add(e.target.files)} />

      {pendingFiles.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {pendingFiles.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.bgHover, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={p.url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}` }} />
                <button onClick={() => rm(i)} style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={10} /></button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.file.name}</div>
                <input
                  value={p.caption}
                  onChange={(e) => setCaption(i, e.target.value)}
                  placeholder="Caption / chú thích (tuỳ chọn)..."
                  style={{ width: "100%", padding: "5px 10px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Caption editor for existing image ─────────────────────────
function CaptionEditor({ image, onSave, onCancel }: { image: PolicyImage; onSave: (caption: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(image.caption);
  return (
    <div style={{ display: "flex", gap: 6, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(val); if (e.key === "Escape") onCancel(); }}
        placeholder="Nhập caption..."
        style={{ flex: 1, padding: "4px 8px", background: C.bgCard, border: `1px solid ${C.blue}`, borderRadius: 6, color: C.text, fontSize: 11, outline: "none" }}
      />
      <button onClick={() => onSave(val)} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}><Check size={11} /></button>
      <button onClick={onCancel} style={{ background: C.bgHover, color: C.textMuted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center" }}><X size={11} /></button>
    </div>
  );
}

// ── Policy form modal ─────────────────────────────────────────
function PolicyModal({ policy, onClose }: { policy?: Policy; onClose: () => void }) {
  const createMut = useCreatePolicy();
  const updateMut = useUpdatePolicy(policy?.id ?? "");
  const removeMut = useRemovePolicyImage(policy?.id ?? "");
  const setImagesMut = useSetPolicyImages(policy?.id ?? "");
  const toast = useToast();
  const isEdit = !!policy;

  const [name, setName] = useState(policy?.name ?? "");
  const [content, setContent] = useState(policy?.content ?? "");
  const [application, setApplication] = useState(policy?.application ?? "");
  const [topicIds, setTopicIds] = useState<string[]>(policy?.topic_ids ?? []);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editCaptionIdx, setEditCaptionIdx] = useState<number | null>(null);
  // local copy of existing images for caption editing
  const [existingImages, setExistingImages] = useState<PolicyImage[]>(policy?.images ?? []);

  const uploadImages = async (policyId: string) => {
    if (!pendingFiles.length) return;
    setUploading(true);
    try {
      const token = (await import("@/stores/authStore")).useAuthStore.getState().token;
      const form = new FormData();
      pendingFiles.forEach((p) => form.append("images", p.file));
      form.append("captions", JSON.stringify(pendingFiles.map((p) => p.caption)));
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

  const handleSaveCaption = async (idx: number, newCaption: string) => {
    const updated = existingImages.map((img, i) => i === idx ? { ...img, caption: newCaption } : img);
    setExistingImages(updated);
    setEditCaptionIdx(null);
    if (policy?.id) {
      await setImagesMut.mutateAsync(updated);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.warning("Thiếu tên", "Nhập tên chính sách"); return; }
    const data = { name: name.trim(), content: content.trim(), application: application.trim(), topic_ids: topicIds };
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
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.lg, width: 680, maxHeight: "92vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.7)" }}>
        {/* Header */}
        <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <ShieldCheck size={16} color={C.blue} />
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>{isEdit ? "Chỉnh sửa chính sách" : "Thêm chính sách mới"}</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 4, display: "flex" }}><X size={18} /></button>
        </div>

        <form onSubmit={(e) => void handleSave(e)} style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={lbl}>Tên chính sách *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              placeholder="VD: Chính sách vi phạm bản quyền..." style={inp} />
          </div>
          <div>
            <label style={lbl}>
              Nội dung chi tiết
              <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 400, color: C.textMuted, textTransform: "none" }}>
                — paste từ web giữ link · thủ công: <code style={{ background: C.bgHover, padding: "0 4px", borderRadius: 3 }}>[tên](url)</code>
              </span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={(e) => {
                const html = e.clipboardData.getData("text/html");
                if (html) {
                  e.preventDefault();
                  const converted = htmlToMarkdownLinks(html);
                  const el = e.currentTarget;
                  const start = el.selectionStart ?? content.length;
                  const end = el.selectionEnd ?? content.length;
                  const next = content.slice(0, start) + converted + content.slice(end);
                  setContent(next);
                  requestAnimationFrame(() => {
                    el.selectionStart = el.selectionEnd = start + converted.length;
                  });
                }
              }}
              rows={6}
              placeholder="Mô tả chi tiết... hoặc paste text từ trang web để giữ nguyên link"
              style={{ ...inp, resize: "vertical" as const }}
            />
          </div>
          <div>
            <label style={lbl}>Phạm vi áp dụng</label>
            <input value={application} onChange={(e) => setApplication(e.target.value)}
              placeholder="VD: Áp dụng cho tất cả kênh từ ngày 01/01/2026..." style={inp} />
          </div>

          {/* Topics */}
          <div>
            <label style={{ ...lbl, marginBottom: 8 }}>
              Chủ đề liên quan
              {topicIds.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, background: `${C.purple}20`, color: C.purple, padding: "2px 8px", borderRadius: 99, fontWeight: 600, textTransform: "none" }}>
                  {topicIds.length} đã chọn
                </span>
              )}
            </label>
            <TopicPicker value={topicIds} onChange={setTopicIds} />
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

            {/* Existing images with caption editing */}
            {isEdit && existingImages.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>Ảnh hiện tại — click icon <Type size={10} style={{ verticalAlign: "middle" }} /> để sửa caption:</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {existingImages.map((img, i) => (
                    <div key={img.path} style={{ display: "flex", gap: 10, alignItems: "flex-start", background: C.bgHover, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                      <div style={{ position: "relative", flexShrink: 0 }}>
                        <img src={imgSrc(img.path)} alt={img.caption} onClick={() => setLightbox(i)}
                          style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: `1px solid ${C.border}`, cursor: "zoom-in" }}
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                        <button type="button" onClick={() => removeMut.mutate(img.path, {
                          onSuccess: (p) => setExistingImages(p.images),
                        })}
                          style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 18, height: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <X size={10} />
                        </button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {editCaptionIdx === i ? (
                          <CaptionEditor
                            image={img}
                            onSave={(c) => void handleSaveCaption(i, c)}
                            onCancel={() => setEditCaptionIdx(null)}
                          />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: img.caption ? C.textSub : C.textMuted, fontStyle: img.caption ? "normal" : "italic", flex: 1 }}>
                              {img.caption || "Chưa có caption"}
                            </span>
                            <button type="button" onClick={() => setEditCaptionIdx(i)}
                              style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 5, padding: "3px 7px", cursor: "pointer", color: C.textMuted, display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                              <Type size={10} /> Sửa
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DropZone pendingFiles={pendingFiles} onChange={setPendingFiles} />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4, borderTop: `1px solid ${C.border}` }}>
            <Button variant="ghost" onClick={onClose}>Hủy</Button>
            <Button variant="primary" onClick={() => {}} disabled={isPending || !name.trim()} type="submit">
              {isPending ? (uploading ? "Đang tải ảnh..." : "Đang lưu...") : (isEdit ? "Lưu thay đổi" : "Tạo chính sách")}
            </Button>
          </div>
        </form>
      </div>

      {lightbox !== null && existingImages.length > 0 && (
        <Lightbox images={existingImages} startIndex={lightbox} onClose={() => setLightbox(null)} />
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
  const setImagesMut = useSetPolicyImages(policy.id);
  const { refetch } = usePolicyList();
  const { data: allTopics = [] } = useTopics();
  const [uploadFiles, setUploadFiles] = useState<PendingFile[]>([]);
  const [editCaptionIdx, setEditCaptionIdx] = useState<number | null>(null);

  const policyTopics = allTopics.filter((t) => policy.topic_ids?.includes(t.id));

  const doUpload = async () => {
    if (!uploadFiles.length) return;
    await uploadMut.mutateAsync({
      files: uploadFiles.map((f) => f.file),
      captions: uploadFiles.map((f) => f.caption),
    });
    uploadFiles.forEach((f) => URL.revokeObjectURL(f.url));
    setUploadFiles([]);
    setShowUpload(false);
    void refetch();
  };

  const handleSaveCaption = async (idx: number, newCaption: string) => {
    const updated = policy.images.map((img, i) => i === idx ? { ...img, caption: newCaption } : img);
    setEditCaptionIdx(null);
    await setImagesMut.mutateAsync(updated);
    void refetch();
  };

  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, marginBottom: 10, overflow: "hidden", boxShadow: SHADOW.sm }}>
      {/* Header */}
      <div style={{ padding: "15px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>
          <ShieldCheck size={16} color={C.blue} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{policy.name}</span>
            {policy.images.length > 0 && (
              <Pill color="purple" style={{ fontSize: 10 }}><Image size={9} style={{ marginRight: 3 }} />{policy.images.length} ảnh</Pill>
            )}
            {policyTopics.map((t) => (
              <Pill key={t.id} color="teal" style={{ fontSize: 10 }}>
                <Tag size={9} style={{ marginRight: 3 }} />{t.name}
              </Pill>
            ))}
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
                <Linkify text={policy.content} />
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {policy.images.map((img, i) => (
                  <div key={img.path} style={{ width: 140 }}>
                    {/* Image thumbnail */}
                    <div style={{ position: "relative" }}>
                      <div style={{ position: "relative", cursor: "zoom-in" }} onClick={() => setLightbox(i)}>
                        <img src={imgSrc(img.path)} alt={img.caption}
                          style={{ width: 140, height: 100, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}`, display: "block" }}
                          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "all .15s" }}
                          onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,.4)"; el.style.opacity = "1"; }}
                          onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.background = "rgba(0,0,0,0)"; el.style.opacity = "0"; }}>
                          <ZoomIn size={22} color="#fff" />
                        </div>
                      </div>
                      <button onClick={() => removeMut.mutate(img.path, { onSuccess: () => void refetch() })}
                        style={{ position: "absolute", top: -6, right: -6, background: C.red, color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <X size={11} />
                      </button>
                    </div>

                    {/* Caption */}
                    {editCaptionIdx === i ? (
                      <CaptionEditor
                        image={img}
                        onSave={(c) => void handleSaveCaption(i, c)}
                        onCancel={() => setEditCaptionIdx(null)}
                      />
                    ) : (
                      <div style={{ marginTop: 5, display: "flex", alignItems: "flex-start", gap: 4 }}>
                        <span
                          onClick={() => setEditCaptionIdx(i)}
                          title="Click để sửa caption"
                          style={{ fontSize: 11, color: img.caption ? C.textSub : C.textMuted, fontStyle: img.caption ? "normal" : "italic", flex: 1, cursor: "text", lineHeight: 1.4, minHeight: 16 }}>
                          {img.caption || "Thêm caption..."}
                        </span>
                        <button onClick={() => setEditCaptionIdx(i)} title="Sửa caption"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: C.textMuted, padding: 1, flexShrink: 0, display: "flex" }}>
                          <Type size={10} />
                        </button>
                      </div>
                    )}
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
  const [search, setSearch]           = useState("");
  const [debouncedSearch, setDebounced] = useState("");
  const [topicFilter, setTopicFilter] = useState("");
  const [page, setPage]               = useState(0);
  const limit = 20;
  const toast = useToast();
  const { data: allTopics = [] }  = useTopics();

  // Debounce 300ms — tự động search khi gõ
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, refetch } = usePolicyList({
    search:   debouncedSearch || undefined,
    topic_id: topicFilter || undefined,
    limit,
    offset:   page * limit,
  });
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

      {/* Search + Topic filter */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: allTopics.length ? 10 : 0 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 420 }}>
            <Search size={13} color={C.textMuted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, nội dung, áp dụng…"
              style={{ width: "100%", paddingLeft: 34, paddingRight: search ? 32 : 12, paddingTop: 8, paddingBottom: 8, background: C.bgCard, border: `1px solid ${debouncedSearch ? C.blue : C.border}`, borderRadius: RADIUS.sm, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
            {search && (
              <button
                onClick={() => { setSearch(""); }}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.textMuted, display: "flex", padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {(debouncedSearch || topicFilter) && (
            <Button variant="ghost" size="sm" icon={<X size={12} />} onClick={() => { setSearch(""); setTopicFilter(""); setPage(0); }}>
              Xóa lọc
            </Button>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: C.textMuted, display: "flex", alignItems: "center" }}>{total} chính sách</span>
        </div>

        {/* Topic filter chips */}
        {allTopics.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.textMuted }}>Lọc theo chủ đề:</span>
            <button
              onClick={() => { setTopicFilter(""); setPage(0); }}
              style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, cursor: "pointer", border: `1px solid ${!topicFilter ? C.blue : C.border}`, background: !topicFilter ? `${C.blue}15` : "transparent", color: !topicFilter ? C.blue : C.textMuted }}>
              Tất cả
            </button>
            {allTopics.map((t) => (
              <button key={t.id}
                onClick={() => { setTopicFilter(topicFilter === t.id ? "" : t.id); setPage(0); }}
                style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, border: `1px solid ${topicFilter === t.id ? C.teal : C.border}`, background: topicFilter === t.id ? `${C.teal}15` : "transparent", color: topicFilter === t.id ? C.teal : C.textMuted, fontWeight: topicFilter === t.id ? 600 : 400 }}>
                <Tag size={9} />{t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : !data?.items.length ? (
        <div style={{ padding: 60, textAlign: "center", background: C.bgCard, borderRadius: RADIUS.md, border: `1px solid ${C.border}` }}>
          <ShieldCheck size={36} color={C.textMuted} style={{ marginBottom: 12 }} />
          <div style={{ color: C.textSub, fontSize: 14, marginBottom: 8 }}>
            {debouncedSearch ? "Không tìm thấy chính sách phù hợp" : "Chưa có chính sách nào"}
          </div>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setModal("create")}>Thêm chính sách đầu tiên</Button>
        </div>
      ) : (
        <>
          {data.items.map((p) => (
            <PolicyCard key={p.id} policy={p} onEdit={() => setModal(p)} onDelete={() => handleDelete(p)} />
          ))}
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
