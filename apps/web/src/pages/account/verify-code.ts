import type { APIRoute } from 'astro';
import { otpCodeSchema } from '@hamza/shared/schemas';

import { verifyAndSignIn } from '../../lib/auth/sign-in.js';
import { startSession } from '../../lib/auth/session.js';
import {
  clearPendingPhone,
  readPendingPhone,
  setAuthError,
} from '../../lib/auth/error-cookie.js';

export const prerender = false;

/** Step two: check the code and start a session. */
export const POST: APIRoute = async ({ request, cookies, locals, redirect }) => {
  const phone = readPendingPhone(cookies);
  if (!phone) return redirect('/account/sign-in', 303);

  const form = await request.formData();
  /* The five boxes submit as separate fields; join them into one code. */
  const entered = form.getAll('code').map(String).join('').trim();
  const parsed = otpCodeSchema.safeParse(entered);

  if (!parsed.success) {
    setAuthError(cookies, { message: parsed.error.issues[0]?.message ?? 'Check the code.' });
    return redirect('/account/verify', 303);
  }

  const outcome = await verifyAndSignIn(locals, phone, parsed.data);

  if (outcome.status === 'ok') {
    clearPendingPhone(cookies);
    await startSession(locals, cookies, outcome.customer.id);
    return redirect('/account', 303);
  }

  const message =
    outcome.status === 'invalid'
      ? `That code is not right. ${outcome.attemptsLeft} ${outcome.attemptsLeft === 1 ? 'try' : 'tries'} left.`
      : outcome.status === 'expired'
        ? 'That code has expired. Please request a new one.'
        : 'Too many wrong tries. Please request a new code.';

  if (outcome.status !== 'invalid') clearPendingPhone(cookies);
  setAuthError(cookies, { message, phone });

  return redirect(outcome.status === 'invalid' ? '/account/verify' : '/account/sign-in', 303);
};
