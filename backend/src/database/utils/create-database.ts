import { Client } from 'pg';
import { databaseNameOf, maintenanceUrlOf } from './database-url.js';

/** Creates the database named in `url` if it doesn't exist. Returns whether it was created. */
export async function createDatabaseIfMissing(url: string): Promise<boolean> {
  const name = databaseNameOf(url);
  const client = new Client({ connectionString: maintenanceUrlOf(url) });
  await client.connect();
  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (rowCount) return false;
    await client.query(`CREATE DATABASE "${name}"`);
    return true;
  } finally {
    await client.end();
  }
}
