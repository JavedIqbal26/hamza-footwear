import type { APIRoute } from 'astro';
import adminApi from '@hamza/api';

export const prerender = false;

/**
 * The admin API, mounted inside the storefront.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOT A SEPARATE WORKER ANY MORE
 *
 * It was, and on paper that was the better separation: CLAUDE.md says the
 * Worker owns admin. It does not survive contact with the platform.
 *
 * Cloudflare Access and Worker routes cannot both apply to the same path on a
 * Pages custom domain. Once Access processes a request, it forwards to the
 * *Pages* origin rather than re-evaluating Worker routes — so an Access-
 * protected `/api/admin/*` never reached the Worker, and the storefront
 * answered with an HTML 404. Measured, not guessed: `/api/nonexistent` reached
 * the Worker while `/api/admin/nonexistent` never did, the only difference
 * between them being Access membership.
 *
 * Mounting the same Hono app here resolves it without giving anything up. The
 * layering is untouched — routes → services → repositories, all unchanged — and
 * only the HTTP entry point moves. Access now sits in front of one origin
 * serving both `/admin` and `/api/admin`, which is also one fewer public
 * surface to secure.
 *
 * The Worker's `requireAccess` middleware still does its job: Access injects
 * `Cf-Access-Authenticated-User-Email` into whatever origin it forwards to, and
 * the middleware still fails closed without it.
 * ---------------------------------------------------------------------------
 *
 * `ALL` rather than a verb list: the Hono app owns method routing, and
 * duplicating it here would be a second place to forget a PUT.
 */
export const ALL: APIRoute = ({ request, locals }) => {
  const runtime = locals.runtime;

  return adminApi.fetch(
    request,
    runtime.env,
    /* Hono passes this through for waitUntil; Astro's shape is compatible. */
    runtime.ctx as ExecutionContext,
  );
};
