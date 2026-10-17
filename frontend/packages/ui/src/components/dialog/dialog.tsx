'use client';

import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { useControllableState } from '../../hooks/use-controllable-state';
import { cn } from '../../lib/cn';
import { Button } from '../button';

const DialogTitleContext = createContext<string | undefined>(undefined);

export interface DialogProps extends Omit<
  ComponentProps<'dialog'>,
  'open' | 'onClose' | 'onCancel'
> {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Modal built on the native <dialog> + showModal(): focus containment, Escape, top layer and
 * inert background come from the browser. Clicking the backdrop closes it.
 */
export function Dialog({
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...props
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isOpen, setOpen] = useControllableState({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-card border border-border bg-surface p-0 text-foreground shadow-card',
        'backdrop:bg-overlay/50 open:animate-fade-in',
        className,
      )}
      // Escape and form[method=dialog] fire `close`; keep state in sync.
      onClose={() => setOpen(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
      {...props}
    >
      <DialogTitleContext value={titleId}>
        {isOpen && <div className="flex flex-col gap-4 p-6">{children}</div>}
      </DialogTitleContext>
    </dialog>
  );
}

export function DialogTitle({ className, ...props }: ComponentProps<'h2'>) {
  const id = use(DialogTitleContext);
  return <h2 id={id} className={cn('text-lg font-semibold', className)} {...props} />;
}

export function DialogDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  /** Red confirm button for irreversible actions. */
  destructive?: boolean;
  /** Busy state while the confirmed action runs; the dialog stays open until the caller closes it. */
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)} role="alertdialog">
      <DialogTitle>{title}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
      <DialogFooter>
        <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
