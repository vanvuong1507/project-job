'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Props a Field hands to its control, so label, hint and error are wired for assistive tech. */
export interface FieldControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
  required?: boolean;
}

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Validation message; also marks the control invalid. */
  error?: ReactNode;
  required?: boolean;
  /** Visually hide the label (it stays the control's accessible name), e.g. in table cells. */
  hideLabel?: boolean;
  className?: string;
  /** Render prop: spread the props on the control. */
  children: (control: FieldControlProps) => ReactNode;
}

export function Field({
  label,
  hint,
  error,
  required,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn('text-sm font-medium text-foreground', hideLabel && 'sr-only')}
      >
        {label}
        {required && (
          <span aria-hidden className="text-negative">
            {' '}
            *
          </span>
        )}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
        required,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
