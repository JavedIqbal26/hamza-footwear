/// <reference types="astro/client" />

/** Bindings declared in `wrangler.toml`. */
interface CloudflareEnv {
  readonly DB: D1Database;
  readonly IMAGES: R2Bucket;
  /** The shop's WhatsApp number, in any form `normalisePhone` accepts. */
  readonly SHOP_WHATSAPP: string;
}

type CloudflareRuntime = import('@astrojs/cloudflare').Runtime<CloudflareEnv>;

declare namespace App {
  interface Locals extends CloudflareRuntime {}
}
