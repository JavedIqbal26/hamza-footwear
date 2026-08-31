import {
  formatPKR,
  formatPhone,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  toWhatsAppNumber,
  type Order,
} from '@hamza/shared';

/**
 * One order, as the owner needs it on a phone.
 *
 * Ordered by the work: what to pack, where it goes, then who to call. The
 * customer's number is a tap-to-WhatsApp link, because confirming an order is
 * the first thing that happens after it arrives.
 */

interface Props {
  order: Order;
  onStatusChange: (update: { order_status?: string; payment_status?: string }) => void;
  busy: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Payment pending',
  verified: 'Payment verified',
  failed: 'Payment failed',
};

export function OrderCard({ order, onStatusChange, busy }: Props) {
  const isCod = order.payment_method === 'cod';

  return (
    <article className="space-y-3 border-b border-neutral-200 py-4 sm:rounded-xl sm:border sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-bold text-ink">{order.order_number}</h2>
        <p className="text-base font-bold text-ink">{formatPKR(order.total_pkr)}</p>
      </div>

      <ul className="space-y-0.5 text-sm text-ink">
        {order.items.map((item, index) => (
          <li key={`${item.product_id}-${item.size}-${index}`}>
            {item.quantity} × {item.name}{' '}
            <span className="text-ink-muted">(UK {item.size})</span>
          </li>
        ))}
      </ul>

      <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
        <p className="font-medium text-ink">{order.customer_name}</p>
        <p className="text-ink-muted">
          {order.address_line}, {order.area}, {order.city}
        </p>
        <a
          href={`https://wa.me/${toWhatsAppNumber(order.phone)}`}
          rel="noopener"
          className="mt-1 inline-block font-medium text-whatsapp-dark underline"
        >
          {formatPhone(order.phone)}
        </a>
      </div>

      <p className="text-xs text-ink-muted">
        {PAYMENT_METHOD_LABELS[order.payment_method]}
        {order.tiktok_video_ref && ` · video ${order.tiktok_video_ref}`}
      </p>

      {order.notes && (
        <p className="whitespace-pre-line rounded bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {order.notes}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Order status</span>
          <select
            className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-2 text-base"
            value={order.order_status}
            disabled={busy}
            onChange={(event) => onStatusChange({ order_status: event.target.value })}
          >
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status] ?? status}
              </option>
            ))}
          </select>
        </label>

        {/*
          Cash on Delivery has nothing to verify before dispatch, so the payment
          control is only shown for wallet orders — one less thing on screen for
          the majority of orders.
        */}
        {!isCod && (
          <label className="block">
            <span className="text-xs font-medium text-ink-muted">Payment</span>
            <select
              className="mt-1 min-h-11 w-full rounded-lg border border-neutral-300 px-2 text-base"
              value={order.payment_status}
              disabled={busy}
              onChange={(event) => onStatusChange({ payment_status: event.target.value })}
            >
              {PAYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PAYMENT_LABELS[status] ?? status}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </article>
  );
}
