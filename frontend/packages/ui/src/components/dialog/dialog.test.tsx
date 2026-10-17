import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../button';
import { ConfirmDialog, Dialog, DialogTitle } from './dialog';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle>Edit event</DialogTitle>
        <Button onClick={() => setOpen(false)}>Done</Button>
      </Dialog>
    </>
  );
}

describe('Dialog', () => {
  it('opens as a labelled modal and closes from inside', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Edit event' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('reports close when the browser closes it (Escape / backdrop)', () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogTitle>Edit event</DialogTitle>
      </Dialog>,
    );

    fireEvent(screen.getByRole('dialog'), new Event('close'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('ConfirmDialog', () => {
  it('confirms or cancels, and blocks closing while busy', async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Delete event?"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        destructive
        confirmLabel="Delete"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();

    rerender(
      <ConfirmDialog
        open
        loading
        title="Delete event?"
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
        confirmLabel="Delete"
      />,
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    fireEvent(screen.getByRole('alertdialog'), new Event('close'));
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
