/**
 * Product slugs. These are the public URL (`/p/{slug}`) that goes into TikTok
 * captions, so they must be short, lowercase, and stable once published.
 */

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MAX_LENGTH = 60;

/** Unicode combining marks, stripped after NFKD so accents fold to plain ASCII. */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

export function isValidSlug(value: string): boolean {
  return value.length <= SLUG_MAX_LENGTH && SLUG_PATTERN.test(value);
}

/** Best-effort slug from a product name. Admin suggests, the owner can edit. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
}
