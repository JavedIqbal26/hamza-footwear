import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Admin build.
 *
 * Served at `/admin`, so `base` must match or every asset URL breaks once
 * deployed. In development the API is proxied to the Worker running on 8787,
 * which keeps requests same-origin and means no CORS config exists anywhere.
 */
/** Identity the dev proxy asserts in place of Cloudflare Access. Never shipped. */
const DEV_ADMIN_EMAIL = 'dev@localhost';

export default defineConfig({
  base: '/admin/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    /* Admin is one user on a good-enough connection; readable chunks beat tiny ones. */
    chunkSizeWarningLimit: 700,
  },
  server: {
    port: 5173,
    proxy: {
      /*
       * Product photos are served by the storefront's `/img/` route. In
       * production admin sits at hamzafootwear.com/admin, so that path already
       * resolves; across two dev ports it needs this proxy or every thumbnail
       * in admin is broken locally.
       */
      '/img': {
        /* `localhost`, not 127.0.0.1: the Astro dev server binds IPv6 only. */
        target: 'http://localhost:4321',
      },
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        /*
         * Stands in for Cloudflare Access during local development only.
         *
         * In production Access terminates the request and injects this header
         * itself, stripping any client-supplied copy. Nothing here ships: this
         * block lives in the dev server config, which is not part of the built
         * bundle and never runs against the deployed Worker.
         */
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Cf-Access-Authenticated-User-Email', DEV_ADMIN_EMAIL);
          });
        },
      },
    },
  },
});
