# Cài đặt: biến môi trường và xử lý lỗi

Áp dụng cho macOS và Ubuntu/Debian. Không cần Docker.

## 1–2. Cài đặt

Hướng dẫn cài từ máy trắng (Node, pnpm, PostgreSQL, role database, tạo DB, migration, seed, chạy, kiểm tra) nằm ở [README → Cài đặt từ máy trắng](../README.md#cài-đặt-từ-máy-trắng-macos--linux). File này giữ phần tham chiếu: biến môi trường và xử lý lỗi.

Không muốn cấp `CREATEDB` cho role `revenue`? Tạo DB bằng tay (bằng superuser): `CREATE DATABASE revenue_dashboard OWNER revenue;` và `revenue_dashboard_test` nếu chạy e2e.

## 3. Biến môi trường

Toàn bộ nằm trong `.env` (copy từ `.env.example`, giá trị mặc định chạy được ngay). Được validate bằng zod khi khởi động — sai/thiếu thì app dừng và liệt kê từng biến lỗi.

### Runtime (API đọc)

| Biến                           | Mặc định                                                      | Mô tả                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `NODE_ENV`                     | `development`                                                 | `development` · `test` · `production`                                                                                    |
| `PORT`                         | `4000`                                                        | Cổng HTTP                                                                                                                |
| `TRUST_PROXY`                  | `loopback`                                                    | Express `trust proxy` (đặt đúng khi đứng sau reverse proxy)                                                              |
| `DATABASE_URL`                 | `postgres://revenue:revenue@localhost:5432/revenue_dashboard` | Kết nối Postgres (`?sslmode=require` cho DB managed)                                                                     |
| `DB_POOL_MAX`                  | `10`                                                          | Số kết nối tối đa trong pool                                                                                             |
| `DB_LOGGING`                   | `false`                                                       | Log toàn bộ SQL                                                                                                          |
| `JWT_SECRET`                   | giá trị dev                                                   | ≥ 32 ký tự (`openssl rand -hex 32`). **Phải bằng `AUTH_SECRET` của frontend admin**. Giá trị mẫu bị từ chối ở production |
| `COOKIE_SECURE`                | rỗng → `true` khi production                                  | Cờ `Secure` của cookie phiên                                                                                             |
| `LOGIN_RATE_LIMIT`             | `30`                                                          | Request login / IP / phút                                                                                                |
| `LOGIN_MAX_FAILED_ATTEMPTS`    | `5`                                                           | Số lần sai / email + IP trước khi khoá                                                                                   |
| `LOGIN_LOCKOUT_MINUTES`        | `15`                                                          | Thời gian khoá (`429` + `Retry-After`)                                                                                   |
| `ACCESS_TOKEN_TTL_MINUTES`     | `15`                                                          | Thời hạn access token (1–60)                                                                                             |
| `REFRESH_TOKEN_TTL_DAYS`       | `7`                                                           | Hạn trượt của refresh token: mỗi lần refresh gia hạn thêm                                                                |
| `SESSION_MAX_DAYS`             | `30`                                                          | Phiên dài tối đa kể từ lúc đăng nhập (≥ `REFRESH_TOKEN_TTL_DAYS`)                                                        |
| `REFRESH_REUSE_LEEWAY_SECONDS` | `30`                                                          | Token vừa bị thay vẫn được chấp nhận trong khoảng này (request song song); sau đó dùng lại = thu hồi phiên               |
| `REFRESH_RATE_LIMIT`           | `120`                                                         | Request refresh / IP / phút                                                                                              |
| `WEB_ORIGINS`                  | `http://localhost:3000,http://localhost:3001`                 | Origin được gọi API kèm cookie (CORS)                                                                                    |
| `LOG_LEVEL`                    | `log`                                                         | `fatal` · `error` · `warn` · `log` · `debug` · `verbose`                                                                 |
| `LOG_FORMAT`                   | rỗng → `json` khi production, `pretty` khi dev                | Định dạng log                                                                                                            |
| `SWAGGER_ENABLED`              | rỗng → bật, trừ production                                    | Swagger UI tại `/api/docs`                                                                                               |

### Chỉ dùng cho seed (`pnpm db:seed`)

| Biến                                               | Mặc định                                                | Tài khoản                  |
| -------------------------------------------------- | ------------------------------------------------------- | -------------------------- |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`    | `admin@example.com` / `admin123` / `Restaurant Admin`   | **admin** — role `ADMIN`   |
| `VIEWER_EMAIL` / `VIEWER_PASSWORD` / `VIEWER_NAME` | `viewer@example.com` / `viewer123` / `Read-only Viewer` | **client** — role `VIEWER` |

### Chỉ dùng cho test

| Biến                | Mặc định                 | Mô tả           |
| ------------------- | ------------------------ | --------------- |
| `TEST_DATABASE_URL` | `DATABASE_URL` + `_test` | DB cho e2e test |

## 4. Xử lý lỗi thường gặp

Chạy `pnpm doctor` trước — nó chỉ ra phần lớn các lỗi dưới đây kèm lệnh sửa.

| Triệu chứng                                         | Cách xử lý                                                                                         |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Invalid environment variables`                     | Đọc danh sách biến lỗi trong thông báo; so với `.env.example`                                      |
| `ECONNREFUSED 127.0.0.1:5432`                       | Postgres chưa chạy: `brew services start postgresql@16` / `sudo systemctl start postgresql`        |
| `password authentication failed for user "revenue"` | Chưa tạo role (mục 1) hoặc sai mật khẩu trong `DATABASE_URL`                                       |
| `permission denied to create database`              | `ALTER ROLE revenue CREATEDB;` (chạy bằng superuser) hoặc tạo DB bằng tay                          |
| `relation "..." does not exist`                     | Chưa migrate: `pnpm db:migrate`                                                                    |
| `EADDRINUSE :::4000`                                | `lsof -i :4000` rồi tắt process, hoặc đổi `PORT`                                                   |
| Lỗi CORS trên trình duyệt                           | Thêm origin của frontend vào `WEB_ORIGINS`, khởi động lại                                          |
| Admin đăng nhập xong bị đá về `/login`              | `AUTH_SECRET` (frontend admin) khác `JWT_SECRET` (backend), hoặc backend chưa chạy                 |
| Đăng nhập trả `429`                                 | Sai quá 5 lần → chờ hết thời gian trong `Retry-After`, hoặc khởi động lại API (khoá lưu trong RAM) |
| Muốn dữ liệu demo về như ban đầu                    | `pnpm db:seed` (ghi đè số liệu demo) hoặc `pnpm db:reset` (xoá sạch rồi tạo lại)                   |
