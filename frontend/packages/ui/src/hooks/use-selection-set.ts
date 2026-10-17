import { useCallback, useState } from 'react';
import { useControllableState } from './use-controllable-state';

export interface UseSelectionSetOptions<K> {
  value?: ReadonlySet<K>;
  defaultValue?: Iterable<K>;
  onChange?: (selected: ReadonlySet<K>) => void;
  /** Minimum number of selected keys; deselecting below it is a no-op (e.g. "keep at least one series"). */
  min?: number;
}

/** Multi-select state (series toggles, filters) with an optional minimum-selection rule. */
export function useSelectionSet<K>({
  value,
  defaultValue = [],
  onChange,
  min = 0,
}: UseSelectionSetOptions<K> = {}) {
  const [initial] = useState<ReadonlySet<K>>(() => new Set(defaultValue));
  const [selected, setSelected] = useControllableState<ReadonlySet<K>>({
    value,
    defaultValue: initial,
    onChange,
  });

  const isSelected = useCallback((key: K) => selected.has(key), [selected]);
  const canDeselect = useCallback(
    (key: K) => selected.has(key) && selected.size > min,
    [selected, min],
  );

  const toggle = useCallback(
    (key: K) =>
      setSelected((previous) => {
        if (previous.has(key)) {
          if (previous.size <= min) return previous;
          const next = new Set(previous);
          next.delete(key);
          return next;
        }
        return new Set(previous).add(key);
      }),
    [setSelected, min],
  );

  return { selected, isSelected, canDeselect, toggle } as const;
}
