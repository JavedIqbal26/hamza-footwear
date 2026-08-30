import { createCityRepository } from '@hamza/db';
import type { City, DeliveryTier } from '@hamza/shared';

import { getDatabase } from './runtime.js';

/** Read model for delivery destinations and their fees. */

export function listCities(locals: App.Locals): Promise<City[]> {
  return createCityRepository(getDatabase(locals)).listAll();
}

export interface TierSummary {
  readonly tier: DeliveryTier;
  readonly feePkr: number;
  readonly cities: readonly string[];
}

/**
 * Groups cities by tier for the delivery page.
 *
 * The fee shown is the one actually stored against those cities, so this page
 * can never quote a price the checkout will not honour.
 */
export function summariseByTier(cities: readonly City[]): TierSummary[] {
  const byTier = new Map<DeliveryTier, { feePkr: number; cities: string[] }>();

  for (const city of cities) {
    const existing = byTier.get(city.tier);
    if (existing) {
      existing.cities.push(city.name);
    } else {
      byTier.set(city.tier, { feePkr: city.delivery_fee_pkr, cities: [city.name] });
    }
  }

  return [...byTier.entries()]
    .map(([tier, group]) => ({ tier, feePkr: group.feePkr, cities: group.cities }))
    .sort((a, b) => a.feePkr - b.feePkr);
}
