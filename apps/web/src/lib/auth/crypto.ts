import { OTP_LENGTH } from '@hamza/shared/schemas';

/**
 * The primitives sign-in depends on.
 *
 * Everything here uses WebCrypto, which the Workers runtime provides natively —
 * no dependency, and no hand-rolled cryptography.
 */

/**
 * A one-time code.
 *
 * Digits only: it gets read off a lock screen and typed with a thumb, and it is
 * dictated over the phone when SMS fails. Drawn from `getRandomValues`, never
 * `Math.random`, and rejection-sampled so every code is equally likely — modulo
 * bias on a five-digit secret is a real reduction in strength.
 */
export function generateOtp(): string {
  const digits: string[] = [];
  const buffer = new Uint8Array(OTP_LENGTH * 2);

  while (digits.length < OTP_LENGTH) {
    crypto.getRandomValues(buffer);
    for (const byte of buffer) {
      if (digits.length === OTP_LENGTH) break;
      /* 250 is the largest multiple of 10 under 256; above it, resample. */
      if (byte < 250) digits.push(String(byte % 10));
    }
  }

  return digits.join('');
}

/** A session token: 256 bits from the CSPRNG, URL-safe. */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

/**
 * SHA-256, hex encoded.
 *
 * Used for both OTP codes and session tokens so the database never holds a
 * value that could be replayed. A plain hash is right here — these are
 * high-entropy secrets with short lifetimes, not user-chosen passwords, so
 * there is nothing for a slow KDF to defend against.
 */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
