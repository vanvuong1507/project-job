import reactHooks from 'eslint-plugin-react-hooks';
import storybook from 'eslint-plugin-storybook';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import base from './base.js';

/** Config for shared React packages (ui), including Storybook stories. */
export default defineConfig(
  base,
  reactHooks.configs.flat.recommended,
  storybook.configs['flat/recommended'],
  { languageOptions: { globals: { ...globals.browser } } },
);
