import type { APIRoute } from 'astro';

import { endSession } from '../../lib/auth/session.js';

export const prerender = false;

/**
 * Sign out.
 *
 * POST only: a GET that destroys a session would be triggered by any prefetch
 * or by an image tag on a hostile page.
 */
export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  await endSession(locals, cookies);
  return redirect('/', 303);
};
