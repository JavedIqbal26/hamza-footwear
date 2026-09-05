import { formatPKR, orderUrl, type Order } from '@hamza/shared';

/**
 * The message he sends once he has quoted: the split, and a link to the page
 * that carries the wallet numbers. The numbers themselves are deliberately not
 * duplicated into admin — the order page is their single source.
 */
export function quoteMessage(order: Order): string {
  const lines = [`Hamza Footwear — order ${order.order_number}`];

  if (order.delivery_fee_pkr === null) {
    lines.push(`Shoes: ${formatPKR(order.subtotal_pkr)} + delivery`);
  } else {
    const isCod = order.payment_method === 'cod';
    lines.push(
      `Shoes: ${formatPKR(order.subtotal_pkr)}`,
      `Delivery: ${formatPKR(order.delivery_fee_pkr)}`,
      `Total: ${formatPKR(order.total_pkr)}`,
      '',
      `Abhi bhejein: ${formatPKR(isCod ? order.delivery_fee_pkr : order.total_pkr)}`,
    );
    if (isCod) lines.push(`Parcel milne par cash: ${formatPKR(order.subtotal_pkr)}`);
  }

  lines.push('', orderUrl(order.id));
  return lines.join("\n");
}
