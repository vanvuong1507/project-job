#!/usr/bin/env node
// Checks a fresh checkout is ready to run, and says how to fix what isn't.
//   node scripts/doctor.mjs             full check (Node, deps, .env, PostgreSQL, migrations, port)
//   node scripts/doctor.mjs --env-only  Node + .env only; creates .env from .env.example if missing
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const envOnly = process.argv.includes('--env-only');
let failures = 0;

const ok = (message) => console.log(`  ✓ ${message}`);
const warn = (message, fix) => console.log(`  ! ${message}${fix ? `\n      → ${fix}` : ''}`);
const fail = (message, fix) => {
  failures++;
  console.log(`  ✗ ${message}${fix ? `\n      → ${fix}` : ''}`);
};

console.log('Revenue Dashboard API — environment check\n');

// 1. Node.js
const [major, minor] = process.versions.node.split('.').map(Number);
if (major > 22 || (major === 22 && minor >= 12)) {
  ok(`Node.js ${process.versions.node}`);
  if (major !== 24) warn('Node 24 is the tested version (.nvmrc)', 'nvm install && nvm use');
} else {
  fail(
    `Node.js ${process.versions.node} is too old (need ≥ 22.12, recommended 24)`,
    'nvm install && nvm use',
  );
}

// 2. .env
const envPath = join(ROOT, '.env');
if (!existsSync(envPath)) {
  copyFileSync(join(ROOT, '.env.example'), envPath);
  ok('.env created from .env.example (defaults work locally)');
} else {
  ok('.env present');
}
process.loadEnvFile(envPath);

if (envOnly) finish();

// 3. Dependencies
if (existsSync(join(ROOT, 'node_modules', '.pnpm'))) ok('dependencies installed');
else fail('dependencies missing', 'corepack enable && pnpm install');

// 4. PostgreSQL
const url = process.env.DATABASE_URL;
if (!url) {
  fail('DATABASE_URL is not set', 'add it to .env (see .env.example)');
} else {
  let pg;
  try {
    pg = (await import('pg')).default;
  } catch {
    fail('cannot load the pg driver', 'pnpm install');
  }
  if (pg) await checkDatabase(pg, url);
}

// 5. Port
const port = Number(process.env.PORT ?? 4000);
if (await isPortFree(port)) ok(`port ${port} is free`);
else
  warn(
    `port ${port} is in use (the API may already be running)`,
    `lsof -i :${port}, or set PORT in .env`,
  );

finish();

async function checkDatabase(pg, databaseUrl) {
  const target = new URL(databaseUrl);
  const name = decodeURIComponent(target.pathname.slice(1));
  const maintenance = new URL(databaseUrl);
  maintenance.pathname = '/postgres';

  const server = new pg.Client({
    connectionString: maintenance.toString(),
    connectionTimeoutMillis: 3000,
  });
  try {
    await server.connect();
  } catch (error) {
    const hint =
      error.code === 'ECONNREFUSED'
        ? 'start PostgreSQL: brew services start postgresql@16  |  sudo systemctl start postgresql'
        : error.code === '28P01' || error.code === '28000'
          ? `create the role: CREATE ROLE ${target.username} WITH LOGIN PASSWORD '…' CREATEDB;  (README §1.3)`
          : 'check DATABASE_URL in .env';
    fail(
      `cannot connect to PostgreSQL at ${target.host} as "${target.username}": ${error.message}`,
      hint,
    );
    return;
  }
  try {
    const { rows } = await server.query(
      `SELECT current_setting('server_version') AS version, rolcreatedb, rolsuper
         FROM pg_roles WHERE rolname = current_user`,
    );
    ok(`PostgreSQL ${rows[0].version} reachable as "${target.username}"`);
    if (Number.parseInt(rows[0].version, 10) < 13)
      fail('PostgreSQL 13+ is required (gen_random_uuid)');
    if (!rows[0].rolcreatedb && !rows[0].rolsuper) {
      warn(
        `role "${target.username}" lacks CREATEDB (db:create and e2e tests need it)`,
        `ALTER ROLE ${target.username} CREATEDB;`,
      );
    }
    const exists = await server.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (!exists.rowCount) {
      fail(`database "${name}" does not exist`, 'pnpm db:setup');
      return;
    }
    ok(`database "${name}" exists`);
  } finally {
    await server.end();
  }

  const db = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  await db.connect();
  try {
    const known = readdirSync(join(ROOT, 'src/database/migrations')).filter((f) =>
      /^\d+-.+\.ts$/.test(f),
    ).length;
    const table = await db.query(`SELECT to_regclass('public.typeorm_migrations') AS t`);
    const applied = table.rows[0].t
      ? (await db.query('SELECT count(*)::int AS n FROM typeorm_migrations')).rows[0].n
      : 0;
    if (applied < known) fail(`${known - applied} migration(s) pending`, 'pnpm db:migrate');
    else ok(`migrations up to date (${applied})`);

    if (applied > 0) {
      const users = await db.query('SELECT count(*)::int AS n FROM admin_users');
      if (users.rows[0].n === 0) fail('no accounts seeded', 'pnpm db:seed');
      else ok(`${users.rows[0].n} account(s) seeded`);
    }
  } finally {
    await db.end();
  }
}

function isPortFree(candidate) {
  return new Promise((resolve) => {
    const server = createServer()
      .once('error', () => resolve(false))
      .once('listening', () => server.close(() => resolve(true)))
      .listen(candidate);
  });
}

function finish() {
  console.log(failures ? `\n${failures} problem(s) found.` : '\nAll good — run `pnpm dev`.');
  process.exit(failures ? 1 : 0);
}
