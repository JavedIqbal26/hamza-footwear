import {
  formatPKR,
  ORDER_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUSES,
  type Order,
} from '@hamza/shared';

import { DeliveryQuote } from './DeliveryQuote.jsx';
import { OrderContact } from './OrderContact.jsx';

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
  onQuote: (deliveryFeePkr: number) => void;
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

/*
 * "Advance", not "Payment". On a COD order this tracks the prepaid delivery
 * charge only — the shoes are still to be collected in cash — and calling it
 * payment would invite dispatching an order that is barely part-paid.
 */
const PAYMENT_LABELS: Record<string, string> = {
  pending: 'Advance pending',
  verified: 'Advance received',
  failed: 'Advance failed',
};

export function OrderCard({ order, onStatusChange, onQuote, busy }: Props) {

  return (
    <article className="space-y-3 border-b border-neutral-200 py-4 sm:rounded-xl sm:border sm:p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">{order.order_number}</h2>
          {/*
            How old the order is, not the timestamp. "2 days ago" tells the
            owner whether to act; "31 Aug, 14:20" makes them do the arithmetic.
          */}
          <p className="text-xs text-ink-muted">{ageOf(order.created_at)}</p>
        </div>
        <p className="text-base font-bold text-ink">
          {formatPKR(order.total_pkr)}
          {order.delivery_fee_pkr === null && (
            <span className="block text-xs font-normal text-ink-muted">+ delivery</span>
          )}
        </p>
      </div>

      <ul className="space-y-0.5 text-sm text-ink">
        {order.items.map((item, index) => (
          <li key={`${item.product_id}-${item.size}-${index}`}>
            {item.quantity} × {item.name}{' '}
            <span className="text-ink-muted">(UK {item.size})</span>
          </li>
        ))}
      </ul>

      <DeliveryQuote order={order} onQuote={onQuote} busy={busy} />

      <div className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
        <p className="font-medium text-ink">{order.customer_name}</p>
        <p className="text-ink-muted">
          {order.address_line}, {order.area}, {order.city}
        </p>
        <OrderContact order={order} />
      </div>

      <p className="text-xs text-ink-muted">
        {PAYMENT_METHOD_LABELS[order.payment_method]}
        {order.tiktok_video_ref && ` · video ${order.tiktok_video_ref}`}
      </p>

      {/*
        The wallet screenshot, next to the order exactly where verification
        happens. Served by the admin API behind Access, never from the public
        image route. Opening it full size is what the owner actually does —
        the thumbnail is only there to show one exists.
      */}
      {order.payment_proof_key && (
        <a
          href={`/api/admin/orders/${order.id}/proof`}
          target="_blank"
          rel="noopener"
          className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2 hover:bg-neutral-50"
        >
          <img
            src={`/api/admin/orders/${order.id}/proof`}
            alt=""
            className="h-16 w-16 shrink-0 rounded bg-neutral-100 object-cover"
          />
          <span className="text-sm font-medium text-ink">
            Payment screenshot
            <span className="block text-xs font-normal text-ink-muted">
              Tap to open full size
            </span>
          </span>
        </a>
      )}

      {order.payment_reference && (
        <p className="rounded bg-neutral-50 px-3 py-2 text-sm text-ink">
          Transaction ID <span className="font-bold">{order.payment_reference}</span>
        </p>
      )}

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
          Shown for every order now. Cash on Delivery used to have nothing to
          verify before dispatch; it does today, because the delivery charge is
          prepaid and that advance is exactly what this control tracks.
        */}
        {
          <label className="block">
            <span className="text-xs font-medium text-ink-muted">Advance</span>
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
        }
      </div>
    </article>
  );
}

/**
 * "Today", "Yesterday", "3 days ago" — the only resolution that changes what
 * the owner does next. Written by hand rather than via `Intl.RelativeTimeFormat`
 * so it reads the same on every device, including the older Androids this is
 * used on.
 */
function ageOf(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';

  const days = Math.floor((Date.now() - created.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
