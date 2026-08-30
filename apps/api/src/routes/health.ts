import { Hono } from 'hono';

import type { AppBindings } from '../lib/env.js';

/**
 * Liveness and database reachability.
 *
 * Deliberately reports whether D1 answers, not just whether the Worker booted —
 * a Worker that cannot reach its database is not healthy.
 */
export const healthRoutes = new Hono<AppBindings>();

healthRoutes.get('/health', async (c) => {
  try {
    await c.env.DB.prepare('SELECT 1').first();
    return c.json({ status: 'ok', database: 'ok' });
  } catch {
    return c.json({ status: 'degraded', database: 'unreachable' }, 503);
  }
});
