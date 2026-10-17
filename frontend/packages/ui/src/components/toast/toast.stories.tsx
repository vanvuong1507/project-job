import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../button';
import { ToastProvider, useToast } from './toast';

const meta = {
  title: 'Feedback/Toast',
  component: ToastProvider,
  decorators: [(Story) => <ToastProvider>{Story()}</ToastProvider>],
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

function Triggers() {
  const { toast } = useToast();
  return (
    <div className="flex gap-2">
      <Button
        onClick={() =>
          toast({ title: 'Week saved', description: 'Mon 12 – Sun 18 Oct', tone: 'success' })
        }
      >
        Success
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          toast({
            title: "Couldn't save the week",
            description: 'Please try again.',
            tone: 'error',
          })
        }
      >
        Error
      </Button>
      <Button variant="outline" onClick={() => toast({ title: 'Event deleted' })}>
        Neutral
      </Button>
    </div>
  );
}

export const Playground: Story = { args: { children: null }, render: () => <Triggers /> };
