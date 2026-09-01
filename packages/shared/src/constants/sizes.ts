/**
 * UK shoe sizes.
 *
 * Whole sizes only — the shop does not stock half sizes, so offering "7.5" in a
 * filter or an admin picker would advertise stock that cannot be sold.
 *
 * Still strings rather than numbers: a size is an identifier here, not a
 * measurement, and keeping them as strings means the stored form never depends
 * on float formatting.
 *
 * Removing a size from this list is not a cosmetic change. `isUkSize` gates the
 * order mapper, which drops any line item whose size it no longer recognises —
 * so a size that has ever been sold must stay here, even after the shop stops
 * stocking it, or those orders lose that line in admin.
 */
export const UK_SIZES = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
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
