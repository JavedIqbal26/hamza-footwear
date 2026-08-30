import type { UkSize } from './sizes.js';

/**
 * UK size -> approximate foot length in centimetres.
 *
 * Sizing confusion is a leading cause of returns, so this table is shipped as
 * data rather than baked into a page: the storefront size guide, the product
 * page, and (later) admin all read the same numbers.
 *
 * Figures follow the standard ~0.42cm-per-half-size progression. They are
 * approximate by nature — the guide tells customers to size up when their
 * measurement falls between two rows.
 */
export const SIZE_CHART_CM: Readonly<Record<UkSize, number>> = {
  '3': 21.6,
  '3.5': 22.0,
  '4': 22.5,
  '4.5': 22.9,
  '5': 23.3,
  '5.5': 23.8,
  '6': 24.1,
  '6.5': 24.6,
  '7': 25.0,
  '7.5': 25.4,
  '8': 25.8,
  '8.5': 26.3,
  '9': 26.7,
  '9.5': 27.1,
  '10': 27.5,
  '10.5': 28.0,
  '11': 28.4,
  '11.5': 28.8,
  '12': 29.2,
  '13': 30.0,
};

export function footLengthCm(size: UkSize): number {
  return SIZE_CHART_CM[size];
}
