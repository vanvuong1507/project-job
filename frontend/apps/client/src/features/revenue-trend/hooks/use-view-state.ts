import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { parseViewState, serializeViewState, type ViewState } from '../lib/view-state';

/**
 * View state backed by the URL. Updates use `history.replaceState`, which Next.js syncs with
 * `useSearchParams` — no server round trip, since the data doesn't depend on these params.
 */
export function useViewState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const view = useMemo(() => parseViewState(searchParams), [searchParams]);

  const setView = useCallback(
    (update: Partial<ViewState>) => {
      const params = serializeViewState({ ...view, ...update }, new URLSearchParams(searchParams));
      const query = params.toString();
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
    },
    [view, searchParams, pathname],
  );

  return [view, setView] as const;
}
