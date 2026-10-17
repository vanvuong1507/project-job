import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './select';

const meta = {
  title: 'Forms/Select',
  component: Select,
  args: {
    'aria-label': 'Impact',
    className: 'w-56',
    children: (
      <>
        <option value="POSITIVE">Positive</option>
        <option value="NEGATIVE">Negative</option>
      </>
    ),
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Disabled: Story = { args: { disabled: true } };
