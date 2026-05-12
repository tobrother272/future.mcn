import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft, Building2, Youtube, FileText, Users as UsersIcon,
  Percent, Globe, Mail, Phone, User, Plus, ChevronRight, ArrowRightLeft,
  Upload, Trash2, Download, Calendar, Pencil, Eye, FileDown,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { C } from "@/styles/theme";
import { Button, Card, Pill, StatusDot, EmptyState, Modal, Field, Input, Select } from "@/components/ui";
import { usePartnerProfile, usePartnerList } from "@/api/partners.api";
import { usePartnerContracts, useUploadContract, useUpdateContract, useDeleteContract } from "@/api/contracts.api";
import type { PartnerContract } from "@/api/contracts.api";
import { FileViewerModal } from "@/components/ui";
import { useEmployeeList } from "@/api/employees.api";
import { useCreateChannel, useUpdateChannel, useChannelList } from "@/api/channels.api";
import { useCmsList } from "@/api/cms.api";
import { useToast } from "@/stores/notificationStore";
import { fmt, fmtCurrency, fmtDate } from "@/lib/format";
import type { Partner, PartnerType, PartnerTier } from "@/types/partner";
import type { Channel } from "@/types/channel";
import { RevenueSharePdfModal } from "../components/RevenueSharePdfModal";

const TYPE_COLOR: Record<PartnerType, string> = { OWNED: C.amber, PRODUCTION: C.cyan, AFFILIATE: C.blue };
const TIER_COLOR: Record<PartnerTier, string> = { Premium: C.purple, Standard: C.green, Basic: C.textMuted };

// ── Add Channel Modal ─────────────────────────────────────────
const addChannelSchema = z.object({
  yt_id:  z.string().min(1, "Channel ID bắt buộc"),
  cms_id: z.string().min(1, "Chọn network (CMS)"),
});
type AddChannelForm = z.infer<typeof addChannelSchema>;

function AddChannelModal({ open, onClose, partnerId }: { open: boolean; onClose: () => void; partnerId: string }) {
  const toast = useToast();
  const createCh = useCreateChannel();
  const { data: cmsList } = useCmsList({ limit: 100 });
  const { register, handleSubmit, reset, formState: { errors } } = useForm<AddChannelForm>({
    resolver: zodResolver(addChannelSchema),
  });

  const onSubmit = async (data: AddChannelForm) => {
    try {
      await createCh.mutateAsync({
        yt_id: data.yt_id.trim(), name: data.yt_id.trim(),
        cms_id: data.cms_id, partner_id: partnerId,
        status: "Active", monetization: "Off",
      });
      toast.success("Thêm channel thành công",
        `${data.yt_id} → ${cmsList?.items.find(c => c.id === data.cms_id)?.name ?? data.cms_id}`);
      reset(); onClose();
    } catch (err) { toast.error("Lỗi thêm channel", err instanceof Error ? err.message : ""); }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Thêm Channel vào đối tác" width={420}
      footer={<>
        <Button variant="ghost" size="sm" onClick={() => { reset(); onClose(); }}>Hủy</Button>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} loading={createCh.isPending}
          onClick={() => void handleSubmit(onSubmit)()}>Thêm channel</Button>
      </>}
    >
      <form style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field label="YouTube Channel ID *" error={errors.yt_id?.message} hint="Ví dụ: UCxxxxxxxxxxxxxxxxxxxxxx">
          <Input {...register("yt_id")} placeholder="UCxxxxxxxxxxxxxxxxxxxxxx" style={{ fontFamily: "monospace" }} />
        </Field>
        <Field label="Network (CMS) *" error={errors.cms_id?.message}>
          <Select {...register("cms_id")}>
            <option value="">— Chọn network —</option>
            {(cmsList?.items ?? []).map((cms) => (
              <option key={cms.id} value={cms.id}>{cms.name}</option>
            ))}
          </Select>
        </Field>
        <div style={{ background: `${C.blue}10`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.textSub }}>
          Channel sẽ được gắn với đối tác này <strong style={{ color: C.text }}>và</strong> thêm vào network đã chọn.
        </div>
      </form>
    </Modal>
  );
}

// ── Transfer Channel Modal ────────────────────────────────────
function TransferChannelModal({
  open, onClose, channel, currentPartnerId,
}: {
  open: boolean;
  onClose: () => void;
  channel: ChannelItem | null;
  currentPartnerId: string;
}) {
  const toast = useToast();
  const [targetPartnerId, setTargetPartnerId] = useState("");
  const updateCh = useUpdateChannel(channel?.id ?? "");
  const { data: partnerData } = usePartnerList({ limit: 200, status: "Active" });

  // Chỉ hiện các đối tác con (có parent_id), loại bỏ đối tác hiện tại
  const partners = (partnerData?.items ?? []).filter(
    (p) => p.id !== currentPartnerId && p.parent_id !== null && p.parent_id !== undefined
  );

  const handleTransfer = async () => {
    if (!targetPartnerId || !channel) return;
    try {
      await updateCh.mutateAsync({ partner_id: targetPartnerId });
      const targetName = partners.find((p) => p.id === targetPartnerId)?.name ?? targetPartnerId;
      toast.success("Chuyển channel thành công", `${channel.name} → ${targetName}`);
      setTargetPartnerId("");
      onClose();
    } catch (err) {
      toast.error("Lỗi chuyển channel", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => { setTargetPartnerId(""); onClose(); }}
      title="Chuyển Channel sang đối tác khác"
      width={420}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => { setTargetPartnerId(""); onClose(); }}>Hủy</Button>
          <Button variant="primary" size="sm" icon={<ArrowRightLeft size={14} />}
            disabled={!targetPartnerId} loading={updateCh.isPending}
            onClick={() => void handleTransfer()}>
            Chuyển channel
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Channel info */}
        {channel && (
          <div style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Channel đang chuyển</div>
            <div style={{ fontWeight: 600, color: C.text }}>{channel.name}</div>
          </div>
        )}

        {/* Target partner */}
        <Field label="Chuyển đến đối tác *">
          <Select value={targetPartnerId} onChange={(e) => setTargetPartnerId(e.target.value)}>
            <option value="">— Chọn đối tác —</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}{p.parent_name ? ` — ${p.parent_name}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <div style={{ background: `${C.amber}10`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: C.textSub }}>
          Chỉ có thể chuyển giữa các <strong style={{ color: C.text }}>đối tác con</strong>. Đối tác cha không nhận channel trực tiếp.
        </div>
      </div>
    </Modal>
  );
}

// ── Interfaces ────────────────────────────────────────────────
interface ChannelItem { id: string; name: string; status: string; monetization: string; monthly_revenue: number; subscribers: number; }
interface ContractItem { id: string; contract_name: string; type: string; status: string; start_date: string; end_date: string | null; rev_share: number; }
interface UserItem { id: string; email: string; full_name: string; status: string; last_login: string | null; }

type ParentTab = "sub-partners" | "contracts";
type ChildTab  = "channels" | "contracts";

// ── Main Page ─────────────────────────────────────────────────
export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [addChannelOpen, setAddChannelOpen] = useState(false);
  const [transferChannel, setTransferChannel] = useState<ChannelItem | null>(null);
  const [parentTab, setParentTab] = useState<ParentTab>("sub-partners");
  const [childTab,  setChildTab]  = useState<ChildTab>("channels");
  const [appendixChild, setAppendixChild] = useState<Partner | null>(null);

  const { data: partner, isLoading } = usePartnerProfile(id!);
  const { data: partnerContracts = [] } = usePartnerContracts(id!);
  const { data: appendixChannelData, isPending: appendixChannelsPending } = useChannelList(
    appendixChild ? { partner_id: appendixChild.id, limit: 500 } : undefined,
  );

  if (isLoading) return <div style={{ padding: 24, color: C.textSub }}>Đang tải...</div>;
  if (!partner)  return <div style={{ padding: 24, color: C.red }}>Đối tác không tồn tại</div>;

  const channels  = (partner.channels  ?? []) as ChannelItem[];
  const users     = (partner.users     ?? []) as UserItem[];
  const children  = (partner.children  ?? []) as Partner[];
  const contractCount = partnerContracts.length;

  // Phân biệt cha (có children hoặc KHÔNG có parent_id + children > 0)
  // vs con (có parent_id)
  const isParent = !partner.parent_id;   // đối tác gốc (không có cha)
  const hasChildren = children.length > 0;

  // ── Header info ──
  const headerContact = (
    <div style={{ textAlign: "right", fontSize: 12, display: "flex", flexDirection: "column", gap: 3 }}>
      {partner.company_name && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, color: C.text, fontWeight: 500 }}>
          <Building2 size={12} color={C.textMuted} />{partner.company_name}
        </div>
      )}
      {partner.contact_name && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, color: C.textSub }}>
          <User size={12} color={C.textMuted} />{partner.contact_name}
        </div>
      )}
      {partner.email && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, color: C.textSub }}>
          <Mail size={12} color={C.textMuted} />{partner.email}
        </div>
      )}
      {partner.phone && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, color: C.textMuted }}>
          <Phone size={12} color={C.textMuted} />{partner.phone}
        </div>
      )}
      {partner.website && (
        <a href={partner.website} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, color: C.blue, fontSize: 11 }}>
          <Globe size={11} />{partner.website.replace(/^https?:\/\//, "")}
        </a>
      )}
      <div style={{ marginTop: 2, color: C.textMuted }}>Tạo {fmtDate(partner.created_at)}</div>
    </div>
  );

  return (
    <div style={{ padding: 24 }}>
      <AddChannelModal open={addChannelOpen} onClose={() => setAddChannelOpen(false)} partnerId={id!} />
      <TransferChannelModal
        open={transferChannel !== null}
        onClose={() => setTransferChannel(null)}
        channel={transferChannel}
        currentPartnerId={id!}
      />

      {appendixChild && appendixChannelsPending && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 998,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: C.text, fontSize: 14,
          }}
        >
          Đang tải danh sách kênh…
        </div>
      )}
      {appendixChild && !appendixChannelsPending && partner && (
        <RevenueSharePdfModal
          contextTitle={`${appendixChild.name} · đối tác con — ${partner.name}`}
          channels={(appendixChannelData?.items ?? []) as Channel[]}
          onClose={() => setAppendixChild(null)}
          autoSelectAllChannels
          defaultLicensee={appendixChild.company_name || appendixChild.name}
          defaultLicensor={partner.name}
          defaultLicensorPct={Math.max(0, Math.min(100, 100 - Math.round(Number(appendixChild.rev_share ?? 30))))}
        />
      )}

      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />}
        onClick={() => navigate("/partners")} style={{ marginBottom: 16 }}>
        Danh sách đối tác
      </Button>

      {/* Parent breadcrumb for child partners */}
      {partner.parent_id && (partner as Partner & { parent_name?: string }).parent_name && (
        <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.textMuted }}>
          <span
            style={{ color: C.blue, cursor: "pointer" }}
            onClick={() => navigate(`/partners/${partner.parent_id}`)}
          >
            {(partner as Partner & { parent_name?: string }).parent_name}
          </span>
          <ChevronRight size={12} />
          <span style={{ color: C.text }}>{partner.name}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: `${TYPE_COLOR[partner.type]}20`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Building2 size={22} color={TYPE_COLOR[partner.type]} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{partner.name}</h1>
              <Pill color={partner.status === "Active" ? "green" : partner.status === "Suspended" ? "yellow" : "red"}>
                {partner.status}
              </Pill>
              {/* Badge phân cấp */}
              {isParent && hasChildren && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${C.purple}20`, color: C.purple }}>
                  ĐỐI TÁC CHA
                </span>
              )}
              {!isParent && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${C.cyan}20`, color: C.cyan }}>
                  ĐỐI TÁC CON
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: `${TYPE_COLOR[partner.type]}20`, color: TYPE_COLOR[partner.type] }}>
                {partner.type}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: `${TIER_COLOR[partner.tier]}20`, color: TIER_COLOR[partner.tier] }}>
                {partner.tier}
              </span>
              {partner.dept && (
                <span style={{ fontSize: 11, color: C.textMuted, background: C.bgHover, padding: "2px 8px", borderRadius: 4 }}>
                  {partner.dept}
                </span>
              )}
            </div>
          </div>
        </div>
        {headerContact}
      </div>

      {/* KPI */}
      {(() => {
        const kpis = isParent ? [
          { label: "Đối tác con",     value: fmt(children.length),               color: C.purple, icon: <UsersIcon size={14} /> },
          { label: "Revenue tháng",   value: fmtCurrency(partner.total_revenue), color: C.amber,  icon: undefined },
          { label: "Rev share",       value: `${Number(partner.rev_share).toFixed(0)}%`, color: C.cyan, icon: <Percent size={14} /> },
          { label: "Contracts",       value: fmt(contractCount),              color: C.blue,   icon: <FileText size={14} /> },
        ] : [
          { label: "Tổng channels",   value: fmt(channels.length),               color: C.blue,   icon: <Youtube size={14} /> },
          { label: "Active channels", value: fmt(channels.filter(c => c.status === "Active").length), color: C.green, icon: undefined },
          { label: "Revenue tháng",   value: fmtCurrency(partner.total_revenue), color: C.amber,  icon: undefined },
          { label: "Rev share",       value: `${Number(partner.rev_share).toFixed(0)}%`, color: C.cyan, icon: <Percent size={14} /> },
          { label: "Contracts",       value: fmt(contractCount),              color: C.purple, icon: <FileText size={14} /> },
        ];
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {kpis.map(({ label, value, color, icon }) => (
              <Card key={label} padding="14px 16px">
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                  {icon && <span style={{ color }}>{icon}</span>}
                  <span style={{ fontSize: 11, color: C.textMuted }}>{label}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
              </Card>
            ))}
          </div>
        );
      })()}

      {/* ══════════ PARENT VIEW ══════════ */}
      {isParent && (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            {([
              { key: "sub-partners", label: "Đối tác con", count: children.length },
              { key: "contracts",    label: "Contracts",   count: contractCount },
            ] as { key: ParentTab; label: string; count: number }[]).map((t) => (
              <button key={t.key} onClick={() => setParentTab(t.key)} style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
                color: parentTab === t.key ? C.blue : C.textSub,
                borderBottom: parentTab === t.key ? `2px solid ${C.blue}` : "2px solid transparent",
              }}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Sub-partners tab */}
          {parentTab === "sub-partners" && (
            children.length === 0 ? (
              <EmptyState icon={<UsersIcon size={32} />} title="Chưa có đối tác con"
                description="Kéo thả đối tác vào đây từ danh sách để phân cấp" />
            ) : (
              <Card padding={0} style={{ overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                      {["Tên đối tác","Loại","Trạng thái","Liên hệ","Rev share","Phụ lục"].map((h) => (
                        <th key={h} style={{ padding: "9px 16px", textAlign: h === "Phụ lục" ? "right" : "left", fontSize: 11, fontWeight: 600, color: C.textMuted }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {children.map((child) => (
                      <tr key={child.id}
                        style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        onClick={() => navigate(`/partners/${child.id}`)}
                      >
                        <td style={{ padding: "10px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: `${TYPE_COLOR[child.type]}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Building2 size={12} color={TYPE_COLOR[child.type]} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: C.text }}>{child.name}</div>
                              {child.company_name && <div style={{ fontSize: 11, color: C.textMuted }}>{child.company_name}</div>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: `${TYPE_COLOR[child.type]}20`, color: TYPE_COLOR[child.type] }}>
                            {child.type}
                          </span>
                        </td>
                        <td style={{ padding: "10px 16px" }}>
                          <Pill color={child.status === "Active" ? "green" : child.status === "Suspended" ? "yellow" : "red"}>
                            {child.status}
                          </Pill>
                        </td>
                        <td style={{ padding: "10px 16px", fontSize: 12, color: C.textSub }}>
                          {child.contact_name && <div>{child.contact_name}</div>}
                          {child.email && <div>{child.email}</div>}
                        </td>
                        <td style={{ padding: "10px 16px", color: C.cyan, fontWeight: 600 }}>
                          {Number(child.rev_share).toFixed(0)}%
                        </td>
                        <td style={{ padding: "10px 16px", textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<FileDown size={13} />}
                            title="Tạo Phụ lục 01 (PDF) theo kênh của đối tác con"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppendixChild(child);
                            }}
                            style={{ color: C.amber }}
                          >
                            Phụ lục 01
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          )}

          {/* Contracts tab */}
          {parentTab === "contracts" && <ContractsTable partnerId={partner.id} />}

        </>
      )}

      {/* ══════════ CHILD VIEW ══════════ */}
      {!isParent && (
        <>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
            {([
              { key: "channels",  label: "Channels",  count: channels.length },
              { key: "contracts", label: "Contracts", count: contractCount },
            ] as { key: ChildTab; label: string; count: number }[]).map((t) => (
              <button key={t.key} onClick={() => setChildTab(t.key)} style={{
                padding: "8px 20px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
                color: childTab === t.key ? C.blue : C.textSub,
                borderBottom: childTab === t.key ? `2px solid ${C.blue}` : "2px solid transparent",
              }}>
                {t.label} ({t.count})
              </button>
            ))}
          </div>

          {/* Channels tab */}
          {childTab === "channels" && (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddChannelOpen(true)}>
                  Add Channel
                </Button>
              </div>
              {channels.length === 0 ? (
                <EmptyState icon={<Youtube size={32} />} title="Chưa có channel"
                  description="Nhấn Add Channel để thêm kênh vào đối tác này"
                  action={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setAddChannelOpen(true)}>Add Channel</Button>} />
              ) : (
                <Card padding={0} style={{ overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                        {["Tên kênh","Trạng thái","Monetization","Subscribers","Revenue",""].map((h) => (
                          <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {channels.map((c) => (
                        <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "10px 16px", fontWeight: 500, color: C.text, cursor: "pointer" }}
                            onClick={() => navigate(`/channels/${c.id}`)}>
                            {c.name}
                          </td>
                          <td style={{ padding: "10px 16px" }}><StatusDot status={c.status} /></td>
                          <td style={{ padding: "10px 16px" }}><StatusDot status={c.monetization} /></td>
                          <td style={{ padding: "10px 16px", color: C.textSub }}>{fmt(c.subscribers)}</td>
                          <td style={{ padding: "10px 16px", color: C.amber, fontWeight: 600 }}>{fmtCurrency(c.monthly_revenue)}</td>
                          <td style={{ padding: "10px 8px", textAlign: "right" }}>
                            <Button
                              size="sm" variant="ghost"
                              icon={<ArrowRightLeft size={13} />}
                              onClick={(e) => { e.stopPropagation(); setTransferChannel(c); }}
                              title="Chuyển sang đối tác khác"
                            >
                              Chuyển
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </>
          )}

          {childTab === "contracts" && <ContractsTable partnerId={partner.id} />}
        </>
      )}

      {/* Notes */}
      {partner.notes && (
        <Card padding="16px" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Ghi chú</div>
          <div style={{ fontSize: 13, color: C.textSub }}>{partner.notes}</div>
        </Card>
      )}
    </div>
  );
}

// ── Edit Contract Modal ───────────────────────────────────────
function EditContractModal({
  contract,
  partnerId,
  employees,
  onClose,
}: {
  contract: PartnerContract;
  partnerId: string;
  employees: { id: string; name: string; position: string | null }[];
  onClose: () => void;
}) {
  const toast = useToast();
  const updateMut = useUpdateContract(partnerId, contract.id);
  const [contractNumber, setContractNumber] = useState(contract.contract_number ?? "");
  const [title, setTitle]                   = useState(contract.title);
  const [uploadDate, setUploadDate]         = useState(contract.upload_date?.slice(0, 10) ?? "");
  const [employeeId, setEmployeeId]         = useState(contract.employee_id ?? "");

  const inputStyle = {
    width: "100%", height: 34, padding: "0 10px", borderRadius: 8,
    boxSizing: "border-box" as const,
    border: `1px solid ${C.border}`, background: C.bgCard,
    color: C.text, fontSize: 13, outline: "none",
  };

  const handleSave = async () => {
    try {
      await updateMut.mutateAsync({
        contract_number: contractNumber || null,
        title:           title || undefined,
        upload_date:     uploadDate || undefined,
        employee_id:     employeeId || null,
      });
      toast.success("Đã cập nhật hợp đồng", title);
      onClose();
    } catch (err) {
      toast.error("Lỗi", err instanceof Error ? err.message : "");
    }
  };

  return (
    <Modal open onClose={onClose} title="Sửa thông tin hợp đồng" width={480}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Hủy</Button>
          <Button variant="primary" size="sm" loading={updateMut.isPending}
            onClick={() => void handleSave()}>Lưu thay đổi</Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* File info (read-only) */}
        <div style={{ padding: "8px 12px", borderRadius: 8, background: C.bgHover, fontSize: 12, color: C.textMuted }}>
          <FileText size={12} style={{ display: "inline", marginRight: 6 }} />
          {contract.file_name}
        </div>

        <div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>MÃ SỐ HỢP ĐỒNG</div>
          <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)}
            placeholder="VD: HĐ-2026-001" style={inputStyle} />
        </div>

        <div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>TIÊU ĐỀ</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>NGÀY UPLOAD</div>
            <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>NHÂN VIÊN PHỤ TRÁCH</div>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— Chưa chọn —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}{e.position ? ` (${e.position})` : ""}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ── Contracts Tab ─────────────────────────────────────────────
interface PendingFile { file: File; title: string }

function ContractsTable({ partnerId }: { partnerId: string }) {
  const toast = useToast();
  const { data: contracts = [], isLoading } = usePartnerContracts(partnerId);
  const uploadMut = useUploadContract(partnerId);
  const deleteMut = useDeleteContract(partnerId);

  const [editingContract, setEditingContract] = useState<PartnerContract | null>(null);
  const [viewingContract, setViewingContract] = useState<PartnerContract | null>(null);
  const [showForm, setShowForm]         = useState(false);
  const [isDragOver, setIsDragOver]     = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [uploadDate, setUploadDate]     = useState(new Date().toISOString().slice(0, 10));
  const [employeeId, setEmployeeId]     = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: empData } = useEmployeeList({ status: "Active", limit: 200 });
  const employees = empData?.items ?? [];

  const addFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    setPendingFiles((prev) => [
      ...prev,
      ...arr.map((f) => ({ file: f, title: f.name.replace(/\.[^.]+$/, "") })),
    ]);
  };

  const removeFile = (idx: number) =>
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));

  const updateTitle = (idx: number, value: string) =>
    setPendingFiles((prev) => prev.map((p, i) => i === idx ? { ...p, title: value } : p));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleUploadAll = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    let ok = 0; let fail = 0;
    for (const pf of pendingFiles) {
      try {
        const fd = new FormData();
        fd.append("file", pf.file);
        fd.append("title", pf.title || pf.file.name);
        fd.append("upload_date", uploadDate);
        if (employeeId)     fd.append("employee_id",     employeeId);
        if (contractNumber) fd.append("contract_number", contractNumber);
        await uploadMut.mutateAsync(fd);
        ok++;
      } catch { fail++; }
    }
    setUploading(false);
    if (ok) toast.success(`Upload ${ok} file thành công`, fail ? `${fail} file lỗi` : "");
    if (fail && !ok) toast.error("Upload thất bại", `${fail} file lỗi`);
    setPendingFiles([]); setShowForm(false); setEmployeeId(""); setContractNumber("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa hợp đồng "${name}"?`)) return;
    try {
      await deleteMut.mutateAsync(id);
      toast.success("Đã xóa", name);
    } catch (err) { toast.error("Lỗi xóa", err instanceof Error ? err.message : ""); }
  };

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const downloadUrl = (c: { id: string }) =>
    `/api/contracts/${partnerId}/${c.id}/download`;

  const EXT_COLOR: Record<string, string> = { pdf: C.red, doc: C.blue, docx: C.blue, xls: C.green, xlsx: C.green };
  const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button variant="primary" size="sm" icon={<Upload size={13} />}
          onClick={() => setShowForm((v) => !v)}>
          Upload hợp đồng
        </Button>
      </div>

      {/* Upload form */}
      {showForm && (
        <Card padding="16px" style={{ marginBottom: 14, border: `1px dashed ${C.blue}` }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Contract number */}
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>MÃ SỐ HỢP ĐỒNG</div>
              <input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)}
                placeholder="VD: HĐ-2026-001"
                style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 8, boxSizing: "border-box",
                  border: `1px solid ${contractNumber ? C.blue : C.border}`, background: C.bgCard,
                  color: C.text, fontSize: 13, outline: "none" }} />
            </div>

            {/* Date + Employee */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>NGÀY UPLOAD</div>
                <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)}
                  style={{ width: "100%", height: 32, padding: "0 10px", borderRadius: 8, boxSizing: "border-box",
                    border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, outline: "none" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>NHÂN VIÊN PHỤ TRÁCH</div>
                <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                  style={{ width: "100%", height: 32, padding: "0 8px", borderRadius: 8, boxSizing: "border-box",
                    border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, fontSize: 13, outline: "none", cursor: "pointer" }}>
                  <option value="">— Chưa chọn —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}{e.position ? ` (${e.position})` : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragOver ? C.blue : C.border}`,
                borderRadius: 12, padding: "28px 16px", textAlign: "center", cursor: "pointer",
                background: isDragOver ? `${C.blue}08` : C.bgHover,
                transition: "all 0.15s",
                transform: isDragOver ? "scale(1.01)" : "scale(1)",
              }}
            >
              <Upload size={24} color={isDragOver ? C.blue : C.textMuted} style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: isDragOver ? C.blue : C.textSub }}>
                {isDragOver ? "Thả file vào đây" : "Kéo thả file hoặc click để chọn"}
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                Hỗ trợ nhiều file cùng lúc · PDF, DOC, XLS, ảnh · Tối đa 50MB/file
              </div>
              <input ref={fileInputRef} type="file" multiple style={{ display: "none" }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); }} />
            </div>

            {/* File list */}
            {pendingFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>
                  {pendingFiles.length} FILE ĐÃ CHỌN
                </div>
                {pendingFiles.map((pf, idx) => (
                  <div key={idx} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "8px 10px", borderRadius: 8,
                    background: C.bgCard, border: `1px solid ${C.border}`,
                  }}>
                    {/* Ext badge */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                      background: `${EXT_COLOR[extOf(pf.file.name)] ?? C.purple}18`,
                      color: EXT_COLOR[extOf(pf.file.name)] ?? C.purple,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    }}>
                      {extOf(pf.file.name) || "?"}
                    </div>
                    {/* Title input */}
                    <input
                      value={pf.title}
                      onChange={(e) => updateTitle(idx, e.target.value)}
                      placeholder="Tiêu đề..."
                      style={{ flex: 1, height: 30, padding: "0 8px", borderRadius: 6,
                        border: `1px solid ${C.border}`, background: C.bgHover,
                        color: C.text, fontSize: 12, outline: "none" }}
                    />
                    {/* Size */}
                    <span style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap", minWidth: 52 }}>
                      {fmtSize(pf.file.size)}
                    </span>
                    {/* Remove */}
                    <button onClick={() => removeFile(idx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.textMuted, padding: 2 }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = C.red)}
                      onMouseLeave={(e) => (e.currentTarget.style.color = C.textMuted)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setPendingFiles([]); }}>Hủy</Button>
              <Button variant="primary" size="sm" icon={<Upload size={13} />}
                disabled={!pendingFiles.length} loading={uploading}
                onClick={() => void handleUploadAll()}>
                Upload {pendingFiles.length > 0 ? `${pendingFiles.length} file` : ""}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div style={{ padding: 24, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : contracts.length === 0 ? (
        <EmptyState icon={<FileText size={32} />} title="Chưa có hợp đồng"
          description="Bấm 'Upload hợp đồng' để thêm tài liệu" />
      ) : (
        <Card padding={0} style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                {["Mã số", "Tiêu đề", "Nhân viên", "Dung lượng", "Ngày upload", ""].map((h) => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "10px 16px" }}>
                    {c.contract_number ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                        background: `${C.blue}15`, color: C.blue, whiteSpace: "nowrap",
                        fontFamily: "monospace",
                      }}>{c.contract_number}</span>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: `${C.blue}15`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <FileText size={13} color={C.blue} />
                      </div>
                      <span style={{ fontWeight: 500, color: C.text }}>{c.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    {c.employee_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.text }}>
                        <UsersIcon size={11} color={C.blue} />{c.employee_name}
                      </div>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 16px", color: C.textMuted, fontSize: 12 }}>{fmtSize(Number(c.file_size))}</td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: C.textSub, fontSize: 12 }}>
                      <Calendar size={11} />{fmtDate(c.upload_date)}
                    </div>
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => setViewingContract(c)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.green, cursor: "pointer" }}>
                        <Eye size={11} />Xem
                      </button>
                      <a href={downloadUrl(c)} download={c.file_name}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.blue, textDecoration: "none", cursor: "pointer" }}>
                        <Download size={11} />Tải
                      </a>
                      <button onClick={() => setEditingContract(c)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.cyan, cursor: "pointer" }}>
                        <Pencil size={11} />Sửa
                      </button>
                      <button onClick={() => void handleDelete(c.id, c.title)}
                        disabled={deleteMut.isPending}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.red, cursor: "pointer" }}>
                        <Trash2 size={11} />Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* View Contract Modal */}
      {viewingContract && (
        <FileViewerModal
          url={`/api/contracts/${partnerId}/${viewingContract.id}/view`}
          downloadUrl={`/api/contracts/${partnerId}/${viewingContract.id}/download`}
          fileName={viewingContract.file_name}
          title={viewingContract.title}
          onClose={() => setViewingContract(null)}
        />
      )}

      {/* Edit Contract Modal */}
      {editingContract && (
        <EditContractModal
          contract={editingContract}
          partnerId={partnerId}
          employees={employees}
          onClose={() => setEditingContract(null)}
        />
      )}
    </div>
  );
}

function UsersTable({ users }: { users: UserItem[] }) {
  if (!users.length)
    return <EmptyState icon={<UsersIcon size={32} />} title="Chưa có tài khoản" description="Đối tác này chưa có tài khoản nào" />;
  return (
    <Card padding={0} style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
            {["Họ tên","Email","Trạng thái","Đăng nhập lần cuối"].map((h) => (
              <th key={h} style={{ padding: "9px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textMuted }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "10px 16px", fontWeight: 500, color: C.text }}>{u.full_name}</td>
              <td style={{ padding: "10px 16px", color: C.textSub }}>{u.email}</td>
              <td style={{ padding: "10px 16px" }}>
                <Pill color={u.status === "Active" ? "green" : u.status === "PendingApproval" ? "yellow" : "red"}>{u.status}</Pill>
              </td>
              <td style={{ padding: "10px 16px", color: C.textMuted }}>{u.last_login ? fmtDate(u.last_login) : "Chưa đăng nhập"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
