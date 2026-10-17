import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

export interface TableProps extends ComponentProps<'table'> {
  /** Classes for the scrolling wrapper, e.g. `max-lg:hidden` to swap the table for a card list. */
  wrapperClassName?: string;
}

/** Semantic table; the wrapper scrolls horizontally on narrow screens instead of the page. */
export function Table({ className, wrapperClassName, ...props }: TableProps) {
  return (
    // `relative`: absolutely positioned descendants (e.g. sr-only labels) must stay inside the
    // scroll container; otherwise they are positioned against the page and widen it.
    <div
      className={cn(
        'relative w-full overflow-x-auto rounded-tile border border-border',
        wrapperClassName,
      )}
    >
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('bg-surface-muted', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={cn('[&>tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: ComponentProps<'tfoot'>) {
  return (
    <tfoot
      className={cn('border-t border-border bg-surface-muted font-medium', className)}
      {...props}
    />
  );
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-border', className)} {...props} />;
}

export function TableHead({ className, scope = 'col', ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope={scope}
      className={cn(
        'h-10 px-3 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-3 py-2 align-middle', className)} {...props} />;
}
