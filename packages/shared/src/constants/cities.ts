/**
 * Delivery tiers.
 *
 * `major` covers the five cities with the cheapest courier rates; everywhere
 * else is `other`.
 *
 * Deliberately no city list and no fee table here. The `cities` table in D1 is
 * the single source of truth for both — it is seeded from
 * `db/seed/0001_cities.sql`, read at runtime for the checkout dropdown, and the
 * fee is always recomputed server-side from it. A second copy in shared would
 * drift the moment the owner's courier rates change.
 */
export const DELIVERY_TIERS = ['major', 'other'] as const;

export type DeliveryTier = (typeof DELIVERY_TIERS)[number];

export function isDeliveryTier(value: string): value is DeliveryTier {
  return (DELIVERY_TIERS as readonly string[]).includes(value);
}
