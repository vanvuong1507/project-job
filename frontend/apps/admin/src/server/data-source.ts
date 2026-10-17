import 'server-only';
import { env } from '@/env';
import type { Repositories } from './repositories';
import { createApiRepositories } from './sources/api';
import { createMockRepositories } from './sources/mock';

function createRepositories(): Repositories {
  if (env.DATA_SOURCE === 'api') {
    if (!env.API_URL) throw new Error('API_URL is required when DATA_SOURCE=api');
    return createApiRepositories(env.API_URL);
  }
  return createMockRepositories();
}

/** The active data source (DATA_SOURCE=mock|api). Only DAL modules in src/server import this. */
export const repositories = createRepositories();
