# frontend

Monorepo frontend (pnpm workspaces + Turborepo) cho 2 app Next.js:

| App           | Package            | Port | Mô tả                                            |
| ------------- | ------------------ | ---- | ------------------------------------------------ |
| `apps/client` | `@frontend/client` | 3000 | Dashboard Revenue Trend (public view)            |
| `apps/admin`  | `@frontend/admin`  | 3001 | Trang quản trị: login, nhập dữ liệu tuần, events |

## Cài đặt từ máy trắng (macOS / Linux)

Giả định máy **chưa có gì**. Có 2 cách chạy:

- **A. Chỉ frontend:** dữ liệu mock có sẵn trong app, không cần database hay backend. Làm bước 1–4 và 6.
- **B. Đủ hệ thống (khuyên dùng):** frontend đọc/ghi dữ liệu thật qua backend + PostgreSQL. Sửa số liệu ở admin là dashboard hiện ngay. Làm cả bước 1–6.

| Cần cài   | Phiên bản                          | Cài ở bước |
| --------- | ---------------------------------- | ---------- |
| Git, curl | bất kỳ                             | 1          |
| Node.js   | **24** (tối thiểu 22.12), qua nvm  | 2          |
| pnpm      | **10**, qua corepack (đi kèm Node) | 2          |
| Backend   | repo `../backend` (chỉ cách B)     | 5          |

### Bước 1 — Công cụ cơ bản

**macOS**

```bash
xcode-select --install            # git (bỏ qua nếu báo đã cài)
```

**Ubuntu / Debian**

```bash
sudo apt update && sudo apt install -y curl git ca-certificates
```

### Bước 2 — Node.js 24 và pnpm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"      # hoặc mở terminal mới
nvm install 24
corepack enable                                         # bật pnpm (phiên bản khoá trong package.json)
```

(Đã làm bước 1–2 khi cài backend thì bỏ qua.)

### Bước 3 — Lấy code và cài dependency

```bash
git clone https://github.com/vanvuong1507/project-job.git   # bỏ qua nếu đã clone khi cài backend
cd project-job/frontend
nvm use
pnpm install                              # lần đầu corepack hỏi tải pnpm: chọn Y
```

### Bước 4 — Tạo file môi trường

```bash
cp apps/client/.env.example apps/client/.env
cp apps/admin/.env.example  apps/admin/.env
```

Mặc định (`DATA_SOURCE=mock`) chạy được ngay, không cần gì thêm (cách A).

### Bước 5 — Nối với backend (cách B)

1. Cài và chạy backend theo [`../backend/README.md`](../backend/README.md) → “Cài đặt từ máy trắng”. Bước đó cài PostgreSQL, tạo database, chạy **migration** và **seed**. Xong khi `curl http://localhost:4000/api/health` trả `{"status":"ok","database":"up"}`.
2. Trỏ 2 app sang backend:

   ```bash
   for app in client admin; do
     sed -i.bak -e 's/^DATA_SOURCE=mock/DATA_SOURCE=api/' -e 's|^# API_URL=|API_URL=|' apps/$app/.env && rm apps/$app/.env.bak
   done
   grep -E '^(DATA_SOURCE|API_URL)' apps/*/.env      # DATA_SOURCE=api, API_URL=http://localhost:4000
   ```

3. `AUTH_SECRET` trong `apps/admin/.env` phải **bằng** `JWT_SECRET` trong `backend/.env`. Giá trị dev mặc định hai bên đã giống nhau, nên không cần sửa.

### Bước 6 — Chạy

```bash
pnpm dev            # client http://localhost:3000 + admin http://localhost:3001
```

| Trang                | URL                      | Tài khoản                                     |
| -------------------- | ------------------------ | --------------------------------------------- |
| Dashboard (public)   | http://localhost:3000    | không cần                                     |
| Dashboard tiếng Việt | http://localhost:3000/vi | không cần                                     |
| Admin                | http://localhost:3001    | `admin@example.com` / `admin123` (toàn quyền) |
| Admin (chỉ xem)      | http://localhost:3001    | `viewer@example.com` / `viewer123`            |

Kiểm tra cách B: ở admin, sửa một số ở tuần 12–18/10/2026 → **Save week** → tải lại http://localhost:3000, con số mới hiện ngay.

Chạy bản production: `pnpm build && pnpm start` (cùng cổng).

### Gặp lỗi?

| Triệu chứng                                    | Cách xử lý                                                                              |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `Invalid environment variables` khi `pnpm dev` | Chưa làm bước 4, hoặc giá trị sai; so với `.env.example`                                |
| Dashboard báo không tải được dữ liệu (cách B)  | Backend chưa chạy, hoặc `API_URL` sai: `curl http://localhost:4000/api/health`          |
| Đăng nhập admin xong bị đưa về `/login`        | `AUTH_SECRET` (admin) khác `JWT_SECRET` (backend)                                       |
| Admin báo “thử lại sau N phút”                 | Sai mật khẩu nhiều lần nên bị khoá theo email + IP; chờ, hoặc khởi động lại backend/app |
| `EADDRINUSE :3000` / `:3001`                   | `lsof -i :3000` rồi tắt process                                                         |
| `pnpm: command not found`                      | `corepack enable` (bước 2)                                                              |

## Cấu trúc

```
frontend/
├── apps/
│   ├── client/                 # Next.js 16 (App Router) + Tailwind v4
│   └── admin/                  # Next.js 16 (App Router) + Tailwind v4
├── packages/
│   ├── ui/                     # Design system: component, hook, token, icon (Storybook)
│   ├── i18n/                   # Locale (en, vi) + message dùng chung
│   ├── api-client/             # HTTP client (timeout, retry, interceptor, ApiError) + type contract backend
│   ├── tailwind-config/        # base.css (Tailwind + tokens @theme) + PostCSS config
│   ├── eslint-config/          # ESLint flat config: base / next / react-library
│   ├── next-config/            # createNextConfig(): transpilePackages, security headers, typedRoutes
│   ├── playwright-config/      # createAppE2EConfig() dùng chung cho E2E của các app
│   └── typescript-config/      # tsconfig: base / nextjs / react-library
├── turbo.json
└── pnpm-workspace.yaml
```

Các package nội bộ xuất thẳng source TypeScript, không cần build. `@frontend/next-config` khai báo `transpilePackages` để Next tự biên dịch các package này. Phiên bản dependency dùng chung được khai báo một chỗ trong `catalog:` của `pnpm-workspace.yaml`. CI nằm ở `../.github/workflows/frontend.yml` (gốc repo).

## Cấu hình

### Biến môi trường

Validate bằng zod trong `apps/<app>/src/env.ts` (`@t3-oss/env-nextjs`) ngay khi `next dev`/`next build`; code chỉ đọc qua `import { env } from '@/env'`. Chi tiết và giá trị mẫu: `apps/<app>/.env.example`.

| Biến                     | App           | Mô tả                                                                                                                    |
| ------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `DATA_SOURCE`            | client, admin | `mock` (mặc định, dữ liệu nội bộ) hoặc `api` (backend thật)                                                              |
| `API_URL`                | client, admin | URL backend, bắt buộc khi `DATA_SOURCE=api` (ví dụ `http://localhost:4000`). Chỉ server dùng                             |
| `AUTH_SECRET`            | admin         | Khoá ký JWT phiên (≥ 32 ký tự). Với `api`: **phải bằng `JWT_SECRET` của backend**                                        |
| `ENABLE_MOCK_API`        | client, admin | Bật JSON API mock trong `src/app/api` (cho tool, E2E). Tắt ở production                                                  |
| `NEXT_PUBLIC_CLIENT_URL` | admin         | URL dashboard client (link "View dashboard")                                                                             |
| `NEXT_PUBLIC_SITE_URL`   | client        | Origin công khai (metadata, sitemap, robots)                                                                             |
| `ADMIN_*`, `VIEWER_*`    | admin         | Chỉ mock: tài khoản seed, mặc định giống seed backend (`admin@example.com`/`admin123`, `viewer@example.com`/`viewer123`) |
| `MOCK_DELAY_MS`          | client, admin | Chỉ mock: thêm độ trễ để xem skeleton                                                                                    |
| `LOG_LEVEL`              | client, admin | `debug` · `info` · `warn` · `error` (JSON mỗi dòng khi production)                                                       |
| `SKIP_ENV_VALIDATION`    | build         | `true` để build khi chưa có biến môi trường                                                                              |

Có thể ghi đè tạm qua biến môi trường, ví dụ `DATA_SOURCE=api API_URL=http://localhost:4000 pnpm dev` (turbo cho các biến runtime này đi qua).

## Scripts (root)

| Lệnh                                 | Mô tả                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `pnpm dev`                           | Chạy dev toàn bộ app                                                            |
| `pnpm build`                         | Build toàn bộ (có cache Turborepo)                                              |
| `pnpm start`                         | Chạy bản build                                                                  |
| `pnpm lint`                          | ESLint toàn bộ workspace                                                        |
| `pnpm typecheck`                     | Kiểm tra TypeScript                                                             |
| `pnpm test`                          | Vitest (unit/component) cho mọi package và app                                  |
| `pnpm test:e2e`                      | Playwright E2E cho client + admin                                               |
| `pnpm test:e2e:evidence`             | Như trên, lưu ảnh + video + trace của mọi test vào HTML report                  |
| `pnpm storybook` / `build-storybook` | Storybook của `@frontend/ui`                                                    |
| `pnpm check`                         | Bước kiểm tra đầu của CI (format, lint, typecheck, unit test, build, Storybook) |
| `pnpm format` / `format:check`       | Prettier (kèm sắp xếp class Tailwind)                                           |
| `pnpm clean`                         | Xoá `.next`, `.turbo`, `node_modules`                                           |

Chạy lệnh cho 1 package: `pnpm --filter @frontend/admin <script>`.
Thêm dependency cho 1 app: `pnpm --filter @frontend/client add recharts`.

## Nguồn dữ liệu: mock và backend

Trang và Server Action **không bao giờ** gọi API từ trình duyệt: mỗi app đọc/ghi qua lớp DAL phía server (`src/server/`), và `DATA_SOURCE` chọn nguồn:

| App    | `mock`                                                                                           | `api`                                                                             |
| ------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| client | Fixtures JSON chỉ đọc, 2 tuần giống video ($15,974 vs $14,982)                                   | `GET /api/dashboard/revenue-trend` của backend                                    |
| admin  | `.mock-data/db.json` tạo từ seed, ghi được (`pnpm --filter @frontend/admin mock:reset` để reset) | `/api/auth/*`, `/api/admin/*` của backend, gửi phiên bằng `Authorization: Bearer` |

Ở chế độ mock, 2 app có dữ liệu riêng nên số liệu sửa ở admin **không** hiện bên client; dùng backend để thấy ngay.

Khi `ENABLE_MOCK_API=true`, mỗi app còn mở JSON API mock (`src/app/api`) **đúng contract của backend**: cùng đường dẫn, cùng response (`X-Total-Count`, `201` + `Location`, `204`) và cùng body lỗi. Ở chế độ `api`, các route này đi qua DAL nên trả dữ liệu của backend.

### Kết nối backend

1. Chạy backend (`../backend`, xem README ở đó): `pnpm bootstrap && pnpm dev` → http://localhost:4000.
2. Trong `apps/client/.env` và `apps/admin/.env`: `DATA_SOURCE=api`, `API_URL=http://localhost:4000`.
3. `AUTH_SECRET` của admin = `JWT_SECRET` của backend (giá trị dev mặc định hai bên đã giống nhau).
4. `pnpm dev`, đăng nhập admin bằng `admin@example.com` / `admin123` (hoặc `viewer@example.com` / `viewer123`, chỉ xem).

Khi admin gọi backend, nó gửi kèm `X-Request-Id` (backend ghi lại trong log) và `X-Forwarded-For` (IP người dùng, để backend khoá login theo IP người dùng, không phải IP server Next). Backend chỉ tin header này từ địa chỉ trong `TRUST_PROXY` của nó.

### Phiên đăng nhập (admin)

Phiên gồm 2 cookie httpOnly, cùng contract với backend:

| Cookie          | Nội dung                                | Thời hạn                     |
| --------------- | --------------------------------------- | ---------------------------- |
| `admin_session` | Access token (JWT `{ sub, role, sid }`) | 15 phút                      |
| `admin_refresh` | Refresh token, đổi mới mỗi lần refresh  | 7 ngày trượt, tối đa 30 ngày |

`proxy.ts` tự refresh **trước khi** trang hoặc Server Action chạy (khi access token sắp hết hạn trong 60 giây), nên người dùng không bị đăng xuất khi đang thao tác. Refresh token bị từ chối (hết hạn, bị thu hồi, hoặc token cũ bị dùng lại → backend thu hồi cả phiên) thì xoá cookie và chuyển về `/login`. Đăng xuất thu hồi phiên ở backend, nên token cũ không dùng lại được. Chi tiết: `backend/docs/API.md` → "Xác thực & phân quyền".

### Lỗi từ backend

Mọi lỗi có dạng `{ statusCode, code, error, details?, requestId, path, timestamp }` (`ApiErrorBody`, danh sách `ErrorCode` trong `packages/api-client/src/types/errors.ts`, phải khớp `backend/src/common/exceptions/error-codes.ts`). `ApiError` của `@frontend/api-client` mang sẵn `status`, `code`, `details`, `requestId`, `retryAfterSeconds`. Data source `api` của admin đổi chúng thành lỗi domain (`NotFoundError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`, `TooManyAttemptsError`, `ValidationError` trong `src/server/errors.ts`) giống hệt mock; Server Action dùng `actionErrorFor()` để hiện thông báo cho người dùng.

## Test & Storybook

**Unit test (Vitest):** `pnpm test`, chạy cho mọi package và app.

**Playwright (E2E):** mỗi app có `e2e/*.spec.ts` + `playwright.config.ts` (dùng `@frontend/playwright-config`).

```bash
# Lần đầu: tải Chromium. Linux cần thêm thư viện hệ thống (--with-deps, sẽ hỏi sudo).
pnpm --filter @frontend/client exec playwright install chromium               # macOS
pnpm --filter @frontend/client exec playwright install --with-deps chromium   # Linux

pnpm test:e2e                                    # cả 2 app (tự bật dev server nếu chưa chạy)
pnpm build && CI=1 pnpm test:e2e                 # trên bản build production (như CI)
pnpm test:e2e:evidence                           # như trên nhưng lưu evidence của MỌI test
pnpm --filter @frontend/admin test:e2e -- e2e/smoke.spec.ts -g "renders"   # 1 file / 1 test
pnpm --filter @frontend/client test:e2e:ui       # UI mode
pnpm --filter @frontend/admin test:e2e:report    # mở HTML report của lần chạy gần nhất
```

Server do Playwright tự bật luôn dùng **dữ liệu mock**, bất kể `.env` (muốn test với backend thì truyền `DATA_SOURCE=api API_URL=…`). Nhưng nếu bạn **đang chạy sẵn** `pnpm dev` ở cổng 3000/3001, Playwright dùng lại server đó cùng nguồn dữ liệu của nó. Khi server đó ở `DATA_SOURCE=api` mà backend không chạy, mọi test sẽ đỏ (trang trả 500). Khi đó tắt `pnpm dev` đi, hoặc bật backend.

**Evidence (bằng chứng chạy test).** Mọi lần chạy đều sinh:

| Thứ                                      | Mặc định               | `pnpm test:e2e:evidence` (`E2E_EVIDENCE=1`) | Ở đâu                                     |
| ---------------------------------------- | ---------------------- | ------------------------------------------- | ----------------------------------------- |
| HTML report                              | luôn có                | luôn có                                     | `apps/<app>/playwright-report/index.html` |
| Ảnh chụp màn hình                        | test fail              | mọi test                                    | trong report (tab Attachments)            |
| Video                                    | test fail              | mọi test có trình duyệt                     | trong report                              |
| Trace (từng bước, DOM, network, console) | test fail              | mọi test                                    | trong report → mở bằng Trace Viewer       |
| Ảnh responsive                           | luôn có (7 kích thước) | luôn có                                     | trong report, test `responsive`           |
| JUnit XML                                | luôn có                | luôn có                                     | `apps/<app>/test-results/junit.xml`       |

CI (`../.github/workflows/frontend.yml` ở gốc repo) chạy `pnpm test:e2e:evidence` và luôn upload report + JUnit thành artifact `playwright-evidence`, kể cả khi test pass.

**Responsive.** Test `e2e/responsive.spec.ts` của mỗi app chạy mọi trang trên 7 kích thước: điện thoại 320/375/430, tablet 768 dọc / 1024 ngang, laptop 1366, desktop 1920. Mỗi kích thước kiểm tra: trang không cuộn ngang, không input/nút/link nào nằm ngoài màn hình, và đính kèm ảnh toàn trang vào report. Bố cục theo kích thước:

| App    | Điện thoại (< 768)                                                                   | Tablet (768–1023)                                 | Desktop (≥ 1024)                          |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------------------- | ----------------------------------------- |
| client | KPI xếp dọc; chart giữ độ rộng đọc được và **vuốt ngang trong card** (có dòng gợi ý) | KPI 3 cột, chart vừa màn hình                     | Như video tham chiếu                      |
| admin  | Thanh tab trên cùng; nhập số liệu theo **thẻ từng ngày** (lưới 2×2); events dạng thẻ | Thanh tab; bảng số liệu đủ 4 cột; events dạng thẻ | Sidebar trái; bảng số liệu và bảng events |

**E2E trên backend thật (kiểm thử tích hợp).** Cùng bộ spec chạy được với cả mock lẫn backend, vì mock theo đúng contract. Dùng một database riêng: E2E admin ghi dữ liệu (các tuần ở tương lai xa) và cố tình khoá login.

```bash
# terminal 1: backend trên DB riêng, cổng 4100
cd ../backend && pnpm build
export DATABASE_URL=postgres://revenue:revenue@localhost:5432/revenue_it
node dist/database/scripts/create-db.js
node dist/database/scripts/reset.js          # xoá sạch → migrate → seed (chạy lại trước mỗi lần test)
# Mọi trình duyệt test đăng nhập từ cùng 1 IP: nới giới hạn login/phút (như e2e của backend)
PORT=4100 LOGIN_RATE_LIMIT=1000 node dist/main.js

# terminal 2: build như CI, rồi client TRƯỚC admin (dữ liệu admin ghi làm đổi "tuần mới nhất" của client)
pnpm build
export CI=1 DATA_SOURCE=api API_URL=http://localhost:4100 ENABLE_MOCK_API=true
pnpm --filter @frontend/client test:e2e && pnpm --filter @frontend/admin test:e2e
```

**Storybook** cho `@frontend/ui` (mỗi component một folder: `src/components/<name>/` gồm `<name>.tsx`, `<name>.stories.tsx`, `index.ts`; export lại ở `src/index.ts`):

```bash
pnpm storybook          # http://localhost:6006
pnpm build-storybook    # static → packages/ui/storybook-static
```

## AI coding agents (Next.js)

Repo dùng bộ công cụ chính thức trong [Next.js AI agents guide](https://nextjs.org/docs/app/guides/ai-agents). Mỗi app có:

- **`AGENTS.md`:** `next dev` tự tạo và cập nhật, trỏ agent tới tài liệu Next đúng phiên bản (`node_modules/next/dist/docs/`). `CLAUDE.md` của app import file này bằng `@AGENTS.md`. Hãy commit `AGENTS.md`, không sửa tay.
- **`.mcp.json`:** khai báo `next-devtools-mcp`, để agent đọc routes, lỗi và lỗi biên dịch của dev server qua `/_next/mcp`.
- **Skill `next-dev-loop`:** kiểm tra thay đổi ngay trên dev server đang chạy. Cần cài `agent-browser` một lần: `npm i -g agent-browser`.
- **Skill `next-bundle-optimizer`:** audit bundle bằng `next analyze`.

Hai skill trên là bản sao nguyên vẹn, pin theo commit. Cập nhật bằng `pnpm skills:sync [sha]`, rồi review diff.

## Dùng package chung

```ts
// Chỉ trong code server (src/server/**/sources/api): trình duyệt không gọi backend.
import {
  createHttpClient,
  isApiError,
  requestIdInterceptor,
  type RevenueTrendResponse,
} from '@frontend/api-client';

const api = createHttpClient({
  baseUrl: env.API_URL,
  interceptors: [requestIdInterceptor()],
  retry: { attempts: 3 }, // chỉ GET/HEAD, khi lỗi mạng hoặc 502/503/504
});

try {
  return await api.get<RevenueTrendResponse>('/api/dashboard/revenue-trend', {
    query: { weekStart: '2026-10-05' },
    cache: 'no-store',
  });
} catch (error) {
  // Rẽ nhánh theo `code`, không theo message. status 0 = NETWORK_ERROR / TIMEOUT.
  if (isApiError(error) && error.code === 'VALIDATION_FAILED') console.warn(error.details);
  throw error;
}
```

**Design tokens** (`packages/tailwind-config/theme.css`) chia 3 lớp:

- **primitive:** `--palette-*`, giá trị đo từ ảnh tham chiếu;
- **semantic:** là các class dùng trong code: `bg-canvas`, `bg-surface-muted`, `text-muted-foreground`, `bg-accent hover:bg-accent-hover`, `text-positive`, `chart-*`, `rounded-card`…;
- **component:** các variant trong `@frontend/ui`.

Bảng màu mặc định của Tailwind đã tắt, nên chỉ dùng được token. Trong JS (chart, SVG), dùng `colorVar('chart-eatclub')`.

`globals.css` của app chỉ import `@frontend/tailwind-config/base.css` và `@frontend/ui/styles.css`.

**Component dùng chung** (`@frontend/ui`):

- `Button`, `ToggleButton`
- `Card` (Header / Title / Actions / Content)
- `Checkbox`, `Swatch`
- `Legend`
- `StatCard`, `Delta`
- `IconBadge`, `Tooltip`
- `Skeleton`

Hook đi kèm: `useControllableState`, `useSelectionSet`, `useTooltip`. Xem story `Components/Card → Reference Composition` để thấy các component ghép lại thành màn hình trong ảnh tham chiếu.
