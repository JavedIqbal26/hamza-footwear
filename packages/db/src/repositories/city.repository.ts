import type { D1Database } from '@cloudflare/workers-types';
import type { City } from '@hamza/shared';

import { toCities, toCity } from '../mappers/city.mapper.js';
import type { CityRow } from '../rows.js';

/**
 * Read access to delivery destinations.
 *
 * The checkout dropdown is built from `listAll`, and the fee charged on an
 * order comes from `findByName` — server-side, never from the client.
 */

export interface CityRepository {
  listAll(): Promise<City[]>;
  findByName(name: string): Promise<City | null>;
}

export function createCityRepository(db: D1Database): CityRepository {
  return {
    /** Major cities first, then alphabetical — matches the dropdown's order. */
    async listAll(): Promise<City[]> {
      const { results } = await db
        .prepare(
          `SELECT name, delivery_fee_pkr, tier FROM cities
           ORDER BY CASE tier WHEN 'major' THEN 0 ELSE 1 END, name ASC`,
        )
        .all<CityRow>();
      return toCities(results);
    },

    async findByName(name: string): Promise<City | null> {
      const row = await db
        .prepare('SELECT name, delivery_fee_pkr, tier FROM cities WHERE name = ?1')
        .bind(name)
        .first<CityRow>();

      return row === null ? null : toCity(row);
    },
  };
}
