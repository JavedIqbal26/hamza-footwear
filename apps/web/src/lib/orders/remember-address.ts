import { createCustomerRepository } from '@hamza/db';
import type { CheckoutInput } from '@hamza/shared/schemas';

import { getDatabase } from '../runtime.js';

/**
 * Saves the address a signed-in customer just checked out with.
 *
 * This is the concrete payoff of having an account: the next order is two taps
 * instead of five fields typed with a thumb.
 *
 * Deliberately best-effort — it runs after the order is already committed, and
 * a failure here must never surface to the customer or cost the sale.
 */
export async function rememberAddress(
  locals: App.Locals,
  customerId: string,
  input: CheckoutInput,
): Promise<void> {
  try {
    const customers = createCustomerRepository(getDatabase(locals));
    const existing = await customers.listAddresses(customerId);

    /* Don't accumulate duplicates of the same place. */
    const alreadySaved = existing.some(
      (address) =>
        address.city === input.city &&
        address.area === input.area &&
        address.address_line === input.address_line,
    );
    if (alreadySaved) return;

    await customers.addAddress(crypto.randomUUID(), {
      customer_id: customerId,
      label: 'Home',
      city: input.city,
      area: input.area,
      address_line: input.address_line,
      /* The first address saved becomes the default. */
      is_default: existing.length === 0,
    });

    /* Adopt the name from checkout when the account has none yet. */
    const customer = await customers.findById(customerId);
    if (customer && !customer.name && input.customer_name) {
      await customers.updateProfile(customerId, input.customer_name, customer.saved_size);
    }
  } catch (error) {
    console.error('Could not save the address for a customer', error);
  }
}
