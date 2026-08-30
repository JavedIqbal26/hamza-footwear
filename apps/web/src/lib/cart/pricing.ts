import { createProductRepository } from '@hamza/db';
import {
  cartCount,
  effectivePricePkr,
  isOrderable,
  subtotalPkr,
  type Cart,
  type CartEntry,
  type Product,
} from '@hamza/shared';

import { getDatabase } from '../runtime.js';

/**
 * Turns a cart cookie into priced lines.
 *
 * Every price here comes from the database on this request. The cookie is
 * treated purely as a list of intentions, and any line naming a product that no
 * longer exists, is hidden, is out of stock, or no longer offers that size is
 * dropped and reported — the customer is told rather than silently charged for
 * something else.
 */

export interface PricedLine {
  readonly entry: CartEntry;
  readonly product: Product;
  readonly unitPricePkr: number;
  readonly lineTotalPkr: number;
}

export interface RemovedLine {
  readonly entry: CartEntry;
  readonly reason: 'unavailable' | 'out_of_stock' | 'size_unavailable';
  readonly name: string;
}

export interface PricedCart {
  readonly lines: readonly PricedLine[];
  readonly removed: readonly RemovedLine[];
  readonly subtotalPkr: number;
  readonly itemCount: number;
  /** True when the cookie no longer matches what can actually be bought. */
  readonly changed: boolean;
}

export const EMPTY_CART: PricedCart = {
  lines: [],
  removed: [],
  subtotalPkr: 0,
  itemCount: 0,
  changed: false,
};

export async function priceCart(locals: App.Locals, cart: Cart): Promise<PricedCart> {
  if (cart.length === 0) return EMPTY_CART;

  const repository = createProductRepository(getDatabase(locals));
  const slugs = [...new Set(cart.map((entry) => entry.slug))];
  const products = await repository.findBySlugs(slugs);
  const bySlug = new Map(products.map((product) => [product.slug, product]));

  const lines: PricedLine[] = [];
  const removed: RemovedLine[] = [];

  for (const entry of cart) {
    const product = bySlug.get(entry.slug);

    if (!product) {
      removed.push({ entry, reason: 'unavailable', name: entry.slug });
      continue;
    }
    if (!isOrderable(product.stock_status)) {
      removed.push({ entry, reason: 'out_of_stock', name: product.name });
      continue;
    }
    if (!product.sizes_available.includes(entry.size)) {
      removed.push({ entry, reason: 'size_unavailable', name: product.name });
      continue;
    }

    const unitPricePkr = effectivePricePkr(product);
    lines.push({
      entry,
      product,
      unitPricePkr,
      lineTotalPkr: unitPricePkr * entry.quantity,
    });
  }

  return {
    lines,
    removed,
    subtotalPkr: subtotalPkr(
      lines.map((line) => ({
        unitPricePkr: line.unitPricePkr,
        quantity: line.entry.quantity,
      })),
    ),
    itemCount: cartCount(lines.map((line) => line.entry)),
    changed: removed.length > 0,
  };
}

/** The cart as it should be written back after pricing dropped dead lines. */
export function survivingCart(priced: PricedCart): Cart {
  return priced.lines.map((line) => line.entry);
}
