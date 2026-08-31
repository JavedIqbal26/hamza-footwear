import { hrefFor, useRoute } from './lib/router.js';
import { OrderListPage } from './features/orders/OrderListPage.jsx';
import { ProductFormPage } from './features/products/ProductFormPage.jsx';
import { ProductListPage } from './features/products/ProductListPage.jsx';

/**
 * Admin shell.
 *
 * Two tabs, because there are two jobs: fulfil orders and maintain the
 * catalogue. Navigation sits at the top and everything below is one column —
 * this is used one-handed on a phone, standing in a shop.
 *
 * There is no sign-in screen anywhere in this app. Cloudflare Access handles
 * authentication before the SPA is ever served.
 */
export function App() {
  const route = useRoute();

  const title =
    route.name === 'orders'
      ? 'Orders'
      : route.name === 'products'
        ? 'Products'
        : route.name === 'product-new'
          ? 'Add product'
          : 'Edit product';

  return (
    <div className="mx-auto max-w-lg px-4 pb-10">
      <header className="sticky top-0 -mx-4 border-b border-neutral-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-ink">{title}</h1>
        <nav className="mt-2 flex gap-2">
          <TabLink href={hrefFor({ name: 'orders' })} active={route.name === 'orders'}>
            Orders
          </TabLink>
          <TabLink
            href={hrefFor({ name: 'products' })}
            active={route.name !== 'orders'}
          >
            Products
          </TabLink>
        </nav>
      </header>

      <main className="pt-4">
        {route.name === 'orders' && <OrderListPage />}
        {route.name === 'products' && <ProductListPage />}
        {route.name === 'product-new' && <ProductFormPage />}
        {route.name === 'product-edit' && <ProductFormPage productId={route.id} />}
      </main>
    </div>
  );
}

interface TabLinkProps {
  href: string;
  active: boolean;
  children: string;
}

function TabLink({ href, active, children }: TabLinkProps) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold ${
        active ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-ink'
      }`}
    >
      {children}
    </a>
  );
}
