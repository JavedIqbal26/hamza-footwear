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
| `npm run build:web` | Production build: admin, then the storefront, with admin folded into `dist/admin` |
| `npm run typecheck` | Typecheck every workspace |
| `npm run db:reset` | Migrate + seed the local database |
| `npm run db:migrate` | Apply migrations locally |
| `npm run db:seed` | Load cities and sample products locally |
| `npm run db:migrate:remote` | Apply migrations to the live D1 database |
| `npm run db:seed:remote` | Seed the live database with cities only |

## Phase status

- **Phase 1 — storefront.** Built. Home, `/shop`, category pages, product pages,
  size guide, delivery, returns, WhatsApp ordering, `?v=` video attribution,
  sitemap, R2 image route.
- **Phase 2 — admin + orders.** Built. Cart, checkout with COD and manual
  wallet, order creation, Telegram/Resend notifications, admin API behind
  Cloudflare Access, admin SPA with product CRUD and photo upload.
- **Phase 3 — redesign, accounts, search, reviews.** Built. See CLAUDE.md.

## Before you deploy

Work through these in order. Steps 0–5 are required to have a working shop;
6–8 are optional features you can switch on later.

### 0. Get the domain onto Cloudflare

`hamzafootwear.com` is registered, but its nameservers do not yet point at
Cloudflare. **Nothing below resolves until they do.** Add the site in the
Cloudflare dashboard, then change the nameservers at the registrar to the two
Cloudflare gives you. Propagation is usually under an hour.

This is a prerequisite rather than a parallel task: the Worker route in step 5
needs the zone to exist before it can be claimed.

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

`db:seed:remote` loads **the cities table only**. That is deliberate: the sample
catalogue is development scaffolding — ten products with no photographs and
invented names — and it must not greet a customer arriving from TikTok. If you
want it on a staging database, `db:seed:remote:samples` is separate and opt-in.

**Never load `db/seed/0003_reviews.sql` on the live shop.** Those are review
fixtures, and every rating on this site has to come from a real delivered order.

### 3. Replace every placeholder

| Where | Setting | Currently |
|---|---|---|
| `apps/web/wrangler.toml` | `SHOP_WHATSAPP`, `JAZZCASH_NUMBER`, `EASYPAISA_NUMBER` | all set to the shop's real number, `03000142825`. Delete a wallet line to withdraw that option. |
| `apps/web/src/lib/site.ts` | `SITE.address` | "Delivering across Pakistan." |

The `cities` table no longer prices anything — the shop quotes each delivery
charge in admin once it sees the address. It remains as coverage, and as the
seam for per-area rates later.

### 4. Deploy the storefront and admin together

One Pages project serves both. Build command `npm run build:web`, output
directory `apps/web/dist`.

That script builds the admin SPA, then the storefront, then folds admin into
`dist/admin` and adds `/admin/*` to the Pages routing manifest. **That last part
matters:** Astro emits `_routes.json` with `include: ["/*"]`, so anything not
explicitly excluded is handed to the SSR worker — without it every request to
`/admin` would 404, and only once deployed.

Add the `DB` and `IMAGES` bindings in the project settings, then attach
`hamzafootwear.com`. SSL is issued automatically.

Turn on **Cloudflare Web Analytics** (cookieless) for the domain.

### 5. Deploy the admin API, and put Access in front of both

```bash
npm run deploy --workspace @hamza/api
```

The Worker claims `hamzafootwear.com/api/*` through the route in its
`wrangler.toml`. Worker routes take precedence over Pages on matching paths, so
everything else stays with the storefront, and admin's relative `/api/admin/...`
calls stay same-origin — which is why there is no CORS configuration anywhere in
this project. `workers_dev` is off deliberately.

Then create **one Cloudflare Access application** covering both paths:

```
hamzafootwear.com/admin*
hamzafootwear.com/api/admin*
```

with a policy allowing the owner's email.

> **The API Worker must have no public hostname outside that Access
> application.** Its identity check trusts a header only Access can be relied on
> to set, and it fails closed when the header is absent. Optionally set
> `ADMIN_EMAILS` on the Worker as a second allowlist.
>
> Protect `/admin` as well as `/api/admin`. The API is the real control — the
> SPA can do nothing without it — but leaving the interface open invites
> someone to probe it.


### 6. Notifications (optional, but you will want one)

Which channels fire is chosen by the owner in **admin → Settings**, not here.
This step only supplies the credentials each channel needs; a channel with none
shows as unavailable on that screen rather than as merely switched off.

> **The storefront is a Pages project, the API is a Worker, and they take
> different commands.** `wrangler secret put` on a Pages project fails with
> "It looks like you've run a Workers-specific command in a Pages project".
> Pages needs `wrangler pages secret put`.

```bash
# Storefront (Pages) — sends the notifications
cd apps/web
npx wrangler pages secret put TELEGRAM_BOT_TOKEN --project-name hamza-footwear
npx wrangler pages secret put RESEND_API_KEY     --project-name hamza-footwear

# Admin API (Worker) — needs the bot token only for the Connect button
cd ../api
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

The Telegram chat id is *not* set here — the owner presses **Connect Telegram**
in admin and it is read back from whoever last messaged the bot.

**Web Push** needs one VAPID keypair, generated once and shared between the two
Workers. Generate it with Node:

```bash
node -e "(async()=>{const p=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);const b=b=>Buffer.from(b).toString('base64url');console.log('public :',b(await crypto.subtle.exportKey('raw',p.publicKey)));console.log('private:',b(await crypto.subtle.exportKey('pkcs8',p.privateKey)))})()"
```

The storefront signs and sends, so it needs both halves. The API only hands the
public key to the browser so it can subscribe:

```bash
# Storefront (Pages) signs and sends, so it needs both halves
cd apps/web
npx wrangler pages secret put VAPID_PRIVATE_KEY --project-name hamza-footwear
npx wrangler pages secret put VAPID_PUBLIC_KEY  --project-name hamza-footwear
npx wrangler pages secret put VAPID_SUBJECT     --project-name hamza-footwear

# API (Worker) only hands the public key to the browser
cd ../api
npx wrangler secret put VAPID_PUBLIC_KEY
```

**A Pages project only picks up new secrets on its next deployment.** Redeploy
after setting them, or push will stay unavailable however the toggle looks.

> On Windows, `npx` may fail in PowerShell with "running scripts is disabled on
> this system". Use Git Bash or Command Prompt, or call `npx.cmd` — no need to
> change the execution policy.

Then, on the owner's phone: open `/admin`, add it to the home screen, and turn
on **Phone notification** in Settings. Two things worth telling him — the app
must be on the home screen for this to work on iPhone, and Android battery
optimisation can hold notifications back, which is why the screen advises
keeping a second channel on.

> **WhatsApp is not an option here, and cannot be.** Sending to it
> programmatically needs the WhatsApp Cloud API, which needs Meta business
> verification, which needs the NTN and registered business bank account that
> also blocked the payment gateway. Messaging a customer *from* an order still
> works — that is a person tapping a link, not the server sending.

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
