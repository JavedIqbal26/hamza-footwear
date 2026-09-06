import { createMiddleware } from 'hono/factory';

import { verifyAccessJwt } from '../lib/access-jwt.js';
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
 * This used to trust `Cf-Access-Authenticated-User-Email`, on the reasoning
 * that Access strips any client-supplied copy. Two things were wrong with that.
 *
 * First, it did not work: Access does not send that header. Measured on the
 * deployed site — the JWT assertion arrives, the email header does not.
 *
 * Second, and more importantly, trusting a plain header made the whole thing
 * contingent on deployment shape. It was only safe while every route sat behind
 * Access on a hostname with no other door, and this project has since grown a
 * `www` hostname that Access did not cover — where the admin UI was reachable
 * and only this middleware's refusal stopped it doing anything.
 *
 * Verifying the signed token removes that dependency. A forged header is now
 * worth nothing regardless of how the app is exposed, which is the property we
 * actually wanted.
 * ---------------------------------------------------------------------------
 */

const TOKEN_HEADER = 'Cf-Access-Jwt-Assertion';

function parseAllowList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
}

export const requireAccess = createMiddleware<AppBindings>(async (c, next) => {
  const token = c.req.header(TOKEN_HEADER);

  if (!token) {
    return c.json(
      {
        error:
          'Not authenticated. This endpoint must be reached through Cloudflare Access.',
      },
      401,
    );
  }

  /*
   * Both are plain identifiers rather than secrets, so they live in
   * wrangler.toml. Missing configuration fails closed: an unverifiable token is
   * refused rather than waved through, because the alternative is an admin API
   * that opens itself when someone forgets a variable.
   */
  const teamDomain = c.env.ACCESS_TEAM_DOMAIN;
  const audience = c.env.ACCESS_AUD;

  if (!teamDomain || !audience) {
    console.error('ACCESS_TEAM_DOMAIN or ACCESS_AUD is not configured');
    return c.json({ error: 'Admin authentication is not configured.' }, 500);
  }

  const identity = await verifyAccessJwt(token, teamDomain, audience);

  if (!identity) {
    return c.json({ error: 'Your Access session is not valid. Reload to sign in.' }, 401);
  }

  const email = identity.email;

  /* A second allowlist is optional; the Access policy is the primary one. */
  const allowed = parseAllowList(c.env.ADMIN_EMAILS);
  if (allowed.length > 0 && !allowed.includes(email)) {
    return c.json({ error: 'This account is not allowed to use admin.' }, 403);
  }

  c.set('adminEmail', email);
  await next();
});
