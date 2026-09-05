import { useEffect, useState } from 'react';

/**
 * A hash router in forty lines.
 *
 * Admin has five screens. `react-router` is ~20KB for that, and every package
 * is weight (CLAUDE.md) — this is the whole feature set we need. Hash routing
 * also means the SPA needs no server rewrite rules to sit at `/admin`.
 */

export type Route =
  | { name: 'products' }
  | { name: 'product-new' }
  | { name: 'product-edit'; id: string }
  | { name: 'orders' }
  | { name: 'settings' };

const DEFAULT_ROUTE: Route = { name: 'orders' };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '');

  if (path === 'products') return { name: 'products' };
  if (path === 'products/new') return { name: 'product-new' };
  if (path === 'settings') return { name: 'settings' };
  if (path === 'orders' || path === '') return DEFAULT_ROUTE;

  const edit = /^products\/([^/]+)\/edit$/.exec(path);
  if (edit?.[1]) return { name: 'product-edit', id: edit[1] };

  return DEFAULT_ROUTE;
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'products':
      return '#/products';
    case 'product-new':
      return '#/products/new';
    case 'product-edit':
      return `#/products/${route.id}/edit`;
    case 'orders':
      return '#/orders';
    case 'settings':
      return '#/settings';
  }
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}
