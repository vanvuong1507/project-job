---
name: typeorm-migrations
description: How to change the PostgreSQL schema in this backend with TypeORM 1.x migrations — edit entity, generate, review SQL, register, run, revert, seed. Use for any task that adds or changes a table, column, constraint, index or enum, or touches seed data.
---

# Schema changes with TypeORM migrations

The schema is owned by migrations in `src/database/migrations/`. `synchronize` is never enabled. Check schema decisions against `supabase-postgres-best-practices` (data types, constraints, indexes, locking) — ignore its Supabase-only RLS/`auth.uid()` material.

## Steps

1. **Edit the entity** (`src/modules/<module>/entities/<name>.entity.ts`):
   - explicit column `type` always (`'varchar', length`, `'numeric', precision/scale + numericTransformer`, `'date'`, `'timestamptz'`, `'integer'`, `'enum' + enumName`);
   - snake_case DB names via `name: 'pos_revenue'`, camelCase properties;
   - named constraints/indexes: `@Check('CHK_<table>_<rule>', ...)`, `@Index('IDX_<table>_<cols>')`.
   - A new entity must also be added to `entities` in `src/database/typeorm.config.ts`.
2. **Make sure the dev database is up to date**: `pnpm db:migrate`.
3. **Generate**: `pnpm migration:generate <PascalCaseName>` (builds, diffs entities vs. the dev DB, writes `src/database/migrations/<ts>-<Name>.ts`, formats it and registers it in `index.ts`). Hand-written migration: `pnpm migration:create <Name>`.
4. **Review the SQL** in the generated file:
   - no accidental `DROP COLUMN`/`DROP TABLE` (renames are generated as drop+add — rewrite them as `ALTER ... RENAME`);
   - adding `NOT NULL` to a populated table needs a default or a backfill step;
   - large tables: create indexes `CONCURRENTLY` in a separate migration with `transaction = false`;
   - `down()` exactly reverses `up()`.
   - Add a one-line JSDoc on the class and `import type { MigrationInterface, QueryRunner }`.
5. **Registration** is automatic (end of `migrations` in `src/database/migrations/index.ts`); verify it is there (they are imported explicitly, not globbed).
6. **Run & prove reversibility** on the dev DB: `pnpm db:migrate` → `pnpm db:revert` → `pnpm db:migrate`.
7. **Check nothing is left to generate**: `pnpm migration:check` must print `✓ Entities and database schema match`.
8. **Seed**: if demo data changes, update `src/database/seeds/seed-data.ts` and keep `seedDatabase` idempotent (upserts / existence checks).
9. **Docs**: update the schema block in `docs/DATABASE.md`.
10. **Tests**: `pnpm test:e2e` recreates the test DB from all migrations, so it validates the migration chain too.

## Never

- Never edit or delete a migration that has been applied anywhere shared — add a new one.
- Never run `pnpm db:reset` (drops all tables) without the user's OK.
