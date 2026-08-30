import type { APIRoute } from 'astro';

import { IMAGE_CACHE_CONTROL } from '../../lib/cache.js';
import { getImageBucket } from '../../lib/runtime.js';

export const prerender = false;

/**
 * Serves product images from R2 on our own origin.
 *
 * Not an R2 public bucket URL: keeping images same-origin honours the
 * no-third-party-origins rule, keeps the cache under our control, and means one
 * TLS connection serves the whole page.
 *
 * Variant keys are content-addressed and never rewritten in place, so responses
 * are immutable and cached for a year.
 */

/** Only the shapes `imageVariantKey` produces are servable. */
const ALLOWED_KEY = /^[A-Za-z0-9/_-]+-\d{3,4}\.webp$/;

function notFound(): Response {
  return new Response('Not found', { status: 404 });
}

export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;

  /* Reject traversal and anything that is not a generated variant key. */
  if (!key || key.includes('..') || !ALLOWED_KEY.test(key)) return notFound();

  const object = await getImageBucket(locals).get(key);
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', IMAGE_CACHE_CONTROL);
  headers.set('Content-Type', object.httpMetadata?.contentType ?? 'image/webp');
  headers.set('ETag', object.httpEtag);
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(object.body, { headers });
};
