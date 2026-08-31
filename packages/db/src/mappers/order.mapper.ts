import {
  isUkSize,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '@hamza/shared';

import { parseJsonArray } from './json-column.js';
import type { OrderRow } from '../rows.js';

/**
 * D1 row -> domain `Order`.
 *
 * Unlike products, a malformed order must not be silently repaired: the owner
 * is going to dispatch shoes against this record. Items that cannot be parsed
 * are dropped from the array rather than guessed at, and the caller can see the
 * line count no longer matches.
 */

function toOrderItem(raw: unknown): OrderItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;

  const { product_id, slug, name, size, quantity, unit_price_pkr } = item;

  if (
    typeof product_id !== 'string' ||
    typeof slug !== 'string' ||
    typeof name !== 'string' ||
    typeof size !== 'string' ||
    !isUkSize(size) ||
    !Number.isSafeInteger(quantity) ||
    !Number.isSafeInteger(unit_price_pkr)
  ) {
    return null;
  }

  return {
    product_id,
    slug,
    name,
    size,
    quantity: quantity as number,
    unit_price_pkr: unit_price_pkr as number,
  };
}

export function toOrder(row: OrderRow): Order {
  const items = parseJsonArray(row.items)
    .map(toOrderItem)
    .filter((item): item is OrderItem => item !== null);

  return {
    id: row.id,
    order_number: row.order_number,
    customer_name: row.customer_name,
    phone: row.phone,
    city: row.city,
    area: row.area,
    address_line: row.address_line,
    items,
    subtotal_pkr: row.subtotal_pkr,
    delivery_fee_pkr: row.delivery_fee_pkr,
    total_pkr: row.total_pkr,
    payment_method: row.payment_method as PaymentMethod,
    payment_proof_key: row.payment_proof_key,
    payment_status: row.payment_status as PaymentStatus,
    order_status: row.order_status as OrderStatus,
    tiktok_video_ref: row.tiktok_video_ref,
    notes: row.notes,
    created_at: row.created_at,
    customer_id: row.customer_id,
  };
}

export function toOrders(rows: readonly OrderRow[]): Order[] {
  return rows.map(toOrder);
}
