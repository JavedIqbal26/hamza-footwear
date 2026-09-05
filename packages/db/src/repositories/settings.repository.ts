import type { D1Database } from '@cloudflare/workers-types';
import type { NotificationSettings } from '@hamza/shared';

/**
 * Shop settings the owner controls from admin.
 *
 * A key/value table behind a typed accessor: the storage is generic so a new
 * preference costs no migration, but nothing outside this file ever sees a
 * loose string key. Callers ask for `notifications` and get a shape.
 *
 * **No credentials live here.** The Telegram bot token is a Worker secret; a
 * token in the database is a token in every backup. The chat id is not a secret
 * — it identifies a conversation, and without the bot token it opens nothing.
 */

export type { NotificationSettings };

/**
 * What a shop gets before it has chosen anything.
 *
 * Telegram and email are on: a new shop that has not opened the settings screen
 * must still hear about its orders, and every channel is free. Push is off
 * because it cannot work until a browser has been granted permission — showing
 * it as enabled when no subscription exists would be a lie.
 */
export const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  push: false,
  telegram: true,
  email: true,
  telegramChatId: null,
  emailTo: null,
};

const KEYS = {
  push: 'notify.push',
  telegram: 'notify.telegram',
  email: 'notify.email',
  telegramChatId: 'telegram.chat_id',
  emailTo: 'notify.email_to',
} as const;

/** Stored as the strings '1' and '0'; anything else reads as the default. */
function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === '1') return true;
  if (value === '0') return false;
  return fallback;
}

function toText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export interface SettingsRepository {
  readNotifications(): Promise<NotificationSettings>;
  writeNotifications(settings: NotificationSettings): Promise<void>;
}

export function createSettingsRepository(db: D1Database): SettingsRepository {
  return {
    async readNotifications(): Promise<NotificationSettings> {
      const { results } = await db
        .prepare('SELECT key, value FROM settings')
        .all<{ key: string; value: string }>();

      const stored = new Map(results.map((row) => [row.key, row.value]));

      return {
        push: toBoolean(stored.get(KEYS.push), DEFAULT_NOTIFICATIONS.push),
        telegram: toBoolean(stored.get(KEYS.telegram), DEFAULT_NOTIFICATIONS.telegram),
        email: toBoolean(stored.get(KEYS.email), DEFAULT_NOTIFICATIONS.email),
        telegramChatId: toText(stored.get(KEYS.telegramChatId)),
        emailTo: toText(stored.get(KEYS.emailTo)),
      };
    },

    /**
     * Written as one batch so the screen never half-saves. D1 runs a batch in a
     * single transaction, which is what stops a dropped connection leaving
     * Telegram enabled with no chat id to post to.
     */
    async writeNotifications(settings: NotificationSettings): Promise<void> {
      const statement = db.prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?1, ?2, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
         ON CONFLICT (key) DO UPDATE
           SET value = excluded.value, updated_at = excluded.updated_at`,
      );

      await db.batch([
        statement.bind(KEYS.push, settings.push ? '1' : '0'),
        statement.bind(KEYS.telegram, settings.telegram ? '1' : '0'),
        statement.bind(KEYS.email, settings.email ? '1' : '0'),
        statement.bind(KEYS.telegramChatId, settings.telegramChatId ?? ''),
        statement.bind(KEYS.emailTo, settings.emailTo ?? ''),
      ]);
    },
  };
}
