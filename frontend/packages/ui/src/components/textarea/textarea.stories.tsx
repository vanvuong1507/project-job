import type { Meta, StoryObj } from '@storybook/react-vite';
import { Textarea } from './textarea';

const meta = {
  title: 'Forms/Textarea',
  component: Textarea,
  args: { 'aria-label': 'Description', placeholder: 'What happened?', className: 'w-80' },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Invalid: Story = { args: { 'aria-invalid': true } };
