// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

/**
 * Storefront build.
 *
 * Output is `static` by default: the marketing pages (size guide, delivery,
 * returns) are real files on the Pages CDN. Only the pages that read the
 * catalogue out of D1 opt into server rendering with `export const prerender =
 * false`, so the dynamic surface stays as small as the data allows.
 *
 * `platformProxy` gives `astro dev` the real D1 and R2 bindings from
 * wrangler.toml via Miniflare, so local development hits the same code paths as
 * production.
 */
export default defineConfig({
  site: 'https://hamzafootwear.com',
  output: 'static',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'passthrough',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    // One stylesheet, inlined when small enough to save a round trip on 4G.
    inlineStylesheets: 'auto',
  },
  prefetch: {
    // Prefetch on hover/tap-intent only. Mobile data is not ours to spend.
    prefetchAll: false,
    defaultStrategy: 'tap',
  },
});
