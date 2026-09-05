/**
 * Byte plumbing for Web Push.
 *
 * Split from the cryptography next door because it is not cryptography — it is
 * base64url and buffer joining, which the rest of the module would rather not
 * be read through.
 *
 * Every array here is pinned to a real `ArrayBuffer`. WebCrypto's `BufferSource`
 * will not accept the `Uint8Array<ArrayBufferLike>` that `TextEncoder` and
 * `Uint8Array.from` produce, because a SharedArrayBuffer cannot back a crypto
 * operation. Allocating and copying costs nothing on inputs this small and
 * keeps every call site free of casts.
 */

export type Bytes = Uint8Array<ArrayBuffer>;

export function bytes(source: ArrayLike<number>): Bytes {
  const out = new Uint8Array(source.length) as Bytes;
  out.set(source);
  return out;
}

export function toBase64Url(input: Uint8Array): string {
  let binary = '';
  for (const byte of input) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(value: string): Bytes {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length) as Bytes;
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export function concat(...parts: readonly Uint8Array[]): Bytes {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total) as Bytes;
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export const utf8 = (value: string): Bytes => bytes(new TextEncoder().encode(value));
