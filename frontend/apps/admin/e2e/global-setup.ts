import { rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Every run starts from the committed seed: the mock store reads its file on each request,
 * so deleting it is enough — even when Playwright reuses an already running dev server.
 */
export default async function globalSetup() {
  await rm(join(import.meta.dirname, '..', '.mock-data'), { recursive: true, force: true });
}
