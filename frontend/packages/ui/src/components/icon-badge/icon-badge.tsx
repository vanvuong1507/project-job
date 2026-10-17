import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';

const TONE_CLASSES = {
  positive: 'bg-positive-soft text-positive ring-positive/25',
  negative: 'bg-negative-soft text-negative ring-negative/25',
  neutral: 'bg-surface-muted text-muted-foreground ring-border-strong',
} as const;

const SIZE_CLASSES = {
  sm: 'size-6 [&_svg]:size-3.5',
  md: 'size-7 [&_svg]:size-4',
} as const;

export type IconBadgeTone = keyof typeof TONE_CLASSES;

export interface IconBadgeProps extends ComponentProps<'span'> {
  tone?: IconBadgeTone;
  size?: keyof typeof SIZE_CLASSES;
  /** Accessible name. Omit only when the badge is purely decorative. */
  label?: string;
}

/** Round, tinted icon holder — e.g. positive/negative event markers on a chart. */
export function IconBadge({
  tone = 'neutral',
  size = 'md',
  label,
  className,
  ...props
}: IconBadgeProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full shadow-xs ring-1 [&_svg]:shrink-0',
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
      {...props}
    />
  );
}
