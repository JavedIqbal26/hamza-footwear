import type { APIRoute } from 'astro';
import { createReviewRepository } from '@hamza/db';
import { reviewSchema } from '@hamza/shared/schemas';

import { currentCustomer } from '../../lib/auth/session.js';
import { getDatabase } from '../../lib/runtime.js';
import { safeReturnPath } from '../../lib/http/redirect.js';

export const prerender = false;

/**
 * Write a review.
 *
 * Entitlement is checked on the server every time, never inferred from the fact
 * that the form was rendered: the reviewer must be signed in, must have a
 * delivered order containing this product, and must not have reviewed it
 * already. A star average nobody can trust is worth less than no average.
 */
export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData();
  const returnTo = safeReturnPath(form.get('return_to'), '/');

  const customer = await currentCustomer(locals, cookies);
  if (!customer) return redirect('/account/sign-in', 303);

  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return redirect(returnTo, 303);

  const reviews = createReviewRepository(getDatabase(locals));
  const { product_id: productId, rating, body } = parsed.data;

  const orderId = await reviews.findReviewableOrder(customer.id, productId);
  if (!orderId) return redirect(returnTo, 303);

  if (await reviews.hasReviewed(customer.id, productId)) return redirect(returnTo, 303);

  await reviews.create(crypto.randomUUID(), {
    product_id: productId,
    customer_id: customer.id,
    order_id: orderId,
    author_name: customer.name,
    rating,
    body,
  });

  return redirect(returnTo, 303);
};
