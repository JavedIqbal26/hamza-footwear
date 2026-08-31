import type { AstroCookies } from 'astro';

/**
 * Carrying sign-in failures across a POST-redirect-GET.
 *
 * Same pattern and same reason as the checkout error cookie: a rejected submit
 * must never be left sitting on a POST the browser can resubmit, and the
 * customer should not have to retype their number.
 *
 * `httpOnly`, unlike the cart cookie — this carries the phone number mid-flow,
 * and no script has any reason to read it.
 */

const AUTH_ERROR_COOKIE = 'hf_auth_error';
const MAX_AGE_SECONDS = 120;

export interface AuthRejection {
  readonly message?: string;
  /** Echoed back so step one is not retyped. */
  readonly phone?: string;
}

const OPTIONS = {
  path: '/account',
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: MAX_AGE_SECONDS,
} as const;

export function setAuthError(cookies: AstroCookies, rejection: AuthRejection): void {
  cookies.set(AUTH_ERROR_COOKIE, JSON.stringify(rejection), OPTIONS);
}

/** Reads the rejection and clears it, so it is shown exactly once. */
export function takeAuthError(cookies: AstroCookies): AuthRejection | null {
  const raw = cookies.get(AUTH_ERROR_COOKIE)?.value;
  cookies.delete(AUTH_ERROR_COOKIE, { path: OPTIONS.path });

  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as AuthRejection) : null;
  } catch {
    return null;
  }
}

/**
 * The number being verified, held between step one and step two.
 *
 * Kept server-side in a cookie rather than in the URL: a phone number in a
 * query string ends up in logs, referrers and shared links.
 */
const PENDING_COOKIE = 'hf_auth_phone';

export function setPendingPhone(cookies: AstroCookies, phone: string): void {
  cookies.set(PENDING_COOKIE, phone, { ...OPTIONS, maxAge: 60 * 15 });
}

export function readPendingPhone(cookies: AstroCookies): string | null {
  return cookies.get(PENDING_COOKIE)?.value ?? null;
}

export function clearPendingPhone(cookies: AstroCookies): void {
  cookies.delete(PENDING_COOKIE, { path: OPTIONS.path });
}
