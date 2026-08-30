/**
 * UK shoe sizes. Stored and displayed as strings so that half sizes never go
 * through float comparison — "7.5" is an identifier here, not a measurement.
 */
export const UK_SIZES = [
  '3',
  '3.5',
  '4',
  '4.5',
  '5',
  '5.5',
  '6',
  '6.5',
  '7',
  '7.5',
  '8',
  '8.5',
  '9',
  '9.5',
  '10',
  '10.5',
  '11',
  '11.5',
  '12',
  '13',
] as const;

export type UkSize = (typeof UK_SIZES)[number];

export function isUkSize(value: string): value is UkSize {
  return (UK_SIZES as readonly string[]).includes(value);
}

/** Sort helper — sizes are strings, so plain array sort would order "10" before "3". */
export function compareUkSizes(a: UkSize, b: UkSize): number {
  return UK_SIZES.indexOf(a) - UK_SIZES.indexOf(b);
}

export function sortUkSizes(sizes: readonly UkSize[]): UkSize[] {
  return [...sizes].sort(compareUkSizes);
}
