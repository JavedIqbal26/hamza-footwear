import type { Category } from '../constants/categories.js';
import type { UkSize } from '../constants/sizes.js';
import type { StockStatus } from '../constants/statuses.js';

/**
 * A product as the rest of the system sees it.
 *
 * Field names deliberately match the D1 column names. Repositories parse the
 * JSON columns and coerce SQLite's integer booleans, but they do not rename
 * anything — one vocabulary from the schema through to the template removes a
 * whole class of mapping bugs.
 */
export interface Product {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  /** Whole PKR. Never a float. */
  readonly price_pkr: number;
  /** Whole PKR, or null when not discounted. */
  readonly sale_price_pkr: number | null;
  readonly category: Category;
  readonly sizes_available: readonly UkSize[];
  /** R2 base keys; per-variant keys come from `imageVariantKey`. */
  readonly images: readonly string[];
  readonly is_active: boolean;
  readonly stock_status: StockStatus;
  /** ISO 8601 UTC. */
  readonly created_at: string;
  readonly updated_at: string;
}

/** The subset a listing card needs — keeps grid queries from over-fetching. */
export type ProductSummary = Pick<
  Product,
  | 'id'
  | 'slug'
  | 'name'
  | 'price_pkr'
  | 'sale_price_pkr'
  | 'category'
  | 'images'
  | 'stock_status'
>;

export function primaryImage(product: Pick<Product, 'images'>): string | null {
  return product.images[0] ?? null;
}
