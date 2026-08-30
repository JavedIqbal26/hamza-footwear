import { createProductRepository, type ProductRepository } from '@hamza/db';
import type { Category, Product } from '@hamza/shared';

import { getDatabase } from './runtime.js';

/**
 * The storefront's read model.
 *
 * Pages call these; they never touch a repository or a binding directly. This
 * is where "what the storefront shows" is decided — the repository below only
 * knows how to fetch rows.
 */

/** Products per page on the browse and category pages. */
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

export interface PagedProducts {
  readonly products: readonly Product[];
  readonly total: number;
  readonly page: number;
  readonly pageCount: number;
}

/**
 * A page of the catalogue, optionally filtered to one category.
 *
 * Returns the total as well as the rows so the page can render "showing 24 of
 * 61" and real pagination links — a browsing shopper needs to know how much
 * more there is.
 */
export async function listCatalogue(
  locals: App.Locals,
  options: { category?: Category; page?: number } = {},
): Promise<PagedProducts> {
  const repo = repository(locals);
  const page = Math.max(Math.trunc(options.page ?? 1), 1);

  const [products, total] = await Promise.all([
    repo.listActive({
      category: options.category,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    repo.countActive(options.category),
  ]);

  return {
    products,
    total,
    page,
    pageCount: Math.max(Math.ceil(total / PAGE_SIZE), 1),
  };
}

export function findProduct(locals: App.Locals, slug: string): Promise<Product | null> {
  return repository(locals).findBySlug(slug);
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
