import { CATEGORIES, CATEGORY_LABELS, type Category, type Product } from '@hamza/shared';

/**
 * Finding one product in a catalogue of several hundred.
 *
 * The list endpoint returns everything, and the filtering happens here in the
 * browser rather than as a query per keystroke: the whole catalogue is a few
 * hundred rows of JSON, admin runs on the shop's own connection, and a
 * round-trip per letter typed on a phone in a shop is the slower design.
 *
 * "Hidden only" earns its place because it answers the question the owner
 * actually asks — "where did that product go?" — which is otherwise a scroll
 * through everything looking for grey rows.
 */

export interface ProductFilter {
  readonly text: string;
  readonly category: Category | 'all';
  readonly hiddenOnly: boolean;
}

export const NO_FILTER: ProductFilter = { text: '', category: 'all', hiddenOnly: false };

export function applyProductFilter(
  products: readonly Product[],
  filter: ProductFilter,
): Product[] {
  const needle = filter.text.trim().toLowerCase();

  return products.filter((product) => {
    if (filter.hiddenOnly && product.is_active) return false;
    if (filter.category !== 'all' && product.category !== filter.category) return false;
    if (!needle) return true;
    /* Slug too: the owner often has a TikTok link rather than the exact name. */
    return (
      product.name.toLowerCase().includes(needle) || product.slug.toLowerCase().includes(needle)
    );
  });
}

interface Props {
  filter: ProductFilter;
  onChange: (filter: ProductFilter) => void;
  shown: number;
  total: number;
}

export function ProductFilterBar({ filter, onChange, shown, total }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={filter.text}
          onChange={(event) => onChange({ ...filter, text: event.target.value })}
          placeholder="Search by name…"
          aria-label="Search products"
          className="min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-base"
        />
        <select
          value={filter.category}
          onChange={(event) =>
            onChange({ ...filter, category: event.target.value as Category | 'all' })
          }
          aria-label="Filter by category"
          className="min-h-11 rounded-lg border border-neutral-300 px-3 text-base sm:w-44"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {CATEGORY_LABELS[category]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={filter.hiddenOnly}
            onChange={(event) => onChange({ ...filter, hiddenOnly: event.target.checked })}
            className="h-5 w-5 accent-brand-600"
          />
          Hidden only
        </label>
        <p className="text-sm text-ink-muted">
          {shown === total ? `${total} products` : `${shown} of ${total}`}
        </p>
      </div>
    </div>
  );
}
