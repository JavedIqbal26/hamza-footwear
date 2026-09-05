/**
 * Which channels tell the shop about a new order.
 *
 * In shared because it crosses an app boundary: the storefront reads it to
 * decide what to send, the Worker reads and writes it, and admin renders it.
 *
 * Note what is not here. The Telegram bot token and the Resend API key are
 * deployment secrets and never travel with these; only the destination and the
 * on/off flags do, and neither is usable on its own.
 */
export interface NotificationSettings {
  readonly push: boolean;
  readonly telegram: boolean;
  readonly email: boolean;
  /** Which Telegram conversation to post into. Null until connected. */
  readonly telegramChatId: string | null;
  /** Overrides the deploy-time address when set. */
  readonly emailTo: string | null;
}
