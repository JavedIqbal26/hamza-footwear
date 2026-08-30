import type { APIRoute } from 'astro';
import { addEntry, isUkSize, productPath } from '@hamza/shared';

import { readCart, writeCart } from '../../lib/cart/session.js';
import { safeReturnPath } from '../../lib/http/redirect.js';

export const prerender = false;

/**
 * Add to cart.
 *
 * A plain form POST followed by a redirect, so it works with JavaScript
 * disabled and survives a double-tap on a slow connection without adding the
 * item twice on the way back.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();

  const slug = String(form.get('slug') ?? '');
  const size = String(form.get('size') ?? '');
  const quantity = Number.parseInt(String(form.get('quantity') ?? '1'), 10);

  /* Where to send the customer back to if anything is wrong with the input. */
  const fallback = slug ? productPath(slug) : '/';

  if (!slug || !isUkSize(size)) {
    return redirect(`${fallback}?error=size`, 303);
  }

  const cart = addEntry(readCart(cookies), {
    slug,
    size,
    quantity: Number.isSafeInteger(quantity) ? quantity : 1,
  });

  writeCart(cookies, cart);

  /*
   * 303 turns the POST into a GET, so the browser's back button never offers to
   * resubmit the form.
   */
  const returnTo = safeReturnPath(form.get('return_to'), '/cart');
  return redirect(returnTo, 303);
};
