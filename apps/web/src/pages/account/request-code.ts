import type { APIRoute } from 'astro';
import { requestCodeSchema } from '@hamza/shared/schemas';

import { requestCode } from '../../lib/auth/sign-in.js';
import { setAuthError, setPendingPhone } from '../../lib/auth/error-cookie.js';

export const prerender = false;

/**
 * Step one: send a one-time code.
 *
 * The response is deliberately identical whether or not the number has an
 * account — the shop has no reason to let anyone enumerate its customer list.
 */
export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const form = await request.formData();
  const parsed = requestCodeSchema.safeParse(Object.fromEntries(form));

  if (!parsed.success) {
    setAuthError(cookies, {
      message: parsed.error.issues[0]?.message ?? 'Please check the number.',
      phone: String(form.get('phone') ?? ''),
    });
    return redirect('/account/sign-in', 303);
  }

  const { phone } = parsed.data;
  const outcome = await requestCode(locals, phone);

  if (outcome.status === 'rate_limited') {
    setAuthError(cookies, {
      message: 'Too many codes requested. Please wait an hour and try again.',
      phone,
    });
    return redirect('/account/sign-in', 303);
  }

  if (outcome.status === 'send_failed') {
    setAuthError(cookies, { message: outcome.message, phone });
    return redirect('/account/sign-in', 303);
  }

  setPendingPhone(cookies, phone);
  return redirect('/account/verify', 303);
};
