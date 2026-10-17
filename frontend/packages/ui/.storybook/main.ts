import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

const config: StorybookConfig = {
  framework: '@storybook/react-vite',
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  async viteFinal(config) {
    config.plugins = [...(config.plugins ?? []), tailwindcss()];
    config.build = {
      ...config.build,
      // Storybook's manager/preview bundles are large by nature.
      chunkSizeWarningLimit: 1500,
      rolldownOptions: {
        ...config.build?.rolldownOptions,
        onwarn(warning, defaultHandler) {
          // `"use client"` in RSC-ready deps (lucide-react) is meaningless outside Next — safe to drop.
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
          defaultHandler(warning);
        },
      },
    };
    return config;
  },
};

export default config;
