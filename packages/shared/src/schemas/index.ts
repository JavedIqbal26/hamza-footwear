/**
 * `@hamza/shared/schemas` — Zod contracts for the API boundary.
 *
 * Kept on a separate subpath from the main entry point so that Zod is never
 * pulled into the storefront bundle. Import from here in the Worker and in
 * admin; import from `@hamza/shared` everywhere else.
 *
 * Order schemas arrive in Phase 2 alongside the order form.
 */

export * from './product.js';
