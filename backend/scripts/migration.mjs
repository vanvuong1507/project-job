#!/usr/bin/env node
/**
 * Wrapper around the TypeORM migration CLI that fits this ESM project:
 *
 *   npm run migration:generate -- <Name>   diff entities vs. the database (DATABASE_URL) → new migration
 *   npm run migration:create -- <Name>     empty migration to write by hand (data fixes, raw SQL)
 *   npm run migration:check                exit 1 if entities and database differ (CI / before a PR)
 *   npm run migration:show                 applied [X] / pending [ ] migrations
 *
 * <Name> is PascalCase, or a path like src/database/migrations/<Name> (as with the plain TypeORM CLI).
 * Without <Name> (e.g. run from VS Code's NPM Scripts panel) it is asked for in the terminal.
 * A new file lands in src/database/migrations, is formatted, and is registered in
 * src/database/migrations/index.ts (migrations are listed explicitly so Vitest and dist load the same
 * list; an unregistered one would never run). Apply with `npm run migration:run` (= `db:migrate`).
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

const MIGRATIONS_DIR = 'src/database/migrations';
const INDEX_FILE = join(MIGRATIONS_DIR, 'index.ts');
const DATA_SOURCE = 'dist/database/data-source.js';
const CONNECTION_ERROR =
  /database "[^"]+" does not exist|ECONNREFUSED|password authentication failed[^\n]*|role "[^"]+" does not exist|ENOTFOUND/;

const [command, nameArg] = process.argv.slice(2);
const NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

function run(cmd, args, { capture = false } = {}) {
  const result = spawnSync(cmd, args, {
    stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit',
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

/**
 * The migration name, given as a name (`AddEventCategory`) or, like the TypeORM CLI, as a path
 * (`src/database/migrations/AddEventCategory`). The file always goes to src/database/migrations.
 * Without one, it is asked for in the terminal (e.g. a script started from VS Code's NPM Scripts
 * panel, which can't pass arguments); with no terminal (CI) the command fails with its usage.
 */
async function resolveName() {
  const name = nameArg?.split('/').pop();
  if (name) {
    if (!NAME_PATTERN.test(name))
      fail(`"${name}" must be PascalCase (letters and digits), e.g. AddEventCategory`);
    return name;
  }
  if (!process.stdin.isTTY) {
    fail(
      `Missing name. Usage: npm run migration:${command} -- <Name> (or pnpm migration:${command} <Name>), e.g. AddEventCategory`,
    );
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    for (;;) {
      const answer = (
        await prompt.question('Migration name (PascalCase, e.g. AddEventCategory): ')
      ).trim();
      if (NAME_PATTERN.test(answer)) return answer;
      console.log(
        answer
          ? `  "${answer}" is not PascalCase (letters and digits, starting uppercase).`
          : '  A name is required.',
      );
    }
  } finally {
    prompt.close();
  }
}

function build() {
  if (run('pnpm', ['exec', 'nest', 'build']).status !== 0) fail('Build failed');
}

const migrationFiles = () =>
  readdirSync(MIGRATIONS_DIR).filter((file) => /^\d+-.+\.ts$/.test(file));

/** Formats the new file and adds it to index.ts (import + array entry). */
function register(file) {
  const path = join(MIGRATIONS_DIR, file);
  const source = readFileSync(path, 'utf8')
    // Type-only import (the project lints `import type`), single quotes are left to Prettier.
    .replace(
      /import \{ MigrationInterface, QueryRunner \} from ["']typeorm["'];?/,
      "import type { MigrationInterface, QueryRunner } from 'typeorm';",
    );
  writeFileSync(path, source);

  const className = source.match(/export class (\w+)/)?.[1];
  if (!className) fail(`Could not find the migration class in ${path}`);

  let index = readFileSync(INDEX_FILE, 'utf8');
  const importLine = `import { ${className} } from './${file.replace(/\.ts$/, '.js')}';`;
  const lastImport = [...index.matchAll(/^import .*;$/gm)].at(-1);
  index = lastImport
    ? `${index.slice(0, lastImport.index + lastImport[0].length)}\n${importLine}${index.slice(lastImport.index + lastImport[0].length)}`
    : `${importLine}\n${index}`;
  index = index.replace(/export const migrations = \[([\s\S]*?)\];/, (_, list) => {
    const items = list
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return `export const migrations = [${[...items, className].join(', ')}];`;
  });
  writeFileSync(INDEX_FILE, index);

  run('pnpm', ['exec', 'prettier', '--write', path, INDEX_FILE], { capture: true });
  console.log(`✓ Created ${path}`);
  console.log(`✓ Registered ${className} in ${INDEX_FILE}`);
  console.log('Next: review the SQL (up AND down), then `pnpm db:migrate`.');
}

async function createOrGenerate(kind) {
  const name = await resolveName();
  const before = new Set(migrationFiles());
  const args =
    kind === 'create'
      ? ['exec', 'typeorm', 'migration:create', join(MIGRATIONS_DIR, name)]
      : [
          'exec',
          'typeorm',
          'migration:generate',
          '-d',
          DATA_SOURCE,
          '--pretty',
          join(MIGRATIONS_DIR, name),
        ];
  if (kind === 'generate') build();

  const { status, output } = run('pnpm', args, { capture: true });
  if (/No changes in database schema were found/.test(output)) {
    console.log('• Entities and database already match: nothing to generate.');
    console.log(
      '  Changed an entity? Make sure it is listed in src/database/typeorm.config.ts and the DB is migrated (`pnpm db:migrate`).',
    );
    console.log(
      '  Need a hand-written migration (data fix, raw SQL)? `pnpm migration:create <Name>`.',
    );
    return;
  }
  if (status !== 0) {
    const connection = output.match(CONNECTION_ERROR)?.[0];
    if (connection) fail(`Could not reach the database (${connection}). Run \`pnpm doctor\``);
    process.stderr.write(output);
    fail(
      `typeorm migration:${kind} failed (is PostgreSQL running and DATABASE_URL correct? try \`pnpm doctor\`)`,
    );
  }

  const created = migrationFiles().filter((file) => !before.has(file));
  if (created.length !== 1) fail(`Expected one new migration file, found ${created.length}`);
  register(created[0]);
}

function check() {
  build();
  const { status, output } = run(
    'pnpm',
    [
      'exec',
      'typeorm',
      'migration:generate',
      '-d',
      DATA_SOURCE,
      '--check',
      join(MIGRATIONS_DIR, 'Check'),
    ],
    { capture: true },
  );
  if (status === 0) {
    console.log('✓ Entities and database schema match (no migration needed)');
    return;
  }
  // Connection problems first: the CLI reports them as a failed "migration generation" too.
  const connection = output.match(CONNECTION_ERROR)?.[0];
  if (connection) {
    fail(
      `Could not reach the database (${connection}). Run \`pnpm doctor\` (missing DB → \`pnpm db:create\`)`,
    );
  }
  process.stderr.write(output);
  fail(
    'Entities differ from the database: run `pnpm db:migrate`, or `pnpm migration:generate <Name>` for a new change',
  );
}

function show() {
  build();
  const { status } = run('pnpm', ['exec', 'typeorm', 'migration:show', '-d', DATA_SOURCE]);
  process.exit(status);
}

switch (command) {
  case 'generate':
  case 'create':
    await createOrGenerate(command);
    break;
  case 'check':
    check();
    break;
  case 'show':
    show();
    break;
  default:
    fail('Usage: node scripts/migration.mjs <generate|create|check|show> [Name]');
}
