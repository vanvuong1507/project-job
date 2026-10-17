import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './input';

const meta = {
  title: 'Forms/Input',
  component: Input,
  args: { 'aria-label': 'POS revenue', placeholder: '0.00', className: 'w-56' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Number: Story = { args: { type: 'number', defaultValue: 1720, min: 0, step: 0.01 } };
export const Invalid: Story = { args: { defaultValue: '-5', 'aria-invalid': true } };
export const Disabled: Story = { args: { defaultValue: '1720', disabled: true } };
