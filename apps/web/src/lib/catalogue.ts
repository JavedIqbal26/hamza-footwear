import {
  createCatalogueRepository,
  createProductRepository,
  createReviewRepository,
  type ProductRepository,
} from '@hamza/db';
import {
  isCategory,
  isSortOption,
  isUkSize,
  NO_RATING,
  type CatalogueQuery,
  type Product,
  type RatingSummary,
} from '@hamza/shared';

import { getDatabase } from './runtime.js';

/**
 * The storefront's read model.
 *
 * Pages call these; they never touch a repository or a binding directly. This
 * is where "what the storefront shows" is decided — the repositories below only
 * know how to fetch rows.
 */

/** Products per page on the browse, search and category pages. */
export const PAGE_SIZE = 24;

/** How many products the home page features. */
export const HOME_FEATURED_COUNT = 8;

/** How many "more from this category" suggestions a product page shows. */
export const RELATED_COUNT = 4;

function repository(locals: App.Locals): ProductRepository {
  return createProductRepository(getDatabase(locals));
}

export function listFeaturedProducts(locals: App.Locals): Promise<Product[]> {
  return repository(locals).listActive({ limit: HOME_FEATURED_COUNT });
}

export function findProduct(locals: App.Locals, slug: string): Promise<Product | null> {
  return repository(locals).findBySlug(slug);
}

export function findProducts(locals: App.Locals, slugs: readonly string[]): Promise<Product[]> {
  return repository(locals).findBySlugs(slugs);
}

export function listRelatedProducts(
  locals: App.Locals,
  product: Product,
): Promise<Product[]> {
  return repository(locals).listRelated(product, RELATED_COUNT);
}

export function listProductSlugs(locals: App.Locals): Promise<string[]> {
  return repository(locals).listSlugs();
}

/**
 * Parses the facets out of a URL.
 *
 * Anything unrecognised is dropped rather than rejected: a hand-edited or stale
 * link should show a sensible page, not an error.
 */
export function parseCatalogueQuery(params: URLSearchParams): CatalogueQuery {
  const query: Record<string, unknown> = {};

  const q = params.get('q')?.trim();
  if (q) query.q = q.slice(0, 60);

  const category = params.get('category');
  if (category && isCategory(category)) query.category = category;

  const size = params.get('size');
  if (size && isUkSize(size)) query.size = size;

  const max = Number.parseInt(params.get('max') ?? '', 10);
  if (Number.isSafeInteger(max) && max > 0) query.maxPricePkr = max;

  if (params.get('sale') === '1') query.onSale = true;

  const sort = params.get('sort');
  if (sort && isSortOption(sort)) query.sort = sort;

  const page = Number.parseInt(params.get('page') ?? '1', 10);
  query.page = Number.isSafeInteger(page) && page > 0 ? page : 1;

  return query as CatalogueQuery;
}

export interface CatalogueView {
  readonly products: readonly Product[];
  readonly ratings: ReadonlyMap<string, RatingSummary>;
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
  readonly availableSizes: readonly string[];
}

/**
 * A page of the catalogue with every facet applied.
 *
 * Ratings for the whole page come back in one query rather than one per card —
 * the difference between a page and an N+1.
 */
export async function browseCatalogue(
  locals: App.Locals,
  query: CatalogueQuery,
): Promise<CatalogueView> {
  const db = getDatabase(locals);
  const catalogue = createCatalogueRepository(db);
  const page = Math.max(query.page ?? 1, 1);

  const [result, availableSizes] = await Promise.all([
    catalogue.search(query, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    catalogue.availableSizes(query),
  ]);

  const ratings = await createReviewRepository(db).summariesFor(
    result.products.map((product) => product.id),
  );

  return {
    products: result.products,
    ratings,
    total: result.total,
    page,
    pageCount: Math.max(Math.ceil(result.total / PAGE_SIZE), 1),
    availableSizes,
  };
}

/** Ratings for an arbitrary set of products, for grids outside `browseCatalogue`. */
export async function ratingsFor(
  locals: App.Locals,
  products: readonly Product[],
): Promise<ReadonlyMap<string, RatingSummary>> {
  if (products.length === 0) return new Map();
  return createReviewRepository(getDatabase(locals)).summariesFor(
    products.map((product) => product.id),
  );
}

export function ratingOf(
  ratings: ReadonlyMap<string, RatingSummary>,
  product: Pick<Product, 'id'>,
): RatingSummary {
  return ratings.get(product.id) ?? NO_RATING;
}
