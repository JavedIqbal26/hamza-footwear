import {
  isCategory,
  isUkSize,
  sortUkSizes,
  type Product,
  type StockStatus,
} from '@hamza/shared';

import { parseEnumArray, parseStringArray } from './json-column.js';
import type { ProductRow } from '../rows.js';

const STOCK_FALLBACK: StockStatus = 'in_stock';

function toStockStatus(value: string): StockStatus {
  return value === 'low' || value === 'out' || value === 'in_stock'
    ? value
    : STOCK_FALLBACK;
}

/**
 * D1 row -> domain `Product`.
 *
 * Returns null when the row's category is unrecognised: that product cannot be
 * placed in the storefront's navigation, so the caller drops it rather than
 * rendering something broken.
 */
export function toProduct(row: ProductRow): Product | null {
  if (!isCategory(row.category)) return null;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    price_pkr: row.price_pkr,
    sale_price_pkr: row.sale_price_pkr,
    category: row.category,
    sizes_available: sortUkSizes(parseEnumArray(row.sizes_available, isUkSize)),
    images: parseStringArray(row.images),
    is_active: row.is_active === 1,
    stock_status: toStockStatus(row.stock_status),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Maps a result set, silently dropping rows that cannot be represented. */
export function toProducts(rows: readonly ProductRow[]): Product[] {
  return rows
    .map(toProduct)
    .filter((product): product is Product => product !== null);
}
