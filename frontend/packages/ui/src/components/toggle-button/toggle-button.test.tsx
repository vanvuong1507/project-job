import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ToggleButton } from './toggle-button';

describe('ToggleButton', () => {
  it('toggles aria-pressed and reports the new state', async () => {
    const onPressedChange = vi.fn();
    render(<ToggleButton onPressedChange={onPressedChange}>Compare</ToggleButton>);
    const button = screen.getByRole('button', { name: 'Compare' });

    expect(button).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it('stays in sync with a controlled value', async () => {
    render(<ToggleButton pressed>Compare</ToggleButton>);
    const button = screen.getByRole('button', { name: 'Compare' });

    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-pressed', 'true');
  });
});
