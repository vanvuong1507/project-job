'use client';

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckIcon, CircleAlertIcon, CloseIcon } from '../../icons';
import { cn } from '../../lib/cn';

export type ToastTone = 'success' | 'error' | 'neutral';

export interface ToastOptions {
  title: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  /** Auto-dismiss delay in ms; paused while hovered or focused. */
  duration?: number;
}

interface ToastRecord extends Required<Pick<ToastOptions, 'tone' | 'duration'>> {
  id: number;
  title: ReactNode;
  description?: ReactNode;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4000;
let nextId = 0;

/** Holds the toast queue and renders the live region. Mount once near the root. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ tone = 'neutral', duration = DEFAULT_DURATION, ...rest }: ToastOptions) => {
      const id = ++nextId;
      setToasts((current) => [...current, { id, tone, duration, ...rest }]);
      return id;
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <ol
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </ol>
    </ToastContext>
  );
}

const TONE = {
  success: { icon: CheckIcon, className: 'text-positive' },
  error: { icon: CircleAlertIcon, className: 'text-negative' },
  neutral: { icon: null, className: '' },
} as const;

function ToastItem({ toast, onDismiss }: { toast: ToastRecord; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (paused) return;
    timer.current = setTimeout(() => onDismiss(toast.id), toast.duration);
    return () => clearTimeout(timer.current);
  }, [paused, toast.id, toast.duration, onDismiss]);

  const { icon: Icon, className } = TONE[toast.tone];

  return (
    <li
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-sm animate-fade-in items-start gap-3 rounded-control border border-border bg-surface p-3 text-sm shadow-card"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {Icon && <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', className)} />}
      <div className="min-w-0 flex-1">
        <p className="font-medium text-foreground">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-muted-foreground">{toast.description}</p>}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        className="rounded-sm text-muted-foreground hover:text-foreground"
        onClick={() => onDismiss(toast.id)}
      >
        <CloseIcon aria-hidden className="size-4" />
      </button>
    </li>
  );
}

/** `const { toast } = useToast(); toast({ title: 'Saved', tone: 'success' })` */
export function useToast(): ToastContextValue {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}
