/**
 * Typed mirror of the semantic colour tokens in `@frontend/tailwind-config/theme.css`.
 * Use it where a colour must be passed as a value (SVG/chart props, inline styles) instead of a class.
 * `tokens.test.ts` fails if this list drifts from the CSS.
 */
export const COLOR_TOKENS = [
  'canvas',
  'surface',
  'surface-muted',
  'border',
  'border-strong',
  'foreground',
  'muted-foreground',
  'subtle-foreground',
  'primary',
  'primary-foreground',
  'accent',
  'accent-hover',
  'accent-foreground',
  'ring',
  'overlay',
  'positive',
  'positive-soft',
  'negative',
  'negative-soft',
  'chart-pos',
  'chart-eatclub',
  'chart-labour',
  'chart-pos-prev',
  'chart-eatclub-prev',
  'chart-labour-prev',
  'chart-grid',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

/** `colorVar('chart-pos')` → `'var(--color-chart-pos)'` — works in SVG `fill`, inline styles, canvas-free charts. */
export function colorVar(token: ColorToken): string {
  return `var(--color-${token})`;
}
