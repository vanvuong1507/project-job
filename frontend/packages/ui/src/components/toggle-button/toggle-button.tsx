'use client';

import { useControllableState } from '../../hooks/use-controllable-state';
import { Button, type ButtonProps, type ButtonVariant } from '../button';

export interface ToggleButtonProps extends Omit<ButtonProps, 'variant' | 'onChange'> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Look when not pressed. */
  variant?: ButtonVariant;
  /** Look when pressed. */
  pressedVariant?: ButtonVariant;
}

/** Two-state button (`aria-pressed`), controlled or uncontrolled — e.g. "Compare to Previous". */
export function ToggleButton({
  pressed,
  defaultPressed = false,
  onPressedChange,
  variant = 'accent',
  pressedVariant = 'primary',
  onClick,
  ...props
}: ToggleButtonProps) {
  const [isPressed, setPressed] = useControllableState({
    value: pressed,
    defaultValue: defaultPressed,
    onChange: onPressedChange,
  });

  return (
    <Button
      aria-pressed={isPressed}
      variant={isPressed ? pressedVariant : variant}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setPressed((previous) => !previous);
      }}
      {...props}
    />
  );
}
