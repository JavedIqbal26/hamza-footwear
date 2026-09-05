import type { D1Database } from '@cloudflare/workers-types';
import type { Order, OrderItem, PaymentMethod } from '@hamza/shared';

import { toOrder, toOrders } from '../mappers/order.mapper.js';
import { ORDER_COLUMNS as COLUMNS } from './order-columns.js';
import type { OrderRow } from '../rows.js';

/**
 * Orders as the storefront sees them: placing one, reading one back, and the
 * customer's own history.
 *
 * Admin's side of the same table — the delivery quote, the status lifecycle and
 * the counts — lives in `order-admin.repository.ts`, for the same reason the
 * product repositories are split: the two audiences have different rules, and a
 * customer must never be able to reach an operation that only the shop should.
 *
 * Orders: the one table where a lost write costs the shop a real sale.
 *
 * Every money field is supplied by the caller having already recomputed it from
 * the database — this layer stores what it is given and enforces nothing about
 * pricing beyond the CHECK constraints in the schema.
 */

export interface NewOrder {
  readonly id: string;
  readonly order_number: string;
  readonly customer_name: string;
  readonly phone: string;
  readonly city: string;
  readonly area: string;
  readonly address_line: string;
  readonly items: readonly OrderItem[];
  readonly subtotal_pkr: number;
  /** Null on creation — the shop quotes it once it sees the address. */
  readonly delivery_fee_pkr: number | null;
  /** The subtotal until the quote lands. */
  readonly total_pkr: number;
  readonly payment_method: PaymentMethod;
  readonly payment_proof_key: string | null;
  readonly tiktok_video_ref: string | null;
  readonly notes: string;
  /** Null for guest orders, which stay first-class. */
  readonly customer_id: string | null;
}

export interface AdvancePayment {
  readonly reference: string | null;
  readonly proofKey: string | null;
}

export interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  findByNumber(orderNumber: string): Promise<Order | null>;
  listForCustomer(customerId: string, limit?: number): Promise<Order[]>;
  findById(id: string): Promise<Order | null>;
  /**
   * The customer's advance payment: the wallet transaction id, and the
   * screenshot if they attached one. Both arrive together, after the quote.
   */
  recordAdvancePayment(id: string, payment: AdvancePayment): Promise<Order | null>;
}

export function createOrderRepository(db: D1Database): OrderRepository {
  return {
    async create(order: NewOrder): Promise<Order> {
      const row = await db
        .prepare(
          `INSERT INTO orders (
             id, order_number, customer_name, phone, city, area, address_line,
             items, subtotal_pkr, delivery_fee_pkr, total_pkr, payment_method,
             payment_proof_key, tiktok_video_ref, notes, customer_id
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
           RETURNING ${COLUMNS}`,
        )
        .bind(
          order.id,
          order.order_number,
          order.customer_name,
          order.phone,
          order.city,
          order.area,
          order.address_line,
          JSON.stringify(order.items),
          order.subtotal_pkr,
          order.delivery_fee_pkr,
          order.total_pkr,
          order.payment_method,
          order.payment_proof_key,
          order.tiktok_video_ref,
          order.notes,
          order.customer_id,
        )
        .first<OrderRow>();

      if (row === null) throw new Error('Order insert returned no row');
      return toOrder(row);
    },

    /** A customer's own order history, newest first. */
    async listForCustomer(customerId: string, limit = 20): Promise<Order[]> {
      const { results } = await db
        .prepare(
          `SELECT ${COLUMNS} FROM orders
           WHERE customer_id = ?1
           ORDER BY created_at DESC, id DESC
           LIMIT ?2`,
        )
        .bind(customerId, Math.min(Math.max(Math.trunc(limit), 1), 50))
        .all<OrderRow>();
      return toOrders(results);
    },

    async findByNumber(orderNumber: string): Promise<Order | null> {
      const row = await db
        .prepare(`SELECT ${COLUMNS} FROM orders WHERE order_number = ?1`)
        .bind(orderNumber)
        .first<OrderRow>();
      return row === null ? null : toOrder(row);
    },

    async findById(id: string): Promise<Order | null> {
      const row = await db
        .prepare(`SELECT ${COLUMNS} FROM orders WHERE id = ?1`)
        .bind(id)
        .first<OrderRow>();
      return row === null ? null : toOrder(row);
    },

    /**
     * COALESCE again, so a customer who sends a screenshot after already
     * typing a reference does not wipe the reference, and vice versa. Neither
     * field is ever cleared by a later, emptier submission.
     */
    async recordAdvancePayment(id: string, payment: AdvancePayment): Promise<Order | null> {
      const row = await db
        .prepare(
          `UPDATE orders
              SET payment_reference = COALESCE(?2, payment_reference),
                  payment_proof_key = COALESCE(?3, payment_proof_key)
            WHERE id = ?1
            RETURNING ${COLUMNS}`,
        )
        .bind(id, payment.reference, payment.proofKey)
        .first<OrderRow>();

      return row === null ? null : toOrder(row);
    },

  };
}
