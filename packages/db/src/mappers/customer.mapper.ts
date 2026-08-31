import { isUkSize, type Customer, type CustomerAddress } from '@hamza/shared';

import type { CustomerAddressRow, CustomerRow } from '../rows.js';

/**
 * D1 rows -> customer domain types.
 *
 * `saved_size` is stored as free TEXT, so an unrecognised value degrades to
 * null: a stale size should stop prefilling the picker, never break the page.
 */
export function toCustomer(row: CustomerRow): Customer {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    saved_size: row.saved_size && isUkSize(row.saved_size) ? row.saved_size : null,
    created_at: row.created_at,
    last_seen_at: row.last_seen_at,
  };
}

export function toCustomerAddress(row: CustomerAddressRow): CustomerAddress {
  return {
    id: row.id,
    customer_id: row.customer_id,
    label: row.label,
    city: row.city,
    area: row.area,
    address_line: row.address_line,
    is_default: row.is_default === 1,
    created_at: row.created_at,
  };
}
