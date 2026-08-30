import type { Category, Product } from '@hamza/shared';

import { toProduct, toProducts } from '../mappers/product.mapper.js';
import type { ProductRow } from '../rows.js';

/**
 * Read access to the product catalogue.
 *
 * SQL lives here and nowhere else. Every query is parameterised — no value is
 * ever interpolated into a statement. The repository knows nothing about HTTP,
 * pricing rules, or presentation; it returns domain types and stops.
 */

/** Columns every read selects. Listed explicitly so `SELECT *` never leaks a new column. */
const COLUMNS = `
  id, slug, name, description, price_pkr, sale_price_pkr, category,
  sizes_available, images, is_active, stock_status, created_at, updated_at
`;

export interface ListProductsOptions {
  readonly category?: Category;
  readonly limit?: number;
  readonly offset?: number;
}

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT);
}

export interface ProductRepository {
  listActive(options?: ListProductsOptions): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  countActive(category?: Category): Promise<number>;
  listSlugs(): Promise<string[]>;
}

export function createProductRepository(db: D1Database): ProductRepository {
  return {
    async listActive(options: ListProductsOptions = {}): Promise<Product[]> {
      const limit = clampLimit(options.limit);
      const offset = Math.max(Math.trunc(options.offset ?? 0), 0);

      const statement =
        options.category === undefined
          ? db
              .prepare(
                `SELECT ${COLUMNS} FROM products
                 WHERE is_active = 1
                 ORDER BY created_at DESC
                 LIMIT ?1 OFFSET ?2`,
              )
              .bind(limit, offset)
          : db
              .prepare(
                `SELECT ${COLUMNS} FROM products
                 WHERE is_active = 1 AND category = ?1
                 ORDER BY created_at DESC
                 LIMIT ?2 OFFSET ?3`,
              )
              .bind(options.category, limit, offset);

      const { results } = await statement.all<ProductRow>();
      return toProducts(results);
    },

    async findBySlug(slug: string): Promise<Product | null> {
      const row = await db
        .prepare(`SELECT ${COLUMNS} FROM products WHERE slug = ?1 AND is_active = 1`)
        .bind(slug)
        .first<ProductRow>();

      return row === null ? null : toProduct(row);
    },

    async countActive(category?: Category): Promise<number> {
      const statement =
        category === undefined
          ? db.prepare('SELECT COUNT(*) AS count FROM products WHERE is_active = 1')
          : db
              .prepare(
                'SELECT COUNT(*) AS count FROM products WHERE is_active = 1 AND category = ?1',
              )
              .bind(category);

      const row = await statement.first<{ count: number }>();
      return row?.count ?? 0;
    },

    /** Used to build the sitemap. */
    async listSlugs(): Promise<string[]> {
      const { results } = await db
        .prepare('SELECT slug FROM products WHERE is_active = 1 ORDER BY created_at DESC')
        .all<{ slug: string }>();
      return results.map((row) => row.slug);
    },
  };
}
