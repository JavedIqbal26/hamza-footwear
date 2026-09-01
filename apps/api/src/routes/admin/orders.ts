import { Hono } from 'hono';
import { orderListQuerySchema, orderStatusUpdateSchema } from '@hamza/shared/schemas';

import { notFound, validationFailed } from '../../lib/http.js';
import { createOrderService, OrderNotFoundError } from '../../services/order.service.js';
import type { AppBindings } from '../../lib/env.js';

/**
 * Order management: read, and move through the lifecycle.
 *
 * Admin never creates an order — the storefront does that — so there is no POST
 * here beyond the status change.
 */
export const orderRoutes = new Hono<AppBindings>();

orderRoutes.get('/orders', async (c) => {
  const parsed = orderListQuerySchema.safeParse(c.req.query());
  if (!parsed.success) return validationFailed(c, parsed.error);

  const service = createOrderService(c.env.DB);
  const [orders, counts] = await Promise.all([service.list(parsed.data), service.counts()]);

  return c.json({ orders, counts });
});

orderRoutes.get('/orders/:id', async (c) => {
  try {
    const order = await createOrderService(c.env.DB).get(c.req.param('id'));
    return c.json({ order });
  } catch (error) {
    if (error instanceof OrderNotFoundError) return notFound(c, 'Order not found');
    throw error;
  }
});

/**
 * The wallet payment screenshot.
 *
 * Served from here, behind Cloudflare Access, and deliberately not from the
 * storefront's public `/img/` route — that route only serves generated
 * catalogue variants, and a customer's payment record is not a catalogue photo.
 * An unguessable key is not an access control.
 *
 * `no-store` for the same reason: this must not sit in a shared cache, and the
 * owner checking an order twice should see the current object, not a copy from
 * before a re-upload.
 */
orderRoutes.get('/orders/:id/proof', async (c) => {
  let order;
  try {
    order = await createOrderService(c.env.DB).get(c.req.param('id'));
  } catch (error) {
    if (error instanceof OrderNotFoundError) return notFound(c, 'Order not found');
    throw error;
  }

  if (!order.payment_proof_key) return notFound(c, 'No payment proof on this order');

  const object = await c.env.IMAGES.get(order.payment_proof_key);
  if (!object) return notFound(c, 'Payment proof is no longer stored');

  /* Buffered, not streamed — same reason as the storefront's image route. */
  const body = await object.arrayBuffer();

  return c.body(body, 200, {
    'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
    'Content-Length': String(body.byteLength),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
});

orderRoutes.patch('/orders/:id', async (c) => {
  const parsed = orderStatusUpdateSchema.safeParse(await c.req.json());
  if (!parsed.success) return validationFailed(c, parsed.error);

  try {
    const order = await createOrderService(c.env.DB).updateStatus(
      c.req.param('id'),
      parsed.data,
    );

    /* Who changed it, so a surprising status has a name attached in the logs. */
    console.log(
      `Order ${order.order_number} updated by ${c.get('adminEmail')}:`,
      JSON.stringify(parsed.data),
    );

    return c.json({ order });
  } catch (error) {
    if (error instanceof OrderNotFoundError) return notFound(c, 'Order not found');
    throw error;
  }
});
