import type { UkSize } from '../constants/sizes.js';

/**
 * The cart, as the customer's browser carries it.
 *
 * Deliberately holds no prices and no names — only what the customer chose.
 * Everything else is looked up from the database on every render, so a price
 * change or a sell-out is reflected immediately and a tampered cookie cannot
 * invent a discount.
 */
export interface CartEntry {
  readonly slug: string;
  readonly size: UkSize;
  readonly quantity: number;
}

export type Cart = readonly CartEntry[];

/** Most feet come in pairs; more than this is a wholesale enquiry, not a cart. */
export const MAX_QUANTITY_PER_LINE = 10;

/** Bounds the cookie: it travels on every request. */
export const MAX_CART_LINES = 20;

/** Two entries are the same line when they are the same product in the same size. */
export function isSameLine(a: CartEntry, b: CartEntry): boolean {
  return a.slug === b.slug && a.size === b.size;
}

export function cartCount(cart: Cart): number {
  return cart.reduce((total, entry) => total + entry.quantity, 0);
}

/** Adds an entry, merging into an existing line and clamping the quantity. */
export function addEntry(cart: Cart, entry: CartEntry): Cart {
  const existing = cart.find((line) => isSameLine(line, entry));

  if (!existing) {
    if (cart.length >= MAX_CART_LINES) return cart;
    return [...cart, clampEntry(entry)];
  }

  return cart.map((line) =>
    isSameLine(line, entry)
      ? clampEntry({ ...line, quantity: line.quantity + entry.quantity })
      : line,
  );
}

/** Sets a line's quantity outright; a quantity of 0 removes it. */
export function setQuantity(cart: Cart, target: CartEntry, quantity: number): Cart {
  if (quantity <= 0) return removeEntry(cart, target);
  return cart.map((line) =>
    isSameLine(line, target) ? clampEntry({ ...line, quantity }) : line,
  );
}

export function removeEntry(cart: Cart, target: CartEntry): Cart {
  return cart.filter((line) => !isSameLine(line, target));
}

function clampEntry(entry: CartEntry): CartEntry {
  return {
    slug: entry.slug,
    size: entry.size,
    quantity: Math.min(Math.max(Math.trunc(entry.quantity), 1), MAX_QUANTITY_PER_LINE),
  };
}
