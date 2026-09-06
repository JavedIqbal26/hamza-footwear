import { IMAGE_VARIANTS, IMAGE_VARIANT_WIDTHS, type ImageVariant } from '@hamza/shared';

/**
 * Client-side image resizing.
 *
 * Photos come off the owner's phone at 3–6MB. Those originals are resized to
 * three WebP variants **on the device** and only those are uploaded — the
 * original never touches the network.
 *
 * ---------------------------------------------------------------------------
 * EVERY VARIANT IS SQUARE, WHATEVER WAS UPLOADED.
 *
 * A shop owner photographing stock on a phone produces 4:3, 3:4 and everything
 * between. Storing those shapes as-is left the catalogue looking ragged: cards
 * are square, so a landscape photo either got cropped (losing 18% of the shoe
 * off the sides, measured on a real upload) or letterboxed with visible bars.
 *
 * So each variant is drawn centred onto a square canvas on the same neutral
 * ground the cards use. Nothing is cropped, every stored image is exactly
 * 400x400 / 800x800 / 1600x1600, and a card looks identical no matter what the
 * phone produced. That is a promise the storefront cannot make on its own — CSS
 * can only crop or letterbox what it is given.
 * ---------------------------------------------------------------------------
 *
 * QUALITY OVER SIZE. This is a shop; if the shoes look bad, nothing else here
 * matters.
 *
 * The binding constraint is R2 storage, not bandwidth — R2 charges nothing for
 * egress, so a larger file costs the same to serve as a small one. The free
 * tier is 10GB. At these settings a photo's three variants come to roughly
 * 600KB, so five photos on each of 400 products is about 1.2GB.
 *
 * `browser-image-compression` is gone with this change: it resizes but cannot
 * pad, and once the canvas work is here anyway the dependency earns nothing.
 * One fewer package, per CLAUDE.md rule 5.
 */

/**
 * WebP quality. At 0.86 WebP is visually indistinguishable from the original
 * for photographs while staying well under a third of the JPEG size.
 */
const WEBP_QUALITY = 0.86;

/** Matches `--color-photo`, so the padding is invisible against the card. */
const PHOTO_BACKGROUND = '#f1efec';

export interface CompressedVariants {
  readonly thumb: File;
  readonly product: File;
  readonly full: File;
}

export class NotAnImageError extends Error {
  constructor(type: string) {
    super(`That file is a ${type || 'unknown type'}, not an image.`);
    this.name = 'NotAnImageError';
  }
}

export class ImageDecodeError extends Error {
  constructor() {
    super('That image could not be read. Try a different photo.');
    this.name = 'ImageDecodeError';
  }
}

/**
 * Decodes the file, honouring EXIF rotation.
 *
 * `imageOrientation: 'from-image'` is the part that matters: phone cameras
 * record portrait shots as landscape plus a rotation flag, and a canvas that
 * ignores it renders every portrait photo on its side.
 */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new ImageDecodeError();
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageDecodeError())),
      'image/webp',
      WEBP_QUALITY,
    );
  });
}

/**
 * Draws the bitmap centred on a square canvas of `size`, contained.
 *
 * Never scales up: a photo smaller than the target is drawn at its own size on
 * the square ground rather than stretched, because upscaling invents detail and
 * looks worse than the honest smaller image.
 */
async function squareVariant(
  bitmap: ImageBitmap,
  variant: ImageVariant,
): Promise<File> {
  const size = IMAGE_VARIANT_WIDTHS[variant];

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  if (!context) throw new ImageDecodeError();

  context.fillStyle = PHOTO_BACKGROUND;
  context.fillRect(0, 0, size, size);

  const scale = Math.min(size / bitmap.width, size / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    bitmap,
    Math.round((size - width) / 2),
    Math.round((size - height) / 2),
    width,
    height,
  );

  return new File([await toBlob(canvas)], `${variant}.webp`, { type: 'image/webp' });
}

export async function compressToVariants(file: File): Promise<CompressedVariants> {
  if (!file.type.startsWith('image/')) throw new NotAnImageError(file.type);

  const bitmap = await decode(file);

  try {
    /*
     * Sequential, not parallel. Three simultaneous canvas draws of a 6MB photo
     * will stall or crash a mid-range Android — exactly the device this runs on.
     */
    const results: Partial<Record<ImageVariant, File>> = {};
    for (const variant of IMAGE_VARIANTS) {
      results[variant] = await squareVariant(bitmap, variant);
    }
    return results as CompressedVariants;
  } finally {
    /* Free the decoded pixels rather than waiting for GC on a 2GB phone. */
    bitmap.close();
  }
}
