import { DataSource } from 'typeorm';
import { createDatabaseIfMissing } from '../../src/database/utils/create-database.js';
import { createDataSourceOptions } from '../../src/database/typeorm.config.js';
import { testConfig } from './test-env.js';

/** Once per run: create the test database if needed, drop everything, apply all migrations. */
export default async function globalSetup() {
  const config = testConfig();
  await createDatabaseIfMissing(config.database.url);
  const dataSource = await new DataSource(createDataSourceOptions(config.database)).initialize();
  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations({ transaction: 'each' });
  } finally {
    await dataSource.destroy();
  }
}
