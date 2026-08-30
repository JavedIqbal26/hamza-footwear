/** Product categories. Drives the storefront's top-level navigation. */
export const CATEGORIES = ['men', 'women', 'kids'] as const;

export type Category = (typeof CATEGORIES)[number];

/** Display labels. The UI is in English (see CLAUDE.md, Language). */
export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  men: 'Men',
  women: 'Women',
  kids: 'Kids',
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
