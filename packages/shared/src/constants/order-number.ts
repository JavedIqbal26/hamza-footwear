/**
 * Human-readable order numbers.
 *
 * `HF-1042` is what the owner and the customer say to each other on WhatsApp,
 * so it must survive being read aloud over a bad line. The sequence comes from
 * the `counters` table.
 */

export const ORDER_NUMBER_PREFIX = 'HF';

export const ORDER_NUMBER_PATTERN = /^HF-\d{4,}$/;

export function formatOrderNumber(sequence: number): string {
  return `${ORDER_NUMBER_PREFIX}-${sequence}`;
}

export function isOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value);
}
