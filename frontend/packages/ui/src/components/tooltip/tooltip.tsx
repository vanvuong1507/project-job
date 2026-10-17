'use client';

import type { ReactNode } from 'react';
import {
  useTooltip,
  type TooltipTriggerProps,
  type UseTooltipOptions,
} from '../../hooks/use-tooltip';
import { cn } from '../../lib/cn';

export interface TooltipProps extends UseTooltipOptions {
  content: ReactNode;
  /** Render prop: spread the props on a focusable trigger (button, link). */
  children: (triggerProps: TooltipTriggerProps) => ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** Styled tooltip on top of the headless `useTooltip` hook. */
export function Tooltip({ content, children, side = 'top', openDelay, className }: TooltipProps) {
  const { triggerProps, tooltipProps } = useTooltip({ openDelay });

  return (
    <span className="relative inline-flex">
      {children(triggerProps)}
      <span
        {...tooltipProps}
        className={cn(
          'absolute left-1/2 z-50 w-max max-w-64 -translate-x-1/2 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-foreground shadow-md',
          'pointer-events-none animate-fade-in',
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          className,
        )}
      >
        {content}
      </span>
    </span>
  );
}
