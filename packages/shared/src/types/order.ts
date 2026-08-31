import type { UkSize } from '../constants/sizes.js';
import type {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../constants/statuses.js';

/**
 * A line on an order. Prices are snapshotted at purchase time — if the owner
 * later changes a product's price, past orders must not move.
 */
export interface OrderItem {
  readonly product_id: string;
  readonly slug: string;
  readonly name: string;
  readonly size: UkSize;
  readonly quantity: number;
  /** Whole PKR, as charged at the time of the order. */
  readonly unit_price_pkr: number;
}

export interface Order {
  readonly id: string;
  /** Human-readable, e.g. `HF-1042`. What the owner and customer quote. */
  readonly order_number: string;
  readonly customer_name: string;
  /** Normalised: 11 digits beginning `03`. */
  readonly phone: string;
  readonly city: string;
  readonly area: string;
  readonly address_line: string;
  readonly items: readonly OrderItem[];
  readonly subtotal_pkr: number;
  readonly delivery_fee_pkr: number;
  readonly total_pkr: number;
  readonly payment_method: PaymentMethod;
  /** R2 key of the wallet payment screenshot, when one was uploaded. */
  readonly payment_proof_key: string | null;
  readonly payment_status: PaymentStatus;
  readonly order_status: OrderStatus;
  /** Which TikTok video the customer arrived from, via `?v=`. */
  readonly tiktok_video_ref: string | null;
  readonly notes: string;
  readonly created_at: string;
  /** Null for guest orders, which stay first-class. */
  readonly customer_id: string | null;
}

export type OrderSummary = Pick<
  Order,
  | 'id'
  | 'order_number'
  | 'customer_name'
  | 'phone'
  | 'city'
  | 'total_pkr'
  | 'payment_method'
  | 'payment_status'
  | 'order_status'
  | 'created_at'
>;
