import {
  createPushRepository,
  createSettingsRepository,
  type NotificationSettings,
  type PushSubscription,
} from '@hamza/db';
import { orderUrl, type Order } from '@hamza/shared';

import { buildOrderSubject, buildOrderSummary } from './message.js';
import { readResendConfig, sendOrderEmail } from './resend.js';
import { readTelegramConfig, sendTelegramMessage } from './telegram.js';
import { readVapidConfig, sendPush } from './web-push/send.js';
import { getDatabase } from '../runtime.js';

/**
 * Fires the order notifications.
 *
 * Two guarantees matter here, and they are the same guarantee: **a failed
 * notification must never cost the shop the order.**
 *
 * 1. This runs only after the order is committed to D1.
 * 2. Every failure is caught and logged, never rethrown. The customer sees
 *    their confirmation regardless of whether any channel is reachable.
 *
 * Which channels fire is the owner's choice, read from the settings table
 * rather than from environment variables — turning one on should not need a
 * deploy. The extra read costs the customer nothing because all of this happens
 * inside `waitUntil`, after the response has gone.
 */
export function notifyNewOrder(locals: App.Locals, order: Order): void {
  const env = locals.runtime?.env;
  if (!env) return;

  const work = deliverAll(locals, env, order);
  const ctx = locals.runtime?.ctx;

  if (ctx) {
    ctx.waitUntil(work);
  } else {
    /* No execution context (local dev): let it run detached, still swallowing errors. */
    void work;
  }
}

async function deliverAll(
  locals: App.Locals,
  env: CloudflareEnv,
  order: Order,
): Promise<void> {
  const text = buildOrderSummary(order);

  let settings: NotificationSettings;
  try {
    settings = await createSettingsRepository(getDatabase(locals)).readNotifications();
  } catch (error) {
    /*
     * If the settings read fails the shop still needs to hear about the order,
     * so fall through to the free channels rather than going silent. Being
     * notified twice is a nuisance; not being notified is a lost sale.
     */
    console.error('Could not read notification settings; using defaults', error);
    settings = { push: false, telegram: true, email: true, telegramChatId: null, emailTo: null };
  }

  /* allSettled, not all: one channel failing must not cancel the others. */
  await Promise.allSettled([
    settings.telegram ? deliverTelegram(env, order, text, settings) : Promise.resolve(),
    settings.email ? deliverEmail(env, order, text, settings) : Promise.resolve(),
    settings.push ? deliverPush(locals, env, order) : Promise.resolve(),
  ]);
}

async function deliverTelegram(
  env: CloudflareEnv,
  order: Order,
  text: string,
  settings: NotificationSettings,
): Promise<void> {
  /* The chat id may be set in admin; the bot token is always a secret. */
  const config = readTelegramConfig(env, settings.telegramChatId);
  if (!config) {
    console.warn(`Telegram not configured; order ${order.order_number} not pushed`);
    return;
  }

  try {
    await sendTelegramMessage(config, text);
  } catch (error) {
    console.error(`Telegram notify failed for ${order.order_number}`, error);
  }
}

async function deliverEmail(
  env: CloudflareEnv,
  order: Order,
  text: string,
  settings: NotificationSettings,
): Promise<void> {
  const config = readResendConfig(env, settings.emailTo);
  if (!config) return;

  try {
    await sendOrderEmail(config, buildOrderSubject(order), text);
  } catch (error) {
    console.error(`Resend notify failed for ${order.order_number}`, error);
  }
}

/**
 * Web Push to every browser the owner has enabled.
 *
 * Subscriptions the push service reports as gone are deleted rather than
 * retried — browsers expire them freely, and a queue of dead endpoints is how
 * this ends up spending its time on notifications nobody will ever see.
 */
async function deliverPush(
  locals: App.Locals,
  env: CloudflareEnv,
  order: Order,
): Promise<void> {
  const vapid = readVapidConfig(env as unknown as Record<string, unknown>);
  if (!vapid) {
    console.warn('Push enabled but VAPID keys are not set; skipping');
    return;
  }

  const repository = createPushRepository(getDatabase(locals));

  let subscriptions: PushSubscription[];
  try {
    subscriptions = await repository.list();
  } catch (error) {
    console.error('Could not read push subscriptions', error);
    return;
  }

  const payload = JSON.stringify({
    title: `New order ${order.order_number}`,
    body: `${order.customer_name} · ${order.city}`,
    url: orderUrl(order.id),
    orderId: order.id,
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      const outcome = await sendPush(subscription, payload, vapid);
      if (outcome === 'expired') await repository.remove(subscription.endpoint);
      return outcome;
    }),
  );

  const sent = results.filter(
    (result) => result.status === 'fulfilled' && result.value === 'sent',
  ).length;

  if (sent === 0 && subscriptions.length > 0) {
    console.error(`Push reached none of ${subscriptions.length} devices for ${order.order_number}`);
  }
}
