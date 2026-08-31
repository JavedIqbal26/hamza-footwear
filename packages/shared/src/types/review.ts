/**
 * A product review.
 *
 * Only written against a delivered order, so every rating on the site comes
 * from someone who actually received the shoes. That is the whole reason to
 * show ratings at all — an unverifiable star average is worse than none.
 */
export interface Review {
  readonly id: string;
  readonly product_id: string;
  readonly customer_id: string | null;
  readonly order_id: string | null;
  readonly author_name: string;
  /** 1–5. */
  readonly rating: number;
  readonly body: string;
  readonly created_at: string;
}

/** The aggregate shown on a product card and above the price. */
export interface RatingSummary {
  readonly average: number;
  readonly count: number;
}

export const NO_RATING: RatingSummary = { average: 0, count: 0 };

export function hasRating(summary: RatingSummary): boolean {
  return summary.count > 0;
}

/** One decimal place, the way the design shows it: "4.8". */
export function formatRating(summary: RatingSummary): string {
  return summary.average.toFixed(1);
}

/**
 * Whole, half and empty stars for a 5-star row.
 *
 * Returned as data rather than markup so the same maths serves the card, the
 * product page and any future summary block.
 */
export type StarState = 'full' | 'half' | 'empty';

export function starStates(summary: RatingSummary): StarState[] {
  const rounded = Math.round(summary.average * 2) / 2;
  return Array.from({ length: 5 }, (_, index) => {
    const position = index + 1;
    if (rounded >= position) return 'full';
    if (rounded >= position - 0.5) return 'half';
    return 'empty';
  });
}
