/**
 * Delivering the one-time code.
 *
 * ---------------------------------------------------------------------------
 * THIS IS THE ONE PART OF THE SHOP THAT CANNOT BE FREE.
 *
 * Reaching an arbitrary customer's phone costs money, whichever route is taken:
 *
 * - **SMS** — a Pakistani gateway runs roughly PKR 1–2 per message; Twilio and
 *   friends are ~$0.05. Real cost, per sign-in.
 * - **WhatsApp** — the Cloud API is cheap per conversation but requires Meta
 *   business verification, which needs the NTN and registered business bank
 *   account the shop does not yet have. That is the same wall that stopped
 *   JazzCash and Easypaisa integration in Phase 1.
 *
 * Neither fits the zero-recurring-cost rule in CLAUDE.md, so the choice is the
 * owner's, not the code's. This module therefore defines the seam and ships two
 * adapters: `log`, which is fully functional for development and prints the
 * code to the Worker log, and `http`, which posts to any gateway that accepts a
 * JSON body — most Pakistani providers do.
 *
 * Nothing else in the sign-in flow knows or cares which is configured.
 * ---------------------------------------------------------------------------
 */

export interface OtpSender {
  readonly name: string;
  send(phone: string, code: string): Promise<void>;
}

export class OtpSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OtpSendError';
  }
}

/**
 * Development sender. Writes the code to the Worker log instead of sending it.
 *
 * Deliberately refuses to run in production: silently "sending" nothing would
 * lock every customer out of their account with no visible failure.
 */
function createLogSender(isProduction: boolean): OtpSender {
  return {
    name: 'log',
    async send(phone: string, code: string): Promise<void> {
      if (isProduction) {
        throw new OtpSendError(
          'No SMS provider is configured. Set OTP_GATEWAY_URL and OTP_GATEWAY_KEY, ' +
            'or disable phone sign-in — the log sender must never run in production.',
        );
      }
      console.log(`[otp] ${phone} -> ${code}`);
    },
  };
}

/**
 * Generic HTTP gateway.
 *
 * Body and auth header are intentionally plain: `{ to, text }` with a bearer
 * token covers the majority of Pakistani SMS gateways, and anything exotic is a
 * small edit here rather than a change anywhere else.
 */
function createHttpSender(url: string, key: string, template: string): OtpSender {
  return {
    name: 'http',
    async send(phone: string, code: string): Promise<void> {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          /* Gateways expect the international form without a plus. */
          to: `92${phone.slice(1)}`,
          text: template.replace('{code}', code),
        }),
      });

      if (!response.ok) {
        /* The body may echo the code — log the status only. */
        throw new OtpSendError(`SMS gateway rejected the request: ${response.status}`);
      }
    },
  };
}

const DEFAULT_TEMPLATE = 'Hamza Footwear: aap ka code {code} hai. 10 minute mein expire ho jayega.';

export function createOtpSender(env: CloudflareEnv, isProduction: boolean): OtpSender {
  const url = env.OTP_GATEWAY_URL;
  const key = env.OTP_GATEWAY_KEY;

  if (url && key) {
    return createHttpSender(url, key, env.OTP_MESSAGE_TEMPLATE ?? DEFAULT_TEMPLATE);
  }
  return createLogSender(isProduction);
}
