import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../input';
import { Field } from './field';

describe('Field', () => {
  it('labels its control', () => {
    render(<Field label="Title">{(control) => <Input {...control} />}</Field>);

    const input = screen.getByLabelText('Title');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('wires hint and error to the control and announces the error', () => {
    render(
      <Field label="Title" hint="Up to 120 characters" error="Title is required" required>
        {(control) => <Input {...control} />}
      </Field>,
    );

    const input = screen.getByRole('textbox', { name: 'Title' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription('Up to 120 characters Title is required');
    expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
  });

  it('keeps a visually hidden label as the accessible name', () => {
    render(
      <Field label="POS revenue, Mon" hideLabel>
        {(control) => <Input {...control} />}
      </Field>,
    );

    expect(screen.getByRole('textbox', { name: 'POS revenue, Mon' })).toBeInTheDocument();
  });
});
