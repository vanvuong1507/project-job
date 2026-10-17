# Database

PostgreSQL 16 (tối thiểu 13), TypeORM 1.x. Schema **chỉ** thay đổi qua migration; `synchronize` luôn tắt.

## Schema

```
admin_users
  id             uuid PK default gen_random_uuid()
  email          varchar(254) UNIQUE        -- lưu chữ thường
  password_hash  varchar(255)               -- bcrypt
  name           varchar(120)
  role           admin_role ('ADMIN' | 'VIEWER') default 'ADMIN'
  created_at, updated_at  timestamptz

auth_sessions                                -- 1 dòng / lần đăng nhập (họ refresh token)
  id                   uuid PK              -- = claim `sid` của access token
  user_id              uuid FK → admin_users ON DELETE CASCADE, INDEX
  generation           integer ≥ 0          -- thế hệ refresh token còn hiệu lực (KHÔNG lưu token)
  rotated_at           timestamptz NULL     -- lần refresh gần nhất (khoảng ân hạn tính từ đây)
  expires_at           timestamptz          -- hạn trượt, gia hạn mỗi lần refresh
  absolute_expires_at  timestamptz          -- hạn cứng từ lúc đăng nhập
  revoked_at           timestamptz NULL
  revoked_reason       'logout' | 'reuse' | 'expired' NULL
  last_ip, user_agent  varchar NULL         -- audit
  created_at           timestamptz

daily_metrics                                -- 1 dòng / ngày
  id               uuid PK
  date             date UNIQUE
  pos_revenue      numeric(12,2) ≥ 0
  eatclub_revenue  numeric(12,2) ≥ 0
  labour_cost      numeric(12,2) ≥ 0
  covers           integer ≥ 0
  created_at, updated_at

event_impacts
  id           uuid PK
  date         date            INDEX
  impact       event_impact_type ('POSITIVE' | 'NEGATIVE')
  title        varchar(120)    CHECK not blank
  description  varchar(500)    NULL
  created_at, updated_at

typeorm_migrations                           -- lịch sử migration (TypeORM quản lý)
```

Ghi chú:

- `date` được đọc ra dạng chuỗi `YYYY-MM-DD` (`database/utils/pg-types.ts`) nên không bị lệch ngày theo múi giờ server.
- `numeric` được chuyển sang `number` (`database/utils/numeric.transformer.ts`).
- UUID dùng `gen_random_uuid()` có sẵn, không cần cài extension hay quyền superuser.

## Migration

| File                                                       | Nội dung                                    |
| ---------------------------------------------------------- | ------------------------------------------- |
| `src/database/migrations/1792135603519-InitSchema.ts`      | 3 bảng, ràng buộc CHECK/UNIQUE, index, enum |
| `src/database/migrations/1792136152466-AddAdminRole.ts`    | Cột `role` (user cũ thành `ADMIN`)          |
| `src/database/migrations/1792167355713-AddAuthSessions.ts` | Bảng `auth_sessions` (refresh token)        |

### Đổi schema

```bash
# 1. Sửa entity (src/modules/<feature>/entities/*.entity.ts); entity mới → thêm vào database/typeorm.config.ts
# 2. DB dev phải đang ở bản mới nhất
pnpm db:migrate
# 3. Sinh migration bằng cách so entity với DB (chỉ cần tên PascalCase)
pnpm migration:generate AddSomething
#    → tạo src/database/migrations/<timestamp>-AddSomething.ts, format, tự đăng ký vào index.ts
# 4. Đọc SQL vừa sinh (rename bị sinh thành drop+add → sửa tay; NOT NULL cần default/backfill)
# 5. Áp dụng và chứng minh revert được
pnpm db:migrate && pnpm db:revert && pnpm db:migrate
# 6. Entity và DB khớp nhau (thoát mã 1 nếu còn lệch; dùng được trong CI)
pnpm migration:check
```

Migration viết tay (sửa dữ liệu, SQL đặc biệt): `pnpm migration:create FixSomething` tạo file rỗng, cũng tự đăng ký.

| Lệnh                             | Khi nào                          | Kết quả                                                                |
| -------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| `pnpm migration:generate <Name>` | Đã sửa entity                    | File migration có SQL; nếu entity không đổi: báo "nothing to generate" |
| `pnpm migration:create <Name>`   | Cần migration viết tay           | File migration rỗng (`up`/`down`)                                      |
| `pnpm migration:check`           | Trước khi mở PR, trong CI        | `✓` nếu khớp; mã 1 nếu entity khác DB                                  |
| `pnpm db:migrate` / `db:revert`  | Áp dụng / huỷ migration gần nhất |                                                                        |

Với npm, tên đi sau `--`: `npm run migration:generate -- AddSomething`. Có thể truyền đường dẫn như TypeORM CLI gốc (`-- src/database/migrations/AddSomething`). Không truyền tên (ví dụ bấm chạy trong panel **NPM Scripts** của VS Code) thì script hỏi tên ngay trong terminal; nơi không có terminal (CI) thì lệnh dừng và in cách dùng.

`generate` và `check` so entity với DB trong `DATABASE_URL`, nên PostgreSQL phải đang chạy và DB đã migrate tới bản mới nhất. Ba lệnh `migration:*` gọi TypeORM CLI qua `scripts/migration.mjs`.

Quy tắc:

- **Không bao giờ sửa** migration đã chạy ở môi trường dùng chung, mà thêm migration mới.
- Migration chạy trong transaction riêng (`transaction: 'each'`).
- Migration được liệt kê tường minh trong `index.ts` (ESM, không dùng glob).
- `pnpm test:e2e` dựng DB test từ toàn bộ chuỗi migration, nên cũng kiểm tra luôn migration.

## Seed

`pnpm db:seed` là idempotent: chạy lại nhiều lần không bị nhân đôi dữ liệu.

| Dữ liệu                                                     | Cách ghi                                        |
| ----------------------------------------------------------- | ----------------------------------------------- |
| 2 tài khoản (admin, client/viewer) từ `ADMIN_*`, `VIEWER_*` | upsert theo email (đặt lại mật khẩu, tên, role) |
| 14 ngày demo (05–18/10/2026)                                | upsert theo ngày → khôi phục số liệu demo       |
| 3 event demo                                                | chỉ thêm nếu chưa có event cùng ngày + tiêu đề  |

```bash
pnpm db:seed                    # tài khoản + dữ liệu demo
pnpm db:seed -- --users-only    # chỉ tài khoản
pnpm db:reset                   # XOÁ toàn bộ bảng → migrate → seed (bị chặn ở production)
```

Ở production: chỉ cho `--users-only`, và từ chối mật khẩu mẫu (`admin123`, `viewer123`).

## Kết nối

`DATABASE_URL=postgres://user:pass@host:5432/db`. Với DB managed (RDS, Cloud SQL, Supabase…) thêm `?sslmode=require`.

Pool: `DB_POOL_MAX` (mặc định 10), timeout kết nối 5 s, mỗi câu lệnh tối đa 15 s (`statement_timeout`), `application_name=revenue-dashboard-api` (dễ tìm trong `pg_stat_activity`).

## Backup / restore (gợi ý)

```bash
pg_dump  -Fc "$DATABASE_URL" > backup-$(date +%F).dump
pg_restore --clean --if-exists -d "$DATABASE_URL" backup-2026-10-16.dump
```
