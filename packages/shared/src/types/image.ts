/**
 * Image variants.
 *
 * Admin compresses each photo client-side into three WebP sizes and uploads all
 * three to R2 (the 3–6MB phone original is never uploaded). The database stores
 * one *base* key per photo; the per-variant key is derived, so the column stays
 * a plain array of keys and there is exactly one place that knows the naming.
 */

export const IMAGE_VARIANTS = ['thumb', 'product', 'full'] as const;

export type ImageVariant = (typeof IMAGE_VARIANTS)[number];

export const IMAGE_VARIANT_WIDTHS: Readonly<Record<ImageVariant, number>> = {
  thumb: 400,
  product: 800,
  full: 1600,
};

/** `products/abc123` + `product` -> `products/abc123-800.webp` */
export function imageVariantKey(baseKey: string, variant: ImageVariant): string {
  return `${baseKey}-${IMAGE_VARIANT_WIDTHS[variant]}.webp`;
}

/**
 * Same-origin URL for a variant.
 *
 * Images are served from our own `/img/` route rather than an R2 public bucket
 * URL — no third-party origins (CLAUDE.md), and it keeps the cache under our
 * control.
 */
export function imageUrl(baseKey: string, variant: ImageVariant): string {
  return `/img/${imageVariantKey(baseKey, variant)}`;
}

/** `srcset` covering every variant, for responsive `<img>` tags. */
export function imageSrcSet(baseKey: string): string {
  return IMAGE_VARIANTS.map(
    (variant) => `${imageUrl(baseKey, variant)} ${IMAGE_VARIANT_WIDTHS[variant]}w`,
  ).join(', ');
}
