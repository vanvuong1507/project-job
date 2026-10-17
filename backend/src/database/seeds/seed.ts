import type { DataSource } from 'typeorm';
import { AdminUserEntity } from '../../modules/auth/entities/admin-user.entity.js';
import { hashPassword } from '../../modules/auth/utils/password.js';
import { EventImpactEntity } from '../../modules/events/entities/event-impact.entity.js';
import { DailyMetricEntity } from '../../modules/metrics/entities/daily-metric.entity.js';
import type { SeedUser } from './seed-config.js';
import { SEED_DAILY_METRICS, SEED_EVENTS } from './seed-data.js';

export interface SeedResult {
  users: string[];
  dailyMetrics: number;
  eventsInserted: number;
}

/** Passwords shipped in .env.example; never acceptable on a production database. */
const EXAMPLE_PASSWORDS = new Set(['admin123', 'viewer123']);

/** Refuses demo data and example passwords in production. */
export function assertSafeSeed({
  production,
  demoData,
  users,
}: {
  production: boolean;
  demoData: boolean;
  users: readonly SeedUser[];
}): void {
  if (!production) return;
  if (demoData) {
    throw new Error('Demo data is not seeded in production. Use: pnpm db:seed --users-only');
  }
  const weak = users.filter((user) => EXAMPLE_PASSWORDS.has(user.password));
  if (weak.length) {
    throw new Error(`Set real passwords for: ${weak.map((user) => user.email).join(', ')}`);
  }
}

/**
 * Idempotent seed, in one transaction:
 * - the accounts (upserted by email: password, name and role are reset on every run);
 * - with `demoData`: the 14 demo days (upserted by date) and the demo events (inserted only if
 *   an event with the same date + title doesn't exist).
 */
export async function seedDatabase(
  dataSource: DataSource,
  seedUsers: readonly SeedUser[],
  { demoData = true }: { demoData?: boolean } = {},
): Promise<SeedResult> {
  const users = await Promise.all(
    seedUsers.map(async ({ email, password, name, role }) => ({
      email: email.toLowerCase(),
      name,
      role,
      passwordHash: await hashPassword(password),
    })),
  );

  return dataSource.transaction(async (manager) => {
    await manager.getRepository(AdminUserEntity).upsert(users, { conflictPaths: ['email'] });
    const accounts = users.map(({ email, role }) => `${email} (${role})`);
    if (!demoData) return { users: accounts, dailyMetrics: 0, eventsInserted: 0 };

    await manager
      .getRepository(DailyMetricEntity)
      .upsert(SEED_DAILY_METRICS, { conflictPaths: ['date'] });

    const events = manager.getRepository(EventImpactEntity);
    let eventsInserted = 0;
    for (const event of SEED_EVENTS) {
      if (!(await events.existsBy({ date: event.date, title: event.title }))) {
        await events.insert(event);
        eventsInserted++;
      }
    }

    return {
      users: accounts,
      dailyMetrics: SEED_DAILY_METRICS.length,
      eventsInserted,
    };
  });
}
