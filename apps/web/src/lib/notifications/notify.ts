import type { Order } from '@hamza/shared';

import { buildOrderSubject, buildOrderSummary } from './message.js';
import { readResendConfig, sendOrderEmail } from './resend.js';
import { readTelegramConfig, sendTelegramMessage } from './telegram.js';

/**
 * Fires the order notifications.
 *
 * Two guarantees matter here, and they are the same guarantee: **a failed
 * notification must never cost the shop the order.**
 *
 * 1. This runs only after the order is committed to D1.
 * 2. Every failure is caught and logged, never rethrown. The customer sees
 *    their confirmation regardless of whether Telegram is reachable.
 *
 * Delivery is handed to `waitUntil` so the customer's confirmation page is not
 * held open waiting on two third-party APIs over a mobile connection.
 */
export function notifyNewOrder(locals: App.Locals, order: Order): void {
  const env = locals.runtime?.env;
  if (!env) return;

  const work = deliverAll(env, order);
  const ctx = locals.runtime?.ctx;

  if (ctx) {
    ctx.waitUntil(work);
  } else {
    /* No execution context (local dev): let it run detached, still swallowing errors. */
    void work;
  }
}

async function deliverAll(env: CloudflareEnv, order: Order): Promise<void> {
  const text = buildOrderSummary(order);

  /* allSettled, not all: one channel failing must not cancel the other. */
  await Promise.allSettled([
    deliverTelegram(env, order, text),
    deliverEmail(env, order, text),
  ]);
}

async function deliverTelegram(
  env: CloudflareEnv,
  order: Order,
  text: string,
): Promise<void> {
  const config = readTelegramConfig(env);
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
): Promise<void> {
  const config = readResendConfig(env);
  if (!config) return;

  try {
    await sendOrderEmail(config, buildOrderSubject(order), text);
  } catch (error) {
    console.error(`Resend notify failed for ${order.order_number}`, error);
  }
}
