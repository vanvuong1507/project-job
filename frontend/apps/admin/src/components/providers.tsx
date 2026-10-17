'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

/** Client-side app providers. Theme: `.dark` class on <html>, persisted in localStorage, follows the OS by default. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}
