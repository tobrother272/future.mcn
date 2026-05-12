# 🔧 Meridian MCN — Kế hoạch Viết lại (v6.0)

> **Mục tiêu:** Tách monolithic `App.jsx` (15,165 dòng) thành kiến trúc module hóa, dùng database quan hệ thật (PostgreSQL với foreign keys) thay vì JSON blob, áp dụng TypeScript + state management hiện đại.
>
> **Phạm vi:** Frontend (React + Vite) + Backend (Node.js + Express + PostgreSQL) + Docker.
>
> **Tệp này dùng cho:** Mở trong **Cursor** → AI/dev sẽ implement từng module theo plan.

---

## 📋 Mục lục

1. [Phân tích hiện trạng](#1-phân-tích-hiện-trạng)
2. [Mục tiêu rewrite](#2-mục-tiêu-rewrite)
3. [Tech stack mới](#3-tech-stack-mới)
4. [Sơ đồ liên kết dữ liệu](#4-sơ-đồ-liên-kết-dữ-liệu)
5. [Database schema chi tiết](#5-database-schema-chi-tiết)
6. [Cấu trúc thư mục](#6-cấu-trúc-thư-mục)
7. [API endpoints](#7-api-endpoints)
8. [Module breakdown — Frontend](#8-module-breakdown--frontend)
9. [Migration roadmap (6 giai đoạn)](#9-migration-roadmap)
10. [Quy ước code](#10-quy-ước-code)
11. [Checklist hoàn thành](#11-checklist-hoàn-thành)

---

## 1. Phân tích hiện trạng

### Vấn đề kiến trúc

| Vấn đề | Mô tả | Hậu quả |
|---|---|---|
| **Monolithic file** | 1 file `App.jsx` 15,165 dòng, 36+ view component | Khó tìm code, build chậm, hot reload lag |
| **JSON blob storage** | Toàn bộ state lưu trong 1 row JSONB ở PostgreSQL | Không query được theo điều kiện, không có relational integrity, không index được field |
| **No foreign keys** | Quan hệ CMS↔Channel↔Partner chỉ qua tên string (`c.partner === p.name`) | Khi đổi tên CMS → mất data, không cascade update |
| **No type safety** | Pure JavaScript, không có schema validation | Bug runtime, không auto-complete |
| **State trong React** | `useState` cho 13+ array lớn, prop drilling sâu | Re-render lan khắp nơi, performance kém |
| **Routing string-based** | `[active, setActive] = useState("overview")` | Không có URL deep-link, không có browser history |
| **Phân tán logic** | Workflow logic, RBAC, AI prompts đều inline trong components | Khó test, khó reuse |
| **Localstorage làm cache lõi** | App load từ localStorage trước, sync backend sau | Conflict khi multi-user, mất data khi clear browser |
| **Auth client-side** | Hash password ở browser, lưu token trong localStorage | Không có session server, không có CSRF protection |
| **Sync ép buộc** | Mỗi `setState` → debounced `lsSet` → push toàn bộ blob lên backend | Bandwidth lãng phí, race condition khi 2 user cùng sửa |

### Điểm còn dùng được

- ✅ Design system (màu sắc, typography Fraunces+JetBrains Mono, layout)
- ✅ Logic phân tích AI (prompts, cache 3 lớp, prompt caching)
- ✅ Workflow state machine (`SUBMISSION_STATES`)
- ✅ RBAC catalog (`PERMS`, `can()`)
- ✅ Vietnamese i18n strings

---

## 2. Mục tiêu rewrite

### Phải đạt

1. **Modular** — mỗi feature nằm trong 1 folder, max 500 dòng/file
2. **Type-safe** — TypeScript strict mode, schema validation với zod
3. **Relational data** — PostgreSQL với foreign keys, indexes, không còn JSON blob cho data chính
4. **REST API thật** — endpoints theo resource, không còn `/api/store/*`
5. **Server-side auth** — JWT với httpOnly cookie, refresh token, session table
6. **Query-driven UI** — TanStack Query thay cho useState, auto-refetch, optimistic updates
7. **URL routing** — React Router v6, deep-linkable, browser back/forward
8. **Performance** — code splitting per route, lazy load views
9. **Testable** — unit test cho services + hooks, integration test cho API
10. **Backward-compat migration** — script chuyển dữ liệu từ JSON blob sang bảng quan hệ

### Không nên làm (giữ nguyên)

- ❌ Không thay đổi UX/UI tổng thể (giữ design hiện tại)
- ❌ Không bỏ AI Strategic / Browser AI fallback
- ❌ Không thay i18n (vẫn vi/en)
- ❌ Không bỏ Partner Portal isolation
- ❌ Không thay PostgreSQL bằng DB khác

---

## 3. Tech stack mới

### Frontend

| Layer | Hiện tại | Mới | Lý do |
|---|---|---|---|
| Framework | React 18 + Vite | **React 18 + Vite** | Giữ |
| Language | JavaScript | **TypeScript 5.x strict** | Type safety |
| Styling | Inline `style={}` | **Inline + CSS Modules cho phức tạp** | Giữ design, tách style lớn |
| State (UI) | `useState` | **Zustand 4.x** | Lightweight, ko boilerplate |
| State (Server) | Manual fetch + setState | **TanStack Query v5** | Cache, refetch, optimistic |
| Routing | String state | **React Router v6.20+** | URL-driven, lazy routes |
| Forms | Manual | **react-hook-form + zod** | Validation, perf |
| Charts | Recharts | **Recharts** | Giữ |
| Icons | lucide-react | **lucide-react** | Giữ |
| Date | Native Date | **date-fns 3.x** | Tree-shakeable, i18n |
| HTTP | fetch | **ky** (fetch wrapper) | Retry, timeout, hooks |

### Backend

| Layer | Hiện tại | Mới | Lý do |
|---|---|---|---|
| Runtime | Node.js 20 | **Node.js 20 LTS** | Giữ |
| Framework | Express 4 | **Express 4** | Giữ (đơn giản, đủ dùng) |
| DB | PostgreSQL 16 (JSONB blob) | **PostgreSQL 16 (relational)** | Foreign keys, indexes |
| Query builder | Raw SQL | **Kysely** (type-safe SQL) | Type-safe, ít abstraction |
| Migrations | Manual `init.sql` | **node-pg-migrate** | Versioned, rollback |
| Validation | Manual | **zod** (shared với frontend) | Single source of truth |
| Auth | Custom token | **jose** (JWT) + bcrypt | Standard, secure |
| Logging | console.log | **pino** | Structured, fast |
| Rate limit | Custom Map | **express-rate-limit + rate-limit-redis** | Distributed |
| Testing | None | **vitest + supertest** | API tests |

### DevOps

- ✅ Docker Compose (giữ)
- ➕ **GitHub Actions** CI/CD (test → build → deploy)
- ➕ **Sentry** error tracking (frontend + backend)
- ➕ **OpenTelemetry** tracing (optional)

---

## 4. Sơ đồ liên kết dữ liệu

### Sơ đồ ER (Entity-Relationship)

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│     CMS     │         │   PARTNER    │         │ PARTNER_USER│
│─────────────│         │──────────────│  1:N    │─────────────│
│ id (PK)     │         │ id (PK)      ├────────▶│ id (PK)     │
│ name        │         │ name         │         │ partner_id  │
│ currency    │         │ type         │         │ email       │
│ status      │         │ tier         │         │ status      │
│ created_at  │         │ rev_share    │         │ created_at  │
└──────┬──────┘         │ status       │         └─────────────┘
       │                └──────┬───────┘
       │ 1:N                   │ 1:N
       ▼                       ▼
┌─────────────┐         ┌─────────────────┐
│    TOPIC    │         │    CONTRACT     │
│─────────────│         │─────────────────│
│ id (PK)     │         │ id (PK)         │
│ cms_id (FK) │         │ partner_id (FK) │
│ name        │         │ start_date      │
│ dept        │         │ end_date        │
└─────────────┘         │ rev_share       │
                        │ status          │
                        └────────┬────────┘
                                 │ N:M
                                 ▼
┌─────────────────────────────────────────┐
│            CHANNEL                       │
│─────────────────────────────────────────│
│ id (PK)                                 │
│ cms_id (FK → CMS)                       │
│ partner_id (FK → PARTNER) nullable      │
│ topic_id (FK → TOPIC) nullable          │
│ yt_id (UNIQUE)                          │
│ name                                    │
│ status (Active|Pending|Suspended)       │
│ monetization (Monetized|Demonetized|...)│
│ health (Healthy|Warning|Critical)       │
│ subscribers, monthly_views, ...         │
└──────┬──────────────────────────────────┘
       │
       ├───────────────────┐
       │ 1:N               │ 1:N
       ▼                   ▼
┌─────────────┐    ┌──────────────────┐
│  VIOLATION  │    │   SUBMISSION     │
│─────────────│    │──────────────────│
│ id (PK)     │    │ id (PK)          │
│ channel_id  │    │ channel_id (FK)  │
│ type        │    │ partner_user_id  │
│ severity    │    │ workflow_state   │
│ status      │    │ video_url        │
└─────────────┘    │ storage_url      │
                   └──────────────────┘

┌─────────────────────────────────────────┐
│       REVENUE_DAILY (time-series)       │
│─────────────────────────────────────────│
│ id (PK)                                 │
│ scope (cms|channel|partner)             │
│ scope_id (cms_id|channel_id|partner_id) │
│ snapshot_date                           │
│ currency                                │
│ revenue, views, subscribers             │
│ source (auto|manual|import)             │
│ UNIQUE(scope, scope_id, snapshot_date)  │
└─────────────────────────────────────────┘

┌──────────────┐        ┌──────────────┐
│CONTRACT_     │        │   USER       │
│CHANNEL (M:N) │        │ (internal)   │
│──────────────│        │──────────────│
│contract_id   │        │ id (PK)      │
│channel_id    │        │ email        │
│assigned_at   │        │ role         │
└──────────────┘        │ status       │
                        └──────────────┘
```

### Quan hệ chi tiết

#### CMS → Channel (1:N)
- 1 CMS có nhiều kênh (KUDO Future có 100+ kênh)
- Khi xóa CMS: kênh **không** bị xóa (set null `cms_id`)
- Index: `idx_channels_cms_id`

#### Partner → Channel (1:N)
- 1 Partner sở hữu nhiều kênh
- Khi xóa Partner: kênh **không** bị xóa (set null `partner_id`, status = "Orphaned")
- Trigger: tự động cập nhật `partner.channel_count` khi insert/delete channel

#### Partner → Contract (1:N)
- 1 Partner có nhiều hợp đồng (theo period)
- Khi xóa Partner: cascade xóa contracts (RESTRICT thực ra — yêu cầu xóa contract trước)

#### Contract ↔ Channel (M:N qua `contract_channel`)
- 1 hợp đồng cover nhiều kênh
- 1 kênh có thể trong nhiều hợp đồng theo thời gian
- Junction table: `contract_channel(contract_id, channel_id, assigned_at, ended_at)`

#### Partner → PartnerUser (1:N)
- 1 công ty có nhiều người đăng nhập (giám đốc, kế toán, content manager)
- `partner_user.partner_id` link tới `partner.id`
- Auto-link khi admin duyệt user (như đã implement)

#### Channel → Revenue (1:N)
- Mỗi kênh có lịch sử doanh thu daily/monthly
- Scope-based: 1 bảng `revenue_daily` chứa cả CMS-level, Channel-level, Partner-level (qua field `scope`)

#### Aggregation rules

```sql
-- Doanh thu CMS = SUM(channels của CMS đó)
SELECT cms_id, SUM(revenue) FROM revenue_daily
WHERE scope = 'channel' AND snapshot_date = CURRENT_DATE
GROUP BY cms_id;

-- Doanh thu Partner = SUM(channels của Partner đó)
SELECT partner_id, SUM(revenue) FROM revenue_daily rd
JOIN channels c ON rd.scope_id = c.id
WHERE rd.scope = 'channel' AND rd.snapshot_date = CURRENT_DATE
GROUP BY c.partner_id;

-- Doanh thu Contract = SUM(channels assigned cho contract)
SELECT cc.contract_id, SUM(rd.revenue)
FROM revenue_daily rd
JOIN contract_channel cc ON cc.channel_id = rd.scope_id
WHERE rd.scope = 'channel'
  AND rd.snapshot_date BETWEEN cc.assigned_at AND COALESCE(cc.ended_at, CURRENT_DATE)
GROUP BY cc.contract_id;
```

---

## 5. Database schema chi tiết

> File migration: `backend/migrations/001_init.sql` → `010_*.sql`

### 5.1 Bảng `cms`

```sql
CREATE TABLE cms (
  id            TEXT PRIMARY KEY,           -- "CMS01", "CMS02"
  name          TEXT NOT NULL UNIQUE,
  currency      TEXT NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD','VND','CAD','EUR','GBP','JPY','SGD','AUD')),
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended','Closed')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cms_status ON cms(status);
```

### 5.2 Bảng `topic`

```sql
CREATE TABLE topic (
  id            TEXT PRIMARY KEY,
  cms_id        TEXT REFERENCES cms(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  dept          TEXT,
  expected_channels INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cms_id, name)
);
CREATE INDEX idx_topic_cms ON topic(cms_id);
```

### 5.3 Bảng `partner`

```sql
CREATE TABLE partner (
  id            TEXT PRIMARY KEY,           -- "P0001"
  name          TEXT NOT NULL UNIQUE,
  email         TEXT,
  phone         TEXT,
  type          TEXT NOT NULL DEFAULT 'AFFILIATE' CHECK (type IN ('OWNED','PRODUCTION','AFFILIATE')),
  tier          TEXT NOT NULL DEFAULT 'Standard' CHECK (tier IN ('Premium','Standard','Basic')),
  rev_share     NUMERIC(5,2) DEFAULT 70.00,  -- % cho partner
  dept          TEXT,
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended','Terminated')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_partner_status ON partner(status);
CREATE INDEX idx_partner_type ON partner(type);
```

### 5.4 Bảng `partner_user` (login accounts)

```sql
CREATE TABLE partner_user (
  id            TEXT PRIMARY KEY,
  partner_id    TEXT REFERENCES partner(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  status        TEXT DEFAULT 'PendingApproval' CHECK (status IN ('PendingApproval','Active','Rejected','Suspended')),
  approved_by   TEXT,
  approved_at   TIMESTAMPTZ,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_partner_user_partner ON partner_user(partner_id);
CREATE INDEX idx_partner_user_status ON partner_user(status);
```

### 5.5 Bảng `user` (internal staff)

```sql
CREATE TABLE "user" (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN','QC_REVIEWER','CHANNEL_CREATOR','CONTENT_MANAGER','FINANCE_MANAGER','COMPLIANCE_MANAGER','VIEWER')),
  extra_roles   TEXT[],                     -- multi-role support
  status        TEXT DEFAULT 'Active' CHECK (status IN ('Active','Suspended')),
  mfa_enabled   BOOLEAN DEFAULT false,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.6 Bảng `contract`

```sql
CREATE TABLE contract (
  id            TEXT PRIMARY KEY,           -- "CT240001"
  partner_id    TEXT NOT NULL REFERENCES partner(id) ON DELETE RESTRICT,
  contract_name TEXT NOT NULL,
  type          TEXT CHECK (type IN ('OWNED','PRODUCTION','AFFILIATE')),
  start_date    DATE NOT NULL,
  end_date      DATE,
  signed_date   DATE,
  status        TEXT DEFAULT 'Active' CHECK (status IN ('Draft','Active','Expired','Terminated')),
  rev_share     NUMERIC(5,2),
  payment_terms TEXT DEFAULT 'Net 30',
  monthly_minimum NUMERIC(14,2) DEFAULT 0,
  terms         TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_contract_partner ON contract(partner_id);
CREATE INDEX idx_contract_status ON contract(status);
CREATE INDEX idx_contract_dates ON contract(start_date, end_date);
```

### 5.7 Bảng `channel`

```sql
CREATE TABLE channel (
  id              TEXT PRIMARY KEY,         -- "C00001"
  cms_id          TEXT REFERENCES cms(id) ON DELETE SET NULL,
  partner_id      TEXT REFERENCES partner(id) ON DELETE SET NULL,
  topic_id        TEXT REFERENCES topic(id) ON DELETE SET NULL,
  yt_id           TEXT UNIQUE,              -- YouTube channel ID
  name            TEXT NOT NULL,
  country         TEXT DEFAULT 'VN',
  status          TEXT DEFAULT 'Active' CHECK (status IN ('Active','Pending','Suspended','Terminated')),
  monetization    TEXT DEFAULT 'Pending' CHECK (monetization IN ('Monetized','Demonetized','Suspended','Pending')),
  health          TEXT DEFAULT 'Healthy' CHECK (health IN ('Healthy','Warning','Critical')),
  strikes         INTEGER DEFAULT 0,
  subscribers     BIGINT DEFAULT 0,
  monthly_views   BIGINT DEFAULT 0,
  monthly_revenue NUMERIC(14,2) DEFAULT 0,
  notes           TEXT,
  metadata        JSONB DEFAULT '{}'::jsonb, -- flexible extra fields
  submitted_by    TEXT REFERENCES partner_user(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_channel_cms ON channel(cms_id);
CREATE INDEX idx_channel_partner ON channel(partner_id);
CREATE INDEX idx_channel_topic ON channel(topic_id);
CREATE INDEX idx_channel_status ON channel(status);
CREATE INDEX idx_channel_yt ON channel(yt_id);
```

### 5.8 Bảng `contract_channel` (M:N)

```sql
CREATE TABLE contract_channel (
  contract_id   TEXT REFERENCES contract(id) ON DELETE CASCADE,
  channel_id    TEXT REFERENCES channel(id) ON DELETE CASCADE,
  assigned_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  ended_at      DATE,
  PRIMARY KEY (contract_id, channel_id, assigned_at)
);
CREATE INDEX idx_contract_channel_contract ON contract_channel(contract_id);
CREATE INDEX idx_contract_channel_channel ON contract_channel(channel_id);
```

### 5.9 Bảng `submission` (workflow)

```sql
CREATE TABLE submission (
  id              TEXT PRIMARY KEY,
  channel_id      TEXT REFERENCES channel(id) ON DELETE SET NULL,
  partner_user_id TEXT REFERENCES partner_user(id) ON DELETE SET NULL,
  workflow_state  TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (workflow_state IN ('DRAFT','SUBMITTED','QC_REVIEWING','QC_REJECTED','QC_APPROVED','CHANNEL_PROVISIONING','PROVISIONING_FAILED','ACTIVE')),
  video_title     TEXT NOT NULL,
  video_url       TEXT,
  storage_type    TEXT,                     -- drive | nas | dropbox | ...
  storage_url     TEXT,
  description     TEXT,
  category        TEXT,
  product_info    TEXT,
  license         TEXT,
  qc_inspection   JSONB,                    -- checklist results
  admin_note      TEXT,
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submission_state ON submission(workflow_state);
CREATE INDEX idx_submission_partner_user ON submission(partner_user_id);
CREATE INDEX idx_submission_channel ON submission(channel_id);

CREATE TABLE submission_log (
  id              BIGSERIAL PRIMARY KEY,
  submission_id   TEXT REFERENCES submission(id) ON DELETE CASCADE,
  from_state      TEXT,
  to_state        TEXT NOT NULL,
  by_user_id      TEXT,
  by_email        TEXT,
  by_role         TEXT,
  note            TEXT,
  ts              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_submission_log_sub ON submission_log(submission_id, ts DESC);
```

### 5.10 Bảng `violation`

```sql
CREATE TABLE violation (
  id            TEXT PRIMARY KEY,
  channel_id    TEXT REFERENCES channel(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,              -- COPYRIGHT, COMMUNITY_GUIDELINES, ...
  severity      TEXT CHECK (severity IN ('Low','Medium','High','Critical')),
  status        TEXT DEFAULT 'Active' CHECK (status IN ('Active','Resolved','Appealed','Dismissed')),
  video_title   TEXT,
  video_url     TEXT,
  detected_date DATE,
  resolved_date DATE,
  notes         TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_violation_channel ON violation(channel_id);
CREATE INDEX idx_violation_status ON violation(status);
CREATE INDEX idx_violation_date ON violation(detected_date DESC);
```

### 5.11 Bảng `revenue_daily` (time-series, polymorphic scope)

```sql
CREATE TABLE revenue_daily (
  id              BIGSERIAL PRIMARY KEY,
  scope           TEXT NOT NULL CHECK (scope IN ('cms','channel','partner','contract')),
  scope_id        TEXT NOT NULL,
  snapshot_date   DATE NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'USD',
  revenue         NUMERIC(14,2) DEFAULT 0,
  views           BIGINT DEFAULT 0,
  subscribers     BIGINT DEFAULT 0,
  channels_count  INTEGER DEFAULT 0,        -- chỉ ý nghĩa cho scope=cms,partner
  active_channels INTEGER DEFAULT 0,
  source          TEXT DEFAULT 'auto' CHECK (source IN ('auto','manual','import','adsense','youtube_api')),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope, scope_id, snapshot_date)
);
CREATE INDEX idx_revenue_scope_date ON revenue_daily(scope, scope_id, snapshot_date DESC);
CREATE INDEX idx_revenue_date ON revenue_daily(snapshot_date DESC);
```

### 5.12 Các bảng khác

```sql
-- Hệ thống
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_email TEXT,
  resource_type TEXT,
  resource_id TEXT,
  detail JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE comment (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,                -- submission|violation|contract|channel|partner
  entity_id TEXT NOT NULL,
  parent_id TEXT REFERENCES comment(id) ON DELETE CASCADE,  -- threading
  author_id TEXT NOT NULL,
  author_email TEXT,
  author_name TEXT,
  body TEXT NOT NULL,
  mentions TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_comment_entity ON comment(entity_type, entity_id);

CREATE TABLE notification (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('internal','partner')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notification_user ON notification(user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE partner_alert (
  id TEXT PRIMARY KEY,
  partner_id TEXT REFERENCES partner(id) ON DELETE CASCADE,
  partner_user_id TEXT REFERENCES partner_user(id) ON DELETE SET NULL,
  channel_id TEXT REFERENCES channel(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT,
  required_action TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent','read','resolved')),
  sent_by TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE policy_update (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  audience TEXT DEFAULT 'all' CHECK (audience IN ('all','specific_partners','internal_only')),
  audience_partner_ids TEXT[],
  published_by TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE decision_log (
  id TEXT PRIMARY KEY,
  decision_type TEXT,
  title TEXT NOT NULL,
  context TEXT,
  decision TEXT,
  rationale TEXT,
  outcome TEXT,
  decided_by TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE import_history (
  id BIGSERIAL PRIMARY KEY,
  file_name TEXT,
  file_hash TEXT UNIQUE,
  file_type TEXT,
  row_count INTEGER,
  imported_by TEXT,
  imported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE setting (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE session (
  id TEXT PRIMARY KEY,                      -- session token
  user_id TEXT NOT NULL,
  user_type TEXT CHECK (user_type IN ('internal','partner')),
  ip TEXT,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_session_expires ON session(expires_at);
```

### 5.13 Triggers + Materialized Views

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_timestamp_cms BEFORE UPDATE ON cms FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();
-- ... cho tất cả bảng khác

-- Materialized view: dashboard summary (refresh mỗi 5 phút)
CREATE MATERIALIZED VIEW mv_dashboard_summary AS
SELECT
  c.cms_id,
  cm.name AS cms_name,
  cm.currency,
  COUNT(c.id) AS total_channels,
  COUNT(c.id) FILTER (WHERE c.status = 'Active') AS active_channels,
  COUNT(c.id) FILTER (WHERE c.monetization = 'Demonetized') AS demonetized,
  SUM(c.monthly_revenue) AS total_monthly_revenue,
  SUM(c.subscribers) AS total_subscribers
FROM channel c
JOIN cms cm ON c.cms_id = cm.id
GROUP BY c.cms_id, cm.name, cm.currency;

CREATE UNIQUE INDEX ON mv_dashboard_summary (cms_id);
```

---

## 6. Cấu trúc thư mục

### 6.1 Frontend (`frontend/`)

```
frontend/
├── src/
│   ├── api/                          # API client (TanStack Query hooks + ky)
│   │   ├── client.ts                 # ky instance with auth + retry
│   │   ├── cms.api.ts                # GET/POST/PUT cms
│   │   ├── channels.api.ts
│   │   ├── partners.api.ts
│   │   ├── contracts.api.ts
│   │   ├── submissions.api.ts
│   │   ├── revenue.api.ts
│   │   ├── violations.api.ts
│   │   ├── auth.api.ts
│   │   └── index.ts                  # re-exports
│   │
│   ├── components/                   # Shared UI
│   │   ├── ui/                       # Atomic
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Pill.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Field.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── StatusDot.tsx
│   │   │   └── index.ts
│   │   ├── charts/
│   │   │   ├── RevenueLineChart.tsx
│   │   │   ├── ComparisonBarChart.tsx
│   │   │   ├── HealthGauge.tsx
│   │   │   └── PieBreakdown.tsx
│   │   ├── data-table/
│   │   │   ├── DataTable.tsx         # generic sortable/filterable
│   │   │   └── columns.ts
│   │   ├── forms/
│   │   │   ├── FormField.tsx
│   │   │   ├── FormSelect.tsx
│   │   │   └── useZodForm.ts
│   │   ├── markdown/
│   │   │   └── SafeMarkdown.tsx
│   │   ├── notifications/
│   │   │   ├── NotificationBell.tsx
│   │   │   └── ToastContainer.tsx
│   │   ├── feedback/
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── sync-status/
│   │   │   └── SyncStatusBadge.tsx
│   │   └── comments/
│   │       └── CommentsThread.tsx
│   │
│   ├── features/                     # 1 folder = 1 feature
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── PartnerRegisterForm.tsx
│   │   │   │   └── FirstSetupForm.tsx
│   │   │   ├── pages/
│   │   │   │   └── AuthPage.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── useCurrentUser.ts
│   │   │   ├── stores/
│   │   │   │   └── authStore.ts      # Zustand
│   │   │   └── schemas/
│   │   │       └── auth.schema.ts    # zod
│   │   │
│   │   ├── cms/
│   │   │   ├── components/
│   │   │   │   ├── CmsCard.tsx
│   │   │   │   ├── CmsForm.tsx
│   │   │   │   ├── CmsHistoryChart.tsx
│   │   │   │   └── CmsVariationTable.tsx
│   │   │   ├── pages/
│   │   │   │   ├── CmsListPage.tsx
│   │   │   │   ├── CmsDetailPage.tsx
│   │   │   │   └── CmsHistoryPage.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useCmsAnalysis.ts
│   │   │   └── schemas/
│   │   │       └── cms.schema.ts
│   │   │
│   │   ├── channels/
│   │   │   ├── components/
│   │   │   │   ├── ChannelCard.tsx
│   │   │   │   ├── ChannelForm.tsx
│   │   │   │   ├── ChannelTable.tsx
│   │   │   │   ├── ChannelDetailPanel.tsx
│   │   │   │   └── BulkEditDrawer.tsx
│   │   │   ├── pages/
│   │   │   │   ├── ChannelListPage.tsx
│   │   │   │   └── ChannelDetailPage.tsx
│   │   │   └── hooks/
│   │   │       └── useChannelFilters.ts
│   │   │
│   │   ├── partners/
│   │   │   ├── components/
│   │   │   │   ├── PartnerProfileCard.tsx     # unified profile
│   │   │   │   ├── PartnerForm.tsx
│   │   │   │   ├── PartnerLifecyclePipeline.tsx
│   │   │   │   └── PartnerStatsKPI.tsx
│   │   │   ├── pages/
│   │   │   │   └── PartnerWorkflowPage.tsx    # tab unified
│   │   │   └── hooks/
│   │   │       └── useUnifiedPartners.ts
│   │   │
│   │   ├── contracts/
│   │   │   ├── components/
│   │   │   │   ├── ContractCard.tsx
│   │   │   │   ├── ContractForm.tsx
│   │   │   │   └── ContractChannelAssign.tsx
│   │   │   └── pages/
│   │   │       └── ContractListPage.tsx
│   │   │
│   │   ├── workflow/                 # QC + provisioning
│   │   │   ├── components/
│   │   │   │   ├── SubmissionCard.tsx
│   │   │   │   ├── QcChecklistModal.tsx
│   │   │   │   ├── ProvisioningModal.tsx
│   │   │   │   └── WorkflowStateMachine.tsx
│   │   │   ├── lib/
│   │   │   │   └── stateMachine.ts   # SUBMISSION_STATES + canAdvance
│   │   │   └── pages/
│   │   │       ├── QcQueuePage.tsx
│   │   │       └── ProvisioningQueuePage.tsx
│   │   │
│   │   ├── revenue/                  # NEW unified revenue module
│   │   │   ├── components/
│   │   │   │   ├── RevenueByCmsChart.tsx
│   │   │   │   ├── RevenueByPartnerChart.tsx
│   │   │   │   ├── RevenueByChannelTable.tsx
│   │   │   │   ├── DailyTrendChart.tsx
│   │   │   │   ├── PeriodComparison.tsx
│   │   │   │   └── CurrencyToggle.tsx
│   │   │   ├── pages/
│   │   │   │   └── RevenueDashboardPage.tsx
│   │   │   └── hooks/
│   │   │       ├── useRevenueByScope.ts
│   │   │       └── useRevenueVariation.ts
│   │   │
│   │   ├── compliance/
│   │   │   ├── components/
│   │   │   │   ├── ViolationCard.tsx
│   │   │   │   ├── ViolationForm.tsx
│   │   │   │   └── EmailParserModal.tsx
│   │   │   └── pages/
│   │   │       └── CompliancePage.tsx
│   │   │
│   │   ├── analytics/
│   │   │   ├── components/
│   │   │   │   ├── PeriodSelector.tsx
│   │   │   │   └── KpiCards.tsx
│   │   │   └── pages/
│   │   │       ├── DashboardPage.tsx
│   │   │       ├── ReportsPage.tsx
│   │   │       └── DecisionLogPage.tsx
│   │   │
│   │   ├── ai/
│   │   │   ├── lib/
│   │   │   │   ├── claudeClient.ts        # API wrapper
│   │   │   │   ├── browserAi.ts           # window.ai fallback
│   │   │   │   ├── promptCache.ts         # 3-layer cache
│   │   │   │   └── prompts/               # tách prompts ra file riêng
│   │   │   │       ├── cmsAnalysis.prompt.ts
│   │   │   │       ├── strategicAnalysis.prompt.ts
│   │   │   │       └── emailParser.prompt.ts
│   │   │   ├── components/
│   │   │   │   ├── AiPanel.tsx
│   │   │   │   └── AiResponseRenderer.tsx
│   │   │   └── pages/
│   │   │       ├── AiAgentPage.tsx
│   │   │       └── AiStrategyPage.tsx
│   │   │
│   │   ├── settings/
│   │   │   ├── components/
│   │   │   │   ├── BrandingTab.tsx
│   │   │   │   ├── UserManagementTab.tsx
│   │   │   │   ├── IntegrationsTab.tsx
│   │   │   │   └── DataManagementTab.tsx
│   │   │   └── pages/
│   │   │       └── SettingsPage.tsx
│   │   │
│   │   ├── inbox/
│   │   │   └── pages/InboxPage.tsx        # smart inbox
│   │   │
│   │   ├── rbac/
│   │   │   ├── lib/
│   │   │   │   ├── permissions.ts         # PERMS catalog
│   │   │   │   └── rbac.ts                # can() helper
│   │   │   └── pages/
│   │   │       └── RbacAuditPage.tsx
│   │   │
│   │   ├── import/
│   │   │   ├── components/
│   │   │   │   ├── FileUploader.tsx
│   │   │   │   └── ImportPreview.tsx
│   │   │   ├── lib/
│   │   │   │   └── detectors.ts           # FILE_TYPE_DETECTORS
│   │   │   └── pages/
│   │   │       └── ImportPage.tsx
│   │   │
│   │   └── partner-portal/                # tách hoàn toàn khỏi admin
│   │       ├── pages/
│   │       │   ├── PortalHomePage.tsx
│   │       │   ├── PortalChannelsPage.tsx
│   │       │   ├── PortalSubmitPage.tsx
│   │       │   ├── PortalContractsPage.tsx
│   │       │   ├── PortalAlertsPage.tsx
│   │       │   ├── PortalPolicyPage.tsx
│   │       │   └── PortalProfilePage.tsx
│   │       └── components/
│   │           └── PortalLayout.tsx
│   │
│   ├── hooks/                        # Cross-cutting hooks
│   │   ├── useDebounce.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useToast.ts
│   │   ├── useConfirm.ts
│   │   ├── useTheme.ts
│   │   ├── useTranslation.ts
│   │   └── useIdleTimeout.ts
│   │
│   ├── lib/                          # Pure utilities
│   │   ├── format.ts                 # fmt(), formatCurrency, formatDate
│   │   ├── crypto.ts                 # sha256, hashPwd
│   │   ├── dates.ts                  # date-fns wrappers
│   │   ├── currency.ts               # multi-currency aggregation
│   │   ├── colors.ts                 # palette
│   │   └── env.ts                    # env vars typed
│   │
│   ├── stores/                       # Global Zustand stores
│   │   ├── authStore.ts              # current user, session
│   │   ├── themeStore.ts             # branding colors
│   │   ├── settingsStore.ts          # user prefs
│   │   ├── notificationStore.ts      # toast queue
│   │   └── syncStore.ts              # backend sync status
│   │
│   ├── types/                        # Shared TS types (mirror DB)
│   │   ├── cms.ts
│   │   ├── channel.ts
│   │   ├── partner.ts
│   │   ├── contract.ts
│   │   ├── submission.ts
│   │   ├── revenue.ts
│   │   ├── user.ts
│   │   └── api.ts                    # API response wrappers
│   │
│   ├── routes/
│   │   ├── routes.tsx                # React Router config
│   │   ├── ProtectedRoute.tsx
│   │   ├── PartnerRoute.tsx          # PARTNER role only
│   │   └── AdminRoute.tsx            # internal users only
│   │
│   ├── styles/
│   │   ├── theme.ts                  # baseTheme (colors, typography)
│   │   ├── globalStyles.ts
│   │   └── tokens.ts                 # design tokens
│   │
│   ├── i18n/
│   │   ├── translations.ts           # vi + en
│   │   └── LanguageProvider.tsx
│   │
│   ├── App.tsx                       # < 100 lines, just providers + router
│   ├── main.tsx
│   └── vite-env.d.ts
│
├── public/
├── tests/                            # Vitest
│   ├── setup.ts
│   └── features/                     # mirror src/features structure
│
├── .env.example
├── tsconfig.json
├── vite.config.ts
├── package.json
└── Dockerfile
```

### 6.2 Backend (`backend/`)

```
backend/
├── src/
│   ├── routes/                       # Express routers, 1 file/resource
│   │   ├── cms.routes.ts
│   │   ├── channels.routes.ts
│   │   ├── partners.routes.ts
│   │   ├── partner-users.routes.ts
│   │   ├── contracts.routes.ts
│   │   ├── submissions.routes.ts
│   │   ├── revenue.routes.ts
│   │   ├── violations.routes.ts
│   │   ├── audit.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── notifications.routes.ts
│   │   ├── settings.routes.ts
│   │   └── index.ts                  # mount all
│   │
│   ├── controllers/                  # request handlers
│   │   ├── cms.controller.ts
│   │   └── ...                       # 1 per resource
│   │
│   ├── services/                     # business logic (no req/res)
│   │   ├── cms.service.ts
│   │   ├── channel.service.ts
│   │   ├── partner.service.ts
│   │   ├── revenue.service.ts        # tính tổng theo scope
│   │   ├── workflow.service.ts       # state machine
│   │   ├── auto-link.service.ts      # auto-link partner ↔ user
│   │   ├── snapshot.service.ts       # daily snapshot job
│   │   └── ai.service.ts             # AI orchestration
│   │
│   ├── models/                       # DB queries (Kysely)
│   │   ├── cms.model.ts
│   │   ├── channel.model.ts
│   │   └── ...
│   │
│   ├── middleware/
│   │   ├── auth.ts                   # JWT verify
│   │   ├── rbac.ts                   # check permissions
│   │   ├── rate-limit.ts
│   │   ├── error-handler.ts
│   │   ├── request-logger.ts
│   │   └── validate.ts               # zod schema validation
│   │
│   ├── db/
│   │   ├── pool.ts                   # pg.Pool
│   │   ├── kysely.ts                 # query builder
│   │   ├── types.ts                  # Kysely DB schema type
│   │   └── seed.ts                   # initial data (CMS list, etc.)
│   │
│   ├── jobs/                         # Background jobs
│   │   ├── daily-snapshot.job.ts     # cron: snapshot CMS/channel/partner
│   │   ├── refresh-mv.job.ts         # refresh materialized views
│   │   └── cleanup-sessions.job.ts
│   │
│   ├── schemas/                      # zod schemas (shared with FE qua @meridian/shared)
│   │   ├── cms.schema.ts
│   │   └── ...
│   │
│   ├── lib/
│   │   ├── jwt.ts
│   │   ├── password.ts               # bcrypt wrappers
│   │   ├── logger.ts                 # pino instance
│   │   ├── errors.ts                 # AppError classes
│   │   └── env.ts                    # validated env vars
│   │
│   ├── app.ts                        # Express app setup
│   └── server.ts                     # entry point
│
├── migrations/                       # node-pg-migrate
│   ├── 001_init_core_tables.sql
│   ├── 002_revenue_daily.sql
│   ├── 003_audit_session.sql
│   ├── 004_materialized_views.sql
│   └── ...
│
├── seeds/
│   ├── cms-kudo.sql                  # 8 CMS seed
│   └── topics-kudo.sql
│
├── tests/                            # Vitest + supertest
│   ├── routes/
│   ├── services/
│   └── helpers/
│
├── .env.example
├── tsconfig.json
├── package.json
└── Dockerfile
```

### 6.3 Shared (Optional — monorepo)

Nếu dùng pnpm workspace / Turborepo:

```
meridian-mcn/
├── apps/
│   ├── frontend/
│   ├── backend/
│   └── partner-portal/   # nếu tách hẳn (recommend giai đoạn 2)
├── packages/
│   ├── shared-types/     # TS types chung
│   ├── shared-schemas/   # zod schemas chung
│   └── ui/               # design system reusable
├── docker-compose.yml
├── pnpm-workspace.yaml
└── turbo.json
```

---

## 7. API endpoints

> Convention: REST với plural resource names. Auth qua `Authorization: Bearer <jwt>` header.

### 7.1 Auth

```
POST   /api/auth/login              { email, password } → { user, token }
POST   /api/auth/partner-register   { email, password, fullName, companyName, phone }
POST   /api/auth/first-setup        { email, password, fullName }    # only when no users
POST   /api/auth/logout
GET    /api/auth/me                 → current user info
POST   /api/auth/refresh            → new token
```

### 7.2 CMS

```
GET    /api/cms                     ?status=Active
GET    /api/cms/:id
POST   /api/cms                     [admin]
PUT    /api/cms/:id                 [admin]
DELETE /api/cms/:id                 [super_admin]
GET    /api/cms/:id/channels        # kênh thuộc CMS
GET    /api/cms/:id/topics
GET    /api/cms/:id/revenue         ?days=30  # daily history
GET    /api/cms/:id/stats           # summary KPIs
```

### 7.3 Channels

```
GET    /api/channels                ?cmsId=&partnerId=&status=&search=
GET    /api/channels/:id
POST   /api/channels                [content_manager+]
PUT    /api/channels/:id            [content_manager+, partner-self]
DELETE /api/channels/:id            [admin]
POST   /api/channels/bulk-edit      [content_manager+]
GET    /api/channels/:id/revenue    ?days=30
GET    /api/channels/:id/violations
GET    /api/channels/:id/submissions
GET    /api/channels/:id/timeline   # change history
```

### 7.4 Partners

```
GET    /api/partners                ?type=&tier=&status=
GET    /api/partners/:id
POST   /api/partners
PUT    /api/partners/:id
DELETE /api/partners/:id
GET    /api/partners/:id/users      # partner_user accounts
GET    /api/partners/:id/channels
GET    /api/partners/:id/contracts
GET    /api/partners/:id/revenue    ?days=30
GET    /api/partners/:id/profile    # unified profile (channels + contracts + users + KPI)
POST   /api/partners/auto-sync      [admin] # heal disconnected partner data
```

### 7.5 Partner Users

```
GET    /api/partner-users           ?status=PendingApproval
POST   /api/partner-users/:id/approve   # auto-link to partner record
POST   /api/partner-users/:id/reject
PUT    /api/partner-users/:id
```

### 7.6 Contracts

```
GET    /api/contracts               ?partnerId=&status=&from=&to=
GET    /api/contracts/:id
POST   /api/contracts               [finance_manager+]
PUT    /api/contracts/:id
DELETE /api/contracts/:id           [admin]
POST   /api/contracts/:id/channels  # assign channels
DELETE /api/contracts/:id/channels/:channelId
GET    /api/contracts/:id/revenue   # tổng từ channels assigned
```

### 7.7 Submissions / Workflow

```
GET    /api/submissions             ?state=&partnerId=&search=
GET    /api/submissions/:id
POST   /api/submissions             [partner role]
PUT    /api/submissions/:id/state   { toState, note, qcInspection? }
POST   /api/submissions/:id/provision { ytId, cmsId, topic } # creates channel + ACTIVE
GET    /api/submissions/:id/log     # state transitions
```

### 7.8 Revenue

```
GET    /api/revenue                 ?scope=cms&scopeId=CMS01&days=30
POST   /api/revenue/snapshot/all    [admin] # trigger snapshot all scopes
GET    /api/revenue/breakdown       ?by=cms|partner|channel&period=30d
GET    /api/revenue/comparison      ?scope=cms&from=2026-01-01&to=2026-02-01
GET    /api/revenue/variation       ?scope=cms&scopeId=CMS01  # 1d/7d/30d delta
```

### 7.9 Violations

```
GET    /api/violations              ?channelId=&status=&severity=
GET    /api/violations/:id
POST   /api/violations
PUT    /api/violations/:id
POST   /api/violations/parse-email  [compliance_manager+]
```

### 7.10 Notifications + Comments

```
GET    /api/notifications           ?unreadOnly=true
PUT    /api/notifications/:id/read
GET    /api/comments                ?entityType=&entityId=
POST   /api/comments
DELETE /api/comments/:id
```

### 7.11 Audit + System

```
GET    /api/audit                   ?actor=&action=&from=&to=
GET    /api/health
GET    /api/network-info            # LAN discovery
GET    /api/import-history
POST   /api/import                  # bulk import from file
GET    /api/settings                # system-wide
PUT    /api/settings/:key           [super_admin]
```

### 7.12 Conventions

- **Pagination**: `?page=1&limit=50` → response `{ items, total, page, limit, totalPages }`
- **Sorting**: `?sortBy=created_at&sortDir=desc`
- **Errors**: standard JSON `{ error: { code, message, details? } }`, HTTP status đúng (400/401/403/404/422/429/500)
- **Idempotency**: POST/PUT có header `Idempotency-Key` cho retry an toàn
- **Versioning**: prefix `/api/v1/` (nếu cần future migration)
- **Audit**: middleware tự động log mọi mutation vào `audit_log`

---

## 8. Module breakdown — Frontend

### 8.1 Mapping view cũ → module mới

| View hiện tại (App.jsx) | Dòng | Module mới | File |
|---|---|---|---|
| `OverviewPage` | 3864 | `analytics/pages` | `DashboardPage.tsx` |
| `TopicsView` | 4292 | `cms/components` | `TopicsTab.tsx` (sub of CmsDetail) |
| `ChannelsView` | 4435 | `channels/pages` | `ChannelListPage.tsx` |
| `PartnersView` | 5061 | `partners/components` | `PartnerListTable.tsx` (embedded only) |
| `ContractsView` | 5162 | `contracts/pages` | `ContractListPage.tsx` |
| `ChannelDetailModal` | 5637 | `channels/components` | `ChannelDetailDrawer.tsx` |
| `CmsDetailView` | 5883 | `cms/pages` | `CmsDetailPage.tsx` |
| `CmsView` | 6056 | `cms/pages` | `CmsListPage.tsx` |
| `CmsHistoryView` | 6614 | `cms/pages` | `CmsHistoryPage.tsx` |
| `FinanceView` | 7017 | `revenue/pages` | `RevenueDashboardPage.tsx` |
| `ReportsView` | 7192 | `analytics/pages` | `ReportsPage.tsx` |
| `PayoutsView` | 7843 | `revenue/components` | `PayoutsTab.tsx` |
| `DecisionLogView` | 8046 | `analytics/pages` | `DecisionLogPage.tsx` |
| `AnalyticsView` | 8263 | `analytics/pages` | `AnalyticsPage.tsx` (wrapper) |
| `AlertsView` | 8417 | `compliance/pages` | merge vào `CompliancePage` |
| `SettingsView` | 8647 | `settings/pages` | `SettingsPage.tsx` |
| `AIAgentView` | 9732 | `ai/pages` | `AiAgentPage.tsx` |
| `ComplianceView` | 10053 | `compliance/pages` | `CompliancePage.tsx` |
| `InspectionView` | 10718 | `workflow/components` | merge vào QC checklist |
| `PartnerManagementView` | 11300 | `partners/pages` | `PartnerWorkflowPage.tsx` |
| `RBACAuditView` | 12382 | `rbac/pages` | `RbacAuditPage.tsx` |
| `PartnerCommsView` | 12645 | `compliance/pages` | `PartnerCommsTab.tsx` |
| `AIStrategicView` | 13137 | `ai/pages` | `AiStrategyPage.tsx` |
| `PartnerPortal` | 13594 | `partner-portal/` | `PortalLayout.tsx` |
| `PartnerHomeView` | 13734 | `partner-portal/pages` | `PortalHomePage.tsx` |
| `PartnerChannelsView` | 13792 | `partner-portal/pages` | `PortalChannelsPage.tsx` |
| `PartnerSubmitView` | 13961 | `partner-portal/pages` | `PortalSubmitPage.tsx` |
| `PartnerAlertsView` | 14204 | `partner-portal/pages` | `PortalAlertsPage.tsx` |
| `PartnerPolicyView` | 14350 | `partner-portal/pages` | `PortalPolicyPage.tsx` |
| `PartnerProfileView` | 14432 | `partner-portal/pages` | `PortalProfilePage.tsx` |

### 8.2 Module mới (chưa có)

| Module | Mục đích |
|---|---|
| `revenue/` | Trang dashboard doanh thu CHUYÊN BIỆT — gộp Finance + Reports + Payouts + History |
| `import/` | Module import (đang nằm rời rạc trong `UnifiedImportView`) |
| `inbox/` | Smart Inbox tách riêng (đang trong `App.jsx` line 1565+) |

---

## 9. Migration roadmap

### Giai đoạn 1: Foundation (1 tuần)

**Mục tiêu:** Setup môi trường mới, không động vào code cũ.

- [ ] Tạo branch `rewrite-v6` từ `main`
- [ ] Init TypeScript: `tsconfig.json` strict mode
- [ ] Cài deps: zustand, @tanstack/react-query, react-router-dom, react-hook-form, zod, date-fns, ky
- [ ] Setup ESLint + Prettier + Husky pre-commit
- [ ] Setup Vitest + React Testing Library
- [ ] Backend: thêm Kysely, zod, jose, bcrypt, pino
- [ ] Tạo `migrations/` folder với node-pg-migrate
- [ ] Viết migration `001_init_core_tables.sql` (toàn bộ schema mục 5)
- [ ] Viết script `migrate-from-blob.ts` để chuyển dữ liệu từ JSON blob hiện tại sang relational
- [ ] Setup CI: GitHub Actions chạy lint + test trên mỗi PR

**Deliverable:** Folder structure mới có sẵn, migration scripts ready, CI green.

---

### Giai đoạn 2: Backend API (2 tuần)

**Mục tiêu:** Backend mới chạy song song với cũ qua khác port (vd 4001), test bằng Postman.

- [ ] Setup `app.ts`, `server.ts`, middleware (auth/rbac/rate-limit/error-handler/logger)
- [ ] Auth module: login/register/JWT/session table
- [ ] CMS endpoints (full CRUD + history)
- [ ] Channels endpoints (full CRUD + bulk + filters)
- [ ] Partners endpoints + auto-link service
- [ ] Partner users endpoints + approve/reject flow
- [ ] Contracts endpoints + channel assignment
- [ ] Submissions endpoints + state machine service
- [ ] Revenue endpoints + scope-based queries
- [ ] Violations endpoints + email parser
- [ ] Notifications + Comments endpoints
- [ ] Audit log middleware (tự động ghi mọi mutation)
- [ ] Daily snapshot job (cron: 00:05 UTC)
- [ ] Tests: ≥70% coverage cho services, integration test cho mỗi route

**Deliverable:** Backend mới complete, có Postman collection, có docs (Bruno/Insomnia/Swagger).

---

### Giai đoạn 3: Shared types + UI components (1 tuần)

**Mục tiêu:** Foundation FE — types, atoms, hooks chung.

- [ ] Generate TS types từ Kysely DB schema
- [ ] Tạo `types/api.ts` (response wrappers, error types)
- [ ] Migrate UI atomic: Button, Card, Modal, Pill, Input, Select, Field, EmptyState, StatusDot
- [ ] Migrate hooks chung: useDebounce, useLocalStorage, useToast, useConfirm, useTheme, useTranslation
- [ ] Tạo Zustand stores: authStore, themeStore, settingsStore, notificationStore
- [ ] Setup TanStack Query client + provider
- [ ] Setup React Router v6 với layout shell
- [ ] Setup ky API client với interceptors (auto-attach token, retry, refresh)
- [ ] SafeMarkdown component (XSS-safe)
- [ ] DataTable generic component (sort/filter/pagination)

**Deliverable:** App shell chạy được, có thể login + navigate (chưa có data thật).

---

### Giai đoạn 4: Migrate features (3-4 tuần)

**Thứ tự ưu tiên** — bắt đầu từ ít phụ thuộc nhất:

1. [ ] **Auth** (1 ngày) — đã có scaffolding ở giai đoạn 3
2. [ ] **CMS** (3 ngày) — list + detail + history (đã có CmsHistoryView)
3. [ ] **Topics** (1 ngày) — embed vào CMS detail
4. [ ] **Channels** (3 ngày) — list + filters + detail drawer + bulk edit
5. [ ] **Partners** (3 ngày) — unified profile (như đã làm ở v5.1) + auto-sync
6. [ ] **Contracts** (2 ngày) — list + form + channel assignment
7. [ ] **Workflow** (3 ngày) — submissions + QC checklist + provisioning + state machine
8. [ ] **Revenue** (3 ngày) — dashboard MỚI tổng hợp doanh thu theo CMS/Channel/Partner
9. [ ] **Compliance** (2 ngày) — violations + email parser + alerts to partners
10. [ ] **Analytics** (2 ngày) — dashboard, reports, decision log
11. [ ] **AI** (2 ngày) — Claude client + Browser AI fallback + prompts tách file
12. [ ] **RBAC Audit** (1 ngày)
13. [ ] **Settings** (2 ngày) — branding, users, integrations, data management
14. [ ] **Import** (2 ngày) — UnifiedImportView migrate
15. [ ] **Inbox** (1 ngày)
16. [ ] **Partner Portal** (3 ngày) — separate route tree

Mỗi feature follow checklist:
- Component split theo module
- Types từ shared
- API hook (TanStack Query) thay cho fetch trực tiếp
- Form với react-hook-form + zod
- Test cho hooks + components quan trọng

**Deliverable:** App mới feature-complete, parity với v5.1.

---

### Giai đoạn 5: Data migration + UAT (1 tuần)

**Mục tiêu:** Chuyển dữ liệu thật, song hành cũ-mới, user test.

- [ ] Chạy `migrate-from-blob.ts` trên staging DB
- [ ] Verify: tất cả channels/partners/contracts/submissions có integrity
- [ ] Smoke test toàn flow:
  - Partner đăng ký → admin duyệt → tạo kênh → gửi video → QC → cấp kênh → revenue snapshot
- [ ] Performance test: 500 channels, 50 partners, 1 năm revenue history
- [ ] Bug bash với team (1-2 ngày)
- [ ] Fix critical bugs

**Deliverable:** Staging stable, sẵn sàng deploy production.

---

### Giai đoạn 6: Cutover + cleanup (3 ngày)

- [ ] Backup production DB (toàn bộ)
- [ ] Chạy migration trên production (downtime ~30 phút)
- [ ] Deploy backend mới (port 4000, thay thế cũ)
- [ ] Deploy frontend mới (port 3010, thay thế cũ)
- [ ] Monitor Sentry + logs 48h
- [ ] Hotfix nếu có
- [ ] Xóa code cũ (`App.jsx` v5.1, `server.js` v1.x)
- [ ] Update README.md + ARCHITECTURE.md
- [ ] Tag release `v6.0.0`

**Deliverable:** Production chạy v6, codebase sạch.

---

## 10. Quy ước code

### 10.1 TypeScript

- **Strict mode** bắt buộc: `"strict": true`, `"noUncheckedIndexedAccess": true`
- **No `any`** — dùng `unknown` + type narrowing
- **Type imports**: `import type { Foo } from "..."`
- **Path alias**: `@/features/*`, `@/components/*`, `@/lib/*` (cấu hình `vite.config.ts` + `tsconfig.json`)
- **Naming**:
  - Components: PascalCase (`CmsCard.tsx`)
  - Hooks: camelCase với prefix `use` (`useChannelFilters.ts`)
  - Stores: camelCase với suffix `Store` (`authStore.ts`)
  - Schemas: camelCase với suffix `Schema` (`cmsSchema.ts`)
  - Types: PascalCase (`Channel`, `CmsId`)

### 10.2 Component rules

- **Max 300 lines per component file** — chia nhỏ nếu quá
- **No business logic in components** — đẩy vào hooks/services
- **Props với named types**:
  ```tsx
  type CmsCardProps = {
    cms: Cms;
    onEdit?: (cms: Cms) => void;
  };
  export function CmsCard({ cms, onEdit }: CmsCardProps) { ... }
  ```
- **Memo khi cần** — dùng `React.memo` cho list items, `useMemo` cho computed expensive

### 10.3 API layer

- **1 hook per endpoint**:
  ```ts
  // api/cms.api.ts
  export function useCmsList(filters?: CmsFilters) {
    return useQuery({
      queryKey: ["cms", filters],
      queryFn: () => apiClient.get("cms", { searchParams: filters }).json<CmsListResponse>(),
    });
  }
  export function useCreateCms() {
    return useMutation({
      mutationFn: (data: CmsCreate) => apiClient.post("cms", { json: data }).json<Cms>(),
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cms"] }),
    });
  }
  ```

### 10.4 Forms

- **react-hook-form + zod** — schema chia sẻ với backend qua `packages/shared-schemas`
  ```ts
  const cmsSchema = z.object({
    name: z.string().min(1, "Tên CMS không được trống"),
    currency: z.enum(["USD","VND","CAD","EUR","GBP","JPY","SGD","AUD"]),
  });
  type CmsForm = z.infer<typeof cmsSchema>;
  
  function CmsFormComponent() {
    const { register, handleSubmit, formState: { errors } } = useForm<CmsForm>({
      resolver: zodResolver(cmsSchema),
    });
    // ...
  }
  ```

### 10.5 Backend

- **Routes chỉ định tuyến** — không có logic
- **Controller** validate input + gọi service + trả response
- **Service** chứa business logic, return data thuần (không touch req/res)
- **Model** chỉ DB queries, return typed rows
- **Errors**: throw `AppError` subclass → middleware bắt và format
  ```ts
  if (!cms) throw new NotFoundError("CMS không tồn tại");
  ```

### 10.6 Git

- Commit message: Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)
- Branch: `feat/cms-history`, `fix/auth-token-refresh`, `chore/upgrade-deps`
- PR template:
  ```
  ## Tóm tắt
  ## Test plan
  ## Screenshots (nếu UI)
  ## Breaking changes (nếu có)
  ```

---

## 11. Checklist hoàn thành

### Code chất lượng

- [ ] 0 file > 500 dòng (split nếu cần)
- [ ] 0 `any` trong TypeScript (`strict: true` pass)
- [ ] ESLint + Prettier 0 warnings
- [ ] Test coverage ≥ 60% (services), ≥ 40% (components)
- [ ] Lighthouse score ≥ 90 (performance, accessibility)
- [ ] Bundle size: initial < 350KB gzipped (hiện tại 130KB → giữ tương đương với features-split)

### Feature parity

- [ ] Tất cả views v5.1 đã migrate (xem mapping mục 8.1)
- [ ] Đăng nhập + RBAC hoạt động đầy đủ 9 roles
- [ ] Partner Portal isolation OK
- [ ] AI integration OK (Claude + Browser AI + cache)
- [ ] Workflow state machine OK
- [ ] Daily snapshots tự động chạy
- [ ] Multi-currency aggregation đúng (không mix USD + VND)

### Database

- [ ] Toàn bộ schema mục 5 đã apply
- [ ] Foreign keys + indexes đầy đủ
- [ ] Migration script idempotent (chạy nhiều lần OK)
- [ ] Data migration từ JSON blob → relational thành công 100%
- [ ] Backup + restore tested

### Documentation

- [ ] README.md cập nhật (setup, run, deploy)
- [ ] ARCHITECTURE.md (giải thích folder structure + design decisions)
- [ ] CONTRIBUTING.md (quy ước code, PR flow)
- [ ] API.md hoặc OpenAPI spec (auto-gen từ zod schemas)
- [ ] Onboarding doc cho dev mới

### DevOps

- [ ] CI: lint + test + build trên mọi PR
- [ ] CD: auto-deploy staging từ `main` branch
- [ ] Sentry alerts setup (frontend + backend errors)
- [ ] Logs centralized (Docker logs hoặc ELK)
- [ ] Health check endpoint + uptime monitoring

### Security

- [ ] JWT trong httpOnly cookie (không localStorage)
- [ ] CSRF token cho state-changing endpoints
- [ ] Rate limit per IP + per user
- [ ] SQL injection protection (Kysely parameterized queries)
- [ ] XSS protection (SafeMarkdown, react default escape)
- [ ] CSP headers (helmet middleware)
- [ ] Bcrypt cost factor ≥ 12
- [ ] Audit log đầy đủ mọi hành động nhạy cảm

---

## 📌 Lưu ý quan trọng cho người implement

1. **Không xóa code cũ** trước khi feature mới được verify works. Luôn để v5.1 chạy song song trong giai đoạn 1-4.

2. **Chạy migration trên staging trước**. Nếu có lỗi data integrity, fix script trước khi chạm production.

3. **Test workflow đầu cuối**: Partner đăng ký → admin duyệt → partner tạo kênh + gửi video → QC duyệt → CHANNEL_CREATOR cấp kênh → revenue auto-tracked. Đây là happy path quan trọng nhất.

4. **Ưu tiên Revenue module** — đây là trải nghiệm chính của Finance team. Nên có dashboard rõ ràng cho:
   - Doanh thu theo CMS (line chart 30/90/365 ngày)
   - Doanh thu theo Partner (kèm rev_share %)
   - Doanh thu theo Contract (so với monthly_minimum)
   - Doanh thu theo Channel (top 50)
   - Multi-currency: hiển thị riêng từng đồng tiền

5. **Auto-link partner ↔ user** — khi admin duyệt PARTNER user, backend tự động tạo/link partner record (đã có logic ở v5.1, port nguyên).

6. **Daily snapshot phải idempotent** — chạy 2 lần cùng ngày = 1 lần (PRIMARY KEY `(scope, scope_id, snapshot_date)`).

7. **AI prompts** — tách ra file riêng `prompts/*.prompt.ts`, không inline trong components. Versioning prompt qua git history.

8. **Don't over-engineer** — không thêm GraphQL, không micro-services, không Redis trừ khi thật cần. Express + PostgreSQL + React đủ cho 500 channels.

---

**Tài liệu này là blueprint, không phải implementation. Mở từng section trong Cursor và yêu cầu AI implement từng phần theo plan.**

Version: 1.0  
Date: 2026-05-10  
Status: Ready for implementation
