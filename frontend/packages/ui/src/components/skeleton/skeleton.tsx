import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

/** Loading placeholder; size it with classes, e.g. `<Skeleton className="h-20 rounded-tile" />`. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-control bg-surface-muted', className)}
      {...props}
    />
  );
}
