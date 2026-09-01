import {
  CATEGORIES,
  CATEGORY_LABELS,
  STOCK_STATUSES,
  STOCK_STATUS_LABELS,
  type Category,
  type StockStatus,
} from '@hamza/shared';

import { navigate } from '../../lib/router.js';
import { Button, ErrorBanner, Field, inputClass, Spinner } from '../../components/ui/controls.jsx';
import { ImageUploader } from './components/ImageUploader.jsx';
import { SizePicker } from './components/SizePicker.jsx';
import { useProductForm } from './hooks/useProductForm.js';

/**
 * Add or edit a product.
 *
 * Ordered by what the owner actually knows first: photos, name, price. The slug
 * is derived from the name and never shown as a field — it is a URL detail, not
 * something a shopkeeper should have to think about.
 *
 * Rendering only. Loading, editing and saving live in `useProductForm`.
 */

interface Props {
  productId?: string;
}

export function ProductFormPage({ productId }: Props) {
  const { form, loading, saving, error, fields, update, save } = useProductForm(productId);

  if (loading) return <Spinner label="Loading product…" />;

  return (
    <form
      className="space-y-6 pb-24 sm:pb-6"
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

      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="h-5 w-5 accent-brand-600"
          checked={form.is_active}
          onChange={(event) => update('is_active', event.target.checked)}
        />
        <span className="text-sm text-ink">Show on the website</span>
      </label>

      {/*
        Fixed to the bottom on a phone so Save stays in thumb reach on a long
        form; inline from sm: up, where the whole form is visible at once and a
        floating bar would just cover content.
      */}
      <div className="fixed inset-x-0 bottom-0 z-10 flex gap-2 border-t border-neutral-200 bg-white p-3 sm:static sm:justify-end sm:border-0 sm:p-0">
        <div className="flex-1 sm:max-w-[160px]">
          <Button variant="secondary" onClick={() => navigate({ name: 'products' })}>
            Cancel
          </Button>
        </div>
        <div className="flex-1 sm:max-w-[220px]">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save product'}
          </Button>
        </div>
      </div>
    </form>
  );
}
