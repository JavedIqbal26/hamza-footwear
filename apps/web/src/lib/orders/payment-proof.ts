import { getImageBucket } from '../runtime.js';

/**
 * The wallet payment screenshot.
 *
 * A customer who pays by JazzCash or Easypaisa has no gateway to confirm them —
 * the shop verifies by eye before dispatch. The transaction id they type is
 * often mistyped or truncated; the screenshot is what actually settles it.
 *
 * Two deliberate constraints:
 *
 * - **Stored under `proofs/`, never `products/`.** The public `/img/[key]`
 *   route only serves keys matching a generated variant (`…-800.webp`), so a
 *   proof can never be fetched from the storefront origin however the key
 *   leaks. It is read back only through the admin API, behind Cloudflare
 *   Access. This is a customer's payment record, not a catalogue photo.
 * - **Stored as sent, not re-encoded.** The storefront must not carry an image
 *   library (`browser-image-compression` is admin-only and would blow the JS
 *   budget on the checkout page), and a proof does not need to look good — it
 *   needs to be legible once, by one person. The cap below is a runaway guard
 *   against a 12MP original, not a quality target.
 */

/** Comfortably above a phone screenshot, far below an unresized camera photo. */
export const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * The subset of `File` we use. Written structurally because the Workers types
 * redefine `File`, and `instanceof File` is not reliable across that boundary.
 */
interface UploadedFile {
  readonly type: string;
  readonly size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
}

function isUploadedFile(value: unknown): value is UploadedFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    'arrayBuffer' in value &&
    typeof (value as UploadedFile).arrayBuffer === 'function' &&
    typeof (value as UploadedFile).size === 'number'
  );
}

/**
 * Stores the screenshot and returns its key, or `null` when there is nothing
 * usable to store.
 *
 * Never throws. A proof is an aid to the shop, not a condition of the order:
 * an oversized or unreadable file must not cost the customer their purchase
 * when the typed transaction id is already on the order.
 */
export async function storePaymentProof(
  locals: App.Locals,
  orderId: string,
  value: FormDataEntryValue | null,
): Promise<string | null> {
  if (!isUploadedFile(value)) return null;
  if (value.size === 0 || value.size > MAX_PROOF_BYTES) return null;

  const extension = EXTENSIONS[value.type];
  if (!extension) return null;

  const key = `proofs/${orderId}.${extension}`;

  try {
    const body = await value.arrayBuffer();
    await getImageBucket(locals).put(key, body, {
      httpMetadata: { contentType: value.type },
    });
    return key;
  } catch (error) {
    console.error('Payment proof upload failed', error);
    return null;
  }
}
