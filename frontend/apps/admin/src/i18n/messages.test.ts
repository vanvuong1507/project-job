import { findMissingKeys, LOCALES } from '@frontend/i18n';
import { describe, expect, it } from 'vitest';
import en from './messages/en.json';
import vi from './messages/vi.json';

const catalogs = { en, vi };

describe('message catalogs', () => {
  it('have a catalog per supported locale', () => {
    expect(Object.keys(catalogs).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES.filter((locale) => locale !== 'en'))(
    '%s translates every English key',
    (locale) => {
      expect(findMissingKeys(en, catalogs[locale])).toEqual([]);
    },
  );
});
