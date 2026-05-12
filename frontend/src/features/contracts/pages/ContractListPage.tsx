import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Search, Download, Pencil, ExternalLink, Users, Building2, Eye } from "lucide-react";
import { C } from "@/styles/theme";
import { Card, EmptyState, Button, FileViewerModal } from "@/components/ui";
import { useAllContracts } from "@/api/contracts.api";
import type { PartnerContractWithPartner } from "@/api/contracts.api";
import { usePartnerList } from "@/api/partners.api";
import { useEmployeeList } from "@/api/employees.api";
import { fmtDate } from "@/lib/format";

const PAGE_SIZE = 50;

const EXT_COLOR: Record<string, string> = {
  pdf: C.red, doc: C.blue, docx: C.blue, xls: C.green, xlsx: C.green,
};
function extOf(name: string) { return name.split(".").pop()?.toLowerCase() ?? ""; }
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ContractListPage() {
  const navigate = useNavigate();
  const [search,     setSearch]     = useState("");
  const [partnerId,  setPartnerId]  = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [page,       setPage]       = useState(0);
  const [viewing,    setViewing]    = useState<PartnerContractWithPartner | null>(null);

  const { data, isLoading } = useAllContracts({
    search:      search      || undefined,
    partner_id:  partnerId   || undefined,
    employee_id: employeeId  || undefined,
    limit:  PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: partnerData } = usePartnerList({ limit: 500 });
  const { data: empData }     = useEmployeeList({ limit: 200 });

  const contracts = data?.items ?? [];
  const total     = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const partners   = partnerData?.items ?? [];
  const employees  = empData?.items ?? [];

  const handleSearchChange = (v: string) => { setSearch(v); setPage(0); };
  const handlePartnerChange  = (v: string) => { setPartnerId(v);  setPage(0); };
  const handleEmployeeChange = (v: string) => { setEmployeeId(v); setPage(0); };

  const inputStyle = {
    height: 34, padding: "0 10px", borderRadius: 8, boxSizing: "border-box" as const,
    border: `1px solid ${C.border}`, background: C.bgCard,
    color: C.text, fontSize: 13, outline: "none",
  };

  return (
    <div style={{ padding: "24px 32px", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.text }}>Hợp đồng</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.textMuted }}>
            {total > 0 ? `${total} hợp đồng từ tất cả đối tác` : "Tất cả hợp đồng"}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <Card padding="12px 16px" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: C.textMuted }} />
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tiêu đề, mã số, đối tác..."
              style={{ ...inputStyle, width: "100%", paddingLeft: 30 }}
            />
          </div>

          {/* Partner filter */}
          <select
            value={partnerId}
            onChange={(e) => handlePartnerChange(e.target.value)}
            style={{ ...inputStyle, width: 180, cursor: "pointer" }}
          >
            <option value="">Tất cả đối tác</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Employee filter */}
          <select
            value={employeeId}
            onChange={(e) => handleEmployeeChange(e.target.value)}
            style={{ ...inputStyle, width: 180, cursor: "pointer" }}
          >
            <option value="">Tất cả nhân viên</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center", color: C.textMuted }}>Đang tải...</div>
      ) : contracts.length === 0 ? (
        <Card padding="48px" style={{ width: "100%", boxSizing: "border-box", textAlign: "center" }}>
          <EmptyState icon={<FileText size={40} />} title="Chưa có hợp đồng"
            description="Thêm hợp đồng từ trang chi tiết đối tác" />
        </Card>
      ) : (
        <Card padding={0} style={{ overflow: "hidden", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bgHover, borderBottom: `1px solid ${C.border}` }}>
                {[
                  "Mã số hợp đồng", "Tiêu đề", "Đối tác", "Nhân viên",
                  "Dung lượng", "Ngày upload", "",
                ].map((h) => (
                  <th key={h} style={{
                    padding: "10px 14px", textAlign: "left",
                    fontSize: 11, fontWeight: 600, color: C.textMuted,
                    whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderBottom: `1px solid ${C.border}` }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.bgHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Contract number */}
                  <td style={{ padding: "10px 14px" }}>
                    {c.contract_number ? (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                        background: `${C.blue}15`, color: C.blue, fontFamily: "monospace",
                      }}>{c.contract_number}</span>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Title */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
                        background: `${EXT_COLOR[extOf(c.file_name)] ?? C.purple}18`,
                        color: EXT_COLOR[extOf(c.file_name)] ?? C.purple,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 8, fontWeight: 700, textTransform: "uppercase",
                      }}>
                        {extOf(c.file_name) || "?"}
                      </div>
                      <span style={{ fontWeight: 500, color: C.text }}>{c.title}</span>
                    </div>
                  </td>

                  {/* Partner */}
                  <td style={{ padding: "10px 14px" }}>
                    {c.partner_name ? (
                      <button
                        onClick={() => navigate(`/partners/${c.partner_id}`)}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          display: "flex", alignItems: "center", gap: 5,
                          color: C.blue, fontSize: 12, fontWeight: 500,
                        }}
                      >
                        <Building2 size={11} />{c.partner_name}
                        <ExternalLink size={10} style={{ opacity: 0.6 }} />
                      </button>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Employee */}
                  <td style={{ padding: "10px 14px" }}>
                    {c.employee_name ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.text }}>
                        <Users size={11} color={C.cyan} />{c.employee_name}
                      </div>
                    ) : (
                      <span style={{ color: C.textMuted, fontSize: 12 }}>—</span>
                    )}
                  </td>

                  {/* Size */}
                  <td style={{ padding: "10px 14px", color: C.textMuted, fontSize: 12, whiteSpace: "nowrap" }}>
                    {fmtSize(Number(c.file_size))}
                  </td>

                  {/* Upload date */}
                  <td style={{ padding: "10px 14px", color: C.textSub, fontSize: 12, whiteSpace: "nowrap" }}>
                    {fmtDate(c.upload_date)}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => setViewing(c)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.green, cursor: "pointer",
                        }}
                      >
                        <Eye size={11} />Xem
                      </button>
                      <a
                        href={`/api/contracts/${c.partner_id}/${c.id}/download`}
                        download={c.file_name}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.blue, textDecoration: "none", cursor: "pointer",
                        }}
                      >
                        <Download size={11} />Tải
                      </a>
                      <button
                        onClick={() => navigate(`/partners/${c.partner_id}`)}
                        title="Xem trong trang đối tác"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${C.border}`, background: C.bgCard,
                          color: C.cyan, cursor: "pointer",
                        }}
                      >
                        <Pencil size={11} />Sửa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 16px", borderTop: `1px solid ${C.border}`,
              fontSize: 12, color: C.textMuted,
            }}>
              <span>
                Hiển thị {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <Button variant="ghost" size="sm" disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}>← Trước</Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map((i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    style={{
                      width: 28, height: 28, borderRadius: 6, fontSize: 12, cursor: "pointer",
                      border: `1px solid ${i === page ? C.blue : C.border}`,
                      background: i === page ? `${C.blue}20` : "transparent",
                      color: i === page ? C.blue : C.textSub,
                      fontWeight: i === page ? 700 : 400,
                    }}
                  >{i + 1}</button>
                ))}
                <Button variant="ghost" size="sm" disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}>Tiếp →</Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {viewing && (
        <FileViewerModal
          url={`/api/contracts/${viewing.partner_id}/${viewing.id}/view`}
          downloadUrl={`/api/contracts/${viewing.partner_id}/${viewing.id}/download`}
          fileName={viewing.file_name}
          title={viewing.title}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
