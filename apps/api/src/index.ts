import { Hono } from 'hono';

import { healthRoutes } from './routes/health.js';
import { orderRoutes } from './routes/admin/orders.js';
import { productRoutes } from './routes/admin/products.js';
import { settingsRoutes } from './routes/admin/settings.js';
import { uploadRoutes } from './routes/admin/uploads.js';
import { requireAccess } from './middleware/access.js';
import type { AppBindings } from './lib/env.js';

/**
 * The admin API.
 *
 * Serves the admin SPA only. The public storefront does not call this Worker —
 * it reads D1 through its own binding and creates orders on its own origin, so
 * checkout needs no CORS preflight and works without JavaScript.
 *
 * Everything under `/api/admin` sits behind Cloudflare Access. See
 * `middleware/access.ts` for what that does and does not guarantee.
 *
 * Entry point responsibilities stop at mounting routes. No logic here.
 */
const app = new Hono<AppBindings>().basePath('/api');

app.route('/', healthRoutes);


const admin = new Hono<AppBindings>();
admin.use('*', requireAccess);
admin.route('/', productRoutes);
admin.route('/', orderRoutes);
admin.route('/', uploadRoutes);
admin.route('/', settingsRoutes);

app.route('/admin', admin);

app.notFound((c) => c.json({ error: 'Not found' }, 404));

app.onError((error, c) => {
  console.error('Unhandled API error', error);
  return c.json({ error: 'Internal error' }, 500);
});

export default app;
