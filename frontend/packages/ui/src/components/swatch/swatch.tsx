import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { colorVar, type ColorToken } from '../../theme/tokens';

const SHAPE_CLASSES = {
  dot: 'size-3 rounded-full',
  square: 'size-3 rounded-[3px]',
  line: 'h-0.5 w-3 rounded-full',
} as const;

export type SwatchShape = keyof typeof SHAPE_CLASSES;

export interface SwatchProps extends Omit<ComponentProps<'span'>, 'color'> {
  color: ColorToken;
  shape?: SwatchShape;
}

/** Decorative colour key for a data series (legends, checkboxes, tooltips). */
export function Swatch({ color, shape = 'dot', className, style, ...props }: SwatchProps) {
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0', SHAPE_CLASSES[shape], className)}
      style={{ backgroundColor: colorVar(color), ...style }}
      {...props}
    />
  );
}
