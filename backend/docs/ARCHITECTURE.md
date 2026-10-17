# Kiến trúc & quy ước code

## Cấu trúc thư mục

```
src/
├── main.ts                       Khởi động: load config → logger → Nest app → configureApp → listen
├── app.module.ts                 Root module (nhận AppConfig để test trỏ sang DB khác)
│
├── bootstrap/                    Những gì chỉ chạy lúc khởi động
│   ├── configure-app.ts          Pipeline HTTP: CORS, helmet, cookie, request-id, body parser, prefix /api, filter, Swagger
│   ├── logger.ts                 ConsoleLogger: JSON (production) hoặc text màu (dev)
│   └── swagger.ts                DocumentBuilder + /api/docs
│
├── config/
│   ├── env.ts                    loadEnvFile, readEnv (validate + báo lỗi gộp)
│   ├── app-config.ts             Schema env runtime → AppConfig, token APP_CONFIG
│   └── config.module.ts          Provider toàn cục APP_CONFIG
│
├── common/                       Dùng chung, KHÔNG phụ thuộc modules/
│   ├── constants/                API_PREFIX, SWAGGER_PATH, header request-id
│   ├── exceptions/               AppException, ErrorCode (mã lỗi cho máy đọc), TooManyRequestsException
│   ├── http/                     setLocation / setTotalCount (header Location, X-Total-Count)
│   ├── filters/                  HttpExceptionFilter → mọi lỗi thành { statusCode, code, error, details?, requestId, path, timestamp }
│   ├── middleware/               request-context (request-id, no-store, access log), body-parser-errors
│   ├── pipes/                    ZodValidationPipe
│   ├── swagger/                  ApiZodBody / ApiZodResponse / ApiZodQuery / ApiErrorResponses
│   ├── utils/                    dates (ngày ISO, tuần Mon–Sun)
│   └── validation/               zod dùng chung: isoDate, weekStart, money, covers, uuid, errorResponse
│
├── database/
│   ├── typeorm.config.ts         Cấu hình TypeORM duy nhất (app, scripts, CLI, test)
│   ├── data-source.ts            DataSource cho TypeORM CLI (migration:generate)
│   ├── database.module.ts
│   ├── migrations/               Migration + index.ts (danh sách tường minh)
│   ├── seeds/                    seed-config (tài khoản từ env), seed-data (2 tuần demo), seed()
│   ├── scripts/                  Các lệnh db:* (create-db, migrate, revert, seed, reset)
│   └── utils/                    pg-types, numeric.transformer, date-where, database-url, create-database
│
└── modules/                      Mỗi tính năng một thư mục
    ├── auth/
    │   ├── auth.module.ts · auth.controller.ts · auth.service.ts · auth.constants.ts
    │   ├── permissions.ts        ROLES, PERMISSIONS, can() — bản sao của frontend admin
    │   ├── decorators/           @Auth(permission), @CurrentUser(), RequirePermission
    │   ├── dto/                  loginSchema, adminUserSchema (zod)
    │   ├── entities/             AdminUserEntity
    │   ├── guards/               SessionGuard (cookie hoặc Bearer → user → kiểm quyền)
    │   ├── services/             LoginAttemptsService (khoá sau N lần sai)
    │   ├── types/                AuthenticatedRequest
    │   └── utils/                password (bcrypt)
    ├── metrics/                  controllers/ (daily-metrics, weeks) · daily-metrics.service · dto/ · entities/
    ├── events/                   events.controller · events.service · events.constants · dto/ · entities/
    ├── dashboard/                dashboard.controller · dashboard.service · revenue-trend.builder (logic thuần) · dto/
    └── health/                   /api/health, /live, /ready

test/
├── e2e/                          *.e2e-spec.ts — app thật (configureApp) + Postgres thật
└── utils/                        createTestApp, testConfig, global-setup (tạo + migrate DB test)

scripts/                          doctor.mjs (kiểm tra môi trường), sync-skills.mjs (AI skills)
docs/                             Tài liệu này
```

### Quy tắc phụ thuộc

```
main/bootstrap ─► modules ─► common
                    │   └──► database/utils
                    └──────► config
```

- `common/` không import từ `modules/`.
- Module chỉ dùng **service đã export** của module khác (ví dụ `dashboard` dùng `DailyMetricsService`, `EventsService`), không đụng repository của module khác.
- Logic tính toán thuần (không I/O) tách khỏi service để unit test dễ (`revenue-trend.builder.ts`).

### Quy ước đặt tên file

| Loại       | Tên                       | Vị trí                                       |
| ---------- | ------------------------- | -------------------------------------------- |
| Module     | `<feature>.module.ts`     | `modules/<feature>/`                         |
| Controller | `<feature>.controller.ts` | gốc module, hoặc `controllers/` khi có nhiều |
| Service    | `<feature>.service.ts`    | gốc module, hoặc `services/` cho service phụ |
| Entity     | `<name>.entity.ts`        | `entities/`                                  |
| Schema zod | `<name>.dto.ts`           | `dto/`                                       |
| Unit test  | `<file>.spec.ts`          | cạnh file được test                          |
| E2E test   | `<area>.e2e-spec.ts`      | `test/e2e/`                                  |

## Luồng một request

```
request
 → CORS → helmet → cookie-parser
 → request-context   (X-Request-Id, Cache-Control: no-store, access log khi xong)
 → JSON body parser (≤ 100kb) → body-parser-errors (400/413)
 → router /api/...
 → SessionGuard      (nếu route có @Auth: token từ cookie admin_session hoặc Bearer → user từ DB → kiểm quyền)
 → ZodValidationPipe (body / query / param)
 → controller → service → TypeORM → PostgreSQL
 → response JSON
 (lỗi ở bất kỳ bước nào → HttpExceptionFilter → { error, details? })
```

## Quy ước chính

- **ESM**: import tương đối kết thúc bằng `.js`.
- **Không `import type` class được inject** qua constructor (DI cần metadata lúc chạy).
- **Config**: chỉ đọc qua `@Inject(APP_CONFIG)`; không đọc `process.env` ngoài `src/config` (và `seeds/seed-config.ts`).
- **Validation**: mọi input qua zod + `ZodValidationPipe`. Schema zod cũng là nguồn sinh Swagger và được dùng để kiểm tra response trong e2e test → tài liệu không lệch với code.
- **Lỗi**: ném `AppException(status, ErrorCode.X, message)`; mã mới thêm vào `common/exceptions/error-codes.ts` (và bảng trong [API.md](API.md)). Filter lo phần format.
- **Response**: không trả entity — map qua `toXResponse()` trong `dto/`; list đặt `X-Total-Count`, tạo mới trả `201` + `Location`.
- **TypeORM 1.x** báo lỗi khi `where` chứa `undefined` → dùng `dateWhere()` hoặc bỏ key.
- **Schema DB** chỉ thay đổi qua migration (`synchronize` luôn tắt) — xem [DATABASE.md](DATABASE.md).

## Thêm một module mới (checklist)

1. `src/modules/<feature>/` với `<feature>.module.ts`, `.controller.ts`, `.service.ts`, `dto/<name>.dto.ts`, `entities/<name>.entity.ts`.
2. Entity → thêm vào `entities` trong `database/typeorm.config.ts` → `pnpm migration:generate <Name>` (tự đăng ký trong `migrations/index.ts`) → `pnpm migration:check`.
3. Schema zod cho input **và** response trong `dto/`.
4. Controller: `@ApiTags`, `@ApiOperation`, `@ApiZodBody/Query/Param/Response`, `@ApiErrorResponses`, `@Auth('<permission>')` cho route cần đăng nhập.
5. Quyền mới → `modules/auth/permissions.ts` (và báo frontend cập nhật bản sao của họ).
6. Import module vào `app.module.ts`.
7. Unit test cho logic thuần, e2e test trong `test/e2e/` (kể cả 401/403/400), cập nhật path list trong `platform.e2e-spec.ts`.
8. `pnpm check && pnpm test:e2e`.
