import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import { sharedIgnores, sharedRules } from './shared.js';

/** Config for Next.js apps (client, admin). */
export default defineConfig(
  globalIgnores([...sharedIgnores, 'out/**', 'next-env.d.ts']),
  nextVitals,
  nextTs,
  { rules: sharedRules },
  prettier,
);
