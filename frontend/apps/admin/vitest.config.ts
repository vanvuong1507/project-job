import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Unit tests exercise server modules directly; `server-only` would throw outside React Server.
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
