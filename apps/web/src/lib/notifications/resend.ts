/**
 * Email notification via Resend.
 *
 * The backup record, not the primary channel: Resend's free tier caps at 100
 * emails a day, which a good week would exhaust. Telegram carries the urgency;
 * this exists so there is a searchable copy in an inbox.
 *
 * Plain text only — no HTML template to maintain, and it renders identically
 * everywhere.
 */

const RESEND_API = 'https://api.resend.com/emails';

export interface ResendConfig {
  readonly apiKey: string;
  readonly from: string;
  readonly to: string;
}

/** An address set in admin wins over the deploy-time one; the key never moves. */
export function readResendConfig(
  env: CloudflareEnv,
  toOverride?: string | null,
): ResendConfig | null {
  const apiKey = env.RESEND_API_KEY;
  const from = env.ORDER_EMAIL_FROM;
  const to = toOverride ?? env.ORDER_EMAIL_TO;
  return apiKey && from && to ? { apiKey, from, to } : null;
}

export async function sendOrderEmail(
  config: ResendConfig,
  subject: string,
  text: string,
): Promise<void> {
  const response = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend send failed: ${response.status} ${await response.text()}`);
  }
}
