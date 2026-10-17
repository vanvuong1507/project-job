import { Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import type { DateRangeQuery } from '../../common/validation/schemas.js';

/**
 * `{ date: … }` for an optional `from`/`to` range (inclusive), or `{}` for no bounds.
 * TypeORM 1.x throws on `undefined` in a where clause, so absent bounds are left out entirely.
 */
export function dateWhere({ from, to }: DateRangeQuery) {
  if (from && to) return { date: Between(from, to) };
  if (from) return { date: MoreThanOrEqual(from) };
  if (to) return { date: LessThanOrEqual(to) };
  return {};
}
