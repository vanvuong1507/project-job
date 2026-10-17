import { loadSeedUsers } from '../seeds/seed-config.js';
import { seedDatabase } from '../seeds/seed.js';
import { runWithDataSource } from './run-with-data-source.js';

/** `pnpm db:reset` — DROPS every table, re-runs all migrations, then seeds. Never in production. */
await runWithDataSource(async (dataSource, config) => {
  if (config.isProduction) throw new Error('Refusing to reset a production database');
  const users = loadSeedUsers();
  await dataSource.dropDatabase();
  console.log('✓ Dropped all tables');
  const applied = await dataSource.runMigrations({ transaction: 'each' });
  console.log(`✓ Applied ${applied.length} migration(s)`);
  await seedDatabase(dataSource, users, { demoData: true });
  console.log('✓ Seeded accounts and demo data');
});
