import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from '../input';
import { Select } from '../select';
import { Textarea } from '../textarea';
import { Field } from './field';

const meta = {
  title: 'Forms/Field',
  component: Field,
  parameters: { layout: 'padded' },
  args: { label: 'Title', children: (control) => <Input {...control} /> },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { className: 'max-w-sm' } };
export const WithHint: Story = {
  args: { className: 'max-w-sm', hint: 'Up to 120 characters', required: true },
};
export const WithError: Story = {
  args: { className: 'max-w-sm', error: 'Title is required', required: true },
};

export const EventForm: Story = {
  render: () => (
    <form className="grid max-w-md gap-4">
      <Field label="Date" required>
        {(control) => <Input type="date" defaultValue="2026-10-17" {...control} />}
      </Field>
      <Field label="Impact" required>
        {(control) => (
          <Select defaultValue="POSITIVE" {...control}>
            <option value="POSITIVE">Positive</option>
            <option value="NEGATIVE">Negative</option>
          </Select>
        )}
      </Field>
      <Field label="Title" required error="Title is required">
        {(control) => <Input {...control} />}
      </Field>
      <Field label="Description" hint="Optional">
        {(control) => <Textarea {...control} />}
      </Field>
    </form>
  ),
};
