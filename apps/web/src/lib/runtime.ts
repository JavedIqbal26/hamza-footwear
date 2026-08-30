/**
 * The single place that reaches into Cloudflare's runtime.
 *
 * Everything above this file works with a `D1Database` or an `R2Bucket`, not
 * with `Astro.locals`. That keeps the binding shape in one file and gives a
 * readable error when a binding is missing — otherwise a forgotten `wrangler.toml`
 * entry surfaces as `Cannot read properties of undefined` deep inside a query.
 */

export class MissingBindingError extends Error {
  constructor(binding: string) {
    super(
      `Cloudflare binding "${binding}" is not available. ` +
        `Check apps/web/wrangler.toml and, in local dev, that platformProxy is enabled.`,
    );
    this.name = 'MissingBindingError';
  }
}

function env(locals: App.Locals): CloudflareEnv {
  const runtimeEnv = locals.runtime?.env;
  if (!runtimeEnv) throw new MissingBindingError('runtime.env');
  return runtimeEnv;
}

export function getDatabase(locals: App.Locals): D1Database {
  const binding = env(locals).DB;
  if (!binding) throw new MissingBindingError('DB');
  return binding;
}

export function getImageBucket(locals: App.Locals): R2Bucket {
  const binding = env(locals).IMAGES;
  if (!binding) throw new MissingBindingError('IMAGES');
  return binding;
}

export function getShopWhatsApp(locals: App.Locals): string {
  return env(locals).SHOP_WHATSAPP ?? '';
}
