import { z } from 'zod';

import { CATEGORIES } from '../constants/categories.js';
import { UK_SIZES } from '../constants/sizes.js';
import { STOCK_STATUSES } from '../constants/statuses.js';
import { SLUG_MAX_LENGTH, SLUG_PATTERN } from '../validation/slug.js';

/** Whole, non-negative PKR. The single money primitive every schema reuses. */
export const pkrAmountSchema = z
  .number()
  .int('Price must be a whole number of rupees')
  .nonnegative()
  .max(10_000_000);

export const slugSchema = z
  .string()
  .min(1)
  .max(SLUG_MAX_LENGTH)
  .regex(SLUG_PATTERN, 'Slug may contain only lowercase letters, numbers and hyphens');

export const categorySchema = z.enum(CATEGORIES);
export const ukSizeSchema = z.enum(UK_SIZES);
export const stockStatusSchema = z.enum(STOCK_STATUSES);

/**
 * A product as accepted from a client (admin, Phase 2). Read paths return the
 * `Product` type directly; this is the write contract.
 */
export const productInputSchema = z
  .object({
    slug: slugSchema,
    name: z.string().min(1).max(120),
    description: z.string().max(2000).default(''),
    price_pkr: pkrAmountSchema,
    sale_price_pkr: pkrAmountSchema.nullable().default(null),
    category: categorySchema,
    sizes_available: z.array(ukSizeSchema).min(1).max(UK_SIZES.length),
    images: z.array(z.string().min(1).max(200)).max(10).default([]),
    is_active: z.boolean().default(true),
    stock_status: stockStatusSchema.default('in_stock'),
  })
  .refine(
    (product) =>
      product.sale_price_pkr === null || product.sale_price_pkr < product.price_pkr,
    { message: 'Sale price must be lower than the normal price', path: ['sale_price_pkr'] },
  );

export type ProductInput = z.infer<typeof productInputSchema>;

/** Query parameters for the public product listing. */
export const productListQuerySchema = z.object({
  category: categorySchema.optional(),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  offset: z.coerce.number().int().min(0).default(0),
});

export type ProductListQuery = z.infer<typeof productListQuerySchema>;
