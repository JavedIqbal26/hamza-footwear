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
  /** NULL until the shop quotes it. */
  delivery_fee_pkr: number | null;
  total_pkr: number;
  payment_method: string;
  payment_proof_key: string | null;
  payment_reference: string | null;
  payment_status: string;
  order_status: string;
  tiktok_video_ref: string | null;
  notes: string;
  created_at: string;
  customer_id: string | null;
}

export interface CustomerRow {
  id: string;
  phone: string;
  name: string;
  saved_size: string | null;
  created_at: string;
  last_seen_at: string;
}

export interface CustomerAddressRow {
  id: string;
  customer_id: string;
  label: string;
  city: string;
  area: string;
  address_line: string;
  is_default: number;
  created_at: string;
}

export interface ReviewRow {
  id: string;
  product_id: string;
  customer_id: string | null;
  order_id: string | null;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
}
