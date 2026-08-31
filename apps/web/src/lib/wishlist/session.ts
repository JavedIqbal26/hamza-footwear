import type { AstroCookies } from 'astro';

/**
 * The saved list.
 *
 * A cookie of slugs, for the same reasons as the cart: it works signed out, it
 * survives with JavaScript disabled, and the pages that render it stay
 * server-rendered. Nothing here is account-bound — a shopper should be able to
 * save a shoe before deciding whether to sign in.
 *
 * Readable by script (not httpOnly) so the header count can be filled in on the
 * client, which is what keeps catalogue pages edge-cacheable. Slugs are public
 * information; there is nothing to protect.
 */

export const WISHLIST_COOKIE = 'hf_saved';

const SEPARATOR = '~';
const MAX_ITEMS = 60;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const WISHLIST_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: false,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 180,
} as const;

export function parseWishlist(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(SEPARATOR)
    .filter((slug) => SLUG.test(slug))
    .slice(0, MAX_ITEMS);
}

export function readWishlist(cookies: AstroCookies): string[] {
  return parseWishlist(cookies.get(WISHLIST_COOKIE)?.value);
}

export function writeWishlist(cookies: AstroCookies, slugs: readonly string[]): void {
  if (slugs.length === 0) {
    cookies.delete(WISHLIST_COOKIE, { path: WISHLIST_COOKIE_OPTIONS.path });
    return;
  }
  cookies.set(
    WISHLIST_COOKIE,
    slugs.slice(0, MAX_ITEMS).join(SEPARATOR),
    WISHLIST_COOKIE_OPTIONS,
  );
}

/** Toggling is the only mutation the heart button needs. */
export function toggle(slugs: readonly string[], slug: string): string[] {
  return slugs.includes(slug)
    ? slugs.filter((value) => value !== slug)
    : [slug, ...slugs].slice(0, MAX_ITEMS);
}
