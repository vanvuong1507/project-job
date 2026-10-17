import { useCallback, useState } from 'react';

export interface UseControllableStateOptions<T> {
  /** Controlled value. When defined, the component mirrors it and only reports changes. */
  value?: T;
  /** Initial value when uncontrolled. */
  defaultValue: T;
  onChange?: (value: T) => void;
}

type SetStateAction<T> = T | ((previous: T) => T);

/**
 * State that works both controlled (`value` + `onChange`) and uncontrolled (`defaultValue`),
 * so every stateful component in the design system supports both modes the same way.
 * `T` must not itself be a function type.
 */
export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: UseControllableStateOptions<T>) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;

  const setValue = useCallback(
    (action: SetStateAction<T>) => {
      const nextValue =
        typeof action === 'function' ? (action as (previous: T) => T)(currentValue) : action;
      if (Object.is(nextValue, currentValue)) return;
      if (!isControlled) setUncontrolledValue(nextValue);
      onChange?.(nextValue);
    },
    [currentValue, isControlled, onChange],
  );

  return [currentValue, setValue] as const;
}
