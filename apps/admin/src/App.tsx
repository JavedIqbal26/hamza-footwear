import { hrefFor, useRoute } from './lib/router.js';
import { OrderListPage } from './features/orders/OrderListPage.jsx';
import { ProductFormPage } from './features/products/ProductFormPage.jsx';
import { ProductListPage } from './features/products/ProductListPage.jsx';
import { Logo } from './components/ui/Logo.jsx';

/**
 * Admin shell.
 *
 * Two jobs, two tabs: fulfil orders and maintain the catalogue.
 *
 * Used on **both** a phone (standing in the shop) and a laptop (doing the
 * books). Below `sm:` it is a single column with tab buttons; from `sm:` up the
 * container widens and the nav sits inline beside the title, so a wide screen
 * shows a real grid of orders or products instead of one 512px column stranded
 * in the middle of a monitor.
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
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <header className="sticky top-0 z-20 -mx-4 border-b border-neutral-200 bg-white px-4 py-3 sm:-mx-6 sm:flex sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <h1 className="text-lg font-bold text-ink sm:text-xl">{title}</h1>
        </div>
        <nav className="mt-2 flex gap-2 sm:mt-0 sm:w-auto">
          <TabLink href={hrefFor({ name: 'orders' })} active={route.name === 'orders'}>
            Orders
          </TabLink>
          <TabLink href={hrefFor({ name: 'products' })} active={route.name !== 'orders'}>
            Products
          </TabLink>
        </nav>
      </header>

      <main className="pt-4 sm:pt-6">
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
      className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-5 text-sm font-semibold sm:flex-none ${
        active ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-ink hover:bg-neutral-200'
      }`}
    >
      {children}
    </a>
  );
}
