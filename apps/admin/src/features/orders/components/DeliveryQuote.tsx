import { useState } from 'react';
import { formatPKR, type Order } from '@hamza/shared';

/**
 * The delivery charge, and what it means the customer owes.
 *
 * This is the one number on an order the shop supplies by hand. The site
 * deliberately does not guess it — it depends on where the parcel is going, and
 * it is the figure a customer pays against.
 *
 * Until it is set the order cannot move: nobody has been told what to send. So
 * an unquoted order shows the input and nothing else, and a quoted one shows
 * the split that matters when the money arrives — how much should have come in
 * advance, and how much is still to be collected at the door.
 */

interface Props {
  order: Order;
  onQuote: (deliveryFeePkr: number) => void;
  busy: boolean;
}

export function DeliveryQuote({ order, onQuote, busy }: Props) {
  const [value, setValue] = useState('');

  if (order.delivery_fee_pkr === null) {
    return (
      <form
        className="rounded-lg border-2 border-brand-600 bg-brand-50 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          const fee = Number.parseInt(value, 10);
          if (Number.isSafeInteger(fee) && fee >= 0) onQuote(fee);
        }}
      >
        <label htmlFor={`fee-${order.id}`} className="block text-sm font-bold text-ink">
          Delivery charge for {order.city}
        </label>
        <p className="mt-0.5 text-xs text-ink-muted">
          The customer is waiting for this before they can pay.
        </p>

        <div className="mt-2 flex gap-2">
          <input
            id={`fee-${order.id}`}
            inputMode="numeric"
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="e.g. 350"
            className="min-h-11 w-full rounded-lg border border-neutral-300 px-3 text-base"
          />
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 shrink-0 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Set'}
          </button>
        </div>
      </form>
    );
  }

  /*
   * COD means the advance is the delivery charge alone; a prepaid order means
   * it is everything. Getting these the wrong way round is the mistake this
   * block exists to prevent — he is checking a wallet against one of them.
   */
  const isCod = order.payment_method === 'cod';
  const advancePkr = isCod ? order.delivery_fee_pkr : order.total_pkr;
  const atDoorPkr = isCod ? order.subtotal_pkr : 0;

  return (
    <dl className="rounded-lg bg-neutral-50 px-3 py-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-muted">Delivery</dt>
        <dd className="text-ink">{formatPKR(order.delivery_fee_pkr)}</dd>
      </div>
      <div className="mt-1 flex justify-between font-medium">
        <dt className="text-ink">Advance expected</dt>
        <dd className="text-ink">{formatPKR(advancePkr)}</dd>
      </div>
      {atDoorPkr > 0 && (
        <div className="mt-1 flex justify-between">
          <dt className="text-ink-muted">Collect at door</dt>
          <dd className="text-ink">{formatPKR(atDoorPkr)}</dd>
        </div>
      )}
    </dl>
  );
}
