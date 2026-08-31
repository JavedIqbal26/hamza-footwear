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
}

/** Hono's generic shape for this Worker, including what middleware attaches. */
export interface AppBindings {
  Bindings: Env;
  Variables: {
    /** The signed-in admin's email, as asserted by Cloudflare Access. */
    adminEmail: string;
  };
}
