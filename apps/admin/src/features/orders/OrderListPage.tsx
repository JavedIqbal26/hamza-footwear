import { useCallback, useEffect, useState } from 'react';
import { ORDER_STATUSES, type Order } from '@hamza/shared';

import { api } from '../../lib/api-client.js';
import { ErrorBanner, Spinner } from '../../components/ui/controls.jsx';
import { OrderCard } from './components/OrderCard.jsx';

/**
 * The order list — the screen the owner opens most.
 *
 * Defaults to everything, newest first, with a filter row across the top
 * showing how many orders sit in each state. "New" is what needs action.
 */
export function OrderListPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: string | null) => {
    try {
      const result = await api.listOrders(status ?? undefined);
      setOrders(result.orders);
      setCounts(result.counts);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load orders');
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function changeStatus(
    order: Order,
    update: { order_status?: string; payment_status?: string },
  ): Promise<void> {
    setBusyId(order.id);
    try {
      const { order: updated } = await api.updateOrderStatus(order.id, update);
      setOrders((current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)) ?? null,
      );
      /* Counts move when a status changes, so refresh them. */
      void load(filter);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the order');
    } finally {
      setBusyId(null);
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      <div className="-mx-4 overflow-x-auto px-4">
        <div className="flex gap-2">
          <FilterChip
            label="All"
            count={total}
            active={filter === null}
            onClick={() => setFilter(null)}
          />
          {ORDER_STATUSES.map((status) => (
            <FilterChip
              key={status}
              label={status}
              count={counts[status] ?? 0}
              active={filter === status}
              onClick={() => setFilter(status)}
            />
          ))}
        </div>
      </div>

      {orders === null ? (
        <Spinner label="Loading orders…" />
      ) : orders.length === 0 ? (
        <p className="py-10 text-center text-sm text-ink-muted">No orders here yet.</p>
      ) : (
        <div className="sm:grid sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={busyId === order.id}
              onStatusChange={(update) => void changeStatus(order, update)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, count, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium capitalize ${
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-neutral-300 bg-white text-ink'
      }`}
    >
      {label} {count > 0 && <span className="opacity-70">{count}</span>}
    </button>
  );
}
