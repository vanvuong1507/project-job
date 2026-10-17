import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrendingDownIcon, TrendingUpIcon } from '../../icons';
import { IconBadge } from './icon-badge';

const meta = {
  title: 'Components/IconBadge',
  component: IconBadge,
} satisfies Meta<typeof IconBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Positive: Story = {
  args: { tone: 'positive', label: 'Positive event impact', children: <TrendingUpIcon /> },
};
export const Negative: Story = {
  args: { tone: 'negative', label: 'Negative event impact', children: <TrendingDownIcon /> },
};
