/**
 * `@hamza/db` — the only place in the codebase that speaks SQL.
 *
 * Both the storefront (reads, via its D1 binding) and the Worker (writes, from
 * Phase 2) import their data access from here, so a query exists once and the
 * two apps cannot drift apart.
 *
 * Repositories are factories taking a `D1Database`: no globals, no connection
 * state, and trivially fakeable in a test.
 */

export * from './repositories/city.repository.js';
export * from './repositories/product.repository.js';
export type { CityRow, ProductRow } from './rows.js';
