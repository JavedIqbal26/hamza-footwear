/**
 * Parsing for TEXT columns holding a JSON array.
 *
 * The database CHECK constraints cannot police the contents of a JSON blob, so
 * these helpers are deliberately forgiving: a malformed or unexpected value
 * yields an empty array rather than throwing. A product with no sizes renders
 * as unavailable; a product that throws takes the whole category page down.
 */

export function parseJsonArray(raw: string): unknown[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Parses a JSON array of strings, dropping anything that is not a string. */
export function parseStringArray(raw: string): string[] {
  return parseJsonArray(raw).filter((item): item is string => typeof item === 'string');
}

/** Parses a JSON array of strings, keeping only members of a known set. */
export function parseEnumArray<T extends string>(
  raw: string,
  isMember: (value: string) => value is T,
): T[] {
  return parseStringArray(raw).filter(isMember);
}

export function serialiseArray(values: readonly string[]): string {
  return JSON.stringify(values);
}
