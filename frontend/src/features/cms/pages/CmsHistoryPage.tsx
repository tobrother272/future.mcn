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
import { PERIOD_OPTIONS, periodToParams, todayInputDate, type PeriodKey } from "@/lib/periods";

// ── CSV parser ────────────────────────────────────────────────
// Supports YouTube Studio exports in both English and Vietnamese.
// Vietnamese headers: Ngày, Số lượt xem, Lượt xem có tính phí,
//   Thời gian xem (giờ), Thời lượng xem trung bình,
//   Doanh thu ước tính của đối tác (USD)
// English headers: Date, Views, Engaged views, Watch time (hours),
//   Average view duration, Estimated partner revenue (USD)

type CsvRow = { snapshot_date: string; revenue: number; views: number; engaged_views: number; watch_time_hours: number };
type LifetimeSummary = Omit<CsvRow, "snapshot_date">;

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') { inQ = !inQ; }
    else if (ch === "," && !inQ) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

function parseNum(s: string): number {
  return Number(s.replace(/"/g, "").replace(/[^0-9.]/g, "")) || 0;
}

function parseRevenueCSV(text: string): { rows: CsvRow[]; lifetimeSummary: LifetimeSummary | null } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: [], lifetimeSummary: null };

  const headers = splitCsvLine(lines[0] ?? "").map((h) => h.replace(/"/g, "").trim().toLowerCase());

  const idxDate     = headers.findIndex((h) => h === "date"   || h === "ngày");
  const idxViews    = headers.findIndex((h) => h === "views"  || h === "số lượt xem");
  const idxEngaged  = headers.findIndex((h) => h.includes("engaged")   || h.includes("tính phí") || h.includes("có chủ đích"));
  const idxRevenue  = headers.findIndex((h) => h.includes("revenue")   || h.includes("doanh thu"));
  const idxWatchTime= headers.findIndex((h) => h.includes("watch time")|| h.includes("thời gian xem"));

  const rows: CsvRow[] = [];
  let lifetimeSummary: LifetimeSummary | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cols   = splitCsvLine(lines[i] ?? "");
    const rawDate = (cols[idxDate] ?? "").replace(/"/g, "").trim();
    if (!rawDate) continue;

    const revenue        = parseNum(idxRevenue   >= 0 ? (cols[idxRevenue]   ?? "") : "");
    const views          = parseNum(idxViews     >= 0 ? (cols[idxViews]     ?? "") : "");
    const engaged_views  = parseNum(idxEngaged   >= 0 ? (cols[idxEngaged]   ?? "") : "");
    const watch_time_hours = parseNum(idxWatchTime >= 0 ? (cols[idxWatchTime] ?? "") : "");

    // Capture "Tổng" / "Total" row as lifetime summary
    const lower = rawDate.toLowerCase();
    if (lower === "tổng" || lower === "total") {
      lifetimeSummary = { revenue, views, engaged_views, watch_time_hours };
      continue;
    }

    // Parse date — support YYYY-MM-DD (default) and DD/MM/YYYY fallback
    let date = rawDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const m = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) date = `${m[3]}-${m[2]!.padStart(2, "0")}-${m[1]!.padStart(2, "0")}`;
      else continue;
    }

    rows.push({ snapshot_date: date, revenue, views, engaged_views, watch_time_hours });
  }
  return { rows, lifetimeSummary };
}

// ── Import Modal ─────────────────────────────────────────────
function ImportRevenueModal({ open, onClose, cmsId }: { open: boolean; onClose: () => void; cmsId: string }) {
  const toast = useToast();
  const importMut = useImportCmsRevenue(cmsId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [lifetimeSummary, setLifetimeSummary] = useState<LifetimeSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<{ inserted: number } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows: parsed, lifetimeSummary: ls } = parseRevenueCSV(ev.target?.result as string);
      setRows(parsed);
      setLifetimeSummary(ls);
    };
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
    setRows([]); setLifetimeSummary(null); setFileName(""); setResult(null);
    if (fileRef.current) fileRef.current.value = "";
    onClose();
  };

  const totalRevenue     = rows.reduce((s, r) => s + r.revenue, 0);
  const totalViews       = rows.reduce((s, r) => s + r.views, 0);
  const totalWatchTime   = rows.reduce((s, r) => s + r.watch_time_hours, 0);

  return (
    <Modal open={open} onClose={handleClose} title="Import Doanh Thu từ CSV (YouTube Studio)" width={560}
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
        {/* Instructions */}
        <div style={{ fontSize: 12, color: C.textSub, background: C.bgHover, borderRadius: 8, padding: "10px 14px", lineHeight: 1.6 }}>
          Tải <strong>Table data.csv</strong> từ YouTube Studio → Analytics → Revenue tab.<br />
          Hỗ trợ header tiếng Việt (Ngày, Số lượt xem, Doanh thu…) và tiếng Anh.
        </div>

        {/* Dropzone */}
        <div onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = C.blue; e.currentTarget.style.background = `${C.blue}10`; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "transparent"; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.background = "transparent";
            const file = e.dataTransfer.files[0];
            if (!file) return;
            setFileName(file.name);
            setResult(null);
            const reader = new FileReader();
            reader.onload = (ev) => {
              const { rows: parsed, lifetimeSummary: ls } = parseRevenueCSV(ev.target?.result as string);
              setRows(parsed);
              setLifetimeSummary(ls);
            };
            reader.readAsText(file, "utf-8");
          }}
          style={{
            border: `2px dashed ${C.border}`, borderRadius: 10, padding: "20px 16px",
            textAlign: "center", cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <Upload size={24} color={C.textMuted} style={{ margin: "0 auto 8px" }} />
          <div style={{ fontSize: 13, color: C.textSub }}>
            {fileName ? <strong style={{ color: C.text }}>{fileName}</strong> : "Kéo thả hoặc click để chọn Table data.csv"}
          </div>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {/* Preview */}
        {rows.length > 0 && !result && (
          <div>
            {/* Summary KPIs from daily rows */}
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {[
                { label: "Số ngày",       value: `${rows.length}`,                           color: C.blue },
                { label: "Tổng Revenue",  value: `$${totalRevenue.toFixed(2)}`,               color: C.amber },
                { label: "Tổng Views",    value: totalViews.toLocaleString("en-US"),           color: C.cyan },
                { label: "Watch Time (h)",value: totalWatchTime.toLocaleString("en-US", { maximumFractionDigits: 1 }), color: C.purple },
              ].map((item) => (
                <div key={item.label} style={{ flex: "1 1 100px", background: C.bgHover, borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 11, color: C.textMuted }}>{item.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: item.color, marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Lifetime total from "Tổng" row */}
            {lifetimeSummary && (
              <div style={{ background: `${C.amber}12`, borderRadius: 8, padding: "8px 14px", marginBottom: 10, fontSize: 12 }}>
                <div style={{ fontWeight: 600, color: C.amber, marginBottom: 4 }}>Tổng lifetime (từ hàng "Tổng" trong CSV)</div>
                <div style={{ display: "flex", gap: 20, color: C.textSub }}>
                  <span>Revenue: <strong style={{ color: C.amber }}>${lifetimeSummary.revenue.toFixed(2)}</strong></span>
                  <span>Views: <strong style={{ color: C.blue }}>{lifetimeSummary.views.toLocaleString("en-US")}</strong></span>
                  <span>Watch (h): <strong style={{ color: C.cyan }}>{lifetimeSummary.watch_time_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</strong></span>
                </div>
              </div>
            )}

            {/* Table preview */}
            <div style={{ background: C.bgHover, borderRadius: 8, overflow: "auto", maxHeight: 200, fontSize: 12 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Ngày","Revenue ($)","Views","Watch (h)"].map((h) => (
                      <th key={h} style={{ padding: "6px 12px", textAlign: "left", color: C.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r) => (
                    <tr key={r.snapshot_date} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "5px 12px", color: C.text }}>{r.snapshot_date}</td>
                      <td style={{ padding: "5px 12px", color: C.amber }}>${r.revenue.toFixed(2)}</td>
                      <td style={{ padding: "5px 12px", color: C.textSub }}>{r.views.toLocaleString("en-US")}</td>
                      <td style={{ padding: "5px 12px", color: C.textSub }}>{r.watch_time_hours.toLocaleString("en-US", { maximumFractionDigits: 1 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <div style={{ padding: "5px 12px", color: C.textMuted }}>...và {rows.length - 10} ngày nữa</div>
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

type RevRow = { snapshot_date: string; revenue: number; views: number; engaged_views?: number; watch_time_hours?: number };

export default function CmsHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodKey>("28");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(todayInputDate());
  const [importOpen, setImportOpen] = useState(false);

  const params = fromDate && toDate
    ? { from: fromDate, to: toDate }
    : periodToParams(period);
  const { data: cms } = useCms(id!);
  const { data: revenueData, isLoading } = useCmsRevenue(id!, params);
  const history = (revenueData?.items ?? []) as RevRow[];
  const periodSummary = revenueData?.period_summary ?? null;

  const chartData = history.map((r) => ({
    date: fmtDate(r.snapshot_date),
    revenue: Number(r.revenue),
    views: Number(r.views),
    engaged_views: Number(r.engaged_views ?? 0),
    watch_time_hours: Number(r.watch_time_hours ?? 0),
  }));

  const dailyRevenue   = history.reduce((s, r) => s + Number(r.revenue), 0);
  const dailyViews     = history.reduce((s, r) => s + Number(r.views), 0);
  // Always use the UNION sum from daily rows (analytics + CSV merged).
  // period_summary kept only for the "YT Studio" badge display.
  const totalRevenue   = dailyRevenue;
  const totalViews     = dailyViews;
  const totalWatchTime = history.reduce((s, r) => s + Number(r.watch_time_hours ?? 0), 0);
  const hasAnalytics   = history.some((r) => (r.engaged_views ?? 0) > 0 || (r.watch_time_hours ?? 0) > 0);

  // Số ngày theo period đang chọn (để so với history.length có data thực tế)
  const periodDays = fromDate && toDate
    ? Math.max(1, Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400_000) + 1)
    : (period === "lifetime" ? null : Number(period));

  return (
    <div style={{ padding: 24 }}>
      <Button variant="ghost" size="sm" icon={<ChevronLeft size={14} />} onClick={() => navigate(`/cms/${id}`)} style={{ marginBottom: 16 }}>
        {cms?.name ?? "CMS"}
      </Button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Lịch sử doanh thu — {cms?.name}</h1>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
          {PERIOD_OPTIONS.filter((opt) => !["180", "this_month", "last_month"].includes(opt.key)).map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={period === opt.key ? "primary" : "secondary"}
              onClick={() => {
                setPeriod(opt.key);
                setFromDate("");
              }}
            >
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
          <Button size="sm" variant="secondary" icon={<Upload size={14} />} onClick={() => setImportOpen(true)}>
            Import CSV
          </Button>
        </div>
      </div>

      <ImportRevenueModal open={importOpen} onClose={() => setImportOpen(false)} cmsId={id!} />

      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <Card padding="16px">
          <div style={{ fontSize: 11, color: C.textMuted, display: "flex", alignItems: "center", gap: 6 }}>
            Tổng doanh thu
            {periodSummary && (
              <span title={`Từ YT Studio (cập nhật ${periodSummary.captured_date}, ${periodSummary.channel_count} kênh)`}
                style={{ fontSize: 10, color: C.green, background: `${C.green}22`, borderRadius: 4, padding: "1px 5px" }}>
                YT Studio
              </span>
            )}
          </div>
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
          <div style={{ fontSize: 11, color: C.textMuted }}>Ngày có data</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginTop: 4 }}>
            {history.length}
            {periodDays !== null && (
              <span style={{ fontSize: 13, fontWeight: 400, color: C.textMuted }}> / {periodDays}</span>
            )}
          </div>
        </Card>
      </div>

      {/* Chart */}
      <Card padding="20px" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 16 }}>Doanh thu theo ngày</div>
        {isLoading ? (
          <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: C.textSub }}>Đang tải...</div>
        ) : chartData.length === 0 ? (
          <div style={{ height: 360, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: C.textMuted, gap: 8 }}>
            <div style={{ fontSize: 14 }}>Chưa có dữ liệu analytics</div>
            <div style={{ fontSize: 12 }}>Dữ liệu sẽ xuất hiện sau khi sync qua Public API</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 5, right: 40, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false} />
              <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false}
                tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: C.textMuted }} tickLine={false}
                tickFormatter={(v: number) => `${(v/1_000_000).toFixed(1)}M`} />
              <Tooltip contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.text }}
                formatter={(value: number, name: string) => {
                  if (name === "Revenue ($)") return [`$${value.toFixed(2)}`, name];
                  return [value.toLocaleString("en-US"), name];
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
        <div style={{ overflowY: "auto" }}>
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
                    <td style={{ padding: "7px 16px", color: C.textSub }}>{Number(r.watch_time_hours ?? 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
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
