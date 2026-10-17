import { defineConfig } from 'vitest/config';

// Unit tests: src/**/*.spec.ts — pure logic, no database.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/database/migrations/**'],
    },
  },
});
