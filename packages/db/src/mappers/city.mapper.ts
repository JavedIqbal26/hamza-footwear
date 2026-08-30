import { isDeliveryTier, type City } from '@hamza/shared';

import type { CityRow } from '../rows.js';

/** Unknown tiers fall back to `other` — the more expensive, safer assumption. */
export function toCity(row: CityRow): City {
  return {
    name: row.name,
    delivery_fee_pkr: row.delivery_fee_pkr,
    tier: isDeliveryTier(row.tier) ? row.tier : 'other',
  };
}

export function toCities(rows: readonly CityRow[]): City[] {
  return rows.map(toCity);
}
