import './utils/pg-types.js';
import type { DataSourceOptions } from 'typeorm';
import { AdminUserEntity } from '../modules/auth/entities/admin-user.entity.js';
import { AuthSessionEntity } from '../modules/auth/entities/auth-session.entity.js';
import { EventImpactEntity } from '../modules/events/entities/event-impact.entity.js';
import { DailyMetricEntity } from '../modules/metrics/entities/daily-metric.entity.js';
import { migrations } from './migrations/index.js';
import type { AppConfig } from '../config/app-config.js';

export const entities = [AdminUserEntity, AuthSessionEntity, DailyMetricEntity, EventImpactEntity];

/**
 * One TypeORM configuration for the Nest app, the db:* scripts and the TypeORM CLI.
 * The schema is owned by migrations: `synchronize` is never enabled.
 */
export function createDataSourceOptions(database: AppConfig['database']): DataSourceOptions {
  return {
    type: 'postgres',
    url: database.url,
    entities,
    migrations,
    migrationsTableName: 'typeorm_migrations',
    synchronize: false,
    migrationsRun: false,
    // gen_random_uuid() is built into Postgres 13+, so no extension (and no superuser) is needed.
    uuidExtension: 'pgcrypto',
    installExtensions: false,
    logging: database.logging ? 'all' : ['error', 'warn', 'migration'],
    // node-postgres pool: fail fast when the DB is unreachable, and cap runaway queries.
    extra: {
      max: database.poolMax,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
      application_name: 'revenue-dashboard-api',
    },
  };
}
