export const STOCK_STATUSES = ['in_stock', 'low', 'out'] as const;
export type StockStatus = (typeof STOCK_STATUSES)[number];

export const PAYMENT_METHODS = ['cod', 'jazzcash', 'easypaisa'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'verified', 'failed'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  'new',
  'confirmed',
  'dispatched',
  'delivered',
  'cancelled',
  'returned',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STOCK_STATUS_LABELS: Readonly<Record<StockStatus, string>> = {
  in_stock: 'In stock',
  low: 'Only a few left',
  out: 'Out of stock',
};

export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  cod: 'Cash on Delivery',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
};

/** A product is orderable unless it is explicitly out of stock. */
export function isOrderable(stock: StockStatus): boolean {
  return stock !== 'out';
}
