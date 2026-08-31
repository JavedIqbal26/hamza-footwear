import { createOrderRepository, type OrderRepository } from '@hamza/db';
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
  counts(): Promise<Record<string, number>>;
}

export function createOrderService(db: D1Database): OrderService {
  const repository: OrderRepository = createOrderRepository(db);

  return {
    list: (query: OrderListQuery) =>
      repository.list({
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
      const order = await repository.updateStatus(id, {
        orderStatus: update.order_status as OrderStatus | undefined,
        paymentStatus: update.payment_status as PaymentStatus | undefined,
      });
      if (!order) throw new OrderNotFoundError(id);
      return order;
    },

    counts: () => repository.countByStatus(),
  };
}
