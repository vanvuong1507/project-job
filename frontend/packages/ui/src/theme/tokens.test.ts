import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { COLOR_TOKENS, colorVar, type ColorToken } from './tokens';

const require = createRequire(import.meta.url);
const themeCss = readFileSync(require.resolve('@frontend/tailwind-config/theme.css'), 'utf8');

/** `{ token: palette-var }` for the `--color-*: var(--palette-*)` declarations inside one CSS block. */
function semanticBlock(selector: RegExp): Map<string, string> {
  const body = themeCss.match(selector)?.[1] ?? '';
  return new Map(
    [...body.matchAll(/--color-([a-z0-9-]+):\s*var\(--(palette-[a-z0-9-]+)\)/g)].map((m) => [
      m[1]!,
      m[2]!,
    ]),
  );
}

const palette = new Map(
  [...themeCss.matchAll(/--(palette-[a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
);
const light = semanticBlock(/@theme static \{([\s\S]*?)\n\}/);
const dark = semanticBlock(/\n\.dark \{([\s\S]*?)\n\}/);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(theme: Map<string, string>, fg: ColorToken, bg: ColorToken): number {
  const [a, b] = [fg, bg].map((token) => luminance(palette.get(theme.get(token)!)!)) as [
    number,
    number,
  ];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Text/background pairs the UI actually uses; all must meet WCAG AA (4.5:1) in both themes. */
const TEXT_PAIRS: Array<[ColorToken, ColorToken]> = [
  ['foreground', 'canvas'],
  ['foreground', 'surface'],
  ['foreground', 'surface-muted'],
  ['muted-foreground', 'surface'],
  ['primary-foreground', 'primary'],
  ['accent-foreground', 'accent'],
  ['positive', 'surface'],
  ['positive', 'surface-muted'],
  ['negative', 'surface'],
  ['negative', 'surface-muted'],
  ['muted-foreground', 'surface-muted'],
];

describe('colour tokens', () => {
  it('match the semantic --color-* tokens declared in theme.css', () => {
    expect([...COLOR_TOKENS].sort()).toEqual([...light.keys()].sort());
  });

  it('have a dark override for every semantic token', () => {
    expect([...dark.keys()].sort()).toEqual([...light.keys()].sort());
  });

  it('only reference palette values that exist', () => {
    for (const ref of [...light.values(), ...dark.values()])
      expect(palette.has(ref), ref).toBe(true);
  });

  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('meet WCAG AA contrast for text in %s', (_, theme) => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(contrast(theme, fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('builds a CSS variable reference', () => {
    expect(colorVar('chart-pos')).toBe('var(--color-chart-pos)');
  });
});
