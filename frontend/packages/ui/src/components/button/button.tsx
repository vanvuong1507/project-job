import type { ComponentProps } from 'react';
import { SpinnerIcon } from '../../icons';
import { cn } from '../../lib/cn';

const VARIANT_CLASSES = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  accent: 'bg-accent text-accent-foreground hover:bg-accent-hover',
  outline: 'border border-border bg-surface-muted text-foreground hover:bg-border',
  ghost: 'text-foreground hover:bg-surface-muted',
  danger: 'bg-negative text-primary-foreground hover:bg-negative/90',
} as const;

const SIZE_CLASSES = {
  sm: 'h-8 px-3 text-sm [&_svg]:size-3.5',
  md: 'h-9 px-4 text-sm [&_svg]:size-4',
  icon: 'size-9 [&_svg]:size-4',
} as const;

export type ButtonVariant = keyof typeof VARIANT_CLASSES;
export type ButtonSize = keyof typeof SIZE_CLASSES;

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets `aria-busy`. */
  loading?: boolean;
}

/** Class builder, shared with components that look like a button (e.g. ToggleButton, links). */
export function buttonClasses({
  variant = 'primary',
  size = 'md',
  className,
}: Pick<ButtonProps, 'variant' | 'size' | 'className'> = {}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-medium whitespace-nowrap',
    'transition-colors duration-150 ease-emphasized [&_svg]:shrink-0',
    'disabled:pointer-events-none disabled:opacity-50',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
      {...props}
    >
      {loading && <SpinnerIcon aria-hidden className="animate-spin" />}
      {children}
    </button>
  );
}
