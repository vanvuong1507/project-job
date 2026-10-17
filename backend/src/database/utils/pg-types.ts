import { types } from 'pg';

/**
 * Keep Postgres `date` values as `YYYY-MM-DD` strings. node-postgres would otherwise turn them into
 * a JS `Date` at local midnight, which shifts the day depending on the server's timezone.
 * Imported for its side effect by typeorm.config.ts, before any connection is opened.
 */
const DATE_OID = 1082;
types.setTypeParser(DATE_OID, (value) => value);
