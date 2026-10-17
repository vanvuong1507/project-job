import { DataSource } from 'typeorm';
import { loadAppConfig } from '../config/app-config.js';
import { createDataSourceOptions } from './typeorm.config.js';

/**
 * Data source for the TypeORM CLI only (`pnpm migration:generate`). Reads `.env`.
 * The CLI requires exactly one export, a DataSource instance.
 */
export default new DataSource(createDataSourceOptions(loadAppConfig().database));
