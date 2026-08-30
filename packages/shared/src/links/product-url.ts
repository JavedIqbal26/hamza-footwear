/**
 * Product URLs and the TikTok video reference that rides along with them.
 *
 * Every product has a short public URL, `/p/{slug}`. Videos link to it with a
 * `?v=` reference; that reference is carried through checkout and stored on the
 * order, which is how the owner learns which videos actually sell.
 */

export const VIDEO_REF_PARAM = 'v';

const VIDEO_REF_MAX_LENGTH = 40;
const VIDEO_REF_ALLOWED = /^[A-Za-z0-9_-]+$/;

export function productPath(slug: string, videoRef?: string | null): string {
  const base = `/p/${slug}`;
  const ref = sanitiseVideoRef(videoRef);
  return ref === null ? base : `${base}?${VIDEO_REF_PARAM}=${ref}`;
}

export function categoryPath(category: string): string {
  return `/${category}`;
}

/**
 * The `?v=` value is attacker-controllable — it arrives in a URL and ends up in
 * the database and in admin's order list. Accept only a short, plain token and
 * drop anything else rather than trying to escape it later.
 */
export function sanitiseVideoRef(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > VIDEO_REF_MAX_LENGTH) return null;
  return VIDEO_REF_ALLOWED.test(trimmed) ? trimmed : null;
}

/**
 * Reads and sanitises the video reference from a query string.
 *
 * Takes the minimal structural shape rather than `URL` so this package needs no
 * DOM lib — it accepts `url.searchParams`, a bare `URLSearchParams`, or any
 * stand-in in a test.
 */
export interface QueryParams {
  get(name: string): string | null;
}

export function readVideoRef(params: QueryParams): string | null {
  return sanitiseVideoRef(params.get(VIDEO_REF_PARAM));
}
