# Deploy Meridian MCN — Ubuntu 24.04 + MikroTik DDNS + HTTPS

Tài liệu này được viết riêng cho setup hiện tại của bạn:

| Thông số | Giá trị |
|---|---|
| OS | Ubuntu 24.04 LTS |
| Domain (DDNS) | `hfa0966545s.sn.mynetname.net` |
| NAT | MikroTik đã forward **80** và **443** từ WAN về VPS |
| HTTPS | Caddy + Let's Encrypt (tự động xin & gia hạn) |
| Quy mô | Vừa (~50–500 user), backup tự động hàng ngày |

Stack: **Caddy → Nginx (SPA) → Node.js (API) → Postgres 16**, tất cả chạy trong Docker Compose.

> Thư mục dự kiến trên VPS: `/opt/meridian-mcn`.

---

## 0. Topology

```
Internet (HTTPS)
      │
      ▼
   MikroTik (NAT 80/443) ──► hfa0966545s.sn.mynetname.net (DDNS)
      │
      ▼
   VPS Ubuntu 24.04
      │
      ▼  port 80, 443 (PUBLIC)
   ┌──────────────────────────────────────────────┐
   │ meridian-caddy  (Let's Encrypt + reverse proxy) │
   └──────────────┬───────────────────────────────┘
                  │  meridian-net (internal docker bridge)
                  ▼
   ┌──────────────────────────────┐
   │ meridian-frontend (nginx + SPA + /api proxy) │
   └──────────────┬───────────────┘
                  │
                  ▼
   ┌──────────────────────────────┐    ┌────────────────────────┐
   │ meridian-backend (Express)   │───►│ meridian-postgres (PG16) │
   └──────────────────────────────┘    └────────────────────────┘
        ↑ 127.0.0.1:4010 only             ↑ 127.0.0.1:5433 only
```

Chỉ có **Caddy** là container expose ra mạng public. Backend + Postgres bind loopback nên kể cả UFW có cấu hình sai cũng không lộ ra Internet.

---

## 1. Setup VPS lần đầu

### 1.1. Cài Docker (Ubuntu 24.04 repo chính thức)

```bash
ssh <user>@<VPS_IP>

# Update OS
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw fail2ban htop ca-certificates gnupg

# Docker Engine + Compose plugin
curl -fsSL https://get.docker.com | sudo sh

# Cho phép user hiện tại chạy docker không cần sudo (logout/login lại sau lệnh này)
sudo usermod -aG docker $USER

# Verify
docker --version
docker compose version
```

> Nếu vừa `usermod` xong, **đăng xuất rồi SSH lại** để group có hiệu lực, nếu không các lệnh `docker` sau sẽ phải `sudo`.

### 1.2. Firewall (UFW)

Caddy cần **cả port 80 và 443** mở ra Internet. Port 80 không chỉ để redirect — Let's Encrypt cần nó để verify domain (HTTP-01 challenge) khi xin/gia hạn cert.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP (Caddy redirect + ACME challenge)
sudo ufw allow 443/tcp    # HTTPS
sudo ufw enable
sudo ufw status verbose
```

### 1.3. Kiểm tra DNS + NAT đã thông

Trước khi bật Caddy, **bắt buộc** verify domain trỏ đúng:

```bash
# Trên VPS
dig +short hfa0966545s.sn.mynetname.net
curl -sI http://hfa0966545s.sn.mynetname.net 2>&1 | head -5
```

`dig` phải trả về IP public của router MikroTik. `curl` (chưa có Caddy) sẽ refuse — đó là bình thường, miễn là không bị "timeout" (timeout = NAT chưa thông).

Nếu trên máy ngoài Internet `ping hfa0966545s.sn.mynetname.net` không tới được, kiểm tra NAT MikroTik trước khi tiếp tục — Caddy sẽ fail xin cert nếu Let's Encrypt không gọi vào được port 80.

### 1.4. Hardening SSH (khuyến nghị)

Sửa `/etc/ssh/sshd_config`:

```text
PermitRootLogin prohibit-password
PasswordAuthentication no
```

(Đảm bảo đã add public key vào `~/.ssh/authorized_keys` của user thường trước!)

```bash
sudo systemctl restart ssh
```

### 1.5. Tạo thư mục deploy

```bash
sudo mkdir -p /opt/meridian-mcn /var/backups/meridian
sudo chown -R $USER:$USER /opt/meridian-mcn /var/backups/meridian
```

---

## 2. Đưa source code lên VPS

### Cách A — qua git (khuyến nghị, dễ update sau này)

```bash
cd /opt
git clone <YOUR_GIT_REMOTE> meridian-mcn
cd meridian-mcn
```

### Cách B — SCP tarball từ máy Windows

Trên PowerShell:

```powershell
# Trong thư mục c:\Projects\future.mcn
tar --exclude='node_modules' --exclude='dist' --exclude='uploads' `
    --exclude='.git' --exclude='backups' -czf meridian-src.tar.gz `
    backend frontend `
    docker-compose.prod.yml .env.prod.example Caddyfile `
    scripts DEPLOY.md README.md .gitignore

scp meridian-src.tar.gz <user>@<VPS_IP>:/tmp/
```

Trên VPS:

```bash
cd /opt/meridian-mcn
tar -xzf /tmp/meridian-src.tar.gz
rm /tmp/meridian-src.tar.gz
```

---

## 3. Cấu hình `.env.prod`

```bash
cd /opt/meridian-mcn
cp .env.prod.example .env.prod
nano .env.prod
```

Điền:

| Biến | Giá trị gợi ý |
|---|---|
| `PUBLIC_DOMAIN` | `hfa0966545s.sn.mynetname.net` (đã có sẵn) |
| `ACME_EMAIL` | Email thật của bạn — Let's Encrypt gửi cảnh báo trước khi cert hết hạn |
| `POSTGRES_PASSWORD` | `openssl rand -base64 24 \| tr -d '=+/' \| cut -c1-24` |
| `JWT_SECRET` | `openssl rand -base64 48` (≥32 ký tự) |
| `MERIDIAN_API_TOKEN` | `openssl rand -hex 24` |
| `CORS_ORIGINS` | `https://hfa0966545s.sn.mynetname.net` |

Chạy 3 lệnh `openssl` đó ngay trong terminal để copy giá trị vào file:

```bash
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d '=+/' | cut -c1-24)"
echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
echo "MERIDIAN_API_TOKEN=$(openssl rand -hex 24)"
```

Khóa file:

```bash
chmod 600 .env.prod
```

---

## 4. Build và khởi động

```bash
cd /opt/meridian-mcn

# Build image lần đầu (~3–5 phút)
docker compose -f docker-compose.prod.yml --env-file .env.prod build

# Bật stack
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Theo dõi log realtime (Ctrl-C để thoát, không tắt container)
docker compose -f docker-compose.prod.yml logs -f --tail=200
```

Trong log Caddy bạn sẽ thấy:

```
obtaining certificate for hfa0966545s.sn.mynetname.net
...
certificate obtained successfully
```

Nếu bị `acme: error: 400` hoặc `connection refused` → quay lại Mục 1.3 kiểm tra NAT/DNS. Caddy sẽ tự retry sau vài giây.

### 4.1. Smoke test

```bash
# Từ chính VPS
curl -I  https://hfa0966545s.sn.mynetname.net           # HTTP 200 + HSTS header
curl -sS https://hfa0966545s.sn.mynetname.net/api/health || echo "health endpoint missing — that's fine"
curl -I  http://hfa0966545s.sn.mynetname.net            # 308 redirect → https

# Bên ngoài Internet
# Mở https://hfa0966545s.sn.mynetname.net trong trình duyệt → ổ khóa xanh + giao diện Meridian
```

### 4.2. Đăng nhập lần đầu

Tài khoản gốc đã được seed từ `backend/init.sql` (hoặc restore từ backup ở mục dưới).

---

## 5. Restore dữ liệu hiện tại (nếu cần)

Nếu bạn muốn deploy với dữ liệu đang có trên máy dev Windows:

### 5.1. Trên máy local (PowerShell)

```powershell
# Dump DB
docker exec meridian-postgres-v6 pg_dump -U meridian -d meridian -F c > meridian.dump

# Đóng gói uploads
docker cp meridian-backend-v6:/app/uploads .\uploads_export
tar -czf uploads.tar.gz -C .\uploads_export .

# Đẩy lên VPS
scp meridian.dump uploads.tar.gz <user>@<VPS_IP>:/tmp/
```

### 5.2. Trên VPS

```bash
cd /opt/meridian-mcn

# Đảm bảo stack đã up và DB đã healthy
docker compose -f docker-compose.prod.yml ps

# Drop & recreate schema để restore sạch
docker exec -i meridian-postgres psql -U meridian -d meridian \
  -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"

# Restore DB
docker exec -i meridian-postgres pg_restore \
  -U meridian -d meridian --no-owner --no-privileges < /tmp/meridian.dump

# Restore uploads
docker exec -i meridian-backend sh -c 'rm -rf /app/uploads && mkdir -p /app/uploads && tar -C /app/uploads -xzf -' \
  < /tmp/uploads.tar.gz

# Restart backend cho chắc
docker compose -f docker-compose.prod.yml restart backend
```

---

## 6. Backup tự động

### 6.1. Cấp quyền thực thi

```bash
chmod +x /opt/meridian-mcn/scripts/backup.sh
chmod +x /opt/meridian-mcn/scripts/restore.sh
```

### 6.2. Test thủ công

```bash
/opt/meridian-mcn/scripts/backup.sh
ls -lh /var/backups/meridian/
```

Mỗi snapshot là 1 thư mục theo timestamp chứa `meridian.dump`, `uploads.tar.gz`, `SHA256SUMS`, và bản sao `env.prod.bak`.

### 6.3. Cron 02:00 hàng ngày

```bash
crontab -e
```

Thêm:

```cron
0 2 * * * /opt/meridian-mcn/scripts/backup.sh >> /var/log/meridian-backup.log 2>&1
```

Mặc định retention 14 ngày. Đổi: `RETENTION_DAYS=30 ./scripts/backup.sh`.

### 6.4. (Khuyến nghị) Đẩy backup ra ngoài VPS

```bash
# Cài rclone, cấu hình remote 1 lần
sudo apt install -y rclone
rclone config         # tạo remote `mcn-bk` (S3/B2/Drive/...)

# Cron lúc 02:30: copy snapshot mới nhất ra ngoài
30 2 * * * rclone copy /var/backups/meridian mcn-bk:meridian-backups --max-age 25h
```

---

## 7. Release tự động (one-click)

Sau khi đã setup VPS lần đầu (Mục 1-6), mỗi lần release chỉ cần 1 lệnh trên máy local:

```powershell
.\scripts\release.ps1
```

Script sẽ tự động:

1. **Validate local**: TypeScript check backend, Vite build frontend (skip bằng `-SkipChecks`).
2. **Đóng gói** source thành tarball (loại bỏ `node_modules`, `dist`, `uploads`, `.git`).
3. **Upload** tarball + `remote_release.sh` lên VPS qua SFTP.
4. **Trên VPS**: backup DB+uploads → extract vào `/opt/meridian-mcn/releases/<TS>_<TAG>/` → copy `.env.prod` → `docker compose build` → recreate backend + frontend → wait healthy → smoke test → nếu pass: atomic symlink swap `current → releases/<NEW>`; nếu fail: tự **rollback** sang release trước.
5. **Smoke test phía local** (nếu cấu hình `SMOKE_URL` trong `.deploy/release.env`).

Tham số:

| Flag | Tác dụng |
|---|---|
| `-Tag <name>` | Đặt tên release, mặc định = git short SHA |
| `-SkipChecks` | Bỏ qua typecheck/lint/build (nguy hiểm, chỉ dùng khi đã verify) |
| `-SkipBackup` | Bỏ qua backup trước deploy (KHÔNG khuyến nghị) |

### 7.1. Rollback nhanh

```powershell
.\scripts\rollback.ps1                    # liệt kê releases rồi prompt chọn
.\scripts\rollback.ps1 -To 2026-05-11_15-01-04_abc1234
.\scripts\rollback.ps1 -To _legacy        # về layout flat ban đầu
```

Rollback chỉ flip symlink + recreate container — **không** restore DB. Nếu muốn restore DB, dùng `scripts/restore.sh` với 1 snapshot cụ thể trong `/var/backups/meridian/`.

### 7.2. Layout `releases/` trên VPS

```
/opt/meridian-mcn/
├── current  → releases/<TS>_<TAG>/        ← symlink, đang chạy
├── releases/
│   ├── _legacy/                            ← snapshot từ layout flat ban đầu
│   ├── 2026-05-11_15-01-04_abc1234/
│   ├── 2026-05-11_16-30-22_v1.2.0/
│   └── ...  (giữ 5 release gần nhất, cũ hơn tự xóa)
├── .env.prod                               ← legacy, sẽ giữ để rollback an toàn
└── .last_release                           ← timestamp + tag của release cuối
```

Mỗi release là 1 cây source độc lập có riêng `.env.prod` (clone từ release trước, secrets không thay đổi). Postgres data sống trên Docker named volume `meridian-mcn_pgdata` được share giữa các release nhờ pin `COMPOSE_PROJECT_NAME=meridian-mcn`.

### 7.3. Update code lên VPS (thủ công, fallback)

```bash
cd /opt/meridian-mcn

# 1. Backup trước khi đụng gì
./scripts/backup.sh

# 2. Lấy code mới
git pull --ff-only
# hoặc: scp tarball mới rồi extract đè lên

# 3. Rebuild + restart (Postgres không động vào, mất kết nối < 5s)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

# 4. Theo dõi
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend frontend
```

### 7.1. Khi có migration SQL mới

Migration không tự chạy. Áp tay:

```bash
# Ví dụ áp file 015
docker cp backend/migrations/015_restore_violation_freeform.sql meridian-postgres:/tmp/m.sql
docker exec -i meridian-postgres psql -U meridian -d meridian -f /tmp/m.sql
```

Quy trình chuẩn: backup → áp migration → restart backend → smoke test.

---

## 8. Vận hành thường ngày

### 8.1. Lệnh nhanh

```bash
# Trạng thái 4 container
docker compose -f docker-compose.prod.yml ps

# Tail log từng service
docker compose -f docker-compose.prod.yml logs -f --tail=100 caddy
docker compose -f docker-compose.prod.yml logs -f --tail=100 backend

# Restart 1 service
docker compose -f docker-compose.prod.yml restart backend

# Tắt toàn bộ (không xoá volume)
docker compose -f docker-compose.prod.yml down

# Vào shell
docker exec -it meridian-backend  sh
docker exec -it meridian-postgres psql -U meridian -d meridian
```

### 8.2. Giới hạn log Docker

Đặt 1 lần để log không phình to:

```bash
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "50m", "max-file": "5" }
}
EOF

sudo systemctl restart docker
# Sau đó:
cd /opt/meridian-mcn
docker compose -f docker-compose.prod.yml --env-file .env.prod down
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Volume `pgdata` / `uploads_data` không bị mất khi `down` (chỉ `down -v` mới xoá).

---

## 9. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Caddy log `connection refused` khi xin cert | NAT 80/443 chưa thông từ Internet | Kiểm tra rule NAT MikroTik, dùng [check-host.net](https://check-host.net) ping port |
| Caddy log `acme: rate limited` | Xin cert quá nhiều lần (Let's Encrypt giới hạn 5 lần/tuần với cùng domain) | Đợi 1 tiếng, đừng `down/up` Caddy liên tục. Volume `caddy_data` giữ cert nên `restart` không xin lại |
| Trình duyệt `ERR_CONNECTION_TIMED_OUT` | UFW chặn 80/443, hoặc NAT MikroTik không trỏ đúng cổng | `sudo ufw status` + xem rule MikroTik |
| HTTPS OK nhưng login lỗi `Invalid token` | `JWT_SECRET` đổi sau khi user đã có token | User logout/login lại |
| API trả 502 Bad Gateway | Backend chưa healthy / chết | `docker compose logs backend`, thường do `DATABASE_URL` sai hoặc JWT_SECRET <32 ký tự |
| Cert hết hạn dù Caddy đang chạy | Volume `caddy_data` bị xoá | `docker volume ls`, restore từ backup nếu có; nếu không Caddy sẽ tự xin lại sau vài phút |
| FK violation, 4xx khi insert | Bình thường — đã được map từ SQLSTATE | Đọc `details` trong response để biết field nào sai |
| Hết disk | `du -sh /var/lib/docker/`, `du -sh /var/backups/meridian/` | `docker system prune -af` (KHÔNG `--volumes`), giảm `RETENTION_DAYS` |

### 9.1. Disaster recovery (VPS chết)

1. Dựng VPS mới, repeat Mục 1–3.
2. Pull backup từ rclone remote (hoặc scp từ máy khác).
3. `docker compose up -d` (DB rỗng).
4. `./scripts/restore.sh /path/to/<DATE>`.
5. Cập nhật DDNS MikroTik trỏ về VPS mới (nếu IP đổi).
6. Đợi DNS propagate, Caddy tự xin cert mới khi user đầu tiên truy cập.

---

## 10. Checklist trước khi golive

- [ ] `dig +short hfa0966545s.sn.mynetname.net` trả về IP public đúng.
- [ ] Từ máy ngoài Internet, `telnet <domain> 80` và `telnet <domain> 443` đều mở.
- [ ] `.env.prod` đã đổi **toàn bộ** giá trị `CHANGE_ME_*`, `chmod 600`.
- [ ] `CORS_ORIGINS` = `https://hfa0966545s.sn.mynetname.net` (không slash cuối).
- [ ] `docker compose ps` cả 4 service (caddy/frontend/backend/postgres) đều `Up`/`healthy`.
- [ ] Caddy log có dòng `certificate obtained successfully`.
- [ ] `curl -I https://hfa0966545s.sn.mynetname.net` trả `200 OK` + header `Strict-Transport-Security`.
- [ ] Cron backup đã thêm, chạy thử OK trong `/var/log/meridian-backup.log`.
- [ ] Đã thử restore vào DB tạm để chắc backup hoạt động.
- [ ] Đổi password Super Admin sau khi đăng nhập lần đầu.
- [ ] `.env.prod` + snapshot backup ban đầu đã lưu ở chỗ thứ 2 (password manager / object storage).

---

## 11. Khi cần thêm domain phụ

Sửa `Caddyfile`, đổi block site thành:

```caddy
hfa0966545s.sn.mynetname.net, app.your-custom-domain.com {
    ...
}
```

Và thêm domain mới vào `CORS_ORIGINS`:

```env
CORS_ORIGINS=https://hfa0966545s.sn.mynetname.net,https://app.your-custom-domain.com
```

Rồi `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`. Caddy tự xin cert cho domain mới ngay.
