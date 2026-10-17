import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn';
import { controlClasses } from '../input';

export type TextareaProps = ComponentProps<'textarea'>;

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return (
    <textarea rows={rows} className={controlClasses(cn('min-h-20 py-2', className))} {...props} />
  );
}
