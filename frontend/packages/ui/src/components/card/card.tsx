import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'flex flex-col gap-6 rounded-card border border-border bg-surface p-6 shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'header'>) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('max-w-xs text-xl leading-snug font-medium text-foreground', className)}
      {...props}
    />
  );
}

export function CardActions({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-6', className)} {...props} />;
}
