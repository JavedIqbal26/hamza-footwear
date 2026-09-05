import { useCallback, useEffect, useState } from 'react';
import type { NotificationSettings } from '@hamza/shared';

import { api, ApiError, type SettingsResponse } from '../../../lib/api-client.js';
import { disablePush, enablePush } from '../lib/push.js';

/**
 * Loading and saving the notification settings.
 *
 * Split from the screen for the same reason as the product form: the branching
 * here — three channels, each with its own availability and its own failure
 * mode — is the part worth reading on its own.
 */

export interface SettingsState {
  data: SettingsResponse | null;
  error: string | null;
  notice: string | null;
  saving: boolean;
  busyChannel: string | null;
  update(patch: Partial<NotificationSettings>): void;
  save(): Promise<void>;
  connectTelegram(): Promise<void>;
  togglePush(on: boolean): Promise<void>;
}

export function useSettings(): SettingsState {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyChannel, setBusyChannel] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.getSettings());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load settings');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function update(patch: Partial<NotificationSettings>): void {
    setData((current) =>
      current ? { ...current, notifications: { ...current.notifications, ...patch } } : current,
    );
  }

  return {
    data,
    error,
    notice,
    saving,
    busyChannel,
    update,

    async save(): Promise<void> {
      if (!data) return;
      setSaving(true);
      setError(null);
      setNotice(null);

      try {
        const { notifications } = data;
        await api.saveSettings({
          push: notifications.push,
          telegram: notifications.telegram,
          email: notifications.email,
          telegram_chat_id: notifications.telegramChatId ?? undefined,
          email_to: notifications.emailTo ?? undefined,
        });
        setNotice('Saved.');
      } catch (cause) {
        setError(
          cause instanceof ApiError ? cause.message : 'Could not save. Check your connection.',
        );
      } finally {
        setSaving(false);
      }
    },

    async connectTelegram(): Promise<void> {
      setBusyChannel('telegram');
      setError(null);
      setNotice(null);

      try {
        const { chatName } = await api.connectTelegram();
        await load();
        setNotice(`Connected to ${chatName}. A test order will now reach you there.`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not connect Telegram');
      } finally {
        setBusyChannel(null);
      }
    },

    /**
     * Push is the one channel the browser has a say in, so the toggle does the
     * permission dance rather than just flipping a flag. Turning it on without
     * a subscription would save a setting that quietly does nothing.
     */
    async togglePush(on: boolean): Promise<void> {
      setBusyChannel('push');
      setError(null);
      setNotice(null);

      try {
        if (!on) {
          await disablePush();
          update({ push: false });
          await api.saveSettings({
            push: false,
            telegram: data?.notifications.telegram ?? true,
            email: data?.notifications.email ?? true,
            telegram_chat_id: data?.notifications.telegramChatId ?? undefined,
            email_to: data?.notifications.emailTo ?? undefined,
          });
          setNotice('Notifications turned off on this device.');
          await load();
          return;
        }

        const key = data?.vapidPublicKey;
        if (!key) {
          setError('Push is not configured on the server yet.');
          return;
        }

        const result = await enablePush(key);
        if (!result.ok) {
          setError(result.reason);
          return;
        }

        await load();
        setNotice('Notifications are on for this device.');
      } finally {
        setBusyChannel(null);
      }
    },
  };
}
