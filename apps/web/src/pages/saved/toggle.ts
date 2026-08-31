import type { APIRoute } from 'astro';

import { safeReturnPath } from '../../lib/http/redirect.js';
import { readWishlist, toggle, writeWishlist } from '../../lib/wishlist/session.js';

export const prerender = false;

/**
 * Save or unsave a product.
 *
 * A form POST followed by a 303, so the heart works with JavaScript disabled
 * and the browser's back button never offers to resubmit it.
 */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const slug = String(form.get('slug') ?? '');
  const returnTo = safeReturnPath(form.get('return_to'), '/saved');

  if (slug) writeWishlist(cookies, toggle(readWishlist(cookies), slug));

  return redirect(returnTo, 303);
};
