import { loadAppConfig } from '../../config/app-config.js';
import { createDatabaseIfMissing } from '../utils/create-database.js';
import { databaseNameOf } from '../utils/database-url.js';

/** `pnpm db:create` — creates the database from DATABASE_URL if it doesn't exist yet. */
try {
  const { database } = loadAppConfig();
  const name = databaseNameOf(database.url);
  const created = await createDatabaseIfMissing(database.url);
  console.log(created ? `✓ Created database "${name}"` : `• Database "${name}" already exists`);
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  console.error('  Check that PostgreSQL is running and that the DATABASE_URL user has CREATEDB.');
  process.exitCode = 1;
}
