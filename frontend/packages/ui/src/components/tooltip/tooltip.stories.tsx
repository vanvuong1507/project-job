import type { Meta, StoryObj } from '@storybook/react-vite';
import { TrendingUpIcon } from '../../icons';
import { IconBadge } from '../icon-badge';
import { Tooltip } from './tooltip';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EventMarker: Story = {
  args: {
    content: (
      <>
        <strong className="block">Local festival</strong>
        Foot traffic up all evening.
      </>
    ),
    children: (triggerProps) => (
      <button type="button" className="rounded-full" aria-label="Positive event" {...triggerProps}>
        <IconBadge tone="positive">
          <TrendingUpIcon />
        </IconBadge>
      </button>
    ),
  },
};
