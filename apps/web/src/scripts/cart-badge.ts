import { CART_COOKIE, parseCart } from '../lib/cart/cookie.js';
import { cartCount } from '@hamza/shared';

/**
 * The header cart badge, filled in on the client.
 *
 * It has to be done here rather than on the server: catalogue pages are cached
 * at Cloudflare's edge, so a server-rendered count would be baked into a shared
 * response and shown to the next visitor. Rendering it from the cookie keeps the
 * HTML identical for everyone and the badge correct for each person.
 *
 * The badge starts hidden, so a visitor whose script never runs sees no badge
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

export function initCartBadge(): void {
  const badge = document.querySelector<HTMLElement>('[data-cart-badge]');
  const link = document.querySelector<HTMLElement>('[data-cart-link]');
  if (!badge) return;

  const count = cartCount(parseCart(readCookie(CART_COOKIE)));

  if (count === 0) {
    badge.hidden = true;
    return;
  }

  badge.textContent = String(count);
  badge.hidden = false;
  link?.setAttribute('aria-label', `Cart, ${count} items`);
}
