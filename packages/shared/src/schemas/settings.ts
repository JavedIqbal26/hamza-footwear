import { z } from 'zod';

/**
 * Notification preferences and push subscriptions.
 *
 * Note what is absent: no bot token, no API key. Those are Worker secrets and
 * must never travel through an admin form — a credential that reaches the
 * database is a credential in every backup.
 */

export const notificationSettingsSchema = z.object({
  push: z.boolean(),
  telegram: z.boolean(),
  email: z.boolean(),
  /** Telegram chat ids are numeric but can be negative for groups. */
  telegram_chat_id: z
    .string()
    .trim()
    .regex(/^-?d{1,20}$/, 'Chat ID sirf number hota hai')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  email_to: z.string().trim().email('Email theek se likhein').optional().or(
    z.literal('').transform(() => undefined),
  ),
});

export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;

/**
 * One browser's push subscription, as `PushManager.subscribe` returns it.
 *
 * **The endpoint must be https.** The sender `fetch`es this value, so an
 * unrestricted URL here is a server-side request forgery waiting to happen —
 * `z.string().url()` alone accepts `javascript:`, `file:` and, worse, plain
 * `http:` to an internal address. Real push services are https without
 * exception, so nothing legitimate is lost by insisting on it.
 *
 * Matched by pattern rather than parsed with `URL`, which is not in this
 * package's lib — shared stays dependency-free and DOM-free so the storefront
 * can import it without cost. A dotted public hostname is required, so
 * `https://localhost` and bare internal hostnames are out too, and the leading
 * negative lookahead drops the private IPv4 ranges.
 */
const HTTPS_ENDPOINT =
  /^https:\/\/(?!(?:10|127|169\.254|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+(?::\d{1,5})?(?:\/\S*)?$/i;

const httpsUrl = z
  .string()
  .max(2000)
  .regex(HTTPS_ENDPOINT, 'Push endpoint must be a public https URL');

export const pushSubscriptionSchema = z.object({
  endpoint: httpsUrl,
  p256dh: z.string().min(1).max(200),
  auth: z.string().min(1).max(100),
  label: z.string().trim().max(80).optional(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
