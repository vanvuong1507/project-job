import { existsSync } from 'node:fs';
import type { z } from 'zod';

/** Loads `.env` from the working directory if present. Variables already set in the shell win. */
export function loadEnvFile(path = '.env'): void {
  if (existsSync(path)) process.loadEnvFile(path);
}

/**
 * Validates `source` against an env schema. Empty values count as unset (like `KEY=` in a .env file),
 * and every problem is reported at once so a misconfigured deploy fails with one readable message.
 */
export function readEnv<S extends z.ZodType>(
  schema: S,
  source: NodeJS.ProcessEnv = process.env,
): z.output<S> {
  const result = schema.safeParse(
    Object.fromEntries(Object.entries(source).filter(([, value]) => value !== '')),
  );
  if (!result.success) {
    const lines = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(env)'}: ${issue.message}`,
    );
    throw new Error(`Invalid environment variables (see .env.example):\n${lines.join('\n')}`);
  }
  return result.data;
}

/** `a, b ,c` → `['a', 'b', 'c']`. */
export const splitCsv = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
