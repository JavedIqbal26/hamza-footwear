/**
 * Verifying the Cloudflare Access token.
 *
 * Access forwards `Cf-Access-Jwt-Assertion` — a JWT it signed — and does *not*
 * send `Cf-Access-Authenticated-User-Email`, which an earlier version of this
 * middleware trusted. Measured on the deployed site: of the six `cf-*` headers
 * that arrive, the JWT is there and the email header is not.
 *
 * So identity comes from the token, verified properly rather than read on faith:
 *
 * 1. **Signature** against the team's published keys. This is what makes the
 *    claims worth anything — an unverified JWT is just a string the client sent.
 * 2. **Audience**, so a token minted for a different Access application in the
 *    same team cannot be replayed here.
 * 3. **Expiry**, with no grace period.
 *
 * Every failure returns null. The caller refuses the request; there is no path
 * through this file that admits a token it could not verify.
 */

export interface AccessIdentity {
  readonly email: string;
}

interface JsonWebKey_ {
  kid: string;
  kty: string;
  alg: string;
  n: string;
  e: string;
}

interface Claims {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
}

/*
 * Cached for the life of the isolate.
 *
 * Cloudflare rotates these keys, so the cache is time-boxed rather than
 * permanent — but fetching them on every admin request would put a network
 * round trip in front of every page of the order list.
 */
const JWKS_TTL_MS = 60 * 60 * 1000;
let jwksCache: { keys: JsonWebKey_[]; fetchedAt: number } | null = null;

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const out = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function decodeJson<T>(segment: string): T | null {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(segment))) as T;
  } catch {
    return null;
  }
}

async function fetchKeys(teamDomain: string): Promise<JsonWebKey_[]> {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (fresh && jwksCache) return jwksCache.keys;

  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`Access certs fetch failed: ${response.status}`);

  const body = (await response.json()) as { keys?: JsonWebKey_[] };
  const keys = body.keys ?? [];
  jwksCache = { keys, fetchedAt: Date.now() };
  return keys;
}

/**
 * Returns the identity in a valid token, or null.
 *
 * `audience` is the application's AUD tag. It is required: without it a token
 * issued for any other application in the same team would be accepted here, and
 * "we only have one application" is a fact about today, not a security control.
 */
export async function verifyAccessJwt(
  token: string,
  teamDomain: string,
  audience: string,
): Promise<AccessIdentity | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [rawHeader, rawClaims, rawSignature] = parts as [string, string, string];

  const header = decodeJson<{ kid?: string; alg?: string }>(rawHeader);
  const claims = decodeJson<Claims>(rawClaims);
  if (!header?.kid || header.alg !== 'RS256' || !claims) return null;

  let keys: JsonWebKey_[];
  try {
    keys = await fetchKeys(teamDomain);
  } catch (error) {
    console.error('Could not fetch Access signing keys', error);
    return null;
  }

  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );

  const signed = new TextEncoder().encode(`${rawHeader}.${rawClaims}`);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    base64UrlToBytes(rawSignature),
    signed,
  );
  if (!valid) return null;

  /* Signature is good; now the claims have to be about us, and current. */
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(audience)) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= now) return null;

  const email = claims.email?.trim().toLowerCase();
  if (!email) return null;

  return { email };
}
