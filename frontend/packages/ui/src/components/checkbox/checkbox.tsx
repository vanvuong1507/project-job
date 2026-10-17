import type { ComponentProps, ReactNode } from 'react';
import { CheckIcon } from '../../icons';
import { cn } from '../../lib/cn';

export interface CheckboxProps extends Omit<ComponentProps<'input'>, 'type' | 'children'> {
  label: ReactNode;
  /** Rendered between the box and the label, e.g. a series `<Swatch />`. */
  adornment?: ReactNode;
}

/** Native checkbox (keeps form + a11y semantics) with a custom box. Works controlled or uncontrolled. */
export function Checkbox({ label, adornment, className, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-sm text-foreground select-none',
        'has-disabled:cursor-not-allowed has-disabled:opacity-50',
        className,
      )}
    >
      <span className="relative inline-flex size-4 shrink-0">
        <input
          type="checkbox"
          className={cn(
            'peer size-4 cursor-[inherit] appearance-none rounded-[4px] border border-border-strong bg-surface',
            'transition-colors checked:border-primary checked:bg-primary',
          )}
          {...props}
        />
        <CheckIcon
          aria-hidden
          strokeWidth={3}
          className="pointer-events-none absolute inset-0 m-auto size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
        />
      </span>
      {adornment}
      <span>{label}</span>
    </label>
  );
}
