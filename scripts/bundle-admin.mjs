/**
 * Folds the built admin SPA into the storefront's Pages output.
 *
 * Admin is a separate Vite build, but it is deployed as part of the storefront
 * so that it lives at `hamzafootwear.com/admin`. That co-location is not
 * cosmetic — it is what keeps admin's `/api/admin/...` calls same-origin (no
 * CORS anywhere in this project), lets its product thumbnails resolve through
 * the storefront's own `/img/` route, and puts one Cloudflare Access
 * application in front of both halves.
 *
 * Two things happen here, and the second is the one that is easy to miss.
 */

import { cp, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const ADMIN_DIST = 'apps/admin/dist';
const WEB_DIST = 'apps/web/dist';
const TARGET = join(WEB_DIST, 'admin');
const ROUTES = join(WEB_DIST, '_routes.json');

/* Anything under here is a static file, never the SSR worker's business. */
const ADMIN_ROUTE = '/admin/*';

/*
 * The admin API belongs to its own Worker, on a route of the same name.
 *
 * Worker routes are evaluated ahead of Pages, so in principle this is already
 * unambiguous — but Astro's manifest claims `/*`, which means the storefront
 * asserts a claim on /api too. Excluding it removes the overlap rather than
 * relying on precedence, and the failure it prevents is a confusing one: the
 * storefront answering an admin API call with an HTML 404 that the admin client
 * cannot parse.
 */
const API_ROUTE = '/api/*';

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(ADMIN_DIST))) {
  console.error(`Missing ${ADMIN_DIST}. Build admin before the storefront.`);
  process.exit(1);
}
if (!(await exists(WEB_DIST))) {
  console.error(`Missing ${WEB_DIST}. Build the storefront first.`);
  process.exit(1);
}

/* 1. The files themselves. */
await cp(ADMIN_DIST, TARGET, { recursive: true });

/*
 * 2. Tell Pages not to route them through the storefront worker.
 *
 * Astro emits `_routes.json` with `include: ["/*"]` and an explicit exclude
 * list of its own static assets. Files copied in afterwards are not on that
 * list, so without this every request to /admin would be handed to the Astro
 * SSR worker — which has no such route and would answer 404. The failure only
 * appears once deployed, which is the worst place to find it.
 */
const routes = JSON.parse(await readFile(ROUTES, 'utf8'));
let changed = false;

for (const route of [ADMIN_ROUTE, API_ROUTE]) {
  if (!routes.exclude.includes(route)) {
    routes.exclude.push(route);
    changed = true;
  }
}

if (changed) await writeFile(ROUTES, `${JSON.stringify(routes, null, 2)}\n`);

console.log(`Bundled admin into ${TARGET}; excluded ${ADMIN_ROUTE} and ${API_ROUTE}.`);
