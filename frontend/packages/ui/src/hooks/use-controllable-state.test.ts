import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useControllableState } from './use-controllable-state';

describe('useControllableState', () => {
  it('manages its own state when uncontrolled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: false, onChange }));

    act(() => result.current[1]((previous) => !previous));

    expect(result.current[0]).toBe(true);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('only reports changes when controlled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControllableState({ value: false, defaultValue: true, onChange }),
    );

    act(() => result.current[1](true));

    expect(result.current[0]).toBe(false);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('skips onChange when the value does not change', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useControllableState({ defaultValue: 1, onChange }));

    act(() => result.current[1](1));

    expect(onChange).not.toHaveBeenCalled();
  });
});
