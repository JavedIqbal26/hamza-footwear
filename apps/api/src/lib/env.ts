/**
 * Worker bindings.
 *
 * Declared once here and threaded through Hono's generics, so a route never
 * reaches for an untyped `env`.
 */
export interface Env {
  readonly DB: D1Database;
  readonly IMAGES: R2Bucket;
  /**
   * Comma-separated emails allowed to use admin, matched against the identity
   * Cloudflare Access asserts. Optional: when unset, any identity Access lets
   * through is accepted, which is the correct behaviour when the Access policy
   * itself is the allowlist.
   */
  readonly ADMIN_EMAILS?: string;

  /*
   * Notification credentials. Admin reads these only to know whether a channel
   * is *available* — it never returns their values, and the settings screen
   * shows an unconfigured channel as unavailable rather than merely off.
   */
  readonly TELEGRAM_BOT_TOKEN?: string;
  readonly RESEND_API_KEY?: string;
  /** Public half of the VAPID pair; the admin browser needs it to subscribe. */
  readonly VAPID_PUBLIC_KEY?: string;
}

/** Hono's generic shape for this Worker, including what middleware attaches. */
export interface AppBindings {
  Bindings: Env;
  Variables: {
    /** The signed-in admin's email, as asserted by Cloudflare Access. */
    adminEmail: string;
  };
}
