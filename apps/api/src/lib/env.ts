/**
 * Worker bindings.
 *
 * Declared once here and threaded through Hono's generics, so a route never
 * reaches for an untyped `env`.
 */
export interface Env {
  readonly DB: D1Database;
  readonly IMAGES: R2Bucket;
  /** Set with `wrangler secret put`. Never committed. */
  readonly TELEGRAM_BOT_TOKEN?: string;
  readonly TELEGRAM_CHAT_ID?: string;
  readonly RESEND_API_KEY?: string;
}

/** Hono's generic shape for this Worker. */
export interface AppBindings {
  Bindings: Env;
}
