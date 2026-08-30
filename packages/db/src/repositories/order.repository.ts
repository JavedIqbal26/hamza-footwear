import type { D1Database } from '@cloudflare/workers-types';
import type { Order, OrderItem, OrderStatus, PaymentMethod, PaymentStatus } from '@hamza/shared';

import { toOrder, toOrders } from '../mappers/order.mapper.js';
import type { OrderRow } from '../rows.js';

/**
 * Orders: the one table where a lost write costs the shop a real sale.
 *
 * Every money field is supplied by the caller having already recomputed it from
 * the database — this layer stores what it is given and enforces nothing about
 * pricing beyond the CHECK constraints in the schema.
 */

const COLUMNS = `
  id, order_number, customer_name, phone, city, area, address_line, items,
  subtotal_pkr, delivery_fee_pkr, total_pkr, payment_method, payment_proof_key,
  payment_status, order_status, tiktok_video_ref, notes, created_at
`;

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
  readonly delivery_fee_pkr: number;
  readonly total_pkr: number;
  readonly payment_method: PaymentMethod;
  readonly payment_proof_key: string | null;
  readonly tiktok_video_ref: string | null;
  readonly notes: string;
}

export interface ListOrdersOptions {
  readonly orderStatus?: OrderStatus;
  readonly limit?: number;
  readonly offset?: number;
}

export interface StatusUpdate {
  readonly orderStatus?: OrderStatus;
  readonly paymentStatus?: PaymentStatus;
}

export interface OrderRepository {
  create(order: NewOrder): Promise<Order>;
  list(options?: ListOrdersOptions): Promise<Order[]>;
  findByNumber(orderNumber: string): Promise<Order | null>;
  findById(id: string): Promise<Order | null>;
  updateStatus(id: string, update: StatusUpdate): Promise<Order | null>;
  attachPaymentProof(id: string, key: string): Promise<void>;
  countByStatus(): Promise<Record<string, number>>;
}

export function createOrderRepository(db: D1Database): OrderRepository {
  return {
    async create(order: NewOrder): Promise<Order> {
      const row = await db
        .prepare(
          `INSERT INTO orders (
             id, order_number, customer_name, phone, city, area, address_line,
             items, subtotal_pkr, delivery_fee_pkr, total_pkr, payment_method,
             payment_proof_key, tiktok_video_ref, notes
           ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
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
        )
        .first<OrderRow>();

      if (row === null) throw new Error('Order insert returned no row');
      return toOrder(row);
    },

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

    async attachPaymentProof(id: string, key: string): Promise<void> {
      await db
        .prepare('UPDATE orders SET payment_proof_key = ?2 WHERE id = ?1')
        .bind(id, key)
        .run();
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
