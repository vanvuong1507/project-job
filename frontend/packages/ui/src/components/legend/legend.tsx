import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Legend({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-foreground',
        className,
      )}
      {...props}
    />
  );
}

export interface LegendItemProps extends ComponentProps<'li'> {
  /** Swatch or icon shown before the label. */
  indicator: ReactNode;
  /** Dims the item, e.g. when its series is hidden. */
  inactive?: boolean;
}

export function LegendItem({
  indicator,
  inactive,
  className,
  children,
  ...props
}: LegendItemProps) {
  return (
    <li
      className={cn(
        'inline-flex items-center gap-2 transition-opacity',
        inactive && 'opacity-40',
        className,
      )}
      {...props}
    >
      {indicator}
      {children}
    </li>
  );
}

/** Vertical rule between legend groups. */
export function LegendSeparator({ className, ...props }: ComponentProps<'li'>) {
  return <li aria-hidden className={cn('h-4 w-px bg-border-strong', className)} {...props} />;
}
