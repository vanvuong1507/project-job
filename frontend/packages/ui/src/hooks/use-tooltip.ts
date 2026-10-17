import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface UseTooltipOptions {
  /** Delay before showing on hover, in ms. Focus shows immediately. */
  openDelay?: number;
}

/**
 * Headless tooltip behaviour (hover + keyboard focus, Escape to dismiss, ARIA wiring).
 * Spread `triggerProps` on a focusable element and `tooltipProps` on the bubble; style is up to the caller.
 */
export function useTooltip({ openDelay = 150 }: UseTooltipOptions = {}) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearTimer = useCallback(() => clearTimeout(timerRef.current), []);
  const show = useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [clearTimer]);
  const showDelayed = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(true), openDelay);
  }, [clearTimer, openDelay]);
  const hide = useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const triggerProps = {
    'aria-describedby': open ? tooltipId : undefined,
    onPointerEnter: showDelayed,
    onPointerLeave: hide,
    onFocus: show,
    onBlur: hide,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'Escape') hide();
    },
  };

  const tooltipProps = { id: tooltipId, role: 'tooltip' as const, hidden: !open };

  return { open, show, hide, triggerProps, tooltipProps };
}

export type TooltipTriggerProps = ReturnType<typeof useTooltip>['triggerProps'];
