import type { Meta, StoryObj } from '@storybook/react-vite';
import { ChartColumnIcon } from '../../icons';
import { ToggleButton } from './toggle-button';

const meta = {
  title: 'Components/ToggleButton',
  component: ToggleButton,
  args: {
    children: (
      <>
        <ChartColumnIcon aria-hidden />
        Compare to Previous
      </>
    ),
  },
} satisfies Meta<typeof ToggleButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { defaultPressed: true } };
