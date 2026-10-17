/** `name → { value, maxAge }` from `Set-Cookie` header values (only what the session needs). */
export function parseSetCookies(
  headers: readonly string[],
): Map<string, { value: string; maxAge: number }> {
  const cookies = new Map<string, { value: string; maxAge: number }>();
  for (const header of headers) {
    const [pair = '', ...attributes] = header.split(';');
    const separator = pair.indexOf('=');
    if (separator <= 0) continue;
    const maxAge = attributes
      .map((attribute) => attribute.trim().match(/^max-age=(-?\d+)$/i)?.[1])
      .find(Boolean);
    cookies.set(pair.slice(0, separator).trim(), {
      value: pair.slice(separator + 1).trim(),
      maxAge: maxAge === undefined ? 0 : Number(maxAge),
    });
  }
  return cookies;
}
