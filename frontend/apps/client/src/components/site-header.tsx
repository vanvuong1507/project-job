import { Suspense } from 'react';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';

/** App-wide controls above the page content. */
export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-end gap-2 px-4 py-4 sm:px-6">
      {/* useSearchParams in the switcher: keep it out of the static shell. */}
      <Suspense>
        <LocaleSwitcher />
      </Suspense>
      <ThemeToggle />
    </header>
  );
}
