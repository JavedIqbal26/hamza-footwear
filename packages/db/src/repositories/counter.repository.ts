import type { D1Database } from '@cloudflare/workers-types';

/**
 * Monotonic counters.
 *
 * D1 has no interactive transactions, so the allocation is done as a single
 * `UPDATE ... RETURNING` statement. SQLite applies that atomically, which is
 * what stops two simultaneous orders from taking the same number.
 */

export const ORDER_NUMBER_COUNTER = 'order_number';

export class CounterMissingError extends Error {
  constructor(name: string) {
    super(`Counter "${name}" does not exist. Has migration 0002 been applied?`);
    this.name = 'CounterMissingError';
  }
}

export interface CounterRepository {
  next(name: string): Promise<number>;
}

export function createCounterRepository(db: D1Database): CounterRepository {
  return {
    async next(name: string): Promise<number> {
      const row = await db
        .prepare('UPDATE counters SET value = value + 1 WHERE name = ?1 RETURNING value')
        .bind(name)
        .first<{ value: number }>();

      if (row === null) throw new CounterMissingError(name);
      return row.value;
    },
  };
}
