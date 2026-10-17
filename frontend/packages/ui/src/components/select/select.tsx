import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { controlClasses } from '../input';

export type SelectProps = ComponentProps<'select'>;

/** Native select — full keyboard and mobile support for free. */
export function Select({ className, ...props }: SelectProps) {
  return <select className={controlClasses(cn('h-9 pr-8', className))} {...props} />;
}
