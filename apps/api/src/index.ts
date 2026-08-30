import { Hono } from 'hono';

import { healthRoutes } from './routes/health.js';
import type { AppBindings } from './lib/env.js';

/**
 * The admin/write API.
 *
 * Phase 1 does not use this Worker: the storefront reads D1 through its own
 * binding, and ordering goes via WhatsApp. It exists now so the layering is in
 * place — Phase 2 adds order submission, product CRUD, image upload, and the
 * Telegram/Resend notifications behind Cloudflare Access.
 *
 * Entry point responsibilities stop at mounting routes. No logic here.
 */
const app = new Hono<AppBindings>().basePath('/api');

app.route('/', healthRoutes);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((error, c) => {
  console.error('Unhandled API error', error);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
