/** A nested message catalog (next-intl format): leaves are ICU message strings. */
export type Messages = { [key: string]: string | Messages };

function leafKeys(messages: Messages, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'string' ? [`${prefix}${key}`] : leafKeys(value, `${prefix}${key}.`),
  );
}

/** Dotted keys present in `base` but missing (or not a string) in `other` — for completeness tests. */
export function findMissingKeys(base: Messages, other: Messages): string[] {
  const available = new Set(leafKeys(other));
  return leafKeys(base).filter((key) => !available.has(key));
}

/** Deep-merges catalogs (later wins), e.g. the shared `common` namespace into an app's messages. */
export function mergeMessages(...catalogs: Messages[]): Messages {
  const result: Messages = {};
  for (const catalog of catalogs) {
    for (const [key, value] of Object.entries(catalog)) {
      const current = result[key];
      result[key] =
        typeof value === 'object' && typeof current === 'object'
          ? mergeMessages(current, value)
          : value;
    }
  }
  return result;
}
