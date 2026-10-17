# Revenue Trend Dashboard — cài đặt local từ đầu

Bài test: `yeu-cau.md` · spec chi tiết: `docs/US-TASK-DETAIL.md`. Repo gồm 2 phần độc lập (mỗi phần có `package.json`, lockfile, CI riêng), **không dùng Docker**:

| Repo        | Công nghệ                                    | Cổng       | README               |
| ----------- | -------------------------------------------- | ---------- | -------------------- |
| `backend/`  | NestJS 12 · TypeORM · PostgreSQL 16          | 4000       | `backend/README.md`  |
| `frontend/` | Next.js 16 (pnpm + Turborepo): client, admin | 3000, 3001 | `frontend/README.md` |

```
Trình duyệt ──► client :3000 ──(server-side)──────────────► backend :4000/api ──► PostgreSQL :5432
Trình duyệt ──► admin  :3001 ──(server-side, Bearer token)─┘
```

Hướng dẫn cho máy macOS/Linux **trắng**, bản rút gọn chạy cả hệ thống. Từng bước chi tiết (kèm kết quả mong đợi và cách xử lý lỗi) có trong README của mỗi repo: [`backend/README.md`](backend/README.md) (Node, PostgreSQL, tạo DB, migration, seed) và [`frontend/README.md`](frontend/README.md) (cài, nối backend, chạy, test, evidence, responsive).

## 1. Cài công cụ

```bash
# Node 24 qua nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 24
corepack enable                      # pnpm 10 (phiên bản được khoá trong mỗi repo)
```

PostgreSQL 16:

```bash
# macOS
brew install postgresql@16 && brew services start postgresql@16
echo 'export PATH="$(brew --prefix postgresql@16)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
psql -d postgres -c "CREATE ROLE revenue WITH LOGIN PASSWORD 'revenue' CREATEDB;"

# Ubuntu / Debian
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE ROLE revenue WITH LOGIN PASSWORD 'revenue' CREATEDB;"
```

## 2. Lấy code

```bash
git clone https://github.com/vanvuong1507/project-job.git
cd project-job
```

CI (GitHub Actions, `.github/workflows/`): `backend.yml` và `frontend.yml`, mỗi workflow chỉ chạy khi phần tương ứng thay đổi.

## 3. Backend (terminal 1)

```bash
cd backend
pnpm install
cp .env.example .env
pnpm db:setup        # tạo database revenue_dashboard → migration → seed (2 user + 2 tuần dữ liệu)
pnpm dev             # http://localhost:4000/api  (kiểm tra: curl localhost:4000/api/health)
```

## 4. Frontend (terminal 2)

```bash
cd frontend
pnpm install
cp apps/client/.env.example apps/client/.env
cp apps/admin/.env.example  apps/admin/.env
```

Trỏ 2 app sang backend thật (mặc định `.env.example` dùng mock nội bộ để frontend chạy được một mình):

| File               | Đổi thành                                           |
| ------------------ | --------------------------------------------------- |
| `apps/client/.env` | `DATA_SOURCE=api` · `API_URL=http://localhost:4000` |
| `apps/admin/.env`  | `DATA_SOURCE=api` · `API_URL=http://localhost:4000` |

`AUTH_SECRET` (admin) phải bằng `JWT_SECRET` (backend); giá trị dev mặc định hai bên đã giống nhau. Trình duyệt không gọi backend trực tiếp: server của 2 app Next gọi thay, admin gửi kèm phiên (`Authorization: Bearer`), `X-Request-Id` và IP người dùng (`X-Forwarded-For`).

```bash
pnpm dev             # client :3000 + admin :3001
```

## 5. Dùng thử

| Trang           | URL                                               | Tài khoản                                     |
| --------------- | ------------------------------------------------- | --------------------------------------------- |
| Dashboard       | http://localhost:3000                             | —                                             |
| Admin           | http://localhost:3001                             | `admin@example.com` / `admin123` (toàn quyền) |
| Admin (chỉ đọc) | http://localhost:3001                             | `viewer@example.com` / `viewer123`            |
| API             | http://localhost:4000/api/dashboard/revenue-trend | —                                             |

Sửa số liệu tuần hoặc event ở admin, rồi tải lại dashboard: số liệu mới hiện ngay.

## 6. Lỗi thường gặp

| Triệu chứng                               | Cách xử lý                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Backend: `ECONNREFUSED :5432`             | Postgres chưa chạy (`brew services start postgresql@16` / `sudo systemctl start postgresql`)      |
| Backend: `password authentication failed` | Chưa tạo role `revenue` (bước 1)                                                                  |
| Admin đăng nhập xong bị đá về `/login`    | `AUTH_SECRET` (admin) khác `JWT_SECRET` (backend); hoặc backend chưa chạy                         |
| Dashboard báo lỗi tải dữ liệu             | Backend chưa chạy hoặc `API_URL` sai trong `apps/client/.env`                                     |
| Cổng bận                                  | `lsof -i :4000` (hoặc 3000/3001) rồi tắt process                                                  |
| Muốn reset dữ liệu demo                   | `cd backend && pnpm db:reset`                                                                     |
| Đăng nhập admin báo "thử lại sau N phút"  | Bị khoá do sai mật khẩu nhiều lần (backend khoá theo email + IP). Chờ, hoặc khởi động lại backend |

## 7. Kiểm thử tích hợp

Bộ Playwright của frontend chạy được trên backend thật (mock và backend theo cùng một contract: response, header, body lỗi, mã lỗi). Xem `frontend/README.md` → "E2E trên backend thật".

## 8. Contract giữa backend và frontend

| Thứ                    | Backend                                                                                                                                                                       | Frontend                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| DTO                    | `src/modules/*/dto/*.dto.ts` (zod, Swagger)                                                                                                                                   | `packages/api-client/src/types/{dashboard,admin}.ts`                                    |
| Body lỗi + `ErrorCode` | `src/common/exceptions/error-codes.ts`                                                                                                                                        | `packages/api-client/src/types/errors.ts`                                               |
| Quyền (RBAC)           | `src/modules/auth/permissions.ts`                                                                                                                                             | `apps/admin/src/lib/permissions.ts`                                                     |
| Phiên, cookie, JWT     | `admin_session` (access JWT `{ sub, role, sid }`, 15 phút) + `admin_refresh` (refresh token xoay vòng, 7 ngày trượt / tối đa 30 ngày), `JWT_SECRET`; `POST /api/auth/refresh` | `apps/admin/src/lib/session.ts`, refresh trong `apps/admin/src/proxy.ts`, `AUTH_SECRET` |
| Tài khoản seed         | `.env` → `ADMIN_*`, `VIEWER_*`                                                                                                                                                | mặc định giống hệt (chỉ dùng ở mock)                                                    |

Đổi một bên thì sửa bên kia trong cùng đợt. Chi tiết API, biến môi trường, migration, test: `backend/README.md`, `backend/docs/API.md`, `frontend/README.md`.
