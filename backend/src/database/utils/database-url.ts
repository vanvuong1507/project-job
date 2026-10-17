/** Database name from a postgres:// URL, validated so it can be safely quoted as an identifier. */
export function databaseNameOf(url: string): string {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  if (!/^[A-Za-z0-9_-]{1,63}$/.test(name)) {
    throw new Error(`Unsupported database name "${name}" (use letters, digits, _ or -)`);
  }
  return name;
}

/** Same server and credentials, but the `postgres` maintenance database (to CREATE/DROP DATABASE). */
export function maintenanceUrlOf(url: string): string {
  const maintenance = new URL(url);
  maintenance.pathname = '/postgres';
  return maintenance.toString();
}
