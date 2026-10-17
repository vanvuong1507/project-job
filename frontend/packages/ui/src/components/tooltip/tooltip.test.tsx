import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip } from './tooltip';

describe('Tooltip', () => {
  it('shows on keyboard focus, links via aria-describedby and hides on Escape', async () => {
    render(
      <Tooltip content="Local festival">
        {(triggerProps) => (
          <button type="button" {...triggerProps}>
            Event
          </button>
        )}
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: 'Event' });

    await userEvent.tab();
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeVisible();
    expect(trigger).toHaveAccessibleDescription('Local festival');

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
