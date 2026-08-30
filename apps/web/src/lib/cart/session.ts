import type { AstroCookies } from 'astro';
import type { Cart } from '@hamza/shared';

import { CART_COOKIE, CART_COOKIE_OPTIONS, parseCart, serialiseCart } from './cookie.js';

/**
 * Reading and writing the cart cookie. The only file that names the cookie.
 */

export function readCart(cookies: AstroCookies): Cart {
  return parseCart(cookies.get(CART_COOKIE)?.value);
}

export function writeCart(cookies: AstroCookies, cart: Cart): void {
  if (cart.length === 0) {
    clearCart(cookies);
    return;
  }
  cookies.set(CART_COOKIE, serialiseCart(cart), CART_COOKIE_OPTIONS);
}

export function clearCart(cookies: AstroCookies): void {
  cookies.delete(CART_COOKIE, { path: CART_COOKIE_OPTIONS.path });
}
