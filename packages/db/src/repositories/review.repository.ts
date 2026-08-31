import type { D1Database } from '@cloudflare/workers-types';
import type { RatingSummary, Review } from '@hamza/shared';

import type { ReviewRow } from '../rows.js';

/**
 * Product reviews and their aggregates.
 *
 * A review may only be written against a delivered order, so every star on the
 * site comes from someone who received the shoes. An unverifiable rating is
 * worse than no rating — it is the one number a hesitant COD buyer leans on.
 */

const COLUMNS = `
  id, product_id, customer_id, order_id, author_name, rating, body, created_at
`;

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    product_id: row.product_id,
    customer_id: row.customer_id,
    order_id: row.order_id,
    author_name: row.author_name,
    rating: row.rating,
    body: row.body,
    created_at: row.created_at,
  };
}

export interface NewReview {
  readonly product_id: string;
  readonly customer_id: string;
  readonly order_id: string | null;
  readonly author_name: string;
  readonly rating: number;
  readonly body: string;
}

export interface ReviewRepository {
  listForProduct(productId: string, limit?: number): Promise<Review[]>;
  summaryFor(productId: string): Promise<RatingSummary>;
  /** Aggregates for many products in one query — product grids need this. */
  summariesFor(productIds: readonly string[]): Promise<Map<string, RatingSummary>>;
  create(id: string, review: NewReview): Promise<Review>;
  /** The delivered order that entitles this customer to review, if any. */
  findReviewableOrder(customerId: string, productId: string): Promise<string | null>;
  hasReviewed(customerId: string, productId: string): Promise<boolean>;
}

export function createReviewRepository(db: D1Database): ReviewRepository {
  return {
    async listForProduct(productId: string, limit = 20): Promise<Review[]> {
      const { results } = await db
        .prepare(
          `SELECT ${COLUMNS} FROM reviews
           WHERE product_id = ?1 AND is_published = 1
           ORDER BY created_at DESC LIMIT ?2`,
        )
        .bind(productId, Math.min(Math.max(Math.trunc(limit), 1), 100))
        .all<ReviewRow>();
      return results.map(toReview);
    },

    async summaryFor(productId: string): Promise<RatingSummary> {
      const row = await db
        .prepare(
          `SELECT AVG(rating) AS average, COUNT(*) AS count FROM reviews
           WHERE product_id = ?1 AND is_published = 1`,
        )
        .bind(productId)
        .first<{ average: number | null; count: number }>();

      return { average: row?.average ?? 0, count: row?.count ?? 0 };
    },

    /**
     * One query for a whole grid rather than one per card — the difference
     * between a page and an N+1.
     */
    async summariesFor(
      productIds: readonly string[],
    ): Promise<Map<string, RatingSummary>> {
      const summaries = new Map<string, RatingSummary>();
      if (productIds.length === 0) return summaries;

      const placeholders = productIds.map((_, index) => `?${index + 1}`).join(', ');
      const { results } = await db
        .prepare(
          `SELECT product_id, AVG(rating) AS average, COUNT(*) AS count FROM reviews
           WHERE is_published = 1 AND product_id IN (${placeholders})
           GROUP BY product_id`,
        )
        .bind(...productIds)
        .all<{ product_id: string; average: number | null; count: number }>();

      for (const row of results) {
        summaries.set(row.product_id, { average: row.average ?? 0, count: row.count });
      }
      return summaries;
    },

    async create(id: string, review: NewReview): Promise<Review> {
      const row = await db
        .prepare(
          `INSERT INTO reviews
             (id, product_id, customer_id, order_id, author_name, rating, body)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           RETURNING ${COLUMNS}`,
        )
        .bind(
          id,
          review.product_id,
          review.customer_id,
          review.order_id,
          review.author_name,
          review.rating,
          review.body,
        )
        .first<ReviewRow>();

      if (row === null) throw new Error('Review insert returned no row');
      return toReview(row);
    },

    /**
     * Entitlement check. Matches the product id inside the order's JSON items
     * against a delivered order belonging to this customer.
     */
    async findReviewableOrder(
      customerId: string,
      productId: string,
    ): Promise<string | null> {
      const row = await db
        .prepare(
          `SELECT id FROM orders
           WHERE customer_id = ?1
             AND order_status = 'delivered'
             AND items LIKE ?2
           ORDER BY created_at DESC LIMIT 1`,
        )
        .bind(customerId, `%"product_id":"${productId}"%`)
        .first<{ id: string }>();
      return row?.id ?? null;
    },

    async hasReviewed(customerId: string, productId: string): Promise<boolean> {
      const row = await db
        .prepare(
          'SELECT 1 AS found FROM reviews WHERE customer_id = ?1 AND product_id = ?2',
        )
        .bind(customerId, productId)
        .first<{ found: number }>();
      return row !== null;
    },
  };
}
