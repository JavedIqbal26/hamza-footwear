import { IMAGE_VARIANTS, imageVariantKey, type ImageVariant } from '@hamza/shared';

/**
 * Product images in R2.
 *
 * Admin compresses each photo in the browser into three WebP variants and
 * uploads all three; the 3–6MB original from the owner's phone never leaves the
 * device. That is what keeps this inside the R2 free tier and off Cloudflare
 * Images at $5/mo.
 *
 * This layer knows R2 and nothing else — no HTTP shapes, no product records.
 */

/**
 * Ceiling for one uploaded variant.
 *
 * Must stay at or above admin's `RUNAWAY_GUARD_MB`, or the browser will happily
 * produce a high-quality variant that this endpoint then rejects.
 *
 * Set for quality, not thrift: R2 charges nothing for egress, so the only cost
 * of a larger file is storage against the 10GB free tier — roughly 600KB per
 * photo across all three variants at current settings. Still low enough to
 * reject an uncompressed 6MB phone original, which is the actual thing worth
 * catching here.
 */
export const MAX_VARIANT_BYTES = 4_500_000;

export class ImageTooLargeError extends Error {
  constructor(bytes: number) {
    super(
      `Image variant is ${bytes} bytes, over the ${MAX_VARIANT_BYTES} limit. ` +
        `It should have been compressed in the browser before upload.`,
    );
    this.name = 'ImageTooLargeError';
  }
}

export class UnsupportedImageTypeError extends Error {
  constructor(type: string) {
    super(`Expected image/webp, received ${type}`);
    this.name = 'UnsupportedImageTypeError';
  }
}

/** A fresh, unguessable base key. Variant keys derive from it. */
export function newImageBaseKey(): string {
  return `products/${crypto.randomUUID()}`;
}

export interface ImageStore {
  putVariant(baseKey: string, variant: ImageVariant, body: ArrayBuffer, contentType: string): Promise<void>;
  deleteAllVariants(baseKey: string): Promise<void>;
}

export function createImageStore(bucket: R2Bucket): ImageStore {
  return {
    async putVariant(
      baseKey: string,
      variant: ImageVariant,
      body: ArrayBuffer,
      contentType: string,
    ): Promise<void> {
      if (contentType !== 'image/webp') throw new UnsupportedImageTypeError(contentType);
      if (body.byteLength > MAX_VARIANT_BYTES) throw new ImageTooLargeError(body.byteLength);

      await bucket.put(imageVariantKey(baseKey, variant), body, {
        httpMetadata: {
          contentType: 'image/webp',
          /* Variant keys are never rewritten in place, so this is safe. */
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });
    },

    /** Removing a photo from a product removes all three of its variants. */
    async deleteAllVariants(baseKey: string): Promise<void> {
      await bucket.delete(IMAGE_VARIANTS.map((variant) => imageVariantKey(baseKey, variant)));
    },
  };
}
