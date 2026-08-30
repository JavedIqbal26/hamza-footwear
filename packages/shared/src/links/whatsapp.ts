import { formatPKR } from '../money/format.js';
import { toWhatsAppNumber } from '../validation/phone.js';
import type { UkSize } from '../constants/sizes.js';

/**
 * The WhatsApp ordering path.
 *
 * Some customers will never fill in a form — this path is always available and
 * is never buried behind the order form. The message is pre-filled so the owner
 * receives a complete, actionable enquiry rather than "is this available?".
 *
 * Microcopy is Roman Urdu: this is trust-critical, and it is the first thing a
 * hesitant customer reads.
 */

export interface WhatsAppOrderRequest {
  /** The shop's own number, in any format `normalisePhone` understands. */
  readonly shopPhone: string;
  readonly productName: string;
  readonly productUrl: string;
  readonly pricePkr: number;
  readonly size?: UkSize | null;
}

export function buildWhatsAppMessage(request: WhatsAppOrderRequest): string {
  const lines = [
    'Assalam o Alaikum! Mujhe ye order karna hai:',
    '',
    request.productName,
    `Price: ${formatPKR(request.pricePkr)}`,
  ];

  if (request.size) lines.push(`Size: UK ${request.size}`);

  lines.push('', request.productUrl);

  return lines.join('\n');
}

/** `wa.me` deep link. Opens the WhatsApp app directly on Android. */
export function buildWhatsAppOrderLink(request: WhatsAppOrderRequest): string {
  const number = toWhatsAppNumber(request.shopPhone);
  const text = encodeURIComponent(buildWhatsAppMessage(request));
  return `https://wa.me/${number}?text=${text}`;
}

/** A plain "get in touch" link with no product context. */
export function buildWhatsAppContactLink(shopPhone: string): string {
  return `https://wa.me/${toWhatsAppNumber(shopPhone)}`;
}
