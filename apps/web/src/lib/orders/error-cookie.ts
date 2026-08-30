import type { AstroCookies } from 'astro';

/**
 * Carrying validation errors across a POST-redirect-GET.
 *
 * The checkout form posts to an endpoint and is redirected back on failure, so
 * that a rejected submit is never left sitting on a POST the browser can
 * resubmit. That redirect has to carry the errors and what the customer already
 * typed — retyping a full address on a phone is how a shop loses a sale.
 *
 * A short-lived cookie is the way to do that without JavaScript. It is read
 * once and deleted immediately, so a refresh does not keep showing a stale
 * error.
 */

const ERROR_COOKIE = 'hf_checkout_error';

/** Long enough to survive the redirect, short enough to never linger. */
const MAX_AGE_SECONDS = 60;

/** Cookies are capped around 4KB; stay well inside it. */
const MAX_COOKIE_BYTES = 3500;

export interface CheckoutRejection {
  readonly message?: string;
  readonly errors?: Record<string, string>;
  readonly values?: Record<string, string>;
}

export function setCheckoutError(
  cookies: AstroCookies,
  rejection: CheckoutRejection,
): void {
  const payload = JSON.stringify(rejection);

  /*
   * If the payload is somehow oversized, drop the echoed values rather than the
   * error message — an unexplained bounce back to checkout is the worst outcome.
   */
  const body =
    payload.length <= MAX_COOKIE_BYTES
      ? payload
      : JSON.stringify({ message: rejection.message, errors: rejection.errors });

  cookies.set(ERROR_COOKIE, body, {
    path: '/checkout',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Reads the rejection and clears it, so it is shown exactly once. */
export function takeCheckoutError(cookies: AstroCookies): CheckoutRejection | null {
  const raw = cookies.get(ERROR_COOKIE)?.value;
  cookies.delete(ERROR_COOKIE, { path: '/checkout' });

  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as CheckoutRejection)
      : null;
  } catch {
    return null;
  }
}
