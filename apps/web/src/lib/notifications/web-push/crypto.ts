/**
 * The cryptography Web Push requires, on WebCrypto alone.
 *
 * Sending a push notification with a payload means two things:
 *
 * 1. **VAPID** (RFC 8292) — an ES256-signed JWT proving the sender owns the
 *    application key the browser subscribed to.
 * 2. **Message encryption** (RFC 8291) — the payload is encrypted to the
 *    subscription's own keys with `aes128gcm`, so the push service relays
 *    ciphertext it cannot read.
 *
 * NO LIBRARY. The usual `web-push` package is Node-only — it reaches for
 * `crypto` and Buffer — and will not run in a Worker. Every primitive this
 * needs (P-256 ECDH, ECDSA, HKDF, AES-GCM) is in the Workers WebCrypto already,
 * so this composes standard pieces rather than adding a dependency that cannot
 * run where it is needed. Nothing here invents cryptography; the failure mode
 * of getting it wrong is a notification the browser refuses to decrypt, which
 * the tests catch.
 */

import { bytes, concat, fromBase64Url, toBase64Url, utf8, type Bytes } from './bytes.js';

export { fromBase64Url, toBase64Url };

/* ---- VAPID -------------------------------------------------------------- */

/**
 * Signs the JWT that identifies this sender to the push service.
 *
 * The audience is the push endpoint's origin, not its full URL — a JWT scoped
 * to the whole path would leak which subscription is being addressed.
 */
export async function signVapidJwt(
  audience: string,
  subject: string,
  privateKeyBase64Url: string,
  expirySeconds = 12 * 60 * 60,
): Promise<string> {
  const header = toBase64Url(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = toBase64Url(
    utf8(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + expirySeconds,
        sub: subject,
      }),
    ),
  );

  const key = await crypto.subtle.importKey(
    'pkcs8',
    fromBase64Url(privateKeyBase64Url),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    utf8(`${header}.${claims}`),
  );

  return `${header}.${claims}.${toBase64Url(new Uint8Array(signature))}`;
}

/* ---- Payload encryption (RFC 8291) -------------------------------------- */

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits) as Bytes;
}

export interface EncryptedPayload {
  readonly body: Bytes;
}

/**
 * Encrypts a payload to one subscription, in the `aes128gcm` content encoding.
 *
 * The shape of it: generate a throwaway keypair, ECDH against the browser's
 * public key to get a shared secret, run that through two HKDF stages — one
 * keyed by the subscription's auth secret to produce the pseudo-random key, one
 * to derive the content key and nonce — then AES-GCM the plaintext and prepend
 * the header the browser needs to reverse it.
 */
export async function encryptPayload(
  plaintext: string,
  p256dhBase64Url: string,
  authBase64Url: string,
): Promise<EncryptedPayload> {
  const subscriptionPublic = fromBase64Url(p256dhBase64Url);
  const authSecret = fromBase64Url(authBase64Url);

  /* One ephemeral keypair per message: reusing one would link messages. */
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits'],
  );
  const ephemeralPublic = new Uint8Array(
    await crypto.subtle.exportKey('raw', ephemeral.publicKey),
  ) as Bytes;

  const shared = new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'ECDH',
        public: await crypto.subtle.importKey(
          'raw',
          subscriptionPublic,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          [],
        ),
      },
      ephemeral.privateKey,
      256,
    ),
  ) as Bytes;

  /*
   * The key-combining step. `info` binds the derived secret to both public
   * keys, which is what stops a shared secret from one subscription being
   * replayed against another.
   */
  const prk = await hkdf(
    authSecret,
    shared,
    concat(utf8('WebPush: info\0'), subscriptionPublic, ephemeralPublic),
    32,
  );

  const salt = crypto.getRandomValues(new Uint8Array(16)) as Bytes;
  const contentKey = await hkdf(salt, prk, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, prk, utf8('Content-Encoding: nonce\0'), 12);

  /* The 0x02 delimiter marks the final record; there is only ever one here. */
  const padded = concat(utf8(plaintext), bytes([0x02]));

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      await crypto.subtle.importKey('raw', contentKey, 'AES-GCM', false, ['encrypt']),
      padded,
    ),
  ) as Bytes;

  /* Header: salt | record size (4 bytes, big-endian) | key length | key. */
  const recordSize = new Uint8Array(4) as Bytes;
  new DataView(recordSize.buffer).setUint32(0, 4096, false);

  return {
    body: concat(
      salt,
      recordSize,
      bytes([ephemeralPublic.length]),
      ephemeralPublic,
      ciphertext,
    ),
  };
}
