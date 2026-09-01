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
npm run dev:web       # storefront  → http://localhost:4321
```

For the admin side, run all three in separate terminals:

```bash
npm run dev:api       # admin API   → http://localhost:8787
npm run dev:admin     # admin SPA   → http://localhost:5173/admin/
```

`npm run db:reset` creates a local SQLite database under `.wrangler-local`,
applies `db/migrations`, and loads the sample catalogue from `db/seed`. **All
three dev servers share that one store**, so a product added in admin shows up
on the storefront immediately — the same way it will in production.

The admin dev server stands in for Cloudflare Access by injecting the identity
header Access would add. That is in the Vite dev config only; it is never built
or deployed.

## Layout

```
apps/
  web/      Astro storefront (Cloudflare Pages) — the public shop
  admin/    Vite React SPA at /admin, behind Cloudflare Access
  api/      Worker for admin endpoints
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

## Phase status

- **Phase 1 — storefront.** Built. Home, `/shop`, category pages, product pages,
  size guide, delivery, returns, WhatsApp ordering, `?v=` video attribution,
  sitemap, R2 image route.
- **Phase 2 — admin + orders.** Built. Cart, checkout with COD and manual
  wallet, order creation, Telegram/Resend notifications, admin API behind
  Cloudflare Access, admin SPA with product CRUD and photo upload.
- **Phase 3 — redesign, accounts, search, reviews.** Built. See CLAUDE.md.

## Before you deploy

Work through these in order. Everything up to step 4 is required; steps 5–7 are
optional features you can switch on later.

### 1. Create the Cloudflare resources

```bash
npx wrangler d1 create hamza-footwear-db
npx wrangler r2 bucket create hamza-footwear-images
```

Paste the returned database id into `database_id` in **both**
`apps/web/wrangler.toml` and `apps/api/wrangler.toml` — they are currently
`REPLACE_WITH_DATABASE_ID`.

### 2. Set up the live schema

```bash
npm run db:migrate:remote
npm run db:seed:remote
```

`db:seed:remote` loads the cities table and a sample catalogue. **Do not load
`db/seed/0003_reviews.sql` on the live shop** — those are development fixtures,
and real ratings must come from real delivered orders.

### 3. Replace every placeholder

| Where | Setting | Currently |
|---|---|---|
| `apps/web/wrangler.toml` | `SHOP_WHATSAPP` | `03001234567` |
| `apps/web/wrangler.toml` | `JAZZCASH_NUMBER`, `EASYPAISA_NUMBER` | placeholders — delete the lines to hide those payment options |
| `apps/web/src/lib/site.ts` | `SITE.address` | "Delivering across Pakistan." |
| `db/seed/0001_cities.sql` | delivery fees | Rs 200 major / Rs 300 elsewhere, pending the real courier rate card |

### 4. Deploy the storefront

Create a Pages project pointing at this repo: build command `npm run build:web`,
output directory `apps/web/dist`. Add the `DB` and `IMAGES` bindings in the
project settings, then attach `hamzafootwear.com` — SSL is issued automatically.

Turn on **Cloudflare Web Analytics** (cookieless) for the domain.

### 5. Deploy admin (optional, but you will want it)

```bash
npm run deploy --workspace @hamza/api
```

Then **put Cloudflare Access in front of it**. Create a Zero Trust application
covering the Worker's hostname and `/admin`, with a policy allowing the owner's
email.

> **The API Worker must have no public hostname outside that Access
> application.** Its identity check trusts a header that only Access can be
> relied on to set. Optionally set `ADMIN_EMAILS` on the Worker as a second
> allowlist.

Build the admin SPA (`npm run build --workspace @hamza/admin`) and upload it to
`/admin` on the same domain, so its `/api` and `/img` requests stay same-origin.

### 6. Order notifications (optional)

Set as secrets on the storefront's Pages project:

```
TELEGRAM_BOT_TOKEN   TELEGRAM_CHAT_ID
RESEND_API_KEY       ORDER_EMAIL_FROM   ORDER_EMAIL_TO
```

A missing channel is skipped and logged; it never fails an order. Telegram is
the primary channel — Resend's free tier caps at 100 emails/day.

### 7. Phone sign-in (optional — this one costs money)

Customer accounts need a way to send the one-time code, and that is the only
part of this project with a running cost. Set:

```
OTP_GATEWAY_URL   OTP_GATEWAY_KEY   OTP_MESSAGE_TEMPLATE (optional)
```

The gateway must accept `POST {to, text}` with a bearer token — most Pakistani
SMS providers do. Without these, sign-in falls back to a development sender that
**refuses to run in production**, so the flow fails loudly rather than silently
locking customers out. Leaving it unset simply means guest checkout only, which
is a perfectly good place to start.

### 8. The display font

Nothing to do — **Instrument Serif is already self-hosted** at
`apps/web/public/fonts/instrument-serif-400.woff2` (21KB, latin subset, SIL
Open Font License) and preloaded. It is never fetched from
fonts.googleapis.com.

## Verifying before launch

The JavaScript budget is checked by the build itself — the storefront ships
**2.6 kB gzipped** on a product page against a 30 kB ceiling. Two
Definition-of-Done items need a deployed URL and a real device:

- Lighthouse mobile ≥ 95 on a throttled 4G profile
- Loads and is fully usable inside the **TikTok in-app browser**

Test the second by putting the live link in a TikTok bio and opening it from the
app. Resizing Chrome does not reproduce it — file uploads and redirects behave
differently in that webview.
