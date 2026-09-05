/**
 * The storefront's public origin.
 *
 * Lives in shared because two apps need it: the storefront builds canonical
 * URLs from it, and admin builds the order link it sends a customer on
 * WhatsApp. Written down twice, the two would eventually disagree, and the
 * version that disagrees is the one being pasted into a customer's chat.
 */
export const SITE_ORIGIN = 'https://hamzafootwear.com';

/** The customer-facing page for one order. Addressed by UUID, never by number. */
export function orderUrl(orderId: string): string {
  return `${SITE_ORIGIN}/order/${orderId}`;
}
