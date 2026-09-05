import { formatPhone, toTelNumber, toWhatsAppNumber, type Order } from '@hamza/shared';

import { quoteMessage } from '../lib/quote-message.js';

/**
 * Reaching the customer.
 *
 * Two ways, both one tap. Plenty of customers outside the big cities are not on
 * WhatsApp at all, and an order that cannot be confirmed is an order that gets
 * refused at the door.
 *
 * Once the order has been quoted the WhatsApp button stops being a plain
 * "hello" and carries the amounts and the order link, because that message is
 * the step the whole flow waits on.
 */
export function OrderContact({ order }: { order: Order }) {
  const quoted = order.delivery_fee_pkr !== null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      <a
        href={`tel:${toTelNumber(order.phone)}`}
        className="inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-3 text-sm font-medium text-ink"
      >
        Call {formatPhone(order.phone)}
      </a>
      <a
        href={`https://wa.me/${toWhatsAppNumber(order.phone)}?text=${encodeURIComponent(quoteMessage(order))}`}
        rel="noopener"
        className="inline-flex min-h-11 items-center rounded-lg border border-whatsapp-dark px-3 text-sm font-semibold text-whatsapp-dark"
      >
        {quoted ? 'Send total' : 'WhatsApp'}
      </a>
    </div>
  );
}
