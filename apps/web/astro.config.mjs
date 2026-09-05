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
    platformProxy: {
      enabled: true,
      /*
       * Shared with the admin Worker (see the apps/api dev script), so one
       * local D1 and R2 back the whole system: a product added in admin
       * appears on the storefront immediately, exactly as in production.
       *
       * The `/v3` is required and easy to get wrong. `wrangler dev` and
       * `wrangler d1 execute --persist-to <dir>` both store under `<dir>/v3`,
       * but `getPlatformProxy` — which this option feeds — treats the path as
       * the store root and would otherwise create a second, empty database
       * one level up.
       */
      persist: { path: '../../.wrangler-local/v3' },
    },
    imageService: 'passthrough',
  }),
  vite: {
    plugins: [tailwindcss()],
  },
  build: {
    // One stylesheet, inlined when small enough to save a round trip on 4G.
    inlineStylesheets: 'auto',
    /*
     * Prerendered pages emit as `size-guide.html`, not `size-guide/index.html`.
     *
     * With the directory form, Cloudflare Pages answers /size-guide with a 308
     * to /size-guide/ — a wasted round trip on every visit. It is only two
     * pages, but one of them is the size guide, which is linked from every
     * product page and which CLAUDE.md calls a revenue feature. A redirect on
     * the path between "will this fit?" and the answer is the wrong place to
     * spend 100ms of someone's 4G.
     */
    format: 'file',
  },
  prefetch: {
    // Prefetch on hover/tap-intent only. Mobile data is not ours to spend.
    prefetchAll: false,
    defaultStrategy: 'tap',
  },
});
