import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Plus, RefreshCw, Server, Pencil, Trash2, History,
  TrendingUp, Tv, Users, DollarSign, ChevronRight,
  KeyRound, Copy, Check, ShieldOff, ShieldCheck, AlertTriangle,
  BarChart2,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { C, RADIUS, SHADOW } from "@/styles/theme";
import { Button, EmptyState, Modal, Field, Input, Select, Card } from "@/components/ui";
import { useCmsList, useCmsStats, useCreateCms, useUpdateCms, useDeleteCms,
  useCmsApiKeys, useCreateCmsApiKey, useRevokeCmsApiKey, useCmsRevenue } from "@/api/cms.api";
import { apiClient } from "@/api/client";
import { useToast } from "@/stores/notificationStore";
import { fmtCurrency, fmt, fmtDate } from "@/lib/format";
import { usePermissions } from "@/hooks/usePermissions";
import { PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey } from "@/lib/periods";
import type { Cms, CmsStats, CmsApiKey } from "@/types/cms";

// ── Schemas ───────────────────────────────────────────────────
const CURRENCIES = ["USD","VND","CAD","EUR","GBP","JPY","SGD","AUD"] as const;

const createSchema = z.object({
  id:       z.string().min(1).max(20).regex(/^[A-Z0-9_]+$/, "Chỉ dùng chữ HOA, số, gạch dưới"),
  name:     z.string().min(1, "Vui lòng nhập tên CMS"),
  currency: z.enum(CURRENCIES),
  notes:    z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  name:     z.string().min(1, "Vui lòng nhập tên CMS"),
  currency: z.enum(CURRENCIES),
  status:   z.enum(["Active","Suspended","Closed"]),
  notes:    z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

// ── Create CMS Modal ──────────────────────────────────────────
function CreateCmsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const createCms = useCreateCms();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { currency: "USD" },
  });
  const onSubmit = handleSubmit(async (data) => {
    try {
      await createCms.mutateAsync(data);
      toast.success("Đã tạo CMS", `${data.name} (${data.id})`);
      reset(); onClose();
    } catch (err) {
      toast.error("Lỗi tạo CMS", err instanceof Error ? err.message : "Thử lại sau");
    }
  });
  return (
    <Modal open={open} onClose={onClose} title="Thêm CMS mới" width={480}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Huỷ</Button>
        <Button variant="primary" size="sm" loading={createCms.isPending} onClick={() => void onSubmit()}>Tạo CMS</Button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="CMS ID" required hint="Viết HOA, không dấu — VD: KUDO_DIY">
          <Input placeholder="KUDO_DIY" {...register("id")} error={errors.id?.message}
            style={{ textTransform: "uppercase" }}
            onChange={(e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""); register("id").onChange(e); }} />
        </Field>
        <Field label="Tên CMS" required>
          <Input placeholder="KUDO DIY Network" {...register("name")} error={errors.name?.message} />
        </Field>
        <Field label="Đơn vị tiền tệ" required>
          <Select {...register("currency")} error={errors.currency?.message}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Ghi chú">
          <Input placeholder="Mô tả ngắn..." {...register("notes")} />
        </Field>
      </form>
    </Modal>
  );
}

// ── Edit CMS Modal ────────────────────────────────────────────
function EditCmsModal({ cms, onClose }: { cms: Cms; onClose: () => void }) {
  const toast = useToast();
  const updateCms = useUpdateCms(cms.id);
  const { register, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: cms.name, currency: cms.currency, status: cms.status, notes: cms.notes ?? "" },
  });
  const onSubmit = handleSubmit(async (data) => {
    try {
      await updateCms.mutateAsync(data);
      toast.success("Đã cập nhật CMS", cms.name); onClose();
    } catch (err) {
      toast.error("Lỗi cập nhật", err instanceof Error ? err.message : "Thử lại sau");
    }
  });
  return (
    <Modal open onClose={onClose} title={`Chỉnh sửa: ${cms.name}`} width={480}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Huỷ</Button>
        <Button variant="primary" size="sm" loading={updateCms.isPending} onClick={() => void onSubmit()}>Lưu thay đổi</Button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Tên CMS" required><Input {...register("name")} error={errors.name?.message} /></Field>
        <Field label="Đơn vị tiền tệ" required>
          <Select {...register("currency")} error={errors.currency?.message}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Trạng thái" required>
          <Select {...register("status")} error={errors.status?.message}>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Closed">Closed</option>
          </Select>
        </Field>
        <Field label="Ghi chú"><Input {...register("notes")} placeholder="Mô tả ngắn..." /></Field>
      </form>
    </Modal>
  );
}

// ── Delete CMS Confirm ────────────────────────────────────────
function DeleteCmsModal({ cms, onClose }: { cms: Cms; onClose: () => void }) {
  const toast = useToast();
  const deleteCms = useDeleteCms();
  const handleDelete = async () => {
    try {
      await deleteCms.mutateAsync(cms.id);
      toast.success("Đã xóa CMS", cms.name); onClose();
    } catch (err) {
      toast.error("Lỗi xóa CMS", err instanceof Error ? err.message : "Thử lại sau");
    }
  };
  return (
    <Modal open onClose={onClose} title="Xác nhận xóa CMS" width={420}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>Huỷ</Button>
        <Button variant="danger" size="sm" loading={deleteCms.isPending} onClick={() => void handleDelete()}>Xóa</Button>
      </>}>
      <div style={{ color: C.text, fontSize: 14, lineHeight: 1.6 }}>
        Bạn có chắc muốn xóa CMS <strong>{cms.name}</strong> ({cms.id})?
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: RADIUS.sm, background: `${C.red}18`, color: C.red, fontSize: 12, border: `1px solid ${C.red}40` }}>
          Hành động này không thể hoàn tác. Toàn bộ dữ liệu liên quan sẽ bị xóa.
        </div>
      </div>
    </Modal>
  );
}

// ── CMS API Keys Modal ────────────────────────────────────────
function CopyableToken({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: RADIUS.sm, background: `${C.amber}14`, border: `1px solid ${C.amber}50`, display: "flex", alignItems: "flex-start", gap: 10 }}>
      <AlertTriangle size={15} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginBottom: 6 }}>
          Copy token ngay — không thể xem lại sau này!
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: C.text, wordBreak: "break-all", background: `${C.bg}`, padding: "6px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>
          {token}
        </div>
        <button
          onClick={copy}
          style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: copied ? C.green : C.amber, background: "transparent", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Đã copy!" : "Copy token"}
        </button>
      </div>
    </div>
  );
}

function KeyRow({ keyItem, cmsId }: { keyItem: CmsApiKey; cmsId: string }) {
  const toast = useToast();
  const revoke = useRevokeCmsApiKey(cmsId);
  const [confirming, setConfirming] = useState(false);

  const isActive = keyItem.status === "Active";
  const statusColor = isActive ? C.green : C.textMuted;

  const handleRevoke = async () => {
    try {
      await revoke.mutateAsync(keyItem.id);
      toast.success("Đã revoke key", keyItem.name);
    } catch (err) {
      toast.error("Lỗi revoke", err instanceof Error ? err.message : "Thử lại");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div style={{ padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, display: "flex", alignItems: "flex-start", gap: 12, opacity: isActive ? 1 : 0.55 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${statusColor}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isActive ? <ShieldCheck size={15} color={statusColor} /> : <ShieldOff size={15} color={statusColor} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{keyItem.name}</span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: `${statusColor}18`, color: statusColor }}>
            {keyItem.status}
          </span>
        </div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: C.textMuted, marginTop: 3 }}>
          {keyItem.key_prefix}••••••••  ·  {keyItem.scopes.join(", ")}
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 3, display: "flex", gap: 10 }}>
          <span>Tạo: {new Date(keyItem.created_at).toLocaleDateString("vi-VN")}</span>
          {keyItem.last_used_at && (
            <span>Dùng lần cuối: {new Date(keyItem.last_used_at).toLocaleString("vi-VN")}</span>
          )}
          {keyItem.revoked_at && (
            <span style={{ color: C.red }}>Revoked: {new Date(keyItem.revoked_at).toLocaleDateString("vi-VN")}</span>
          )}
        </div>
      </div>
      {isActive && (
        <div style={{ flexShrink: 0 }}>
          {confirming ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: C.textSub }}>Chắc chắn?</span>
              <button
                onClick={() => void handleRevoke()}
                disabled={revoke.isPending}
                style={{ padding: "3px 10px", fontSize: 11, borderRadius: RADIUS.sm, border: `1px solid ${C.red}`, background: `${C.red}18`, color: C.red, cursor: "pointer", fontWeight: 600 }}>
                {revoke.isPending ? "..." : "Revoke"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                style={{ padding: "3px 8px", fontSize: 11, borderRadius: RADIUS.sm, border: `1px solid ${C.border}`, background: "transparent", color: C.textMuted, cursor: "pointer" }}>
                Huỷ
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              title="Revoke key này"
              style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex", alignItems: "center" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.red; el.style.color = C.red; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
              <ShieldOff size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CmsApiKeysModal({ cms, onClose }: { cms: Cms; onClose: () => void }) {
  const toast = useToast();
  const { data: keys, isLoading } = useCmsApiKeys(cms.id);
  const createKey = useCreateCmsApiKey(cms.id);
  const [newToken, setNewToken] = useState<string | null>(null);
  const [keyName, setKeyName] = useState("");
  const [showForm, setShowForm] = useState(false);

  const activeKeys = keys?.filter((k) => k.status === "Active") ?? [];
  const revokedKeys = keys?.filter((k) => k.status === "Revoked") ?? [];

  const handleCreate = async () => {
    const name = keyName.trim();
    if (!name) return;
    try {
      const result = await createKey.mutateAsync({ name, scopes: ["channels:sync"] });
      setNewToken(result.token);
      setKeyName("");
      setShowForm(false);
      toast.success("Đã tạo API key", result.name);
    } catch (err) {
      toast.error("Lỗi tạo key", err instanceof Error ? err.message : "Thử lại");
    }
  };

  return (
    <Modal open onClose={onClose} title={`API Keys — ${cms.name}`} width={560}
      footer={<Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Newly created token — shown once */}
        {newToken && <CopyableToken token={newToken} />}

        {/* How-to note */}
        <div style={{ padding: "10px 14px", borderRadius: RADIUS.sm, background: `${C.blue}0f`, border: `1px solid ${C.blue}30`, fontSize: 12, color: C.textSub, lineHeight: 1.6 }}>
          <strong style={{ color: C.blue }}>Hướng dẫn:</strong>{" "}
          Tạo key, copy token, sau đó dùng trong tool sync:
          <code style={{ display: "block", marginTop: 6, fontFamily: "monospace", fontSize: 11, color: C.text, background: C.bg, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}` }}>
            python tools/sync_cms_channels.py --base-url http://HOST --api-key mcn_... --input channels.json
          </code>
        </div>

        {/* Create form */}
        {showForm ? (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Field label="Tên key" hint="VD: yt-scraper-prod, cron-daily">
                <Input
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="yt-scraper-prod"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); if (e.key === "Escape") setShowForm(false); }}
                />
              </Field>
            </div>
            <Button variant="primary" size="sm" loading={createKey.isPending} onClick={() => void handleCreate()}>
              Tạo key
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setKeyName(""); }}>
              Huỷ
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setShowForm(true)}>
            Tạo API key mới
          </Button>
        )}

        {/* Active keys */}
        {isLoading ? (
          <div style={{ textAlign: "center", color: C.textMuted, padding: "20px 0", fontSize: 13 }}>Đang tải...</div>
        ) : activeKeys.length === 0 && revokedKeys.length === 0 ? (
          <div style={{ textAlign: "center", color: C.textMuted, padding: "20px 0", fontSize: 13 }}>
            Chưa có API key nào. Tạo key đầu tiên để bắt đầu sync.
          </div>
        ) : (
          <>
            {activeKeys.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: ".05em", textTransform: "uppercase" }}>
                  Active ({activeKeys.length})
                </div>
                {activeKeys.map((k) => <KeyRow key={k.id} keyItem={k} cmsId={cms.id} />)}
              </div>
            )}
            {revokedKeys.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: ".05em", textTransform: "uppercase" }}>
                  Revoked ({revokedKeys.length})
                </div>
                {revokedKeys.map((k) => <KeyRow key={k.id} keyItem={k} cmsId={cms.id} />)}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ── CMS Analytics Modal ───────────────────────────────────────
function CmsAnalyticsModal({ cms, onClose }: { cms: Cms; onClose: () => void }) {
  const [period, setPeriod] = useState<PeriodKey>("30");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayInputDate());
  const activeParams = fromDate && toDate
    ? { from: fromDate, to: toDate }
    : periodToParams(period);
  const { data: raw = [], isLoading } = useCmsRevenue(cms.id, activeParams);

  const chartData = raw.map((r) => ({
    date: fmtDate(r.snapshot_date),
    revenue: Number(r.revenue),
    views: Number(r.views),
  }));

  const totalRevenue = raw.reduce((s, r) => s + Number(r.revenue), 0);
  const totalViews   = raw.reduce((s, r) => s + Number(r.views), 0);
  const avgChannels  = raw.length
    ? Math.round(raw.reduce((s, r) => s + (r.channels_count ?? 0), 0) / raw.length)
    : 0;

  return (
    <Modal open onClose={onClose} title={`Analytics — ${cms.name}`} fullscreen>
      {/* Period selector + subtitle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          Lịch sử doanh thu tổng hợp từ tất cả kênh trong CMS
        </span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {PERIOD_OPTIONS.map((opt) => (
            <Button key={opt.key} size="sm"
              variant={period === opt.key ? "primary" : "secondary"}
              onClick={() => {
                setPeriod(opt.key);
                setFromDate("");
              }}>
              {opt.label}
            </Button>
          ))}
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
            title="Từ ngày"
          />
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) => setToDate(e.target.value)}
            style={{ height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, padding: "0 8px", fontSize: 12 }}
            title="Đến ngày"
          />
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Tổng doanh thu",  value: fmtCurrency(totalRevenue, cms.currency), color: C.amber },
          { label: "Tổng lượt xem",   value: fmt(totalViews),                         color: C.blue },
          { label: "TB kênh/ngày",    value: String(avgChannels),                      color: C.cyan },
          { label: "Số ngày có data", value: String(raw.length),                       color: C.text },
        ].map((k) => (
          <div key={k.label} style={{ background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
            <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <Card padding="16px" style={{ marginBottom: 16 }}>
        {isLoading ? (
          <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>
            Đang tải...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 320, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8 }}>
            <BarChart2 size={32} color={C.textMuted} />
            <div style={{ fontSize: 14 }}>Chưa có dữ liệu analytics</div>
            <div style={{ fontSize: 12 }}>Import doanh thu từ trang chi tiết CMS</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={chartData} margin={{ top: 4, right: 36, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.textMuted }} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 9, fill: C.textMuted }} tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: C.textMuted }} tickLine={false}
                tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip
                contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) =>
                  name === "Revenue" ? [`${cms.currency} ${value.toFixed(3)}`, name] : [fmt(value), name]
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="left"  type="monotone" dataKey="revenue" stroke={C.amber} strokeWidth={2} dot={false} name="Revenue" />
              <Line yAxisId="right" type="monotone" dataKey="views"   stroke={C.blue}  strokeWidth={2} dot={false} name="Views" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Table */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ position: "sticky", top: 0, background: C.bgHover }}>
            <tr>
              {["Ngày", "Revenue", "Views", "Kênh"].map((h) => (
                <th key={h} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...raw].reverse().map((r) => (
              <tr key={r.snapshot_date} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "6px 14px", color: C.textSub }}>{fmtDate(r.snapshot_date)}</td>
                <td style={{ padding: "6px 14px", color: C.amber, fontWeight: 600 }}>{fmtCurrency(Number(r.revenue), cms.currency)}</td>
                <td style={{ padding: "6px 14px", color: C.text }}>{fmt(Number(r.views))}</td>
                <td style={{ padding: "6px 14px", color: C.textMuted }}>{r.channels_count ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {raw.length === 0 && !isLoading && (
          <div style={{ padding: "20px 14px", textAlign: "center", color: C.textMuted }}>
            Chưa có dữ liệu trong khoảng thời gian này
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── CMS row in table ──────────────────────────────────────────
function CmsRow({ cms, onEdit, onDelete, onHistory, onAnalytics, onOpen, onApiKeys, showEdit, showDelete }: {
  cms: Cms;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onHistory: (e: React.MouseEvent) => void;
  onAnalytics: (e: React.MouseEvent) => void;
  onOpen: () => void;
  onApiKeys: (e: React.MouseEvent) => void;
  showEdit?: boolean;
  showDelete?: boolean;
}) {
  const { data: stats } = useCmsStats(cms.id);

  const statusColor = cms.status === "Active" ? C.green : cms.status === "Suspended" ? C.amber : C.textMuted;

  return (
    <tr
      onClick={onOpen}
      style={{ cursor: "pointer", borderBottom: `1px solid ${C.border}`, transition: "background .1s" }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = C.bgHover)}
      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
    >
      {/* CMS Info */}
      <td style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.blue}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Server size={16} color={C.blue} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cms.name}</div>
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: "monospace" }}>{cms.id}</div>
            {cms.notes && <div style={{ fontSize: 11, color: C.textSub, marginTop: 2, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cms.notes}</div>}
          </div>
        </div>
      </td>

      {/* Currency */}
      <td style={{ padding: "14px 12px" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub, background: C.bgHover, padding: "3px 8px", borderRadius: RADIUS.sm }}>{cms.currency}</span>
      </td>

      {/* Status */}
      <td style={{ padding: "14px 12px" }}>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: `${statusColor}20`, color: statusColor }}>
          {cms.status}
        </span>
      </td>

      {/* Channels */}
      <td style={{ padding: "14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Tv size={12} color={C.blue} />
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmt(stats?.total_channels)}</span>
          {stats && stats.demonetized > 0 && (
            <span style={{ fontSize: 10, color: C.red, background: `${C.red}18`, padding: "1px 6px", borderRadius: 99 }}>
              {stats.demonetized} demo
            </span>
          )}
        </div>
      </td>

      {/* Revenue */}
      <td style={{ padding: "14px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>{fmtCurrency(stats?.total_monthly_revenue, cms.currency)}</div>
        <div style={{ fontSize: 10, color: C.textMuted }}>tháng này</div>
      </td>

      {/* Subscribers */}
      <td style={{ padding: "14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Users size={11} color={C.textMuted} />
          <span style={{ fontSize: 13, color: C.textSub }}>{fmt(stats?.total_subscribers)}</span>
        </div>
      </td>

      {/* Monetized */}
      <td style={{ padding: "14px 12px" }}>
        <div style={{ fontSize: 12, color: C.green }}>{fmt(stats?.monetized)} <span style={{ color: C.textMuted, fontSize: 10 }}>/ {fmt(stats?.total_channels)}</span></div>
      </td>

      {/* Actions */}
      <td style={{ padding: "14px 16px" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <button onClick={onApiKeys} title="API Keys — Sync channel data"
            style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.purple; el.style.color = C.purple; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
            <KeyRound size={13} />
          </button>
          <button onClick={onAnalytics} title="Analytics — Lịch sử doanh thu"
            style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.amber; el.style.color = C.amber; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
            <BarChart2 size={13} />
          </button>
          <button onClick={onHistory} title="Trang lịch sử chi tiết"
            style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.cyan; el.style.color = C.cyan; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
            <History size={13} />
          </button>
          {showEdit !== false && (
            <button onClick={onEdit} title="Chỉnh sửa"
              style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.blue; el.style.color = C.blue; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
              <Pencil size={13} />
            </button>
          )}
          {showDelete !== false && (
            <button onClick={onDelete} title="Xóa"
              style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.red; el.style.color = C.red; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLButtonElement; el.style.borderColor = C.border; el.style.color = C.textMuted; }}>
              <Trash2 size={13} />
            </button>
          )}
          <button onClick={onOpen} style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: RADIUS.sm, background: "transparent", cursor: "pointer", color: C.textMuted, display: "flex" }}>
            <ChevronRight size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Aggregate KPI bar ─────────────────────────────────────────
function AggregateStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, flex: 1, boxShadow: SHADOW.sm }}>
      <div style={{ width: 38, height: 38, borderRadius: RADIUS.sm, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function CmsListPage() {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCms, setEditingCms] = useState<Cms | null>(null);
  const [deletingCms, setDeletingCms] = useState<Cms | null>(null);
  const [apiKeysCms, setApiKeysCms] = useState<Cms | null>(null);
  const [analyticsCms, setAnalyticsCms] = useState<Cms | null>(null);
  const { can } = usePermissions();

  const { data, isLoading, refetch } = useCmsList();
  const cmsList = data?.items ?? [];

  return (
    <div style={{ padding: "24px 28px" }}>
      <CreateCmsModal open={showCreate} onClose={() => setShowCreate(false)} />
      {editingCms   && <EditCmsModal      cms={editingCms}   onClose={() => setEditingCms(null)} />}
      {deletingCms  && <DeleteCmsModal    cms={deletingCms}  onClose={() => setDeletingCms(null)} />}
      {apiKeysCms   && <CmsApiKeysModal   cms={apiKeysCms}   onClose={() => setApiKeysCms(null)} />}
      {analyticsCms && <CmsAnalyticsModal cms={analyticsCms} onClose={() => setAnalyticsCms(null)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text, margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Server size={20} color={C.blue} /> Quản lý CMS
          </h1>
          <p style={{ fontSize: 13, color: C.textSub, margin: "4px 0 0" }}>
            {cmsList.length} CMS account — Click vào dòng để xem chi tiết kênh
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={13} />} onClick={() => void refetch()}>Làm mới</Button>
          {can("cms:create") && (
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setShowCreate(true)}>Thêm CMS</Button>
          )}
        </div>
      </div>

      {/* Aggregate stats */}
      {cmsList.length > 0 && (
        <AggregateBand cmsList={cmsList} />
      )}

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: 60, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : cmsList.length === 0 ? (
        <EmptyState icon={<Server size={40} />} title="Chưa có CMS nào" description="Thêm CMS đầu tiên để bắt đầu quản lý kênh." />
      ) : (
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: RADIUS.md, overflow: "hidden", boxShadow: SHADOW.sm }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bg }}>
                {["CMS", "Tiền tệ", "Trạng thái", "Kênh", "Doanh thu tháng", "Subscribers", "Monetized", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: ".05em", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cmsList.map((cms) => (
                <CmsRow
                  key={String(cms.id)}
                  cms={cms}
                  onOpen={() => navigate(`/cms/${String(cms.id)}`)}
                  onEdit={(e) => { e.stopPropagation(); setEditingCms(cms); }}
                  onDelete={(e) => { e.stopPropagation(); setDeletingCms(cms); }}
                  onHistory={(e) => { e.stopPropagation(); navigate(`/cms/${String(cms.id)}/history`); }}
                  onAnalytics={(e) => { e.stopPropagation(); setAnalyticsCms(cms); }}
                  onApiKeys={(e) => { e.stopPropagation(); setApiKeysCms(cms); }}
                  showEdit={can("cms:edit")}
                  showDelete={can("cms:delete")}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Aggregate band ────────────────────────────────────────────
function AggregateBand({ cmsList }: { cmsList: Cms[] }) {
  const results = useQueries({
    queries: cmsList.map((cms) => ({
      queryKey: ["cms", cms.id, "stats"],
      queryFn: () => apiClient.get(`cms/${cms.id}/stats`).json<CmsStats>(),
      enabled: !!cms.id,
    })),
  });
  const allStats = results.map((r) => r.data).filter(Boolean) as CmsStats[];

  const totalChannels    = allStats.reduce((s, st) => s + (st?.total_channels    ?? 0), 0);
  const totalMonetized   = allStats.reduce((s, st) => s + (st?.monetized         ?? 0), 0);
  const totalSubscribers = allStats.reduce((s, st) => s + (st?.total_subscribers ?? 0), 0);
  const totalDemonetized = allStats.reduce((s, st) => s + (st?.demonetized       ?? 0), 0);

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
      <AggregateStat icon={<Tv          size={16} />} label="Tổng kênh"      value={fmt(totalChannels)}    color={C.blue} />
      <AggregateStat icon={<DollarSign  size={16} />} label="Đã monetize"    value={fmt(totalMonetized)}   color={C.green} />
      <AggregateStat icon={<Users       size={16} />} label="Tổng subcribers" value={fmt(totalSubscribers)} color={C.purple} />
      <AggregateStat icon={<TrendingUp  size={16} />} label="Bị demonetize"  value={fmt(totalDemonetized)} color={C.red} />
      <AggregateStat icon={<Server      size={16} />} label="Số CMS"         value={String(cmsList.length)} color={C.teal} />
    </div>
  );
}
