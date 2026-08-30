import { z } from 'zod';

import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from '../types/cart.js';
import { ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../constants/statuses.js';
import { PK_MOBILE_PATTERN, normalisePhone } from '../validation/phone.js';
import { slugSchema, ukSizeSchema } from './product.js';

/**
 * What a customer may submit.
 *
 * Note what is absent: no prices, no delivery fee, no total. Those are read
 * from the database and recomputed server-side. The client supplies intent
 * only — anything it says about money is ignored.
 */

/**
 * Phone is normalised before validation, so "0300 123 4567" and "+92 300 1234567"
 * both pass and both store identically.
 */
export const phoneSchema = z
  .string()
  .transform(normalisePhone)
  .refine((value) => PK_MOBILE_PATTERN.test(value), {
    message: 'Enter a valid Pakistani mobile number, e.g. 0300 1234567',
  });

export const cartEntrySchema = z.object({
  slug: slugSchema,
  size: ukSizeSchema,
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_LINE),
});

export const cartSchema = z.array(cartEntrySchema).min(1).max(MAX_CART_LINES);

export const paymentMethodSchema = z.enum(PAYMENT_METHODS);
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES);
export const orderStatusSchema = z.enum(ORDER_STATUSES);

/** The checkout form. Field order matches the form: name, mobile, city, area, address. */
export const checkoutSchema = z.object({
  customer_name: z.string().trim().min(2, 'Please enter your name').max(80),
  phone: phoneSchema,
  city: z.string().trim().min(1, 'Please choose your city').max(60),
  area: z.string().trim().min(2, 'Please enter your area').max(80),
  address_line: z.string().trim().min(5, 'Please enter your full address').max(300),
  payment_method: paymentMethodSchema,
  /** Wallet transaction id, when the customer paid by JazzCash or Easypaisa. */
  payment_reference: z.string().trim().max(60).optional(),
  notes: z.string().trim().max(500).default(''),
  /** Which TikTok video this order came from. Sanitised before it gets here. */
  tiktok_video_ref: z.string().max(40).nullable().default(null),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Admin: moving an order through its lifecycle. */
export const orderStatusUpdateSchema = z.object({
  order_status: orderStatusSchema.optional(),
  payment_status: paymentStatusSchema.optional(),
}).refine(
  (update) => update.order_status !== undefined || update.payment_status !== undefined,
  { message: 'Provide at least one status to update' },
);

export type OrderStatusUpdate = z.infer<typeof orderStatusUpdateSchema>;

/** Admin: listing and filtering orders. */
export const orderListQuerySchema = z.object({
  order_status: orderStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
