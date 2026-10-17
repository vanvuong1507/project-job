import { runWithDataSource } from './run-with-data-source.js';

/** `pnpm db:revert` — reverts the most recent migration. */
await runWithDataSource(async (dataSource) => {
  await dataSource.undoLastMigration({ transaction: 'each' });
  console.log('✓ Reverted the last migration');
});
