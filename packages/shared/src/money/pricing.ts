import { assertValidPkr } from './format.js';

/**
 * Price arithmetic. Integer PKR in, integer PKR out.
 *
 * These helpers are the only place a total is computed. The Worker recomputes
 * every total from the database on order submission — the client's numbers are
 * display only and are never trusted.
 */

export interface PricedProduct {
  readonly price_pkr: number;
  readonly sale_price_pkr: number | null;
}

/** The price a customer actually pays: the sale price when one is set. */
export function effectivePricePkr(product: PricedProduct): number {
  const { price_pkr, sale_price_pkr } = product;
  assertValidPkr(price_pkr);
  if (sale_price_pkr === null) return price_pkr;
  assertValidPkr(sale_price_pkr);
  return sale_price_pkr < price_pkr ? sale_price_pkr : price_pkr;
}

/** True when the product should show a struck-through original price. */
export function isOnSale(product: PricedProduct): boolean {
  return (
    product.sale_price_pkr !== null && product.sale_price_pkr < product.price_pkr
  );
}

/**
 * Whole-percent discount, rounded to the nearest integer for display.
 * Returns 0 when the product is not on sale.
 */
export function discountPercent(product: PricedProduct): number {
  if (!isOnSale(product) || product.price_pkr === 0) return 0;
  const saved = product.price_pkr - effectivePricePkr(product);
  return Math.round((saved * 100) / product.price_pkr);
}

export interface LineItem {
  readonly unitPricePkr: number;
  readonly quantity: number;
}

export function lineTotalPkr(item: LineItem): number {
  assertValidPkr(item.unitPricePkr);
  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
    throw new RangeError(`Quantity must be a positive integer, got ${item.quantity}`);
  }
  return item.unitPricePkr * item.quantity;
}

export function subtotalPkr(items: readonly LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalPkr(item), 0);
}

export function orderTotalPkr(
  items: readonly LineItem[],
  deliveryFeePkr: number,
): number {
  assertValidPkr(deliveryFeePkr);
  return subtotalPkr(items) + deliveryFeePkr;
}
