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

/** How many products a category page shows before pagination would be needed. */
export const CATEGORY_PAGE_SIZE = 24;

/** How many products the home page features. */
export const HOME_FEATURED_COUNT = 8;

function repository(locals: App.Locals): ProductRepository {
  return createProductRepository(getDatabase(locals));
}

export function listFeaturedProducts(locals: App.Locals): Promise<Product[]> {
  return repository(locals).listActive({ limit: HOME_FEATURED_COUNT });
}

export function listProductsInCategory(
  locals: App.Locals,
  category: Category,
): Promise<Product[]> {
  return repository(locals).listActive({ category, limit: CATEGORY_PAGE_SIZE });
}

export function findProduct(
  locals: App.Locals,
  slug: string,
): Promise<Product | null> {
  return repository(locals).findBySlug(slug);
}

export function listProductSlugs(locals: App.Locals): Promise<string[]> {
  return repository(locals).listSlugs();
}
