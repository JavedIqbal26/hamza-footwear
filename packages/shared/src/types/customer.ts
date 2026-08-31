import type { UkSize } from '../constants/sizes.js';

/**
 * A customer account.
 *
 * Deliberately thin: a phone number, a name, and the two things that make
 * checkout faster next time. There is no email and no password anywhere in
 * this system — the sign-in code goes to the number the shop already needs.
 */
export interface Customer {
  readonly id: string;
  /** Normalised: 11 digits beginning `03`. */
  readonly phone: string;
  readonly name: string;
  /** The size this customer usually buys. Prefills the picker; never enforced. */
  readonly saved_size: UkSize | null;
  readonly created_at: string;
  readonly last_seen_at: string;
}

export interface CustomerAddress {
  readonly id: string;
  readonly customer_id: string;
  readonly label: string;
  readonly city: string;
  readonly area: string;
  readonly address_line: string;
  readonly is_default: boolean;
  readonly created_at: string;
}

/** What a page needs to render the signed-in state. */
export interface CustomerSummary {
  readonly customer: Customer;
  readonly addressCount: number;
  readonly orderCount: number;
}

/** First name only, for "Salaam, Ayesha". Falls back to the whole string. */
export function firstName(customer: Pick<Customer, 'name'>): string {
  const trimmed = customer.name.trim();
  if (trimmed.length === 0) return '';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}
