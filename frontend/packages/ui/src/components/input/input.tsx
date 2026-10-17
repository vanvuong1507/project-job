import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

/** Shared look of every text-like form control (Input, Textarea, Select). */
export function controlClasses(className?: string) {
  return cn(
    'w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-foreground',
    'transition-colors duration-150 placeholder:text-subtle-foreground',
    'aria-invalid:border-negative aria-invalid:outline-negative',
    'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60',
    className,
  );
}

export type InputProps = ComponentProps<'input'>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return (
    <input type={type} className={controlClasses(cn('h-9 tabular-nums', className))} {...props} />
  );
}
