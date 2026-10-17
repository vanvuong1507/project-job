import { runWithDataSource } from './run-with-data-source.js';

/** `pnpm db:migrate` — applies pending migrations, each in its own transaction. */
await runWithDataSource(async (dataSource) => {
  const applied = await dataSource.runMigrations({ transaction: 'each' });
  if (applied.length === 0) console.log('• No pending migrations');
  for (const migration of applied) console.log(`✓ Applied ${migration.name}`);
});
