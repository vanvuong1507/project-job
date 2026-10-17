import type { Meta, StoryObj } from '@storybook/react-vite';
import { Skeleton } from './skeleton';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const StatCards: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <Skeleton className="h-20 rounded-tile" />
      <Skeleton className="h-20 rounded-tile" />
      <Skeleton className="h-20 rounded-tile" />
    </div>
  ),
};
