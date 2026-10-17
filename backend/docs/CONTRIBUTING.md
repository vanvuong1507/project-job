# Đóng góp code

## Quy trình

1. `git pull` → `pnpm install` → `pnpm db:migrate` (nếu có migration mới) → `pnpm doctor`.
2. Tạo nhánh: `feat/<ten-ngan>`, `fix/<ten-ngan>`.
3. Code theo [ARCHITECTURE.md](ARCHITECTURE.md). Test viết **cùng lúc** với code.
4. Trước khi push: `pnpm check && pnpm test:e2e` (giống CI).
5. Mở PR. CI (`../.github/workflows/backend.yml` ở gốc repo) chạy format, lint, typecheck, unit test, build, kiểm tra migration chạy và revert được, rồi e2e trên Postgres thật.

## Test

| Loại | Lệnh            | Vị trí                   | Ghi chú                                                   |
| ---- | --------------- | ------------------------ | --------------------------------------------------------- |
| Unit | `pnpm test`     | `src/**/*.spec.ts`       | Logic thuần, không cần DB                                 |
| E2E  | `pnpm test:e2e` | `test/e2e/*.e2e-spec.ts` | App thật + Postgres thật (`<db>_test`, tự tạo và migrate) |

Chạy 1 file hoặc 1 test: `pnpm test src/modules/dashboard/revenue-trend.builder.spec.ts`, `pnpm test:e2e test/e2e/auth.e2e-spec.ts -t "logout"`.

Trong e2e:

- `createTestApp()` dựng app thật, `t.reset()` xoá sạch rồi seed lại, `t.login('VIEWER')` trả về cookie.
- Response thành công được kiểm bằng schema zod (`schema.strict().parse(body)`), nên contract được kiểm tra tự động.
- Lỗi kiểm bằng `expectError(status, code, message, details?)` trong `test/utils/assertions.ts`.

## Commit

Conventional Commits: `type(scope): tóm tắt`, viết ở thể mệnh lệnh, chữ thường, dưới 72 ký tự.

- `type`: `feat` `fix` `refactor` `perf` `test` `docs` `build` `chore` `ci`
- `scope`: `auth` `metrics` `events` `dashboard` `health` `database` `config` `common` `repo`

Stage từng file theo tên (`git add <path>`). Không dùng `git add -A`. Không commit `.env`.

## AI workflow (Claude Code)

Repo có sẵn quy trình cho Claude Code. Chạy `claude` ở thư mục `backend/`:

```
/workflow analyze <yêu cầu>     → analyst: viết requirement (API contract, schema, AC)
/workflow approve <slug> requirement
/workflow plan <slug>            → planner: chia task (migration → service → controller → test)
/workflow approve <slug> plan
/workflow implement <slug> T-01  → developer làm, reviewer kiểm tra
/workflow commit <slug> T-01     → bạn xác nhận file và message
```

| Thành phần              | Vị trí                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| Hướng dẫn cho agent     | `CLAUDE.md`                                                                                                    |
| Subagent                | `.claude/agents/` (analyst, planner, developer, reviewer)                                                      |
| Skill của dự án         | `.claude/skills/` nestjs-backend, typeorm-migrations, api-contract, requirement-analysis, task-planning        |
| Skill bên ngoài (MIT)   | `nestjs-best-practices`, `supabase-postgres-best-practices`. Khoá commit bởi `pnpm skills:sync`, không sửa tay |
| Trạng thái từng feature | `.ai-workflow/features/<slug>/`                                                                                |
| Quyền                   | `.claude/settings.json` chặn `git add -A`, `reset --hard`, đọc `.env`. Hỏi trước khi chạy `db:reset`           |
