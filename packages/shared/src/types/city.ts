import type { DeliveryTier } from '../constants/cities.js';

/**
 * A delivery destination. The dropdown at checkout is built from this table,
 * and the fee the customer pays is always read from here server-side.
 */
export interface City {
  readonly name: string;
  /** Whole PKR. */
  readonly delivery_fee_pkr: number;
  readonly tier: DeliveryTier;
}
