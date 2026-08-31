import { z } from 'zod';

import { UK_SIZES } from '../constants/sizes.js';
import { phoneSchema } from './order.js';

/**
 * Passwordless sign-in.
 *
 * Two steps and no password: a phone number, then a five-digit code. There is
 * no email field anywhere in this contract by design.
 */

/** Five digits, matching the boxes in the design. */
export const OTP_LENGTH = 5;

export const otpCodeSchema = z
  .string()
  .trim()
  .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code`);

export const requestCodeSchema = z.object({
  phone: phoneSchema,
  /** Opt-in to order updates on WhatsApp, checked by default in the design. */
  whatsapp_updates: z.coerce.boolean().default(true),
});

export type RequestCodeInput = z.infer<typeof requestCodeSchema>;

export const verifyCodeSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>;

export const profileSchema = z.object({
  name: z.string().trim().max(80).default(''),
  saved_size: z.enum(UK_SIZES).nullable().default(null),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(30).default('Home'),
  city: z.string().trim().min(1, 'Please choose your city').max(60),
  area: z.string().trim().min(2, 'Please enter your area').max(80),
  address_line: z.string().trim().min(5, 'Please enter your full address').max(300),
});

export type AddressInput = z.infer<typeof addressSchema>;

export const reviewSchema = z.object({
  product_id: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().trim().max(1000).default(''),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
