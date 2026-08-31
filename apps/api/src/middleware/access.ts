import { createMiddleware } from 'hono/factory';

import type { AppBindings } from '../lib/env.js';

/**
 * Cloudflare Access identity.
 *
 * Per CLAUDE.md there is no authentication code in this application: Access
 * sits in front of the Worker and refuses unauthenticated requests before they
 * reach us. This middleware does two smaller jobs.
 *
 * 1. It **fails closed.** If the identity header is absent, the request is
 *    rejected. A misconfigured or removed Access policy then breaks admin
 *    loudly instead of silently opening it to the internet.
 * 2. It records *who* is acting, so order status changes can be attributed.
 *
 * ---------------------------------------------------------------------------
 * SECURITY NOTE — read before changing the deployment.
 *
 * `Cf-Access-Authenticated-User-Email` is trustworthy ONLY because Access
 * terminates the request first and strips any client-supplied copy. If this
 * Worker is ever reachable on a hostname that Access does not cover, that
 * header can be forged and this check is worthless.
 *
 * Therefore: every route of this Worker must sit behind an Access application,
 * and the Worker must have no other public hostname. If that ever stops being
 * true, this must be replaced with real verification of the
 * `Cf-Access-Jwt-Assertion` JWT against the team's public keys.
 * ---------------------------------------------------------------------------
 */

const IDENTITY_HEADER = 'Cf-Access-Authenticated-User-Email';

function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export const requireAccess = createMiddleware<AppBindings>(async (c, next) => {
  const email = c.req.header(IDENTITY_HEADER)?.trim().toLowerCase();

  if (!email) {
    return c.json(
      {
        error:
          'Not authenticated. This endpoint must be reached through Cloudflare Access.',
      },
      401,
    );
  }

  /* A second allowlist is optional; the Access policy is the primary one. */
  const allowed = parseAllowList(c.env.ADMIN_EMAILS);
  if (allowed.length > 0 && !allowed.includes(email)) {
    return c.json({ error: 'This account is not allowed to use admin.' }, 403);
  }

  c.set('adminEmail', email);
  await next();
});
