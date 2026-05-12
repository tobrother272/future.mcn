import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, Plus, Search, Building2, CheckCircle, Clock, XCircle,
  Phone, Mail, Percent, ChevronDown, ChevronRight as ChevronRightIcon,
  GripVertical, Link2, Pencil, Youtube,
} from "lucide-react";
import { C } from "@/styles/theme";
import { Button, Card, Pill, Input, Modal, Field, Select, EmptyState } from "@/components/ui";
import {
  usePartnerList, useCreatePartner, useUpdatePartner, usePendingPartnerUsers,
  useApprovePartnerUser, useRejectPartnerUser, useSetPartnerParent,
} from "@/api/partners.api";
import { useToast } from "@/stores/notificationStore";
import { fmtDate, fmtCurrency } from "@/lib/format";
import type { Partner, PartnerType, PartnerTier } from "@/types/partner";

// ── Helpers ───────────────────────────────────────────────────
const TYPE_COLOR: Record<PartnerType, string> = { OWNED: C.amber, PRODUCTION: C.cyan, AFFILIATE: C.blue };
const TIER_COLOR: Record<PartnerTier, string> = { Premium: C.purple, Standard: C.green, Basic: C.textMuted };

function TypeBadge({ type }: { type: PartnerType }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: `${TYPE_COLOR[type]}20`, color: TYPE_COLOR[type], letterSpacing: "0.05em",
    }}>{type}</span>
  );
}
function TierBadge({ tier }: { tier: PartnerTier }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4,
      background: `${TIER_COLOR[tier]}20`, color: TIER_COLOR[tier],
    }}>{tier}</span>
  );
}

// ── Build tree from flat list ─────────────────────────────────
interface PartnerNode extends Partner { children: Partner[] }

function buildTree(items: Partner[]): PartnerNode[] {
  const roots: PartnerNode[] = [];
  const map = new Map<string, PartnerNode>();
  for (const p of items) map.set(p.id, { ...p, children: [] });
  for (const p of items) {
    const node = map.get(p.id)!;
    if (p.parent_id && map.has(p.parent_id)) {
      map.get(p.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Drag-and-drop partner row ─────────────────────────────────
interface DragState { draggingId: string | null; overId: string | null }

function PartnerRow({
  partner, isChild = false, hasChildren = false, expanded, onToggle,
  dragState, onDragStart, onDragOver, onDragEnd, onDrop,
  onClick, onEdit,
}: {
  partner: Partner;
  isChild?: boolean;
  hasChildren?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  dragState: DragState;
  onDragStart: (id: string) => void;
  onDragOver:  (id: string) => void;
  onDragEnd:   () => void;
  onDrop:      (targetId: string) => void;
  onClick:     () => void;
  onEdit:      (p: Partner) => void;
}) {
  const isDragging = dragState.draggingId === partner.id;
  const isOver     = dragState.overId === partner.id && dragState.draggingId !== partner.id;
  // Cannot drop onto a child (would exceed 2 levels)
  const canBeTarget = !isChild && dragState.draggingId !== null && dragState.draggingId !== partner.id;

  return (
    <div
      draggable
      onDragStart={(e) => { e.stopPropagation(); onDragStart(partner.id); }}
      onDragOver={(e) => { e.preventDefault(); if (canBeTarget) onDragOver(partner.id); }}
      onDragLeave={() => { if (dragState.overId === partner.id) onDragOver(""); }}
      onDragEnd={onDragEnd}
      onDrop={(e) => { e.preventDefault(); if (canBeTarget) onDrop(partner.id); }}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: isChild ? "9px 16px 9px 48px" : "11px 16px",
        borderBottom: `1px solid ${C.border}`,
        background: isDragging
          ? `${C.blue}08`
          : isOver
          ? `${C.blue}18`
          : "transparent",
        opacity: isDragging ? 0.5 : 1,
        cursor: "default",
        transition: "background 0.1s",
        outline: isOver ? `2px dashed ${C.blue}` : "none",
        outlineOffset: -2,
        borderRadius: isOver ? 6 : 0,
      }}
    >
      {/* Drag handle */}
      <span style={{ cursor: "grab", color: C.textMuted, flexShrink: 0 }}>
        <GripVertical size={13} />
      </span>

      {/* Expand/collapse for parents */}
      {!isChild && (
        <span
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          style={{ width: 16, flexShrink: 0, cursor: hasChildren ? "pointer" : "default", color: C.textMuted }}
        >
          {hasChildren ? (expanded ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />) : null}
        </span>
      )}

      {/* Icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        background: `${TYPE_COLOR[partner.type]}20`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Building2 size={13} color={TYPE_COLOR[partner.type]} />
      </div>

      {/* Name + meta */}
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onClick}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{partner.name}</span>
          <TypeBadge type={partner.type} />
          <TierBadge tier={partner.tier} />
          <Pill color={partner.status === "Active" ? "green" : partner.status === "Suspended" ? "yellow" : "red"}>
            {partner.status}
          </Pill>
        </div>
        {(partner.company_name || partner.contact_name) && (
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1, display: "flex", gap: 8 }}>
            {partner.company_name && <span>{partner.company_name}</span>}
            {partner.contact_name && <span style={{ display: "flex", alignItems: "center", gap: 3 }}>{partner.contact_name}</span>}
          </div>
        )}
      </div>

      {/* Contact */}
      <div style={{ fontSize: 11, color: C.textSub, display: "flex", flexDirection: "column", gap: 2, minWidth: 160 }}>
        {partner.email && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={10} />{partner.email}</span>}
        {partner.phone && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone size={10} />{partner.phone}</span>}
      </div>

      {/* Rev share — chỉ hiện cho partner con */}
      <div style={{ minWidth: 48 }}>
        {isChild && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, color: C.amber, fontSize: 12, fontWeight: 600 }}>
            <Percent size={11} />{Number(partner.rev_share).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Channel count — chỉ hiện cho partner con */}
      <div style={{ minWidth: 64, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {isChild && (
          <>
            <Youtube size={12} color={C.red} />
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text, marginLeft: 4 }}>{partner.channel_count ?? 0}</span>
            <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 2 }}>kênh</span>
          </>
        )}
      </div>

      {/* Revenue — tổng monthly_revenue tất cả kênh */}
      <div style={{ minWidth: 100, textAlign: "right" }}>
        {(partner.total_revenue ?? 0) > 0 ? (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green, fontFamily: "monospace" }}>
            {fmtCurrency(partner.total_revenue ?? 0)}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: C.textMuted }}>—</span>
        )}
      </div>

      {/* Date */}
      <div style={{ fontSize: 11, color: C.textMuted, minWidth: 80, textAlign: "right" }}>
        {fmtDate(partner.created_at)}
      </div>

      {/* Edit button */}
      <button
        title="Sửa thông tin"
        onClick={(e) => { e.stopPropagation(); onEdit(partner); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: C.textMuted, padding: "2px 5px", borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = C.blue)}
        onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}
      >
        <Pencil size={13} />
      </button>

    </div>
  );
}

// ── Create Partner Modal ──────────────────────────────────────
const createSchema = z.object({
  name:         z.string().min(1, "Tên hiển thị bắt buộc"),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  website:      z.string().url("URL không hợp lệ").or(z.literal("")).optional(),
  email:        z.string().email("Email không hợp lệ").or(z.literal("")).optional(),
  phone:        z.string().optional(),
  type:         z.enum(["OWNED","PRODUCTION","AFFILIATE"]).default("AFFILIATE"),
  tier:         z.enum(["Premium","Standard","Basic"]).default("Standard"),
  rev_share:    z.coerce.number().min(0).max(100).default(70),
  dept:         z.string().optional(),
  notes:        z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function CreatePartnerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const createMut = useCreatePartner();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { type: "AFFILIATE", tier: "Standard", rev_share: 70 },
  });

  const onSubmit = async (data: CreateForm) => {
    try {
      await createMut.mutateAsync(data);
      toast.success("Tạo đối tác thành công", data.name);
      reset(); onClose();
    } catch (err) {
      toast.error("Lỗi tạo đối tác", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Thêm đối tác mới" width={480}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>Hủy</Button>
          <Button variant="primary" size="sm" loading={createMut.isPending}
            onClick={() => void handleSubmit(onSubmit)()}>Tạo đối tác</Button>
        </>
      }
    >
      <form style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tên hiển thị *" error={errors.name?.message}>
            <Input {...register("name")} placeholder="KUDO DIY..." />
          </Field>
          <Field label="Tên công ty">
            <Input {...register("company_name")} placeholder="Công ty TNHH..." />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Người liên hệ">
            <Input {...register("contact_name")} placeholder="Nguyễn Văn A..." />
          </Field>
          <Field label="Phone">
            <Input {...register("phone")} placeholder="+84..." />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email">
            <Input {...register("email")} type="email" placeholder="contact@partner.com" />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <Input {...register("website")} placeholder="https://..." />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Loại">
            <Select {...register("type")}>
              <option value="AFFILIATE">AFFILIATE</option>
              <option value="OWNED">OWNED</option>
              <option value="PRODUCTION">PRODUCTION</option>
            </Select>
          </Field>
          <Field label="Tier">
            <Select {...register("tier")}>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="Basic">Basic</option>
            </Select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Rev share (%)" error={errors.rev_share?.message}>
            <Input {...register("rev_share")} type="number" min={0} max={100} step={0.5} />
          </Field>
          <Field label="Phòng ban">
            <Input {...register("dept")} placeholder="Content, Sales..." />
          </Field>
        </div>
        <Field label="Ghi chú">
          <Input {...register("notes")} placeholder="Thông tin thêm..." />
        </Field>
      </form>
    </Modal>
  );
}

// ── Transfer Parent Modal ─────────────────────────────────────
function TransferParentModal({
  child,
  roots,
  onClose,
}: {
  child: Partner;
  roots: Partner[];
  onClose: () => void;
}) {
  const toast = useToast();
  const setParentMut = useSetPartnerParent();
  const [selectedId, setSelectedId] = useState<string>(child.parent_id ?? "");

  const candidates = roots.filter((r) => r.id !== child.parent_id);

  const handleSave = async () => {
    if (!selectedId || selectedId === child.parent_id) { onClose(); return; }
    try {
      await setParentMut.mutateAsync({ id: child.id, parent_id: selectedId });
      const newParent = roots.find((r) => r.id === selectedId);
      toast.success("Đã chuyển", `${child.name} → ${newParent?.name ?? selectedId}`);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Chuyển: ${child.name}`} width={400}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" loading={setParentMut.isPending}
            onClick={() => void handleSave()} disabled={!selectedId || selectedId === child.parent_id}>
            Chuyển
          </Button>
        </>
      }
    >
      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 12 }}>
        Chọn đối tác cha mới cho <strong style={{ color: C.text }}>{child.name}</strong>
      </div>
      {candidates.length === 0 ? (
        <div style={{ fontSize: 13, color: C.textMuted, textAlign: "center", padding: "20px 0" }}>
          Không có đối tác cha nào khác
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {candidates.map((r) => (
            <label key={r.id} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
              borderRadius: 8, border: `1px solid ${selectedId === r.id ? C.blue : C.border}`,
              background: selectedId === r.id ? `${C.blue}10` : C.bgCard,
              cursor: "pointer", transition: "all 0.1s",
            }}>
              <input type="radio" name="newParent" value={r.id}
                checked={selectedId === r.id}
                onChange={() => setSelectedId(r.id)}
                style={{ accentColor: C.blue }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: `${TYPE_COLOR[r.type]}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Building2 size={12} color={TYPE_COLOR[r.type]} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{r.name}</div>
                  {r.company_name && <div style={{ fontSize: 11, color: C.textMuted }}>{r.company_name}</div>}
                </div>
              </div>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ── Edit Partner Modal ────────────────────────────────────────
const editSchema = z.object({
  name:         z.string().min(1, "Tên hiển thị bắt buộc"),
  company_name: z.string().optional(),
  contact_name: z.string().optional(),
  website:      z.string().url("URL không hợp lệ").or(z.literal("")).optional(),
  email:        z.string().email("Email không hợp lệ").or(z.literal("")).optional(),
  phone:        z.string().optional(),
  type:         z.enum(["OWNED","PRODUCTION","AFFILIATE"]),
  tier:         z.enum(["Premium","Standard","Basic"]),
  rev_share:    z.coerce.number().min(0).max(100),
  dept:         z.string().optional(),
  status:       z.enum(["Active","Suspended","Terminated"]),
  notes:        z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

function EditPartnerModal({ partner, onClose }: { partner: Partner; onClose: () => void }) {
  const toast = useToast();
  const updateMut = useUpdatePartner(partner.id);
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name:         partner.name,
      company_name: partner.company_name ?? "",
      contact_name: partner.contact_name ?? "",
      website:      partner.website ?? "",
      email:        partner.email ?? "",
      phone:        partner.phone ?? "",
      type:         partner.type,
      tier:         partner.tier,
      rev_share:    Number(partner.rev_share),
      dept:         partner.dept ?? "",
      status:       partner.status,
      notes:        partner.notes ?? "",
    },
  });

  const onSubmit = async (data: EditForm) => {
    try {
      await updateMut.mutateAsync(data);
      toast.success("Cập nhật đối tác", partner.name);
      onClose();
    } catch (err) {
      toast.error("Lỗi cập nhật", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose} title={`Sửa: ${partner.name}`} width={500}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" loading={updateMut.isPending}
            onClick={() => void handleSubmit(onSubmit)()}>Lưu thay đổi</Button>
        </>
      }
    >
      <form style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tên hiển thị *" error={errors.name?.message}>
            <Input {...register("name")} />
          </Field>
          <Field label="Tên công ty">
            <Input {...register("company_name")} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Người liên hệ">
            <Input {...register("contact_name")} />
          </Field>
          <Field label="Phone">
            <Input {...register("phone")} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Email" error={errors.email?.message}>
            <Input {...register("email")} type="email" />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <Input {...register("website")} placeholder="https://..." />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Loại">
            <Select {...register("type")}>
              <option value="AFFILIATE">AFFILIATE</option>
              <option value="OWNED">OWNED</option>
              <option value="PRODUCTION">PRODUCTION</option>
            </Select>
          </Field>
          <Field label="Tier">
            <Select {...register("tier")}>
              <option value="Standard">Standard</option>
              <option value="Premium">Premium</option>
              <option value="Basic">Basic</option>
            </Select>
          </Field>
          <Field label="Trạng thái">
            <Select {...register("status")}>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Terminated">Terminated</option>
            </Select>
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Rev share (%)" error={errors.rev_share?.message}>
            <Input {...register("rev_share")} type="number" min={0} max={100} step={0.5} />
          </Field>
          <Field label="Phòng ban">
            <Input {...register("dept")} />
          </Field>
        </div>
        <Field label="Ghi chú">
          <Input {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

// ── Pending Users Panel ───────────────────────────────────────
function PendingUsersPanel() {
  const { data: pending = [] } = usePendingPartnerUsers();
  const approveMut = useApprovePartnerUser();
  const rejectMut  = useRejectPartnerUser();
  const toast = useToast();
  if (!pending.length) return null;

  return (
    <Card padding={0} style={{ marginBottom: 20, overflow: "hidden", border: `1px solid ${C.amber}40` }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <Clock size={14} color={C.amber} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>
          {pending.length} đăng ký đối tác chờ duyệt
        </span>
      </div>
      {pending.map((u) => (
        <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${C.border}` }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{u.full_name}</div>
            <div style={{ fontSize: 11, color: C.textMuted }}>{u.email}</div>
            {(u as { partner_name?: string }).partner_name && (
              <div style={{ fontSize: 11, color: C.blue }}>→ {(u as { partner_name?: string }).partner_name}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button size="sm" variant="primary" icon={<CheckCircle size={13} />} loading={approveMut.isPending}
              onClick={async () => { try { await approveMut.mutateAsync({ userId: u.id }); toast.success("Đã duyệt", u.full_name); } catch(e) { toast.error("Lỗi", e instanceof Error ? e.message : ""); } }}>
              Duyệt
            </Button>
            <Button size="sm" variant="secondary" icon={<XCircle size={13} />} loading={rejectMut.isPending}
              onClick={async () => { try { await rejectMut.mutateAsync(u.id); toast.success("Đã từ chối", u.full_name); } catch(e) { toast.error("Lỗi", e instanceof Error ? e.message : ""); } }}>
              Từ chối
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────
const STATUS_OPTS = ["", "Active", "Suspended", "Terminated"];
const TYPE_OPTS   = ["", "OWNED", "PRODUCTION", "AFFILIATE"];

export default function PartnerWorkflowPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [transferringPartner, setTransferringPartner] = useState<Partner | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("Active");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState>({ draggingId: null, overId: null });
  const dragRef = useRef<DragState>({ draggingId: null, overId: null });

  const setParentMut = useSetPartnerParent();

  // Load ALL partners (no pagination) for tree building — limit 200
  const { data, isLoading } = usePartnerList({
    search:  search || undefined,
    type:    typeFilter  || undefined,
    status:  statusFilter || undefined,
    limit: 200,
  });

  const allPartners = data?.items ?? [];
  const tree = buildTree(allPartners);

  // Counts
  const total  = data?.total ?? 0;
  const activeCount  = allPartners.filter(p => p.status === "Active").length;
  const ownedCount   = allPartners.filter(p => p.type === "OWNED").length;
  const prodCount    = allPartners.filter(p => p.type === "PRODUCTION").length;
  const affiliateCount = allPartners.filter(p => p.type === "AFFILIATE").length;
  const childrenCount  = allPartners.filter(p => p.parent_id).length;

  // DnD handlers
  const handleDragStart = (id: string) => {
    dragRef.current = { draggingId: id, overId: null };
    setDragState({ draggingId: id, overId: null });
  };
  const handleDragOver = (id: string) => {
    dragRef.current.overId = id;
    setDragState((s) => ({ ...s, overId: id }));
  };
  const handleDragEnd = () => {
    dragRef.current = { draggingId: null, overId: null };
    setDragState({ draggingId: null, overId: null });
  };
  const handleDrop = async (targetId: string) => {
    const draggingId = dragRef.current.draggingId;
    handleDragEnd();
    if (!draggingId || draggingId === targetId) return;

    // Find the target — must be a root (no parent) to accept children
    const target = allPartners.find(p => p.id === targetId);
    if (!target || target.parent_id) {
      toast.error("Không thể thêm con", "Chỉ hỗ trợ 2 cấp — không thể thêm vào một đối tác đã là con");
      return;
    }
    try {
      await setParentMut.mutateAsync({ id: draggingId, parent_id: targetId });
      setExpanded(prev => new Set(prev).add(targetId));
      toast.success("Đã phân cấp", `${allPartners.find(p => p.id === draggingId)?.name} → ${target.name}`);
    } catch (err) {
      toast.error("Lỗi phân cấp", err instanceof Error ? err.message : "");
    }
  };
  const toggleExpand = (id: string) =>
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  return (
    <div style={{ padding: 24 }}>
      <PendingUsersPanel />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 2 }}>Đối tác</h1>
          <div style={{ fontSize: 13, color: C.textMuted }}>{total} đối tác</div>
        </div>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>
          Thêm đối tác
        </Button>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Tổng đối tác",   value: total,          color: C.blue,    icon: <Users size={14} /> },
          { label: "Đang hoạt động", value: activeCount,    color: C.green,   icon: <CheckCircle size={14} /> },
          { label: "OWNED",          value: ownedCount,     color: C.amber },
          { label: "PRODUCTION",     value: prodCount,      color: C.cyan },
          { label: "AFFILIATE",      value: affiliateCount, color: C.blue },
          { label: "Đã phân cấp",    value: childrenCount,  color: C.purple,  icon: <Link2 size={14} /> },
        ].map(({ label, value, color, icon }) => (
          <Card key={label} padding="14px 16px">
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
              {icon && <span style={{ color }}>{icon}</span>}
              <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 200px", minWidth: 180 }}>
          <Search size={14} color={C.textMuted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên đối tác..."
            style={{ width: "100%", paddingLeft: 32, paddingRight: 12, height: 34, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ height: 34, padding: "0 10px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, cursor: "pointer" }}>
          {TYPE_OPTS.map((v) => <option key={v} value={v}>{v || "Tất cả loại"}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ height: 34, padding: "0 10px", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 12, cursor: "pointer" }}>
          {STATUS_OPTS.map((v) => <option key={v} value={v}>{v || "Tất cả trạng thái"}</option>)}
        </select>
      </div>

      {/* Drag hint */}
      <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <GripVertical size={11} />
        Kéo đối tác thả vào cha để phân cấp
      </div>

      {/* Tree List */}
      <Card padding={0} style={{ overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", background: C.bgHover, borderBottom: `1px solid ${C.border}`, gap: 10 }}>
          <div style={{ width: 13 }} />
          <div style={{ width: 16 }} />
          <div style={{ width: 30 }} />
          <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: C.textMuted }}>TÊN ĐỐI TÁC</div>
          <div style={{ minWidth: 160, fontSize: 11, fontWeight: 600, color: C.textMuted }}>LIÊN HỆ</div>
          <div style={{ minWidth: 48, fontSize: 11, fontWeight: 600, color: C.textMuted }}>SHARE</div>
          <div style={{ minWidth: 64, fontSize: 11, fontWeight: 600, color: C.textMuted, textAlign: "center" }}>KÊNH</div>
          <div style={{ minWidth: 100, fontSize: 11, fontWeight: 600, color: C.textMuted, textAlign: "right" }}>DOANH THU</div>
          <div style={{ minWidth: 80, fontSize: 11, fontWeight: 600, color: C.textMuted, textAlign: "right" }}>NGÀY TẠO</div>
          <div style={{ width: 16 }} />
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
        ) : tree.length === 0 ? (
          <EmptyState icon={<Users size={32} />} title="Không tìm thấy đối tác"
            description={search ? "Thử từ khóa khác" : "Chưa có đối tác nào"}
            action={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Thêm đối tác</Button>}
          />
        ) : (
          tree.map((root) => (
            <div key={root.id}>
              {/* Root row */}
              <PartnerRow
                partner={root}
                isChild={false}
                hasChildren={root.children.length > 0}
                expanded={expanded.has(root.id)}
                onToggle={() => toggleExpand(root.id)}
                dragState={dragState}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                onClick={() => navigate(`/partners/${root.id}`)}
                onEdit={setEditingPartner}
              />

              {/* Children — shown when expanded */}
              {expanded.has(root.id) && root.children.map((child) => (
                <div key={child.id} style={{ borderLeft: `3px solid ${TYPE_COLOR[root.type]}30`, marginLeft: 28 }}>
                  <PartnerRow
                    partner={child}
                    isChild={true}
                    hasChildren={false}
                    dragState={dragState}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                    onClick={() => navigate(`/partners/${child.id}`)}
                    onEdit={setEditingPartner}
                  />
                </div>
              ))}
            </div>
          ))
        )}
      </Card>

      {/* Modals */}
      <CreatePartnerModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editingPartner && (
        <EditPartnerModal partner={editingPartner} onClose={() => setEditingPartner(null)} />
      )}
    </div>
  );
}
