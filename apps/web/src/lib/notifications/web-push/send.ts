import type { PushSubscription } from '@hamza/db';

import { encryptPayload, signVapidJwt, toBase64Url, fromBase64Url } from './crypto.js';

/**
 * Delivering one push message.
 *
 * The push service is a relay: it receives ciphertext addressed to a
 * subscription and hands it to the browser. It never sees the contents, which
 * matters here because these notifications carry a customer's name, phone and
 * address.
 */

export interface VapidConfig {
  readonly publicKey: string;
  readonly privateKey: string;
  /** Contact for the push service if this sender misbehaves. RFC 8292 wants one. */
  readonly subject: string;
}

export function readVapidConfig(env: Record<string, unknown>): VapidConfig | null {
  const publicKey = typeof env.VAPID_PUBLIC_KEY === 'string' ? env.VAPID_PUBLIC_KEY : '';
  const privateKey = typeof env.VAPID_PRIVATE_KEY === 'string' ? env.VAPID_PRIVATE_KEY : '';
  const subject = typeof env.VAPID_SUBJECT === 'string' ? env.VAPID_SUBJECT : '';

  if (!publicKey || !privateKey) return null;

  return {
    publicKey,
    privateKey,
    subject: subject || 'mailto:orders@hamzafootwear.com',
  };
}

/** What the caller should do with a subscription after an attempt. */
export type PushOutcome = 'sent' | 'expired' | 'failed';

/**
 * Sends one notification.
 *
 * Returns rather than throws, because the caller's job is to decide what to do
 * with the subscription and there are only three answers. A 404 or 410 means
 * the browser threw this subscription away — the row should go too, and
 * retrying it forever is how a push queue silently fills with dead endpoints.
 */
export async function sendPush(
  subscription: PushSubscription,
  payload: string,
  vapid: VapidConfig,
): Promise<PushOutcome> {
  try {
    const audience = new URL(subscription.endpoint).origin;
    const jwt = await signVapidJwt(audience, vapid.subject, vapid.privateKey);
    const { body } = await encryptPayload(payload, subscription.p256dh, subscription.auth);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        /* Four hours: an order alert nobody has seen by then is stale anyway. */
        TTL: '14400',
        Urgency: 'high',
      },
      body,
    });

    if (response.status === 404 || response.status === 410) return 'expired';
    if (!response.ok) {
      console.error(`Push rejected (${response.status}) by ${audience}`);
      return 'failed';
    }

    return 'sent';
  } catch (error) {
    console.error('Push send failed', error);
    return 'failed';
  }
}

/**
 * Generates a VAPID keypair, for the one-off setup documented in the README.
 *
 * Kept beside the sender so the export format cannot drift from the import
 * format — `signVapidJwt` reads pkcs8, and this is what writes it.
 */
export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);

  return {
    publicKey: toBase64Url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
    privateKey: toBase64Url(
      new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey)),
    ),
  };
}

/** Round-trips a stored key, so a malformed secret fails loudly at startup. */
export function isValidVapidPublicKey(value: string): boolean {
  try {
    return fromBase64Url(value).length === 65;
  } catch {
    return false;
  }
}
