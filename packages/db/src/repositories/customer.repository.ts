import type { D1Database } from '@cloudflare/workers-types';
import type { Customer, CustomerAddress, UkSize } from '@hamza/shared';

import { toCustomer, toCustomerAddress } from '../mappers/customer.mapper.js';
import type { CustomerAddressRow, CustomerRow } from '../rows.js';

/**
 * Customer accounts and their saved addresses.
 *
 * An account is a convenience layered on top of guest checkout, never a gate,
 * so everything here is optional from the storefront's point of view.
 */

const COLUMNS = 'id, phone, name, saved_size, created_at, last_seen_at';
const ADDRESS_COLUMNS =
  'id, customer_id, label, city, area, address_line, is_default, created_at';

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

export interface CustomerRepository {
  findByPhone(phone: string): Promise<Customer | null>;
  findById(id: string): Promise<Customer | null>;
  /** Returns the existing account for this number, or creates one. */
  upsertByPhone(id: string, phone: string): Promise<Customer>;
  updateProfile(id: string, name: string, savedSize: UkSize | null): Promise<Customer | null>;
  touch(id: string): Promise<void>;

  listAddresses(customerId: string): Promise<CustomerAddress[]>;
  addAddress(id: string, address: NewAddress): Promise<CustomerAddress>;
  removeAddress(customerId: string, addressId: string): Promise<boolean>;
  countOrders(customerId: string): Promise<number>;
  /** Links guest orders placed from the same number to a newly created account. */
  claimOrders(customerId: string, phone: string): Promise<number>;
}

export interface NewAddress {
  readonly customer_id: string;
  readonly label: string;
  readonly city: string;
  readonly area: string;
  readonly address_line: string;
  readonly is_default: boolean;
}

export function createCustomerRepository(db: D1Database): CustomerRepository {
  return {
    async findByPhone(phone: string): Promise<Customer | null> {
      const row = await db
        .prepare(`SELECT ${COLUMNS} FROM customers WHERE phone = ?1`)
        .bind(phone)
        .first<CustomerRow>();
      return row === null ? null : toCustomer(row);
    },

    async findById(id: string): Promise<Customer | null> {
      const row = await db
        .prepare(`SELECT ${COLUMNS} FROM customers WHERE id = ?1`)
        .bind(id)
        .first<CustomerRow>();
      return row === null ? null : toCustomer(row);
    },

    /**
     * One statement, so two codes verified at once cannot create two accounts
     * for the same number. The conflict path updates `last_seen_at` and returns
     * the existing row rather than failing.
     */
    async upsertByPhone(id: string, phone: string): Promise<Customer> {
      const row = await db
        .prepare(
          `INSERT INTO customers (id, phone) VALUES (?1, ?2)
           ON CONFLICT (phone) DO UPDATE SET last_seen_at = ${NOW}
           RETURNING ${COLUMNS}`,
        )
        .bind(id, phone)
        .first<CustomerRow>();

      if (row === null) throw new Error('Customer upsert returned no row');
      return toCustomer(row);
    },

    async updateProfile(
      id: string,
      name: string,
      savedSize: UkSize | null,
    ): Promise<Customer | null> {
      const row = await db
        .prepare(
          `UPDATE customers SET name = ?2, saved_size = ?3, last_seen_at = ${NOW}
           WHERE id = ?1 RETURNING ${COLUMNS}`,
        )
        .bind(id, name, savedSize)
        .first<CustomerRow>();
      return row === null ? null : toCustomer(row);
    },

    async touch(id: string): Promise<void> {
      await db
        .prepare(`UPDATE customers SET last_seen_at = ${NOW} WHERE id = ?1`)
        .bind(id)
        .run();
    },

    async listAddresses(customerId: string): Promise<CustomerAddress[]> {
      const { results } = await db
        .prepare(
          `SELECT ${ADDRESS_COLUMNS} FROM customer_addresses
           WHERE customer_id = ?1
           ORDER BY is_default DESC, created_at DESC`,
        )
        .bind(customerId)
        .all<CustomerAddressRow>();
      return results.map(toCustomerAddress);
    },

    async addAddress(id: string, address: NewAddress): Promise<CustomerAddress> {
      const row = await db
        .prepare(
          `INSERT INTO customer_addresses
             (id, customer_id, label, city, area, address_line, is_default)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
           RETURNING ${ADDRESS_COLUMNS}`,
        )
        .bind(
          id,
          address.customer_id,
          address.label,
          address.city,
          address.area,
          address.address_line,
          address.is_default ? 1 : 0,
        )
        .first<CustomerAddressRow>();

      if (row === null) throw new Error('Address insert returned no row');
      return toCustomerAddress(row);
    },

    /** Scoped by customer so an id alone can never delete someone else's address. */
    async removeAddress(customerId: string, addressId: string): Promise<boolean> {
      const result = await db
        .prepare('DELETE FROM customer_addresses WHERE id = ?1 AND customer_id = ?2')
        .bind(addressId, customerId)
        .run();
      return (result.meta.changes ?? 0) > 0;
    },

    async countOrders(customerId: string): Promise<number> {
      const row = await db
        .prepare('SELECT COUNT(*) AS count FROM orders WHERE customer_id = ?1')
        .bind(customerId)
        .first<{ count: number }>();
      return row?.count ?? 0;
    },

    /**
     * On first sign-in, adopt the orders this number already placed as a guest.
     * Without it a returning customer signs in to an empty history and the
     * account looks broken.
     */
    async claimOrders(customerId: string, phone: string): Promise<number> {
      const result = await db
        .prepare(
          'UPDATE orders SET customer_id = ?1 WHERE phone = ?2 AND customer_id IS NULL',
        )
        .bind(customerId, phone)
        .run();
      return result.meta.changes ?? 0;
    },
  };
}
