import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChartColumnIcon, DownloadIcon } from '../../icons';
import { Button } from './button';

const meta = {
  title: 'Components/Button',
  component: Button,
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'accent', 'outline', 'ghost', 'danger'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'icon'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Accent: Story = { args: { variant: 'accent' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Delete' } };

export const WithIcon: Story = {
  args: {
    variant: 'outline',
    children: (
      <>
        <DownloadIcon aria-hidden />
        Export PNG
      </>
    ),
  },
};

export const IconOnly: Story = {
  args: { size: 'icon', variant: 'outline', 'aria-label': 'Chart', children: <ChartColumnIcon /> },
};

export const Loading: Story = { args: { loading: true, children: 'Saving' } };
export const Disabled: Story = { args: { disabled: true } };
