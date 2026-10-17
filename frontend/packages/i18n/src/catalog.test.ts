import { describe, expect, it } from 'vitest';
import { findMissingKeys, mergeMessages } from './catalog';
import { commonMessages } from './index';
import { isLocale, LOCALES } from './locales';

describe('findMissingKeys', () => {
  it('reports dotted paths missing from the other catalog', () => {
    const en = { title: 'Hi', nested: { a: 'A', b: 'B' } };
    expect(findMissingKeys(en, { title: 'Chào', nested: { a: 'A' } })).toEqual(['nested.b']);
    expect(findMissingKeys(en, { title: 'Chào', nested: 'flat' })).toEqual([
      'nested.a',
      'nested.b',
    ]);
  });
});

describe('mergeMessages', () => {
  it('deep-merges with later catalogs winning', () => {
    expect(
      mergeMessages({ common: { a: '1', b: '2' } }, { common: { b: 'x' }, app: { c: '3' } }),
    ).toEqual({
      common: { a: '1', b: 'x' },
      app: { c: '3' },
    });
  });
});

describe('shared common messages', () => {
  it.each(LOCALES.filter((locale) => locale !== 'en'))('%s covers every English key', (locale) => {
    expect(findMissingKeys(commonMessages.en, commonMessages[locale])).toEqual([]);
  });

  it('recognises supported locales only', () => {
    expect(isLocale('vi')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });
});
