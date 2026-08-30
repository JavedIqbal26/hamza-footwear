import type { D1Database } from '@cloudflare/workers-types';
import type { Category, Product, StockStatus, UkSize } from '@hamza/shared';

import { serialiseArray } from '../mappers/json-column.js';
import { toProduct, toProducts } from '../mappers/product.mapper.js';
import type { ProductRow } from '../rows.js';

/**
 * Admin-side product access.
 *
 * Separate from `ProductRepository` because the two have different rules: the
 * storefront only ever sees `is_active = 1`, while admin must see and edit
 * everything, including products the owner has hidden.
 */

const COLUMNS = `
  id, slug, name, description, price_pkr, sale_price_pkr, category,
  sizes_available, images, is_active, stock_status, created_at, updated_at
`;

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

export interface ProductWriteInput {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly price_pkr: number;
  readonly sale_price_pkr: number | null;
  readonly category: Category;
  readonly sizes_available: readonly UkSize[];
  readonly images: readonly string[];
  readonly is_active: boolean;
  readonly stock_status: StockStatus;
}

export class DuplicateSlugError extends Error {
  constructor(slug: string) {
    super(`A product with the slug "${slug}" already exists`);
    this.name = 'DuplicateSlugError';
  }
}

export interface ProductWriteRepository {
  listAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  create(id: string, input: ProductWriteInput): Promise<Product>;
  update(id: string, input: ProductWriteInput): Promise<Product | null>;
  setActive(id: string, isActive: boolean): Promise<Product | null>;
  remove(id: string): Promise<boolean>;
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

export function createProductWriteRepository(db: D1Database): ProductWriteRepository {
  return {
    /** Admin sees hidden products too, newest first. */
    async listAll(): Promise<Product[]> {
      const { results } = await db
        .prepare(`SELECT ${COLUMNS} FROM products ORDER BY created_at DESC, id DESC`)
        .all<ProductRow>();
      return toProducts(results);
    },

    async findById(id: string): Promise<Product | null> {
      const row = await db
        .prepare(`SELECT ${COLUMNS} FROM products WHERE id = ?1`)
        .bind(id)
        .first<ProductRow>();
      return row === null ? null : toProduct(row);
    },

    async create(id: string, input: ProductWriteInput): Promise<Product> {
      try {
        const row = await db
          .prepare(
            `INSERT INTO products (
               id, slug, name, description, price_pkr, sale_price_pkr, category,
               sizes_available, images, is_active, stock_status
             ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             RETURNING ${COLUMNS}`,
          )
          .bind(...bindValues(id, input))
          .first<ProductRow>();

        if (row === null) throw new Error('Product insert returned no row');

        const product = toProduct(row);
        if (product === null) throw new Error('Product insert returned an unmappable row');
        return product;
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateSlugError(input.slug);
        throw error;
      }
    },

    async update(id: string, input: ProductWriteInput): Promise<Product | null> {
      try {
        const row = await db
          .prepare(
            `UPDATE products SET
               slug = ?2, name = ?3, description = ?4, price_pkr = ?5,
               sale_price_pkr = ?6, category = ?7, sizes_available = ?8,
               images = ?9, is_active = ?10, stock_status = ?11,
               updated_at = ${NOW}
             WHERE id = ?1
             RETURNING ${COLUMNS}`,
          )
          .bind(...bindValues(id, input))
          .first<ProductRow>();

        return row === null ? null : toProduct(row);
      } catch (error) {
        if (isUniqueViolation(error)) throw new DuplicateSlugError(input.slug);
        throw error;
      }
    },

    /** Hiding a product is the safe alternative to deleting one that has orders. */
    async setActive(id: string, isActive: boolean): Promise<Product | null> {
      const row = await db
        .prepare(
          `UPDATE products SET is_active = ?2, updated_at = ${NOW}
           WHERE id = ?1 RETURNING ${COLUMNS}`,
        )
        .bind(id, isActive ? 1 : 0)
        .first<ProductRow>();

      return row === null ? null : toProduct(row);
    },

    async remove(id: string): Promise<boolean> {
      const result = await db.prepare('DELETE FROM products WHERE id = ?1').bind(id).run();
      return (result.meta.changes ?? 0) > 0;
    },
  };
}

/** Shared bind order for insert and update, so the two cannot drift apart. */
function bindValues(id: string, input: ProductWriteInput): unknown[] {
  return [
    id,
    input.slug,
    input.name,
    input.description,
    input.price_pkr,
    input.sale_price_pkr,
    input.category,
    serialiseArray(input.sizes_available),
    serialiseArray(input.images),
    input.is_active ? 1 : 0,
    input.stock_status,
  ];
}
