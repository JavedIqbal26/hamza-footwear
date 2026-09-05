import { Hono } from 'hono';
import {
  createPushRepository,
  createSettingsRepository,
  type NotificationSettings,
} from '@hamza/db';
import { notificationSettingsSchema, pushSubscriptionSchema } from '@hamza/shared/schemas';

import { validationFailed } from '../../lib/http.js';
import { connectTelegramChat } from '../../services/telegram-connect.service.js';
import type { AppBindings } from '../../lib/env.js';

/**
 * Which channels tell the owner about a new order, and where they go.
 *
 * These were environment variables, so turning a channel on meant a redeploy.
 * That is the wrong home for a preference belonging to the person being
 * notified.
 *
 * Credentials stay out of this. The Telegram bot token and the Resend API key
 * remain Worker secrets; only the chat id, the destination address and the
 * on/off flags are settings. Neither is usable on its own.
 */
export const settingsRoutes = new Hono<AppBindings>();

/** What the settings screen needs to render itself, in one request. */
settingsRoutes.get('/settings', async (c) => {
  const notifications = await createSettingsRepository(c.env.DB).readNotifications();
  const devices = await createPushRepository(c.env.DB).count();

  return c.json({
    notifications,
    /*
     * Capability, not preference. A channel whose credentials are missing
     * cannot work however the toggle is set, and the screen says so rather
     * than letting the owner switch on something that will silently do
     * nothing.
     */
    available: {
      telegram: Boolean(c.env.TELEGRAM_BOT_TOKEN),
      email: Boolean(c.env.RESEND_API_KEY),
      push: Boolean(c.env.VAPID_PUBLIC_KEY),
    },
    /* Public half of the VAPID pair — the browser needs it to subscribe. */
    vapidPublicKey: c.env.VAPID_PUBLIC_KEY ?? null,
    pushDevices: devices,
  });
});

settingsRoutes.put('/settings', async (c) => {
  const parsed = notificationSettingsSchema.safeParse(await c.req.json());
  if (!parsed.success) return validationFailed(c, parsed.error);

  const settings: NotificationSettings = {
    push: parsed.data.push,
    telegram: parsed.data.telegram,
    email: parsed.data.email,
    telegramChatId: parsed.data.telegram_chat_id ?? null,
    emailTo: parsed.data.email_to ?? null,
  };

  await createSettingsRepository(c.env.DB).writeNotifications(settings);
  console.log(`Notification settings updated by ${c.get('adminEmail')}`);

  return c.json({ notifications: settings });
});

/**
 * Finding the chat id without making the owner find it.
 *
 * Asking a shopkeeper to hunt down a numeric Telegram chat id is exactly the
 * kind of step the four-tap rule exists to prevent. He messages the bot, taps
 * this, and the most recent conversation becomes the destination.
 */
settingsRoutes.post('/settings/telegram/connect', async (c) => {
  const token = c.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return c.json({ error: 'Telegram is not configured on the server.' }, 400);
  }

  const result = await connectTelegramChat(token);
  if (!result.chatId) return c.json({ error: result.message }, 400);

  const repository = createSettingsRepository(c.env.DB);
  const current = await repository.readNotifications();
  await repository.writeNotifications({
    ...current,
    telegram: true,
    telegramChatId: result.chatId,
  });

  return c.json({ chatId: result.chatId, chatName: result.chatName });
});

/* ---- Web Push subscriptions --------------------------------------------- */

settingsRoutes.post('/settings/push/subscribe', async (c) => {
  const parsed = pushSubscriptionSchema.safeParse(await c.req.json());
  if (!parsed.success) return validationFailed(c, parsed.error);

  await createPushRepository(c.env.DB).save({
    endpoint: parsed.data.endpoint,
    p256dh: parsed.data.p256dh,
    auth: parsed.data.auth,
    label: parsed.data.label ?? '',
  });

  /* Subscribing is the act of asking for notifications, so turn them on. */
  const repository = createSettingsRepository(c.env.DB);
  const current = await repository.readNotifications();
  if (!current.push) await repository.writeNotifications({ ...current, push: true });

  return c.json({ ok: true });
});

settingsRoutes.post('/settings/push/unsubscribe', async (c) => {
  const body = (await c.req.json()) as { endpoint?: unknown };
  if (typeof body.endpoint !== 'string') {
    return c.json({ error: 'endpoint is required' }, 400);
  }

  await createPushRepository(c.env.DB).remove(body.endpoint);
  return c.json({ ok: true });
});
