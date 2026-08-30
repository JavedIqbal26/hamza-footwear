/**
 * Telegram notification.
 *
 * The primary channel: unmetered, instant, and it lands on the owner's phone
 * with a sound. Resend is the backup record, not the thing the business runs on.
 *
 * Sends plain text, never Markdown or HTML parse modes — a product name with an
 * underscore or asterisk in it would otherwise fail to send or render mangled.
 */

const TELEGRAM_API = 'https://api.telegram.org';

export interface TelegramConfig {
  readonly botToken: string;
  readonly chatId: string;
}

export function readTelegramConfig(env: CloudflareEnv): TelegramConfig | null {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  return botToken && chatId ? { botToken, chatId } : null;
}

export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
): Promise<void> {
  const response = await fetch(`${TELEGRAM_API}/bot${config.botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram sendMessage failed: ${response.status} ${await response.text()}`,
    );
  }
}
