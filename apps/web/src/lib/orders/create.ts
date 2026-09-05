import {
  createCounterRepository,
  createOrderRepository,
  ORDER_NUMBER_COUNTER,
  type NewOrder,
} from '@hamza/db';
import { formatOrderNumber, type Order, type OrderItem } from '@hamza/shared';
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
 *
 * **The delivery charge is not one of those numbers.** The shop quotes it by
 * hand once it can see where the parcel is going, so an order is created with
 * `delivery_fee_pkr: null` and a total that is, for now, just the subtotal.
 * The city is still validated against the cities table — it decides nothing
 * about price any more, but a delivery address in a city the shop does not
 * serve is still worth catching at the door rather than after payment.
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

  /* Still validated, no longer priced from. */
  const cities = await listCities(locals);
  const city = cities.find((candidate) => candidate.name === input.city);
  if (!city) throw new UnknownCityError(input.city);

  const items = toOrderItems(priced);

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
    delivery_fee_pkr: null,
    total_pkr: priced.subtotalPkr,
    payment_method: input.payment_method,
    payment_proof_key: null,
    customer_id: customerId,
    tiktok_video_ref: input.tiktok_video_ref,
    notes: input.notes,
  };

  return createOrderRepository(db).create(newOrder);
}

