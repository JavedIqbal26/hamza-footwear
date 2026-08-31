import type { Category } from '../constants/categories.js';
import type { UkSize } from '../constants/sizes.js';

/**
 * Browse, search, filter and sort — the shape the URL carries.
 *
 * Every one of these lives in the query string rather than in client state, so
 * a filtered view is linkable, shareable, back-buttonable and works with no
 * JavaScript. The filter chips in the design are plain links.
 */

export const SORT_OPTIONS = ['new', 'price_asc', 'price_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const SORT_LABELS: Readonly<Record<SortOption, string>> = {
  new: 'New',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

export function isSortOption(value: string): value is SortOption {
  return (SORT_OPTIONS as readonly string[]).includes(value);
}

export interface CatalogueQuery {
  readonly q?: string;
  readonly category?: Category;
  readonly size?: UkSize;
  /** Whole PKR ceiling, e.g. 3000 for the design's "Under Rs 3,000" chip. */
  readonly maxPricePkr?: number;
  /** Only products with a sale price. */
  readonly onSale?: boolean;
  readonly sort?: SortOption;
  readonly page?: number;
}

/** Price ceilings offered as one-tap chips, matching the design. */
export const PRICE_CHIPS_PKR = [2000, 3000, 5000] as const;

const PARAMS = {
  q: 'q',
  size: 'size',
  max: 'max',
  sale: 'sale',
  sort: 'sort',
  page: 'page',
} as const;

/**
 * Builds a URL for the current view with one facet changed or cleared.
 *
 * The query string is assembled by hand rather than with `URLSearchParams`,
 * for the same reason `formatPKR` avoids `Intl`: this package is imported by
 * the storefront and stays free of ambient platform globals, so it needs no
 * DOM lib and behaves identically wherever it runs.
 */
export function catalogueHref(
  basePath: string,
  query: CatalogueQuery,
  change: Partial<CatalogueQuery>,
): string {
  const next = { ...query, ...change };
  const pairs: string[] = [];

  const add = (key: string, value: string | number) => {
    pairs.push(`${key}=${encodeURIComponent(String(value))}`);
  };

  if (next.q) add(PARAMS.q, next.q);
  if (next.size) add(PARAMS.size, next.size);
  if (next.maxPricePkr) add(PARAMS.max, next.maxPricePkr);
  if (next.onSale) add(PARAMS.sale, '1');
  if (next.sort && next.sort !== 'new') add(PARAMS.sort, next.sort);
  /* Any facet change resets paging — page 4 of a different filter is meaningless. */
  if (next.page && next.page > 1 && !hasFacetChange(change)) {
    add(PARAMS.page, next.page);
  }

  return pairs.length > 0 ? `${basePath}?${pairs.join('&')}` : basePath;
}

function hasFacetChange(change: Partial<CatalogueQuery>): boolean {
  return (
    'q' in change ||
    'size' in change ||
    'maxPricePkr' in change ||
    'onSale' in change ||
    'sort' in change
  );
}

/** True when anything beyond plain browsing is applied. */
export function hasFilters(query: CatalogueQuery): boolean {
  return Boolean(query.q || query.size || query.maxPricePkr || query.onSale);
}
