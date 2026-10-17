# Revenue Dashboard — Backend API

REST API cho dashboard **Revenue Trend** và trang quản trị (frontend: thư mục `../frontend` cùng repo).

**NestJS 12 · TypeORM · PostgreSQL 16 · zod · Swagger**. Chạy native, **không cần Docker**.

| Sau khi chạy   | URL                                 |
| -------------- | ----------------------------------- |
| API            | http://localhost:4000/api           |
| **Swagger UI** | http://localhost:4000/api/docs      |
| OpenAPI JSON   | http://localhost:4000/api/docs-json |
| Health check   | http://localhost:4000/api/health    |

---

## Cài đặt từ máy trắng (macOS / Linux)

Giả định máy **chưa có gì**: không Node, không PostgreSQL. Làm lần lượt từng bước. Thời gian khoảng 10–15 phút, phần lớn là chờ tải.

| Cần cài    | Phiên bản                          | Cài ở bước |
| ---------- | ---------------------------------- | ---------- |
| Git, curl  | bất kỳ                             | 1          |
| Node.js    | **24** (tối thiểu 22.12), qua nvm  | 2          |
| pnpm       | **10**, qua corepack (đi kèm Node) | 2          |
| PostgreSQL | **16** (tối thiểu 13)              | 3          |

### Bước 1 — Công cụ cơ bản

**macOS**

```bash
xcode-select --install            # git, make… (bỏ qua nếu báo đã cài)
# Homebrew (trình quản lý gói):
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
eval "$(/opt/homebrew/bin/brew shellenv 2>/dev/null || /usr/local/bin/brew shellenv)"   # Apple Silicon / Intel
```

**Ubuntu / Debian**

```bash
sudo apt update
sudo apt install -y curl git ca-certificates
```

### Bước 2 — Node.js 24 và pnpm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"      # hoặc mở terminal mới
nvm install 24
corepack enable                                         # bật pnpm (phiên bản khoá trong package.json)
node -v                                                 # v24.x
```

### Bước 3 — PostgreSQL 16

**macOS**

```bash
brew install postgresql@16
brew services start postgresql@16                       # chạy nền, tự bật cùng máy
echo 'export PATH="$(brew --prefix postgresql@16)/bin:$PATH"' >> ~/.zshrc
export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
psql -d postgres -c 'select version();'                 # kiểm tra
```

**Ubuntu / Debian** (Ubuntu 24.04 có sẵn bản 16; bản cũ hơn vẫn chạy được, tối thiểu 13)

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql -c 'select version();'            # kiểm tra
```

> **Fedora / RHEL:** `sudo dnf install -y postgresql-server postgresql-contrib && sudo postgresql-setup --initdb && sudo systemctl enable --now postgresql`. Sau đó trong `/var/lib/pgsql/data/pg_hba.conf`, đổi `ident` thành `scram-sha-256` ở các dòng `host` rồi `sudo systemctl restart postgresql`, để đăng nhập được bằng mật khẩu.

### Bước 4 — Tạo user (role) database

App kết nối bằng user `revenue`, mật khẩu `revenue`. Quyền `CREATEDB` cho phép các lệnh ở bước 7 và e2e test tự tạo database.

```bash
# macOS (user hệ điều hành là superuser của Postgres cài qua Homebrew)
psql -d postgres -c "CREATE ROLE revenue WITH LOGIN PASSWORD 'revenue' CREATEDB;"

# Ubuntu / Debian / Fedora
sudo -u postgres psql -c "CREATE ROLE revenue WITH LOGIN PASSWORD 'revenue' CREATEDB;"
```

### Bước 5 — Lấy code và cài dependency

```bash
git clone https://github.com/vanvuong1507/project-job.git
cd project-job/backend
nvm use                                   # Node theo .nvmrc
pnpm install                              # lần đầu corepack hỏi tải pnpm: chọn Y
```

### Bước 6 — Cấu hình môi trường

```bash
cp .env.example .env
```

Giá trị mặc định chạy được ngay với bước 4 (`DATABASE_URL=postgres://revenue:revenue@localhost:5432/revenue_dashboard`). Mỗi biến được giải thích ngay trong file; bảng đầy đủ ở [docs/SETUP.md](docs/SETUP.md#3-biến-môi-trường). Biến sai hoặc thiếu thì app dừng ngay khi khởi động và in ra từng biến lỗi.

### Bước 7 — Khởi tạo database: tạo DB → migration → seed

```bash
pnpm db:create     # tạo database revenue_dashboard (bỏ qua nếu đã có)
pnpm db:migrate    # tạo bảng admin_users, daily_metrics, event_impacts (+ enum, index, ràng buộc)
pnpm db:seed       # 2 tài khoản + dữ liệu demo 2 tuần (05–18/10/2026)
```

Kết quả mong đợi:

```
✓ Created database "revenue_dashboard"
✓ Applied InitSchema1792135603519
✓ Applied AddAdminRole1792136152466
✓ User admin@example.com (ADMIN)
✓ User viewer@example.com (VIEWER)
✓ 14 daily metrics upserted
✓ 3 events inserted
```

Ba lệnh trên đều chạy lại được an toàn (idempotent). Chi tiết schema và cách viết migration mới: [docs/DATABASE.md](docs/DATABASE.md).

> **Cách nhanh:** sau bước 4, `pnpm bootstrap` làm gộp bước 5–7: cài dependency, tạo `.env` nếu chưa có, tạo DB, migrate và seed.

### Bước 8 — Chạy

```bash
pnpm doctor        # kiểm tra Node, .env, Postgres, migration, tài khoản, cổng: mọi dòng phải là ✓
pnpm dev           # http://localhost:4000/api, tự reload khi sửa code
```

### Bước 9 — Kiểm tra

```bash
curl http://localhost:4000/api/health
# {"status":"ok","database":"up"}

curl "http://localhost:4000/api/dashboard/revenue-trend"
# {"week":{"start":"2026-10-12","end":"2026-10-18"}, ... "totalRevenue":{"current":15974,"previous":14982,"changePct":6.6} ...}

curl -i -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'
# 200 + Set-Cookie: admin_session=…
```

Hoặc mở Swagger: http://localhost:4000/api/docs.

### Bước 10 — Chạy test (tuỳ chọn)

```bash
pnpm check         # format + lint + typecheck + unit test + build (như CI)
pnpm test:e2e      # e2e trên Postgres thật, DB riêng revenue_dashboard_test (tự tạo, tự migrate)
```

Tiếp theo: chạy frontend, xem [`../frontend/README.md`](../frontend/README.md).

### Gặp lỗi?

Chạy `pnpm doctor` trước: nó chỉ ra lỗi và in lệnh sửa.

| Triệu chứng                                         | Cách xử lý                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ECONNREFUSED 127.0.0.1:5432`                       | Postgres chưa chạy: `brew services start postgresql@16` / `sudo systemctl start postgresql` |
| `password authentication failed for user "revenue"` | Chưa làm bước 4, hoặc (Fedora) `pg_hba.conf` vẫn là `ident`                                 |
| `permission denied to create database`              | `ALTER ROLE revenue CREATEDB;` (chạy bằng superuser)                                        |
| `relation "…" does not exist`                       | Chưa migrate: `pnpm db:migrate`                                                             |
| `Invalid environment variables`                     | Đọc danh sách biến lỗi trong thông báo, so với `.env.example`                               |
| `EADDRINUSE :::4000`                                | `lsof -i :4000` rồi tắt process, hoặc đổi `PORT` trong `.env`                               |
| `pnpm: command not found`                           | `corepack enable` (bước 2)                                                                  |

Thêm: [docs/SETUP.md](docs/SETUP.md#4-xử-lý-lỗi-thường-gặp).

---

## Tài khoản seed

Khớp với frontend admin. Đổi trong `.env` (`ADMIN_*`, `VIEWER_*`) rồi chạy `pnpm db:seed`.

| Tài khoản  | Email                | Mật khẩu    | Role     | Quyền                                |
| ---------- | -------------------- | ----------- | -------- | ------------------------------------ |
| **admin**  | `admin@example.com`  | `admin123`  | `ADMIN`  | Toàn quyền: xem, nhập số liệu, event |
| **client** | `viewer@example.com` | `viewer123` | `VIEWER` | Chỉ xem: mọi thao tác ghi trả `403`  |

Dữ liệu demo: 2 tuần (05–18/10/2026) khớp video. Tuần mới nhất **$15,974** so với **$14,982** (+6.6%).

## Dùng Swagger

1. Mở http://localhost:4000/api/docs.
2. `POST /api/auth/login` → **Try it out** với một tài khoản ở trên → trình duyệt nhận cookie phiên.
3. Gọi các API `Admin · …` trực tiếp, hoặc bấm **Authorize** và dán JWT vào ô `bearer`.

Swagger tắt mặc định khi `NODE_ENV=production` (bật lại bằng `SWAGGER_ENABLED=true`).

## Lệnh thường dùng

| Lệnh                                                         | Mô tả                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `pnpm dev`                                                   | Chạy dev, tự reload                                              |
| `pnpm build` · `pnpm start`                                  | Build và chạy bản build (`dist/`)                                |
| `pnpm doctor`                                                | Kiểm tra Node, `.env`, Postgres, migration, cổng                 |
| `pnpm db:setup`                                              | Tạo DB (nếu thiếu) → migrate → seed                              |
| `pnpm db:migrate` · `pnpm db:revert`                         | Chạy / huỷ migration gần nhất                                    |
| `pnpm db:seed` (`-- --users-only`)                           | Seed tài khoản + dữ liệu demo (idempotent)                       |
| `pnpm db:reset`                                              | **Xoá toàn bộ bảng** → migrate → seed (không chạy ở production)  |
| `pnpm migration:generate <Name>`                             | Sinh migration từ thay đổi entity (tự đăng ký vào `index.ts`)    |
| `pnpm migration:create <Name>` · `pnpm migration:check`      | Migration viết tay · kiểm tra entity khớp DB                     |
| `pnpm migration:run` · `migration:revert` · `migration:show` | Chạy / huỷ migration gần nhất / xem trạng thái (`[X]` = đã chạy) |
| `pnpm test` · `pnpm test:e2e`                                | Unit test · e2e trên DB thật `<db>_test` (tự tạo)                |
| `pnpm check`                                                 | format + lint + typecheck + unit test + build (như CI)           |

## Cấu trúc

```
src/
├── main.ts · app.module.ts
├── bootstrap/        pipeline HTTP, logger, Swagger
├── config/           biến môi trường (zod) → AppConfig
├── common/           filter lỗi, pipe zod, middleware, swagger helpers, utils
├── database/         TypeORM config, migrations/, seeds/, scripts/ (db:*), utils/
└── modules/          auth · metrics · events · dashboard · health
test/
├── e2e/              supertest trên app thật + Postgres thật
└── utils/            test app, DB test, global setup
docs/                 SETUP · ARCHITECTURE · API · DATABASE · DEPLOYMENT · CONTRIBUTING
```

Chi tiết từng thư mục: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tài liệu

| Tài liệu                                     | Nội dung                                                       |
| -------------------------------------------- | -------------------------------------------------------------- |
| [docs/SETUP.md](docs/SETUP.md)               | Biến môi trường, cài đặt chi tiết, xử lý lỗi thường gặp        |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Cấu trúc thư mục, luồng request, quy ước code, thêm module mới |
| [docs/API.md](docs/API.md)                   | Endpoint, xác thực & phân quyền, định dạng lỗi, ví dụ `curl`   |
| [docs/DATABASE.md](docs/DATABASE.md)         | Schema, migration, seed                                        |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Checklist production, chạy bằng PM2/systemd, log, health check |
| [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) | Quy trình làm việc, test, commit, AI workflow                  |

## Kết nối frontend

Trong `frontend/apps/client/.env` và `frontend/apps/admin/.env`: `DATA_SOURCE=api`, `API_URL=http://localhost:4000`.
Admin cần thêm `AUTH_SECRET` **bằng đúng** `JWT_SECRET` của backend (giá trị mặc định hai bên đã giống nhau). Hướng dẫn đầy đủ: [`../frontend/README.md`](../frontend/README.md).
