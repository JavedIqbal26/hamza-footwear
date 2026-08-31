import { Hono } from 'hono';
import { productInputSchema } from '@hamza/shared/schemas';

import { notFound, validationFailed } from '../../lib/http.js';
import {
  createProductService,
  DuplicateSlugError,
  ProductNotFoundError,
} from '../../services/product.service.js';
import type { AppBindings } from '../../lib/env.js';

/**
 * Product CRUD.
 *
 * Handlers do three things and stop: parse with Zod, call one service method,
 * map the result to a response.
 */
export const productRoutes = new Hono<AppBindings>();

productRoutes.get('/products', async (c) => {
  const products = await createProductService(c.env.DB).list();
  return c.json({ products });
});

productRoutes.get('/products/:id', async (c) => {
  try {
    const product = await createProductService(c.env.DB).get(c.req.param('id'));
    return c.json({ product });
  } catch (error) {
    if (error instanceof ProductNotFoundError) return notFound(c, 'Product not found');
    throw error;
  }
});

productRoutes.post('/products', async (c) => {
  const parsed = productInputSchema.safeParse(await c.req.json());
  if (!parsed.success) return validationFailed(c, parsed.error);

  try {
    const product = await createProductService(c.env.DB).create(parsed.data);
    return c.json({ product }, 201);
  } catch (error) {
    if (error instanceof DuplicateSlugError) {
      return c.json({ error: error.message, fields: { slug: 'Already in use' } }, 409);
    }
    throw error;
  }
});

productRoutes.put('/products/:id', async (c) => {
  const parsed = productInputSchema.safeParse(await c.req.json());
  if (!parsed.success) return validationFailed(c, parsed.error);

  try {
    const product = await createProductService(c.env.DB).update(c.req.param('id'), parsed.data);
    return c.json({ product });
  } catch (error) {
    if (error instanceof ProductNotFoundError) return notFound(c, 'Product not found');
    if (error instanceof DuplicateSlugError) {
      return c.json({ error: error.message, fields: { slug: 'Already in use' } }, 409);
    }
    throw error;
  }
});

/**
 * Hide or show. There is no delete: past orders reference products, and the
 * owner still needs to look one up months later.
 */
productRoutes.post('/products/:id/visibility', async (c) => {
  const body = await c.req.json<{ is_active?: unknown }>();
  if (typeof body.is_active !== 'boolean') {
    return c.json({ error: 'is_active must be true or false' }, 422);
  }

  try {
    const product = await createProductService(c.env.DB).setActive(
      c.req.param('id'),
      body.is_active,
    );
    return c.json({ product });
  } catch (error) {
    if (error instanceof ProductNotFoundError) return notFound(c, 'Product not found');
    throw error;
  }
});
