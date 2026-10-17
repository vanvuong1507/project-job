import type { Decorator, Preview } from '@storybook/react-vite';
import './preview.css';

/** Mirrors next-themes in the apps: the `.dark` class on <html> switches the semantic tokens. */
const withTheme: Decorator = (Story, context) => {
  const dark = context.globals.theme === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  return Story();
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Colour theme',
      toolbar: {
        title: 'Theme',
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light', icon: 'sun' },
          { value: 'dark', title: 'Dark', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'error' },
  },
  tags: ['autodocs'],
};

export default preview;
