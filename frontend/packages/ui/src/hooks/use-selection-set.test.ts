import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSelectionSet } from './use-selection-set';

type Series = 'pos' | 'eatclub' | 'labour';

describe('useSelectionSet', () => {
  it('toggles keys on and off', () => {
    const { result } = renderHook(() => useSelectionSet<Series>({ defaultValue: ['pos'] }));

    act(() => result.current.toggle('labour'));
    expect([...result.current.selected]).toEqual(['pos', 'labour']);

    act(() => result.current.toggle('pos'));
    expect([...result.current.selected]).toEqual(['labour']);
  });

  it('never drops below the minimum', () => {
    const { result } = renderHook(() =>
      useSelectionSet<Series>({ defaultValue: ['pos', 'eatclub'], min: 1 }),
    );

    act(() => result.current.toggle('pos'));
    expect(result.current.canDeselect('eatclub')).toBe(false);

    act(() => result.current.toggle('eatclub'));
    expect([...result.current.selected]).toEqual(['eatclub']);
    expect(result.current.isSelected('eatclub')).toBe(true);
  });
});
