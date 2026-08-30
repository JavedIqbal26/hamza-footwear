/**
 * `@hamza/db` — the only place in the codebase that speaks SQL.
 *
 * The storefront (catalogue reads, cart pricing, order creation) and the admin
 * Worker (product CRUD, order management) both import their data access from
 * here, so a query exists once and the two apps cannot drift apart.
 *
 * Repositories are factories taking a `D1Database`: no globals, no connection
 * state, and trivially fakeable in a test.
 */

export * from './repositories/city.repository.js';
export * from './repositories/counter.repository.js';
export * from './repositories/order.repository.js';
export * from './repositories/product.repository.js';
export * from './repositories/product-write.repository.js';
export type { CityRow, OrderRow, ProductRow } from './rows.js';
