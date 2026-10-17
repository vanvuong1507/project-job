import { z } from 'zod';
import { uuidSchema } from '../../../common/validation/schemas.js';
import { ROLES } from '../permissions.js';

/** Body of POST /api/auth/login. */
export const loginSchema = z.object({
  email: z.email({ error: 'Enter a valid email' }).meta({ example: 'admin@example.com' }),
  password: z
    .string({ error: 'Enter your password' })
    .min(1, 'Enter your password')
    .max(200, 'Use at most 200 characters')
    .meta({ example: 'admin123' }),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** What the API exposes about a user — never the password hash. Mirrors `@frontend/api-client` AdminUser. */
export const adminUserSchema = z.object({
  id: uuidSchema,
  email: z.email().meta({ example: 'admin@example.com' }),
  name: z.string().meta({ example: 'Restaurant Admin' }),
  role: z.enum(ROLES).meta({ description: 'ADMIN: full access · VIEWER: read-only' }),
});

export type AdminUser = z.infer<typeof adminUserSchema>;

export const userResponseSchema = z.object({ user: adminUserSchema });

/**
 * Body of POST /api/auth/refresh and /logout. Browsers send nothing (the httpOnly `admin_refresh`
 * cookie is used); server-side clients (the admin app) send the token here.
 */
export const refreshSchema = z
  .object({
    refreshToken: z
      .string({ error: 'refreshToken must be a string' })
      .max(200, 'refreshToken is too long')
      .optional()
      .meta({ description: 'Omit when the `admin_refresh` cookie is sent' }),
  })
  .default({});

export type RefreshInput = z.infer<typeof refreshSchema>;
