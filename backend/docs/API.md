# API

- **Swagger UI:** http://localhost:4000/api/docs (tài liệu đầy đủ, có "Try it out")
- **OpenAPI JSON:** http://localhost:4000/api/docs-json (import vào Postman/Insomnia, sinh client)

Schema trong Swagger được sinh từ chính các schema zod dùng để validate, nên tài liệu và code không bao giờ lệch nhau.

## Quy ước chung

| Mục         | Quy ước                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------- |
| Base path   | `/api`                                                                                      |
| Định dạng   | JSON UTF-8. Ngày `YYYY-MM-DD`, thời điểm ISO 8601 UTC (`2026-10-16T07:27:24.646Z`)          |
| Tiền        | Số JSON (USD), tối đa 2 chữ số thập phân                                                    |
| Cache       | Mọi response `Cache-Control: no-store`                                                      |
| Request id  | Gửi `X-Request-Id` (tuỳ chọn) để truy vết; luôn được trả lại trong header và trong body lỗi |
| CORS        | Chỉ origin trong `WEB_ORIGINS`, có `credentials`                                            |
| Body tối đa | 100 KB (`413 PAYLOAD_TOO_LARGE`)                                                            |

## Response thành công

Trả **trực tiếp resource** (không bọc envelope), theo đúng contract mà frontend (`@frontend/api-client`) đang dùng.

| Thao tác       | Status | Body                         | Header                           |
| -------------- | ------ | ---------------------------- | -------------------------------- |
| Đọc 1 resource | `200`  | object                       |                                  |
| Danh sách      | `200`  | mảng JSON, sắp xếp theo ngày | `X-Total-Count: <số phần tử>`    |
| Tạo mới        | `201`  | resource vừa tạo             | `Location: /api/<resource>/<id>` |
| Cập nhật       | `200`  | resource sau cập nhật        |                                  |
| Xoá / logout   | `204`  | rỗng                         |                                  |

Resource admin luôn có `id` (uuid), `createdAt`, `updatedAt`. Entity database không bao giờ được trả thẳng mà luôn map qua DTO (`toDailyMetricResponse`, `toEventImpactResponse`), nên thêm cột mới vào DB không làm lộ dữ liệu ra API.

## Response lỗi

Mọi lỗi (validation, auth, không tìm thấy, route sai, JSON hỏng, lỗi DB, lỗi không lường trước) đều có **cùng một dạng**:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_FAILED",
  "error": "Validation failed",
  "details": { "days.0.covers": ["Must be 0 or more"] },
  "requestId": "733cfb78-01b6-4950-9cee-04b414ed6d2a",
  "path": "/api/admin/weeks/2026-10-12",
  "timestamp": "2026-10-16T09:19:12.460Z"
}
```

| Trường       | Ý nghĩa                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `statusCode` | Bằng HTTP status                                                            |
| `code`       | **Mã cho máy đọc** — client rẽ nhánh theo trường này, không theo `error`    |
| `error`      | Thông điệp cho người đọc (có thể thay đổi)                                  |
| `details`    | Chỉ với `VALIDATION_FAILED`: đường dẫn field (dạng `a.0.b`) → danh sách lỗi |
| `requestId`  | Trùng header `X-Request-Id`; dùng để tìm log                                |
| `path`       | URL của request                                                             |
| `timestamp`  | Thời điểm lỗi                                                               |

Lỗi 500 không bao giờ chứa stack hay SQL; chi tiết chỉ nằm trong log server (kèm `requestId`).

### Mã lỗi

| Status | `code`                    | Khi nào                                                          |
| ------ | ------------------------- | ---------------------------------------------------------------- |
| 400    | `VALIDATION_FAILED`       | Body/query/param sai — xem `details`                             |
| 400    | `INVALID_JSON`            | Body không phải JSON hợp lệ                                      |
| 400    | `BAD_REQUEST`             | Yêu cầu sai khác                                                 |
| 401    | `UNAUTHORIZED`            | Thiếu/sai/hết hạn phiên                                          |
| 401    | `INVALID_CREDENTIALS`     | Sai email hoặc mật khẩu                                          |
| 401    | `ACCESS_TOKEN_EXPIRED`    | Access token hết hạn → gọi `/api/auth/refresh` rồi thử lại       |
| 401    | `INVALID_REFRESH_TOKEN`   | Refresh token sai, hết hạn hoặc phiên đã thu hồi → đăng nhập lại |
| 401    | `REFRESH_TOKEN_REUSED`    | Refresh token cũ bị dùng lại → phiên bị thu hồi                  |
| 403    | `FORBIDDEN`               | Role không đủ quyền (VIEWER gọi API ghi)                         |
| 404    | `DAILY_METRIC_NOT_FOUND`  | Không có ngày với `id` đó                                        |
| 404    | `EVENT_NOT_FOUND`         | Không có event với `id` đó                                       |
| 404    | `ROUTE_NOT_FOUND`         | Sai đường dẫn / method                                           |
| 409    | `DAILY_METRIC_DATE_TAKEN` | Ngày đã có số liệu                                               |
| 409    | `CONFLICT`                | Trùng dữ liệu (ràng buộc unique ở DB)                            |
| 413    | `PAYLOAD_TOO_LARGE`       | Body > 100 KB                                                    |
| 429    | `LOGIN_LOCKED`            | Sai mật khẩu quá nhiều lần — header `Retry-After` (giây)         |
| 429    | `TOO_MANY_REQUESTS`       | Quá số request login hoặc refresh / IP / phút                    |
| 500    | `INTERNAL_ERROR`          | Lỗi không lường trước                                            |
| 503    | `SERVICE_UNAVAILABLE`     | Không kết nối được database (`/api/health`)                      |

Danh sách đầy đủ: `src/common/exceptions/error-codes.ts`. Frontend có bản sao kiểu `ErrorCode` / `ApiErrorBody` ở `../frontend/packages/api-client/src/types/errors.ts`: thêm hoặc đổi code thì sửa cả hai trong cùng một đợt.

## Xác thực & phân quyền

Phiên gồm **access token** ngắn hạn và **refresh token** xoay vòng (rotation), theo [OAuth 2.0 Security BCP (RFC 9700 §4.14)](https://datatracker.ietf.org/doc/html/rfc9700#section-4.14).

| Token         | Cookie (httpOnly, SameSite=Lax, `Secure` ở production) | Dạng                                     | Thời hạn (mặc định)                                                                           |
| ------------- | ------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| Access token  | `admin_session`, `Path=/`                              | JWT HS256 `{ sub, role, sid }`           | 15 phút (`ACCESS_TOKEN_TTL_MINUTES`)                                                          |
| Refresh token | `admin_refresh`, `Path=/api/auth`                      | `<sessionId>.<generation>.<HMAC-SHA256>` | 7 ngày trượt (`REFRESH_TOKEN_TTL_DAYS`), tối đa 30 ngày từ lúc đăng nhập (`SESSION_MAX_DAYS`) |

Luồng:

1. `POST /api/auth/login` `{ email, password }` → `{ user }` + 2 cookie. Mỗi lần đăng nhập là một **phiên** (bảng `auth_sessions`).
2. Gọi API bằng cookie (trình duyệt) **hoặc** `Authorization: Bearer <access token>` (server-to-server, ví dụ server của frontend admin). Mỗi request kiểm tra chữ ký JWT, **phiên `sid` còn hiệu lực** và đọc lại role từ DB, nên logout, thu hồi phiên hay đổi role có hiệu lực ngay.
3. Access token hết hạn → `401 ACCESS_TOKEN_EXPIRED`. Gọi `POST /api/auth/refresh` (cookie `admin_refresh`, hoặc body `{ "refreshToken": "…" }` cho client phía server) → `{ user }` + **cặp token mới**; refresh token cũ hết hiệu lực.
4. `POST /api/auth/logout` thu hồi phiên (refresh token từ cookie/body, hoặc access token) và xoá 2 cookie. Access token của phiên đó bị từ chối ngay.

Bảo mật của refresh token:

- **Rotation + phát hiện dùng lại:** mỗi lần refresh tăng `generation`. Gửi lại một token cũ hơn → `401 REFRESH_TOKEN_REUSED` và **thu hồi cả phiên** (kẻ trộm lẫn người dùng thật đều phải đăng nhập lại; log `WARN Refresh token reuse detected`).
- **Khoảng ân hạn** `REFRESH_REUSE_LEEWAY_SECONDS` (30 giây): token vừa bị thay vẫn được chấp nhận và trả về **đúng token kế tiếp**, để các request song song (2 tab, prefetch) không làm người dùng bị đăng xuất. Các refresh đồng thời được tuần tự hoá bằng khoá dòng (`SELECT … FOR UPDATE`).
- DB **không lưu token**, chỉ lưu `generation`; chữ ký HMAC dùng khoá dẫn xuất từ `JWT_SECRET`, nên lộ DB không dùng được token. Refresh token không thể dùng làm access token và ngược lại.
- Giới hạn `REFRESH_RATE_LIMIT` request refresh / IP / phút. Phiên hết hạn hoặc đã thu hồi quá 1 ngày được dọn khi user đăng nhập lại.
- Đổi `JWT_SECRET` làm mọi access và refresh token hết hiệu lực (mọi người đăng nhập lại).

| Role     | Tài khoản seed       | Quyền                                                                       |
| -------- | -------------------- | --------------------------------------------------------------------------- |
| `ADMIN`  | `admin@example.com`  | `metrics:read` `metrics:write` `events:read` `events:write` `events:delete` |
| `VIEWER` | `viewer@example.com` | `metrics:read` `events:read`                                                |

Chống brute-force: tối đa `LOGIN_RATE_LIMIT` request login / IP / phút; sai `LOGIN_MAX_FAILED_ATTEMPTS` lần cho cùng email + IP thì bị khoá `LOGIN_LOCKOUT_MINUTES` phút.

## Endpoint

| Method | Path                                 | Quyền           | Mô tả                                                                                   |
| ------ | ------------------------------------ | --------------- | --------------------------------------------------------------------------------------- |
| GET    | `/api/dashboard/revenue-trend`       | public          | Tuần (`?weekStart=` thứ Hai; bỏ trống → tuần mới nhất có dữ liệu), kỳ trước, event, KPI |
| POST   | `/api/auth/login`                    | public          | Đăng nhập                                                                               |
| POST   | `/api/auth/refresh`                  | refresh token   | Đổi refresh token lấy cặp token mới (rotation)                                          |
| POST   | `/api/auth/logout`                   | public          | Thu hồi phiên, xoá 2 cookie (luôn `204`)                                                |
| GET    | `/api/auth/me`                       | đã đăng nhập    | User hiện tại                                                                           |
| GET    | `/api/admin/daily-metrics?from=&to=` | `metrics:read`  | Danh sách ngày                                                                          |
| POST   | `/api/admin/daily-metrics`           | `metrics:write` | Tạo ngày                                                                                |
| PUT    | `/api/admin/daily-metrics/:id`       | `metrics:write` | Sửa ngày                                                                                |
| DELETE | `/api/admin/daily-metrics/:id`       | `metrics:write` | Xoá ngày                                                                                |
| PUT    | `/api/admin/weeks/:weekStart`        | `metrics:write` | Lưu cả tuần `{ days: [Mon..Sun] }` trong 1 transaction                                  |
| GET    | `/api/admin/events?from=&to=`        | `events:read`   | Danh sách event                                                                         |
| POST   | `/api/admin/events`                  | `events:write`  | Tạo event                                                                               |
| PUT    | `/api/admin/events/:id`              | `events:write`  | Sửa event                                                                               |
| DELETE | `/api/admin/events/:id`              | `events:delete` | Xoá event                                                                               |
| GET    | `/api/health` · `/api/health/ready`  | public          | API + database                                                                          |
| GET    | `/api/health/live`                   | public          | Chỉ process (không kiểm tra DB)                                                         |

## Ví dụ với curl

```bash
API=http://localhost:4000/api

# Dashboard (public)
curl "$API/dashboard/revenue-trend?weekStart=2026-10-12"

# Đăng nhập, lưu cookie
curl -c cookies.txt -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}' "$API/auth/login"

# Lưu cả tuần
curl -b cookies.txt -X PUT -H 'Content-Type: application/json' "$API/admin/weeks/2026-10-12" -d '{
  "days": [
    {"posRevenue":1720,"eatclubRevenue":310,"labourCost":600,"covers":118},
    {"posRevenue":1790,"eatclubRevenue":320,"labourCost":630,"covers":120},
    {"posRevenue":1800,"eatclubRevenue":320,"labourCost":880,"covers":121},
    {"posRevenue":1780,"eatclubRevenue":280,"labourCost":640,"covers":117},
    {"posRevenue":1720,"eatclubRevenue":310,"labourCost":580,"covers":112},
    {"posRevenue":2180,"eatclubRevenue":720,"labourCost":850,"covers":150},
    {"posRevenue":2250,"eatclubRevenue":474,"labourCost":1120,"covers":133}
  ]}'

# Tạo event (xem header Location)
curl -i -b cookies.txt -H 'Content-Type: application/json' "$API/admin/events" \
  -d '{"date":"2026-10-17","impact":"POSITIVE","title":"Local food festival"}'

# Gọi bằng Bearer token thay cho cookie
TOKEN=$(grep admin_session cookies.txt | awk '{print $7}')
curl -H "Authorization: Bearer $TOKEN" "$API/auth/me"

# Refresh: cookie admin_refresh (Path=/api/auth) → cặp token mới, ghi đè vào cookies.txt
curl -b cookies.txt -c cookies.txt -X POST "$API/auth/refresh"

# Refresh bằng body (client phía server)
REFRESH=$(grep admin_refresh cookies.txt | awk '{print $7}')
curl -H 'Content-Type: application/json' -d "{\"refreshToken\":\"$REFRESH\"}" "$API/auth/refresh"

# Đăng xuất: thu hồi phiên
curl -b cookies.txt -c cookies.txt -X POST "$API/auth/logout"
```

## Thay đổi contract

Frontend phụ thuộc vào các shape trên (`frontend/packages/api-client/src/types/`).

- **Thêm** endpoint hoặc trường mới thì tương thích ngược. Cập nhật schema zod và e2e test, rồi báo frontend.
- **Đổi tên, xoá hoặc đổi kiểu** một trường, status hay `code` là **breaking change**. Phải có xác nhận trước, và frontend phải cập nhật cùng đợt.
