import type { Meta, StoryObj } from '@storybook/react-vite';
import { formatCurrency, formatNumber } from '../../lib/format';
import { StatCard } from './stat-card';

const meta = {
  title: 'Components/StatCard',
  component: StatCard,
  args: { label: 'Total Revenue', value: formatCurrency(15974), className: 'w-80' },
} satisfies Meta<typeof StatCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValueOnly: Story = {};
export const WithComparison: Story = {
  args: { comparison: { value: formatCurrency(14982), delta: 6.6 } },
};
export const NegativeChange: Story = {
  args: {
    label: 'Total Covers',
    value: formatNumber(780),
    comparison: { value: formatNumber(820), delta: -4.9 },
  },
};
export const NoPreviousData: Story = {
  args: { comparison: { value: formatCurrency(0), delta: null } },
};
