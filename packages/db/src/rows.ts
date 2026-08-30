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

export interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  city: string;
  area: string;
  address_line: string;
  /** JSON array of order items. */
  items: string;
  subtotal_pkr: number;
  delivery_fee_pkr: number;
  total_pkr: number;
  payment_method: string;
  payment_proof_key: string | null;
  payment_status: string;
  order_status: string;
  tiktok_video_ref: string | null;
  notes: string;
  created_at: string;
}
