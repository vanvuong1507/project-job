import config from '@frontend/eslint-config/next';
import { defineConfig } from 'eslint/config';

/** Architecture boundaries (see CLAUDE.md → Project structure). */
const NO_SERVER = {
  group: ['@/server', '@/server/*'],
  message:
    'server-only code: read data in a Server Component under src/app and pass it down as props.',
};
const NO_APP = {
  group: ['@/app', '@/app/*'],
  message: 'src/app is routing only; move shared code to features/, components/ or lib/.',
};

export default defineConfig(config, {
  files: ['src/features/**', 'src/components/**', 'src/lib/**'],
  ignores: ['**/*.test.ts'],
  rules: { 'no-restricted-imports': ['error', { patterns: [NO_SERVER, NO_APP] }] },
});
