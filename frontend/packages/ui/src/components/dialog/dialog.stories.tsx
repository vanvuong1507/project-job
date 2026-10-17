import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Button } from '../button';
import { Field } from '../field';
import { Input } from '../input';
import { ConfirmDialog, Dialog, DialogDescription, DialogFooter, DialogTitle } from './dialog';

const meta = {
  title: 'Overlays/Dialog',
  component: Dialog,
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

function FormDialogExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Add event</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTitle>Add event</DialogTitle>
        <DialogDescription>Events are shown as markers on the dashboard chart.</DialogDescription>
        <Field label="Title" required>
          {(control) => <Input {...control} />}
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpen(false)}>Save</Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}

function ConfirmExample() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        destructive
        title="Delete this event?"
        description="It will disappear from the dashboard chart. This can't be undone."
        confirmLabel="Delete"
        onConfirm={() => setOpen(false)}
      />
    </>
  );
}

export const FormDialog: Story = { render: () => <FormDialogExample /> };
export const Confirm: Story = { render: () => <ConfirmExample /> };
