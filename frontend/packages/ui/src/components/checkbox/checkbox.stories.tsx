import type { Meta, StoryObj } from '@storybook/react-vite';
import { Swatch } from '../swatch';
import { Checkbox } from './checkbox';

const meta = {
  title: 'Components/Checkbox',
  component: Checkbox,
  args: { label: 'POS Revenue', defaultChecked: true },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Checked: Story = {};
export const Unchecked: Story = { args: { defaultChecked: false } };
export const WithSwatch: Story = {
  args: { label: 'Eatclub Revenue', adornment: <Swatch color="chart-eatclub" shape="line" /> },
};
export const Disabled: Story = { args: { disabled: true } };
