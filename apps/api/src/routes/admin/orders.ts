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
