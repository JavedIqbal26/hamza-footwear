/**
 * The order column list, in one place.
 *
 * Both order repositories `RETURNING` it, and a column added to one and missed
 * in the other would surface as a field that is silently undefined on half the
 * pages that read it.
 */
export const ORDER_COLUMNS = `
  id, order_number, customer_name, phone, city, area, address_line, items,
  subtotal_pkr, delivery_fee_pkr, total_pkr, payment_method, payment_proof_key,
  payment_reference, payment_status, order_status, tiktok_video_ref, notes,
  created_at, customer_id
`;
