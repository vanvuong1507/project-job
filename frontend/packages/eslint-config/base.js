import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { sharedIgnores, sharedRules } from './shared.js';

/** Base config for TypeScript packages (api-client, playwright-config). */
export default defineConfig(
  globalIgnores(sharedIgnores),
  js.configs.recommended,
  tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node } }, rules: sharedRules },
  prettier,
);
