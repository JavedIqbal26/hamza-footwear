/**
 * `@hamza/shared` — types, constants, and pure helpers used by all three apps.
 *
 * This entry point has ZERO runtime dependencies, because the storefront
 * imports it and every byte counts against the product page's JS budget.
 *
 * Zod schemas deliberately live behind a separate subpath, `@hamza/shared/schemas`,
 * so that importing a type or `formatPKR` never drags Zod into a browser bundle.
 */

export * from './brand/logo.js';

export * from './constants/categories.js';
export * from './constants/cities.js';
export * from './constants/order-number.js';
export * from './constants/site.js';
export * from './constants/size-chart.js';
export * from './constants/sizes.js';
export * from './constants/statuses.js';

export * from './links/product-url.js';
export * from './links/whatsapp.js';

export * from './money/format.js';
export * from './money/pricing.js';

export * from './types/cart.js';
export * from './types/catalogue-query.js';
export * from './types/customer.js';
export * from './types/city.js';
export * from './types/image.js';
export * from './types/order.js';
export * from './types/product.js';
export * from './types/review.js';
export * from './types/settings.js';

export * from './validation/phone.js';
export * from './validation/slug.js';
