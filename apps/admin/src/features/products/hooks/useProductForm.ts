import { useEffect, useState } from 'react';
import {
  slugify,
  type Category,
  type Product,
  type StockStatus,
  type UkSize,
} from '@hamza/shared';

import { api, ApiError } from '../../../lib/api-client.js';
import { navigate } from '../../../lib/router.js';

/**
 * Everything the product form does that is not rendering: load, edit, save.
 *
 * Split out because the page had grown past the 200-line ceiling doing both
 * jobs. The page below it is now purely presentational, which also makes the
 * one piece with real branching — the create/update decision and its error
 * mapping — readable on its own.
 */

export interface ProductFormState {
  name: string;
  slug: string;
  description: string;
  /* Prices are strings while being typed: a half-entered "12" must not become 12. */
  price_pkr: string;
  sale_price_pkr: string;
  category: Category;
  sizes_available: UkSize[];
  images: string[];
  is_active: boolean;
  stock_status: StockStatus;
}

const EMPTY: ProductFormState = {
  name: '',
  slug: '',
  description: '',
  price_pkr: '',
  sale_price_pkr: '',
  category: 'men',
  sizes_available: [],
  images: [],
  is_active: true,
  stock_status: 'in_stock',
};

function toFormState(product: Product): ProductFormState {
  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    price_pkr: String(product.price_pkr),
    sale_price_pkr: product.sale_price_pkr === null ? '' : String(product.sale_price_pkr),
    category: product.category,
    sizes_available: [...product.sizes_available],
    images: [...product.images],
    is_active: product.is_active,
    stock_status: product.stock_status,
  };
}

/**
 * The slug is derived from the name and never asked for. A shopkeeper should
 * not have to think about URLs; an existing product keeps the slug it was
 * created with, so links already shared on TikTok never break.
 */
function toRequestBody(form: ProductFormState) {
  return {
    slug: form.slug || slugify(form.name),
    name: form.name.trim(),
    description: form.description.trim(),
    price_pkr: Number.parseInt(form.price_pkr, 10) || 0,
    sale_price_pkr: form.sale_price_pkr ? Number.parseInt(form.sale_price_pkr, 10) || null : null,
    category: form.category,
    sizes_available: form.sizes_available,
    images: form.images,
    is_active: form.is_active,
    stock_status: form.stock_status,
  };
}

export interface ProductForm {
  form: ProductFormState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  fields: Record<string, string>;
  update<K extends keyof ProductFormState>(key: K, value: ProductFormState[K]): void;
  save(): Promise<void>;
}

export function useProductForm(productId?: string): ProductForm {
  const [form, setForm] = useState<ProductFormState>(EMPTY);
  const [loading, setLoading] = useState(productId !== undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!productId) return;

    let cancelled = false;
    api
      .getProduct(productId)
      .then(({ product }) => {
        if (!cancelled) setForm(toFormState(product));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return {
    form,
    loading,
    saving,
    error,
    fields,

    update(key, value) {
      setForm((current) => ({ ...current, [key]: value }));
    },

    async save() {
      setSaving(true);
      setError(null);
      setFields({});

      try {
        const body = toRequestBody(form);
        if (productId) await api.updateProduct(productId, body);
        else await api.createProduct(body);
        navigate({ name: 'products' });
      } catch (cause) {
        if (cause instanceof ApiError) {
          setError(cause.message);
          setFields(cause.fields);
        } else {
          /* Almost always the shop's connection, so say so rather than "error". */
          setError('Could not save. Check your connection and try again.');
        }
      } finally {
        setSaving(false);
      }
    },
  };
}
