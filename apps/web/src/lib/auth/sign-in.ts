import {
  createAuthRepository,
  createCustomerRepository,
  OTP_MAX_SENDS_PER_HOUR,
  type VerifyResult,
} from '@hamza/db';
import type { Customer } from '@hamza/shared';

import { generateOtp, sha256Hex } from './crypto.js';
import { createOtpSender, OtpSendError } from './sender.js';
import { getDatabase } from '../runtime.js';

/**
 * The two steps of signing in: request a code, then verify it.
 *
 * Both are written so that failure never reveals whether a number has an
 * account. The shop has no reason to leak its customer list to anyone able to
 * type a phone number.
 */

export type RequestOutcome =
  | { readonly status: 'sent' }
  | { readonly status: 'rate_limited' }
  | { readonly status: 'send_failed'; readonly message: string };

export async function requestCode(
  locals: App.Locals,
  phone: string,
): Promise<RequestOutcome> {
  const db = getDatabase(locals);
  const auth = createAuthRepository(db);

  /*
   * Ceiling per number per hour. Each send may cost real money, so this is a
   * spend control as much as an abuse control.
   */
  if ((await auth.countRecentSends(phone)) >= OTP_MAX_SENDS_PER_HOUR) {
    return { status: 'rate_limited' };
  }

  const code = generateOtp();
  await auth.createCode(crypto.randomUUID(), phone, await sha256Hex(code));

  const isProduction = import.meta.env.PROD;
  const sender = createOtpSender(locals.runtime.env, isProduction);

  try {
    await sender.send(phone, code);
    return { status: 'sent' };
  } catch (error) {
    console.error('OTP send failed', error);
    return {
      status: 'send_failed',
      message:
        error instanceof OtpSendError && !isProduction
          ? error.message
          : 'We could not send the code right now. Please try again in a moment.',
    };
  }
}

export type SignInOutcome =
  | { readonly status: 'ok'; readonly customer: Customer; readonly isNew: boolean }
  | { readonly status: 'invalid'; readonly attemptsLeft: number }
  | { readonly status: 'expired' }
  | { readonly status: 'exhausted' };

export async function verifyAndSignIn(
  locals: App.Locals,
  phone: string,
  code: string,
): Promise<SignInOutcome> {
  const db = getDatabase(locals);
  const auth = createAuthRepository(db);

  const result: VerifyResult = await auth.verifyCode(phone, await sha256Hex(code));
  if (result.status !== 'ok') return result;

  const customers = createCustomerRepository(db);
  const existing = await customers.findByPhone(phone);
  const customer = existing ?? (await customers.upsertByPhone(crypto.randomUUID(), phone));

  /*
   * First sign-in adopts any orders this number already placed as a guest —
   * otherwise a returning customer signs in to an empty history and the whole
   * account looks broken.
   */
  if (!existing) await customers.claimOrders(customer.id, phone);

  return { status: 'ok', customer, isNew: existing === null };
}
