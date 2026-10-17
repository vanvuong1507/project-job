import { z } from 'zod';
import { loadEnvFile, readEnv } from '../../config/env.js';
import type { Role } from '../../modules/auth/permissions.js';

/**
 * Accounts created/updated by `pnpm db:seed` — one per role the admin app knows, with the same
 * defaults as the frontend's `apps/admin/.env.example`:
 * - ADMIN  (admin):  full access;
 * - VIEWER (client): read-only — the "client" account; the frontend has no other role.
 */
const seedEnvSchema = z.object({
  ADMIN_EMAIL: z.email().default('admin@example.com'),
  ADMIN_PASSWORD: z
    .string()
    .min(8, 'ADMIN_PASSWORD must be at least 8 characters')
    .default('admin123'),
  ADMIN_NAME: z.string().min(1).max(120).default('Restaurant Admin'),
  VIEWER_EMAIL: z.email().default('viewer@example.com'),
  VIEWER_PASSWORD: z
    .string()
    .min(8, 'VIEWER_PASSWORD must be at least 8 characters')
    .default('viewer123'),
  VIEWER_NAME: z.string().min(1).max(120).default('Read-only Viewer'),
});

export interface SeedUser {
  email: string;
  password: string;
  name: string;
  role: Role;
}

export function parseSeedUsers(source: NodeJS.ProcessEnv = process.env): SeedUser[] {
  const env = readEnv(seedEnvSchema, source);
  return [
    { email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, name: env.ADMIN_NAME, role: 'ADMIN' },
    {
      email: env.VIEWER_EMAIL,
      password: env.VIEWER_PASSWORD,
      name: env.VIEWER_NAME,
      role: 'VIEWER',
    },
  ];
}

export function loadSeedUsers(): SeedUser[] {
  loadEnvFile();
  return parseSeedUsers();
}
