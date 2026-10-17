import { loadSeedUsers } from '../seeds/seed-config.js';
import { assertSafeSeed, seedDatabase } from '../seeds/seed.js';
import { runWithDataSource } from './run-with-data-source.js';

/**
 * `pnpm db:seed` — the admin + client (viewer) accounts and the demo weeks (idempotent).
 * `pnpm db:seed --users-only` — accounts only (the only mode allowed in production).
 */
await runWithDataSource(async (dataSource, config) => {
  const users = loadSeedUsers();
  const demoData = !process.argv.includes('--users-only');
  assertSafeSeed({ production: config.isProduction, demoData, users });

  const result = await seedDatabase(dataSource, users, { demoData });
  for (const user of result.users) console.log(`✓ User ${user}`);
  if (demoData) {
    console.log(`✓ ${result.dailyMetrics} daily metrics upserted`);
    console.log(`✓ ${result.eventsInserted} events inserted`);
  }
});
