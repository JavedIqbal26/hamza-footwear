# Hamza Footwear

Online storefront for a shoe shop in Pakistan. Astro storefront on Cloudflare
Pages, D1 for data, R2 for images, everything inside the free tier.

See [CLAUDE.md](./CLAUDE.md) for the constraints and conventions that govern
changes to this repo — read that before making one.

## Requirements

- Node 20+ (developed on 24)
- npm 10+ (this is an **npm workspaces** monorepo — no pnpm required)
- A Cloudflare account for deployment

## Getting started

```bash
npm install
npm run db:reset      # apply migrations + seed the local D1 database
npm run dev:web       # http://localhost:4321
```

`npm run db:reset` creates a local SQLite database under
`apps/web/.wrangler/state`, applies `db/migrations`, and loads the sample
catalogue from `db/seed`. `astro dev` binds to that same local database through
Miniflare, so development exercises the real query paths.

## Layout

```
apps/
  web/      Astro storefront (Cloudflare Pages) — the Phase 1 deliverable
  api/      Worker for admin/write endpoints — scaffolded, Phase 2
packages/
  shared/   Types, constants, money and phone helpers. Zero runtime deps.
  db/       D1 repositories and row mappers. The only place SQL is written.
db/
  migrations/  Schema, applied with `wrangler d1 migrations apply`
  seed/        Cities and the sample catalogue
```

## Commands

Run from the repo root:

| Command | Does |
|---|---|
| `npm run dev:web` | Storefront dev server with real D1/R2 bindings |
| `npm run build:web` | Production build of the storefront |
| `npm run typecheck` | Typecheck every workspace |
| `npm run db:reset` | Migrate + seed the local database |
| `npm run db:migrate` | Apply migrations locally |
| `npm run db:seed` | Load cities and sample products locally |
| `npm run db:migrate:remote` | Apply migrations to the live D1 database |
| `npm run db:seed:remote` | Seed the live D1 database |

## First deployment

The app is written and builds; these are the account-level steps that have not
been run, because they create billable-tier resources on a real Cloudflare
account.

1. **Create the database and bucket**

   ```bash
   npx wrangler d1 create hamza-footwear-db
   npx wrangler r2 bucket create hamza-footwear-images
   ```

2. **Paste the database id** returned by the first command into
   `database_id` in both `apps/web/wrangler.toml` and `apps/api/wrangler.toml`.
   They are currently `REPLACE_WITH_DATABASE_ID`.

3. **Set up the live schema**

   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

4. **Set the shop's WhatsApp number.** `SHOP_WHATSAPP` in
   `apps/web/wrangler.toml` is a placeholder (`03001234567`). Set the real
   number there, or override it per-environment in the Pages dashboard.

5. **Create the Pages project** and point it at `apps/web`, build command
   `npm run build:web`, output directory `apps/web/dist`. Add the `DB` and
   `IMAGES` bindings in the Pages project settings.

6. **Add the custom domain** `hamzafootwear.com` in the Pages project. SSL is
   issued automatically.

7. **Turn on Web Analytics** (cookieless) for the domain in the Cloudflare
   dashboard.

## Verifying the performance budget

The client JavaScript budget is checked by the build itself — the storefront
currently ships **1.02 kB gzipped** against a 30 kB ceiling. The remaining
Definition-of-Done items need a deployed URL and a real device:

- Lighthouse mobile ≥ 95 on a throttled 4G profile
- Loads and is fully usable inside the TikTok in-app browser

Test the second one by putting the live link in a TikTok bio and opening it from
the app, not by resizing Chrome. Uploads and redirects behave differently there.

## Phase status

- **Phase 1 — storefront.** Built. Home, category pages, product pages, size
  guide, delivery, returns, WhatsApp ordering, `?v=` video attribution,
  sitemap, R2 image route.
- **Phase 2 — admin + orders.** Not started. `apps/api` holds the skeleton.
- **Phase 3.** Not started, and not to be started without being asked.
