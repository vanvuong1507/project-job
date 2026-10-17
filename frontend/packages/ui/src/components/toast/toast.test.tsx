import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider, useToast, type ToastOptions } from './toast';

function Trigger(options: ToastOptions) {
  const { toast } = useToast();
  return (
    <button type="button" onClick={() => toast(options)}>
      Notify
    </button>
  );
}

describe('Toast', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a status toast and auto-dismisses it', () => {
    render(
      <ToastProvider>
        <Trigger title="Week saved" tone="success" duration={4000} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    expect(screen.getByRole('status')).toHaveTextContent('Week saved');

    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByText('Week saved')).not.toBeInTheDocument();
  });

  it('announces errors assertively, pauses on hover and can be dismissed', () => {
    render(
      <ToastProvider>
        <Trigger title="Couldn't save" tone="error" duration={1000} />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
    const toast = screen.getByRole('alert');
    fireEvent.pointerEnter(toast);
    act(() => vi.advanceTimersByTime(5000));
    expect(toast).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('requires the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used inside <ToastProvider>',
    );
  });
});
