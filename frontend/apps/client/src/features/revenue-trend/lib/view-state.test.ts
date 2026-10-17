import { describe, expect, it } from 'vitest';
import { DEFAULT_VIEW, parseViewState, serializeViewState } from './view-state';

const parse = (query: string) => parseViewState(new URLSearchParams(query));

describe('parseViewState', () => {
  it('uses defaults for an empty query', () => {
    expect(parse('')).toEqual(DEFAULT_VIEW);
  });

  it('reads compare and series, ignoring unknown and duplicate values', () => {
    expect(parse('compare=0&series=labour,pos,nope,pos')).toEqual({
      compare: false,
      series: ['pos', 'labour'],
    });
  });

  it('never hides every series', () => {
    expect(parse('series=nope').series).toEqual(DEFAULT_VIEW.series);
    expect(parse('series=').series).toEqual(DEFAULT_VIEW.series);
  });
});

describe('serializeViewState', () => {
  it('omits defaults and keeps unrelated params', () => {
    const params = new URLSearchParams('weekStart=2026-10-12&compare=0&series=pos');
    expect(serializeViewState(DEFAULT_VIEW, params).toString()).toBe('weekStart=2026-10-12');
  });

  it('round-trips a non-default view', () => {
    const view = { compare: false, series: ['eatclub', 'labour'] as const };
    const query = serializeViewState(view, new URLSearchParams()).toString();
    expect(query).toBe('compare=0&series=eatclub%2Clabour');
    expect(parseViewState(new URLSearchParams(query))).toEqual(view);
  });
});
