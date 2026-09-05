/**
 * Discovering which Telegram chat to post into.
 *
 * The bot cannot start a conversation — Telegram only lets a bot reply to
 * someone who has messaged it first. So the flow is: the owner messages the
 * bot, taps Connect, and this reads back the most recent message to learn where
 * he is.
 *
 * `getUpdates` is long-polling, and calling it consumes nothing permanently, so
 * this is safe to press repeatedly. It only works while no webhook is set,
 * which is the case here — nothing in this project registers one.
 */

const TELEGRAM_API = 'https://api.telegram.org';

interface TelegramChat {
  id: number;
  title?: string;
  username?: string;
  first_name?: string;
}

interface TelegramUpdate {
  message?: { chat?: TelegramChat };
}

interface GetUpdatesResponse {
  ok: boolean;
  result?: TelegramUpdate[];
  description?: string;
}

export interface TelegramConnectResult {
  readonly chatId: string | null;
  readonly chatName: string | null;
  readonly message: string;
}

const NO_MESSAGE =
  'No message found. Open Telegram, send the bot any message, then press Connect again.';

function nameOf(chat: TelegramChat): string {
  return chat.title ?? chat.username ?? chat.first_name ?? 'Telegram';
}

export async function connectTelegramChat(botToken: string): Promise<TelegramConnectResult> {
  let body: GetUpdatesResponse;

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/getUpdates?limit=10`);
    body = (await response.json()) as GetUpdatesResponse;
  } catch (error) {
    console.error('Telegram getUpdates failed', error);
    return { chatId: null, chatName: null, message: 'Could not reach Telegram. Try again.' };
  }

  if (!body.ok) {
    /*
     * Almost always a bad bot token. Say that rather than echoing Telegram's
     * own wording, which is written for developers.
     */
    console.error('Telegram getUpdates rejected', body.description);
    return {
      chatId: null,
      chatName: null,
      message: 'Telegram rejected the bot token. Check TELEGRAM_BOT_TOKEN.',
    };
  }

  /* Most recent first: if he has messaged from two accounts, the latest wins. */
  const chat = [...(body.result ?? [])]
    .reverse()
    .map((update) => update.message?.chat)
    .find((candidate): candidate is TelegramChat => typeof candidate?.id === 'number');

  if (!chat) return { chatId: null, chatName: null, message: NO_MESSAGE };

  return { chatId: String(chat.id), chatName: nameOf(chat), message: 'Connected.' };
}
