import { Hono } from 'hono';
import { IMAGE_VARIANTS, type ImageVariant } from '@hamza/shared';

import {
  createImageStore,
  ImageTooLargeError,
  newImageBaseKey,
  UnsupportedImageTypeError,
} from '../../integrations/image-store.js';
import type { AppBindings } from '../../lib/env.js';

/**
 * Product image upload.
 *
 * The browser sends all three WebP variants of one photo in a single multipart
 * request, and gets back the base key to store on the product. One request per
 * photo rather than three keeps the owner's phone from having to coordinate
 * partial failures on a patchy connection — either the photo lands or it does
 * not.
 */
export const uploadRoutes = new Hono<AppBindings>();

uploadRoutes.post('/uploads/image', async (c) => {
  const form = await c.req.formData();
  const baseKey = newImageBaseKey();

  /**
   * Duck-typed rather than `instanceof File`: the Workers runtime types do not
   * expose `File` as a constructor value, and what matters here is only that
   * the entry can produce bytes and declares a type.
   */
  interface UploadedFile {
    readonly type: string;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  function asUploadedFile(entry: unknown): UploadedFile | null {
    if (typeof entry !== 'object' || entry === null) return null;
    const candidate = entry as Partial<UploadedFile>;
    return typeof candidate.arrayBuffer === 'function' && typeof candidate.type === 'string'
      ? (candidate as UploadedFile)
      : null;
  }

  const files: { variant: ImageVariant; file: UploadedFile }[] = [];

  for (const variant of IMAGE_VARIANTS) {
    const file = asUploadedFile(form.get(variant));
    if (!file) {
      return c.json(
        { error: `Missing the "${variant}" variant. All three sizes must be uploaded together.` },
        422,
      );
    }
    files.push({ variant, file });
  }

  const store = createImageStore(c.env.IMAGES);

  try {
    /*
     * Uploaded in parallel — three small PUTs to R2 from the same colo, and the
     * owner is waiting on a phone.
     */
    await Promise.all(
      files.map(async ({ variant, file }) =>
        store.putVariant(baseKey, variant, await file.arrayBuffer(), file.type),
      ),
    );
  } catch (error) {
    if (error instanceof ImageTooLargeError || error instanceof UnsupportedImageTypeError) {
      /*
       * Best-effort cleanup: a half-written photo would otherwise sit in R2
       * counting against the free tier with nothing referencing it.
       */
      await store.deleteAllVariants(baseKey).catch(() => undefined);
      return c.json({ error: error.message }, 422);
    }
    throw error;
  }

  return c.json({ baseKey }, 201);
});
