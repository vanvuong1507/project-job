import { DataSource } from 'typeorm';
import { type AppConfig, loadAppConfig } from '../../config/app-config.js';
import { createDataSourceOptions } from '../typeorm.config.js';

/** Runs a db:* script with a connected data source; prints a clean error and exits 1 on failure. */
export async function runWithDataSource(
  task: (dataSource: DataSource, config: AppConfig) => Promise<void>,
): Promise<void> {
  let dataSource: DataSource | undefined;
  try {
    const config = loadAppConfig();
    dataSource = await new DataSource(createDataSourceOptions(config.database)).initialize();
    await task(dataSource, config);
  } catch (error) {
    console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    await dataSource?.destroy();
  }
}
