import {
  createCounterRepository,
  createOrderRepository,
  ORDER_NUMBER_COUNTER,
  type NewOrder,
} from '@hamza/db';
import {
  formatOrderNumber,
  orderTotalPkr,
  type Order,
  type OrderItem,
} from '@hamza/shared';
import type { CheckoutInput } from '@hamza/shared/schemas';

import { getDatabase } from '../runtime.js';
import { listCities } from '../delivery.js';
import type { PricedCart } from '../cart/pricing.js';

/**
 * Order creation.
 *
 * The one rule here: every number stored on the order is computed on this
 * server from this request's database reads. The client supplies who they are
 * and what they want — never what it costs.
 */

export class EmptyCartError extends Error {
  constructor() {
    super('Cannot place an order with an empty cart');
    this.name = 'EmptyCartError';
  }
}

export class UnknownCityError extends Error {
  constructor(city: string) {
    super(`"${city}" is not a city we deliver to`);
    this.name = 'UnknownCityError';
  }
}

function toOrderItems(priced: PricedCart): OrderItem[] {
  /* Prices are snapshotted here: a later price change must not move past orders. */
  return priced.lines.map((line) => ({
    product_id: line.product.id,
    slug: line.product.slug,
    name: line.product.name,
    size: line.entry.size,
    quantity: line.entry.quantity,
    unit_price_pkr: line.unitPricePkr,
  }));
}

export async function createOrder(
  locals: App.Locals,
  input: CheckoutInput,
  priced: PricedCart,
  customerId: string | null = null,
): Promise<Order> {
  if (priced.lines.length === 0) throw new EmptyCartError();

  const db = getDatabase(locals);

  /* The fee comes from the cities table, never from the submitted form. */
  const cities = await listCities(locals);
  const city = cities.find((candidate) => candidate.name === input.city);
  if (!city) throw new UnknownCityError(input.city);

  const items = toOrderItems(priced);
  const deliveryFeePkr = city.delivery_fee_pkr;
  const totalPkr = orderTotalPkr(
    items.map((item) => ({
      unitPricePkr: item.unit_price_pkr,
      quantity: item.quantity,
    })),
    deliveryFeePkr,
  );

  const sequence = await createCounterRepository(db).next(ORDER_NUMBER_COUNTER);

  const newOrder: NewOrder = {
    id: crypto.randomUUID(),
    order_number: formatOrderNumber(sequence),
    customer_name: input.customer_name,
    phone: input.phone,
    city: city.name,
    area: input.area,
    address_line: input.address_line,
    items,
    subtotal_pkr: priced.subtotalPkr,
    delivery_fee_pkr: deliveryFeePkr,
    total_pkr: totalPkr,
    payment_method: input.payment_method,
    payment_proof_key: null,
    customer_id: customerId,
    tiktok_video_ref: input.tiktok_video_ref,
    notes: buildNotes(input),
  };

  return createOrderRepository(db).create(newOrder);
}

/**
 * The wallet transaction reference lives in notes rather than its own column.
 * The schema's `payment_proof_key` is for the uploaded screenshot; a typed
 * reference number is something the owner reads, not something we query on.
 */
function buildNotes(input: CheckoutInput): string {
  const parts: string[] = [];
  if (input.payment_reference) {
    parts.push(`Payment reference: ${input.payment_reference}`);
  }
  if (input.notes) parts.push(input.notes);
  return parts.join('\n');
}
