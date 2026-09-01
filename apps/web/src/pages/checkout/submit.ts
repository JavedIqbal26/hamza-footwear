import type { APIRoute } from 'astro';
import { checkoutSchema, type CheckoutInput } from '@hamza/shared/schemas';
import { readVideoRef } from '@hamza/shared';

import { priceCart } from '../../lib/cart/pricing.js';
import { clearCart, readCart } from '../../lib/cart/session.js';
import { setCheckoutError } from '../../lib/orders/error-cookie.js';
import { createOrder, UnknownCityError } from '../../lib/orders/create.js';
import { storePaymentProof } from '../../lib/orders/payment-proof.js';
import { createOrderRepository } from '@hamza/db';
import { getDatabase } from '../../lib/runtime.js';
import { notifyNewOrder } from '../../lib/notifications/notify.js';
import { currentCustomer } from '../../lib/auth/session.js';
import { rememberAddress } from '../../lib/orders/remember-address.js';

export const prerender = false;

/**
 * Placing an order.
 *
 * The trust boundary of the whole storefront. Nothing the client sends about
 * money is read: the cart is re-priced from the database, the delivery fee is
 * looked up from the cities table, and the total is recomputed. The form
 * supplies who the customer is and where it goes — nothing else.
 *
 * On failure it redirects back to /checkout with the errors in a one-shot
 * cookie, so the customer never lands on a resubmittable POST.
 */

/** The fields worth echoing back so a rejected form is not wiped. */
const ECHO_FIELDS = [
  'customer_name',
  'phone',
  'city',
  'area',
  'address_line',
  'payment_method',
  'notes',
] as const;

function echoValues(form: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of ECHO_FIELDS) {
    const value = form.get(field);
    if (typeof value === 'string') values[field] = value;
  }
  return values;
}

export const POST: APIRoute = async ({ request, cookies, locals, redirect, url }) => {
  const form = await request.formData();

  /* Re-price from the database. The cart cookie is a list of intentions only. */
  const priced = await priceCart(locals, readCart(cookies));

  if (priced.lines.length === 0) {
    return redirect('/cart', 303);
  }

  if (priced.changed) {
    setCheckoutError(cookies, {
      message:
        'Some items were no longer available and have been removed. Please check your order and try again.',
      values: echoValues(form),
    });
    return redirect('/checkout', 303);
  }

  const parsed = checkoutSchema.safeParse({
    ...Object.fromEntries(form),
    tiktok_video_ref: readVideoRef(url.searchParams),
  });

  if (!parsed.success) {
    setCheckoutError(cookies, {
      message: 'Please check the highlighted fields.',
      errors: fieldErrors(parsed.error.issues),
      values: echoValues(form),
    });
    return redirect('/checkout', 303);
  }

  try {
    const customer = await currentCustomer(locals, cookies);
    const order = await createOrder(
      locals,
      parsed.data as CheckoutInput,
      priced,
      customer?.id ?? null,
    );

    /* Saving the address is what makes the next checkout two taps. */
    if (customer) await rememberAddress(locals, customer.id, parsed.data as CheckoutInput);

    /*
     * The screenshot is stored after the order exists, never before. Uploading
     * first would leave an orphaned object in R2 whenever order creation fails,
     * and a proof that no order points at is litter nobody will ever clean up.
     *
     * It is also allowed to fail quietly: the order is already committed, the
     * customer already has their confirmation, and the typed transaction id is
     * on the order. A failed upload costs the shop one manual WhatsApp message,
     * not a sale.
     */
    await attachPaymentProof(locals, order.id, form.get('payment_proof'));

    /*
     * The order is committed before anything else happens. Notifications are
     * fired after and can never fail the order.
     */
    clearCart(cookies);
    notifyNewOrder(locals, order);

    /*
     * Confirmation is addressed by the order's UUID, not by HF-1042. Order
     * numbers are sequential, so a readable URL would let anyone walk the
     * sequence and read other customers' names, phones and addresses. The
     * friendly number is shown on the page instead.
     */
    return redirect(`/order/${order.id}`, 303);
  } catch (error) {
    if (error instanceof UnknownCityError) {
      setCheckoutError(cookies, {
        message: 'Please choose your city from the list.',
        errors: { city: 'We do not deliver to that city yet.' },
        values: echoValues(form),
      });
      return redirect('/checkout', 303);
    }

    console.error('Order creation failed', error);
    setCheckoutError(cookies, {
      message:
        'Something went wrong placing your order. Please try again, or message us on WhatsApp.',
      values: echoValues(form),
    });
    return redirect('/checkout', 303);
  }
};

/** Flattens Zod issues to one message per field — the form shows one at a time. */
function fieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/**
 * Stores the wallet screenshot against an order that already exists.
 *
 * Wrapped so that nothing here can reach the caller: by this point the order is
 * committed and the customer is one redirect from their confirmation page.
 */
async function attachPaymentProof(
  locals: App.Locals,
  orderId: string,
  file: FormDataEntryValue | null,
): Promise<void> {
  if (file === null) return;

  try {
    const key = await storePaymentProof(locals, orderId, file);
    if (key) await createOrderRepository(getDatabase(locals)).attachPaymentProof(orderId, key);
  } catch (error) {
    console.error('Could not attach the payment proof', error);
  }
}
