import { cartCount } from '@hamza/shared';

import { CART_COOKIE, parseCart } from '../lib/cart/cookie.js';
import { parseWishlist, WISHLIST_COOKIE } from '../lib/wishlist/session.js';

/**
 * The cart and saved counts in the header, filled in on the client.
 *
 * It has to be done here rather than on the server: catalogue pages are cached
 * at Cloudflare's edge, so a server-rendered count would be baked into a shared
 * response and shown to the next visitor. Rendering from the cookie keeps the
 * HTML identical for everyone and both badges correct for each person.
 *
 * Badges start hidden, so a visitor whose script never runs sees no badge
 * rather than a wrong one.
 */

function readCookie(name: string): string | undefined {
  for (const part of document.cookie.split('; ')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator) === name) {
      return decodeURIComponent(part.slice(separator + 1));
    }
  }
  return undefined;
}

function paint(
  badgeSelector: string,
  linkSelector: string,
  count: number,
  label: (count: number) => string,
): void {
  const badge = document.querySelector<HTMLElement>(badgeSelector);
  if (!badge) return;

  if (count === 0) {
    badge.hidden = true;
    return;
  }

  badge.textContent = String(count);
  badge.hidden = false;
  document.querySelector<HTMLElement>(linkSelector)?.setAttribute('aria-label', label(count));
}

export function initHeaderCounts(): void {
  paint(
    '[data-cart-badge]',
    '[data-cart-link]',
    cartCount(parseCart(readCookie(CART_COOKIE))),
    (count) => `Cart, ${count} items`,
  );

  paint(
    '[data-saved-badge]',
    '[data-saved-link]',
    parseWishlist(readCookie(WISHLIST_COOKIE)).length,
    (count) => `Saved items, ${count}`,
  );
}
