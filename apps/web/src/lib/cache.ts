/**
 * Cache headers.
 *
 * Server-rendered catalogue pages are cached at Cloudflare's edge and revalidated
 * in the background, so a repeat visitor from a TikTok link gets an edge hit
 * rather than a D1 round trip. `stale-while-revalidate` means a price change is
 * visible within a minute without any visitor ever waiting for the database.
 */

const ONE_MINUTE = 60;
const ONE_HOUR = 60 * 60;
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Catalogue pages: fresh enough for stock changes, cheap enough for a TikTok spike. */
export const CATALOGUE_CACHE_CONTROL =
  `public, max-age=0, s-maxage=${ONE_MINUTE}, stale-while-revalidate=${ONE_HOUR}`;

/** Images are content-addressed by variant key and never change in place. */
export const IMAGE_CACHE_CONTROL = `public, max-age=${ONE_YEAR}, immutable`;

/** Applied to responses that must not be cached by an intermediary. */
export const NO_STORE = 'private, no-store';

export function withCatalogueCache(headers: Headers): Headers {
  headers.set('Cache-Control', CATALOGUE_CACHE_CONTROL);
  return headers;
}
