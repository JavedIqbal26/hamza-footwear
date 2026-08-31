import type { AstroCookies } from 'astro';
import { createAuthRepository, createCustomerRepository, SESSION_TTL_DAYS } from '@hamza/db';
import type { Customer } from '@hamza/shared';

import { generateSessionToken, sha256Hex } from './crypto.js';
import { getDatabase } from '../runtime.js';

/**
 * The signed-in session.
 *
 * The cookie holds a random 256-bit token; the database holds only its SHA-256.
 * Unlike the cart cookie — which is deliberately readable so the badge can be
 * rendered on the client — this one is `httpOnly`: it is a credential, and no
 * script has any reason to see it.
 */

export const SESSION_COOKIE = 'hf_session';

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: true,
  /* `lax` still sends the cookie on top-level navigations back from the SMS app. */
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * SESSION_TTL_DAYS,
} as const;

export async function startSession(
  locals: App.Locals,
  cookies: AstroCookies,
  customerId: string,
): Promise<void> {
  const token = generateSessionToken();
  await createAuthRepository(getDatabase(locals)).createSession(
    await sha256Hex(token),
    customerId,
  );
  cookies.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
}

export async function endSession(
  locals: App.Locals,
  cookies: AstroCookies,
): Promise<void> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    await createAuthRepository(getDatabase(locals)).deleteSession(await sha256Hex(token));
  }
  cookies.delete(SESSION_COOKIE, { path: COOKIE_OPTIONS.path });
}

/**
 * The signed-in customer, or null.
 *
 * Every page that shows account state calls this. It is a single indexed
 * lookup, and it returns null rather than throwing for any failure — an
 * expired session must degrade to "signed out", never to an error page.
 */
export async function currentCustomer(
  locals: App.Locals,
  cookies: AstroCookies,
): Promise<Customer | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDatabase(locals);
  const customerId = await createAuthRepository(db).findSessionCustomer(
    await sha256Hex(token),
  );
  if (!customerId) return null;

  return createCustomerRepository(db).findById(customerId);
}
