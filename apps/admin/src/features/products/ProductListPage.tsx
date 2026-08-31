import { useEffect, useState } from 'react';
import {
  formatPKR,
  effectivePricePkr,
  imageUrl,
  primaryImage,
  STOCK_STATUS_LABELS,
  type Product,
} from '@hamza/shared';

import { api } from '../../lib/api-client.js';
import { hrefFor, navigate } from '../../lib/router.js';
import { Button, ErrorBanner, Spinner } from '../../components/ui/controls.jsx';

/**
 * The product list.
 *
 * Shows hidden products too, greyed out — the owner needs to find and unhide
 * something without wondering where it went.
 */
export function ProductListPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .listProducts()
      .then(({ products: list }) => {
        if (!cancelled) setProducts(list);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load products');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleVisibility(product: Product): Promise<void> {
    try {
      const { product: updated } = await api.setProductVisibility(
        product.id,
        !product.is_active,
      );
      setProducts((current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)) ?? null,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update');
    }
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      <Button onClick={() => navigate({ name: 'product-new' })}>+ Add product</Button>

      {products === null ? (
        <Spinner label="Loading products…" />
      ) : products.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">
          No products yet. Add your first one.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200">
          {products.map((product) => {
            const cover = primaryImage(product);
            return (
              <li key={product.id} className="flex gap-3 py-3">
                {cover ? (
                  <img
                    src={imageUrl(cover, 'thumb')}
                    alt=""
                    className={`h-16 w-16 shrink-0 rounded-lg bg-neutral-100 object-cover ${
                      product.is_active ? '' : 'opacity-40'
                    }`}
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs text-ink-muted">
                    No photo
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <a
                    href={hrefFor({ name: 'product-edit', id: product.id })}
                    className="block truncate text-sm font-medium text-ink"
                  >
                    {product.name}
                  </a>
                  <p className="text-sm text-ink-muted">
                    {formatPKR(effectivePricePkr(product))}
                    {' · '}
                    {STOCK_STATUS_LABELS[product.stock_status]}
                  </p>
                  {!product.is_active && (
                    <p className="text-xs font-medium text-amber-700">Hidden</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void toggleVisibility(product)}
                  className="min-h-11 shrink-0 rounded-lg border border-neutral-300 px-3 text-xs font-medium"
                >
                  {product.is_active ? 'Hide' : 'Show'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
