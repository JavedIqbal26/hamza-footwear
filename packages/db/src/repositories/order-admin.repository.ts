import type { D1Database } from '@cloudflare/workers-types';
import type { Order, OrderStatus, PaymentStatus } from '@hamza/shared';

import { toOrder, toOrders } from '../mappers/order.mapper.js';
import { ORDER_COLUMNS as COLUMNS } from './order-columns.js';
import type { OrderRow } from '../rows.js';

/**
 * Orders as the shop sees them: the delivery quote, the status lifecycle, and
 * the counts admin's filter row is built from.
 *
 * Split from `OrderRepository` on the same principle as the product
 * repositories — the two audiences have different rules, and nothing reachable
 * from the storefront should be able to move an order through its lifecycle or
 * set what a customer owes.
 */

export interface ListOrdersOptions {
  readonly orderStatus?: OrderStatus;
  readonly limit?: number;
  readonly offset?: number;
}

export interface StatusUpdate {
  readonly orderStatus?: OrderStatus;
  readonly paymentStatus?: PaymentStatus;
}

export interface OrderAdminRepository {
  list(options?: ListOrdersOptions): Promise<Order[]>;
  updateStatus(id: string, update: StatusUpdate): Promise<Order | null>;
  /** Sets the quoted delivery charge and the total it implies. */
  setDeliveryFee(id: string, feePkr: number): Promise<Order | null>;
  countByStatus(): Promise<Record<string, number>>;
}

export function createOrderAdminRepository(db: D1Database): OrderAdminRepository {
  return {
    async list(options: ListOrdersOptions = {}): Promise<Order[]> {
      const limit = Math.min(Math.max(Math.trunc(options.limit ?? 50), 1), 100);
      const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

      const statement =
        options.orderStatus === undefined
          ? db
              .prepare(
                `SELECT ${COLUMNS} FROM orders
                 ORDER BY created_at DESC, id DESC
                 LIMIT ?1 OFFSET ?2`,
              )
              .bind(limit, offset)
          : db
              .prepare(
                `SELECT ${COLUMNS} FROM orders
                 WHERE order_status = ?1
                 ORDER BY created_at DESC, id DESC
                 LIMIT ?2 OFFSET ?3`,
              )
              .bind(options.orderStatus, limit, offset);

      const { results } = await statement.all<OrderRow>();
      return toOrders(results);
    },

    /**
     * COALESCE lets one statement update either status, or both, without
     * branching into separate queries that could diverge.
     */
    async updateStatus(id: string, update: StatusUpdate): Promise<Order | null> {
      const row = await db
        .prepare(
          `UPDATE orders
             SET order_status   = COALESCE(?2, order_status),
                 payment_status = COALESCE(?3, payment_status)
           WHERE id = ?1
           RETURNING ${COLUMNS}`,
        )
        .bind(id, update.orderStatus ?? null, update.paymentStatus ?? null)
        .first<OrderRow>();

      return row === null ? null : toOrder(row);
    },

    /**
     * The quote.
     *
     * The total is recomputed here from the stored subtotal rather than taken
     * from the caller, so a delivery charge and a total can never disagree —
     * the schema's CHECK would reject them anyway, and one arithmetic expression
     * in one place is easier to trust than the same sum written twice.
     */
    async setDeliveryFee(id: string, feePkr: number): Promise<Order | null> {
      const row = await db
        .prepare(
          `UPDATE orders
              SET delivery_fee_pkr = ?2,
                  total_pkr        = subtotal_pkr + ?2
            WHERE id = ?1
            RETURNING ${COLUMNS}`,
        )
        .bind(id, feePkr)
        .first<OrderRow>();

      return row === null ? null : toOrder(row);
    },

    /** Powers admin's "what needs action" counts. */
    async countByStatus(): Promise<Record<string, number>> {
      const { results } = await db
        .prepare('SELECT order_status, COUNT(*) AS count FROM orders GROUP BY order_status')
        .all<{ order_status: string; count: number }>();

      return Object.fromEntries(results.map((row) => [row.order_status, row.count]));
    },
  };
}
