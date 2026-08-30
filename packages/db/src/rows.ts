/**
 * Raw D1 row shapes, exactly as SQLite returns them.
 *
 * SQLite has no boolean and no JSON type, so these are the honest types:
 * `is_active` is 0/1 and the array columns are TEXT. Nothing outside
 * `../mappers` should ever see one of these — mappers turn them into the domain
 * types from `@hamza/shared`.
 */

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_pkr: number;
  sale_price_pkr: number | null;
  category: string;
  /** JSON array of UK size strings. */
  sizes_available: string;
  /** JSON array of R2 base keys. */
  images: string;
  is_active: number;
  stock_status: string;
  created_at: string;
  updated_at: string;
}

export interface CityRow {
  name: string;
  delivery_fee_pkr: number;
  tier: string;
}
