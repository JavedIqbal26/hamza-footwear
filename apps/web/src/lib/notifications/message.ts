import { formatPKR, formatPhone, PAYMENT_METHOD_LABELS, type Order } from '@hamza/shared';

/**
 * The order summary the owner receives.
 *
 * Written to be actionable on a phone screen at a glance: what to pack, where
 * it goes, what to collect, and who to call — in that order, because that is
 * the order the work happens in.
 */
export function buildOrderSummary(order: Order): string {
  const lines = [
    `New order ${order.order_number}`,
    '',
    ...order.items.map(
      (item) =>
        `${item.quantity} x ${item.name} (UK ${item.size}) — ${formatPKR(item.unit_price_pkr)}`,
    ),
    '',
    `Subtotal: ${formatPKR(order.subtotal_pkr)}`,
    `Delivery: ${formatPKR(order.delivery_fee_pkr)}`,
    `Total: ${formatPKR(order.total_pkr)}`,
    `Payment: ${PAYMENT_METHOD_LABELS[order.payment_method]}`,
    '',
    order.customer_name,
    formatPhone(order.phone),
    `${order.address_line}, ${order.area}, ${order.city}`,
  ];

  if (order.tiktok_video_ref) lines.push('', `Video: ${order.tiktok_video_ref}`);
  if (order.notes) lines.push('', order.notes);

  return lines.join('\n');
}

export function buildOrderSubject(order: Order): string {
  return `New order ${order.order_number} — ${formatPKR(order.total_pkr)}`;
}
