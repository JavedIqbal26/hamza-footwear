import type { APIRoute } from 'astro';
import { createOrderRepository } from '@hamza/db';
import { advancePaymentSchema } from '@hamza/shared/schemas';

import { storePaymentProof } from '../../lib/orders/payment-proof.js';
import { getDatabase } from '../../lib/runtime.js';

export const prerender = false;

/**
 * The customer telling the shop they have paid the advance.
 *
 * This used to happen at checkout. It cannot any more: the delivery charge is
 * quoted by the shop after it sees the address, so at checkout neither side
 * knows what the amount will be. This is the first point at which the customer
 * has a figure to pay against.
 *
 * **The order id is the credential**, exactly as it is for viewing the order.
 * It is a UUID, unguessable, and delivered only to the customer who placed the
 * order and to the shop. There is no session here on purpose — most orders are
 * placed by guests, and requiring an account to confirm a payment would strand
 * them.
 *
 * What that buys an attacker who guesses one: the ability to write a wrong
 * transaction id onto an order, which the shop verifies by hand against its own
 * wallet before dispatching anything. Nothing here moves money or state on its
 * own.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();

  const parsed = advancePaymentSchema.safeParse({
    order_id: form.get('order_id'),
    payment_reference: form.get('payment_reference'),
  });

  if (!parsed.success) {
    const id = form.get('order_id');
    return redirect(typeof id === 'string' ? `/order/${id}?payment=invalid` : '/', 303);
  }

  const { order_id: orderId, payment_reference: reference } = parsed.data;
  const orders = createOrderRepository(getDatabase(locals));
  const order = await orders.findById(orderId);

  if (!order) return redirect('/', 303);

  /*
   * Refuse before the quote exists. A reference submitted against an unquoted
   * order means the customer has paid an amount nobody asked for, and silently
   * accepting it would hide that.
   */
  if (order.delivery_fee_pkr === null) {
    return redirect(`/order/${orderId}?payment=early`, 303);
  }

  /*
   * The screenshot is optional and allowed to fail quietly — it is a
   * multi-megabyte upload on mobile data, and the typed reference is the
   * primary record. A rejected file must never cost the customer their
   * confirmation.
   */
  const proofKey = await storePaymentProof(locals, orderId, form.get('payment_proof'));

  await orders.recordAdvancePayment(orderId, { reference, proofKey });

  return redirect(`/order/${orderId}?payment=sent`, 303);
};
