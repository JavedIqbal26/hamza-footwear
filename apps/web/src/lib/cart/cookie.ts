import { isUkSize, MAX_CART_LINES, MAX_QUANTITY_PER_LINE, type Cart } from '@hamza/shared';

/**
 * The cart cookie.
 *
 * Holds only what the customer chose — slug, size, quantity. No prices and no
 * names, so a tampered cookie cannot invent a discount; the worst it can do is
 * name a product that does not exist, which the pricing step drops.
 *
 * Encoded compactly (`slug:size:qty|slug:size:qty`) rather than as JSON,
 * because this cookie travels on every single request including images.
 */

export const CART_COOKIE = 'hf_cart';

const LINE_SEPARATOR = '|';
const FIELD_SEPARATOR = ':';

/** A cart is a shopping session, not an identity. Thirty days is generous. */
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/**
 * Deliberately NOT httpOnly.
 *
 * The cart holds slugs, sizes and quantities — nothing a script could not
 * already read off the page, and nothing that authenticates anybody. Leaving it
 * readable lets the header badge be filled in on the client, which is what keeps
 * every catalogue page edge-cacheable: if the badge were server-rendered, a
 * cached page would serve one shopper's cart count to the next visitor.
 */
export const CART_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: false,
  secure: true,
  sameSite: 'lax',
  maxAge: CART_COOKIE_MAX_AGE,
} as const;

/**
 * Parses the cookie, dropping anything malformed rather than throwing.
 *
 * A corrupt cookie must degrade to an empty cart, never to a broken storefront —
 * the customer cannot clear it themselves.
 */
export function parseCart(raw: string | undefined): Cart {
  if (!raw) return [];

  const entries = raw
    .split(LINE_SEPARATOR)
    .slice(0, MAX_CART_LINES)
    .map(parseLine)
    .filter((entry): entry is Cart[number] => entry !== null);

  return entries;
}

function parseLine(line: string): Cart[number] | null {
  const parts = line.split(FIELD_SEPARATOR);
  if (parts.length !== 3) return null;

  const [slug, size, rawQuantity] = parts;
  if (!slug || !size || !rawQuantity) return null;
  if (!isUkSize(size)) return null;

  const quantity = Number.parseInt(rawQuantity, 10);
  if (!Number.isSafeInteger(quantity) || quantity < 1) return null;

  return {
    slug,
    size,
    quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE),
  };
}

export function serialiseCart(cart: Cart): string {
  return cart
    .slice(0, MAX_CART_LINES)
    .map((entry) => [entry.slug, entry.size, entry.quantity].join(FIELD_SEPARATOR))
    .join(LINE_SEPARATOR);
}
