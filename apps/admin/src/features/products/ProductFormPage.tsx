import { useEffect, useState } from 'react';
import {
  CATEGORIES,
  CATEGORY_LABELS,
  slugify,
  STOCK_STATUSES,
  STOCK_STATUS_LABELS,
  type Category,
  type StockStatus,
  type UkSize,
} from '@hamza/shared';

import { api, ApiError } from '../../lib/api-client.js';
import { navigate } from '../../lib/router.js';
import { Button, ErrorBanner, Field, inputClass, Spinner } from '../../components/ui/controls.jsx';
import { ImageUploader } from './components/ImageUploader.jsx';
import { SizePicker } from './components/SizePicker.jsx';

/**
 * Add or edit a product.
 *
 * Ordered by what the owner actually knows first: photos, name, price. The slug
 * is derived from the name and never shown as a required field — it is a URL
 * detail, not something a shopkeeper should have to think about.
 */

interface Props {
  productId?: string;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  price_pkr: string;
  sale_price_pkr: string;
  category: Category;
  sizes_available: UkSize[];
  images: string[];
  is_active: boolean;
  stock_status: StockStatus;
}

const EMPTY: FormState = {
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

export function ProductFormPage({ productId }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
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
        if (cancelled) return;
        setForm({
          name: product.name,
          slug: product.slug,
          description: product.description,
          price_pkr: String(product.price_pkr),
          sale_price_pkr:
            product.sale_price_pkr === null ? '' : String(product.sale_price_pkr),
          category: product.category,
          sizes_available: [...product.sizes_available],
          images: [...product.images],
          is_active: product.is_active,
          stock_status: product.stock_status,
        });
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(): Promise<void> {
    setSaving(true);
    setError(null);
    setFields({});

    const body = {
      slug: form.slug || slugify(form.name),
      name: form.name.trim(),
      description: form.description.trim(),
      price_pkr: Number.parseInt(form.price_pkr, 10) || 0,
      sale_price_pkr: form.sale_price_pkr
        ? Number.parseInt(form.sale_price_pkr, 10) || null
        : null,
      category: form.category,
      sizes_available: form.sizes_available,
      images: form.images,
      is_active: form.is_active,
      stock_status: form.stock_status,
    };

    try {
      if (productId) {
        await api.updateProduct(productId, body);
      } else {
        await api.createProduct(body);
      }
      navigate({ name: 'products' });
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setFields(cause.fields);
      } else {
        setError('Could not save. Check your connection and try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Loading product…" />;

  return (
    <form
      className="space-y-6 pb-24"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <ErrorBanner message={error} />

      <ImageUploader images={form.images} onChange={(images) => update('images', images)} />

      <Field label="Product name" htmlFor="name" error={fields.name}>
        <input
          id="name"
          className={inputClass}
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (Rs)" htmlFor="price" error={fields.price_pkr}>
          <input
            id="price"
            className={inputClass}
            inputMode="numeric"
            value={form.price_pkr}
            onChange={(event) => update('price_pkr', event.target.value)}
            required
          />
        </Field>

        <Field
          label="Sale price"
          htmlFor="sale_price"
          error={fields.sale_price_pkr}
          hint="Leave empty if not on sale"
        >
          <input
            id="sale_price"
            className={inputClass}
            inputMode="numeric"
            value={form.sale_price_pkr}
            onChange={(event) => update('sale_price_pkr', event.target.value)}
          />
        </Field>
      </div>

      <Field label="Category" htmlFor="category" error={fields.category}>
        <select
          id="category"
          className={inputClass}
          value={form.category}
          onChange={(event) => update('category', event.target.value as Category)}
        >
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </Field>

      <SizePicker
        selected={form.sizes_available}
        onChange={(sizes) => update('sizes_available', sizes)}
      />
      {fields.sizes_available && (
        <p role="alert" className="text-sm text-red-700">
          {fields.sizes_available}
        </p>
      )}

      <Field label="Stock" htmlFor="stock">
        <select
          id="stock"
          className={inputClass}
          value={form.stock_status}
          onChange={(event) => update('stock_status', event.target.value as StockStatus)}
        >
          {STOCK_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STOCK_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description" htmlFor="description" error={fields.description}>
        <textarea
          id="description"
          rows={4}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
          value={form.description}
          onChange={(event) => update('description', event.target.value)}
        />
      </Field>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand-600"
          checked={form.is_active}
          onChange={(event) => update('is_active', event.target.checked)}
        />
        <span className="text-sm text-ink">Show on the website</span>
      </label>

      {/* Fixed to the bottom so Save is always in thumb reach on a long form. */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-neutral-200 bg-white p-3">
        <Button variant="secondary" onClick={() => navigate({ name: 'products' })}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save product'}
        </Button>
      </div>
    </form>
  );
}
