import type { APIRoute } from 'astro';
import { CATEGORIES, categoryPath, productPath } from '@hamza/shared';

import { listProductSlugs } from '../lib/catalogue.js';
import { SITE } from '../lib/site.js';

export const prerender = false;

/** Static pages that always exist, with a rough change frequency. */
const STATIC_PATHS = ['/', '/size-guide', '/delivery', '/returns'] as const;

function urlEntry(path: string): string {
  return `  <url><loc>${new URL(path, SITE.url).href}</loc></url>`;
}

export const GET: APIRoute = async ({ locals }) => {
  const slugs = await listProductSlugs(locals);

  const entries = [
    ...STATIC_PATHS.map(urlEntry),
    ...CATEGORIES.map((category) => urlEntry(categoryPath(category))),
    /* No `?v=` here — the canonical product URL is the bare one. */
    ...slugs.map((slug) => urlEntry(productPath(slug))),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
