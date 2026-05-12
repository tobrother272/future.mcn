import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, CheckCircle } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { C } from "@/styles/theme";
import { Button, Card, Modal } from "@/components/ui";
import { useCms, useCmsRevenue, useImportCmsRevenue } from "@/api/cms.api";
import { useToast } from "@/stores/notificationStore";
import { fmtCurrency, fmtDate, fmt } from "@/lib/format";

// ── CSV parser for YouTube Studio daily revenue export ───────
// Columns: Date, Engaged views, Views, Watch time, Avg duration, Estimated partner revenue (USD)
function parseRevenueCSV(text: string): Array<{ snapshot_date: string; revenue: number; views: number }> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idxDate    = headers.findIndex((h) => h === "date");
  const idxViews   = headers.findIndex((h) => h === "views");
  const idxRevenue = headers.findIndex((h) => h.includes("revenue"));

  const rows: Array<{ snapshot_date: string; revenue: number; views: number }> = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const date    = idxDate    >= 0 ? cols[idxDate]    : "";
    const revenue = idxRevenue >= 0 ? cols[idxRevenue] : "";
    const views   = idxViews   >= 0 ? cols[idxViews]   : "";

    // Skip Total row and invalid dates
    if (!date || date.toLowerCase() === "total" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    rows.push({
      snapshot_date: date,
      revenue:       Number(revenue.replace(/[^0-9.]/g, "")) || 0,
      views:         Number(views.replace(/[^0-9.]/g, ""))   || 0,
    });
  }
  return rows;
}

// ── Import Modal ─────────────────────────────────────────────
function ImportRevenueModal({ open, onClose, cmsId }: { open: boolean; onClose: () => void; cmsId: string }) {
  const toast = useToast();
  const importMut = useImportCmsRevenue(cmsId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Array<{ snapshot_date: string; revenue: number; views: number }>>([]);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ inserted: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => setRows(parseRevenueCSV(ev.target?.result as string));
    reader.readAsText(file, "utf-8");
  };

  const handleImport = async () => {
    try {
      const res = await importMut.mutateAsync(rows);
      setResult(res);
      toast.success("Import doanh thu thành công", `${res.inserted} ngày đã được lưu`);
    } catch (err) {
      toast.error("Import thất bại", err instanceof Error ? err.message : "");
    }
  };

  const handleClose = () => {
    setRows([]); setFileName(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalViews   = rows.reduce((s, r) => s + r.views, 0);

  return (
    <Modal open={open} onClose={handleClose} title="Import Doanh Thu từ CSV" width={520}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose}>Đóng</Button>
          {rows.length > 0 && !result && (
            <Button variant="primary" size="sm" icon={<Upload size={14} />}
              loading={importMut.isPending} onClick={() => void handleImport()}>
              Import {rows.length} ngày
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Dropzone */}
        <div onClick={() => fileRef.current?.click()} style={{
          border: `2px dashed ${C.border}`, borderRadius: 10, padding: "24px 16px",
          textAlign: "center", cursor: "pointer", transition: "border-color 0.15s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <Upload size={24} color={C.textMuted} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, color: C.textSub }}>
            {fileName ? <strong style={{ color: C.text }}>{fileName}</strong> : "Click để chọn file CSV"}
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
            Format: Date, Views, Estimated partner revenue (USD)
          </div>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div>
            {/* Summary */}
            <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Số ngày</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.blue }}>{rows.length}</div>
              </div>
              <div style={{ flex: 1, background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Tổng Revenue</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.amber }}>{fmtCurrency(totalRevenue)}</div>
              </div>
              <div style={{ flex: 1, background: C.bgHover, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textMuted }}>Tổng Views</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.cyan }}>{fmt(totalViews)}</div>
              </div>
            </div>
            {/* Table preview */}
            <div style={{ background: C.bgHover, borderRadius: 8, overflow: "auto", maxHeight: 180, fontSize: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Ngày","Revenue ($)","Views"].map((h) => (
                      <th key={h} style={{ padding: "6px 12px", textAlign: "left", color: C.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 8).map((r) => (
                    <tr key={r.snapshot_date} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "5px 12px", color: C.text }}>{r.snapshot_date}</td>
                      <td style={{ padding: "5px 12px", color: C.amber }}>${r.revenue.toFixed(3)}</td>
                      <td style={{ padding: "5px 12px", color: C.textSub }}>{fmt(r.views)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 8 && (
                <div style={{ padding: "5px 12px", color: C.textMuted }}>...và {rows.length - 8} ngày nữa</div>
              )}
            </div>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: `${C.green}15`, borderRadius: 10, padding: "14px 18px" }}>
            <CheckCircle size={22} color={C.green} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.green }}>Import thành công</div>
              <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{result.inserted} ngày doanh thu đã được lưu vào database</div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

const PERIOD_OPTIONS = [{ label: "30 ngày", days: 30 }, { label: "90 ngày", days: 90 }, { label: "365 ngày", days: 365 }];

type RevRow = { snapshot_date: string; revenue: number; views: number; engaged_views?: number; watch_time_hours?: number };

export default function CmsHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [importOpen, setImportOpen] = useState(false);

  const { data: cms } = useCms(id!);
  const { data: rawHistory, isLoading } = useCmsRevenue(id!, days);
  const history = (rawHistory ?? []) as RevRow[];

  const chartData = history.map((r) => ({
    date: fmtDate(r.snapshot_date),
    revenue: Number(r.revenue),
    views: Number(r.views),
    engaged_views: Number(r.engaged_views ?? 0),
    watch_time_hours: Number(r.watch_time_hours ?? 0),
  }));

  const totalRevenue      = history.reduce((s, r) => s + Number(r.revenue), 0);
  const totalViews        = history.reduce((s, r) => s + Number(r.views), 0);
  const totalWatchTime    = history.reduce((s, r) => s + Number(r.watch_time_hours ?? 0), 0);
  const hasAnalytics      = history.some((r) => (r.engaged_views ?? 0) > 0 || (r.watch_time_hours ?? 0) > 0);

  return (
    <div style={{ padding: 24 }}>
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate(`/cms/${id}`)} style={{ marginBottom: 16 }}>
        {cms?.name ?? "CMS"}
      </Button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Lịch sử doanh thu — {cms?.name}</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {PERIOD_OPTIONS.map((opt) => (
            <Button key={opt.days} size="sm" variant={days === opt.days ? "primary" : "secondary"} onClick={() => setDays(opt.days)}>
              {opt.label}
            </Button>
          ))}
          <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
        </div>
      </div>

      <ImportRevenueModal open={importOpen} onClose={() => setImportOpen(false)} cmsId={id!} />

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card padding="16px">
          <div style={{ fontSize: 11, color: C.textMuted }}>Tổng doanh thu</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.amber, marginTop: 4 }}>
            {fmtCurrency(totalRevenue, cms?.currency)}
          </div>
        </Card>
        <Card padding="16px">
          <div style={{ fontSize: 11, color: C.textMuted }}>Tổng lượt xem</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.blue, marginTop: 4 }}>{fmt(totalViews)}</div>
        </Card>
        {hasAnalytics && (
          <Card padding="16px">
            <div style={{ fontSize: 11, color: C.textMuted }}>Watch Time (giờ)</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.cyan, marginTop: 4 }}>{fmt(Math.round(totalWatchTime))}</div>
          </Card>
        )}
        <Card padding="16px">
          <div style={{ fontSize: 11, color: C.textMuted }}>Số ngày</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>{history.length}</div>
        </Card>
      </div>

      {/* Chart */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>Doanh thu theo ngày</div>
        {isLoading ? (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8 }}>
            <div style={{ fontSize: 14 }}>Chưa có dữ liệu analytics</div>
            <div style={{ fontSize: 12 }}>Dữ liệu sẽ xuất hiện sau khi sync qua Public API</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false}
                tickFormatter={(v: number) => `${(v/1_000_000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  if (name === "Revenue ($)") return [`$${value.toFixed(3)}`, name];
                  return [fmt(value), name];
                }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left"  type="monotone" dataKey="revenue" stroke={C.amber} strokeWidth={2} dot={false} name="Revenue ($)" />
              <Line yAxisId="right" type="monotone" dataKey="views"   stroke={C.blue}  strokeWidth={2} dot={false} name="Views" />
              {hasAnalytics && <Line yAxisId="right" type="monotone" dataKey="engaged_views" stroke={C.cyan} strokeWidth={1.5} dot={false} name="Engaged Views" strokeDasharray="4 2" />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Table */}
      <Card padding={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 600, color: C.text }}>
          Chi tiết theo ngày
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead style={{ position: "sticky", top: 0, background: C.bgHover }}>
              <tr>
                {[
                  "Ngày", "Revenue", "Views",
                  ...(hasAnalytics ? ["Engaged Views", "Watch Time (h)"] : []),
                ].map((h) => (
                  <th key={h} style={{ padding: "8px 16px", textAlign: "left", fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((r) => (
                <tr key={r.snapshot_date} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 16px", color: C.textSub }}>{fmtDate(r.snapshot_date)}</td>
                  <td style={{ padding: "7px 16px", color: C.amber, fontWeight: 600 }}>{fmtCurrency(Number(r.revenue), cms?.currency)}</td>
                  <td style={{ padding: "7px 16px", color: C.text }}>{fmt(Number(r.views))}</td>
                  {hasAnalytics && <>
                    <td style={{ padding: "7px 16px", color: C.cyan }}>{fmt(Number(r.engaged_views ?? 0))}</td>
                    <td style={{ padding: "7px 16px", color: C.textSub }}>{Number(r.watch_time_hours ?? 0).toFixed(1)}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && !isLoading && (
            <div style={{ padding: "24px 16px", textAlign: "center", color: C.textMuted, fontSize: 13 }}>
              Chưa có dữ liệu trong khoảng thời gian này
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
