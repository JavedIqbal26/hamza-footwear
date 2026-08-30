import type { APIRoute } from 'astro';
import { isUkSize, removeEntry, setQuantity, type CartEntry } from '@hamza/shared';

import { readCart, writeCart } from '../../lib/cart/session.js';
import { safeReturnPath } from '../../lib/http/redirect.js';

export const prerender = false;

/**
 * Quantity changes and removals from the cart page.
 *
 * One endpoint for both, because a quantity of zero is a removal — the customer
 * should not have to know which button they pressed.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();

  const slug = String(form.get('slug') ?? '');
  const size = String(form.get('size') ?? '');
  const action = String(form.get('action') ?? 'set');
  const returnTo = safeReturnPath(form.get('return_to'), '/cart');

  if (!slug || !isUkSize(size)) return redirect(returnTo, 303);

  const target: CartEntry = { slug, size, quantity: 1 };
  const cart = readCart(cookies);

  if (action === 'remove') {
    writeCart(cookies, removeEntry(cart, target));
    return redirect(returnTo, 303);
  }

  const quantity = Number.parseInt(String(form.get('quantity') ?? ''), 10);
  if (!Number.isSafeInteger(quantity)) return redirect(returnTo, 303);

  writeCart(cookies, setQuantity(cart, target, quantity));
  return redirect(returnTo, 303);
};
