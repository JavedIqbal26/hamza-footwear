/// <reference types="astro/client" />

/** Bindings declared in `wrangler.toml`. Secrets are set with `wrangler secret put`. */
interface CloudflareEnv {
  readonly DB: D1Database;
  readonly IMAGES: R2Bucket;
  /** The shop's WhatsApp number, in any form `normalisePhone` accepts. */
  readonly SHOP_WHATSAPP: string;
  /** Wallet numbers shown at checkout for manual JazzCash/Easypaisa payment. */
  readonly JAZZCASH_NUMBER?: string;
  readonly EASYPAISA_NUMBER?: string;

  /* Order notifications. Absent means that channel is skipped, not that the order fails. */
  readonly TELEGRAM_BOT_TOKEN?: string;
  readonly TELEGRAM_CHAT_ID?: string;
  readonly RESEND_API_KEY?: string;
  readonly ORDER_EMAIL_FROM?: string;
  readonly ORDER_EMAIL_TO?: string;
}

type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
