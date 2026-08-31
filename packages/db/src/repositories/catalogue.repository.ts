import type { D1Database } from '@cloudflare/workers-types';
import type { CatalogueQuery, Product, SortOption } from '@hamza/shared';

import { toProducts } from '../mappers/product.mapper.js';
import type { ProductRow } from '../rows.js';

/**
 * Search, filter and sort over the catalogue.
 *
 * Separate from `ProductRepository` because the shapes differ: that one answers
 * "the newest N in this category", this one builds a predicate from whatever
 * facets the URL carries. Keeping them apart stops the simple, hot query from
 * growing branches it never needs.
 *
 * Every fragment below is a fixed string; only bound values vary. Nothing from
 * the query string is ever concatenated into SQL.
 */

const COLUMNS = `
  id, slug, name, description, price_pkr, sale_price_pkr, category,
  sizes_available, images, is_active, stock_status, created_at, updated_at
`;

/** Sold-out last, then the requested order. */
const SORT_SQL: Readonly<Record<SortOption, string>> = {
  new: `ORDER BY (stock_status = 'out'), created_at DESC, id DESC`,
  price_asc: `ORDER BY (stock_status = 'out'), COALESCE(sale_price_pkr, price_pkr) ASC, id DESC`,
  price_desc: `ORDER BY (stock_status = 'out'), COALESCE(sale_price_pkr, price_pkr) DESC, id DESC`,
};

interface Predicate {
  readonly sql: string;
  readonly binds: unknown[];
}

/**
 * Builds the shared WHERE clause.
 *
 * `sizes_available` is a JSON array in a TEXT column, so a size filter matches
 * on the quoted member — `"8"` rather than `8` — which is what stops UK 8 from
 * also matching 8.5.
 */
function buildPredicate(query: CatalogueQuery): Predicate {
  const clauses = ['is_active = 1'];
  const binds: unknown[] = [];

  if (query.category) {
    binds.push(query.category);
    clauses.push(`category = ?${binds.length}`);
  }

  if (query.q) {
    const term = `%${query.q.toLowerCase()}%`;
    binds.push(term, term);
    clauses.push(
      `(lower(name) LIKE ?${binds.length - 1} OR lower(description) LIKE ?${binds.length})`,
    );
  }

  if (query.size) {
    binds.push(`%"${query.size}"%`);
    clauses.push(`sizes_available LIKE ?${binds.length}`);
  }

  if (query.maxPricePkr) {
    binds.push(query.maxPricePkr);
    clauses.push(`COALESCE(sale_price_pkr, price_pkr) <= ?${binds.length}`);
  }

  if (query.onSale) {
    clauses.push('sale_price_pkr IS NOT NULL');
  }

  return { sql: clauses.join(' AND '), binds };
}

export interface CatalogueResult {
  readonly products: Product[];
  readonly total: number;
}

export interface CatalogueRepository {
  search(query: CatalogueQuery, limit: number, offset: number): Promise<CatalogueResult>;
  /** Sizes actually offered by products matching everything except the size facet. */
  availableSizes(query: CatalogueQuery): Promise<string[]>;
}

export function createCatalogueRepository(db: D1Database): CatalogueRepository {
  return {
    async search(
      query: CatalogueQuery,
      limit: number,
      offset: number,
    ): Promise<CatalogueResult> {
      const predicate = buildPredicate(query);
      const order = SORT_SQL[query.sort ?? 'new'];

      const rowsStatement = db
        .prepare(
          `SELECT ${COLUMNS} FROM products
           WHERE ${predicate.sql}
           ${order}
           LIMIT ?${predicate.binds.length + 1} OFFSET ?${predicate.binds.length + 2}`,
        )
        .bind(...predicate.binds, limit, offset);

      const countStatement = db
        .prepare(`SELECT COUNT(*) AS count FROM products WHERE ${predicate.sql}`)
        .bind(...predicate.binds);

      const [rows, count] = await Promise.all([
        rowsStatement.all<ProductRow>(),
        countStatement.first<{ count: number }>(),
      ]);

      return { products: toProducts(rows.results), total: count?.count ?? 0 };
    },

    /**
     * Drives the size chips. Computed with the size facet removed, so choosing
     * UK 8 never empties the list of sizes you could switch to.
     */
    async availableSizes(query: CatalogueQuery): Promise<string[]> {
      const { size: _ignored, ...withoutSize } = query;
      const predicate = buildPredicate(withoutSize);

      const { results } = await db
        .prepare(`SELECT sizes_available FROM products WHERE ${predicate.sql}`)
        .bind(...predicate.binds)
        .all<{ sizes_available: string }>();

      const sizes = new Set<string>();
      for (const row of results) {
        try {
          const parsed: unknown = JSON.parse(row.sizes_available);
          if (Array.isArray(parsed)) {
            for (const value of parsed) if (typeof value === 'string') sizes.add(value);
          }
        } catch {
          /* A malformed row simply contributes no sizes. */
        }
      }
      return [...sizes];
    },
  };
}
