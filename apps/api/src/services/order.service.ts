import {
  createOrderAdminRepository,
  createOrderRepository,
  type OrderAdminRepository,
  type OrderRepository,
} from '@hamza/db';
import type { Order, OrderStatus, PaymentStatus } from '@hamza/shared';
import type { OrderListQuery, OrderStatusUpdate } from '@hamza/shared/schemas';

/**
 * Order management.
 *
 * Admin never creates orders — the storefront does that. This is read and
 * lifecycle only.
 */

export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`No order with id ${id}`);
    this.name = 'OrderNotFoundError';
  }
}

export interface OrderService {
  list(query: OrderListQuery): Promise<Order[]>;
  get(id: string): Promise<Order>;
  updateStatus(id: string, update: OrderStatusUpdate): Promise<Order>;
  /** Sets the delivery charge the shop quoted, once it has seen the address. */
  setDeliveryFee(id: string, feePkr: number): Promise<Order>;
  counts(): Promise<Record<string, number>>;
}

export function createOrderService(db: D1Database): OrderService {
  /* Reads come from the storefront half; everything that changes an order is admin's. */
  const repository: OrderRepository = createOrderRepository(db);
  const admin: OrderAdminRepository = createOrderAdminRepository(db);

  return {
    list: (query: OrderListQuery) =>
      admin.list({
        orderStatus: query.order_status,
        limit: query.limit,
        offset: query.offset,
      }),

    async get(id: string): Promise<Order> {
      const order = await repository.findById(id);
      if (!order) throw new OrderNotFoundError(id);
      return order;
    },

    async updateStatus(id: string, update: OrderStatusUpdate): Promise<Order> {
      const order = await admin.updateStatus(id, {
        orderStatus: update.order_status as OrderStatus | undefined,
        paymentStatus: update.payment_status as PaymentStatus | undefined,
      });
      if (!order) throw new OrderNotFoundError(id);
      return order;
    },

    /*
     * The total is recomputed inside the repository's UPDATE, from the subtotal
     * already stored on the row. Nothing the client sends about money is read
     * here — the request carries the delivery charge and nothing else.
     */
    async setDeliveryFee(id: string, feePkr: number): Promise<Order> {
      const order = await admin.setDeliveryFee(id, feePkr);
      if (!order) throw new OrderNotFoundError(id);
      return order;
    },

    counts: () => admin.countByStatus(),
  };
}
