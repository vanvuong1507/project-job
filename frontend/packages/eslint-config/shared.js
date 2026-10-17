/** Rules shared by every config in this package. */
export const sharedRules = {
  eqeqeq: ['error', 'smart'],
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  '@typescript-eslint/consistent-type-imports': ['warn', { fixStyle: 'inline-type-imports' }],
  '@typescript-eslint/no-unused-vars': [
    'warn',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
};

export const sharedIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/storybook-static/**',
  '**/playwright-report/**',
  '**/test-results/**',
];
