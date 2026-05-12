# Backup Meridian MCN v6.0
**Thời điểm backup:** 11/05/2026 lúc 10:34 (UTC+7)
**Tạo bởi:** Cursor AI Agent (tự động)

---

## Trạng thái hệ thống tại thời điểm backup

| Dữ liệu           | Số lượng      |
|-------------------|---------------|
| CMS Accounts      | 9             |
| Channels          | 520           |
| Partners          | 11            |
| Employees         | 3             |
| Contracts         | 7             |
| Policies          | 10            |
| Violations        | 10            |
| Submissions       | 4             |
| Tổng doanh thu    | $443,771.61   |

---

## Cấu trúc thư mục backup

```
2026-05-11_10-34/
├── database/
│   ├── meridian_backup.dump   ← PostgreSQL binary dump (pg_restore)   [121.7 KB]
│   └── meridian_backup.sql    ← Plain SQL dump (psql)                  [231.1 KB]
├── uploads/
│   └── uploads/               ← Toàn bộ file upload (hợp đồng, ảnh vi phạm, ảnh chính sách)
│                                 11 files
├── source/
│   └── meridian-mcn/          ← Source code đầy đủ (186 files, không bao gồm node_modules/dist)
└── docs/
    ├── Thông tin kết nối - Super Admin.txt
    └── Thông tin kết nối - Partner.txt
```

---

## Khôi phục (Restore)

### 1. Khôi phục Database từ binary dump (khuyến nghị)

```powershell
# Tạo database mới (nếu chưa có)
docker exec meridian-postgres-v6 psql -U meridian -c "CREATE DATABASE meridian_restore;"

# Restore từ binary dump
docker cp database\meridian_backup.dump meridian-postgres-v6:/tmp/
docker exec meridian-postgres-v6 pg_restore -U meridian -d meridian --clean --if-exists /tmp/meridian_backup.dump
```

### 2. Khôi phục Database từ SQL thuần (fallback)

```powershell
docker cp database\meridian_backup.sql meridian-postgres-v6:/tmp/
docker exec meridian-postgres-v6 psql -U meridian -d meridian -f /tmp/meridian_backup.sql
```

### 3. Khôi phục Uploads

```powershell
# Copy toàn bộ thư mục uploads vào container
docker cp uploads\uploads meridian-backend-v6:/app/
```

### 4. Khôi phục Source Code

```powershell
# Copy source vào thư mục làm việc
Copy-Item -Recurse source\meridian-mcn D:\MCN-6.0\meridian-mcn-restored

# Build và chạy lại
Set-Location D:\MCN-6.0\meridian-mcn-restored
docker compose build
docker compose up -d
```

---

## Thông tin kết nối

| Service   | URL / Port                     |
|-----------|-------------------------------|
| Frontend  | http://localhost:3020          |
| Backend   | http://localhost:4010/api      |
| Database  | localhost:5433 (PostgreSQL 16) |

### Tài khoản mặc định
- **Super Admin:** xem file `docs/Thông tin kết nối - Super Admin.txt`
- **Partner:** xem file `docs/Thông tin kết nối - Partner.txt`

---

## Docker containers

| Container              | Image                | Port     |
|------------------------|----------------------|----------|
| meridian-frontend-v6   | nginx (react build)  | 3020:80  |
| meridian-backend-v6    | node 20 + tsx        | 4010:4000|
| meridian-postgres-v6   | postgres:16-alpine   | 5433:5432|

---

## Tính năng đã hoàn thiện tại thời điểm backup

### Admin Portal
- ✅ Dashboard — KPI, biểu đồ revenue, alert vi phạm, pipeline, quick actions
- ✅ CMS — Danh sách table, chi tiết kênh, filter, import CSV, lịch sử doanh thu
- ✅ Channels — Danh sách, chi tiết, gán partner/topic, bulk transfer
- ✅ Partners — Workflow duyệt, chi tiết đối tác
- ✅ Employees — KPI strip, bảng, detail panel
- ✅ Contracts — Upload, xem trước, download
- ✅ Policies — CRUD, upload ảnh minh họa, lightbox (10 chính sách MCN)
- ✅ Violations — CRUD, KPI, lọc kết quả, lịch sử xử lý (10 vi phạm thực tế)
- ✅ Workflow QC Queue — Review, approve, reject submissions
- ✅ Workflow Provisioning — Tạo kênh từ submission được duyệt
- ✅ Revenue Dashboard — Chart theo ngày, import CSV
- ✅ Settings — Quản lý user, audit log, system settings

### Partner Portal
- ✅ Home — Dashboard đối tác
- ✅ Kênh của tôi — Phân cấp Partner → CMS → Topic → Channels
- ✅ Gửi video — Submit + tracking trạng thái workflow
- ✅ Hợp đồng — Xem, download, preview PDF
- ✅ Chính sách — Xem chính sách (read-only)
- ✅ Hồ sơ — Xem/sửa thông tin, đổi mật khẩu

---

*Backup tự động bởi Meridian MCN Cursor Agent — 11/05/2026*
