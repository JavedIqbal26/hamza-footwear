import imageCompression from 'browser-image-compression';
import { IMAGE_VARIANTS, IMAGE_VARIANT_WIDTHS, type ImageVariant } from '@hamza/shared';

/**
 * Client-side image resizing.
 *
 * Photos come off the owner's phone at 3–6MB. Those originals are resized to
 * three WebP variants **on the device** and only those are uploaded — the
 * original never touches the network.
 *
 * ---------------------------------------------------------------------------
 * QUALITY OVER SIZE. This is a shop; if the shoes look bad, nothing else here
 * matters.
 *
 * The binding constraint is R2 storage, not bandwidth — R2 charges nothing for
 * egress, so a larger file costs the same to serve as a small one. The free
 * tier is 10GB. At these settings a photo's three variants come to roughly
 * 600KB, so five photos on each of 400 products is about 1.2GB: comfortably
 * inside the free tier with room to multiply.
 *
 * So quality is set directly and file size is allowed to land where it lands.
 * `maxSizeMB` is a runaway guard, not a target — an earlier version used it as
 * a target, which forced the encoder to degrade quality to hit a number that
 * storage never actually required.
 * ---------------------------------------------------------------------------
 */

/**
 * WebP quality. At 0.86 WebP is visually indistinguishable from the original
 * for photographs while staying well under a third of the JPEG size.
 */
const WEBP_QUALITY = 0.86;

/** A guard against a pathological file, not a compression target. */
const RUNAWAY_GUARD_MB = 4;

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

async function compressTo(file: File, variant: ImageVariant): Promise<File> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: IMAGE_VARIANT_WIDTHS[variant],
    maxSizeMB: RUNAWAY_GUARD_MB,
    initialQuality: WEBP_QUALITY,
    fileType: 'image/webp',
    useWebWorker: true,
    /* Never scale a small photo up — that invents detail and looks worse. */
    maxIteration: 1,
  });

  /*
   * The library preserves the original filename and can return a Blob whose
   * type is right but whose name still says ".jpg". Rebuild it so the multipart
   * part is unambiguous on the server.
   */
  return new File([compressed], `${variant}.webp`, { type: 'image/webp' });
}

export async function compressToVariants(file: File): Promise<CompressedVariants> {
  if (!file.type.startsWith('image/')) throw new NotAnImageError(file.type);

  /*
   * Sequential, not parallel. Three simultaneous canvas resizes of a 6MB photo
   * will stall or crash a mid-range Android — which is exactly the device this
   * runs on.
   */
  const results: Partial<Record<ImageVariant, File>> = {};
  for (const variant of IMAGE_VARIANTS) {
    results[variant] = await compressTo(file, variant);
  }

  return results as CompressedVariants;
}
